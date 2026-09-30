const App = (function () {
  'use strict';

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const { esc, md, K } = Fmt;

  const STORE = 'regrelab.state.v1';
  const EXAMPLE = Content.examples[0].state;

  const blankState = () => ({
    xName: '', xUnit: '', yName: '', yUnit: '',
    rows: [['', ''], ['', ''], ['', ''], ['', ''], ['', '']],
    alpha: 0.05, conf: 0.95, dec: 4, xPred: '', tail: 'two', ts: false
  });

  let S = blankState();
  let M = null, V = null, L = null, S2 = null;
  let view = 'data';
  const dirty = { results: true, graphs: true };
  let globalMode = 'all';
  const cardState = {};
  let saveTimer = null, calcTimer = null;
  let learnReady = false;

  // ---------- utilidades de interfaz ----------
  let toastTimer = null;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
  }

  function safeGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function safeSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* sin almacenamiento */ } }

  const numOrNaN = s => Fmt.parse(s);
  const fmtIn = v => String(v).replace('.', ',');

  // ---------- tema ----------
  function setTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    safeSet('regrelab.theme', t);
    const btn = $('#btn-theme');
    if (btn) { btn.innerHTML = Icons.svg(t === 'dark' ? 'sun' : 'moon'); btn.setAttribute('aria-label', t === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'); }
    const meta = $('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', t === 'dark' ? '#0f1729' : '#1F3864');
    Charts.redrawAll();
  }

  function initTheme() {
    let t = safeGet('regrelab.theme');
    if (!t) t = window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', t);
    const btn = $('#btn-theme');
    btn.innerHTML = Icons.svg(t === 'dark' ? 'sun' : 'moon');
    btn.setAttribute('aria-label', t === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
    btn.addEventListener('click', () => setTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'));
  }

  // ---------- estado <-> formulario ----------
  function labels() {
    const xn = S.xName.trim() || 'X', yn = S.yName.trim() || 'Y';
    const xu = S.xUnit.trim(), yu = S.yUnit.trim();
    return {
      xn, yn, ux: xu, uy: yu,
      x: xn + (xu ? ' (' + xu + ')' : ''),
      y: yn + (yu ? ' (' + yu + ')' : '')
    };
  }

  function writeForm() {
    $('#xName').value = S.xName; $('#xUnit').value = S.xUnit;
    $('#yName').value = S.yName; $('#yUnit').value = S.yUnit;
    $('#alpha').value = fmtIn(S.alpha);
    $('#conf').value = fmtIn(+(S.conf * 100).toPrecision(8));
    $('#dec').value = String(S.dec);
    $('#xPred').value = S.xPred === '' ? '' : fmtIn(S.xPred);
    $$('input[name="tail"]').forEach(r => { r.checked = r.value === S.tail; });
    $('#ts').checked = !!S.ts;
    syncChips();
    renderRows();
  }

  function syncChips() {
    const al = numOrNaN($('#alpha').value), cf = numOrNaN($('#conf').value);
    $$('#alpha-chips .chip-btn').forEach(b => b.setAttribute('aria-pressed', String(Math.abs(Number(b.dataset.v) - al) < 1e-9)));
    $$('#conf-chips .chip-btn').forEach(b => b.setAttribute('aria-pressed', String(Math.abs(Number(b.dataset.v) - cf) < 1e-9)));
  }

  function readParams() {
    S.xName = $('#xName').value; S.xUnit = $('#xUnit').value;
    S.yName = $('#yName').value; S.yUnit = $('#yUnit').value;
    const al = numOrNaN($('#alpha').value), cf = numOrNaN($('#conf').value);
    S.alpha = isNaN(al) ? NaN : al;
    S.conf = isNaN(cf) ? NaN : cf / 100;
    S.dec = Number($('#dec').value) || 4;
    S.xPred = $('#xPred').value.trim();
    const t = $('input[name="tail"]:checked');
    S.tail = t ? t.value : 'two';
    S.ts = $('#ts').checked;
  }

  // ---------- tabla de datos ----------
  function renderRows() {
    const tb = $('#dataBody');
    tb.innerHTML = '';
    S.rows.forEach((r, i) => {
      const tr = document.createElement('tr');
      tr.innerHTML = '<td class="idx">' + (i + 1) + '</td>' +
        '<td><input class="cell" type="text" inputmode="decimal" enterkeyhint="next" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" data-r="' + i + '" data-c="0" aria-label="X, fila ' + (i + 1) + '" value="' + esc(r[0]) + '"></td>' +
        '<td><input class="cell" type="text" inputmode="decimal" enterkeyhint="next" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" data-r="' + i + '" data-c="1" aria-label="Y, fila ' + (i + 1) + '" value="' + esc(r[1]) + '"></td>' +
        '<td><button type="button" class="icon-btn del" data-del="' + i + '" aria-label="Eliminar fila ' + (i + 1) + '" title="Eliminar fila">' + Icons.svg('x') + '</button></td>';
      tb.appendChild(tr);
    });
    updateHeaders();
    refreshMarks();
  }

  // Marca en rojo las celdas con un valor que no es número o con la fila incompleta
  function refreshMarks() {
    const active = document.activeElement;
    $$('#dataBody tr').forEach(tr => {
      const cells = $$('.cell', tr);
      const vals = cells.map(c => c.value.trim());
      const here = active && tr.contains(active);
      cells.forEach((c, k) => {
        const v = vals[k], o = vals[1 - k];
        const bad = (v !== '' && isNaN(numOrNaN(v))) || (v === '' && o !== '' && !here);
        c.classList.toggle('bad', bad);
        c.setAttribute('aria-invalid', bad ? 'true' : 'false');
      });
    });
  }

  // Mueve el foco entre celdas; al pasar la última crea una fila nueva
  function moveFocus(el, dir) {
    const group = el.closest('[data-cells]');
    const cells = group ? $$('.cell', group) : [el];
    const i = cells.indexOf(el) + dir;
    if (i < 0) return;
    if (i < cells.length) { cells[i].focus(); return; }
    if (group && group.id === 'dataBody') addRow(true);
    else { el.blur(); const c = $('#practice [data-p="check"]'); if (c) c.focus(); }
  }

  function updateHeaders() {
    const Lb = labels();
    $('#thX').textContent = Lb.x; $('#thY').textContent = Lb.y;
  }

  function addRow(focus) {
    S.rows.push(['', '']);
    renderRows();
    if (focus) {
      const inp = $('#dataBody tr:last-child input');
      if (inp) inp.focus();
    }
    scheduleCompute();
  }

  function fillFrom(startRow, pairs) {
    pairs.forEach((p, k) => {
      const i = startRow + k;
      if (i < S.rows.length) S.rows[i] = [p[0], p[1]]; else S.rows.push([p[0], p[1]]);
    });
    renderRows();
    scheduleCompute();
  }

  function loadTable(parsed, replace) {
    if (!parsed.rows.length) { toast('No se encontraron pares de datos en el texto.'); return; }
    if (parsed.xName !== undefined) {
      if (parsed.xName && parsed.xName !== 'X') S.xName = parsed.xName;
      if (parsed.yName && parsed.yName !== 'Y') S.yName = parsed.yName;
      if (parsed.xUnit) S.xUnit = parsed.xUnit;
      if (parsed.yUnit) S.yUnit = parsed.yUnit;
    }
    if (replace) S.rows = [];
    parsed.rows.forEach(r => S.rows.push([r[0], r[1]]));
    writeForm();
    scheduleCompute();
    toast('Se cargaron ' + parsed.rows.length + ' pares de datos.');
  }

  // ---------- validación y cálculo ----------
  function validate() {
    const errors = [], warnings = [], notes = [];
    const x = [], y = [];
    const usedRows = [];
    S.rows.forEach((r, i) => {
      const a = String(r[0]).trim(), b = String(r[1]).trim();
      if (a === '' && b === '') return;
      if (a === '' || b === '') { errors.push('La fila ' + (i + 1) + ' está incompleta: falta ' + (a === '' ? 'el valor de X' : 'el valor de Y') + '.'); return; }
      const va = numOrNaN(a), vb = numOrNaN(b);
      if (isNaN(va) || isNaN(vb)) { errors.push('En la fila ' + (i + 1) + ' hay un valor que no es un número («' + (isNaN(va) ? a : b) + '»). Usa solo cifras, con coma o punto decimal.'); return; }
      x.push(va); y.push(vb); usedRows.push(i);
    });
    const params = { alpha: S.alpha, conf: S.conf };
    if (!(S.alpha > 0 && S.alpha < 1)) errors.push('El nivel de significancia α debe estar entre 0 y 1 (por ejemplo 0,05).');
    if (!(S.conf > 0 && S.conf < 1)) errors.push('El nivel de confianza debe estar entre 0 y 100 % (por ejemplo 95).');
    let xPred = null, xPredEmpty = false;
    if (S.xPred === '') xPredEmpty = true;
    else {
      xPred = numOrNaN(S.xPred);
      if (isNaN(xPred)) { errors.push('El valor de X para predecir no es un número válido.'); xPred = null; }
    }
    if (!errors.length && x.length < 3) errors.push('Se necesitan al menos 3 pares de datos (por ahora hay ' + x.length + '). ¡Ya casi! Agrega ' + (3 - x.length) + ' más.');
    if (!errors.length && x.every(v => v === x[0])) errors.push('Todos los valores de X son iguales, así que no se puede calcular la pendiente (la recta sería vertical). Necesitas al menos dos valores distintos de X.');
    return { ok: errors.length === 0, errors, warnings, notes, x, y, usedRows, alpha: S.alpha, conf: S.conf, xPred, xPredEmpty };
  }

  function recompute() {
    readParams();
    V = validate();
    Fmt.setDecimals(S.dec);
    L = labels();
    M = null;
    if (V.ok) {
      M = Stats.analyze(V.x, V.y, { alpha: V.alpha, conf: V.conf, tail: S.tail, xPred: V.xPred, timeOrdered: S.ts });
      M.x = V.x; M.y = V.y;
      S2 = { alpha: V.alpha, conf: V.conf, tail: S.tail, ts: S.ts, xPredEmpty: V.xPredEmpty };
      if (M.degenerateY) V.warnings.push('Todos los valores de Y son iguales: la recta es horizontal y el coeficiente de correlación r no se puede calcular (se mostrará «—»).');
      if (M.n === 3) V.notes.push('Con solo 3 pares hay apenas 1 grado de libertad (n − 2): los resultados de las pruebas serán muy poco confiables.');
      const o = M.outliers;
      const rowsOf = idx => idx.map(i => V.usedRows[i] + 1).join(', ');
      if (o.x.length) V.warnings.push('Posibles valores atípicos en X (filas ' + rowsOf(o.x) + '). Verifica que no sean errores de carga.');
      if (o.y.length) V.warnings.push('Posibles valores atípicos en Y (filas ' + rowsOf(o.y) + '). Verifica que no sean errores de carga.');
      if (o.resid.length) V.warnings.push('Las filas ' + rowsOf(o.resid) + ' tienen residuos muy grandes (más de 2 S_YX): la recta las ajusta mal.');
    }
    dirty.results = dirty.graphs = true;
    renderValidation();
    updateActionBar();
    updateHeaders();
    updateButtons();
    persist();
    if (view === 'results' || view === 'graphs') showView(view, true);
  }

  function scheduleCompute() {
    clearTimeout(calcTimer);
    calcTimer = setTimeout(recompute, 220);
  }

  function persist() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => safeSet(STORE, JSON.stringify(S)), 300);
  }

  function renderValidation() {
    const box = $('#validation');
    const items = [];
    if (!V) { box.innerHTML = ''; return; }
    V.errors.forEach(e => items.push('<div class="msg err"><span class="ic">' + Icons.svg('info') + '</span><div>' + esc(e) + '</div></div>'));
    V.warnings.forEach(e => items.push('<div class="msg warn-m"><span class="ic">' + Icons.svg('warn') + '</span><div>' + esc(e) + '</div></div>'));
    V.notes.forEach(e => items.push('<div class="msg note-m"><span class="ic">' + Icons.svg('info') + '</span><div>' + esc(e) + '</div></div>'));
    if (V.ok && !items.length) items.push('<div class="msg ok"><span class="ic">' + Icons.svg('check') + '</span><div>¡Todo en orden! Datos válidos: ' + V.x.length + ' pares.</div></div>');
    else if (V.ok) items.unshift('<div class="msg ok"><span class="ic">' + Icons.svg('check') + '</span><div>Datos válidos: ' + V.x.length + ' pares.</div></div>');
    box.innerHTML = items.join('');
  }

  // Barra fija «Calcular» (celular, pantalla Datos)
  function updateActionBar() {
    const st = $('#ab-status'), b = $('#ab-calc');
    if (!st || !V) return;
    const n = V.x.length;
    st.innerHTML = V.ok
      ? Icons.svg('check') + '<span><strong>' + n + '</strong> pares listos</span>'
      : Icons.svg(n < 3 && !V.errors.some(e => !/al menos 3 pares/.test(e)) ? 'info' : 'warn') +
        '<span>' + (n < 3 && !V.errors.some(e => !/al menos 3 pares/.test(e)) ? '<strong>' + n + '</strong> de 3 pares mínimos' : 'Hay datos por corregir') + '</span>';
    st.classList.toggle('ok', V.ok);
    b.classList.toggle('dim', !V.ok);
  }

  // Teclas de ayuda sobre el teclado del celular: signo, coma y desplazamiento entre celdas
  function initKeyboardBar() {
    const bar = $('#kbbar');
    const touchy = () => window.matchMedia('(pointer: coarse)').matches || (window.innerWidth < 900 && navigator.maxTouchPoints > 0);
    let hideTimer = null;
    const place = () => {
      const vv = window.visualViewport;
      bar.style.bottom = vv ? Math.max(0, window.innerHeight - vv.height - vv.offsetTop) + 'px' : '0px';
    };
    const show = () => { clearTimeout(hideTimer); place(); bar.hidden = false; document.body.classList.add('kb-open'); };
    const hide = () => { hideTimer = setTimeout(() => { bar.hidden = true; document.body.classList.remove('kb-open'); }, 120); };
    document.addEventListener('focusin', e => { if (e.target.classList && e.target.classList.contains('cell') && touchy()) show(); });
    document.addEventListener('focusout', e => { if (e.target.classList && e.target.classList.contains('cell')) hide(); });
    if (window.visualViewport) { window.visualViewport.addEventListener('resize', place); window.visualViewport.addEventListener('scroll', place); }
    bar.addEventListener('pointerdown', e => e.preventDefault());
    bar.addEventListener('click', e => {
      const k = e.target.closest('[data-k]');
      const el = document.activeElement;
      if (!k) return;
      if (k.dataset.k === 'done') { if (el && el.blur) el.blur(); return; }
      if (!el || !el.classList.contains('cell')) return;
      if (k.dataset.k === 'sign') {
        el.value = /^[-−]/.test(el.value) ? el.value.slice(1) : '-' + el.value;
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
      if (k.dataset.k === 'comma') {
        const s = el.selectionStart, f = el.selectionEnd;
        const rest = el.value.slice(0, s) + el.value.slice(f);
        if (!/[.,]/.test(rest)) { el.setRangeText(s === 0 || /^[-−]$/.test(rest.slice(0, s)) ? '0,' : ',', s, f, 'end'); el.dispatchEvent(new Event('input', { bubbles: true })); }
      }
      if (k.dataset.k === 'prev') moveFocus(el, -1);
      if (k.dataset.k === 'next') moveFocus(el, 1);
    });
  }

  function updateButtons() {
    const ok = !!M;
    ['#btn-share', '#btn-print', '#calc'].forEach(s => { const b = $(s); if (b) b.classList.toggle('dim', !ok); });
  }

  // ---------- navegación ----------
  function showView(name, keepScroll) {
    view = name;
    document.body.classList.toggle('on-data', name === 'data');
    $$('.view').forEach(v => { v.hidden = v.id !== 'view-' + name; });
    $$('[data-nav]').forEach(b => {
      const on = b.dataset.nav === name;
      b.setAttribute('aria-current', on ? 'page' : 'false');
    });
    if (name === 'results') renderResults();
    if (name === 'graphs') renderGraphs();
    if (name === 'learn') renderLearn();
    if (name === 'practice') Practice.open();
    if (!keepScroll) window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
    requestAnimationFrame(() => Charts.resizeAll());
  }

  // ---------- tooltips de siglas ----------
  const tipKeys = Object.keys(Content.tips).sort((a, b) => b.length - a.length);
  const tipRe = new RegExp('(?<![\\p{L}\\p{N}_])(' + tipKeys.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')(?![\\p{L}\\p{N}_])', 'gu');

  function applyTips(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        const el = node.parentElement;
        if (!el || el.closest('.katex, .tip, .rc-toggle, script, style, textarea, input, option, canvas, button.png-btn, .no-tip')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      const txt = node.nodeValue;
      tipRe.lastIndex = 0;
      if (!tipRe.test(txt)) return;
      tipRe.lastIndex = 0;
      const frag = document.createDocumentFragment();
      let last = 0, m;
      while ((m = tipRe.exec(txt))) {
        if (m.index > last) frag.appendChild(document.createTextNode(txt.slice(last, m.index)));
        const s = document.createElement('span');
        s.className = 'tip'; s.tabIndex = 0; s.setAttribute('role', 'button');
        s.dataset.tip = m[1]; s.textContent = m[1];
        frag.appendChild(s);
        last = m.index + m[1].length;
      }
      if (last < txt.length) frag.appendChild(document.createTextNode(txt.slice(last)));
      node.parentNode.replaceChild(frag, node);
    });
  }

  function initTips() {
    const box = $('#tip');
    let current = null;
    const show = el => {
      const key = el.dataset.tip;
      const text = Content.tips[key];
      if (!text) return;
      current = el;
      box.innerHTML = '<strong>' + esc(key) + '</strong> — ' + esc(text);
      box.classList.add('show');
      const r = el.getBoundingClientRect();
      const bw = Math.min(320, window.innerWidth - 16);
      box.style.maxWidth = bw + 'px';
      const bh = box.offsetHeight;
      let left = Math.max(8, Math.min(window.innerWidth - bw - 8, r.left + r.width / 2 - bw / 2));
      let top = r.top - bh - 8;
      if (top < 8) top = r.bottom + 8;
      box.style.left = left + 'px'; box.style.top = top + 'px';
    };
    const hide = () => { box.classList.remove('show'); current = null; };
    document.addEventListener('mouseover', e => { const t = e.target.closest('.tip'); if (t) show(t); });
    document.addEventListener('mouseout', e => { if (e.target.closest('.tip')) hide(); });
    document.addEventListener('focusin', e => { const t = e.target.closest('.tip'); if (t) show(t); });
    document.addEventListener('focusout', e => { if (e.target.closest('.tip')) hide(); });
    document.addEventListener('click', e => {
      const t = e.target.closest('.tip');
      if (t) { if (current === t && box.classList.contains('show')) hide(); else show(t); } else hide();
    });
    window.addEventListener('scroll', hide, { passive: true });
  }

  // ---------- resultados ----------
  function mountCharts(root) {
    $$('[data-chart]', root).forEach(el => {
      const id = el.dataset.chart;
      if (id === 'panels') { el._sel = undefined; Charts.mount(el, 'panels', M, L); return; }
      if (id.indexOf('dist') === 0) { Charts.mount(el, 'dist', M, L, Steps.distOptions(id, M, S2)); return; }
      Charts.mount(el, id, M, L);
    });
  }

  function emptyState() {
    return '<div class="empty"><svg viewBox="0 0 120 80" width="120" height="80" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 8v62h100"/><path d="M24 58L100 20" stroke-dasharray="5 5" opacity=".55"/><circle cx="30" cy="52" r="3.5" fill="currentColor"/><circle cx="48" cy="44" r="3.5" fill="currentColor"/><circle cx="64" cy="41" r="3.5" fill="currentColor"/><circle cx="82" cy="27" r="3.5" fill="currentColor"/><circle cx="98" cy="24" r="3.5" fill="currentColor"/></svg><h3>Todavía no hay resultados</h3>' +
      '<p>' + (V && V.errors.length ? esc(V.errors[0]) : 'Carga al menos 3 pares de datos (X, Y) para comenzar.') + '</p>' +
      '<div class="btn-row center"><button class="btn primary" data-go="data">Ir a «Datos»</button><button class="btn ghost" data-act="example">Cargar ejemplo del apunte</button></div></div>';
  }

  function cardHTML(c) {
    const st = cardState[c.id] || (cardState[c.id] = { open: true, shown: globalMode === 'step' ? 1 : c.steps.length, mode: globalMode });
    return '<article class="card rc" id="' + c.id + '" data-card="' + c.id + '">' +
      '<header class="rc-h"><button type="button" class="rc-toggle" aria-expanded="' + st.open + '" aria-controls="b-' + c.id + '">' +
      '<span class="rc-num">' + c.num + '</span><span class="rc-title">' + esc(c.title) + '</span><span class="chev" aria-hidden="true">' + Icons.svg('chev') + '</span></button>' +
      '<button type="button" class="btn small ghost help-btn" aria-expanded="false">' + Icons.svg('help') + '¿Qué significa esto?</button></header>' +
      '<div class="help-box" hidden>' + md(c.help) + '</div>' +
      '<div class="rc-body" id="b-' + c.id + '"' + (st.open ? '' : ' hidden') + '>' +
      '<div class="steps">' + c.steps.map((s, i) => s.replace('<section class="step"', '<section class="step" data-i="' + i + '"')).join('') + '</div>' +
      '<div class="step-ctl"><span class="step-count"></span><button type="button" class="btn small" data-step="next">Siguiente paso' + Icons.svg('next') + '</button>' +
      '<button type="button" class="btn small ghost" data-step="all">Ver todo</button><button type="button" class="btn small ghost" data-step="reset">' + Icons.svg('reset') + 'Reiniciar</button></div>' +
      '</div></article>';
  }

  function applyCard(id) {
    const el = document.getElementById(id);
    if (!el) return;
    const st = cardState[id];
    const steps = $$('.step', el);
    steps.forEach((s, i) => { s.hidden = i >= st.shown; });
    const total = steps.length;
    const stepMode = st.mode === 'step' && total > 1;
    const ctl = $('.step-ctl', el);
    ctl.hidden = !stepMode;
    if (stepMode) {
      const done = st.shown >= total;
      $('.step-count', el).textContent = 'Paso ' + Math.min(st.shown, total) + ' de ' + total;
      const nb = $('[data-step="next"]', el);
      nb.disabled = done;
      nb.innerHTML = done ? 'Completo' + Icons.svg('check') : 'Siguiente paso' + Icons.svg('next');
      $('[data-step="all"]', el).hidden = done;
    }
    $('.rc-toggle', el).setAttribute('aria-expanded', String(st.open));
    $('.rc-body', el).hidden = !st.open;
  }

  const R_HAT = String.raw`\hat{Y}=`;

  // Bosquejo de los datos y la recta para el encabezado de resultados
  function miniPlot() {
    const W = 210, H = 132, pl = 10, pr = 8, pt = 8, pb = 12;
    const x0 = M.xMin, x1 = M.xMax, ys = M.y.concat(M.yhat);
    const y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
    const sx = v => pl + (x1 === x0 ? 0.5 : (v - x0) / (x1 - x0)) * (W - pl - pr);
    const sy = v => H - pb - (y1 === y0 ? 0.5 : (v - y0) / (y1 - y0)) * (H - pt - pb);
    const dots = M.x.map((v, i) => '<circle cx="' + sx(v).toFixed(1) + '" cy="' + sy(M.y[i]).toFixed(1) + '" r="3.4" fill="#F9A825" stroke="currentColor" stroke-width="1.2"/>').join('');
    const yl = v => M.b0 + M.b1 * v;
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Bosquejo de los datos y la recta ajustada" fill="none" stroke="currentColor" stroke-linecap="round" style="color:var(--accent)">' +
      '<path d="M' + pl + ' ' + pt + 'V' + (H - pb) + 'H' + (W - pr) + '" stroke-width="1.2" opacity=".5"/>' +
      '<path d="M' + sx(x0).toFixed(1) + ' ' + sy(yl(x0)).toFixed(1) + 'L' + sx(x1).toFixed(1) + ' ' + sy(yl(x1)).toFixed(1) + '" stroke-width="2"/>' + dots + '</svg>';
  }

  function renderResults() {
    const root = $('#results');
    if (!dirty.results) { Charts.resizeAll(); return; }
    Charts.destroyAll();
    if (!M) {
      root.innerHTML = emptyState();
      dirty.results = false;
      return;
    }
    const cards = Steps.build(M, S2, L);
    const eqTex = R_HAT + Fmt.tex(M.b0) + (M.b1 < 0 ? '-' : '+') + Fmt.tex(Math.abs(M.b1)) + String.raw`\,X`;
    const stat = (k, v) => '<div><dt>' + k + '</dt><dd>' + v + '</dd></div>';
    const hero = '<section class="sheet"><div><p class="sheet-lab">Recta ajustada por mínimos cuadrados</p><div class="sheet-eq">' + K(eqTex, true) + '</div>' +
      '<p class="sheet-msg">' + Icons.svg('check') + Content.cheers[0] + '</p></div>' +
      '<div class="sheet-plot">' + miniPlot() + '</div>' +
      '<dl class="sheet-stats">' + stat('n', M.n) + stat('r', Fmt.n(M.r)) + stat('r²', Fmt.n(M.r2)) + stat('S<sub>YX</sub>', Fmt.n(M.syx)) + '</dl>' +
      '<p class="small sheet-note">Recorre las tarjetas en orden: cada una explica la fórmula, el reemplazo con tus datos y qué significa el resultado. Se calcula con precisión completa y se redondea solo al mostrar; a mano pueden aparecer diferencias en la última cifra.</p></section>';
    const idx = '<nav class="jump" aria-label="Ir a una sección"><span>Ir a:</span>' + cards.map(c => '<a href="#' + c.id + '" data-jump="' + c.id + '">' + c.num + '</a>').join('') + '</nav>';
    const warns = (V.warnings.length || V.notes.length)
      ? '<div class="stack">' + V.warnings.map(w => '<div class="warn"><span class="ic">' + Icons.svg('warn') + '</span><div>' + esc(w) + '</div></div>').join('') + V.notes.map(w => '<div class="note"><span class="ic">' + Icons.svg('info') + '</span><div>' + esc(w) + '</div></div>').join('') + '</div>' : '';
    const dataTbl = '<div class="print-only"><h2>RegreLab — Resolución paso a paso</h2><p>' + esc(Content.author) + '</p><p>Variable X: ' + esc(L.x) + ' · Variable Y: ' + esc(L.y) + ' · α = ' + Fmt.n(S2.alpha) + ' · Confianza = ' + Fmt.pct(S2.conf, 1) + '</p>' +
      '<table class="tbl"><thead><tr><th>N.º</th><th>' + esc(L.x) + '</th><th>' + esc(L.y) + '</th></tr></thead><tbody>' +
      M.x.map((v, i) => '<tr><td>' + (i + 1) + '</td><td>' + Fmt.n(v) + '</td><td>' + Fmt.n(M.y[i]) + '</td></tr>').join('') + '</tbody></table></div>';
    root.innerHTML = dataTbl + hero + warns + idx + cards.map(cardHTML).join('');
    cards.forEach(c => applyCard(c.id));
    applyTips(root);
    mountCharts(root);
    dirty.results = false;
  }

  function setGlobalMode(mode) {
    globalMode = mode;
    $$('[data-mode]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
    Object.keys(cardState).forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      const total = $$('.step', el).length;
      cardState[id].mode = mode;
      cardState[id].shown = mode === 'step' ? 1 : total;
      applyCard(id);
    });
    Charts.resizeAll();
  }

  function setAllOpen(open) {
    Object.keys(cardState).forEach(id => { cardState[id].open = open; applyCard(id); });
    Charts.resizeAll();
  }

  // ---------- gráficos ----------
  function renderGraphs() {
    const root = $('#graphs');
    if (!dirty.graphs) { Charts.resizeAll(); return; }
    if (!M) {
      root.innerHTML = emptyState();
      dirty.graphs = false;
      return;
    }
    const cap = t => '<p class="caption">' + t + '</p>';
    const box = (id, title, text, after) => '<div class="graph-item">' + cap(text) + Steps.chartBox(id, title, after) + '</div>';
    root.innerHTML =
      '<p class="lead">Todos los gráficos de la resolución en un solo lugar. Cada uno se puede descargar como imagen PNG.</p>' +
      box('scatter', 'Diagrama de dispersión', '<strong>5.1</strong> Cada punto es un par (X, Y). Sirve para ver la tendencia.') +
      box('regression', 'Recta de regresión y residuos', '<strong>5.3</strong> La recta de mínimos cuadrados y los residuos (segmentos rojos).') +
      box('panels', 'SST, SSR y SSE', '<strong>5.5</strong> Violeta = SST, azul = SSR, rojo = SSE. Toca un punto para ver su descomposición.',
        '<div class="pick-info" aria-live="polite"><span class="hint">Toca un punto para ver su descomposición.</span></div>') +
      box('bars', 'SST, SSR y SSE en porcentajes', '<strong>5.5</strong> Cuánto pesa cada parte de la variación.') +
      box('residuals', 'Residuos frente a X', '<strong>5.8</strong> Si el modelo es adecuado, los puntos se reparten al azar alrededor de 0.') +
      (M.degenerateY ? '' :
        box('distT', 'Prueba t para la pendiente', '<strong>5.9</strong> Regiones de rechazo, valor crítico y estadístico t.') +
        box('distF', 'Prueba F para la pendiente', '<strong>5.10</strong> Región de rechazo de la distribución F.') +
        box('distR', 'Prueba t para la correlación', '<strong>5.12</strong> Igual que la prueba de la pendiente, ahora para ρ.')) +
      box('bands', 'Bandas de confianza y de predicción', '<strong>5.13</strong> El IP (naranja) es más ancho que el IC (verde azulado).');
    applyTips(root);
    mountCharts(root);
    dirty.graphs = false;
  }

  // ---------- aprender ----------
  function renderLearn() {
    if (learnReady) return;
    learnReady = true;
    const sig = Content.siglas.map(s =>
      '<div class="gl-item" data-q="' + esc((s.k + ' ' + s.name + ' ' + s.mean).toLowerCase()) + '"><div class="gl-k">' + esc(s.k) + '</div><div><strong>' + esc(s.name) + '</strong>' +
      '<div class="small">Se lee: ' + esc(s.read) + '</div><p>' + esc(s.mean) + '</p></div></div>').join('');
    const sym = Content.simbolos.map(s =>
      '<div class="gl-item" data-q="' + esc((s.read + ' ' + s.mean).toLowerCase()) + '"><div class="gl-k tex">' + K(s.tex) + '</div><div><div class="small">Se lee: ' + esc(s.read) + '</div><p>' + esc(s.mean) + '</p></div></div>').join('');
    $('#learn-gloss').innerHTML =
      '<div class="search"><label class="sr-only" for="gl-search">Buscar en el glosario</label><input id="gl-search" type="search" placeholder="Buscar sigla o símbolo…" autocomplete="off"></div>' +
      '<h3>Siglas</h3><div class="gl-grid">' + sig + '</div><h3>Símbolos</h3><div class="gl-grid">' + sym + '</div>' +
      '<p class="small">Tip: toca cualquier sigla subrayada en la app para ver su significado.</p>';
    $('#learn-faq').innerHTML = '<div class="faq">' + Content.faq.map((q, i) =>
      '<details class="faq-i"><summary><span>' + md(q[0]).replace(/^<p>|<\/p>$/g, '') + '</span></summary><div class="faq-a">' + md(q[1]) + '</div></details>').join('') + '</div>';
    $('#learn-formulas').innerHTML = Content.formulario.map(g =>
      '<section class="card"><h3>' + esc(g.title) + '</h3>' + g.items.map(it =>
        '<div class="fm"><div class="fm-n">' + esc(it[0]) + '</div><div class="fm-f">' + K(it[1], true) + '</div></div>').join('') + '</section>').join('');
    $('#learn-care').innerHTML = '<div class="care-grid">' + Content.precauciones.map(c =>
      '<div class="card care"><div class="care-i" aria-hidden="true">' + Icons.svg(c[0]) + '</div><h3>' + esc(c[1]) + '</h3><p>' + esc(c[2]) + '</p></div>').join('') + '</div>';
    applyTips($('#view-learn'));
    $('#gl-search').addEventListener('input', e => {
      const q = e.target.value.trim().toLowerCase();
      $$('#learn-gloss .gl-item').forEach(it => { it.hidden = q !== '' && it.dataset.q.indexOf(q) < 0; });
    });
  }

  function setLearnTab(name) {
    $$('[data-ltab]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.ltab === name)));
    $$('.ltab-panel').forEach(p => { p.hidden = p.id !== 'learn-' + name; });
  }

  // ---------- acciones ----------
  function loadExample() {
    S = JSON.parse(JSON.stringify(EXAMPLE));
    writeForm();
    recompute();
    toast('Ejemplo del apunte cargado. ¡Ahora pulsa «Calcular»!');
  }

  function renderExamples() {
    $('#examples-list').innerHTML = Content.examples.map((e, i) =>
      '<li class="ex-item"><div class="ex-h"><span class="ex-tag">' + esc(e.tag) + '</span><h3>' + esc(e.title) + '</h3></div><p>' + esc(e.blurb) + '</p>' +
      '<p class="ex-learn"><strong>Qué observar.</strong> ' + esc(e.learn) + '</p>' +
      '<button type="button" class="btn primary small" data-ex="' + i + '">' + Icons.svg('flask') + 'Cargar este ejemplo</button></li>').join('');
  }

  function loadExampleById(i) {
    const ex = Content.examples[i];
    S = JSON.parse(JSON.stringify(ex.state));
    writeForm();
    recompute();
    $('#dlg-examples').close();
    showView('data');
    toast('Ejemplo cargado: ' + ex.title + '. Pulsa «Calcular».');
  }

  // Lleva un ejercicio del modo práctica a la resolución completa
  function resolveExercise(ex) {
    S = Object.assign(blankState(), {
      xName: ex.xName, xUnit: ex.xUnit, yName: ex.yName, yUnit: ex.yUnit,
      rows: ex.x.map((v, i) => [String(v), String(ex.y[i])]), alpha: 0.05, conf: 0.95, dec: 4, xPred: String(ex.xp), tail: 'two', ts: false
    });
    writeForm();
    recompute();
    showView('results');
    toast('Resolución completa del ejercicio ' + ex.seed + '.');
  }

  function clearAll() {
    if (S.rows.some(r => String(r[0]).trim() !== '' || String(r[1]).trim() !== '') && !window.confirm('¿Borrar todos los datos cargados?')) return;
    S = blankState();
    writeForm();
    recompute();
    toast('Datos borrados.');
  }

  function goCalc() {
    readParams();
    recompute();
    if (!M) {
      $('#validation').scrollIntoView({ behavior: 'smooth', block: 'center' });
      $('#validation').classList.remove('shake'); void $('#validation').offsetWidth; $('#validation').classList.add('shake');
      toast('Revisa los mensajes antes de calcular.');
      return;
    }
    showView('results');
    toast(Content.cheers[Math.floor(Math.random() * Content.cheers.length)]);
  }

  function openShare() {
    if (!M) { toast('Primero carga datos válidos para compartir.'); return; }
    readParams();
    $('#share-link').value = Share.link(S);
    $('#share-native').hidden = !navigator.share;
    $('#dlg-share').showModal();
  }

  function printReport() {
    if (!M) { toast('Primero carga datos válidos para exportar.'); return; }
    showView('results');
    const saved = JSON.parse(JSON.stringify(cardState));
    Object.keys(cardState).forEach(id => { cardState[id].open = true; cardState[id].shown = $$('.step', document.getElementById(id)).length; cardState[id].mode = 'all'; applyCard(id); });
    document.body.classList.add('printing');
    Charts.resizeAll();
    const restore = () => {
      document.body.classList.remove('printing');
      Object.keys(saved).forEach(id => { cardState[id] = saved[id]; applyCard(id); });
      window.removeEventListener('afterprint', restore);
      Charts.resizeAll();
    };
    window.addEventListener('afterprint', restore);
    setTimeout(() => window.print(), 500);
  }

  function summaryCSV() {
    const rows = Steps.summaryPlain(M, S2, L);
    const q = s => '"' + String(s).replace(/"/g, '""') + '"';
    return ['Medida;Valor;Interpretación'].concat(rows.map(r => r.map(q).join(';'))).join('\r\n');
  }

  function summaryText() {
    return 'RegreLab — Resumen de resultados\r\n' + Steps.summaryPlain(M, S2, L).map(r => r[0] + '\t' + r[1] + '\t' + r[2]).join('\r\n');
  }

  function openPickInfo(box, i) {
    const info = box.closest('.chartbox').querySelector('.pick-info');
    if (info) info.innerHTML = Steps.pickInfo(M, i, L);
  }

  // ---------- eventos ----------
  function bindEvents() {
    $$('[data-nav]').forEach(b => b.addEventListener('click', () => showView(b.dataset.nav)));
    document.addEventListener('click', e => {
      const go = e.target.closest('[data-go]');
      if (go) { showView(go.dataset.go); return; }
      const act = e.target.closest('[data-act]');
      if (act) {
        const a = act.dataset.act;
        if (a === 'example') loadExample();
        if (a === 'copy-summary') Share.copy(summaryText()).then(ok => toast(ok ? 'Resumen copiado. Puedes pegarlo en Excel o Word.' : 'No se pudo copiar.'));
        if (a === 'csv-summary') Share.download('regrelab-resumen.csv', summaryCSV());
      }
      const png = e.target.closest('.png-btn');
      if (png) { const b = png.closest('.chartbox'); Charts.exportPNG(b, b.dataset.name); toast('Imagen PNG descargada.'); }
      const tog = e.target.closest('.rc-toggle');
      if (tog) { const id = tog.closest('.rc').id; cardState[id].open = !cardState[id].open; applyCard(id); Charts.resizeAll(); }
      const hb = e.target.closest('.help-btn');
      if (hb) { const box = hb.closest('.rc').querySelector('.help-box'); box.hidden = !box.hidden; hb.setAttribute('aria-expanded', String(!box.hidden)); }
      const st = e.target.closest('[data-step]');
      if (st) {
        const id = st.closest('.rc').id, c = cardState[id];
        const total = $$('.step', document.getElementById(id)).length;
        const k = st.dataset.step;
        if (k === 'next') c.shown = Math.min(total, c.shown + 1);
        if (k === 'all') c.shown = total;
        if (k === 'reset') c.shown = 1;
        applyCard(id);
        Charts.resizeAll();
        if (k === 'next') { const s = $$('.step', document.getElementById(id))[c.shown - 1]; if (s) s.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
      }
      const jp = e.target.closest('[data-jump]');
      if (jp) {
        e.preventDefault();
        const id = jp.dataset.jump;
        cardState[id].open = true; applyCard(id);
        document.getElementById(id).scrollIntoView({ behavior: 'smooth', block: 'start' });
        Charts.resizeAll();
      }
      const md_ = e.target.closest('[data-mode]');
      if (md_) setGlobalMode(md_.dataset.mode);
      const lt = e.target.closest('[data-ltab]');
      if (lt) setLearnTab(lt.dataset.ltab);
    });

    Charts.hooks.pick = openPickInfo;

    // tabla de datos
    const body = $('#dataBody');
    body.addEventListener('input', e => {
      const t = e.target;
      if (!t.classList.contains('cell')) return;
      S.rows[+t.dataset.r][+t.dataset.c] = t.value;
      refreshMarks();
      scheduleCompute();
    });
    body.addEventListener('focusout', () => setTimeout(refreshMarks, 0));
    document.addEventListener('focusin', e => {
      if (e.target.classList && e.target.classList.contains('cell')) setTimeout(() => { try { e.target.select(); } catch (err) { /* sin selección */ } }, 0);
    });
    body.addEventListener('paste', e => {
      const t = e.target;
      if (!t.classList.contains('cell')) return;
      const text = (e.clipboardData || window.clipboardData).getData('text');
      if (!/[\n\t]/.test(text.trim())) return;
      e.preventDefault();
      const parsed = Share.parseTable(text);
      if (!parsed.rows.length) return;
      if (parsed.xName !== undefined) loadTable(parsed, false);
      else fillFrom(+t.dataset.r, parsed.rows);
    });
    body.addEventListener('keydown', e => {
      if (e.key !== 'Enter' || !e.target.classList.contains('cell')) return;
      e.preventDefault();
      moveFocus(e.target, e.shiftKey ? -1 : 1);
    });
    body.addEventListener('click', e => {
      const d = e.target.closest('[data-del]');
      if (!d) return;
      S.rows.splice(+d.dataset.del, 1);
      if (!S.rows.length) S.rows.push(['', '']);
      renderRows();
      scheduleCompute();
    });
    $('#addRow').addEventListener('click', () => addRow(true));
    $('#btn-example').addEventListener('click', loadExample);
    $('#btn-more-examples').addEventListener('click', () => { renderExamples(); $('#dlg-examples').showModal(); });
    $('#examples-list').addEventListener('click', e => { const b = e.target.closest('[data-ex]'); if (b) loadExampleById(+b.dataset.ex); });
    $('#btn-open-all').addEventListener('click', () => setAllOpen(true));
    $('#btn-close-all').addEventListener('click', () => setAllOpen(false));
    $('#btn-clear').addEventListener('click', clearAll);
    $('#calc').addEventListener('click', goCalc);
    $('#ab-calc').addEventListener('click', goCalc);
    initKeyboardBar();
    $('#btn-csv-out').addEventListener('click', () => { readParams(); Share.download('regrelab-datos.csv', Share.toCSV(S)); toast('Datos exportados a CSV.'); });
    $('#btn-csv-in').addEventListener('click', () => $('#csv-file').click());
    $('#csv-file').addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      const rd = new FileReader();
      rd.onload = () => loadTable(Share.parseTable(String(rd.result).replace(/^﻿/, '')), true);
      rd.readAsText(file);
      e.target.value = '';
    });
    $('#btn-paste').addEventListener('click', async () => {
      let text = '';
      try { text = await navigator.clipboard.readText(); } catch (err) { text = ''; }
      const parsed = Share.parseTable(text);
      if (parsed.rows.some(r => !isNaN(numOrNaN(r[0])) && !isNaN(numOrNaN(r[1])))) { loadTable(parsed, true); return; }
      $('#paste-text').value = ''; $('#dlg-paste').showModal(); $('#paste-text').focus();
    });
    $('#paste-ok').addEventListener('click', () => {
      const parsed = Share.parseTable($('#paste-text').value);
      $('#dlg-paste').close();
      loadTable(parsed, true);
    });
    $$('[data-close]').forEach(b => b.addEventListener('click', () => b.closest('dialog').close()));

    // parámetros
    ['xName', 'xUnit', 'yName', 'yUnit', 'xPred', 'dec'].forEach(id => $('#' + id).addEventListener('input', () => { updateHeaders(); scheduleCompute(); }));
    $('#alpha').addEventListener('input', () => {
      const al = numOrNaN($('#alpha').value);
      if (al > 0 && al < 1) $('#conf').value = fmtIn(+((1 - al) * 100).toPrecision(8));
      syncChips(); scheduleCompute();
    });
    $('#conf').addEventListener('input', () => { syncChips(); scheduleCompute(); });
    $('#alpha-chips').addEventListener('click', e => {
      const b = e.target.closest('.chip-btn'); if (!b) return;
      $('#alpha').value = fmtIn(b.dataset.v); $('#conf').value = fmtIn(+((1 - Number(b.dataset.v)) * 100).toPrecision(8));
      syncChips(); scheduleCompute();
    });
    $('#conf-chips').addEventListener('click', e => {
      const b = e.target.closest('.chip-btn'); if (!b) return;
      $('#conf').value = fmtIn(b.dataset.v); syncChips(); scheduleCompute();
    });
    $$('input[name="tail"]').forEach(r => r.addEventListener('change', scheduleCompute));
    $('#ts').addEventListener('change', scheduleCompute);

    // barra superior
    $('#btn-share').addEventListener('click', openShare);
    $('#btn-print').addEventListener('click', printReport);
    $('#btn-help').addEventListener('click', () => $('#dlg-welcome').showModal());
    $('#share-copy').addEventListener('click', () => Share.copy($('#share-link').value).then(ok => toast(ok ? 'Enlace copiado.' : 'No se pudo copiar; selecciónalo manualmente.')));
    $('#share-native').addEventListener('click', async () => {
      const ok = await Share.nativeShare(S, 'RegreLab: regresión lineal simple', 'Mira esta resolución de regresión y correlación en RegreLab.');
      if (ok) $('#dlg-share').close();
    });
    $('#share-pdf').addEventListener('click', () => { $('#dlg-share').close(); printReport(); });
    $('#share-csv').addEventListener('click', () => { Share.download('regrelab-datos.csv', Share.toCSV(S)); });

    // bienvenida
    $('#welcome-start').addEventListener('click', () => { if ($('#welcome-never').checked) safeSet('regrelab.welcome', '1'); $('#dlg-welcome').close(); });
    $('#welcome-example').addEventListener('click', () => { if ($('#welcome-never').checked) safeSet('regrelab.welcome', '1'); $('#dlg-welcome').close(); loadExample(); });

    window.addEventListener('resize', () => Charts.resizeAll());
    window.addEventListener('beforeprint', () => Charts.resizeAll());
  }

  function init() {
    Icons.hydrate();
    Practice.init({ toast, copy: Share.copy, tips: applyTips, resolve: resolveExercise });
    initTheme();
    initTips();
    $('#welcome-steps').innerHTML = Content.welcome.map((w, i) =>
      '<li><span class="w-ic" aria-hidden="true">' + (i + 1) + '</span><div><strong>' + esc(w[1]) + '</strong><p>' + esc(w[2]) + '</p></div></li>').join('');
    bindEvents();

    const pm = /(?:^|[#&])p=(\d+)\.([123])/.exec(location.hash);
    const shared = Share.decode(location.hash);
    let fromLink = false;
    if (shared) { S = Object.assign(blankState(), shared); fromLink = true; }
    else {
      const saved = safeGet(STORE);
      if (saved) { try { S = Object.assign(blankState(), JSON.parse(saved)); } catch (e) { S = blankState(); } }
    }
    if (!Array.isArray(S.rows) || !S.rows.length) S.rows = blankState().rows;
    if (!(S.alpha > 0 && S.alpha < 1)) S.alpha = 0.05;
    if (!(S.conf > 0 && S.conf < 1)) S.conf = 1 - S.alpha;
    if (!(S.dec >= 1 && S.dec <= 8)) S.dec = 4;
    S.xPred = S.xPred === null || S.xPred === undefined ? '' : String(S.xPred);
    writeForm();
    recompute();
    setLearnTab('gloss');
    if (pm) {
      showView('practice');
      Practice.open(+pm[1], +pm[2]);
      toast('Se abrió un ejercicio compartido.');
    } else if (fromLink && M) {
      showView('results');
      toast('Se abrió un ejercicio compartido.');
    } else {
      showView('data');
      if (!safeGet('regrelab.welcome') && !fromLink) $('#dlg-welcome').showModal();
    }
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
      navigator.serviceWorker.register('sw.js').catch(() => { /* sin soporte sin conexión */ });
    }
  }

  function load(state) {
    S = Object.assign(blankState(), state);
    writeForm();
    recompute();
  }

  return { init, get M() { return M; }, get S() { return S; }, get V() { return V; }, showView, loadExample, load };
})();

document.addEventListener('DOMContentLoaded', App.init);
