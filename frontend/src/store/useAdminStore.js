// src/store/useAdminStore.js
// Manages admin-facing data: residents, households, requests, dashboard stats
import { create } from 'zustand'
import api from '../api/axios'
import { supabase } from '../api/supabaseClient'

export const useAdminStore = create((set, get) => ({
  // Dashboard stats
  dashboardStats: {
    totalResidents: 0,
    totalHouseholds: 0,
    pendingRequests: 0,
    openBlotters: 0,
    completedThisMonth: 0,
  },
  statsLoading: false,
  fetchDashboardStats: async () => {
    set({ statsLoading: true })
    try {
      const res = await api.get('/dashboard/stats.php')
      if (res.data.success) {
        set({
          dashboardStats: {
            totalResidents: res.data.totalResidents,
            totalHouseholds: res.data.totalHouseholds,
            pendingRequests: res.data.pendingRequests,
            openBlotters: res.data.openBlotters,
            completedThisMonth: res.data.completedThisMonth,
          }
        })
      }
    } catch (error) {
      console.error('Failed to fetch dashboard stats', error)
    } finally {
      set({ statsLoading: false })
    }
  },

  // Residents list state
  residents: [],
  residentsTotal: 0,
  residentsPages: 1,
  residentsCurrentPage: 1,
  residentsLoading: false,
  fetchResidents: async (params = {}) => {
    set({ residentsLoading: true })
    try {
      const page = params.page || 1
      const limit = params.limit || 10
      const from = (page - 1) * limit
      const to = from + limit - 1

      let query = supabase
        .from('residents')
        .select('*, users(*)', { count: 'exact' })

      if (params.search) {
        query = query.or(`first_name.ilike.%${params.search}%,last_name.ilike.%${params.search}%`)
      }
      if (params.purok) {
        query = query.eq('purok', params.purok)
      }
      if (params.status) {
        query = query.eq('users.status', params.status)
      }

      query = query
        .order('last_name', { ascending: true })
        .range(from, to)

      const { data, count, error } = await query

      if (error) throw error

      set({
        residents: data || [],
        residentsTotal: count || 0,
        residentsPages: Math.ceil((count || 0) / limit),
        residentsCurrentPage: page,
      })
    } catch (error) {
      console.error('Failed to fetch residents', error)
    } finally {
      set({ residentsLoading: false })
    }
  },

  // Single resident profile state
  currentResident: null,
  currentResidentHousehold: null,
  residentLoading: false,
  fetchResidentById: async (id) => {
    set({ residentLoading: true, currentResident: null, currentResidentHousehold: null })
    try {
      const { data: resident, error: residentError } = await supabase
        .from('residents')
        .select('*, users(*)')
        .eq('id', id)
        .maybeSingle()

      if (residentError) throw residentError

      let household = null
      if (resident && resident.household_id) {
        const { data: hhData, error: hhError } = await supabase
          .from('households')
          .select('*')
          .eq('id', resident.household_id)
          .maybeSingle()
        if (!hhError) {
          household = hhData
        }
      }

      set({
        currentResident: resident,
        currentResidentHousehold: household
      })
    } catch (error) {
      console.error('Failed to fetch resident profile', error)
    } finally {
      set({ residentLoading: false })
    }
  },

  // Create Resident
  createResident: async (data) => {
    try {
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert({
          email: data.email,
          password_hash: 'managed_by_admin',
          first_name: data.first_name,
          last_name: data.last_name,
          role: 'resident',
          status: 'active'
        })
        .select()
        .single()

      if (userError) throw userError

      const { data: newResident, error: residentError } = await supabase
        .from('residents')
        .insert({
          user_id: newUser.id,
          first_name: data.first_name,
          last_name: data.last_name,
          middle_name: data.middle_name || null,
          birthdate: data.birthdate,
          sex: data.sex,
          civil_status: data.civil_status,
          contact_no: data.contact_no || null,
          purok: data.purok,
          address: data.address,
          profile_path: data.profile_path || null,
          barangay_id_no: data.barangay_id_no || null,
        })
        .select()
        .single()

      if (residentError) throw residentError

      return { success: true, resident: newResident }
    } catch (error) {
      throw error || new Error('Failed to create resident')
    }
  },

  // Update Resident
  updateResident: async (data) => {
    try {
      const { data: updatedResident, error: residentError } = await supabase
        .from('residents')
        .update({
          first_name: data.first_name,
          last_name: data.last_name,
          middle_name: data.middle_name || null,
          birthdate: data.birthdate,
          sex: data.sex,
          civil_status: data.civil_status,
          contact_no: data.contact_no || null,
          purok: data.purok,
          address: data.address,
          profile_path: data.profile_path || null,
          barangay_id_no: data.barangay_id_no || null,
        })
        .eq('id', data.id)
        .select()
        .single()

      if (residentError) throw residentError

      return { success: true, resident: updatedResident }
    } catch (error) {
      throw error || new Error('Failed to update resident')
    }
  },

  // Archive / Restore Resident
  archiveResident: async (id, isArchived) => {
    try {
      const { data: updatedResident, error: residentError } = await supabase
        .from('residents')
        .update({ is_archived: isArchived ? 1 : 0 })
        .eq('id', id)
        .select()
        .single()

      if (residentError) throw residentError

      return { success: true, resident: updatedResident }
    } catch (error) {
      throw error || new Error('Failed to change archive status')
    }
  },

  // Households list state
  households: [],
  householdsTotal: 0,
  householdsPages: 1,
  householdsCurrentPage: 1,
  householdsLoading: false,
  fetchHouseholds: async (params = {}) => {
    set({ householdsLoading: true })
    try {
      const page = params.page || 1
      const limit = params.limit || 10
      const from = (page - 1) * limit
      const to = from + limit - 1

      let query = supabase
        .from('households')
        .select('*, residents!fk_head_resident(*)', { count: 'exact' })

      if (params.search) {
        query = query.or(`household_no.ilike.%${params.search}%,address.ilike.%${params.search}%`)
      }
      if (params.purok) {
        query = query.eq('purok', params.purok)
      }

      query = query
        .order('household_no', { ascending: true })
        .range(from, to)

      const { data, count, error } = await query

      if (error) throw error

      const mapped = (data || []).map(hh => ({
        ...hh,
        head_name: hh.residents ? `${hh.residents.first_name} ${hh.residents.last_name}` : 'Not Assigned'
      }))

      set({
        households: mapped,
        householdsTotal: count || 0,
        householdsPages: Math.ceil((count || 0) / limit),
        householdsCurrentPage: page,
      })
    } catch (error) {
      console.error('Failed to fetch households', error)
    } finally {
      set({ householdsLoading: false })
    }
  },

  // Single household details state
  currentHousehold: null,
  currentHouseholdMembers: [],
  householdLoading: false,
  fetchHouseholdById: async (id) => {
    set({ householdLoading: true, currentHousehold: null, currentHouseholdMembers: [] })
    try {
      const { data: household, error: hhError } = await supabase
        .from('households')
        .select('*, residents!fk_head_resident(*)')
        .eq('id', id)
        .maybeSingle()

      if (hhError) throw hhError

      const { data: members, error: memError } = await supabase
        .from('residents')
        .select('*')
        .eq('household_id', id)

      if (memError) throw memError

      set({
        currentHousehold: household,
        currentHouseholdMembers: members || []
      })
    } catch (error) {
      console.error('Failed to fetch household details', error)
    } finally {
      set({ householdLoading: false })
    }
  },

  // Create Household
  createHousehold: async (data) => {
    try {
      const { data: newHh, error } = await supabase
        .from('households')
        .insert({
          household_no: data.household_no,
          address: data.address,
          purok: data.purok,
          head_resident_id: data.head_resident_id || null
        })
        .select()
        .single()

      if (error) throw error

      if (data.head_resident_id) {
        await supabase
          .from('residents')
          .update({ household_id: newHh.id })
          .eq('id', data.head_resident_id)
      }

      return { success: true, household: newHh }
    } catch (error) {
      throw error || new Error('Failed to create household')
    }
  },

  // Update Household
  updateHousehold: async (data) => {
    try {
      const { data: updatedHh, error } = await supabase
        .from('households')
        .update({
          household_no: data.household_no,
          address: data.address,
          purok: data.purok,
          head_resident_id: data.head_resident_id || null
        })
        .eq('id', data.id)
        .select()
        .single()

      if (error) throw error

      if (data.head_resident_id) {
        await supabase
          .from('residents')
          .update({ household_id: data.id })
          .eq('id', data.head_resident_id)
      }

      return { success: true, household: updatedHh }
    } catch (error) {
      throw error || new Error('Failed to update household')
    }
  },

  // Add Household Member
  addHouseholdMember: async (householdId, residentId) => {
    try {
      const { data, error } = await supabase
        .from('residents')
        .update({ household_id: householdId })
        .eq('id', residentId)
        .select()
        .single()

      if (error) throw error
      return { success: true, resident: data }
    } catch (error) {
      throw error || new Error('Failed to add household member')
    }
  },

  // Remove Household Member
  removeHouseholdMember: async (residentId) => {
    try {
      const { data, error } = await supabase
        .from('residents')
        .update({ household_id: null })
        .eq('id', residentId)
        .select()
        .single()

      if (error) throw error
      return { success: true, resident: data }
    } catch (error) {
      throw error || new Error('Failed to remove household member')
    }
  },

  // Document requests list
  requests: [],
  requestsTotal: 0,
  requestsPages: 1,
  requestsCurrentPage: 1,
  requestsStats: {
    total: 0,
    pending: 0,
    processing: 0,
    ready: 0,
    released: 0
  },
  requestsLoading: false,
  fetchRequests: async (params = {}) => {
    set({ requestsLoading: true })
    try {
      const page = params.page || 1
      const limit = params.limit || 10
      const from = (page - 1) * limit
      const to = from + limit - 1

      let query = supabase
        .from('document_requests')
        .select('*, residents(*), document_types(*)', { count: 'exact' })

      if (params.status && params.status !== 'all') {
        query = query.eq('status', params.status)
      }
      if (params.type) {
        query = query.eq('document_type_id', params.type)
      }
      if (params.search) {
        query = query.or(`residents.first_name.ilike.%${params.search}%,residents.last_name.ilike.%${params.search}%`)
      }

      query = query
        .order('requested_at', { ascending: false })
        .range(from, to)

      const { data, count, error } = await query

      if (error) throw error

      const mapped = (data || []).map(req => ({
        ...req,
        document_name: req.document_types?.name || 'Document',
        document_fee: req.document_types?.fee || 0,
        resident_first_name: req.residents?.first_name || '',
        resident_last_name: req.residents?.last_name || '',
        requested_at: req.created_at
      }))

      // Calculate stats
      const { data: allReqs, error: statsError } = await supabase
        .from('document_requests')
        .select('status')

      let stats = { total: 0, pending: 0, processing: 0, ready: 0, released: 0 }
      if (!statsError && allReqs) {
        stats.total = allReqs.length
        allReqs.forEach(r => {
          if (r.status === 'pending') stats.pending++
          else if (r.status === 'processing') stats.processing++
          else if (r.status === 'ready_for_pickup') stats.ready++
          else if (r.status === 'released') stats.released++
        })
      }

      set({
        requests: mapped,
        requestsTotal: count || 0,
        requestsPages: Math.ceil((count || 0) / limit),
        requestsCurrentPage: page,
        requestsStats: stats
      })
    } catch (error) {
      console.error('Failed to fetch document requests', error)
    } finally {
      set({ requestsLoading: false })
    }
  },

  // Single request details
  currentRequest: null,
  requestDetailLoading: false,
  fetchRequestById: async (id) => {
    set({ requestDetailLoading: true, currentRequest: null })
    try {
      const { data, error } = await supabase
        .from('document_requests')
        .select('*, residents(*), document_types(*)')
        .eq('id', id)
        .maybeSingle()

      if (error) throw error

      const mapped = data ? {
        ...data,
        document_name: data.document_types?.name || 'Document',
        document_fee: data.document_types?.fee || 0,
        resident_first_name: data.residents?.first_name || '',
        resident_last_name: data.residents?.last_name || '',
        requested_at: data.created_at
      } : null;

      set({ currentRequest: mapped })
    } catch (error) {
      console.error('Failed to fetch request detail', error)
    } finally {
      set({ requestDetailLoading: false })
    }
  },

  // Update request status
  updateRequestStatus: async (requestId, status, notes) => {
    try {
      const { data, error } = await supabase
        .from('document_requests')
        .update({ status, notes })
        .eq('id', requestId)
        .select()
        .single()

      if (error) throw error
      return { success: true, request: data }
    } catch (error) {
      throw error || new Error('Failed to update request status')
    }
  },

  // Admin Blotter records
  blotters: [],
  blottersTotal: 0,
  blottersPages: 1,
  blottersCurrentPage: 1,
  blottersLoading: false,
  currentBlotter: null,
  blotterDetailLoading: false,
  blottersStats: {
    total: 0,
    open: 0,
    under_mediation: 0,
    resolved: 0,
    referred: 0
  },
  fetchBlotters: async (params = {}) => {
    set({ blottersLoading: true })
    try {
      const page = params.page || 1
      const limit = params.limit || 10
      const from = (page - 1) * limit
      const to = from + limit - 1

      let query = supabase
        .from('blotter_records')
        .select('*', { count: 'exact' })

      if (params.status) {
        query = query.eq('status', params.status)
      }
      if (params.search) {
        query = query.or(`case_no.ilike.%${params.search}%,complainant_name.ilike.%${params.search}%,respondent_name.ilike.%${params.search}%`)
      }

      query = query
        .order('created_at', { ascending: false })
        .range(from, to)

      const { data, count, error } = await query

      if (error) throw error

      // Calculate stats
      const { data: allBlotters, error: statsError } = await supabase
        .from('blotter_records')
        .select('status')

      let stats = { total: 0, open: 0, under_mediation: 0, resolved: 0, referred: 0 }
      if (!statsError && allBlotters) {
        stats.total = allBlotters.length
        allBlotters.forEach(b => {
          if (b.status === 'filed') stats.open++
          else if (b.status === 'under_mediation') stats.under_mediation++
          else if (b.status === 'resolved') stats.resolved++
          else if (b.status === 'referred_to_court') stats.referred++
        })
      }

      set({
        blotters: data || [],
        blottersTotal: count || 0,
        blottersPages: Math.ceil((count || 0) / limit),
        blottersCurrentPage: page,
        blottersStats: stats
      })
    } catch (error) {
      console.error('Failed to fetch blotters', error)
    } finally {
      set({ blottersLoading: false })
    }
  },

  fetchBlotterById: async (id) => {
    set({ blotterDetailLoading: true, currentBlotter: null })
    try {
      const { data, error } = await supabase
        .from('blotter_records')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (error) throw error
      set({ currentBlotter: data })
    } catch (error) {
      console.error('Failed to fetch blotter detail', error)
    } finally {
      set({ blotterDetailLoading: false })
    }
  },

  createBlotterOnBehalf: async (data) => {
    try {
      const caseNo = `BL-2026-${Math.floor(1000 + Math.random() * 9000)}`
      const { data: newBlotter, error } = await supabase
        .from('blotter_records')
        .insert({
          case_no: caseNo,
          complainant_name: data.complainant_name,
          complainant_contact: data.complainant_contact || null,
          respondent_name: data.respondent_name,
          incident_type: data.incident_type,
          incident_date: data.incident_date,
          incident_location: data.incident_location,
          details: data.details || data.description,
          status: 'filed'
        })
        .select()
        .single()

      if (error) throw error
      return { success: true, record: newBlotter }
    } catch (error) {
      throw error || new Error('Failed to create walk-in blotter')
    }
  },

  updateBlotterStatus: async (id, status, note) => {
    try {
      const { data, error } = await supabase
        .from('blotter_records')
        .update({ status, remarks: note })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return { success: true, record: data }
    } catch (error) {
      throw error || new Error('Failed to update blotter case')
    }
  },

  // Officials State
  officials: [],
  currentOfficial: null,
  officialsLoading: false,
  fetchOfficials: async (params = {}) => {
    set({ officialsLoading: true })
    try {
      let query = supabase
        .from('officials')
        .select('*, residents(*)')

      if (params.active !== undefined) {
        query = query.eq('is_active', params.active ? 1 : 0)
      }

      const { data, error } = await query
      if (error) throw error

      set({ officials: data || [] })
    } catch (error) {
      console.error('Failed to fetch officials', error)
    } finally {
      set({ officialsLoading: false })
    }
  },
  fetchOfficialById: async (id) => {
    set({ officialsLoading: true, currentOfficial: null })
    try {
      const { data, error } = await supabase
        .from('officials')
        .select('*, residents(*)')
        .eq('id', id)
        .maybeSingle()

      if (error) throw error
      set({ currentOfficial: data })
    } catch (error) {
      console.error('Failed to fetch official details', error)
    } finally {
      set({ officialsLoading: false })
    }
  },
  createOfficial: async (formData) => {
    try {
      let residentId, position, termStart, termEnd, isActive;
      if (formData instanceof FormData) {
        residentId = formData.get('resident_id');
        position = formData.get('position');
        termStart = formData.get('term_start');
        termEnd = formData.get('term_end');
        isActive = formData.get('is_active') === 'on' || formData.get('is_active') === '1' ? 1 : 0;
      } else {
        residentId = formData.resident_id;
        position = formData.position;
        termStart = formData.term_start;
        termEnd = formData.term_end;
        isActive = formData.is_active;
      }

      const { data, error } = await supabase
        .from('officials')
        .insert({
          resident_id: residentId,
          position,
          term_start: termStart,
          term_end: termEnd,
          is_active: isActive !== undefined ? (isActive ? 1 : 0) : 1
        })
        .select()
        .single()

      if (error) throw error
      return { success: true, official: data }
    } catch (error) {
      throw error || new Error('Failed to create official')
    }
  },
  updateOfficial: async (formData) => {
    try {
      let id, residentId, position, termStart, termEnd, isActive;
      if (formData instanceof FormData) {
        id = formData.get('id');
        residentId = formData.get('resident_id');
        position = formData.get('position');
        termStart = formData.get('term_start');
        termEnd = formData.get('term_end');
        isActive = formData.get('is_active') === 'on' || formData.get('is_active') === '1' ? 1 : 0;
      } else {
        id = formData.id;
        residentId = formData.resident_id;
        position = formData.position;
        termStart = formData.term_start;
        termEnd = formData.term_end;
        isActive = formData.is_active;
      }

      const { data, error } = await supabase
        .from('officials')
        .update({
          resident_id: residentId,
          position,
          term_start: termStart,
          term_end: termEnd,
          is_active: isActive !== undefined ? (isActive ? 1 : 0) : 1
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return { success: true, official: data }
    } catch (error) {
      throw error || new Error('Failed to update official')
    }
  },
  toggleOfficialActive: async (id, isActive) => {
    try {
      const { data, error } = await supabase
        .from('officials')
        .update({ is_active: isActive ? 1 : 0 })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return { success: true, official: data }
    } catch (error) {
      throw error || new Error('Failed to toggle official active status')
    }
  },

  // Announcements State
  allAnnouncements: [],
  announcementsLoading: false,
  fetchAdminAnnouncements: async (params = {}) => {
    set({ announcementsLoading: true })
    try {
      let query = supabase
        .from('announcements')
        .select('*')

      if (params.category) {
        query = query.eq('category', params.category)
      }
      if (params.limit) {
        query = query.limit(params.limit)
      }

      query = query.order('created_at', { ascending: false })

      const { data, error } = await query
      if (error) throw error

      set({ allAnnouncements: data || [] })
    } catch (error) {
      console.error('Failed to fetch admin announcements', error)
    } finally {
      set({ announcementsLoading: false })
    }
  },
  fetchAnnouncementById: async (id) => {
    set({ announcementsLoading: true })
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Failed to fetch announcement detail', error)
      return null
    } finally {
      set({ announcementsLoading: false })
    }
  },
  createAnnouncement: async (data) => {
    try {
      const { data: newAnn, error } = await supabase
        .from('announcements')
        .insert({
          title: data.title,
          content: data.content,
          category: data.category || 'General',
          status: data.status || 'published',
          image_path: data.image_path || null
        })
        .select()
        .single()

      if (error) throw error
      return { success: true, announcement: newAnn }
    } catch (error) {
      throw error || new Error('Failed to create announcement')
    }
  },
  updateAnnouncement: async (data) => {
    try {
      const { data: updated, error } = await supabase
        .from('announcements')
        .update({
          title: data.title,
          content: data.content,
          category: data.category,
          status: data.status,
          image_path: data.image_path
        })
        .eq('id', data.id)
        .select()
        .single()

      if (error) throw error
      return { success: true, announcement: updated }
    } catch (error) {
      throw error || new Error('Failed to update announcement')
    }
  },
  deleteAnnouncement: async (id) => {
    try {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id)

      if (error) throw error
      return { success: true, message: 'Deleted successfully' }
    } catch (error) {
      throw error || new Error('Failed to delete announcement')
    }
  },

  // Programs State
  programs: [],
  currentProgram: null,
  programsLoading: false,
  fetchPrograms: async (params = {}) => {
    set({ programsLoading: true })
    try {
      let query = supabase
        .from('programs')
        .select('*')

      if (params.status) {
        query = query.eq('status', params.status)
      }

      query = query.order('created_at', { ascending: false })

      const { data, error } = await query
      if (error) throw error

      set({ programs: data || [] })
    } catch (error) {
      console.error('Failed to fetch programs', error)
    } finally {
      set({ programsLoading: false })
    }
  },
  fetchProgramById: async (id) => {
    set({ programsLoading: true, currentProgram: null })
    try {
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (error) throw error
      set({ currentProgram: data })
    } catch (error) {
      console.error('Failed to fetch program details', error)
    } finally {
      set({ programsLoading: false })
    }
  },
  createProgram: async (data) => {
    try {
      const { data: newProg, error } = await supabase
        .from('programs')
        .insert({
          title: data.title,
          description: data.description,
          status: data.status || 'Planned',
          start_date: data.start_date || null,
          end_date: data.end_date || null,
          budget: data.budget || 0.00
        })
        .select()
        .single()

      if (error) throw error
      return { success: true, program: newProg }
    } catch (error) {
      throw error || new Error('Failed to create program')
    }
  },
  updateProgram: async (data) => {
    try {
      const { data: updated, error } = await supabase
        .from('programs')
        .update({
          title: data.title,
          description: data.description,
          status: data.status,
          start_date: data.start_date,
          end_date: data.end_date,
          budget: data.budget
        })
        .eq('id', data.id)
        .select()
        .single()

      if (error) throw error
      return { success: true, program: updated }
    } catch (error) {
      throw error || new Error('Failed to update program')
    }
  },

  // Settings State & Actions
  settings: {},
  settingsLoading: false,
  fetchSettings: async () => {
    set({ settingsLoading: true })
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('setting_key, setting_value')

      if (error) throw error

      const settingsObj = (data || []).reduce((acc, row) => {
        acc[row.setting_key] = row.setting_value
        return acc
      }, {})

      set({ settings: settingsObj })
    } catch (error) {
      console.error('Failed to fetch settings', error)
    } finally {
      set({ settingsLoading: false })
    }
  },
  updateSettings: async (settingsData) => {
    set({ settingsLoading: true })
    try {
      for (const [key, value] of Object.entries(settingsData)) {
        const { error } = await supabase
          .from('settings')
          .upsert(
            { setting_key: key, setting_value: String(value) },
            { onConflict: 'setting_key' }
          )
        if (error) throw error
      }

      set({ settings: settingsData })
      return { success: true }
    } catch (error) {
      throw error || new Error('Failed to update settings')
    } finally {
      set({ settingsLoading: false })
    }
  },

  // Document Types State & Actions
  docTypes: [],
  docTypesLoading: false,
  fetchAdminDocTypes: async () => {
    set({ docTypesLoading: true })
    try {
      const { data, error } = await supabase
        .from('document_types')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw error
      set({ docTypes: data || [] })
    } catch (error) {
      console.error('Failed to fetch admin doc types', error)
    } finally {
      set({ docTypesLoading: false })
    }
  },
  addDocType: async (data) => {
    try {
      const { data: newDocType, error } = await supabase
        .from('document_types')
        .insert({
          name: data.name,
          description: data.description,
          fee: data.fee,
          processing_days: data.processing_days,
          is_active: 1
        })
        .select()
        .single()

      if (error) throw error
      return { success: true, document_type: newDocType }
    } catch (error) {
      throw error || new Error('Failed to add document type')
    }
  },
  updateDocType: async (data) => {
    try {
      const { data: updated, error } = await supabase
        .from('document_types')
        .update({
          name: data.name,
          description: data.description,
          fee: data.fee,
          processing_days: data.processing_days
        })
        .eq('id', data.id)
        .select()
        .single()

      if (error) throw error
      return { success: true, document_type: updated }
    } catch (error) {
      throw error || new Error('Failed to update document type')
    }
  },
  toggleDocType: async (id) => {
    try {
      const { data: current, error: getError } = await supabase
        .from('document_types')
        .select('is_active')
        .eq('id', id)
        .single()

      if (getError) throw getError

      const newActive = current.is_active === 1 ? 0 : 1

      const { data: updated, error } = await supabase
        .from('document_types')
        .update({ is_active: newActive })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return { success: true, document_type: updated }
    } catch (error) {
      throw error || new Error('Failed to toggle document type')
    }
  },

  // User Accounts State & Actions
  users: [],
  usersTotal: 0,
  usersPages: 1,
  usersCurrentPage: 1,
  usersLoading: false,
  fetchUsers: async (params = {}) => {
    set({ usersLoading: true })
    try {
      const queryParams = new URLSearchParams()
      if (params.page) queryParams.append('page', params.page)
      if (params.limit) queryParams.append('limit', params.limit)
      if (params.search) queryParams.append('search', params.search)
      if (params.role) queryParams.append('role', params.role)
      if (params.status) queryParams.append('status', params.status)

      const res = await api.get(`/users/list.php?${queryParams.toString()}`)
      if (res.data.success) {
        set({
          users: res.data.users,
          usersTotal: res.data.totalItems,
          usersPages: res.data.totalPages,
          usersCurrentPage: res.data.currentPage,
        })
      }
    } catch (error) {
      console.error('Failed to fetch users', error)
    } finally {
      set({ usersLoading: false })
    }
  },
  approveUser: async (id) => {
    try {
      const res = await api.patch('/users/approve.php', { id })
      return res.data
    } catch (error) {
      throw error.response?.data || new Error('Failed to approve user')
    }
  },
  changeUserRole: async (id, role) => {
    try {
      const res = await api.patch('/users/change-role.php', { id, role })
      return res.data
    } catch (error) {
      throw error.response?.data || new Error('Failed to change user role')
    }
  },
  toggleUserActive: async (id, currentStatus) => {
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
      const res = await api.patch('/users/toggle-active.php', { id, status: newStatus })
      return res.data
    } catch (error) {
      throw error.response?.data || new Error('Failed to toggle user status')
    }
  },

  // Activity Log State & Actions
  activityLogs: [],
  activityLogsTotal: 0,
  activityLogsPages: 1,
  activityLogsCurrentPage: 1,
  activityLogsLoading: false,
  fetchActivityLogs: async (params = {}) => {
    set({ activityLogsLoading: true })
    try {
      const page = params.page || 1
      const limit = params.limit || 10
      const from = (page - 1) * limit
      const to = from + limit - 1

      let query = supabase
        .from('activity_logs')
        .select('*, users(*)', { count: 'exact' })

      if (params.action) {
        query = query.eq('action', params.action)
      }
      if (params.search) {
        query = query.or(`action.ilike.%${params.search}%,details.ilike.%${params.search}%`)
      }

      query = query
        .order('created_at', { ascending: false })
        .range(from, to)

      const { data, count, error } = await query

      if (error) throw error

      set({
        activityLogs: data || [],
        activityLogsTotal: count || 0,
        activityLogsPages: Math.ceil((count || 0) / limit),
        activityLogsCurrentPage: page,
      })
    } catch (error) {
      console.error('Failed to fetch activity logs', error)
    } finally {
      set({ activityLogsLoading: false })
    }
  },

  // Clinic Management Actions
  clinicServices: [],
  clinicServicesLoading: false,
  fetchClinicServices: async () => {
    set({ clinicServicesLoading: true })
    try {
      const { data, error } = await supabase
        .from('clinic_services')
        .select('*')
        .eq('is_active', 1)

      if (error) throw error
      set({ clinicServices: data || [] })
    } catch (error) {
      console.error('Failed to fetch clinic services', error)
    } finally {
      set({ clinicServicesLoading: false })
    }
  },

  createClinicService: async (data) => {
    try {
      const { data: newService, error } = await supabase
        .from('clinic_services')
        .insert({
          name: data.name,
          description: data.description,
          estimated_duration_mins: data.estimated_duration_mins || 30,
          is_active: 1
        })
        .select()
        .single()

      if (error) throw error
      return { success: true, service: newService }
    } catch (error) {
      throw error || new Error('Failed to create clinic service')
    }
  },

  clinicSchedules: [],
  clinicSchedulesLoading: false,
  fetchClinicSchedules: async (serviceId, date = '') => {
    set({ clinicSchedulesLoading: true })
    try {
      let query = supabase
        .from('clinic_schedules')
        .select('*, clinic_services(*)')

      if (serviceId) {
        query = query.eq('service_id', serviceId)
      }
      if (date) {
        query = query.eq('schedule_date', date)
      }

      const { data, error } = await query
      if (error) throw error

      set({ clinicSchedules: data || [] })
    } catch (error) {
      console.error('Failed to fetch clinic schedules', error)
    } finally {
      set({ clinicSchedulesLoading: false })
    }
  },

  createClinicSchedule: async (data) => {
    try {
      const { data: newSched, error } = await supabase
        .from('clinic_schedules')
        .insert({
          service_id: data.service_id,
          schedule_date: data.schedule_date,
          start_time: data.start_time,
          end_time: data.end_time,
          max_slots: data.max_slots || 10,
          filled_slots: 0
        })
        .select()
        .single()

      if (error) throw error
      return { success: true, schedule: newSched }
    } catch (error) {
      throw error || new Error('Failed to create schedule slot')
    }
  },

  clinicAppointments: [],
  clinicAppointmentsLoading: false,
  fetchClinicAppointments: async (params = {}) => {
    set({ clinicAppointmentsLoading: true })
    try {
      let query = supabase
        .from('appointments')
        .select('*, residents(*), clinic_services(*), clinic_schedules(*)')

      if (params.status) {
        query = query.eq('status', params.status)
      }
      if (params.date) {
        query = query.eq('clinic_schedules.schedule_date', params.date)
      }
      if (params.service_id) {
        query = query.eq('service_id', params.service_id)
      }

      const { data, error } = await query
      if (error) throw error

      set({ clinicAppointments: data || [] })
    } catch (error) {
      console.error('Failed to fetch clinic appointments', error)
    } finally {
      set({ clinicAppointmentsLoading: false })
    }
  },

  updateAppointmentStatus: async (id, status, staffNotes = '') => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .update({ status, staff_notes: staffNotes })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return { success: true, appointment: data }
    } catch (error) {
      throw error || new Error('Failed to update appointment')
    }
  },

  // Digital ID Management Actions
  generateDigitalId: async (residentId) => {
    try {
      const idNo = `BRGY-${residentId}-${Math.floor(1000 + Math.random() * 9000)}`
      const secureHash = btoa(`id=${idNo}&resident=${residentId}&timestamp=${Date.now()}`)
      const issuedAt = new Date().toISOString().split('T')[0]
      const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('residents')
        .update({
          barangay_id_no: idNo,
          digital_id_secure_hash: secureHash,
          digital_id_issued_at: issuedAt,
          digital_id_expires_at: expiresAt,
          digital_id_status: 'issued'
        })
        .eq('id', residentId)
        .select()
        .single()

      if (error) throw error

      return { success: true, id_details: data }
    } catch (error) {
      throw error || new Error('Failed to generate Digital ID')
    }
  },

  scanVerifyDigitalId: async (hash) => {
    try {
      const res = await api.get(`/digital-id/scan-verify.php?hash=${hash}`)
      return res.data
    } catch (error) {
      throw error.response?.data || new Error('Failed to verify Digital ID hash')
    }
  }
}))
