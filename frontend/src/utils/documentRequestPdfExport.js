function formatDate(dateStr) {
  if (!dateStr) return new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function calculateAge(birthdateStr) {
  if (!birthdateStr) return '—'
  const today = new Date()
  const birthDate = new Date(birthdateStr)
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return age
}

function residentFullName(request) {
  const parts = [
    request.resident_first_name,
    request.resident_middle_name,
    request.resident_last_name,
  ].filter(Boolean)
  return parts.join(' ')
}

function referenceCode(requestId) {
  return `OR-2026${String(requestId).padStart(4, '0')}`
}

function buildDocumentPdfNode(request) {
  const root = document.createElement('div')
  root.style.cssText = [
    'position:fixed',
    'left:-10000px',
    'top:0',
    'z-index:-1',
    'width:794px',
    'min-height:1123px',
    'padding:72px 64px',
    'box-sizing:border-box',
    'background:#ffffff',
    'font-family:Georgia,Times New Roman,serif',
    'color:#111827',
    'line-height:1.6',
  ].join(';')

  const feeText = parseFloat(request.document_fee) > 0
    ? `₱${parseFloat(request.document_fee).toFixed(2)}`
    : 'FREE'

  root.innerHTML = `
    <div style="text-align:center;margin-bottom:28px;">
      <div style="font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">Republic of the Philippines</div>
      <div style="font-size:18px;font-weight:700;margin-top:4px;text-transform:uppercase;">Barangay Baesa, Quezon City</div>
      <div style="font-size:11px;color:#64748b;margin-top:2px;">National Capital Region</div>
      <div style="margin-top:18px;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#0b4ea2;">
        Office of the Barangay Captain
      </div>
    </div>

    <div style="text-align:center;margin:32px 0 24px;">
      <div style="display:inline-block;border-top:2px solid #0b4ea2;border-bottom:2px solid #0b4ea2;padding:10px 28px;font-size:22px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">
        ${escapeHtml(request.document_name)}
      </div>
    </div>

    <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:28px;font-family:Inter,Arial,sans-serif;">
      <div><strong>Reference No.:</strong> ${escapeHtml(referenceCode(request.id))}</div>
      <div><strong>Date Issued:</strong> ${escapeHtml(formatDate(new Date().toISOString()))}</div>
    </div>

    <div style="font-size:14px;margin-bottom:18px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">
      To Whom It May Concern:
    </div>

    <div style="font-size:14px;text-align:justify;margin-bottom:20px;text-indent:48px;">
      This is to certify that
      <strong>${escapeHtml(residentFullName(request))}</strong>,
      ${escapeHtml(String(calculateAge(request.resident_birthdate)))} years old,
      ${escapeHtml(request.resident_civil_status || 'Single')},
      ${escapeHtml(request.resident_sex || '—')}, Filipino, and a bona fide resident of
      ${escapeHtml(request.resident_purok || '—')}, ${escapeHtml(request.resident_address || 'Barangay Baesa, Quezon City')},
      has requested this <strong>${escapeHtml(request.document_name)}</strong>
      for the purpose stated below.
    </div>

    <div style="font-size:13px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px 18px;margin-bottom:24px;font-family:Inter,Arial,sans-serif;">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#64748b;margin-bottom:8px;">Purpose</div>
      <div style="white-space:pre-wrap;">${escapeHtml(request.purpose)}</div>
    </div>

    <div style="font-size:14px;text-align:justify;margin-bottom:28px;text-indent:48px;">
      This certification is issued upon the request of the above-named person for whatever legal purpose it may serve.
      The applicable document fee is <strong>${escapeHtml(feeText)}</strong>.
      Request date: <strong>${escapeHtml(formatDate(request.requested_at))}</strong>.
    </div>

    ${request.notes ? `
      <div style="font-size:12px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:14px 16px;margin-bottom:28px;font-family:Inter,Arial,sans-serif;">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#1d4ed8;margin-bottom:6px;">Staff Remarks</div>
        <div style="white-space:pre-wrap;">${escapeHtml(request.notes)}</div>
      </div>
    ` : ''}

    <div style="font-size:14px;margin-bottom:56px;">
      Issued this <strong>${escapeHtml(formatDate(new Date().toISOString()))}</strong> at Barangay Baesa, Quezon City.
    </div>

    <div style="width:280px;margin-left:auto;text-align:center;font-family:Inter,Arial,sans-serif;">
      <div style="border-bottom:1px solid #111827;height:48px;margin-bottom:8px;"></div>
      <div style="font-size:13px;font-weight:700;">HON. JOSE A. PEREZ</div>
      <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;">Barangay Captain</div>
    </div>

    <div style="margin-top:48px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:10px;color:#94a3b8;text-align:center;font-family:Inter,Arial,sans-serif;">
      Generated by Baesys Barangay System • Request #${escapeHtml(request.id)} • Not valid without official dry seal
    </div>
  `

  return root
}

export async function exportDocumentRequestPdf(request) {
  const root = buildDocumentPdfNode(request)
  document.body.appendChild(root)

  try {
    const { domToCanvas } = await import('modern-screenshot')
    const { default: jsPDF } = await import('jspdf')

    const canvas = await domToCanvas(root, {
      scale: 2,
      backgroundColor: '#ffffff',
    })

    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const imgWidth = canvas.width
    const imgHeight = canvas.height
    const ratio = Math.min(pageWidth / imgWidth, pageHeight / imgHeight)
    const width = imgWidth * ratio
    const height = imgHeight * ratio
    const x = (pageWidth - width) / 2
    const y = 0

    pdf.addImage(imgData, 'PNG', x, y, width, height)
    pdf.save(`${referenceCode(request.id)}-${request.document_name?.replace(/\s+/g, '-').toLowerCase() || 'document'}.pdf`)
  } finally {
    root.remove()
  }
}
