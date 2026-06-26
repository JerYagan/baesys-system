function formatDate(dateStr) {
  if (!dateStr) return '—'
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

function profileImageSrc(profilePath) {
  if (!profilePath) return ''
  return profilePath.startsWith('/uploads') ? `/backend${profilePath}` : profilePath
}

function residentName(digitalId) {
  return [digitalId.last_name, digitalId.first_name, digitalId.middle_name].filter(Boolean).join(' ')
}

function cardShell() {
  const card = document.createElement('div')
  card.style.cssText = [
    'width:320px',
    'height:480px',
    'border-radius:16px',
    'background:#ffffff',
    'border:2px solid #0b4ea2',
    'box-shadow:0 10px 25px rgba(0,0,0,0.12)',
    'padding:20px',
    'box-sizing:border-box',
    'display:flex',
    'flex-direction:column',
    'justify-content:space-between',
    'font-family:Inter,system-ui,sans-serif',
    'color:#18181b',
  ].join(';')
  return card
}

function buildFrontCard(digitalId) {
  const card = cardShell()
  const photoSrc = profileImageSrc(digitalId.profile_path)

  card.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;border-bottom:1px solid #f1f5f9;padding-bottom:12px;">
      <img src="/images/logo-light.png" alt="Logo" style="width:36px;height:36px;object-fit:contain;" />
      <div>
        <div style="font-size:10px;font-weight:900;color:#0b3a75;text-transform:uppercase;letter-spacing:0.08em;line-height:1.1;">Republic of the Philippines</div>
        <div style="font-size:11px;font-weight:700;color:#18181b;text-transform:uppercase;margin-top:2px;">Barangay Baesa, Quezon City</div>
        <div style="font-size:8px;color:#94a3b8;line-height:1.1;">National Capital Region</div>
      </div>
    </div>
    <div style="display:flex;flex-direction:column;align-items:center;margin:16px 0;gap:12px;">
      <div style="width:112px;height:112px;border-radius:9999px;border:2px solid #e2e8f0;background:#f8fafc;overflow:hidden;display:flex;align-items:center;justify-content:center;">
        ${photoSrc
          ? `<img src="${escapeHtml(photoSrc)}" alt="Profile" crossorigin="anonymous" style="width:100%;height:100%;object-fit:cover;" />`
          : `<div style="font-size:11px;color:#cbd5e1;">No Photo</div>`}
      </div>
      <div style="text-align:center;">
        <div style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.15em;">Resident Name</div>
        <div style="font-size:18px;font-weight:900;text-transform:uppercase;margin-top:2px;">${escapeHtml(residentName(digitalId))}</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;border-top:1px solid #f1f5f9;padding-top:12px;font-size:12px;">
      <div>
        <div style="font-size:9px;color:#94a3b8;text-transform:uppercase;">Purok / Area</div>
        <div style="font-weight:700;color:#1e293b;">${escapeHtml(digitalId.purok || '—')}</div>
      </div>
      <div>
        <div style="font-size:9px;color:#94a3b8;text-transform:uppercase;">Expiration</div>
        <div style="font-weight:700;color:#dc2626;">${escapeHtml(formatDate(digitalId.digital_id_expires_at))}</div>
      </div>
    </div>
    <div style="width:100%;background:#0b3a75;color:#ffffff;border-radius:8px;padding:8px 0;text-align:center;font-weight:900;font-size:12px;text-transform:uppercase;letter-spacing:0.12em;margin-top:12px;">
      ID NO: ${escapeHtml(digitalId.barangay_id_no)}
    </div>
  `

  return card
}

function buildBackCard(digitalId) {
  const card = cardShell()
  const qrSrc = digitalId.qr_code_url || ''

  card.innerHTML = `
    <div style="border-bottom:1px solid #f1f5f9;padding-bottom:8px;text-align:center;">
      <div style="font-size:12px;font-weight:900;color:#0b3a75;text-transform:uppercase;letter-spacing:0.08em;">Terms & Verification</div>
    </div>
    <div style="text-align:center;margin:8px 0;">
      <p style="font-size:10px;color:#475569;line-height:1.5;font-weight:600;margin:0;">
        This certifies that the bearer whose name, photo, and signature appear on this card is a registered resident of Barangay Baesa, Quezon City.
      </p>
    </div>
    <div style="display:flex;flex-direction:column;align-items:center;gap:8px;">
      <div style="padding:8px;background:#ffffff;border-radius:12px;border:1px solid #f1f5f9;">
        ${qrSrc
          ? `<img src="${escapeHtml(qrSrc)}" alt="QR Code" style="width:96px;height:96px;display:block;" />`
          : `<div style="width:96px;height:96px;display:flex;align-items:center;justify-content:center;font-size:10px;color:#94a3b8;">No QR</div>`}
      </div>
      <p style="font-size:8px;color:#94a3b8;text-align:center;max-width:200px;margin:0;line-height:1.4;">
        Scan this QR code to verify ID authenticity.
      </p>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;text-align:center;margin:8px 0;padding-top:8px;border-top:1px solid #f1f5f9;">
      <div style="display:flex;flex-direction:column;justify-content:flex-end;min-height:48px;">
        <div style="border-bottom:1px solid #94a3b8;margin:0 8px;"></div>
        <div style="font-size:8px;font-weight:700;color:#64748b;margin-top:4px;text-transform:uppercase;">Resident Signature</div>
      </div>
      <div style="display:flex;flex-direction:column;justify-content:flex-end;min-height:48px;">
        <div style="font-size:9px;font-weight:900;color:#1e293b;line-height:1.1;">HON. JOSE A. PEREZ</div>
        <div style="font-size:7px;color:#94a3b8;text-transform:uppercase;margin-top:2px;">Barangay Captain</div>
        <div style="border-bottom:1px solid #94a3b8;margin:4px 8px 0;"></div>
        <div style="font-size:8px;font-weight:700;color:#64748b;margin-top:4px;text-transform:uppercase;">Authorized Officer</div>
      </div>
    </div>
    <div style="border-top:1px solid #f1f5f9;padding-top:8px;font-size:9px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
        <span style="color:#94a3b8;text-transform:uppercase;">Issued Date</span>
        <span style="font-weight:600;color:#1e293b;">${escapeHtml(formatDate(digitalId.digital_id_issued_at))}</span>
      </div>
      <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
        <span style="color:#94a3b8;text-transform:uppercase;">Emergency Contact</span>
        <span style="font-weight:700;color:#1e293b;">${escapeHtml(digitalId.contact_no || '—')}</span>
      </div>
      <div style="font-size:7px;color:#94a3b8;line-height:1.2;padding-top:4px;">
        <div style="text-transform:uppercase;">Secure Signature Hash</div>
        <div style="font-family:monospace;margin-top:2px;word-break:break-all;">${escapeHtml(digitalId.digital_id_secure_hash || '—')}</div>
      </div>
    </div>
    <div style="font-size:8px;color:#94a3b8;text-align:center;font-style:italic;border-top:1px solid #f1f5f9;padding-top:6px;line-height:1.3;">
      If found, please return to: Barangay Hall, 22 Saklolo St., Manotoc Subd., Brgy. Baesa, QC.
    </div>
  `

  return card
}

function buildDigitalIdPdfNode(digitalId) {
  const root = document.createElement('div')
  root.style.cssText = [
    'position:fixed',
    'left:-10000px',
    'top:0',
    'z-index:-1',
    'display:flex',
    'flex-direction:row',
    'gap:24px',
    'padding:16px',
    'background:#ffffff',
  ].join(';')

  root.appendChild(buildFrontCard(digitalId))
  root.appendChild(buildBackCard(digitalId))
  return root
}

async function waitForImages(root) {
  const images = [...root.querySelectorAll('img')]
  await Promise.all(
    images.map(
      (img) =>
        new Promise((resolve) => {
          if (img.complete) {
            resolve()
            return
          }
          img.onload = () => resolve()
          img.onerror = () => resolve()
        })
    )
  )
}

export async function exportDigitalIdPdf(digitalId) {
  const root = buildDigitalIdPdfNode(digitalId)
  document.body.appendChild(root)

  try {
    await waitForImages(root)

    const { domToCanvas } = await import('modern-screenshot')
    const { default: jsPDF } = await import('jspdf')

    const canvas = await domToCanvas(root, {
      scale: 2,
      backgroundColor: '#ffffff',
    })

    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const imgWidth = canvas.width
    const imgHeight = canvas.height
    const ratio = Math.min(pageWidth / imgWidth, pageHeight / imgHeight) * 0.92
    const width = imgWidth * ratio
    const height = imgHeight * ratio
    const x = (pageWidth - width) / 2
    const y = (pageHeight - height) / 2

    pdf.addImage(imgData, 'PNG', x, y, width, height)
    pdf.save(`barangay-id-${digitalId.barangay_id_no}.pdf`)
  } finally {
    root.remove()
  }
}
