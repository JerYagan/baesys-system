// src/pages/resident/clinic/History.jsx
import { useEffect, useState } from 'react'
import { useResidentStore } from '../../../store/useResidentStore'
import { useNotifStore } from '../../../store/useNotifStore'
import Spinner from '../../../components/ui/Spinner'
import StatusBadge from '../../../components/ui/StatusBadge'
import { supabase } from '../../../api/supabaseClient'
import { logActivity } from '../../../utils/activityLogger'

export default function MyAppointments() {
  const { myAppointments, myAppointmentsLoading, fetchMyAppointments } = useResidentStore()
  const { success: showSuccess, error: showError } = useNotifStore()
  const [cancellingId, setCancellingId] = useState(null)

  useEffect(() => {
    fetchMyAppointments()
  }, [])

  const handleCancelAppointment = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this clinic appointment?')) return

    setCancellingId(id)
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled', staff_notes: 'Cancelled by resident' })
        .eq('id', id)

      if (error) throw error

      await logActivity('cancel_appointment', `Cancelled clinic appointment #${id}`)
      showSuccess('Appointment cancelled successfully.')
      fetchMyAppointments()
    } catch (err) {
      showError(err.message || 'Failed to cancel appointment.')
    } finally {
      setCancellingId(null)
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '—'
    const normalized = String(dateStr).includes('T') ? dateStr : `${dateStr}T00:00:00`
    const date = new Date(normalized)
    if (Number.isNaN(date.getTime())) return '—'
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatTime = (timeStr) => {
    const [h, m] = timeStr.split(':')
    const hr = parseInt(h)
    const ampm = hr >= 12 ? 'PM' : 'AM'
    const displayHr = hr % 12 || 12
    return `${displayHr}:${m} ${ampm}`
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">History</p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">My Clinic Appointments</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Track and manage your scheduled consultations at the Barangay Health Center.</p>
      </div>

      <div className="card overflow-hidden">
        {myAppointmentsLoading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        ) : myAppointments.length === 0 ? (
          <div className="text-center py-16">
            <svg className="w-12 h-12 mx-auto text-slate-400 opacity-40 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300">No appointments booked</h3>
            <p className="text-sm text-slate-500 mt-1">You haven't scheduled any clinic consultations yet.</p>
          </div>
        ) : (
          <>
            {/* Desktop View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Appointment ID</th>
                    <th>Service Type</th>
                    <th>Date & Time</th>
                    <th>Purpose</th>
                    <th>Status</th>
                    <th>Staff Remarks</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {myAppointments.map((appt) => (
                    <tr key={appt.id}>
                      <td>#{appt.id}</td>
                      <td className="font-semibold text-slate-900 dark:text-white">{appt.service_name}</td>
                      <td>
                        <div>{formatDate(appt.schedule_date)}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                          {formatTime(appt.appointment_time)}
                        </div>
                      </td>
                      <td className="max-w-xs truncate text-xs">{appt.purpose || '—'}</td>
                      <td>
                        <StatusBadge status={appt.status} />
                      </td>
                      <td className="max-w-xs truncate text-xs italic text-slate-500">{appt.staff_notes || '—'}</td>
                      <td className="text-right">
                        {['pending', 'approved'].includes(appt.status) && (
                          <button
                            disabled={cancellingId === appt.id}
                            onClick={() => handleCancelAppointment(appt.id)}
                            className="btn btn-secondary text-red-600 hover:text-red-700 dark:text-red-400 btn-xs"
                          >
                            {cancellingId === appt.id ? 'Cancelling...' : 'Cancel'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile View */}
            <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {myAppointments.map((appt) => (
                <div key={appt.id} className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-white">{appt.service_name}</h4>
                      <span className="text-[10px] text-slate-400 block mt-0.5">Appt #{appt.id}</span>
                    </div>
                    <StatusBadge status={appt.status} />
                  </div>
                  <div className="text-xs text-slate-550 space-y-1">
                    <p><span className="font-medium text-slate-650 dark:text-slate-400">Date & Time:</span> {formatDate(appt.schedule_date)} ({formatTime(appt.appointment_time)})</p>
                    <p><span className="font-medium text-slate-650 dark:text-slate-400">Purpose:</span> {appt.purpose || '—'}</p>
                    {appt.staff_notes && <p className="italic text-slate-500"><span className="font-medium text-slate-650 dark:text-slate-400">Remarks:</span> {appt.staff_notes}</p>}
                  </div>
                  {['pending', 'approved'].includes(appt.status) && (
                    <div className="flex justify-end pt-1">
                      <button
                        disabled={cancellingId === appt.id}
                        onClick={() => handleCancelAppointment(appt.id)}
                        className="text-red-600 hover:text-red-700 dark:text-red-400 font-bold text-xs"
                      >
                        {cancellingId === appt.id ? 'Cancelling...' : 'Cancel Appointment'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
