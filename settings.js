/* =====================================================
   QST — Settings View
   ===================================================== */

const SettingsView = (() => {
  function render() {
    const s = App.state.settings;
    const el = document.getElementById('view-settings');

    el.innerHTML = `
      <div class="page-header">
        <div class="page-title-group">
          <h1 class="page-title">Settings</h1>
          <p class="page-subtitle">Configure QST Certificate Manager</p>
        </div>
      </div>

      <div class="grid-2" style="align-items:start;">
        <!-- Left Column -->
        <div style="display:flex;flex-direction:column;gap:16px;">

          <!-- Company Info -->
          <div class="card-gold">
            <h3 style="font-family:var(--font-display);font-size:20px;margin-bottom:16px;">
              <i class="fa-solid fa-building" style="color:var(--gold);margin-right:8px;font-size:16px;"></i>
              Company Information
            </h3>
            <div class="form-group">
              <label class="form-label">Company Name</label>
              <input type="text" id="set-company-name" class="form-input" value="${App.utils.escHtml(s.companyName || '')}" />
            </div>
            <div class="form-group">
              <label class="form-label">Company Email</label>
              <input type="email" id="set-company-email" class="form-input" value="${App.utils.escHtml(s.companyEmail || '')}" />
            </div>
            <div class="form-group">
              <label class="form-label">Website</label>
              <input type="url" id="set-website" class="form-input" value="${App.utils.escHtml(s.website || '')}" />
            </div>
            <div class="form-group">
              <label class="form-label">Company Logo</label>
              <label class="btn btn-ghost btn-sm" style="cursor:pointer;display:inline-flex;">
                <i class="fa-solid fa-upload"></i> Upload Logo
                <input type="file" accept="image/*" style="display:none;" onchange="SettingsView.uploadLogo(this)" />
              </label>
              ${s.logoData ? `<img src="${s.logoData}" style="display:block;margin-top:8px;max-height:60px;border-radius:4px;" />` : ''}
            </div>
          </div>

          <!-- Certificate Numbering -->
          <div class="card-gold">
            <h3 style="font-family:var(--font-display);font-size:20px;margin-bottom:16px;">
              <i class="fa-solid fa-hashtag" style="color:var(--gold);margin-right:8px;font-size:16px;"></i>
              Certificate Numbering
            </h3>
            <div class="form-group">
              <label class="form-label">Number Format</label>
              <input type="text" id="set-num-format" class="form-input"
                value="${App.utils.escHtml(s.numberFormat || 'QST-{YEAR}-{SEQ:4}')}"
                oninput="SettingsView.updatePreview()" />
              <p class="form-hint">
                Tokens: <code style="color:var(--gold);">{YEAR}</code> <code style="color:var(--gold);">{MONTH}</code>
                <code style="color:var(--gold);">{DAY}</code> <code style="color:var(--gold);">{SEQ:4}</code> (4-digit sequence)
              </p>
            </div>
            <div class="form-group">
              <label class="form-label">Preview</label>
              <div class="number-preview" id="num-preview">
                ${App.numbering.preview(s.numberFormat || 'QST-{YEAR}-{SEQ:4}')}
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Next Sequence Number</label>
              <input type="number" id="set-next-seq" class="form-input" value="${s.nextSeq || 1}" min="1" />
              <p class="form-hint">The next certificate will use this sequence number</p>
            </div>
          </div>

        </div>

        <!-- Right Column -->
        <div style="display:flex;flex-direction:column;gap:16px;">

          <!-- Verification -->
          <div class="card-gold">
            <h3 style="font-family:var(--font-display);font-size:20px;margin-bottom:16px;">
              <i class="fa-solid fa-qrcode" style="color:var(--gold);margin-right:8px;font-size:16px;"></i>
              Verification Portal
            </h3>
            <div class="form-group">
              <label class="form-label">QR Verification Base URL</label>
              <input type="url" id="set-verify-url" class="form-input" value="${App.utils.escHtml(s.verifyBaseUrl || '')}" />
              <p class="form-hint">QR codes will link to: <code style="color:var(--gold);">[base-url][cert-number]</code></p>
            </div>
            <div style="padding:10px 12px;background:var(--gold-glow);border:1px solid var(--gold-border);border-radius:var(--radius-sm);font-size:12px;color:var(--text-secondary);">
              <strong style="color:var(--gold);">Tip:</strong> For offline use, the public verify page
              (<code>verify.html</code>) reads data from the same browser's localStorage.
              Deploy both files to the same web server for online verification.
            </div>
          </div>

          <!-- Appearance -->
          <div class="card-gold">
            <h3 style="font-family:var(--font-display);font-size:20px;margin-bottom:16px;">
              <i class="fa-solid fa-palette" style="color:var(--gold);margin-right:8px;font-size:16px;"></i>
              Appearance
            </h3>
            <div class="form-group">
              <label class="form-label">Theme</label>
              <div style="display:flex;gap:10px;">
                <button class="btn ${App.state.settings.theme !== 'light' ? 'btn-gold' : 'btn-ghost'}" onclick="SettingsView.setTheme('dark')">
                  <i class="fa-solid fa-moon"></i> Dark
                </button>
                <button class="btn ${App.state.settings.theme === 'light' ? 'btn-gold' : 'btn-ghost'}" onclick="SettingsView.setTheme('light')">
                  <i class="fa-solid fa-sun"></i> Light
                </button>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Default Font (for new templates)</label>
              <select id="set-default-font" class="form-select">
                ${['Cormorant Garamond','DM Sans','Arial','Georgia','Times New Roman','Verdana']
                  .map(f => `<option value="${f}" ${s.defaultFont === f ? 'selected' : ''}>${f}</option>`).join('')}
              </select>
            </div>
          </div>

          <!-- Data Management -->
          <div class="card-gold">
            <h3 style="font-family:var(--font-display);font-size:20px;margin-bottom:16px;">
              <i class="fa-solid fa-database" style="color:var(--gold);margin-right:8px;font-size:16px;"></i>
              Data Management
            </h3>
            <div style="display:flex;flex-direction:column;gap:8px;">
              <button class="btn btn-outline btn-sm" onclick="SettingsView.exportBackup()">
                <i class="fa-solid fa-file-arrow-down"></i> Export Backup (JSON)
              </button>
              <label class="btn btn-ghost btn-sm" style="cursor:pointer;">
                <i class="fa-solid fa-file-arrow-up"></i> Import Backup (JSON)
                <input type="file" accept=".json" style="display:none;" onchange="SettingsView.importBackup(this)" />
              </label>
              <div style="height:1px;background:var(--border);"></div>
              <button class="btn btn-danger btn-sm" onclick="SettingsView.clearCertificates()">
                <i class="fa-solid fa-trash"></i> Clear All Certificates
              </button>
              <button class="btn btn-danger btn-sm" onclick="SettingsView.clearAll()">
                <i class="fa-solid fa-skull"></i> Reset Everything
              </button>
            </div>
            <div style="margin-top:12px;font-size:12px;color:var(--text-muted);">
              <i class="fa-solid fa-circle-info"></i>
              Database: ${App.state.certificates.length} certificates · ${App.state.templates.length} templates
              · ~${getStorageSize()} used
            </div>
          </div>

        </div>
      </div>

      <!-- Save Button -->
      <div style="display:flex;justify-content:flex-end;margin-top:20px;">
        <button class="btn btn-gold btn-lg" onclick="SettingsView.save()">
          <i class="fa-solid fa-floppy-disk"></i> Save Settings
        </button>
      </div>

      <!-- About -->
      <div style="text-align:center;margin-top:32px;padding-top:20px;border-top:1px solid var(--border);">
        <div style="font-family:var(--font-display);font-size:24px;color:var(--gold);margin-bottom:4px;">QST Certificate Manager</div>
        <div style="font-size:12px;color:var(--text-muted);">v1.0.0 · QST Training and Consultancy · Built for official certificate generation</div>
      </div>
    `;
  }

  function updatePreview() {
    const fmt = document.getElementById('set-num-format')?.value || '';
    const preview = document.getElementById('num-preview');
    if (preview) preview.textContent = App.numbering.preview(fmt);
  }

  function setTheme(theme) {
    App.state.settings.theme = theme;
    App.theme.apply();
    render();
  }

  function uploadLogo(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      App.state.settings.logoData = e.target.result;
      App.storage.saveSettings();
      App.notify.success('Logo uploaded');
      render();
    };
    reader.readAsDataURL(file);
    input.value = '';
  }

  function save() {
    App.state.settings.companyName  = document.getElementById('set-company-name')?.value?.trim()  || App.state.settings.companyName;
    App.state.settings.companyEmail = document.getElementById('set-company-email')?.value?.trim() || App.state.settings.companyEmail;
    App.state.settings.website      = document.getElementById('set-website')?.value?.trim()       || App.state.settings.website;
    App.state.settings.numberFormat = document.getElementById('set-num-format')?.value?.trim()    || App.state.settings.numberFormat;
    App.state.settings.nextSeq      = parseInt(document.getElementById('set-next-seq')?.value)    || App.state.settings.nextSeq;
    App.state.settings.verifyBaseUrl= document.getElementById('set-verify-url')?.value?.trim()    || App.state.settings.verifyBaseUrl;
    App.state.settings.defaultFont  = document.getElementById('set-default-font')?.value          || App.state.settings.defaultFont;

    App.storage.saveSettings();
    App.notify.success('Settings saved successfully');
  }

  function exportBackup() {
    const backup = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      settings: App.state.settings,
      templates: App.state.templates.map(t => ({
        ...t,
        // Exclude heavy imageData from thumbnail in backup (optional)
      })),
      certificates: App.state.certificates,
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    saveAs(blob, `QST_Backup_${new Date().toISOString().split('T')[0]}.json`);
    App.notify.success('Backup exported');
  }

  function importBackup(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const backup = JSON.parse(e.target.result);
        if (!backup.version) throw new Error('Invalid backup file');

        App.modal.confirm(`Import backup from ${App.utils.formatDate(backup.exportedAt)}? This will REPLACE all current data.`, () => {
          if (backup.settings)     { App.state.settings     = { ...App.state.settings, ...backup.settings }; App.storage.saveSettings(); }
          if (backup.templates)    { App.state.templates    = backup.templates;    App.storage.saveTemplates(); }
          if (backup.certificates) { App.state.certificates = backup.certificates; App.storage.saveCertificates(); }
          App.notify.success('Backup imported successfully');
          render();
        });
      } catch(err) {
        App.notify.error('Invalid backup file: ' + err.message);
      }
    };
    reader.readAsText(file);
    input.value = '';
  }

  function clearCertificates() {
    App.modal.confirm(`Delete ALL ${App.state.certificates.length} certificates? This cannot be undone.`, () => {
      App.state.certificates = [];
      App.storage.saveCertificates();
      App.notify.warning('All certificates deleted');
      render();
    });
  }

  function clearAll() {
    App.modal.confirm('Reset EVERYTHING — all templates, certificates, and settings will be deleted permanently.', () => {
      App.storage.clearAll();
      App.notify.warning('All data cleared');
      location.reload();
    });
  }

  function getStorageSize() {
    let total = 0;
    try {
      total += (localStorage.getItem('qst_templates')    || '').length;
      total += (localStorage.getItem('qst_certificates') || '').length;
      total += (localStorage.getItem('qst_settings')     || '').length;
    } catch(e) {}
    const kb = total / 1024;
    return kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb.toFixed(0)} KB`;
  }

  // Expose globally
  window.SettingsView = { render, save, updatePreview, setTheme, uploadLogo, exportBackup, importBackup, clearCertificates, clearAll };

  return { render };
})();
