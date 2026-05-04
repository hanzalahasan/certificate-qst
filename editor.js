/* =====================================================
   QST — Template Editor (Fabric.js)
   ===================================================== */

const Editor = (() => {
  let canvas = null;
  let history = { stack: [], pointer: -1 };
  let templateId = null;

  const PLACEHOLDERS = [
    { key: 'candidateName',  label: 'Candidate Name',  icon: 'fa-user',          default: '{{Candidate Name}}', fontSize: 36 },
    { key: 'courseName',     label: 'Course Name',     icon: 'fa-book',          default: '{{Course Name}}',    fontSize: 24 },
    { key: 'companyName',    label: 'Company Name',    icon: 'fa-building',      default: '{{Company Name}}',   fontSize: 18 },
    { key: 'certificateNo',  label: 'Certificate No',  icon: 'fa-hashtag',       default: '{{Certificate No}}', fontSize: 16 },
    { key: 'issueDate',      label: 'Issue Date',      icon: 'fa-calendar',      default: '{{Issue Date}}',     fontSize: 16 },
    { key: 'validityDate',   label: 'Validity Date',   icon: 'fa-calendar-check',default: '{{Validity Date}}',  fontSize: 16 },
    { key: 'trainerName',    label: 'Trainer Name',    icon: 'fa-chalkboard-user',default: '{{Trainer Name}}',  fontSize: 16 },
    { key: 'customText',     label: 'Custom Text',     icon: 'fa-font',          default: 'Type your text…',   fontSize: 14 },
    { key: 'qrCode',         label: 'QR Code',         icon: 'fa-qrcode',        default: null,                 type: 'qr' },
    { key: 'signature',      label: 'Signature',       icon: 'fa-signature',     default: null,                 type: 'image' },
    { key: 'stamp',          label: 'Official Stamp',  icon: 'fa-stamp',         default: null,                 type: 'image' },
  ];

  const FONTS = [
    'Cormorant Garamond', 'DM Sans', 'Arial', 'Times New Roman',
    'Georgia', 'Verdana', 'Trebuchet MS', 'Palatino Linotype',
    'Book Antiqua', 'Garamond', 'Didact Gothic', 'Libre Baskerville',
  ];

  function render() {
    const el = document.getElementById('view-editor');
    templateId = App.state.editingTemplateId;
    const tpl = templateId ? App.templates.getById(templateId) : null;

    el.innerHTML = `
      <div class="page-header" style="margin-bottom:12px;">
        <div style="display:flex;align-items:center;gap:12px;">
          <button class="btn btn-ghost btn-sm" onclick="App.router.navigate('templates')">
            <i class="fa-solid fa-arrow-left"></i> Back
          </button>
          <div class="page-title-group">
            <h1 class="page-title" style="font-size:22px;">${tpl ? App.utils.escHtml(tpl.name) : 'New Template'}</h1>
          </div>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-ghost btn-sm" id="btn-preview" onclick="Editor.previewTemplate()">
            <i class="fa-solid fa-eye"></i> Preview
          </button>
          <button class="btn btn-outline btn-sm" id="btn-export-png" onclick="Editor.exportPng()">
            <i class="fa-solid fa-image"></i> Export PNG
          </button>
          <button class="btn btn-gold btn-sm" id="btn-save" onclick="Editor.saveTemplate()">
            <i class="fa-solid fa-floppy-disk"></i> Save Template
          </button>
        </div>
      </div>

      <div class="editor-layout" id="editor-layout">
        <!-- Left: Elements Panel -->
        <div class="editor-left">
          <div class="editor-panel-title">Background</div>
          <label class="element-btn" style="cursor:pointer;" title="Upload background image">
            <i class="fa-solid fa-image"></i> Upload Image
            <input type="file" id="bg-upload" accept="image/*,.pdf" style="display:none;" onchange="Editor.uploadBackground(this)" />
          </label>
          <button class="element-btn" onclick="Editor.clearBackground()">
            <i class="fa-solid fa-eraser"></i> Clear BG
          </button>

          <div style="height:1px;background:var(--border);margin:6px 0;"></div>
          <div class="editor-panel-title">Add Elements</div>
          ${PLACEHOLDERS.map(p => `
            <button class="element-btn" onclick="Editor.addElement('${p.key}')" title="Add ${p.label}">
              <i class="fa-solid ${p.icon}"></i> ${p.label}
            </button>
          `).join('')}

          <div style="height:1px;background:var(--border);margin:6px 0;"></div>
          <div class="editor-panel-title">Canvas</div>
          <button class="element-btn" onclick="Editor.clearCanvas()">
            <i class="fa-solid fa-trash"></i> Clear All
          </button>
          <button class="element-btn" onclick="Editor.deleteSelected()">
            <i class="fa-solid fa-minus"></i> Delete Selected
          </button>
        </div>

        <!-- Center: Canvas -->
        <div class="editor-center">
          <div class="editor-toolbar">
            <button class="tool-btn" onclick="Editor.undo()" title="Undo (Ctrl+Z)"><i class="fa-solid fa-rotate-left"></i></button>
            <button class="tool-btn" onclick="Editor.redo()" title="Redo (Ctrl+Y)"><i class="fa-solid fa-rotate-right"></i></button>
            <div class="toolbar-sep"></div>
            <button class="tool-btn" onclick="Editor.bringForward()" title="Bring Forward"><i class="fa-solid fa-angle-up"></i></button>
            <button class="tool-btn" onclick="Editor.sendBackward()" title="Send Backward"><i class="fa-solid fa-angle-down"></i></button>
            <div class="toolbar-sep"></div>
            <button class="tool-btn" onclick="Editor.alignLeft()" title="Align Left"><i class="fa-solid fa-align-left"></i></button>
            <button class="tool-btn" onclick="Editor.alignCenter()" title="Align Center"><i class="fa-solid fa-align-center"></i></button>
            <button class="tool-btn" onclick="Editor.alignRight()" title="Align Right"><i class="fa-solid fa-align-right"></i></button>
            <div class="toolbar-sep"></div>
            <span style="font-size:12px;color:var(--text-muted);">Zoom:</span>
            <button class="tool-btn" onclick="Editor.zoomOut()"><i class="fa-solid fa-minus"></i></button>
            <span id="zoom-label" style="font-size:12px;color:var(--text-secondary);min-width:38px;text-align:center;">100%</span>
            <button class="tool-btn" onclick="Editor.zoomIn()"><i class="fa-solid fa-plus"></i></button>
            <button class="tool-btn" onclick="Editor.zoomFit()" title="Fit to screen"><i class="fa-solid fa-expand"></i></button>
            <div class="toolbar-sep"></div>
            <span style="font-size:11px;color:var(--text-muted);" id="canvas-coords">x: 0 y: 0</span>
          </div>
          <div class="editor-canvas-area" id="editor-canvas-area">
            <canvas id="editor-canvas"></canvas>
          </div>
        </div>

        <!-- Right: Properties Panel -->
        <div class="editor-right" id="props-panel">
          <div class="props-section">
            <div class="props-label">Selection</div>
            <div id="props-empty" style="font-size:12px;color:var(--text-muted);padding:4px 0;">
              Select an element to edit properties
            </div>
          </div>
          <div id="props-text-section" style="display:none;">
            <div class="props-section">
              <div class="props-label">Text Content</div>
              <input type="text" id="prop-text" class="props-input" placeholder="Text content"
                oninput="Editor.updateProp('text', this.value)" />
            </div>
            <div class="props-section">
              <div class="props-label">Font Family</div>
              <select id="prop-font" class="props-select" onchange="Editor.updateProp('fontFamily', this.value)">
                ${FONTS.map(f => `<option value="${f}">${f}</option>`).join('')}
              </select>
            </div>
            <div class="props-section">
              <div class="props-label">Size & Color</div>
              <div class="props-row" style="margin-bottom:6px;">
                <input type="number" id="prop-size" class="props-input" placeholder="Size" min="6" max="200"
                  oninput="Editor.updateProp('fontSize', parseInt(this.value))" />
                <input type="color" id="prop-color" class="props-input props-color"
                  oninput="Editor.updateProp('fill', this.value)" />
              </div>
            </div>
            <div class="props-section">
              <div class="props-label">Style</div>
              <div class="font-style-btns">
                <button class="font-style-btn" id="btn-bold" onclick="Editor.toggleBold()"><b>B</b></button>
                <button class="font-style-btn" id="btn-italic" onclick="Editor.toggleItalic()"><i>I</i></button>
                <button class="font-style-btn" id="btn-underline" onclick="Editor.toggleUnderline()"><u>U</u></button>
              </div>
              <div class="props-row">
                <select id="prop-align" class="props-select" onchange="Editor.updateProp('textAlign', this.value)">
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
                <input type="number" id="prop-spacing" class="props-input" placeholder="Spacing" min="0" max="100" step="0.5"
                  oninput="Editor.updateProp('charSpacing', parseFloat(this.value) * 10)" />
              </div>
            </div>
            <div class="props-section">
              <div class="props-label">Position & Size</div>
              <div class="props-row" style="margin-bottom:6px;">
                <div>
                  <div style="font-size:10px;color:var(--text-muted);margin-bottom:3px;">X</div>
                  <input type="number" id="prop-x" class="props-input" oninput="Editor.updatePos('left', this.value)" />
                </div>
                <div>
                  <div style="font-size:10px;color:var(--text-muted);margin-bottom:3px;">Y</div>
                  <input type="number" id="prop-y" class="props-input" oninput="Editor.updatePos('top', this.value)" />
                </div>
              </div>
              <div class="props-row">
                <div>
                  <div style="font-size:10px;color:var(--text-muted);margin-bottom:3px;">W</div>
                  <input type="number" id="prop-w" class="props-input" oninput="Editor.updateDim('width', this.value)" />
                </div>
                <div>
                  <div style="font-size:10px;color:var(--text-muted);margin-bottom:3px;">H</div>
                  <input type="number" id="prop-h" class="props-input" oninput="Editor.updateDim('height', this.value)" />
                </div>
              </div>
            </div>
            <div class="props-section">
              <div class="props-label">Opacity</div>
              <input type="range" id="prop-opacity" min="0" max="1" step="0.05" value="1"
                style="width:100%;accent-color:var(--gold);"
                oninput="Editor.updateProp('opacity', parseFloat(this.value)); document.getElementById('opacity-val').textContent = Math.round(parseFloat(this.value)*100)+'%'" />
              <div style="font-size:11px;color:var(--text-muted);text-align:right;" id="opacity-val">100%</div>
            </div>
          </div>
          <div id="props-image-section" style="display:none;">
            <div class="props-section">
              <div class="props-label">Image Element</div>
              <label class="btn btn-ghost btn-sm" style="display:flex;cursor:pointer;">
                <i class="fa-solid fa-upload"></i> Replace Image
                <input type="file" accept="image/*" style="display:none;" onchange="Editor.replaceSelectedImage(this)" />
              </label>
            </div>
            <div class="props-section">
              <div class="props-label">Position</div>
              <div class="props-row">
                <div>
                  <div style="font-size:10px;color:var(--text-muted);margin-bottom:3px;">X</div>
                  <input type="number" id="img-prop-x" class="props-input" oninput="Editor.updatePos('left', this.value)" />
                </div>
                <div>
                  <div style="font-size:10px;color:var(--text-muted);margin-bottom:3px;">Y</div>
                  <input type="number" id="img-prop-y" class="props-input" oninput="Editor.updatePos('top', this.value)" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Init Fabric.js canvas
    setTimeout(() => initCanvas(tpl), 80);
  }

  function initCanvas(tpl) {
    const w = tpl?.canvasWidth  || 1122;
    const h = tpl?.canvasHeight || 794;

    if (canvas) { canvas.dispose(); canvas = null; }

    canvas = new fabric.Canvas('editor-canvas', {
      width: w, height: h,
      backgroundColor: '#ffffff',
      preserveObjectStacking: true,
    });

    // Load existing JSON
    if (tpl?.fabricJSON) {
      canvas.loadFromJSON(tpl.fabricJSON, () => {
        canvas.renderAll();
        historyPush();
      });
    } else {
      historyPush();
    }

    // Events
    canvas.on('selection:created', onSelect);
    canvas.on('selection:updated', onSelect);
    canvas.on('selection:cleared', onDeselect);
    canvas.on('object:modified', () => historyPush());
    canvas.on('object:added', () => historyPush());
    canvas.on('mouse:move', (e) => {
      const p = canvas.getPointer(e.e);
      const coords = document.getElementById('canvas-coords');
      if (coords) coords.textContent = `x: ${Math.round(p.x)}  y: ${Math.round(p.y)}`;
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', onKeyDown);

    zoomFit();
  }

  function onKeyDown(e) {
    if (!canvas) return;
    // Don't intercept when typing in inputs
    if (['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)) return;
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); redo(); }
    if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveTemplate(); }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      const active = canvas.getActiveObject();
      if (active) { canvas.remove(active); canvas.requestRenderAll(); }
    }
  }

  function onSelect(e) {
    const obj = e.selected ? e.selected[0] : canvas.getActiveObject();
    if (!obj) return;

    document.getElementById('props-empty').style.display = 'none';
    const isText = obj.type === 'i-text' || obj.type === 'text' || obj.type === 'textbox';
    const isImage = obj.type === 'image';

    document.getElementById('props-text-section').style.display = isText ? 'block' : 'none';
    document.getElementById('props-image-section').style.display = isImage ? 'block' : 'none';

    if (isText) {
      document.getElementById('prop-text').value  = obj.text || '';
      document.getElementById('prop-font').value  = obj.fontFamily || 'DM Sans';
      document.getElementById('prop-size').value  = obj.fontSize || 16;
      document.getElementById('prop-color').value = obj.fill || '#000000';
      document.getElementById('prop-align').value = obj.textAlign || 'left';
      document.getElementById('prop-spacing').value = (obj.charSpacing || 0) / 10;
      document.getElementById('prop-x').value = Math.round(obj.left || 0);
      document.getElementById('prop-y').value = Math.round(obj.top  || 0);
      document.getElementById('prop-w').value = Math.round(obj.width || 0);
      document.getElementById('prop-h').value = Math.round(obj.height || 0);
      document.getElementById('prop-opacity').value = obj.opacity ?? 1;
      document.getElementById('opacity-val').textContent = Math.round((obj.opacity ?? 1) * 100) + '%';

      document.getElementById('btn-bold').classList.toggle('active',      obj.fontWeight === 'bold');
      document.getElementById('btn-italic').classList.toggle('active',    obj.fontStyle === 'italic');
      document.getElementById('btn-underline').classList.toggle('active', !!obj.underline);
    }

    if (isImage) {
      document.getElementById('img-prop-x').value = Math.round(obj.left || 0);
      document.getElementById('img-prop-y').value = Math.round(obj.top  || 0);
    }
  }

  function onDeselect() {
    document.getElementById('props-empty').style.display = 'block';
    document.getElementById('props-text-section').style.display  = 'none';
    document.getElementById('props-image-section').style.display = 'none';
  }

  // ── Add Elements ─────────────────────────────────
  function addElement(key) {
    const def = PLACEHOLDERS.find(p => p.key === key);
    if (!def) return;

    if (def.type === 'qr') {
      addQRPlaceholder();
      return;
    }
    if (def.type === 'image') {
      addImagePlaceholder(def);
      return;
    }

    const text = new fabric.IText(def.default, {
      left: 80, top: 80 + (canvas.getObjects().length * 30) % 400,
      fontSize:   def.fontSize || 18,
      fontFamily: 'Cormorant Garamond',
      fill: '#1a1a1a',
      fontWeight: def.fontSize >= 30 ? 'bold' : 'normal',
      textAlign: 'left',
      customType: 'placeholder',
      placeholderKey: key,
      placeholderLabel: def.label,
    });
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.requestRenderAll();
  }

  function addQRPlaceholder() {
    const rect = new fabric.Rect({
      left: 80, top: 80,
      width: 100, height: 100,
      fill: '#f0f0f0',
      stroke: '#cccccc', strokeWidth: 1,
      rx: 4, ry: 4,
      customType: 'qr',
      placeholderKey: 'qrCode',
    });
    const label = new fabric.Text('QR Code', {
      left: 80 + 50, top: 80 + 35,
      fontSize: 12, fill: '#888888',
      textAlign: 'center', originX: 'center',
      selectable: false, evented: false,
    });
    const group = new fabric.Group([rect, label], {
      left: 80, top: 80,
      customType: 'qr', placeholderKey: 'qrCode',
    });
    canvas.add(group);
    canvas.setActiveObject(group);
    canvas.requestRenderAll();
  }

  function addImagePlaceholder(def) {
    const label = new fabric.IText(`[ ${def.label} ]`, {
      left: 80, top: 80,
      fontSize: 14,
      fill: '#888888',
      fontStyle: 'italic',
      customType: def.type,
      placeholderKey: def.key,
      placeholderLabel: def.label,
    });
    canvas.add(label);
    canvas.setActiveObject(label);
    canvas.requestRenderAll();
  }

  // ── Background Upload ─────────────────────────────
  function uploadBackground(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      fabric.Image.fromURL(e.target.result, (img) => {
        canvas.setWidth(img.width);
        canvas.setHeight(img.height);
        canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas), {
          scaleX: 1, scaleY: 1,
        });
        historyPush();
        zoomFit();
      });
    };
    reader.readAsDataURL(file);
    input.value = '';
  }

  function clearBackground() {
    canvas.setBackgroundImage(null, canvas.renderAll.bind(canvas));
    canvas.setBackgroundColor('#ffffff', canvas.renderAll.bind(canvas));
    historyPush();
  }

  // ── Property Updates ──────────────────────────────
  function updateProp(prop, value) {
    const obj = canvas.getActiveObject();
    if (!obj) return;
    obj.set(prop, value);
    canvas.requestRenderAll();
  }

  function updatePos(prop, value) {
    const obj = canvas.getActiveObject();
    if (!obj) return;
    obj.set(prop, parseInt(value) || 0);
    obj.setCoords();
    canvas.requestRenderAll();
  }

  function updateDim(prop, value) {
    const obj = canvas.getActiveObject();
    if (!obj) return;
    if (prop === 'width')  obj.set('scaleX', (parseInt(value) || 1) / obj.width);
    if (prop === 'height') obj.set('scaleY', (parseInt(value) || 1) / obj.height);
    obj.setCoords();
    canvas.requestRenderAll();
  }

  function toggleBold() {
    const obj = canvas.getActiveObject();
    if (!obj) return;
    const isBold = obj.fontWeight === 'bold';
    obj.set('fontWeight', isBold ? 'normal' : 'bold');
    document.getElementById('btn-bold').classList.toggle('active', !isBold);
    canvas.requestRenderAll();
  }

  function toggleItalic() {
    const obj = canvas.getActiveObject();
    if (!obj) return;
    const isItalic = obj.fontStyle === 'italic';
    obj.set('fontStyle', isItalic ? 'normal' : 'italic');
    document.getElementById('btn-italic').classList.toggle('active', !isItalic);
    canvas.requestRenderAll();
  }

  function toggleUnderline() {
    const obj = canvas.getActiveObject();
    if (!obj) return;
    obj.set('underline', !obj.underline);
    document.getElementById('btn-underline').classList.toggle('active', !!obj.underline);
    canvas.requestRenderAll();
  }

  // ── Stack Operations ──────────────────────────────
  function bringForward() {
    const obj = canvas.getActiveObject();
    if (obj) { canvas.bringForward(obj); canvas.requestRenderAll(); }
  }
  function sendBackward() {
    const obj = canvas.getActiveObject();
    if (obj) { canvas.sendBackwards(obj); canvas.requestRenderAll(); }
  }

  // ── Align Operations ──────────────────────────────
  function alignLeft()   { const o = canvas.getActiveObject(); if (o) { o.set('left', 0); o.setCoords(); canvas.requestRenderAll(); } }
  function alignCenter() {
    const o = canvas.getActiveObject();
    if (o) { o.set('left', (canvas.width - o.width * o.scaleX) / 2); o.setCoords(); canvas.requestRenderAll(); }
  }
  function alignRight() {
    const o = canvas.getActiveObject();
    if (o) { o.set('left', canvas.width - o.width * o.scaleX); o.setCoords(); canvas.requestRenderAll(); }
  }

  // ── Replace selected image ─────────────────────────
  function replaceSelectedImage(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const obj = canvas.getActiveObject();
      if (!obj) return;
      fabric.Image.fromURL(e.target.result, (img) => {
        img.set({ left: obj.left, top: obj.top, scaleX: obj.scaleX, scaleY: obj.scaleY });
        canvas.remove(obj);
        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.requestRenderAll();
        historyPush();
      });
    };
    reader.readAsDataURL(file);
    input.value = '';
  }

  // ── Zoom ──────────────────────────────────────────
  let zoomLevel = 1;
  function updateZoomLabel() {
    const el = document.getElementById('zoom-label');
    if (el) el.textContent = Math.round(zoomLevel * 100) + '%';
  }
  function zoomIn()  { zoomLevel = Math.min(zoomLevel + 0.1, 3); canvas.setZoom(zoomLevel); updateZoomLabel(); }
  function zoomOut() { zoomLevel = Math.max(zoomLevel - 0.1, 0.2); canvas.setZoom(zoomLevel); updateZoomLabel(); }
  function zoomFit() {
    const area = document.getElementById('editor-canvas-area');
    if (!area || !canvas) return;
    const areaW = area.clientWidth  - 48;
    const areaH = area.clientHeight - 48;
    const scaleX = areaW / canvas.width;
    const scaleY = areaH / canvas.height;
    zoomLevel = Math.min(scaleX, scaleY, 1);
    canvas.setZoom(zoomLevel);
    updateZoomLabel();
  }

  // ── History ───────────────────────────────────────
  function historyPush() {
    if (!canvas) return;
    const json = canvas.toJSON(['customType','placeholderKey','placeholderLabel']);
    history.stack = history.stack.slice(0, history.pointer + 1);
    history.stack.push(JSON.stringify(json));
    history.pointer = history.stack.length - 1;
  }

  function undo() {
    if (history.pointer <= 0) return;
    history.pointer--;
    canvas.loadFromJSON(JSON.parse(history.stack[history.pointer]), () => canvas.renderAll());
  }

  function redo() {
    if (history.pointer >= history.stack.length - 1) return;
    history.pointer++;
    canvas.loadFromJSON(JSON.parse(history.stack[history.pointer]), () => canvas.renderAll());
  }

  // ── Canvas Operations ─────────────────────────────
  function deleteSelected() {
    const obj = canvas.getActiveObject();
    if (obj) { canvas.remove(obj); canvas.requestRenderAll(); }
  }

  function clearCanvas() {
    App.modal.confirm('Clear all elements from canvas? Background will be kept.', () => {
      canvas.getObjects().forEach(obj => canvas.remove(obj));
      canvas.requestRenderAll();
      historyPush();
    });
  }

  // ── Save / Export ─────────────────────────────────
  function saveTemplate() {
    if (!canvas) return;
    const json = canvas.toJSON(['customType','placeholderKey','placeholderLabel']);
    const thumbnail = canvas.toDataURL({ format: 'jpeg', quality: 0.6, multiplier: 0.25 });

    if (templateId) {
      App.templates.update(templateId, { fabricJSON: json, thumbnail });
      App.notify.success('Template saved successfully');
    } else {
      // Create new
      const tpl = App.templates.add({
        name: 'Untitled Template',
        category: 'General',
        canvasWidth: canvas.width, canvasHeight: canvas.height,
        fabricJSON: json, thumbnail,
      });
      templateId = tpl.id;
      App.state.editingTemplateId = tpl.id;
      App.notify.success('Template created and saved');
    }
  }

  function exportPng() {
    if (!canvas) return;
    const dataUrl = canvas.toDataURL({ format: 'png', multiplier: 1 });
    App.utils.downloadDataUrl(dataUrl, 'template_preview.png');
  }

  function previewTemplate() {
    if (!canvas) return;
    const dataUrl = canvas.toDataURL({ format: 'png', multiplier: 0.8 });
    App.modal.open(`
      <div style="text-align:center;">
        <img src="${dataUrl}" style="max-width:100%;border:1px solid var(--border);border-radius:8px;" />
      </div>
      <div style="text-align:center;margin-top:16px;">
        <button class="btn btn-ghost btn-sm" onclick="App.modal.close()">Close</button>
        <button class="btn btn-outline btn-sm" onclick="App.utils.downloadDataUrl('${dataUrl}','template_preview.png')">
          <i class="fa-solid fa-download"></i> Download
        </button>
      </div>
    `, { title: 'Template Preview', width: '90%' });
  }

  // ── Public API for generation engine ──────────────
  async function renderCertificate(templateId, data) {
    const tpl = App.templates.getById(templateId);
    if (!tpl?.fabricJSON) throw new Error('Template has no canvas data');

    const offCanvas = new fabric.StaticCanvas(null, {
      width: tpl.canvasWidth || 1122,
      height: tpl.canvasHeight || 794,
    });

    await new Promise((resolve, reject) => {
      offCanvas.loadFromJSON(tpl.fabricJSON, async () => {
        const objects = offCanvas.getObjects();

        for (const obj of objects) {
          if (obj.customType === 'placeholder' && obj.placeholderKey) {
            const val = data[obj.placeholderKey];
            if (val !== undefined) obj.set('text', String(val));
          }
          if (obj.customType === 'qr' && data.qrUrl) {
            // Replace QR placeholder with actual QR image
            try {
              const qrDataUrl = await App.qrGen.generate(data.qrUrl, 120);
              if (qrDataUrl) {
                await new Promise((res) => {
                  fabric.Image.fromURL(qrDataUrl, (img) => {
                    img.set({ left: obj.left, top: obj.top,
                      scaleX: (obj.width || 100) / img.width,
                      scaleY: (obj.height || 100) / img.height,
                    });
                    offCanvas.remove(obj);
                    offCanvas.add(img);
                    res();
                  });
                });
              }
            } catch(e) { /* QR failed, keep placeholder */ }
          }
        }

        offCanvas.renderAll();
        resolve();
      }, null, reject);
    });

    const dataUrl = offCanvas.toDataURL({ format: 'png', multiplier: 1 });
    offCanvas.dispose();
    return dataUrl;
  }

  // Expose globally
  window.Editor = {
    render, addElement, uploadBackground, clearBackground, deleteSelected, clearCanvas,
    updateProp, updatePos, updateDim, toggleBold, toggleItalic, toggleUnderline,
    bringForward, sendBackward, alignLeft, alignCenter, alignRight,
    replaceSelectedImage, zoomIn, zoomOut, zoomFit,
    undo, redo, saveTemplate, exportPng, previewTemplate, renderCertificate,
  };

  return { render, saveTemplate, renderCertificate };
})();
