/* =====================================================
   QST — Templates View
   ===================================================== */

const Templates = (() => {
  let filterCategory = 'all';
  let searchQuery = '';

  function render() {
    const el = document.getElementById('view-templates');

    const categories = getCategories();
    const filtered   = getFiltered();

    el.innerHTML = `
      <div class="page-header">
        <div class="page-title-group">
          <h1 class="page-title">Certificate Templates</h1>
          <p class="page-subtitle">${App.state.templates.length} template${App.state.templates.length !== 1 ? 's' : ''} available</p>
        </div>
        <div style="display:flex;gap:10px;">
          <button class="btn btn-ghost btn-sm" onclick="Templates.importSample()">
            <i class="fa-solid fa-wand-magic-sparkles"></i> Sample Templates
          </button>
          <button class="btn btn-gold" onclick="Templates.openCreateModal()">
            <i class="fa-solid fa-plus"></i> New Template
          </button>
        </div>
      </div>

      <!-- Filter Bar -->
      <div class="filter-bar">
        <div class="search-wrap">
          <i class="fa-solid fa-magnifying-glass search-icon"></i>
          <input type="text" class="search-input" placeholder="Search templates…"
            value="${App.utils.escHtml(searchQuery)}"
            oninput="Templates.search(this.value)" />
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          ${['all', ...categories].map(cat => `
            <button class="btn btn-sm ${filterCategory === cat ? 'btn-gold' : 'btn-ghost'}"
              onclick="Templates.filterCat('${cat}')">
              ${cat === 'all' ? 'All' : App.utils.escHtml(cat)}
            </button>
          `).join('')}
        </div>
        <span style="margin-left:auto;font-size:12px;color:var(--text-muted);">${filtered.length} template${filtered.length !== 1 ? 's' : ''}</span>
      </div>

      <!-- Templates Grid -->
      ${filtered.length ? `
        <div class="grid-auto" id="templates-grid">
          ${filtered.map(t => templateCard(t)).join('')}
        </div>
      ` : `
        <div class="empty-state">
          <div class="empty-icon"><i class="fa-solid fa-layer-group"></i></div>
          <div class="empty-title">${App.state.templates.length > 0 ? 'No matching templates' : 'No templates yet'}</div>
          <div class="empty-text">
            ${App.state.templates.length > 0
              ? 'Try a different search or category filter.'
              : 'Create your first certificate template to get started.'}
          </div>
          ${App.state.templates.length === 0 ? `
            <div style="display:flex;gap:10px;justify-content:center;">
              <button class="btn btn-ghost" onclick="Templates.importSample()">
                <i class="fa-solid fa-wand-magic-sparkles"></i> Load Sample Templates
              </button>
              <button class="btn btn-gold" onclick="Templates.openCreateModal()">
                <i class="fa-solid fa-plus"></i> Create Template
              </button>
            </div>
          ` : ''}
        </div>
      `}
    `;
  }

  function templateCard(t) {
    const lockedIcon = t.locked ? `<span class="badge badge-muted" style="margin-left:4px;"><i class="fa-solid fa-lock"></i></span>` : '';
    return `
      <div class="template-card" onclick="Templates.openTemplate('${t.id}')">
        <div class="template-thumb">
          ${t.thumbnail
            ? `<img src="${t.thumbnail}" alt="${App.utils.escHtml(t.name)}" />`
            : `<div class="template-thumb-placeholder">
                <i class="fa-solid fa-file-certificate"></i>
                <span style="font-size:12px;color:var(--text-muted);">${App.utils.escHtml(t.category || 'General')}</span>
              </div>`
          }
          ${t.locked ? `<div style="position:absolute;inset:0;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;">
            <i class="fa-solid fa-lock" style="color:var(--gold);font-size:24px;"></i>
          </div>` : ''}
        </div>

        <!-- Quick action buttons -->
        <div class="template-actions" onclick="event.stopPropagation()">
          ${!t.locked ? `
            <button class="template-action-btn" title="Edit" onclick="Templates.editTemplate('${t.id}')">
              <i class="fa-solid fa-pen"></i>
            </button>
          ` : ''}
          <button class="template-action-btn" title="Duplicate" onclick="Templates.duplicate('${t.id}')">
            <i class="fa-solid fa-copy"></i>
          </button>
          <button class="template-action-btn" title="${t.locked ? 'Unlock' : 'Lock'}" onclick="Templates.toggleLock('${t.id}')">
            <i class="fa-solid fa-${t.locked ? 'lock-open' : 'lock'}"></i>
          </button>
          <button class="template-action-btn" title="Delete" onclick="Templates.confirmDelete('${t.id}')" style="color:var(--error);">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>

        <div class="template-info">
          <div class="template-name">${App.utils.escHtml(t.name)} ${lockedIcon}</div>
          <div class="template-meta">
            <i class="fa-solid fa-tag" style="font-size:10px;"></i>
            ${App.utils.escHtml(t.category || 'General')}
            <span style="color:var(--border);">·</span>
            <i class="fa-solid fa-clock" style="font-size:10px;"></i>
            ${App.utils.formatDate(t.updatedAt)}
          </div>
        </div>
      </div>
    `;
  }

  function getCategories() {
    const cats = new Set(App.state.templates.map(t => t.category).filter(Boolean));
    return [...cats].sort();
  }

  function getFiltered() {
    let list = App.state.templates;
    if (filterCategory !== 'all') list = list.filter(t => t.category === filterCategory);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(t => (t.name || '').toLowerCase().includes(q) || (t.category || '').toLowerCase().includes(q));
    }
    return list;
  }

  function openTemplate(id) {
    const t = App.templates.getById(id);
    if (!t) return;
    if (t.locked) {
      App.notify.info('This template is locked. Unlock it to edit.');
      return;
    }
    editTemplate(id);
  }

  function editTemplate(id) {
    App.state.editingTemplateId = id;
    App.router.navigate('editor');
  }

  function openCreateModal() {
    App.modal.open(`
      <div class="form-group">
        <label class="form-label">Template Name *</label>
        <input type="text" id="new-tpl-name" class="form-input" placeholder="e.g. HSE Level 1 Certificate" />
      </div>
      <div class="form-group">
        <label class="form-label">Category</label>
        <input type="text" id="new-tpl-cat" class="form-input" placeholder="e.g. Safety, Fire, Electrical" list="cat-suggestions" />
        <datalist id="cat-suggestions">
          ${getCategories().map(c => `<option value="${App.utils.escHtml(c)}">`).join('')}
          <option value="Safety"><option value="Fire"><option value="Electrical">
          <option value="Health"><option value="Environment"><option value="Management">
        </datalist>
      </div>
      <div class="form-group">
        <label class="form-label">Canvas Size</label>
        <div class="form-row">
          <div>
            <label class="form-label" style="font-size:11px;margin-bottom:4px;">Width (px)</label>
            <input type="number" id="new-tpl-w" class="form-input" value="1122" />
          </div>
          <div>
            <label class="form-label" style="font-size:11px;margin-bottom:4px;">Height (px)</label>
            <input type="number" id="new-tpl-h" class="form-input" value="794" />
          </div>
        </div>
        <p class="form-hint">A4 Landscape = 1122 × 794 px | A4 Portrait = 794 × 1122 px</p>
      </div>
      <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:20px;">
        <button class="btn btn-ghost" onclick="App.modal.close()">Cancel</button>
        <button class="btn btn-gold" onclick="Templates.createFromModal()">
          <i class="fa-solid fa-plus"></i> Create & Edit
        </button>
      </div>
    `, { title: 'New Template' });
  }

  function createFromModal() {
    const name = document.getElementById('new-tpl-name')?.value?.trim();
    const cat  = document.getElementById('new-tpl-cat')?.value?.trim() || 'General';
    const w    = parseInt(document.getElementById('new-tpl-w')?.value) || 1122;
    const h    = parseInt(document.getElementById('new-tpl-h')?.value) || 794;

    if (!name) { App.notify.error('Template name is required'); return; }

    const tpl = App.templates.add({
      name, category: cat,
      canvasWidth: w, canvasHeight: h,
      fabricJSON: null, thumbnail: null,
    });

    App.modal.close();
    App.notify.success(`Template "${name}" created`);
    App.state.editingTemplateId = tpl.id;
    App.router.navigate('editor');
  }

  function confirmDelete(id) {
    const t = App.templates.getById(id);
    if (!t) return;
    App.modal.confirm(`Delete template "${t.name}"? This action cannot be undone.`, () => {
      App.templates.delete(id);
      App.notify.success('Template deleted');
      render();
    });
  }

  function duplicate(id) {
    const copy = App.templates.duplicate(id);
    if (copy) {
      App.notify.success(`Template duplicated as "${copy.name}"`);
      render();
    }
  }

  function toggleLock(id) {
    const locked = App.templates.toggleLock(id);
    App.notify.info(locked ? 'Template locked' : 'Template unlocked');
    render();
  }

  function search(q) {
    searchQuery = q;
    render();
  }

  function filterCat(cat) {
    filterCategory = cat;
    render();
  }

  function importSample() {
    const samples = [
      {
        name: 'HSE Level 1 Certificate',
        category: 'Safety',
        canvasWidth: 1122, canvasHeight: 794,
        fabricJSON: null, thumbnail: null,
        description: 'Health, Safety & Environment Level 1',
      },
      {
        name: 'Fire Safety Certificate',
        category: 'Fire',
        canvasWidth: 1122, canvasHeight: 794,
        fabricJSON: null, thumbnail: null,
      },
      {
        name: 'First Aid Certificate',
        category: 'Health',
        canvasWidth: 794, canvasHeight: 1122,
        fabricJSON: null, thumbnail: null,
      },
      {
        name: 'Electrical Safety Certificate',
        category: 'Electrical',
        canvasWidth: 1122, canvasHeight: 794,
        fabricJSON: null, thumbnail: null,
      },
    ];

    samples.forEach(s => App.templates.add(s));
    App.notify.success(`${samples.length} sample templates loaded`);
    render();
  }

  // Expose globally
  window.Templates = { render, openTemplate, editTemplate, openCreateModal, createFromModal, confirmDelete, duplicate, toggleLock, search, filterCat, importSample };

  return { render, openTemplate, editTemplate, openCreateModal, createFromModal, confirmDelete, duplicate, toggleLock, search, filterCat, importSample };
})();
