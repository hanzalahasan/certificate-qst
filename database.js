/* =====================================================
   QST — Certificate Database View
   ===================================================== */

const DatabaseView = (() => {
  let searchQuery   = '';
  let filterStatus  = 'all';
  let filterCourse  = 'all';
  let currentPage   = 1;
  const PAGE_SIZE   = 20;

  function render() {
    const el = document.getElementById('view-database');
    const results = App.certificates.search(searchQuery, { status: filterStatus, course: filterCourse });
    const courses  = getCourses();
    const total    = results.length;
    const pages    = Math.ceil(total / PAGE_SIZE);
    const pageData = results.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    el.innerHTML = `
      <div class="page-header">
        <div class="page-title-group">
          <h1 class="page-title">Certificate Database</h1>
          <p class="page-subtitle">${App.state.certificates.length} certificates stored</p>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-ghost btn-sm" onclick="DatabaseView.exportExcel()">
            <i class="fa-solid fa-file-excel"></i> Export Excel
          </button>
          <button class="btn btn-gold btn-sm" onclick="App.router.navigate('import')">
            <i class="fa-solid fa-plus"></i> Add Certificates
          </button>
        </div>
      </div>

      <!-- Filter Bar -->
      <div class="filter-bar">
        <div class="search-wrap">
          <i class="fa-solid fa-magnifying-glass search-icon"></i>
          <input type="text" class="search-input" placeholder="Search certificates…"
            value="${App.utils.escHtml(searchQuery)}"
            oninput="DatabaseView.setSearch(this.value)" />
        </div>
        <select class="form-select" style="width:140px;" onchange="DatabaseView.setFilter('status', this.value)">
          <option value="all" ${filterStatus === 'all' ? 'selected' : ''}>All Status</option>
          <option value="valid"   ${filterStatus === 'valid'   ? 'selected' : ''}>Valid</option>
          <option value="expired" ${filterStatus === 'expired' ? 'selected' : ''}>Expired</option>
          <option value="revoked" ${filterStatus === 'revoked' ? 'selected' : ''}>Revoked</option>
        </select>
        <select class="form-select" style="width:180px;" onchange="DatabaseView.setFilter('course', this.value)">
          <option value="all">All Courses</option>
          ${courses.map(c => `<option value="${App.utils.escHtml(c)}" ${filterCourse === c ? 'selected' : ''}>${App.utils.escHtml(c)}</option>`).join('')}
        </select>
        <span style="margin-left:auto;font-size:12px;color:var(--text-muted);">${total} result${total !== 1 ? 's' : ''}</span>
      </div>

      <!-- Table -->
      <div class="table-wrapper">
        ${pageData.length ? `
          <table>
            <thead><tr>
              <th>Certificate No</th>
              <th>Candidate</th>
              <th>Course</th>
              <th>Company</th>
              <th>Issue Date</th>
              <th>Validity</th>
              <th>Status</th>
              <th style="text-align:right;">Actions</th>
            </tr></thead>
            <tbody>
              ${pageData.map(c => certRow(c)).join('')}
            </tbody>
          </table>
          <div class="pagination">
            <span>Showing ${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, total)} of ${total}</span>
            <div class="page-btns">
              <button class="page-btn" onclick="DatabaseView.goPage(${currentPage - 1})" ${currentPage <= 1 ? 'disabled' : ''}>
                <i class="fa-solid fa-chevron-left"></i>
              </button>
              ${pageButtons(pages)}
              <button class="page-btn" onclick="DatabaseView.goPage(${currentPage + 1})" ${currentPage >= pages ? 'disabled' : ''}>
                <i class="fa-solid fa-chevron-right"></i>
              </button>
            </div>
          </div>
        ` : `
          <div class="empty-state">
            <div class="empty-icon"><i class="fa-solid fa-database"></i></div>
            <div class="empty-title">${App.state.certificates.length > 0 ? 'No matching certificates' : 'No certificates yet'}</div>
            <div class="empty-text">
              ${App.state.certificates.length > 0 ? 'Try a different search or filter.' : 'Generate your first certificate to see it here.'}
            </div>
            ${App.state.certificates.length === 0 ? `
              <button class="btn btn-gold" onclick="App.router.navigate('import')">
                <i class="fa-solid fa-plus"></i> Import & Generate
              </button>
            ` : ''}
          </div>
        `}
      </div>
    `;
  }

  function certRow(c) {
    const isExpired = c.validityDate && new Date(c.validityDate) < new Date() && c.status !== 'revoked';
    const statusBadge = c.status === 'revoked'
      ? '<span class="badge badge-error">Revoked</span>'
      : isExpired
        ? '<span class="badge badge-warning">Expired</span>'
        : '<span class="badge badge-success">Valid</span>';

    return `
      <tr>
        <td class="td-mono">${App.utils.escHtml(c.certificateNo || '—')}</td>
        <td class="td-primary">${App.utils.escHtml(c.candidateName || '—')}</td>
        <td>${App.utils.escHtml(c.courseName || '—')}</td>
        <td>${App.utils.escHtml(c.companyName || '—')}</td>
        <td>${App.utils.formatDate(c.issueDate)}</td>
        <td>${c.validityDate ? App.utils.formatDate(c.validityDate) : '—'}</td>
        <td>${statusBadge}</td>
        <td style="text-align:right;">
          <div style="display:flex;gap:4px;justify-content:flex-end;">
            <button class="btn btn-ghost btn-sm btn-icon" title="View Details" onclick="DatabaseView.viewCert('${c.id}')">
              <i class="fa-solid fa-eye"></i>
            </button>
            ${c.imageData ? `
              <button class="btn btn-ghost btn-sm btn-icon" title="Download PDF" onclick="DatabaseView.downloadCert('${c.id}')">
                <i class="fa-solid fa-download"></i>
              </button>
            ` : ''}
            ${c.status !== 'revoked' ? `
              <button class="btn btn-ghost btn-sm btn-icon" title="Revoke" onclick="DatabaseView.revokeCert('${c.id}')" style="color:var(--warning);">
                <i class="fa-solid fa-ban"></i>
              </button>
            ` : `
              <button class="btn btn-ghost btn-sm btn-icon" title="Restore" onclick="DatabaseView.restoreCert('${c.id}')" style="color:var(--success);">
                <i class="fa-solid fa-rotate-right"></i>
              </button>
            `}
            <button class="btn btn-ghost btn-sm btn-icon" title="Delete" onclick="DatabaseView.deleteCert('${c.id}')" style="color:var(--error);">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }

  function pageButtons(pages) {
    const buttons = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - 2);
    let end   = Math.min(pages, start + maxVisible - 1);
    if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);

    if (start > 1) {
      buttons.push(`<button class="page-btn" onclick="DatabaseView.goPage(1)">1</button>`);
      if (start > 2) buttons.push(`<span style="padding:0 4px;color:var(--text-muted);">…</span>`);
    }
    for (let p = start; p <= end; p++) {
      buttons.push(`<button class="page-btn ${p === currentPage ? 'active' : ''}" onclick="DatabaseView.goPage(${p})">${p}</button>`);
    }
    if (end < pages) {
      if (end < pages - 1) buttons.push(`<span style="padding:0 4px;color:var(--text-muted);">…</span>`);
      buttons.push(`<button class="page-btn" onclick="DatabaseView.goPage(${pages})">${pages}</button>`);
    }
    return buttons.join('');
  }

  // ── Certificate Detail Modal ──────────────────────
  function viewCert(id) {
    const c = App.certificates.getById(id);
    if (!c) return;

    const isExpired = c.validityDate && new Date(c.validityDate) < new Date() && c.status !== 'revoked';
    const statusClass = c.status === 'revoked' ? 'revoked' : isExpired ? 'expired' : 'valid';
    const statusText  = c.status === 'revoked' ? 'Revoked' : isExpired ? 'Expired' : 'Valid';
    const statusBadgeClass = c.status === 'revoked' ? 'badge-error' : isExpired ? 'badge-warning' : 'badge-success';

    App.modal.open(`
      ${c.imageData ? `
        <div style="text-align:center;margin-bottom:16px;">
          <img src="${c.imageData}" style="max-width:100%;border:1px solid var(--border);border-radius:8px;" />
        </div>
      ` : ''}
      <div class="cert-result-grid" style="margin-bottom:16px;">
        <div class="cert-result-field">
          <label>Certificate No</label>
          <span style="font-family:var(--font-mono);color:var(--gold);">${App.utils.escHtml(c.certificateNo || '—')}</span>
        </div>
        <div class="cert-result-field">
          <label>Status</label>
          <span class="badge ${statusBadgeClass}">${statusText}</span>
        </div>
        <div class="cert-result-field">
          <label>Candidate Name</label>
          <span>${App.utils.escHtml(c.candidateName || '—')}</span>
        </div>
        <div class="cert-result-field">
          <label>Course Name</label>
          <span>${App.utils.escHtml(c.courseName || '—')}</span>
        </div>
        <div class="cert-result-field">
          <label>Company</label>
          <span>${App.utils.escHtml(c.companyName || '—')}</span>
        </div>
        <div class="cert-result-field">
          <label>Trainer</label>
          <span>${App.utils.escHtml(c.trainerName || '—')}</span>
        </div>
        <div class="cert-result-field">
          <label>Issue Date</label>
          <span>${App.utils.formatDate(c.issueDate)}</span>
        </div>
        <div class="cert-result-field">
          <label>Validity Date</label>
          <span>${c.validityDate ? App.utils.formatDate(c.validityDate) : 'No expiry'}</span>
        </div>
        <div class="cert-result-field" style="grid-column:1/-1;">
          <label>Verify URL</label>
          <span style="font-size:12px;word-break:break-all;">
            <a href="${c.verifyUrl || '#'}" target="_blank" style="color:var(--blue-light);">
              ${App.utils.escHtml(c.verifyUrl || '—')}
            </a>
          </span>
        </div>
        <div class="cert-result-field">
          <label>Created At</label>
          <span>${App.utils.formatDateTime(c.createdAt)}</span>
        </div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        ${c.imageData ? `
          <button class="btn btn-gold btn-sm" onclick="DatabaseView.downloadCert('${id}');App.modal.close();">
            <i class="fa-solid fa-download"></i> Download PDF
          </button>
          <button class="btn btn-outline btn-sm" onclick="DatabaseView.downloadCertPng('${id}')">
            <i class="fa-solid fa-image"></i> Download PNG
          </button>
        ` : ''}
        <button class="btn btn-ghost btn-sm" onclick="App.utils.copyText('${App.utils.escHtml(c.certificateNo || '')}')">
          <i class="fa-solid fa-copy"></i> Copy Cert No
        </button>
        ${c.status !== 'revoked' ? `
          <button class="btn btn-danger btn-sm" onclick="DatabaseView.revokeCert('${id}');App.modal.close();">
            <i class="fa-solid fa-ban"></i> Revoke
          </button>
        ` : `
          <button class="btn btn-ghost btn-sm" style="color:var(--success);" onclick="DatabaseView.restoreCert('${id}');App.modal.close();">
            <i class="fa-solid fa-rotate-right"></i> Restore
          </button>
        `}
        <button class="btn btn-ghost btn-sm" style="margin-left:auto;" onclick="App.modal.close()">Close</button>
      </div>
    `, { title: 'Certificate Details', width: '640px' });
  }

  async function downloadCert(id) {
    const cert = App.certificates.getById(id);
    if (!cert?.imageData) { App.notify.error('No image data for this certificate'); return; }

    const { jsPDF } = window.jspdf;
    if (!jsPDF) { App.notify.error('jsPDF not loaded'); return; }

    const img = new Image();
    img.src = cert.imageData;
    await new Promise(r => { img.onload = r; img.onerror = r; });

    const w = img.naturalWidth  || 1122;
    const h = img.naturalHeight || 794;
    const doc = new jsPDF({ orientation: w > h ? 'l' : 'p', unit: 'px', format: [w, h], hotfixes: ['px_scaling'] });
    doc.addImage(cert.imageData, 'PNG', 0, 0, w, h, '', 'FAST');
    doc.save(`${cert.certificateNo || cert.id}_certificate.pdf`);
    App.notify.success('PDF downloaded');
  }

  function downloadCertPng(id) {
    const cert = App.certificates.getById(id);
    if (!cert?.imageData) { App.notify.error('No image data'); return; }
    App.utils.downloadDataUrl(cert.imageData, `${cert.certificateNo || cert.id}_certificate.png`);
    App.notify.success('PNG downloaded');
  }

  // ── Actions ───────────────────────────────────────
  function revokeCert(id) {
    const c = App.certificates.getById(id);
    if (!c) return;
    App.modal.confirm(`Revoke certificate ${c.certificateNo || c.id}? It will show as invalid on verification.`, () => {
      App.certificates.revoke(id);
      App.notify.warning('Certificate revoked');
      render();
    });
  }

  function restoreCert(id) {
    App.certificates.restore(id);
    App.notify.success('Certificate restored to valid');
    render();
  }

  function deleteCert(id) {
    const c = App.certificates.getById(id);
    if (!c) return;
    App.modal.confirm(`Permanently delete certificate ${c.certificateNo || c.id}? This cannot be undone.`, () => {
      App.certificates.delete(id);
      App.notify.success('Certificate deleted');
      if (currentPage > 1 && App.certificates.search(searchQuery, { status: filterStatus, course: filterCourse }).length <= (currentPage - 1) * PAGE_SIZE) {
        currentPage--;
      }
      render();
    });
  }

  // ── Filters ───────────────────────────────────────
  function setSearch(q) {
    searchQuery = q;
    currentPage = 1;
    render();
  }

  function setFilter(key, value) {
    if (key === 'status') filterStatus = value;
    if (key === 'course') filterCourse = value;
    currentPage = 1;
    render();
  }

  function goPage(n) {
    const results = App.certificates.search(searchQuery, { status: filterStatus, course: filterCourse });
    const pages = Math.ceil(results.length / PAGE_SIZE);
    if (n < 1 || n > pages) return;
    currentPage = n;
    render();
  }

  function getCourses() {
    return [...new Set(App.state.certificates.map(c => c.courseName).filter(Boolean))].sort();
  }

  // ── Export ────────────────────────────────────────
  function exportExcel() {
    if (typeof XLSX === 'undefined') { App.notify.error('XLSX library not loaded'); return; }
    const results = App.certificates.search(searchQuery, { status: filterStatus, course: filterCourse });
    const data = results.map(c => ({
      'Certificate No': c.certificateNo || '',
      'Candidate Name': c.candidateName || '',
      'Course Name':    c.courseName    || '',
      'Company':        c.companyName   || '',
      'Trainer':        c.trainerName   || '',
      'Issue Date':     App.utils.formatDate(c.issueDate),
      'Validity Date':  c.validityDate ? App.utils.formatDate(c.validityDate) : '',
      'Status':         c.status        || '',
      'Verify URL':     c.verifyUrl     || '',
      'Generated At':   App.utils.formatDateTime(c.createdAt),
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Certificates');
    XLSX.writeFile(wb, `QST_Certificate_DB_${new Date().toISOString().split('T')[0]}.xlsx`);
    App.notify.success(`Exported ${data.length} records`);
  }

  // Expose globally
  window.DatabaseView = {
    render, viewCert, downloadCert, downloadCertPng, revokeCert, restoreCert, deleteCert,
    setSearch, setFilter, goPage, exportExcel,
  };

  return { render };
})();
