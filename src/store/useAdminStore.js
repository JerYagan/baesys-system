// src/store/useAdminStore.js
// Manages admin-facing data: residents, households, requests, dashboard stats
import { create } from 'zustand'
import api from '../api/axios'
import { supabase } from '../api/supabaseClient'
import { useAuthStore } from './useAuthStore'
import { logActivity } from '../utils/activityLogger'
import { mapAppointment, mapClinicSchedule } from '../utils/clinicMappers'

const toDbRequestStatus = (status) => (status === 'released' ? 'completed' : status)
const fromDbRequestStatus = (status) => (status === 'completed' ? 'released' : status)

const mapDocumentRequest = (req) => {
  if (!req) return null
  const resident = req.residents || {}
  return {
    ...req,
    status: fromDbRequestStatus(req.status),
    notes: req.remarks || '',
    document_name: req.document_types?.name || 'Document',
    document_fee: req.document_types?.fee || 0,
    processing_days: req.document_types?.processing_days || 1,
    resident_first_name: resident.first_name || '',
    resident_last_name: resident.last_name || '',
    resident_middle_name: resident.middle_name || '',
    resident_contact_no: resident.contact_no || '',
    resident_birthdate: resident.birthdate || '',
    resident_sex: resident.sex || '',
    resident_purok: resident.purok || '',
    resident_address: resident.address || '',
    resident_civil_status: resident.civil_status || '',
    requested_at: req.requested_at,
  }
}

const mapOfficialRecord = (official) => {
  if (!official) return null
  return {
    ...official,
    resident_id: official.resident_id || official.residents?.id,
    first_name: official.residents?.first_name || official.first_name || '',
    last_name: official.residents?.last_name || official.last_name || '',
    contact_no: official.residents?.contact_no || official.contact_no || '',
    photo_path: official.residents?.profile_path || official.photo_path || '',
  }
}

async function uploadOfficialPhoto(photoFile) {
  if (!photoFile || !(photoFile instanceof File) || photoFile.size === 0) {
    return null
  }

  const fileExt = photoFile.name.split('.').pop()
  const fileName = `official-${Math.floor(Date.now() / 1000)}-${Math.floor(Math.random() * 1000)}.${fileExt}`
  const filePath = `profiles/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, photoFile, { upsert: true })

  if (uploadError) throw uploadError

  const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath)
  return publicUrl
}

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
      // 1. Total Residents
      const { count: totalResidents, error: errRes } = await supabase
        .from('residents')
        .select('*', { count: 'exact', head: true })
      if (errRes) throw errRes

      // 2. Total Households
      const { count: totalHouseholds, error: errHh } = await supabase
        .from('households')
        .select('*', { count: 'exact', head: true })
      if (errHh) throw errHh

      // 3. Pending Requests
      const { count: pendingRequests, error: errReq } = await supabase
        .from('document_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
      if (errReq) throw errReq

      // 4. Open Blotters (filed or under_mediation)
      const { count: openBlotters, error: errBlotter } = await supabase
        .from('blotter_records')
        .select('*', { count: 'exact', head: true })
        .in('status', ['filed', 'under_mediation'])
      if (errBlotter) throw errBlotter

      // 5. Completed This Month
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)
      const { count: completedThisMonth, error: errComp } = await supabase
        .from('document_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed')
        .gte('updated_at', startOfMonth.toISOString())
      if (errComp) throw errComp

      set({
        dashboardStats: {
          totalResidents: totalResidents || 0,
          totalHouseholds: totalHouseholds || 0,
          pendingRequests: pendingRequests || 0,
          openBlotters: openBlotters || 0,
          completedThisMonth: completedThisMonth || 0,
        }
      })
    } catch (error) {
      console.error('Failed to fetch dashboard stats from Supabase', error)
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

      await logActivity('create_resident', `Created resident #${newResident.id}`)
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

      await logActivity(isArchived ? 'archive_resident' : 'restore_resident', `${isArchived ? 'Archived' : 'Restored'} resident #${id}`)
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
        query = query.eq('status', toDbRequestStatus(params.status))
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

      const mapped = (data || []).map(mapDocumentRequest)

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
          else if (r.status === 'completed') stats.released++
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

      set({ currentRequest: mapDocumentRequest(data) })
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
        .update({
          status: toDbRequestStatus(status),
          remarks: notes || null,
        })
        .eq('id', requestId)
        .select()
        .single()

      if (error) throw error
      await logActivity('update_request_status', `Updated request #${requestId} to ${status}`)
      return { success: true, request: mapDocumentRequest(data) }
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

      set({ officials: (data || []).map(mapOfficialRecord) })
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
      set({ currentOfficial: mapOfficialRecord(data) })
    } catch (error) {
      console.error('Failed to fetch official details', error)
    } finally {
      set({ officialsLoading: false })
    }
  },
  createOfficial: async (formData) => {
    try {
      let firstName, lastName, position, termStart, termEnd, contactNo, photoFile

      if (formData instanceof FormData) {
        firstName = formData.get('first_name')
        lastName = formData.get('last_name')
        position = formData.get('position')
        termStart = formData.get('term_start')
        termEnd = formData.get('term_end')
        contactNo = formData.get('contact_no')
        photoFile = formData.get('photo')
      } else {
        firstName = formData.first_name
        lastName = formData.last_name
        position = formData.position
        termStart = formData.term_start
        termEnd = formData.term_end
        contactNo = formData.contact_no
        photoFile = formData.photo
      }

      const profilePath = await uploadOfficialPhoto(photoFile)

      const { data: newResident, error: residentError } = await supabase
        .from('residents')
        .insert({
          first_name: firstName,
          last_name: lastName,
          birthdate: termStart || '1970-01-01',
          sex: 'Male',
          civil_status: 'Single',
          contact_no: contactNo || null,
          purok: 'Purok 1',
          address: 'Barangay Hall, Barangay Baesa, Quezon City',
          profile_path: profilePath,
        })
        .select()
        .single()

      if (residentError) throw residentError

      const { data, error } = await supabase
        .from('officials')
        .insert({
          resident_id: newResident.id,
          position,
          term_start: termStart,
          term_end: termEnd,
          is_active: 1,
        })
        .select('*, residents(*)')
        .single()

      if (error) throw error
      await logActivity('create_official', `Registered official: ${firstName} ${lastName}`)
      return { success: true, official: mapOfficialRecord(data) }
    } catch (error) {
      throw error || new Error('Failed to create official')
    }
  },
  updateOfficial: async (formData) => {
    try {
      let id, firstName, lastName, position, termStart, termEnd, contactNo, photoFile

      if (formData instanceof FormData) {
        id = formData.get('id')
        firstName = formData.get('first_name')
        lastName = formData.get('last_name')
        position = formData.get('position')
        termStart = formData.get('term_start')
        termEnd = formData.get('term_end')
        contactNo = formData.get('contact_no')
        photoFile = formData.get('photo')
      } else {
        id = formData.id
        firstName = formData.first_name
        lastName = formData.last_name
        position = formData.position
        termStart = formData.term_start
        termEnd = formData.term_end
        contactNo = formData.contact_no
        photoFile = formData.photo
      }

      const { data: current, error: getError } = await supabase
        .from('officials')
        .select('resident_id, residents(profile_path)')
        .eq('id', id)
        .single()

      if (getError) throw getError

      let profilePath = current.residents?.profile_path || null
      if (photoFile && photoFile instanceof File && photoFile.size > 0) {
        profilePath = await uploadOfficialPhoto(photoFile)
      }

      const { error: residentError } = await supabase
        .from('residents')
        .update({
          first_name: firstName,
          last_name: lastName,
          contact_no: contactNo || null,
          profile_path: profilePath,
        })
        .eq('id', current.resident_id)

      if (residentError) throw residentError

      const { data, error } = await supabase
        .from('officials')
        .update({
          position,
          term_start: termStart,
          term_end: termEnd,
        })
        .eq('id', id)
        .select('*, residents(*)')
        .single()

      if (error) throw error
      return { success: true, official: mapOfficialRecord(data) }
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
      return data ? { ...data, body: data.content } : null
    } catch (error) {
      console.error('Failed to fetch announcement detail', error)
      return null
    } finally {
      set({ announcementsLoading: false })
    }
  },
  createAnnouncement: async (data) => {
    try {
      const authorId = useAuthStore.getState().user?.id || null
      const { data: newAnn, error } = await supabase
        .from('announcements')
        .insert({
          title: data.title,
          content: data.body || data.content,
          category: data.category || 'General',
          is_published: data.is_published ?? 1,
          author_id: authorId,
        })
        .select()
        .single()

      if (error) throw error
      await logActivity('create_announcement', `Created announcement: ${data.title}`)
      return { success: true, announcement: { ...newAnn, body: newAnn.content } }
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
          content: data.body || data.content,
          category: data.category,
          is_published: data.is_published ?? 0,
        })
        .eq('id', data.id)
        .select()
        .single()

      if (error) throw error
      await logActivity('update_announcement', `Updated announcement #${data.id}`)
      return { success: true, announcement: { ...updated, body: updated.content } }
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
      const page = params.page || 1
      const limit = params.limit || 10
      const from = (page - 1) * limit
      const to = from + limit - 1

      let query = supabase
        .from('users')
        .select('*', { count: 'exact' })

      if (params.role) {
        query = query.eq('role', params.role)
      }
      if (params.status) {
        query = query.eq('status', params.status)
      }
      if (params.search) {
        query = query.or(
          `first_name.ilike.%${params.search}%,last_name.ilike.%${params.search}%,email.ilike.%${params.search}%`
        )
      }

      query = query.order('created_at', { ascending: false }).range(from, to)

      const { data, count, error } = await query
      if (error) throw error

      set({
        users: data || [],
        usersTotal: count || 0,
        usersPages: Math.ceil((count || 0) / limit),
        usersCurrentPage: page,
      })
    } catch (error) {
      console.error('Failed to fetch users', error)
    } finally {
      set({ usersLoading: false })
    }
  },
  approveUser: async (id) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({ status: 'active' })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      await logActivity('approve_user', `Approved user account #${id}`)
      return { success: true, user: data }
    } catch (error) {
      throw error || new Error('Failed to approve user')
    }
  },
  changeUserRole: async (id, role) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({ role })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      await logActivity('change_user_role', `Changed user #${id} role to ${role}`)
      return { success: true, user: data }
    } catch (error) {
      throw error || new Error('Failed to change user role')
    }
  },
  toggleUserActive: async (id, currentStatus) => {
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
      const { data, error } = await supabase
        .from('users')
        .update({ status: newStatus })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      await logActivity('toggle_user_status', `Set user #${id} status to ${newStatus}`)
      return { success: true, user: data }
    } catch (error) {
      throw error || new Error('Failed to toggle user status')
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
        activityLogs: (data || []).map((log) => ({
          ...log,
          first_name: log.users?.first_name || '',
          last_name: log.users?.last_name || '',
          email: log.users?.email || '',
        })),
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

      set({ clinicSchedules: (data || []).map(mapClinicSchedule) })
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

      set({ clinicAppointments: (data || []).map(mapAppointment) })
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
      await logActivity('update_appointment_status', `Updated appointment #${id} to ${status}`)
      return { success: true, appointment: data }
    } catch (error) {
      throw error || new Error('Failed to update appointment')
    }
  },

  // Digital ID Management Actions
  generateDigitalId: async (residentId) => {
    try {
      const idNo = `BRGY-${residentId}-${Math.floor(1000 + Math.random() * 9000)}`
      const payload = `id=${idNo}&resident=${residentId}&timestamp=${Date.now()}`
      const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload))
      const secureHash = Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
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
      await logActivity('generate_digital_id', `Issued Digital ID for resident #${residentId}`)
      return { success: true, id_details: data }
    } catch (error) {
      throw new Error(error?.message || 'Failed to generate Digital ID')
    }
  },

  scanVerifyDigitalId: async (hash) => {
    try {
      const { data: resident, error } = await supabase
        .from('residents')
        .select('id, first_name, last_name, middle_name, birthdate, sex, purok, address, profile_path, barangay_id_no, digital_id_issued_at, digital_id_expires_at, digital_id_secure_hash, digital_id_status, is_archived')
        .eq('digital_id_secure_hash', hash)
        .maybeSingle()

      if (error) throw error

      if (!resident || resident.digital_id_status !== 'issued') {
        return { success: false, message: 'Digital ID not found or not issued.' }
      }

      if (resident.is_archived) {
        return { success: false, message: 'This resident account is archived. ID is no longer valid.' }
      }

      const today = new Date().toISOString().split('T')[0]
      if (resident.digital_id_expires_at && resident.digital_id_expires_at < today) {
        return { success: false, message: 'This Digital ID has expired.' }
      }

      return { success: true, verified: true, message: 'Digital ID verified successfully.', resident }
    } catch (error) {
      throw new Error(error?.message || 'Failed to verify Digital ID hash')
    }
  }
}))
