/* DWHTML — Visual HTML Editor for VS Code */
(function() {
  'use strict';

  // ---------- i18n ----------
  let _lang = (navigator.language||'en').startsWith('zh')?'zh':'en';
  const _zh = {
    selectHint:'点击页面中的元素开始编辑',
    tag:'标签', id:'ID', classes:'类', content:'内容',
    fontSize:'字号', fontWeight:'字重', color:'颜色', alignment:'对齐', display:'显示',
    lineHeight:'行高', letterSpacing:'字间距', spacing:'间距',
    margin:'外边距', padding:'内边距', radius:'圆角',
    background:'背景', bgColor:'背景色',
    imageSize:'尺寸', imageFit:'裁切',
    imageContain:'完整显示', imageCover:'填满裁切',
    none:'无', small:'小', medium:'中', large:'大', round:'圆形',
    history:'历史', undo:'撤销', redo:'重做', reset:'重置',
    display:'显示', width:'宽度', height:'高度',
    opacity:'透明度', border:'边框', borderStyle:'样式', shadow:'阴影', soft:'柔和',
    left:'左', center:'中', right:'右',
    warm:'暖色', white:'白色', transparent:'透明',
  };
  const _en = {
    selectHint:'Click an element to start editing',
    tag:'Tag', id:'ID', classes:'Classes', content:'Content',
    fontSize:'Font Size', fontWeight:'Weight', color:'Color', alignment:'Alignment',
    lineHeight:'Line Height', letterSpacing:'Letter Spacing', spacing:'Spacing',
    margin:'Margin', padding:'Padding', radius:'Radius',
    background:'Background', bgColor:'Bg Color',
    imageSize:'Size', imageFit:'Fit',
    imageContain:'Contain', imageCover:'Cover',
    none:'None', small:'Small', medium:'Medium', large:'Large', round:'Round',
    history:'History', undo:'Undo', redo:'Redo', reset:'Reset',
    display:'Display', width:'Width', height:'Height',
    opacity:'Opacity', border:'Border', borderStyle:'Style', shadow:'Shadow', soft:'Soft',
    left:'Left', center:'Center', right:'Right',
    warm:'Warm', white:'White', transparent:'Transparent',
  };
  let _t = _lang === 'zh' ? _zh : _en;
  const t = k => _t[k] || k;

  // ---------- DOM utilities ----------
  const CI = {
    isElement(e) { return e instanceof HTMLElement },
    isAware(e) { return e && e !== document.documentElement && e !== document.body },
    ctx(e) {
      if (!CI.isElement(e)) return null;
      const t = e.tagName.toLowerCase();
      if (['img','svg','canvas','video','audio','picture','iframe','embed','object'].includes(t)) return 'media';
      return 'general';
    },
  };

  // ---------- Editor engine ----------
  const ED = {
    apply(e, p, v) { e.style.setProperty(p, v) },
    get(e, p) { return window.getComputedStyle(e).getPropertyValue(p) },

    color(e, v) { ED.apply(e,'color',v) },
    bgColor(e, v) { ED.apply(e,'background-color',v) },
    bgWarm(e) { ED.bgColor(e,'#fff8f0') },
    bgWhite(e) { ED.bgColor(e,'#ffffff') },
    bgTransparent(e) { ED.bgColor(e,'transparent') },
    align(e, v) { ED.apply(e,'text-align',v) },
    imageMax(e) { ED.apply(e,'max-width','100%'); ED.apply(e,'width','100%') },
    imageFit(e, v) { ED.apply(e,'object-fit',v) },
    imageRadius(e, v) { ED.apply(e,'border-radius',v) },
    textContent(e, v) { e.innerText = v },
  };

  // ---------- Selection ----------
  const SEL = { _s: null, _o: null, _en: false, _cb: null };
  Object.assign(SEL, {
    init() { SEL._o = document.querySelector('.dw-outline') },
    enable() {
      if (SEL._en) return;
      SEL._en = true;
      document.addEventListener('mouseover', SEL._onH, true);
      document.addEventListener('mouseout', SEL._onO, true);
      document.addEventListener('click', SEL._onC, true);
    },
    disable() {
      if (!SEL._en) return;
      SEL._en = false;
      document.removeEventListener('mouseover', SEL._onH, true);
      document.removeEventListener('mouseout', SEL._onO, true);
      document.removeEventListener('click', SEL._onC, true);
      SEL.hide();
    },
    select(e) { SEL._s = e; SEL.show(e); SEL._cb?.(e) },
    deselect() { SEL._s = null; SEL.hide(); SEL._cb?.(null) },
    selectParent() {
      const el = SEL._s;
      if (!el || !CI.isAware(el.parentElement) || el.parentElement === document.body || el.parentElement === document.documentElement) return;
      SEL.select(el.parentElement);
    },
    selectChild() {
      const el = SEL._s;
      if (!el || !el.children.length) return;
      const c = el.children[0];
      if (CI.isElement(c)) SEL.select(c);
    },
    get() { return SEL._s },
    show(e) {
      if (!SEL._o) return;
      const r = e.getBoundingClientRect();
      Object.assign(SEL._o.style, {
        display: 'block', left: r.left + 'px', top: r.top + 'px',
        width: r.width + 'px', height: r.height + 'px'
      });
    },
    hide() { if (SEL._o) SEL._o.style.display = 'none' },
    refresh() { SEL._s ? SEL.show(SEL._s) : SEL.hide() },
    onSelect(cb) { SEL._cb = cb },
    _onH(e) {
      if (!SEL._en) return;
      const el = e.target;
      if (!CI.isElement(el) || !CI.isAware(el) || el.closest('[data-dw-panel]')) return;
      if (!SEL._s) SEL.show(el);
    },
    _onO() { if (!SEL._en || SEL._s) return; SEL.hide() },
    _onC(e) {
      if (!SEL._en) return;
      const el = e.target;
      if (!CI.isElement(el) || !CI.isAware(el) || el.closest('[data-dw-panel]')) return;
      e.preventDefault(); e.stopPropagation();
      SEL.select(el);
    },
  });

  // ---------- History ----------
  function capStyle(e) {
    if (!e) return null;
    const s = window.getComputedStyle(e);
    const p = ['font-size','font-weight','color','background-color','text-align',
      'margin-top','margin-right','margin-bottom','margin-left',
      'padding-top','padding-right','padding-bottom','padding-left',
      'border-radius','line-height','letter-spacing','display','width','height','object-fit'];
    const r = {}; p.forEach(x => r[x] = s.getPropertyValue(x));
    return r;
  }
  function appStyle(e, s) {
    if (!e || !s) return;
    Object.entries(s).forEach(([p, v]) => e.style.setProperty(p, v));
  }
  const HIST = { _u: [], _r: [] };
  Object.assign(HIST, {
    push(s) { HIST._u.push(s); HIST._r.length = 0; if (HIST._u.length > 50) HIST._u.shift() },
    undo() { if (!HIST._u.length) return null; const c = HIST._u.pop(); HIST._r.push(c); return HIST._u[HIST._u.length-1]||null },
    redo() { if (!HIST._r.length) return null; const n = HIST._r.pop(); HIST._u.push(n); return n },
    canUndo() { return HIST._u.length > 0 },
    canRedo() { return HIST._r.length > 0 },
  });

  // ---------- Panel ----------
  const CID = 'dw-root';
  const PN = { _p: null };
  Object.assign(PN, {
    init() {
      if (document.getElementById(CID)) return;
      const root = document.createElement('div'); root.id = CID; root.dataset.dw = '';
      root.innerHTML = '<div class="dw-outline" data-dw=""></div>';
      document.documentElement.appendChild(root);

      const s = document.createElement('style'); s.id = 'dw-editor-style';
      s.textContent = `
#${CID}, #${CID} * { box-sizing:border-box; font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif }
#${CID} { position:fixed; inset:0; z-index:2147483647; pointer-events:none }
.dw-outline { position:fixed; display:none; border:2px solid #89b4fa; border-radius:4px; background:rgba(137,180,250,.06); pointer-events:none; z-index:2147483646 }

/* Panel */
.dw-panel {
  position:fixed; top:12px; right:12px; bottom:12px; width:240px;
  background:rgba(0,0,0,.8);
  color:#fff;
  border:1px solid rgba(255,255,255,.1);
  border-top-color:rgba(255,255,255,.15);
  border-radius:12px;
  overflow-y:auto; overflow-x:hidden;
  pointer-events:auto; z-index:2147483647;
  font-family:-apple-system,BlinkMacSystemFont,"SF Pro","Helvetica Neue",sans-serif;
  font-size:12px; line-height:1.4;
  box-shadow:0 8px 40px rgba(0,0,0,.5);
  -webkit-backdrop-filter:blur(30px);
  backdrop-filter:blur(30px);
}
.dw-panel::-webkit-scrollbar { width:3px; }
.dw-panel::-webkit-scrollbar-track { background:transparent; }
.dw-panel::-webkit-scrollbar-thumb { background:rgba(255,255,255,.12); border-radius:2px; }
.dw-panel::-webkit-scrollbar-thumb:hover { background:rgba(255,255,255,.2); }

.dw-panel__header {
  display:flex; align-items:center; gap:5px;
  padding:12px 14px 8px; cursor:grab; user-select:none;
}
.dw-panel__header:active { cursor:grabbing; }
.dw-tag-badge {
  font-size:9px; font-weight:700; color:#fff; letter-spacing:.03em;
  background:rgba(255,255,255,.1); padding:2px 6px; border-radius:4px;
  flex-shrink:0;
}
.dw-el-info { font-size:10px; color:rgba(255,255,255,.4); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1; }
.dw-el-info__id { color:#f9e2af; }
.dw-el-info__class { color:#a6e3a1; }
.dw-nav-actions { display:flex; gap:0; flex-shrink:0; }
.dw-nav-btn {
  width:24px; height:24px; padding:0; border:none; border-radius:5px;
  background:transparent; color:rgba(255,255,255,.25); cursor:pointer;
  display:flex; align-items:center; justify-content:center; font-size:12px;
  transition:color .12s;
}
.dw-nav-btn:hover { color:#fff; }
.dw-nav-btn:disabled { opacity:.15; cursor:default; color:rgba(255,255,255,.25); }
.dw-dock-actions { display:flex; gap:0; margin-left:auto; flex-shrink:0; }
.dw-dock-btn {
  width:24px; height:24px; padding:0; border:none; border-radius:5px;
  background:transparent; color:rgba(255,255,255,.25); cursor:pointer;
  display:flex; align-items:center; justify-content:center; font-size:11px;
  transition:color .12s;
}
.dw-dock-btn:hover { color:#fff; }
.dw-dock-btn--active { color:#ff4444; }

.dw-panel__body { padding:0 14px 12px; }
.dw-hint { padding:8px 0; font-size:11px; color:rgba(255,255,255,.35); text-align:center; min-height:18px; }

.dw-group { padding:10px 0; border-top:1px solid rgba(255,255,255,.06); }
.dw-group:first-child { border-top:none; padding-top:4px; }
.dw-group__title {
  font-size:9px; font-weight:600; color:rgba(255,255,255,.4); margin-bottom:7px;
  text-transform:uppercase; letter-spacing:.08em;
}

.dw-row { display:flex; align-items:center; gap:6px; margin-bottom:5px; }
.dw-row:last-child { margin-bottom:0; }
.dw-row__label { font-size:10px; color:rgba(255,255,255,.4); width:auto; flex-shrink:0; min-width:34px; }

.dw-btn {
  height:24px; padding:0 10px; border:1px solid rgba(255,255,255,.1); border-radius:6px;
  background:rgba(255,255,255,.08); color:#fff; font-size:10px; cursor:pointer;
  display:inline-flex; align-items:center; justify-content:center;
  transition:all .12s; font-weight:500;
}
.dw-btn:hover { background:rgba(255,255,255,.14); border-color:rgba(255,255,255,.18); }
.dw-btn:active { transform:scale(.96); }
.dw-btn--active { background:rgba(212,37,23,.2); color:#ff4444; border-color:rgba(212,37,23,.4); }
.dw-btn:disabled { opacity:.25; cursor:default; background:rgba(255,255,255,.04); border-color:rgba(255,255,255,.06); color:rgba(255,255,255,.3); transform:none; }
.dw-btn--sm { height:22px; padding:0 8px; font-size:10px; }
.dw-btn--danger { color:#f38ba8; border-color:rgba(243,139,168,.2); }
.dw-btn--danger:hover { background:rgba(243,139,168,.1); border-color:rgba(243,139,168,.3); }
.dw-btn-group { display:flex; gap:4px; flex-wrap:wrap; }
.dw-btn-group .dw-btn { flex:1; min-width:0; }

.dw-color-wrap { display:flex; align-items:center; gap:5px; }
.dw-color-input {
  width:28px; height:24px; padding:2px; border:1px solid rgba(255,255,255,.1); border-radius:6px;
  cursor:pointer; background:none;
}
.dw-color-input:hover { border-color:rgba(255,255,255,.2); }

.dw-textarea {
  width:100%; min-height:38px; padding:6px 8px;
  border:1px solid rgba(255,255,255,.1); border-radius:6px;
  font-size:11px; font-family:inherit; resize:vertical;
  background:rgba(0,0,0,.3); color:#fff; line-height:1.4;
}
.dw-textarea:focus { outline:none; border-color:rgba(255,255,255,.4); }
.dw-textarea:hover { border-color:rgba(255,255,255,.2); }

.dw-num {
  width:100%; height:24px; padding:0 6px;
  border:1px solid rgba(255,255,255,.1); border-radius:6px;
  background:rgba(0,0,0,.3); color:#fff;
  font-size:11px; font-family:inherit; text-align:center;
}
.dw-num:focus { outline:none; border-color:rgba(255,255,255,.4); }
.dw-num:hover { border-color:rgba(255,255,255,.2); }

.dw-fit-group { display:flex; gap:4px; }
.dw-fit-btn {
  flex:1; height:24px; padding:0 4px; border:1px solid rgba(255,255,255,.1); border-radius:6px;
  background:rgba(255,255,255,.06); color:rgba(255,255,255,.5); font-size:10px; cursor:pointer; text-align:center;
  transition:all .12s;
}
.dw-fit-btn:hover { background:rgba(255,255,255,.12); border-color:rgba(255,255,255,.18); color:#fff; }
.dw-fit-btn--active { background:rgba(212,37,23,.2); color:#ff4444; border-color:rgba(212,37,23,.4); }

.dw-panel__footer {
  padding:8px 0 6px; border-top:1px solid rgba(255,255,255,.06);
  display:flex; justify-content:center; font-size:9px;
}
.dw-panel__footer a { color:rgba(255,255,255,.25); text-decoration:none; cursor:pointer; }
.dw-panel__footer a:hover { color:#fff; }

@media print { [data-dw] { display:none !important } }
`.replace(/#dw-root/g, '#' + CID);
      document.documentElement.appendChild(s);
      SEL.init();
      this._build();
    },
    _build() {
      const p = document.createElement('div'); p.className = 'dw-panel'; p.dataset.dwPanel = '';
      p.innerHTML = `
<div class="dw-panel__body">
  <div class="dw-panel__header">
    <span class="dw-tag-badge" data-dw-tag-badge></span>
    <span class="dw-nav-actions">
      <button class="dw-nav-btn" data-dw-action="nav-up" title="选父级" disabled>⬆</button>
      <button class="dw-nav-btn" data-dw-action="nav-down" title="选子级" disabled>⬇</button>
    </span>
    <span class="dw-el-info" data-dw-el-info></span>
    <span class="dw-dock-actions">
      <button class="dw-dock-btn" data-dw-action="dock-left" title="吸附左侧">◂</button>
      <button class="dw-dock-btn" data-dw-action="dock-right" title="吸附右侧">▸</button>
    </span>
  </div>
  <div class="dw-hint" data-dw-hint>${t('selectHint')}</div>
  <div data-dw-sections></div>
  <div class="dw-panel__footer"><a href="https://github.com/hello432369/dwhtml/tree/main" target="_blank" style="color:#555;text-decoration:none">DWHTML</a></div>
</div>`;
      p.addEventListener('click', e => {
        const b = e.target.closest('[data-dw-action]');
        if (!b) return;
        const a = b.dataset.dwAction;
        if (a === 'dock-left') {
          p.style.left = '12px'; p.style.right = 'auto';
          p.querySelectorAll('.dw-dock-btn').forEach(btn => btn.classList.toggle('dw-dock-btn--active', btn.dataset.dwAction === 'dock-left'));
        } else if (a === 'dock-right') {
          p.style.left = 'auto'; p.style.right = '12px';
          p.querySelectorAll('.dw-dock-btn').forEach(btn => btn.classList.toggle('dw-dock-btn--active', btn.dataset.dwAction === 'dock-right'));
        } else if (a === 'nav-up') { SEL.selectParent() }
        else if (a === 'nav-down') { SEL.selectChild() }
        else ACT(a);
      });
      // Draggable header
      const h = p.querySelector('.dw-panel__header');
      let dx = 0, dy = 0, drag = false;
      h?.addEventListener('mousedown', e => {
        if (e.target.closest('button')) return;
        drag = true;
        const r = p.getBoundingClientRect();
        dx = e.clientX - r.left; dy = e.clientY - r.top;
      });
      window.addEventListener('mousemove', e => {
        if (!drag) return;
        p.style.left = (e.clientX - dx) + 'px';
        p.style.top = (e.clientY - dy) + 'px';
        p.style.right = 'auto';
        p.querySelectorAll('.dw-dock-btn').forEach(btn => btn.classList.remove('dw-dock-btn--active'));
      });
      window.addEventListener('mouseup', () => { drag = false });
      document.getElementById(CID).appendChild(p);
      PN._p = p;
    },
    hint(txt) { const h = PN._p?.querySelector('[data-dw-hint]'); if (h) h.textContent = txt },
    sections() { return PN._p?.querySelector('[data-dw-sections]') },
    addSection(html) { const c = this.sections(); if (!c) return; const d = document.createElement('div'); d.innerHTML = html; c.appendChild(d.firstElementChild || d) },
    clearSections() { const c = this.sections(); if (c) c.innerHTML = '' },
    tagBadge(tag) { const b = PN._p?.querySelector('[data-dw-tag-badge]'); if (b) b.textContent = tag.toUpperCase() },
    elInfo(tag, id, cls) {
      const el = PN._p?.querySelector('[data-dw-el-info]');
      if (!el) return;
      let txt = '';
      if (id) txt += '<span class="dw-el-info__id">#' + id + '</span>';
      if (cls) txt += (txt ? ' ' : '') + '<span class="dw-el-info__class">.' + cls.trim().split(/\s+/).join(' .') + '</span>';
      if (!txt) txt = '&lt;' + tag + '&gt;';
      el.innerHTML = txt;
    },

  });

  // ---------- Action handler ----------
  function ACT(a) {
    if (a === 'undo') { const s = HIST.undo(), el = SEL.get(); if (s && el) appStyle(el, s); updateButtons(); return }
    if (a === 'redo') { const s = HIST.redo(), el = SEL.get(); if (s && el) appStyle(el, s); updateButtons(); return }
    const el = SEL.get(); if (!el) return;
    HIST.push(capStyle(el));
    switch (a) {
      case 'align-left': ED.align(el, 'left'); break;
      case 'align-center': ED.align(el, 'center'); break;
      case 'align-right': ED.align(el, 'right'); break;
      case 'reset-color': ED.apply(el, 'color', ''); break;
      case 'bg-warm': ED.bgWarm(el); break;
      case 'bg-white': ED.bgWhite(el); break;
      case 'bg-transparent': ED.bgTransparent(el); break;
      case 'img-max': ED.imageMax(el); break;
      case 'img-fit-fill': ED.imageFit(el, 'fill'); break;
      case 'img-fit-contain': ED.imageFit(el, 'contain'); break;
      case 'img-fit-cover': ED.imageFit(el, 'cover'); break;
      case 'img-radius-none': ED.imageRadius(el, '0'); break;
      case 'img-radius-sm': ED.imageRadius(el, '4px'); break;
      case 'img-radius-lg': ED.imageRadius(el, '12px'); break;
      case 'img-radius-round': ED.imageRadius(el, '50%'); break;
      case 'disp-block': ED.apply(el,'display','block'); break;
      case 'disp-flex': ED.apply(el,'display','flex'); break;
      case 'disp-inline': ED.apply(el,'display','inline'); break;
      case 'disp-none': ED.apply(el,'display','none'); break;
      case 'width-auto': ED.apply(el,'width','auto'); break;
      case 'height-auto': ED.apply(el,'height','auto'); break;
      case 'bstyle-none': ED.apply(el,'border-style','none'); break;
      case 'bstyle-solid': ED.apply(el,'border-style','solid'); break;
      case 'bstyle-dashed': ED.apply(el,'border-style','dashed'); break;
      case 'bstyle-dotted': ED.apply(el,'border-style','dotted'); break;
      case 'shadow-none': ED.apply(el,'box-shadow','none'); break;
      case 'shadow-soft': ED.apply(el,'box-shadow','0 2px 8px rgba(0,0,0,0.15)'); break;
      case 'shadow-medium': ED.apply(el,'box-shadow','0 4px 16px rgba(0,0,0,0.2)'); break;
      default:
        if (a.startsWith('color:')) ED.color(el, a.slice(6));
        else if (a.startsWith('bg:')) ED.bgColor(el, a.slice(3));
    }
    SEL.refresh(); PN.clearSections(); build(el); updateButtons();
  }
  function updateButtons() {
    document.querySelectorAll('[data-dw-action="undo"]').forEach(b => b.disabled = !HIST.canUndo());
    document.querySelectorAll('[data-dw-action="redo"]').forEach(b => b.disabled = !HIST.canRedo());
  }

  // ---------- Build sections ----------
  function build(el) {
    PN.clearSections();
    const tag = el.tagName.toLowerCase();
    const c = CI.ctx(el);
    const id = el.id || '';
    const cls = el.className?.trim() || '';
    PN.tagBadge(tag);
    PN.elInfo(tag, id, cls);

    // --- Text content (all elements) ---
    {
      const content = el.innerText || '';
      PN.addSection('<div class="dw-group"><div class="dw-group__title">' + t('content') + '</div><textarea class="dw-textarea" data-dw-text-content>' + escHtml(content) + '</textarea></div>');
    }

    // --- Typography (all elements) ---
    {
      const fs = parseFloat(ED.get(el, 'font-size')) || 16;
      const fw = parseInt(ED.get(el, 'font-weight')) || 400;
      PN.addSection('<div class="dw-group">'
        + '<div class="dw-row"><span class="dw-row__label">' + t('fontSize') + '</span>'
          + '<input type="number" class="dw-num" value="' + fs + '" data-dw-prop="font-size" step="1" min="1">'
          + '<span style="font-size:10px;color:#999;margin-left:2px">px</span>'
        + '</div>'
        + '<div class="dw-row"><span class="dw-row__label">' + t('fontWeight') + '</span>'
          + '<input type="number" class="dw-num" value="' + fw + '" data-dw-prop="font-weight" step="100" min="100" max="900">'
        + '</div>'
        + '<div class="dw-row"><span class="dw-row__label">' + t('color') + '</span>'
          + '<span class="dw-color-wrap"><input type="color" class="dw-color-input" value="' + (rgbToHex(ED.get(el, 'color')) || '#000000') + '" data-dw-trigger="color"></span>'
          + '<button class="dw-btn dw-btn--sm" data-dw-action="reset-color">' + t('reset') + '</button>'
        + '</div>'
        + '<div class="dw-row"><span class="dw-row__label">' + t('alignment') + '</span>'
          + '<div class="dw-btn-group" style="flex:1">'
            + '<button class="dw-btn dw-btn--sm' + ((ED.get(el,'text-align')||'left')==='left'?' dw-btn--active':'') + '" data-dw-action="align-left">' + t('left') + '</button>'
            + '<button class="dw-btn dw-btn--sm' + (ED.get(el,'text-align')==='center'?' dw-btn--active':'') + '" data-dw-action="align-center">' + t('center') + '</button>'
            + '<button class="dw-btn dw-btn--sm' + (ED.get(el,'text-align')==='right'?' dw-btn--active':'') + '" data-dw-action="align-right">' + t('right') + '</button>'
          + '</div>'
        + '</div>'
      + '</div>');
    }

    // --- Layout (all elements) ---
    {
      const dw = ED.get(el, 'display') || 'block';
      const w = el.style.width || '';
      const h = el.style.height || '';
      const op = parseFloat(ED.get(el, 'opacity')) || 1;
      const dispVal = dw === 'inline' ? 'inline' : dw === 'inline-block' ? 'inline-block' : dw === 'flex' ? 'flex' : dw === 'none' ? 'none' : 'block';
      PN.addSection('<div class="dw-group">'
        + '<div class="dw-group__title">' + t('display') + '</div>'
        + '<div class="dw-row"><div class="dw-btn-group" style="flex:1">'
          + '<button class="dw-btn dw-btn--sm' + (dispVal==='block'?' dw-btn--active':'') + '" data-dw-action="disp-block">block</button>'
          + '<button class="dw-btn dw-btn--sm' + (dispVal==='flex'?' dw-btn--active':'') + '" data-dw-action="disp-flex">flex</button>'
          + '<button class="dw-btn dw-btn--sm' + (dispVal==='inline'?' dw-btn--active':'') + '" data-dw-action="disp-inline">inline</button>'
          + '<button class="dw-btn dw-btn--sm' + (dispVal==='none'?' dw-btn--active':'') + '" data-dw-action="disp-none">none</button>'
        + '</div></div>'
        + '<div class="dw-row"><span class="dw-row__label">' + t('width') + '</span>'
          + '<input type="number" class="dw-num" value="' + (parseInt(w)||'') + '" data-dw-prop="width" step="1" min="0">'
          + '<button class="dw-btn dw-btn--sm" data-dw-action="width-auto" style="flex-shrink:0">Auto</button>'
        + '</div>'
        + '<div class="dw-row"><span class="dw-row__label">' + t('height') + '</span>'
          + '<input type="number" class="dw-num" value="' + (parseInt(h)||'') + '" data-dw-prop="height" step="1" min="0">'
          + '<button class="dw-btn dw-btn--sm" data-dw-action="height-auto" style="flex-shrink:0">Auto</button>'
        + '</div>'
        + '<div class="dw-row"><span class="dw-row__label">' + t('opacity') + '</span>'
          + '<input type="number" class="dw-num" value="' + op + '" data-dw-prop="opacity" step="0.05" min="0" max="1">'
        + '</div>'
      + '</div>');
    }

    // --- Background (all elements) ---
    {
      PN.addSection('<div class="dw-group">'
        + '<div class="dw-group__title">' + t('background') + '</div>'
        + '<div class="dw-row"><span class="dw-row__label">' + t('bgColor') + '</span>'
          + '<span class="dw-color-wrap"><input type="color" class="dw-color-input" value="' + (rgbToHex(ED.get(el, 'background-color')) || '#ffffff') + '" data-dw-trigger="bg"></span>'
          + '<button class="dw-btn dw-btn--sm" data-dw-action="bg-warm">' + t('warm') + '</button>'
          + '<button class="dw-btn dw-btn--sm" data-dw-action="bg-white">' + t('white') + '</button>'
          + '<button class="dw-btn dw-btn--sm" data-dw-action="bg-transparent">' + t('transparent') + '</button>'
        + '</div>'
      + '</div>');
    }

    // --- Spacing (all elements) ---
    {
      const mg = parseInt(ED.get(el, 'margin-top')) || 0;
      const pd = parseInt(ED.get(el, 'padding-top')) || 0;
      const rd = parseFloat(ED.get(el, 'border-radius')) || 0;
      PN.addSection('<div class="dw-group">'
        + '<div class="dw-group__title">' + t('spacing') + '</div>'
        + '<div class="dw-row"><span class="dw-row__label">' + t('margin') + '</span>'
          + '<input type="number" class="dw-num" value="' + mg + '" data-dw-prop="margin" step="2" min="0">'
        + '</div>'
        + '<div class="dw-row"><span class="dw-row__label">' + t('padding') + '</span>'
          + '<input type="number" class="dw-num" value="' + pd + '" data-dw-prop="padding" step="2" min="0">'
        + '</div>'
        + '<div class="dw-row"><span class="dw-row__label">' + t('radius') + '</span>'
          + '<input type="number" class="dw-num" value="' + rd + '" data-dw-prop="border-radius" step="2" min="0">'
        + '</div>'
      + '</div>');
    }

    // --- Border (all elements) ---
    {
      const bw = parseFloat(ED.get(el, 'border-width')) || 0;
      const bs = ED.get(el, 'border-style') || 'none';
      const bc = ED.get(el, 'border-color') || '#000000';
      PN.addSection('<div class="dw-group">'
        + '<div class="dw-group__title">' + t('border') + '</div>'
        + '<div class="dw-row"><span class="dw-row__label">' + t('width') + '</span>'
          + '<input type="number" class="dw-num" value="' + bw + '" data-dw-prop="border-width" step="1" min="0">'
        + '</div>'
        + '<div class="dw-row"><span class="dw-row__label">' + t('color') + '</span>'
          + '<span class="dw-color-wrap"><input type="color" class="dw-color-input" value="' + (rgbToHex(bc) || '#000000') + '" data-dw-trigger="border-color"></span>'
        + '</div>'
        + '<div class="dw-row"><span class="dw-row__label">' + t('borderStyle') + '</span>'
          + '<div class="dw-btn-group" style="flex:1">'
            + '<button class="dw-btn dw-btn--sm' + (bs==='solid'?' dw-btn--active':'') + '" data-dw-action="bstyle-solid">solid</button>'
            + '<button class="dw-btn dw-btn--sm' + (bs==='dashed'?' dw-btn--active':'') + '" data-dw-action="bstyle-dashed">dashed</button>'
            + '<button class="dw-btn dw-btn--sm' + (bs==='dotted'?' dw-btn--active':'') + '" data-dw-action="bstyle-dotted">dotted</button>'
            + '<button class="dw-btn dw-btn--sm' + (bs==='none'?' dw-btn--active':'') + '" data-dw-action="bstyle-none">' + t('none') + '</button>'
          + '</div>'
        + '</div>'
      + '</div>');
    }

    // --- Shadow (all elements) ---
    {
      const sh = ED.get(el, 'box-shadow') || 'none';
      const hasShadow = sh !== 'none' && sh !== '';
      PN.addSection('<div class="dw-group">'
        + '<div class="dw-group__title">' + t('shadow') + '</div>'
        + '<div class="dw-btn-group">'
          + '<button class="dw-btn dw-btn--sm' + (!hasShadow?' dw-btn--active':'') + '" data-dw-action="shadow-none">' + t('none') + '</button>'
          + '<button class="dw-btn dw-btn--sm' + (sh==='0 2px 8px rgba(0,0,0,0.15)'?' dw-btn--active':'') + '" data-dw-action="shadow-soft">' + t('soft') + '</button>'
          + '<button class="dw-btn dw-btn--sm' + (sh==='0 4px 16px rgba(0,0,0,0.2)'?' dw-btn--active':'') + '" data-dw-action="shadow-medium">' + t('medium') + '</button>'
        + '</div>'
      + '</div>');
    }

    // --- Image controls ---
    if (c === 'media') {
      const w = el.width || parseInt(ED.get(el, 'width')) || 300;
      const fit = ED.get(el, 'object-fit') || 'fill';
      PN.addSection('<div class="dw-group">'
        + '<div class="dw-group__title">' + t('imageSize') + '</div>'
        + '<div class="dw-row"><span class="dw-row__label">' + t('imageSize') + '</span>'
          + '<input type="number" class="dw-num" value="' + w + '" data-dw-prop="width" step="10" min="20">'
          + '<button class="dw-btn dw-btn--sm" data-dw-action="img-max" style="flex-shrink:0">100%</button>'
        + '</div>'
        + '<div class="dw-row"><span class="dw-row__label">' + t('imageFit') + '</span>'
          + '<div class="dw-fit-group" style="flex:1">'
            + '<button class="dw-fit-btn' + (fit === 'fill' ? ' dw-fit-btn--active' : '') + '" data-dw-action="img-fit-fill">' + t('imageFit') + '</button>'
            + '<button class="dw-fit-btn' + (fit === 'contain' ? ' dw-fit-btn--active' : '') + '" data-dw-action="img-fit-contain">' + t('imageContain') + '</button>'
            + '<button class="dw-fit-btn' + (fit === 'cover' ? ' dw-fit-btn--active' : '') + '" data-dw-action="img-fit-cover">' + t('imageCover') + '</button>'
          + '</div>'
        + '</div>'
        + '<div class="dw-row"><span class="dw-row__label">' + t('radius') + '</span>'
          + '<div class="dw-btn-group" style="flex:1">'
            + '<button class="dw-btn dw-btn--sm' + ((ED.get(el,'border-radius')||'0px')==='0px'?' dw-btn--active':'') + '" data-dw-action="img-radius-none">' + t('none') + '</button>'
            + '<button class="dw-btn dw-btn--sm' + (ED.get(el,'border-radius')==='4px'?' dw-btn--active':'') + '" data-dw-action="img-radius-sm">' + t('small') + '</button>'
            + '<button class="dw-btn dw-btn--sm' + (ED.get(el,'border-radius')==='12px'?' dw-btn--active':'') + '" data-dw-action="img-radius-lg">' + t('large') + '</button>'
            + '<button class="dw-btn dw-btn--sm' + (ED.get(el,'border-radius')==='50%'?' dw-btn--active':'') + '" data-dw-action="img-radius-round">' + t('round') + '</button>'
          + '</div>'
        + '</div>'
      + '</div>');
    }

    // --- Advanced ---
    PN.addSection('<div class="dw-group"><div class="dw-group__title">' + t('lineHeight') + '</div>'
      + '<div class="dw-row"><span class="dw-row__label">LH</span><input type="number" class="dw-num" value="' + (parseFloat(ED.get(el, 'line-height'))||1.5) + '" data-dw-prop="line-height" step="0.1" min="0.5"></div></div>');
    PN.addSection('<div class="dw-group"><div class="dw-group__title">' + t('letterSpacing') + '</div>'
      + '<div class="dw-row"><span class="dw-row__label">LS</span><input type="number" class="dw-num" value="' + (parseFloat(ED.get(el, 'letter-spacing'))||0) + '" data-dw-prop="letter-spacing" step="0.5"></div></div>');
    PN.addSection('<div class="dw-group"><div class="dw-group__title">' + t('history') + '</div>'
      + '<div class="dw-btn-group"><button class="dw-btn dw-btn--sm" data-dw-action="undo" disabled>' + t('undo') + '</button><button class="dw-btn dw-btn--sm" data-dw-action="redo" disabled>' + t('redo') + '</button></div></div>');
    const navUp = PN._p?.querySelector('[data-dw-action="nav-up"]');
    const navDown = PN._p?.querySelector('[data-dw-action="nav-down"]');
    if (navUp) navUp.disabled = !el.parentElement || !CI.isAware(el.parentElement);
    if (navDown) navDown.disabled = !el.children.length;
  }

  // ---------- Text content input ----------
  let contentDebounce = null;
  document.addEventListener('input', e => {
    const ta = e.target.closest('[data-dw-text-content]');
    if (!ta) return;
    const el = SEL.get();
    if (!el) return;
    clearTimeout(contentDebounce);
    contentDebounce = setTimeout(() => {
      HIST.push(capStyle(el));
      ED.textContent(el, ta.value);
      SEL.refresh();
    }, 300);
  });

  // ---------- Number input handler ----------
  let numDebounce = null;
  document.addEventListener('input', e => {
    const inp = e.target.closest('[data-dw-prop]');
    if (!inp) return;
    const el = SEL.get(); if (!el) return;
    const prop = inp.dataset.dwProp;
    const raw = inp.value;
    if (raw === '' || raw === '-') return;
    const num = parseFloat(raw);
    if (isNaN(num)) return;
    clearTimeout(numDebounce);
    numDebounce = setTimeout(() => {
      HIST.push(capStyle(el));
      switch (prop) {
        case 'font-size': ED.apply(el, 'font-size', num + 'px'); break;
        case 'font-weight': ED.apply(el, 'font-weight', String(Math.round(num))); break;
        case 'line-height': ED.apply(el, 'line-height', String(num)); break;
        case 'letter-spacing': ED.apply(el, 'letter-spacing', num + 'px'); break;
        case 'margin': ['top','right','bottom','left'].forEach(s => ED.apply(el, 'margin-'+s, num + 'px')); break;
        case 'padding': ['top','right','bottom','left'].forEach(s => ED.apply(el, 'padding-'+s, num + 'px')); break;
        case 'border-radius': ED.apply(el, 'border-radius', num + 'px'); break;
        case 'width': ED.apply(el, 'width', num + 'px'); break;
        case 'height': ED.apply(el, 'height', num + 'px'); break;
        case 'opacity': ED.apply(el, 'opacity', String(num)); break;
        case 'border-width': ED.apply(el, 'border-width', num + 'px'); break;
      }
      SEL.refresh();
    }, 120);
  });

  // ---------- Color picker ----------
  document.addEventListener('input', e => {
    const t = e.target.closest('[data-dw-trigger]');
    if (!t) return;
    const el = SEL.get(); if (!el) return;
    HIST.push(capStyle(el));
    const a = t.dataset.dwTrigger, v = t.value;
    if (a === 'color') ED.color(el, v);
    else if (a === 'bg') ED.bgColor(el, v);
    else if (a === 'border-color') ED.apply(el, 'border-color', v);
    SEL.refresh();
  });

  // ---------- Keyboard ----------
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { SEL.deselect(); return }
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      e.preventDefault();
      const s = e.shiftKey ? HIST.redo() : HIST.undo();
      const el = SEL.get();
      if (s && el) appStyle(el, s);
      updateButtons();
    }
  });

  // ---------- Helpers ----------
  function escHtml(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function rgbToHex(rgb) {
    if (!rgb || rgb === 'transparent' || rgb === 'rgba(0, 0, 0, 0)') return null;
    const m = rgb.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (m) {
      return '#' + [1,2,3].map(i => parseInt(m[i]).toString(16).padStart(2,'0')).join('');
    }
    if (rgb.startsWith('#')) return rgb;
    return null;
  }

  // ---------- Init ----------
  SEL.onSelect(el => {
    if (el) {
      PN.hint('');
      build(el);
    } else {
      PN.hint(t('selectHint'));
      PN.clearSections();
      const badge = PN._p?.querySelector('[data-dw-tag-badge]');
      if (badge) badge.textContent = '';
      const info = PN._p?.querySelector('[data-dw-el-info]');
      if (info) info.innerHTML = '';
      const navUp = PN._p?.querySelector('[data-dw-action="nav-up"]');
      const navDown = PN._p?.querySelector('[data-dw-action="nav-down"]');
      if (navUp) navUp.disabled = true;
      if (navDown) navDown.disabled = true;
    }
  });

  window.__dwSetLang = function(l) {
    if (l !== 'zh' && l !== 'en') return;
    _lang = l; _t = l === 'zh' ? _zh : _en;
    const el = SEL.get();
    if (el) { PN.clearSections(); build(el); }
    PN.hint(t('selectHint'));
  };

  PN.init();
  SEL.enable();
  PN.hint(t('selectHint'));
  console.log('[DWHTML] Editor ready — click any element to edit');
})();
