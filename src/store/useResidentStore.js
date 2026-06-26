// src/store/useResidentStore.js
// Manages resident-facing data: requests, blotters, profile, clinic appointments, digital ID
import { create } from 'zustand'
import QRCode from 'qrcode'
import api from '../api/axios'
import { supabase } from '../api/supabaseClient'
import { useAuthStore } from './useAuthStore'
import { logActivity } from '../utils/activityLogger'
import { mapAppointment, mapClinicSchedule } from '../utils/clinicMappers'

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

export const useResidentStore = create((set, get) => ({
  // My document requests
  myRequests: [],
  myRequestsLoading: false,
  fetchMyRequests: async () => {
    set({ myRequestsLoading: true })
    try {
      const user = useAuthStore.getState().user
      if (!user) throw new Error('Not authenticated')

      const { data: resData, error: resError } = await supabase
        .from('residents')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (resError) throw resError
      if (!resData) throw new Error('Resident profile not found')

      const { data, error } = await supabase
        .from('document_requests')
        .select('*, document_types(*)')
        .eq('resident_id', resData.id)
        .order('requested_at', { ascending: false })

      if (error) throw error
      
      const mapped = (data || []).map(mapDocumentRequest)

      set({ myRequests: mapped })
    } catch (error) {
      console.error('Failed to fetch resident requests', error)
    } finally {
      set({ myRequestsLoading: false })
    }
  },

  createRequest: async (data) => {
    try {
      const user = useAuthStore.getState().user
      if (!user) throw new Error('Not authenticated')

      const { data: resData, error: resError } = await supabase
        .from('residents')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (resError) throw resError
      if (!resData) throw new Error('Resident profile not found')

      const { data: newReq, error } = await supabase
        .from('document_requests')
        .insert({
          resident_id: resData.id,
          document_type_id: data.document_type_id,
          purpose: data.purpose,
          status: 'pending'
        })
        .select()
        .single()

      if (error) throw error
      await logActivity('create_request', `Submitted document request #${newReq.id}`)
      return { success: true, request: newReq }
    } catch (error) {
      throw error || new Error('Failed to submit document request')
    }
  },

  fetchRequestById: async (id) => {
    try {
      const { data, error } = await supabase
        .from('document_requests')
        .select('*, document_types(*), residents(*)')
        .eq('id', id)
        .maybeSingle()

      if (error) throw error

      const mapped = mapDocumentRequest(data)

      return { success: true, request: mapped }
    } catch (error) {
      console.error('Failed to fetch request detail', error)
      throw error
    }
  },

  fetchDocTypes: async () => {
    try {
      const { data, error } = await supabase
        .from('document_types')
        .select('*')
        .eq('is_active', 1)

      if (error) throw error
      return { success: true, document_types: data || [] }
    } catch (error) {
      console.error('Failed to fetch document types', error)
      throw error
    }
  },

  // My blotter records
  myBlotters: [],
  myBlottersLoading: false,
  fetchMyBlotters: async () => {
    set({ myBlottersLoading: true })
    try {
      const user = useAuthStore.getState().user
      if (!user) throw new Error('Not authenticated')

      const fullName = `${user.first_name} ${user.last_name}`
      const { data, error } = await supabase
        .from('blotter_records')
        .select('*')
        .eq('complainant_name', fullName)
        .order('created_at', { ascending: false })

      if (error) throw error
      set({ myBlotters: data || [] })
    } catch (error) {
      console.error('Failed to fetch resident blotters', error)
    } finally {
      set({ myBlottersLoading: false })
    }
  },

  createBlotter: async (data) => {
    try {
      const user = useAuthStore.getState().user
      if (!user) throw new Error('Not authenticated')

      const caseNo = `BL-2026-${Math.floor(1000 + Math.random() * 9000)}`
      const fullName = `${user.first_name} ${user.last_name}`

      const { data: newBlotter, error } = await supabase
        .from('blotter_records')
        .insert({
          case_no: caseNo,
          complainant_name: fullName,
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
      throw error || new Error('Failed to file blotter complaint')
    }
  },

  // Profile info
  profile: null,
  profileLoading: false,
  fetchProfile: async () => {
    set({ profileLoading: true })
    try {
      const user = useAuthStore.getState().user
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('residents')
        .select('*, households!residents_household_id_fkey(*)')
        .eq('user_id', user.id)
        .maybeSingle()
        
      if (error) throw error
      set({ profile: data })
    } catch (error) {
      console.error('Failed to fetch profile info', error)
    } finally {
      set({ profileLoading: false })
    }
  },

  // Change Password
  changePassword: async (currentPassword, newPassword) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })
      if (error) throw error
      return { success: true, message: 'Password updated successfully!' }
    } catch (error) {
      throw error || new Error('Failed to change password')
    }
  },

  // Clinic Services
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

  // Clinic Schedules
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

  // My Appointments
  myAppointments: [],
  myAppointmentsLoading: false,
  fetchMyAppointments: async () => {
    set({ myAppointmentsLoading: true })
    try {
      const user = useAuthStore.getState().user
      if (!user) throw new Error('Not authenticated')

      const { data: resData, error: resError } = await supabase
        .from('residents')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (resError) throw resError
      if (!resData) throw new Error('Resident profile not found')

      const { data, error } = await supabase
        .from('appointments')
        .select('*, clinic_services(*), clinic_schedules(*)')
        .eq('resident_id', resData.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      set({ myAppointments: (data || []).map(mapAppointment) })
    } catch (error) {
      console.error('Failed to fetch appointments', error)
    } finally {
      set({ myAppointmentsLoading: false })
    }
  },

  // Book Appointment
  bookAppointment: async (scheduleId, purpose = '', appointmentTime = '') => {
    try {
      const user = useAuthStore.getState().user
      if (!user) throw new Error('Not authenticated')

      const { data: resData, error: resError } = await supabase
        .from('residents')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (resError) throw resError
      if (!resData) throw new Error('Resident profile not found')

      const { data: schedule, error: schedError } = await supabase
        .from('clinic_schedules')
        .select('*')
        .eq('id', scheduleId)
        .single()

      if (schedError) throw schedError

      if (schedule.filled_slots >= schedule.max_slots) {
        throw new Error('This slot is already full')
      }

      const { data: appointment, error } = await supabase
        .from('appointments')
        .insert({
          resident_id: resData.id,
          service_id: schedule.service_id,
          schedule_id: scheduleId,
          appointment_time: appointmentTime || schedule.start_time,
          purpose,
          status: 'pending'
        })
        .select()
        .single()

      if (error) throw error

      await supabase
        .from('clinic_schedules')
        .update({ filled_slots: schedule.filled_slots + 1 })
        .eq('id', scheduleId)

      await logActivity('book_appointment', `Booked clinic appointment #${appointment.id}`)
      return { success: true, appointment }
    } catch (error) {
      throw error || new Error('Failed to book appointment')
    }
  },

  // Digital ID Details
  digitalId: null,
  digitalIdStatus: 'not_requested',
  digitalIdLoading: false,
  fetchDigitalId: async () => {
    set({ digitalIdLoading: true })
    try {
      const user = useAuthStore.getState().user
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('residents')
        .select('first_name, last_name, middle_name, purok, profile_path, contact_no, barangay_id_no, digital_id_issued_at, digital_id_expires_at, digital_id_secure_hash, digital_id_status')
        .eq('user_id', user.id)
        .maybeSingle()

      if (error) throw error

      const status = data?.digital_id_status || 'not_requested'

      if (data && status === 'issued' && data.barangay_id_no) {
        const qrData = data.digital_id_secure_hash || data.barangay_id_no
        const qr_code_url = await QRCode.toDataURL(qrData, { width: 200, margin: 1 })
        set({
          digitalId: { ...data, qr_code_url },
          digitalIdStatus: status,
        })
      } else {
        set({ digitalId: null, digitalIdStatus: status })
      }
    } catch (error) {
      console.error('Failed to fetch Digital ID details', error)
      set({ digitalId: null, digitalIdStatus: 'not_requested' })
    } finally {
      set({ digitalIdLoading: false })
    }
  },
  
  requestDigitalId: async () => {
    try {
      const user = useAuthStore.getState().user
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('residents')
        .update({ digital_id_status: 'requested' })
        .eq('user_id', user.id)

      if (error) throw error
      await logActivity('request_digital_id', 'Requested Digital Barangay ID')
      set({ digitalIdStatus: 'requested' })
      return { success: true, message: 'Digital ID request submitted successfully!' }
    } catch (error) {
      throw error || new Error('Failed to request Digital ID')
    }
  }
}))
