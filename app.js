/* =====================================================
   QST Certificate Manager — Core Application
   State management, router, storage, utilities
   ===================================================== */

const App = (() => {
  // ── State ──────────────────────────────────────────
  const state = {
    view: 'dashboard',
    templates: [],
    certificates: [],
    importQueue: [],
    settings: {
      companyName: 'QST Training and Consultancy',
      companyEmail: 'info@qst.com',
      website: 'https://qst.com',
      verifyBaseUrl: 'https://verify.qst.com/cert/',
      numberFormat: 'QST-{YEAR}-{SEQ:4}',
      numberPrefix: 'QST',
      nextSeq: 1,
      theme: 'dark',
      defaultFont: 'Cormorant Garamond',
      logoData: null,
    },
  };

  // ── Storage ────────────────────────────────────────
  const storage = {
    KEYS: {
      templates:    'qst_templates',
      certificates: 'qst_certificates',
      settings:     'qst_settings',
    },

    load() {
      try {
        const t = localStorage.getItem(this.KEYS.templates);
        const c = localStorage.getItem(this.KEYS.certificates);
        const s = localStorage.getItem(this.KEYS.settings);
        if (t) state.templates    = JSON.parse(t);
        if (c) state.certificates = JSON.parse(c);
        if (s) state.settings     = { ...state.settings, ...JSON.parse(s) };
      } catch(e) { console.warn('Storage load error', e); }
    },

    saveTemplates()    { localStorage.setItem(this.KEYS.templates,    JSON.stringify(state.templates)); },
    saveCertificates() { localStorage.setItem(this.KEYS.certificates, JSON.stringify(state.certificates)); },
    saveSettings()     { localStorage.setItem(this.KEYS.settings,     JSON.stringify(state.settings)); },

    clearAll() {
      Object.values(this.KEYS).forEach(k => localStorage.removeItem(k));
      state.templates = []; state.certificates = [];
    },
  };

  // ── Router ─────────────────────────────────────────
  const router = {
    views: {
      dashboard: { label: 'Dashboard',       render: () => Dashboard.render() },
      templates: { label: 'Templates',       render: () => Templates.render() },
      editor:    { label: 'Template Editor', render: () => Editor.render() },
      import:    { label: 'Import Data',     render: () => ImportView.render() },
      generate:  { label: 'Generate',        render: () => GenerateView.render() },
      database:  { label: 'Certificate DB',  render: () => DatabaseView.render() },
      verify:    { label: 'Verification',    render: () => VerifyView.render() },
      settings:  { label: 'Settings',        render: () => SettingsView.render() },
    },

    navigate(viewId, params = {}) {
      if (!this.views[viewId]) return;

      // Deactivate all views & nav items
      document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

      // Activate new view
      const el = document.getElementById(`view-${viewId}`);
      if (el) el.classList.add('active');

      // Activate nav item
      const navEl = document.querySelector(`.nav-item[data-view="${viewId}"]`);
      if (navEl) navEl.classList.add('active');

      // Update breadcrumb
      const bc = document.getElementById('breadcrumb-current');
      if (bc) bc.textContent = this.views[viewId].label;

      state.view = viewId;
      state.routeParams = params;

      // Render view
      try { this.views[viewId].render(); }
      catch(e) { console.error(`Error rendering ${viewId}:`, e); }

      // Update queue badge
      updateQueueBadge();
    },
  };

  // ── Utils ──────────────────────────────────────────
  const utils = {
    uid(prefix = 'id') {
      return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    },

    formatDate(dateStr) {
      if (!dateStr) return '—';
      try {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      } catch { return dateStr; }
    },

    formatDateTime(dateStr) {
      if (!dateStr) return '—';
      try {
        const d = new Date(dateStr);
        return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      } catch { return dateStr; }
    },

    today() {
      return new Date().toISOString().split('T')[0];
    },

    isoToDisplay(iso) {
      if (!iso) return '';
      const [y, m, d] = iso.split('-');
      return `${d}/${m}/${y}`;
    },

    displayToIso(display) {
      if (!display) return '';
      const [d, m, y] = display.split('/');
      return `${y}-${m}-${d}`;
    },

    escHtml(str) {
      const d = document.createElement('div');
      d.textContent = String(str || '');
      return d.innerHTML;
    },

    copyText(text) {
      navigator.clipboard?.writeText(text).then(() => notify.success('Copied to clipboard'));
    },

    debounce(fn, delay = 300) {
      let t;
      return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
    },

    downloadBlob(blob, filename) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },

    downloadDataUrl(dataUrl, filename) {
      const a = document.createElement('a');
      a.href = dataUrl; a.download = filename;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a);
    },
  };

  // ── Certificate Numbering ──────────────────────────
  const numbering = {
    generate(customFormat) {
      const fmt = customFormat || state.settings.numberFormat;
      const now = new Date();
      const seq = state.settings.nextSeq;
      const padded = String(seq).padStart(4, '0');

      let result = fmt
        .replace('{YEAR}', now.getFullYear())
        .replace('{MONTH}', String(now.getMonth() + 1).padStart(2, '0'))
        .replace('{DAY}', String(now.getDate()).padStart(2, '0'))
        .replace(/\{SEQ:(\d+)\}/, (_, n) => String(seq).padStart(parseInt(n), '0'))
        .replace('{SEQ}', padded);

      state.settings.nextSeq++;
      storage.saveSettings();
      return result;
    },

    preview(fmt) {
      const now = new Date();
      return fmt
        .replace('{YEAR}', now.getFullYear())
        .replace('{MONTH}', String(now.getMonth() + 1).padStart(2, '0'))
        .replace('{DAY}', String(now.getDate()).padStart(2, '0'))
        .replace(/\{SEQ:(\d+)\}/, (_, n) => '1'.padStart(parseInt(n), '0'))
        .replace('{SEQ}', '0001');
    },

    isDuplicate(certNo) {
      return state.certificates.some(c => c.certificateNo === certNo);
    },
  };

  // ── QR Code Generator ─────────────────────────────
  const qrGen = {
    generate(text, size = 120) {
      return new Promise((resolve) => {
        const container = document.createElement('div');
        container.style.cssText = 'position:absolute;left:-9999px;visibility:hidden;';
        document.body.appendChild(container);

        try {
          new QRCode(container, { text, width: size, height: size, correctLevel: QRCode.CorrectLevel.M });
          setTimeout(() => {
            const canvas = container.querySelector('canvas');
            const img = container.querySelector('img');
            const dataUrl = canvas ? canvas.toDataURL('image/png') : (img ? img.src : '');
            document.body.removeChild(container);
            resolve(dataUrl);
          }, 100);
        } catch(e) {
          document.body.removeChild(container);
          resolve('');
        }
      });
    },
  };

  // ── Toast Notifications ────────────────────────────
  const notify = {
    _show(type, message, duration = 3500) {
      const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', warning: 'fa-triangle-exclamation', info: 'fa-circle-info' };
      const container = document.getElementById('toast-container');
      const toast = document.createElement('div');
      toast.className = `toast ${type}`;
      toast.innerHTML = `
        <i class="fa-solid ${icons[type]} toast-icon"></i>
        <span class="toast-msg">${utils.escHtml(message)}</span>
        <button class="toast-close" onclick="this.parentElement.remove()"><i class="fa-solid fa-xmark"></i></button>
      `;
      container.appendChild(toast);
      setTimeout(() => toast.remove(), duration);
    },
    success(msg) { this._show('success', msg); },
    error(msg)   { this._show('error',   msg); },
    warning(msg) { this._show('warning', msg); },
    info(msg)    { this._show('info',    msg); },
  };

  // ── Modal System ───────────────────────────────────
  const modal = {
    open(html, { title = '', width = '560px' } = {}) {
      const overlay = document.getElementById('modal-overlay');
      const box     = document.getElementById('modal-box');
      const content = document.getElementById('modal-content');
      if (title) {
        content.innerHTML = `<h2 class="modal-title">${title}</h2>${html}`;
      } else {
        content.innerHTML = html;
      }
      box.style.maxWidth = width;
      overlay.classList.add('open');
    },

    close() {
      document.getElementById('modal-overlay').classList.remove('open');
    },

    confirm(message, onConfirm) {
      this.open(`
        <p style="color:var(--text-secondary);margin-bottom:24px;">${utils.escHtml(message)}</p>
        <div style="display:flex;gap:10px;justify-content:flex-end;">
          <button class="btn btn-ghost" onclick="App.modal.close()">Cancel</button>
          <button class="btn btn-danger" id="modal-confirm-btn">Confirm</button>
        </div>
      `, { title: 'Confirm Action' });
      document.getElementById('modal-confirm-btn').onclick = () => { this.close(); onConfirm(); };
    },
  };

  // ── Certificate CRUD ───────────────────────────────
  const certificates = {
    add(cert) {
      const full = {
        id: utils.uid('cert'),
        status: 'valid',
        createdAt: new Date().toISOString(),
        verificationScans: 0,
        ...cert,
      };
      state.certificates.unshift(full);
      storage.saveCertificates();
      updateQueueBadge();
      return full;
    },

    getById(id) {
      return state.certificates.find(c => c.id === id);
    },

    getByCertNo(no) {
      return state.certificates.find(c => c.certificateNo?.toLowerCase() === no?.toLowerCase());
    },

    revoke(id) {
      const cert = this.getById(id);
      if (cert) { cert.status = 'revoked'; cert.revokedAt = new Date().toISOString(); storage.saveCertificates(); }
    },

    restore(id) {
      const cert = this.getById(id);
      if (cert) { cert.status = 'valid'; delete cert.revokedAt; storage.saveCertificates(); }
    },

    delete(id) {
      state.certificates = state.certificates.filter(c => c.id !== id);
      storage.saveCertificates();
    },

    getStats() {
      const total    = state.certificates.length;
      const valid    = state.certificates.filter(c => c.status === 'valid').length;
      const expired  = state.certificates.filter(c => c.status === 'expired' || (c.validityDate && new Date(c.validityDate) < new Date() && c.status === 'valid')).length;
      const revoked  = state.certificates.filter(c => c.status === 'revoked').length;
      const thisMonth = state.certificates.filter(c => {
        const d = new Date(c.createdAt);
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }).length;
      return { total, valid, expired, revoked, thisMonth };
    },

    search(query, filters = {}) {
      let list = [...state.certificates];
      if (query) {
        const q = query.toLowerCase();
        list = list.filter(c =>
          (c.candidateName || '').toLowerCase().includes(q) ||
          (c.courseName || '').toLowerCase().includes(q) ||
          (c.companyName || '').toLowerCase().includes(q) ||
          (c.certificateNo || '').toLowerCase().includes(q)
        );
      }
      if (filters.status && filters.status !== 'all') {
        list = list.filter(c => c.status === filters.status);
      }
      if (filters.course && filters.course !== 'all') {
        list = list.filter(c => c.courseName === filters.course);
      }
      return list;
    },
  };

  // ── Template CRUD ──────────────────────────────────
  const templates = {
    add(tpl) {
      const full = {
        id: utils.uid('tpl'),
        locked: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...tpl,
      };
      state.templates.unshift(full);
      storage.saveTemplates();
      return full;
    },

    getById(id) {
      return state.templates.find(t => t.id === id);
    },

    update(id, data) {
      const idx = state.templates.findIndex(t => t.id === id);
      if (idx >= 0) {
        state.templates[idx] = { ...state.templates[idx], ...data, updatedAt: new Date().toISOString() };
        storage.saveTemplates();
        return state.templates[idx];
      }
    },

    delete(id) {
      state.templates = state.templates.filter(t => t.id !== id);
      storage.saveTemplates();
    },

    duplicate(id) {
      const tpl = this.getById(id);
      if (!tpl) return;
      const copy = { ...tpl, id: utils.uid('tpl'), name: tpl.name + ' (Copy)', locked: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      state.templates.splice(state.templates.findIndex(t => t.id === id) + 1, 0, copy);
      storage.saveTemplates();
      return copy;
    },

    toggleLock(id) {
      const tpl = this.getById(id);
      if (tpl) { tpl.locked = !tpl.locked; storage.saveTemplates(); }
      return tpl?.locked;
    },
  };

  // ── Import Queue ───────────────────────────────────
  const importQueue = {
    set(data) { state.importQueue = data; updateQueueBadge(); },
    get()     { return state.importQueue; },
    clear()   { state.importQueue = []; updateQueueBadge(); },
    count()   { return state.importQueue.length; },
  };

  // ── Theme ──────────────────────────────────────────
  const theme = {
    toggle() {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      state.settings.theme = next;
      storage.saveSettings();
      const icon = document.getElementById('theme-icon');
      if (icon) { icon.className = next === 'dark' ? 'fa-solid fa-moon' : 'fa-solid fa-sun'; }
    },

    apply() {
      document.documentElement.setAttribute('data-theme', state.settings.theme || 'dark');
      const icon = document.getElementById('theme-icon');
      if (icon) { icon.className = state.settings.theme === 'dark' ? 'fa-solid fa-moon' : 'fa-solid fa-sun'; }
    },
  };

  // ── Internal helpers ───────────────────────────────
  function updateQueueBadge() {
    const badge = document.getElementById('queue-badge');
    const count = state.importQueue.length;
    if (badge) {
      badge.style.display = count > 0 ? 'inline-flex' : 'none';
      badge.textContent = count;
    }
  }

  function bindGlobalEvents() {
    // Sidebar nav clicks
    document.querySelectorAll('.nav-item[data-view]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        router.navigate(el.dataset.view);
      });
    });

    // Sidebar toggle (mobile)
    const toggle = document.getElementById('sidebar-toggle');
    if (toggle) {
      toggle.addEventListener('click', () => {
        const sidebar = document.getElementById('sidebar');
        const wrapper = document.querySelector('.main-wrapper');
        sidebar.classList.toggle('open');
        wrapper.classList.toggle('expanded');
      });
    }

    // Theme toggle
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) themeBtn.addEventListener('click', () => theme.toggle());

    // Modal close
    const modalClose = document.getElementById('modal-close');
    const overlay = document.getElementById('modal-overlay');
    if (modalClose) modalClose.addEventListener('click', () => modal.close());
    if (overlay) overlay.addEventListener('click', (e) => { if (e.target === overlay) modal.close(); });

    // Hash-based routing
    window.addEventListener('hashchange', () => {
      const hash = location.hash.slice(1);
      if (hash && router.views[hash]) router.navigate(hash);
    });
  }

  // ── Init ───────────────────────────────────────────
  function init() {
    storage.load();
    theme.apply();
    bindGlobalEvents();

    // Check URL hash
    const hash = location.hash.slice(1);
    const initial = (hash && router.views[hash]) ? hash : 'dashboard';
    router.navigate(initial);

    console.log('%cQST Certificate Manager', 'color:#C9A84C;font-size:18px;font-weight:bold;');
    console.log('%cLoaded: ' + state.templates.length + ' templates, ' + state.certificates.length + ' certificates', 'color:#7A9AB8;');
  }

  // ── Public API ─────────────────────────────────────
  return {
    state, storage, router, utils, notify, modal,
    certificates, templates, importQueue, numbering, qrGen, theme,
    init,
  };
})();
