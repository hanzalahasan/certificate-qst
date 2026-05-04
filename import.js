/* =====================================================
   QST — Import Data View (Excel / CSV)
   ===================================================== */

const ImportView = (() => {
  let step = 1;           // 1=upload, 2=map, 3=preview
  let rawData = [];       // parsed rows from XLSX
  let headers = [];       // column headers
  let mapping = {};       // { qstField: excelColumn }
  let validRows = [];
  let errorRows = [];

  const QST_FIELDS = [
    { key: 'candidateName', label: 'Candidate Name', required: true  },
    { key: 'courseName',    label: 'Course Name',    required: true  },
    { key: 'companyName',   label: 'Company Name',   required: false },
    { key: 'certificateNo', label: 'Certificate No', required: false },
    { key: 'issueDate',     label: 'Issue Date',     required: false },
    { key: 'validityDate',  label: 'Validity Date',  required: false },
    { key: 'trainerName',   label: 'Trainer Name',   required: false },
  ];

  const AUTO_MAP = {
    candidateName: ['candidate name','candidate','name','full name','participant','trainee'],
    courseName:    ['course name','course','training','programme','program'],
    companyName:   ['company','company name','organisation','organization','employer'],
    certificateNo: ['certificate no','cert no','certificate number','cert number','cert_no','id'],
    issueDate:     ['issue date','issued','date issued','issue_date','start date'],
    validityDate:  ['validity date','expiry','expiry date','valid until','validity','end date'],
    trainerName:   ['trainer','trainer name','instructor','facilitator'],
  };

  function render() {
    const el = document.getElementById('view-import');
    el.innerHTML = buildStep();
  }

  function buildStep() {
    const steps = [
      { n: 1, label: 'Upload File' },
      { n: 2, label: 'Map Columns' },
      { n: 3, label: 'Preview & Confirm' },
    ];

    const stepsHtml = steps.map((s, i) => `
      ${i > 0 ? '<div class="step-connector"></div>' : ''}
      <div class="import-step ${step === s.n ? 'active' : ''} ${step > s.n ? 'done' : ''}">
        <div class="step-num">${step > s.n ? '<i class="fa-solid fa-check" style="font-size:10px;"></i>' : s.n}</div>
        <span>${s.label}</span>
      </div>
    `).join('');

    return `
      <div class="page-header">
        <div class="page-title-group">
          <h1 class="page-title">Import Data</h1>
          <p class="page-subtitle">Upload Excel or CSV files to generate certificates in bulk</p>
        </div>
        ${App.importQueue.count() > 0 ? `
          <button class="btn btn-gold" onclick="App.router.navigate('generate')">
            <i class="fa-solid fa-certificate"></i> Generate ${App.importQueue.count()} Certificates
          </button>
        ` : ''}
      </div>

      <div class="import-steps" style="margin-bottom:28px;">${stepsHtml}</div>

      <div id="step-content">
        ${step === 1 ? renderStep1() : ''}
        ${step === 2 ? renderStep2() : ''}
        ${step === 3 ? renderStep3() : ''}
      </div>
    `;
  }

  // ── Step 1: Upload ───────────────────────────────
  function renderStep1() {
    return `
      <div class="card-gold" style="max-width:640px;margin:0 auto;">
        <h3 style="font-family:var(--font-display);font-size:20px;margin-bottom:16px;">Upload Excel or CSV File</h3>

        <div class="dropzone" id="dropzone"
          onclick="document.getElementById('file-input').click()"
          ondragover="ImportView.onDragOver(event)"
          ondragleave="ImportView.onDragLeave(event)"
          ondrop="ImportView.onDrop(event)">
          <div class="dropzone-icon"><i class="fa-solid fa-file-arrow-up"></i></div>
          <div class="dropzone-text">Drop your Excel or CSV file here</div>
          <div class="dropzone-sub">Supports .xlsx, .xls, .csv — Max 10 MB</div>
          <div style="margin-top:16px;">
            <button class="btn btn-outline" onclick="event.stopPropagation();document.getElementById('file-input').click()">
              <i class="fa-solid fa-folder-open"></i> Browse File
            </button>
          </div>
          <input type="file" id="file-input" accept=".xlsx,.xls,.csv" style="display:none;"
            onchange="ImportView.handleFile(this.files[0])" />
        </div>

        <div style="margin-top:24px;padding-top:20px;border-top:1px solid var(--border);">
          <p style="font-size:12px;color:var(--text-muted);margin-bottom:12px;">
            <i class="fa-solid fa-circle-info" style="color:var(--gold);"></i>
            Your file should contain column headers in the first row. Required columns:
          </p>
          <div style="display:flex;flex-wrap:wrap;gap:6px;">
            ${QST_FIELDS.map(f => `
              <span class="badge ${f.required ? 'badge-gold' : 'badge-muted'}">
                ${f.required ? '<i class="fa-solid fa-asterisk" style="font-size:8px;"></i> ' : ''}${f.label}
              </span>
            `).join('')}
          </div>
        </div>

        <div style="margin-top:16px;">
          <button class="btn btn-ghost btn-sm" onclick="ImportView.downloadTemplate()">
            <i class="fa-solid fa-download"></i> Download Template File
          </button>
        </div>
      </div>
    `;
  }

  // ── Step 2: Map Columns ──────────────────────────
  function renderStep2() {
    return `
      <div style="max-width:720px;margin:0 auto;">
        <div class="card-gold" style="margin-bottom:16px;">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
            <div class="stat-icon green" style="flex-shrink:0;"><i class="fa-solid fa-check"></i></div>
            <div>
              <div style="font-weight:600;color:var(--text-primary);">File loaded: ${rawData.length} rows detected</div>
              <div style="font-size:12px;color:var(--text-muted);">${headers.length} columns found</div>
            </div>
            <button class="btn btn-ghost btn-sm" style="margin-left:auto;" onclick="ImportView.goStep(1)">
              <i class="fa-solid fa-rotate"></i> Change File
            </button>
          </div>
        </div>

        <div class="table-wrapper" style="margin-bottom:16px;">
          <div class="table-header">
            <span class="table-title">Map Columns</span>
            <button class="btn btn-ghost btn-sm" onclick="ImportView.autoDetect()">
              <i class="fa-solid fa-wand-magic-sparkles"></i> Auto-detect
            </button>
          </div>
          <div style="padding:16px;">
            <div class="mapping-table">
              <div style="display:grid;grid-template-columns:1fr 40px 1fr;gap:10px;padding:6px 0;border-bottom:1px solid var(--border);margin-bottom:6px;">
                <div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:var(--text-muted);font-weight:600;">QST Field</div>
                <div></div>
                <div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:var(--text-muted);font-weight:600;">Your Column</div>
              </div>
              ${QST_FIELDS.map(f => `
                <div class="mapping-row">
                  <div class="mapping-field">
                    ${f.required ? '<span style="color:var(--gold);margin-right:3px;">*</span>' : ''}
                    ${App.utils.escHtml(f.label)}
                  </div>
                  <div class="mapping-arrow"><i class="fa-solid fa-arrow-right"></i></div>
                  <select class="form-select" id="map-${f.key}" onchange="ImportView.setMapping('${f.key}', this.value)">
                    <option value="">— Not mapped —</option>
                    ${headers.map(h => `
                      <option value="${App.utils.escHtml(h)}" ${mapping[f.key] === h ? 'selected' : ''}>
                        ${App.utils.escHtml(h)}
                      </option>
                    `).join('')}
                  </select>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <div style="display:flex;justify-content:flex-end;gap:10px;">
          <button class="btn btn-ghost" onclick="ImportView.goStep(1)">Back</button>
          <button class="btn btn-gold" onclick="ImportView.processMapping()">
            <i class="fa-solid fa-arrow-right"></i> Preview Data
          </button>
        </div>
      </div>
    `;
  }

  // ── Step 3: Preview ──────────────────────────────
  function renderStep3() {
    const totalErrors = errorRows.length;
    const totalValid  = validRows.length;

    return `
      <div style="max-width:960px;margin:0 auto;">
        <!-- Summary Row -->
        <div class="stats-grid" style="margin-bottom:20px;">
          <div class="stat-card">
            <div class="stat-info">
              <span class="stat-label">Total Rows</span>
              <span class="stat-value">${rawData.length}</span>
            </div>
            <div class="stat-icon gold"><i class="fa-solid fa-table"></i></div>
          </div>
          <div class="stat-card">
            <div class="stat-info">
              <span class="stat-label">Valid Rows</span>
              <span class="stat-value">${totalValid}</span>
            </div>
            <div class="stat-icon green"><i class="fa-solid fa-circle-check"></i></div>
          </div>
          <div class="stat-card">
            <div class="stat-info">
              <span class="stat-label">Errors</span>
              <span class="stat-value">${totalErrors}</span>
            </div>
            <div class="stat-icon ${totalErrors > 0 ? 'red' : 'green'}">
              <i class="fa-solid fa-${totalErrors > 0 ? 'circle-xmark' : 'circle-check'}"></i>
            </div>
          </div>
        </div>

        ${totalErrors > 0 ? `
          <div style="background:var(--error-bg);border:1px solid var(--error);border-radius:var(--radius-sm);padding:12px 16px;margin-bottom:16px;font-size:13px;color:var(--error);">
            <i class="fa-solid fa-triangle-exclamation"></i>
            <strong>${totalErrors} row${totalErrors !== 1 ? 's' : ''}</strong> with errors will be skipped.
            You can fix the file and re-upload, or proceed with the ${totalValid} valid rows.
          </div>
        ` : ''}

        <div class="table-wrapper" style="margin-bottom:16px;">
          <div class="table-header">
            <span class="table-title">Data Preview</span>
            <div class="tabs" style="margin:0;border:none;">
              <button class="tab active" onclick="ImportView.switchPreviewTab('valid', this)">
                Valid (${totalValid})
              </button>
              ${totalErrors > 0 ? `
                <button class="tab" onclick="ImportView.switchPreviewTab('errors', this)">
                  Errors (${totalErrors})
                </button>
              ` : ''}
            </div>
          </div>
          <div id="preview-table-container">
            ${renderPreviewTable(validRows)}
          </div>
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;">
          <button class="btn btn-ghost" onclick="ImportView.goStep(2)">
            <i class="fa-solid fa-arrow-left"></i> Back
          </button>
          ${totalValid > 0 ? `
            <div style="display:flex;gap:10px;align-items:center;">
              <span style="font-size:13px;color:var(--text-muted);">Select template:</span>
              <select class="form-select" id="import-template-select" style="width:200px;">
                <option value="">— No template (data only) —</option>
                ${App.state.templates.map(t => `<option value="${t.id}">${App.utils.escHtml(t.name)}</option>`).join('')}
              </select>
              <button class="btn btn-gold" onclick="ImportView.confirmImport()">
                <i class="fa-solid fa-certificate"></i> Import ${totalValid} Records
              </button>
            </div>
          ` : `
            <span style="font-size:13px;color:var(--error);">No valid rows to import.</span>
          `}
        </div>
      </div>
    `;
  }

  function renderPreviewTable(rows) {
    if (!rows.length) return '<div class="empty-state" style="padding:32px;"><div class="empty-icon"><i class="fa-solid fa-table"></i></div><div class="empty-title">No data to display</div></div>';
    return `
      <div style="overflow-x:auto;">
        <table>
          <thead><tr>
            <th>#</th>
            ${QST_FIELDS.map(f => `<th>${App.utils.escHtml(f.label)}</th>`).join('')}
            <th>Errors</th>
          </tr></thead>
          <tbody>
            ${rows.slice(0, 50).map((row, i) => `
              <tr>
                <td style="color:var(--text-muted);">${i + 1}</td>
                ${QST_FIELDS.map(f => `
                  <td class="${f.key === 'candidateName' ? 'td-primary' : ''}"
                    style="${!row[f.key] && f.required ? 'color:var(--error);' : ''}">
                    ${App.utils.escHtml(row[f.key] || '—')}
                  </td>
                `).join('')}
                <td>
                  ${row._errors?.length
                    ? `<span class="badge badge-error" title="${row._errors.join(', ')}">${row._errors.length} error${row._errors.length > 1 ? 's' : ''}</span>`
                    : `<span class="badge badge-success"><i class="fa-solid fa-check"></i></span>`
                  }
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        ${rows.length > 50 ? `<div style="padding:10px 16px;font-size:12px;color:var(--text-muted);">Showing first 50 of ${rows.length} rows</div>` : ''}
      </div>
    `;
  }

  // ── File Handling ────────────────────────────────
  function handleFile(file) {
    if (!file) return;
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) { App.notify.error('File too large. Maximum 10 MB.'); return; }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target.result;
        const wb = XLSX.read(data, { type: 'binary', cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        rawData = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false });

        if (rawData.length === 0) { App.notify.error('File is empty or has no data rows.'); return; }
        headers = Object.keys(rawData[0]);

        autoDetect();
        goStep(2);
      } catch (err) {
        console.error(err);
        App.notify.error('Failed to parse file. Please check the format.');
      }
    };
    reader.readAsBinaryString(file);
  }

  function onDragOver(e) { e.preventDefault(); document.getElementById('dropzone')?.classList.add('drag-over'); }
  function onDragLeave()  { document.getElementById('dropzone')?.classList.remove('drag-over'); }
  function onDrop(e) {
    e.preventDefault();
    document.getElementById('dropzone')?.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  // ── Column Auto-detection ─────────────────────────
  function autoDetect() {
    mapping = {};
    QST_FIELDS.forEach(field => {
      const candidates = AUTO_MAP[field.key] || [];
      const match = headers.find(h => {
        const norm = h.toLowerCase().trim();
        return candidates.some(c => norm === c || norm.includes(c));
      });
      if (match) mapping[field.key] = match;
    });
    // Update select elements if visible
    QST_FIELDS.forEach(f => {
      const el = document.getElementById(`map-${f.key}`);
      if (el && mapping[f.key]) el.value = mapping[f.key];
    });
  }

  function setMapping(key, value) {
    mapping[key] = value;
  }

  // ── Process Mapping ───────────────────────────────
  function processMapping() {
    // Check required mappings
    const missing = QST_FIELDS.filter(f => f.required && !mapping[f.key]);
    if (missing.length) {
      App.notify.error(`Map required fields: ${missing.map(f => f.label).join(', ')}`);
      return;
    }

    validRows = [];
    errorRows = [];

    rawData.forEach((row, i) => {
      const mapped = {};
      const errors = [];

      QST_FIELDS.forEach(f => {
        const col = mapping[f.key];
        if (col) {
          let val = String(row[col] || '').trim();
          // Date cleanup
          if ((f.key === 'issueDate' || f.key === 'validityDate') && val) {
            val = normalizeDate(val);
          }
          mapped[f.key] = val;
        }
      });

      // Validate
      if (!mapped.candidateName) errors.push('Missing Candidate Name');
      if (!mapped.courseName)    errors.push('Missing Course Name');

      if (mapped.certificateNo && App.numbering.isDuplicate(mapped.certificateNo)) {
        errors.push(`Duplicate cert no: ${mapped.certificateNo}`);
      }

      mapped._errors = errors;
      mapped._rowIndex = i + 2;

      if (errors.length) {
        errorRows.push(mapped);
      } else {
        validRows.push(mapped);
      }
    });

    goStep(3);
  }

  function normalizeDate(val) {
    // Try common formats
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(val)) {
      const [d, m, y] = val.split('/');
      return `${y}-${m}-${d}`;
    }
    if (/^\d{2}-\d{2}-\d{4}$/.test(val)) {
      const [d, m, y] = val.split('-');
      return `${y}-${m}-${d}`;
    }
    // Try JS date parse
    const d = new Date(val);
    if (!isNaN(d)) return d.toISOString().split('T')[0];
    return val;
  }

  function switchPreviewTab(type, btn) {
    document.querySelectorAll('.import-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    const container = document.getElementById('preview-table-container');
    if (container) {
      container.innerHTML = renderPreviewTable(type === 'valid' ? validRows : errorRows);
    }
  }

  // ── Confirm Import ────────────────────────────────
  function confirmImport() {
    if (validRows.length === 0) { App.notify.error('No valid rows to import'); return; }
    const tplId = document.getElementById('import-template-select')?.value || null;

    // Assign cert numbers if not provided
    const processed = validRows.map(row => {
      const r = { ...row };
      delete r._errors;
      delete r._rowIndex;
      if (!r.certificateNo) r.certificateNo = App.numbering.generate();
      if (!r.issueDate) r.issueDate = App.utils.today();
      if (tplId) r.templateId = tplId;
      return r;
    });

    App.importQueue.set(processed);
    App.notify.success(`${processed.length} records added to generation queue`);

    // Reset state
    step = 1;
    rawData = []; headers = []; mapping = {}; validRows = []; errorRows = [];

    App.router.navigate('generate');
  }

  // ── Download Template ─────────────────────────────
  function downloadTemplate() {
    if (typeof XLSX === 'undefined') { App.notify.error('XLSX not loaded'); return; }

    const sampleData = [
      {
        candidate_name: 'John Doe',
        course_name: 'HSE Level 1',
        company_name: 'ABC Corporation',
        certificate_no: 'QST-2026-0001',
        issue_date: '2026-01-15',
        validity_date: '2027-01-15',
        trainer_name: 'Mr. James Smith',
      },
      {
        candidate_name: 'Jane Smith',
        course_name: 'Fire Safety',
        company_name: 'XYZ Ltd',
        certificate_no: 'QST-2026-0002',
        issue_date: '2026-01-15',
        validity_date: '2027-01-15',
        trainer_name: 'Ms. Sarah Lee',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Certificates');
    XLSX.writeFile(wb, 'QST_Certificate_Template.xlsx');
    App.notify.success('Template file downloaded');
  }

  function goStep(n) {
    step = n;
    const el = document.getElementById('view-import');
    if (el) el.innerHTML = buildStep();
  }

  // Expose globally
  window.ImportView = {
    render, goStep, handleFile, onDragOver, onDragLeave, onDrop,
    autoDetect, setMapping, processMapping, confirmImport, downloadTemplate,
    switchPreviewTab,
  };

  return { render };
})();
