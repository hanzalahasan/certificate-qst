/* =====================================================
   QST — Verification View (internal + standalone)
   ===================================================== */

const VerifyView = (() => {
  function render() {
    const el = document.getElementById('view-verify');
    el.innerHTML = `
      <div class="page-header">
        <div class="page-title-group">
          <h1 class="page-title">Certificate Verification</h1>
          <p class="page-subtitle">Verify any certificate by number or QR code</p>
        </div>
        <a href="verify.html" target="_blank" class="btn btn-outline btn-sm">
          <i class="fa-solid fa-arrow-up-right-from-square"></i> Public Portal
        </a>
      </div>

      <!-- Search Section -->
      <div class="verify-hero" style="padding:32px 0 24px;">
        <div class="verify-logo-wrap">
          <i class="fa-solid fa-shield-check"></i>
        </div>
        <h2 class="verify-title" style="font-size:26px;">Verify a Certificate</h2>
        <p class="verify-sub">Enter a certificate number to check its authenticity and status</p>

        <div class="verify-search-form">
          <input type="text" id="verify-input" class="form-input"
            placeholder="e.g. QST-2026-0001"
            onkeydown="if(event.key==='Enter') VerifyView.lookup()" />
          <button class="btn btn-gold" onclick="VerifyView.lookup()">
            <i class="fa-solid fa-magnifying-glass"></i> Verify
          </button>
        </div>
      </div>

      <!-- Result Area -->
      <div id="verify-result" style="max-width:640px;margin:0 auto;"></div>

      <!-- Divider -->
      <div style="max-width:640px;margin:24px auto;height:1px;background:var(--border);"></div>

      <!-- Recent Verifications log -->
      <div style="max-width:640px;margin:0 auto;">
        <div class="section-header">
          <span class="section-title" style="font-size:16px;">Recent Searches</span>
        </div>
        <div id="verify-history"></div>
      </div>
    `;

    renderHistory();
  }

  function lookup() {
    const input = document.getElementById('verify-input');
    const query = input?.value?.trim();
    if (!query) { App.notify.warning('Enter a certificate number'); return; }

    const cert = App.certificates.getByCertNo(query);
    renderResult(cert, query);

    // Track scan
    if (cert) {
      cert.verificationScans = (cert.verificationScans || 0) + 1;
      App.storage.saveCertificates();
    }

    // Save to history
    saveHistory(query, !!cert);
    renderHistory();
  }

  function renderResult(cert, query) {
    const container = document.getElementById('verify-result');
    if (!container) return;

    if (!cert) {
      container.innerHTML = `
        <div class="cert-result-card">
          <div class="cert-result-header">
            <div class="cert-result-icon revoked" style="background:var(--error-bg);color:var(--error);">
              <i class="fa-solid fa-circle-xmark"></i>
            </div>
            <div>
              <div style="font-weight:700;font-size:16px;color:var(--error);">Certificate Not Found</div>
              <div style="font-size:13px;color:var(--text-muted);">No certificate found for: <strong>${App.utils.escHtml(query)}</strong></div>
            </div>
          </div>
          <div class="cert-result-body">
            <p style="font-size:13px;color:var(--text-secondary);">
              This certificate number does not exist in our system. It may be invalid, fake, or not yet recorded.
              <br><br>If you believe this is an error, please contact QST directly.
            </p>
          </div>
        </div>
      `;
      return;
    }

    const isExpired = cert.validityDate && new Date(cert.validityDate) < new Date() && cert.status !== 'revoked';
    const statusClass = cert.status === 'revoked' ? 'revoked' : isExpired ? 'expired' : 'valid';
    const statusText  = cert.status === 'revoked' ? 'REVOKED' : isExpired ? 'EXPIRED' : 'VALID';
    const statusColor = cert.status === 'revoked' ? 'var(--error)' : isExpired ? 'var(--warning)' : 'var(--success)';
    const statusIcon  = cert.status === 'revoked' ? 'fa-circle-xmark' : isExpired ? 'fa-clock' : 'fa-circle-check';
    const statusBg    = cert.status === 'revoked' ? 'var(--error-bg)' : isExpired ? 'var(--warning-bg)' : 'var(--success-bg)';

    container.innerHTML = `
      <div class="cert-result-card" style="animation:toastIn 200ms ease forwards;">
        <div class="cert-result-header">
          <div class="cert-result-icon ${statusClass}" style="background:${statusBg};color:${statusColor};">
            <i class="fa-solid ${statusIcon}"></i>
          </div>
          <div>
            <div style="font-size:22px;font-weight:700;color:${statusColor};">${statusText}</div>
            <div style="font-family:var(--font-mono);font-size:14px;color:var(--gold);">${App.utils.escHtml(cert.certificateNo || '')}</div>
          </div>
          <div style="margin-left:auto;">
            ${cert.qrDataUrl ? `<img src="${cert.qrDataUrl}" style="width:64px;height:64px;" />` : ''}
          </div>
        </div>
        <div class="cert-result-body">
          <div class="cert-result-grid">
            <div class="cert-result-field">
              <label>Candidate Name</label>
              <span>${App.utils.escHtml(cert.candidateName || '—')}</span>
            </div>
            <div class="cert-result-field">
              <label>Course Name</label>
              <span>${App.utils.escHtml(cert.courseName || '—')}</span>
            </div>
            <div class="cert-result-field">
              <label>Company</label>
              <span>${App.utils.escHtml(cert.companyName || '—')}</span>
            </div>
            <div class="cert-result-field">
              <label>Trainer</label>
              <span>${App.utils.escHtml(cert.trainerName || '—')}</span>
            </div>
            <div class="cert-result-field">
              <label>Issue Date</label>
              <span>${App.utils.formatDate(cert.issueDate)}</span>
            </div>
            <div class="cert-result-field">
              <label>Expiry Date</label>
              <span style="${isExpired ? 'color:var(--warning);' : ''}">
                ${cert.validityDate ? App.utils.formatDate(cert.validityDate) : 'No expiry'}
              </span>
            </div>
          </div>

          ${cert.status === 'revoked' ? `
            <div style="margin-top:14px;padding:10px 12px;background:var(--error-bg);border-radius:var(--radius-sm);font-size:13px;color:var(--error);">
              <i class="fa-solid fa-triangle-exclamation"></i>
              This certificate has been <strong>revoked</strong> and is no longer valid.
              ${cert.revokedAt ? `Revoked on ${App.utils.formatDate(cert.revokedAt)}.` : ''}
            </div>
          ` : isExpired ? `
            <div style="margin-top:14px;padding:10px 12px;background:var(--warning-bg);border-radius:var(--radius-sm);font-size:13px;color:var(--warning);">
              <i class="fa-solid fa-clock"></i>
              This certificate <strong>expired</strong> on ${App.utils.formatDate(cert.validityDate)}.
              The holder should renew their certification.
            </div>
          ` : `
            <div style="margin-top:14px;padding:10px 12px;background:var(--success-bg);border-radius:var(--radius-sm);font-size:13px;color:var(--success);">
              <i class="fa-solid fa-circle-check"></i>
              This certificate is <strong>valid and authentic</strong>. Issued by QST Training and Consultancy.
            </div>
          `}

          <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;">
            ${cert.imageData ? `
              <button class="btn btn-outline btn-sm" onclick="DatabaseView.downloadCert('${cert.id}')">
                <i class="fa-solid fa-download"></i> Download Certificate
              </button>
            ` : ''}
            <button class="btn btn-ghost btn-sm" onclick="App.utils.copyText('${App.utils.escHtml(cert.certificateNo || '')}')">
              <i class="fa-solid fa-copy"></i> Copy No.
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // ── History ───────────────────────────────────────
  function saveHistory(query, found) {
    const key = 'qst_verify_history';
    let history = [];
    try { history = JSON.parse(localStorage.getItem(key) || '[]'); } catch(e) {}
    history.unshift({ query, found, time: new Date().toISOString() });
    history = history.slice(0, 10);
    localStorage.setItem(key, JSON.stringify(history));
  }

  function renderHistory() {
    const container = document.getElementById('verify-history');
    if (!container) return;

    let history = [];
    try { history = JSON.parse(localStorage.getItem('qst_verify_history') || '[]'); } catch(e) {}

    if (!history.length) {
      container.innerHTML = `<div style="font-size:13px;color:var(--text-muted);text-align:center;padding:20px 0;">No recent searches</div>`;
      return;
    }

    container.innerHTML = history.map(h => `
      <div class="activity-item" style="cursor:pointer;" onclick="document.getElementById('verify-input').value='${App.utils.escHtml(h.query)}';VerifyView.lookup();">
        <div class="activity-dot" style="background:${h.found ? 'var(--success)' : 'var(--error)'}"></div>
        <div>
          <div class="activity-text">
            <strong style="font-family:var(--font-mono);">${App.utils.escHtml(h.query)}</strong>
            — ${h.found ? '<span style="color:var(--success);">Found</span>' : '<span style="color:var(--error);">Not found</span>'}
          </div>
          <div class="activity-time">${App.utils.formatDateTime(h.time)}</div>
        </div>
        <i class="fa-solid fa-rotate-right" style="color:var(--text-muted);font-size:11px;margin-left:auto;"></i>
      </div>
    `).join('');
  }

  // Expose globally
  window.VerifyView = { render, lookup };

  return { render, lookup };
})();

/* =====================================================
   Standalone verify page helper (used by verify.html)
   ===================================================== */
function initVerifyPage() {
  const params = new URLSearchParams(location.search);
  const certNo = params.get('cert') || params.get('n');

  if (certNo) {
    const input = document.getElementById('verify-input');
    if (input) {
      input.value = certNo;
      verifyLookup();
    }
  }
}

function verifyLookup() {
  const input = document.getElementById('verify-input');
  const query = input?.value?.trim();
  if (!query) return;

  // Load data from localStorage
  let certs = [];
  try { certs = JSON.parse(localStorage.getItem('qst_certificates') || '[]'); } catch(e) {}

  const cert = certs.find(c => c.certificateNo?.toLowerCase() === query.toLowerCase());
  const container = document.getElementById('verify-result');
  if (!container) return;

  if (!cert) {
    container.innerHTML = notFoundHtml(query);
    return;
  }

  const isExpired = cert.validityDate && new Date(cert.validityDate) < new Date() && cert.status !== 'revoked';
  const statusText  = cert.status === 'revoked' ? 'REVOKED' : isExpired ? 'EXPIRED' : 'VALID';
  const statusColor = cert.status === 'revoked' ? '#DC2626' : isExpired ? '#D97706' : '#16A34A';
  const statusIcon  = cert.status === 'revoked' ? '✗' : isExpired ? '⏰' : '✓';

  container.innerHTML = `
    <div style="background:#0F1F38;border:1px solid rgba(201,168,76,.3);border-radius:16px;overflow:hidden;max-width:560px;margin:0 auto;">
      <div style="padding:20px 24px;background:linear-gradient(135deg,#0C1830,#0F1F38);border-bottom:1px solid rgba(201,168,76,.2);display:flex;align-items:center;gap:16px;">
        <div style="width:52px;height:52px;border-radius:50%;background:${statusColor}22;color:${statusColor};display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;">${statusIcon}</div>
        <div>
          <div style="font-size:24px;font-weight:700;color:${statusColor};">${statusText}</div>
          <div style="font-family:monospace;font-size:14px;color:#C9A84C;">${escHtml(cert.certificateNo || '')}</div>
        </div>
      </div>
      <div style="padding:20px 24px;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px;">
          ${fieldHtml('Candidate Name', cert.candidateName)}
          ${fieldHtml('Course Name',    cert.courseName)}
          ${fieldHtml('Company',        cert.companyName)}
          ${fieldHtml('Trainer',        cert.trainerName)}
          ${fieldHtml('Issue Date',     formatDate(cert.issueDate))}
          ${fieldHtml('Expiry Date',    cert.validityDate ? formatDate(cert.validityDate) : 'No expiry')}
        </div>
        <div style="padding:10px 12px;background:${statusColor}18;border-radius:8px;font-size:13px;color:${statusColor};">
          ${cert.status === 'revoked'
            ? '⚠ This certificate has been revoked and is no longer valid.'
            : isExpired
              ? '⚠ This certificate has expired. The holder should renew their certification.'
              : '✓ This certificate is valid and authentic. Issued by QST Training and Consultancy.'}
        </div>
      </div>
    </div>
  `;
}

function notFoundHtml(query) {
  return `
    <div style="background:#0F1F38;border:1px solid rgba(220,38,38,.3);border-radius:16px;overflow:hidden;max-width:560px;margin:0 auto;text-align:center;padding:40px 24px;">
      <div style="font-size:48px;margin-bottom:12px;">✗</div>
      <div style="font-size:20px;font-weight:700;color:#DC2626;margin-bottom:8px;">Certificate Not Found</div>
      <div style="color:#7A9AB8;font-size:14px;">No certificate found for: <strong style="color:#E2ECF8;">${escHtml(query)}</strong></div>
    </div>
  `;
}

function fieldHtml(label, value) {
  return `<div><div style="font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#7A9AB8;margin-bottom:2px;">${label}</div><div style="font-size:14px;font-weight:500;color:#E2ECF8;">${escHtml(value || '—')}</div></div>`;
}

function escHtml(str) {
  const d = document.createElement('div');
  d.textContent = String(str || '');
  return d.innerHTML;
}

function formatDate(str) {
  if (!str) return '—';
  try {
    return new Date(str).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return str; }
}
