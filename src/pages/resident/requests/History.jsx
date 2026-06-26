// src/pages/resident/requests/History.jsx
import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useResidentStore } from '../../../store/useResidentStore'
import StatusBadge from '../../../components/ui/StatusBadge'
import Spinner from '../../../components/ui/Spinner'

export default function RequestHistory() {
  const { myRequests, myRequestsLoading, fetchMyRequests } = useResidentStore()

  useEffect(() => {
    fetchMyRequests()
  }, [])

  const formatDate = (dateStr) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="space-y-6 py-6">
      {/* Title */}
      <div>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Document Services</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">My Request History</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">View and track all your document requests submitted to the Barangay.</p>
      </div>

      {/* History table card */}
      <div className="card overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Submitted Requests ({myRequests.length})</h3>
          <Link to="/resident/request/new" className="btn btn-primary btn-xs">
            + New Request
          </Link>
        </div>

        {myRequestsLoading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner size="md" />
          </div>
        ) : myRequests.length === 0 ? (
          <div className="text-center py-20 text-slate-400 dark:text-slate-500">
            <svg className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.5L19 9.5V19a2 2 0 01-2 2z" />
            </svg>
            <h4 className="mt-4 text-sm font-semibold text-slate-900 dark:text-white">No requests found</h4>
            <p className="mt-2 text-xs">You have not submitted any document requests yet.</p>
          </div>
        ) : (
          <>
            {/* Desktop View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Document Type</th>
                    <th>Purpose</th>
                    <th>Date Requested</th>
                    <th>Fee</th>
                    <th>Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {myRequests.map((req) => (
                    <tr key={req.id}>
                      <td className="font-semibold text-slate-800 dark:text-slate-200">
                        {req.document_name}
                      </td>
                      <td className="max-w-xs truncate text-slate-500 dark:text-slate-400">
                        {req.purpose}
                      </td>
                      <td className="text-slate-555">{formatDate(req.requested_at)}</td>
                      <td className="font-semibold">
                        {parseFloat(req.document_fee) > 0 ? `₱${parseFloat(req.document_fee).toFixed(2)}` : 'FREE'}
                      </td>
                      <td>
                        <StatusBadge status={req.status} />
                      </td>
                      <td className="text-right">
                        <Link
                          to={`/resident/request/${req.id}`}
                          className="btn btn-secondary btn-xs font-semibold"
                        >
                          View Tracker
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile View */}
            <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {myRequests.map((req) => (
                <div key={req.id} className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-white">{req.document_name}</h4>
                      <span className="text-[10px] text-slate-400 block mt-0.5">{formatDate(req.requested_at)}</span>
                    </div>
                    <StatusBadge status={req.status} />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                    <span className="font-medium text-slate-700 dark:text-slate-300">Purpose:</span> {req.purpose}
                  </p>
                  <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-50 dark:border-slate-900/60">
                    <span className="text-slate-500 dark:text-slate-400">
                      Fee: <span className="font-semibold text-slate-950 dark:text-white">{parseFloat(req.document_fee) > 0 ? `₱${parseFloat(req.document_fee).toFixed(2)}` : 'FREE'}</span>
                    </span>
                    <Link
                      to={`/resident/request/${req.id}`}
                      className="text-accent-600 dark:text-accent-400 font-bold"
                    >
                      View Tracker &rarr;
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
