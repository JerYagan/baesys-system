export function mapAppointment(appt) {
  if (!appt) return null
  return {
    ...appt,
    service_name: appt.clinic_services?.name || '',
    schedule_date: appt.clinic_schedules?.schedule_date || '',
    resident_first_name: appt.residents?.first_name || '',
    resident_last_name: appt.residents?.last_name || '',
  }
}

export function mapClinicSchedule(schedule) {
  if (!schedule) return null
  return {
    ...schedule,
    service_name: schedule.clinic_services?.name || '',
  }
}
