/* =====================================================
   QST — Certificate Generation Engine
   ===================================================== */

const GenerateView = (() => {
  let isGenerating  = false;
  let generatedList = [];

  function render() {
    const el = document.getElementById('view-generate');
    const queue = App.importQueue.get();

    el.innerHTML = `
      <div class="page-header">
        <div class="page-title-group">
          <h1 class="page-title">Generate Certificates</h1>
          <p class="page-subtitle">
            ${queue.length > 0
              ? `${queue.length} record${queue.length > 1 ? 's' : ''} ready to generate`
              : 'No records in queue — import data first'}
          </p>
        </div>
      </div>

      ${queue.length === 0 ? renderEmpty() : renderGenerator(queue)}
    `;
  }

  function renderEmpty() {
    return `
      <div class="empty-state">
        <div class="empty-icon"><i class="fa-solid fa-certificate"></i></div>
        <div class="empty-title">No Data in Queue</div>
        <div class="empty-text">Import an Excel or CSV file first to generate certificates in bulk.</div>
        <div style="display:flex;gap:10px;justify-content:center;">
          <button class="btn btn-gold" onclick="App.router.navigate('import')">
            <i class="fa-solid fa-file-arrow-up"></i> Import Data
          </button>
          <button class="btn btn-ghost" onclick="GenerateView.openSingleModal()">
            <i class="fa-solid fa-plus"></i> Single Certificate
          </button>
        </div>
      </div>
    `;
  }

  function renderGenerator(queue) {
    return `
      <div class="gen-layout">
        <!-- Left: Config Panel -->
        <div style="display:flex;flex-direction:column;gap:16px;">
          <div class="card-gold">
            <h3 style="font-family:var(--font-display);font-size:18px;margin-bottom:16px;">Generation Settings</h3>

            <div class="form-group">
              <label class="form-label">Certificate Template</label>
              <select class="form-select" id="gen-template">
                <option value="">— Text only (no template) —</option>
                ${App.state.templates.filter(t => t.fabricJSON).map(t => `
                  <option value="${t.id}" ${queue[0]?.templateId === t.id ? 'selected' : ''}>
                    ${App.utils.escHtml(t.name)}
                  </option>
                `).join('')}
              </select>
              ${App.state.templates.filter(t => t.fabricJSON).length === 0 ? `
                <p class="form-hint" style="color:var(--warning);">
                  <i class="fa-solid fa-triangle-exclamation"></i>
                  No templates with canvas data. <a href="#templates" onclick="App.router.navigate('templates')">Create one first</a>.
                </p>
              ` : ''}
            </div>

            <div class="form-group">
              <label class="form-label">Export Format</label>
              <select class="form-select" id="gen-format">
                <option value="pdf">PDF (Print Quality)</option>
                <option value="png">PNG (Image)</option>
                <option value="jpg">JPG (Image)</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">QR Code Verification</label>
              <label class="toggle-wrap">
                <input type="checkbox" class="toggle-input" id="gen-qr" checked>
                <div class="toggle-track"><div class="toggle-thumb"></div></div>
                <span class="toggle-label">Embed QR code in certificates</span>
              </label>
            </div>

            <div class="form-group">
              <label class="form-label">Cert. Number Auto-generation</label>
              <label class="toggle-wrap">
                <input type="checkbox" class="toggle-input" id="gen-autonumber" checked>
                <div class="toggle-track"><div class="toggle-thumb"></div></div>
                <span class="toggle-label">Generate numbers for blank entries</span>
              </label>
            </div>

            <hr style="border-color:var(--border);margin:12px 0;" />

            <div style="display:flex;flex-direction:column;gap:8px;">
              <button class="btn btn-gold" id="btn-gen-all" onclick="GenerateView.generateAll()" ${isGenerating ? 'disabled' : ''}>
                ${isGenerating ? '<span class="spinner"></span> Generating…' : `<i class="fa-solid fa-gears"></i> Generate All (${queue.length})`}
              </button>
              <button class="btn btn-ghost btn-sm" onclick="App.router.navigate('import')">
                <i class="fa-solid fa-arrow-left"></i> Back to Import
              </button>
              <button class="btn btn-ghost btn-sm" style="color:var(--error);" onclick="GenerateView.clearQueue()">
                <i class="fa-solid fa-trash"></i> Clear Queue
              </button>
            </div>
          </div>

          <!-- Progress Card -->
          <div class="card" id="progress-card" style="display:none;">
            <div style="font-weight:600;margin-bottom:8px;" id="progress-title">Generating…</div>
            <div class="progress-wrap">
              <div class="progress-label">
                <span id="progress-text">0 / ${queue.length}</span>
                <span id="progress-pct">0%</span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill green" id="progress-fill" style="width:0%"></div>
              </div>
            </div>
          </div>

          <!-- Download All -->
          <div class="card" id="download-card" style="display:none;">
            <h4 style="margin-bottom:12px;font-weight:600;">Download</h4>
            <div style="display:flex;flex-direction:column;gap:8px;">
              <button class="btn btn-gold" id="btn-download-zip" onclick="GenerateView.downloadZip()">
                <i class="fa-solid fa-file-zipper"></i> Download All as ZIP
              </button>
              <button class="btn btn-outline" onclick="App.router.navigate('database')">
                <i class="fa-solid fa-database"></i> View in Database
              </button>
            </div>
          </div>
        </div>

        <!-- Right: Queue / Results -->
        <div class="table-wrapper">
          <div class="table-header">
            <span class="table-title">Certificate Queue</span>
            <span class="badge badge-gold">${queue.length}</span>
          </div>
          <div id="queue-list" style="max-height:600px;overflow-y:auto;padding:12px 16px;">
            ${queue.map((item, i) => `
              <div class="gen-queue-item" id="queue-item-${i}">
                <div class="gen-queue-status" id="queue-status-${i}"></div>
                <div style="flex:1;">
                  <div style="font-weight:600;font-size:13px;color:var(--text-primary);">
                    ${App.utils.escHtml(item.candidateName || '—')}
                  </div>
                  <div style="font-size:11px;color:var(--text-muted);">
                    ${App.utils.escHtml(item.courseName || '—')}
                    ${item.certificateNo ? `· <span style="color:var(--gold);font-family:var(--font-mono);">${App.utils.escHtml(item.certificateNo)}</span>` : ''}
                  </div>
                </div>
                <div id="queue-action-${i}"></div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  // ── Single Certificate Modal ────────────────────
  function openSingleModal() {
    App.modal.open(`
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Candidate Name *</label>
          <input type="text" id="s-name" class="form-input" placeholder="John Doe" />
        </div>
        <div class="form-group">
          <label class="form-label">Course Name *</label>
          <input type="text" id="s-course" class="form-input" placeholder="HSE Level 1" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Company Name</label>
          <input type="text" id="s-company" class="form-input" placeholder="ABC Corp" />
        </div>
        <div class="form-group">
          <label class="form-label">Certificate No</label>
          <input type="text" id="s-certno" class="form-input" placeholder="Auto-generate if blank" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Issue Date</label>
          <input type="date" id="s-issue" class="form-input" value="${App.utils.today()}" />
        </div>
        <div class="form-group">
          <label class="form-label">Validity Date</label>
          <input type="date" id="s-validity" class="form-input" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Template</label>
        <select id="s-template" class="form-select">
          <option value="">— No template —</option>
          ${App.state.templates.filter(t => t.fabricJSON).map(t => `<option value="${t.id}">${App.utils.escHtml(t.name)}</option>`).join('')}
        </select>
      </div>
      <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px;">
        <button class="btn btn-ghost" onclick="App.modal.close()">Cancel</button>
        <button class="btn btn-gold" onclick="GenerateView.generateSingle()">
          <i class="fa-solid fa-certificate"></i> Generate
        </button>
      </div>
    `, { title: 'Generate Single Certificate' });
  }

  async function generateSingle() {
    const name     = document.getElementById('s-name')?.value?.trim();
    const course   = document.getElementById('s-course')?.value?.trim();
    const company  = document.getElementById('s-company')?.value?.trim() || '';
    const certno   = document.getElementById('s-certno')?.value?.trim()  || App.numbering.generate();
    const issue    = document.getElementById('s-issue')?.value    || App.utils.today();
    const validity = document.getElementById('s-validity')?.value || '';
    const tplId    = document.getElementById('s-template')?.value || '';

    if (!name)   { App.notify.error('Candidate Name is required'); return; }
    if (!course) { App.notify.error('Course Name is required'); return; }

    const data = { candidateName: name, courseName: course, companyName: company,
      certificateNo: certno, issueDate: issue, validityDate: validity, templateId: tplId };

    App.modal.close();
    App.notify.info('Generating certificate…');

    try {
      const cert = await processSingle(data);
      App.notify.success('Certificate generated!');
      // Trigger download
      if (cert.imageData) {
        downloadAsPdf([cert]);
      }
    } catch(e) {
      App.notify.error('Generation failed: ' + e.message);
    }
  }

  // ── Batch Generation ──────────────────────────────
  async function generateAll() {
    if (isGenerating) return;
    const queue = App.importQueue.get();
    if (!queue.length) { App.notify.error('Queue is empty'); return; }

    const tplId  = document.getElementById('gen-template')?.value || '';
    const format = document.getElementById('gen-format')?.value   || 'pdf';
    const addQR  = document.getElementById('gen-qr')?.checked     ?? true;

    isGenerating = true;
    generatedList = [];

    // Show progress card
    const progCard = document.getElementById('progress-card');
    if (progCard) progCard.style.display = 'block';
    document.getElementById('btn-gen-all').disabled = true;

    for (let i = 0; i < queue.length; i++) {
      const item = { ...queue[i] };
      if (tplId) item.templateId = tplId;

      // Update status indicator
      setStatus(i, 'processing');

      try {
        if (!item.certificateNo) item.certificateNo = App.numbering.generate();
        if (!item.issueDate) item.issueDate = App.utils.today();

        const cert = await processSingle(item, addQR);
        generatedList.push(cert);
        setStatus(i, 'done');
        setAction(i, cert, format);
      } catch(e) {
        console.error('Gen error for row', i, e);
        setStatus(i, 'error');
        setAction(i, null, format, e.message);
      }

      // Update progress bar
      const pct = Math.round(((i + 1) / queue.length) * 100);
      const fill = document.getElementById('progress-fill');
      const text = document.getElementById('progress-text');
      const pctEl = document.getElementById('progress-pct');
      if (fill) fill.style.width = pct + '%';
      if (text) text.textContent = `${i + 1} / ${queue.length}`;
      if (pctEl) pctEl.textContent = pct + '%';

      // Yield to UI
      await sleep(10);
    }

    isGenerating = false;
    App.importQueue.clear();

    const progTitle = document.getElementById('progress-title');
    if (progTitle) progTitle.textContent = `✓ ${generatedList.length} certificates generated`;

    const dlCard = document.getElementById('download-card');
    if (dlCard) dlCard.style.display = 'block';

    App.notify.success(`Generated ${generatedList.length} certificates successfully!`);
  }

  async function processSingle(data, addQR = true) {
    const verifyUrl = `${App.state.settings.verifyBaseUrl}${encodeURIComponent(data.certificateNo)}`;

    // Generate QR if enabled
    let qrDataUrl = '';
    if (addQR) {
      try { qrDataUrl = await App.qrGen.generate(verifyUrl, 150); } catch(e) {}
    }

    // Render certificate using template
    let imageData = '';
    if (data.templateId) {
      const renderData = {
        ...data,
        qrUrl: verifyUrl,
        issueDate: App.utils.formatDate(data.issueDate),
        validityDate: data.validityDate ? App.utils.formatDate(data.validityDate) : '',
      };
      try {
        imageData = await Editor.renderCertificate(data.templateId, renderData);
      } catch(e) {
        console.warn('Template render failed, saving data only:', e.message);
      }
    }

    // Save to database
    const cert = App.certificates.add({
      candidateName: data.candidateName,
      courseName:    data.courseName,
      companyName:   data.companyName || '',
      certificateNo: data.certificateNo,
      issueDate:     data.issueDate,
      validityDate:  data.validityDate || '',
      trainerName:   data.trainerName  || '',
      templateId:    data.templateId   || '',
      qrDataUrl,
      imageData,
      verifyUrl,
    });

    return cert;
  }

  // ── PDF / Image Download ──────────────────────────
  async function downloadAsPdf(certs) {
    const { jsPDF } = window.jspdf;
    if (!jsPDF) { App.notify.error('jsPDF not loaded'); return; }

    for (const cert of certs) {
      if (!cert.imageData) { App.notify.warning(`No image data for ${cert.certificateNo}`); continue; }

      const img = new Image();
      img.src = cert.imageData;
      await new Promise(resolve => { img.onload = resolve; img.onerror = resolve; });

      const w = img.naturalWidth  || 1122;
      const h = img.naturalHeight || 794;
      const orientation = w > h ? 'l' : 'p';

      const doc = new jsPDF({ orientation, unit: 'px', format: [w, h], hotfixes: ['px_scaling'] });
      doc.addImage(cert.imageData, 'PNG', 0, 0, w, h, '', 'FAST');
      doc.save(`${cert.certificateNo || cert.candidateName}_certificate.pdf`);

      await sleep(200);
    }
  }

  async function downloadZip() {
    if (!generatedList.length) { App.notify.error('No generated certificates to download'); return; }
    if (typeof JSZip === 'undefined') { App.notify.error('JSZip not loaded'); return; }

    App.notify.info('Preparing ZIP file…');
    const zip = new JSZip();
    const folder = zip.folder('QST_Certificates');

    for (const cert of generatedList) {
      if (!cert.imageData) continue;
      const base64 = cert.imageData.split(',')[1];
      const filename = `${cert.certificateNo || cert.id}_${(cert.candidateName || 'cert').replace(/[^a-zA-Z0-9]/g, '_')}.png`;
      folder.file(filename, base64, { base64: true });
    }

    const blob = await zip.generateAsync({ type: 'blob' });
    saveAs(blob, `QST_Certificates_${new Date().toISOString().split('T')[0]}.zip`);
    App.notify.success(`ZIP file with ${generatedList.length} certificates downloaded`);
  }

  // ── Queue Management ──────────────────────────────
  function clearQueue() {
    App.modal.confirm('Clear the import queue?', () => {
      App.importQueue.clear();
      App.notify.info('Queue cleared');
      render();
    });
  }

  // ── UI Helpers ────────────────────────────────────
  function setStatus(i, state) {
    const el = document.getElementById(`queue-status-${i}`);
    if (el) el.className = `gen-queue-status ${state}`;
  }

  function setAction(i, cert, format, errorMsg) {
    const el = document.getElementById(`queue-action-${i}`);
    if (!el) return;
    if (errorMsg) {
      el.innerHTML = `<span class="badge badge-error" title="${App.utils.escHtml(errorMsg)}">Error</span>`;
    } else if (cert) {
      el.innerHTML = `
        <button class="btn btn-ghost btn-sm" onclick="GenerateView.downloadOne('${cert.id}', '${format}')">
          <i class="fa-solid fa-download"></i>
        </button>
      `;
    }
  }

  async function downloadOne(certId, format) {
    const cert = App.certificates.getById(certId);
    if (!cert) return;

    if (format === 'pdf') {
      await downloadAsPdf([cert]);
    } else {
      if (!cert.imageData) { App.notify.error('No image data available'); return; }
      const ext = format === 'jpg' ? 'jpg' : 'png';
      App.utils.downloadDataUrl(cert.imageData, `${cert.certificateNo || cert.id}.${ext}`);
    }
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  // Expose globally
  window.GenerateView = {
    render, openSingleModal, generateSingle, generateAll, downloadZip, clearQueue, downloadOne,
  };

  return { render };
})();
