const Board = (function () {
  'use strict';

  const { esc, md, n } = Fmt;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  const PREFS = 'regrelab.board.prefs';
  const prefs = { theme: 'chalk', scale: 1 };

  let api = { data() { return {}; }, mount() {}, toast() {} };
  let slides = [];
  let idx = 0;
  let frags = [];
  let shown = 0;
  let opener = null;
  let idleTimer = null;
  let live = false;

  try { Object.assign(prefs, JSON.parse(localStorage.getItem(PREFS) || '{}')); } catch (e) { /* preferencias por defecto */ }
  const savePrefs = () => { try { localStorage.setItem(PREFS, JSON.stringify(prefs)); } catch (e) { /* sin almacenamiento */ } };

  function applyPrefs() {
    const b = $('#board');
    b.classList.toggle('chalk', prefs.theme === 'chalk');
    b.classList.toggle('paper', prefs.theme !== 'chalk');
    b.style.setProperty('--bs', prefs.scale);
  }

  // ---------- diapositivas ----------
  function introSlide(M, S, L) {
    const rows = M.x.map((v, i) => '<td>' + n(v) + '</td>').join('');
    const rowsY = M.y.map(v => '<td>' + n(v) + '</td>').join('');
    return '<div class="b-title"><p class="b-kick">Regresión lineal simple y correlación</p><h2>' + esc(L.yn) + ' <em>según</em> ' + esc(L.xn) + '</h2>' +
      '<div class="b-data tbl-wrap"><table class="tbl"><tbody><tr><th>' + esc(L.x) + '</th>' + rows + '</tr><tr><th>' + esc(L.y) + '</th>' + rowsY + '</tr></tbody></table></div>' +
      '<p class="b-facts"><span>n = <strong>' + M.n + '</strong></span><span>α = <strong>' + n(S.alpha) + '</strong></span><span>Confianza = <strong>' + Fmt.pct(S.conf, 1) + '</strong></span></p>' +
      '<p class="b-hint">Avanza con <kbd>→</kbd> o la barra espaciadora. <kbd>Esc</kbd> para salir.</p>' +
      '<p class="b-author">' + esc(Content.author) + '</p></div>';
  }

  function build() {
    const { M, S, L } = api.data();
    const cards = Steps.build(M, S, L);
    const out = [{ sec: 0, secTitle: 'Inicio', title: 'Inicio', kind: 'intro', html: introSlide(M, S, L) }];
    const tpl = document.createElement('template');
    cards.forEach((c, ci) => {
      out.push({
        sec: ci + 1, secTitle: c.num + ' · ' + c.title, title: c.title, kind: 'title',
        html: '<div class="b-title"><span class="b-num">' + esc(c.num) + '</span><h2>' + esc(c.title) + '</h2><div class="b-help">' + md(c.help) + '</div></div>'
      });
      c.steps.forEach((s, si) => {
        tpl.innerHTML = s;
        const st = tpl.content.querySelector('.step');
        const h = st.querySelector('h4');
        const title = h.innerHTML;
        h.remove();
        out.push({
          sec: ci + 1, secTitle: c.num + ' · ' + c.title, title: h.textContent || c.title, kind: 'step', num: c.num, i: si + 1, of: c.steps.length,
          html: '<p class="b-kick"><span class="b-num">' + esc(c.num) + '</span> ' + esc(c.title) + ' · paso ' + (si + 1) + ' de ' + c.steps.length + '</p><h3 class="b-step">' + title + '</h3><div class="b-body">' + st.innerHTML + '</div>'
        });
      });
    });
    return out;
  }

  function clearCharts(root) {
    $$('canvas', root).forEach(c => { if (c._chart) { c._chart.destroy(); c._chart = null; } });
  }

  function show(i, fromBack) {
    idx = Math.max(0, Math.min(slides.length - 1, i));
    const s = slides[idx];
    const el = $('#b-slide');
    clearCharts(el);
    el.innerHTML = s.html;
    el.className = 'b-slide k-' + s.kind;
    el.scrollTop = 0;
    // El revelado progresivo solo se usa en las diapositivas con fórmulas
    frags = $('.fx', el) ? $$('.fx .fx-row:not(:first-child), .interp, .decision, .cheer', el) : [];
    frags.forEach(f => f.classList.add('frag'));
    shown = fromBack ? frags.length : 0;
    frags.forEach((f, k) => f.classList.toggle('hide', k >= shown));
    api.mount(el);
    requestAnimationFrame(() => Charts.resizeAll());
    updateChrome();
  }

  function updateChrome() {
    const s = slides[idx];
    $('#b-sec').textContent = s.secTitle;
    $('#b-pos').textContent = 'Diapositiva ' + (idx + 1) + ' de ' + slides.length;
    $('#b-bar').style.width = ((idx + 1) / slides.length * 100) + '%';
    $('#b-live').textContent = 'Diapositiva ' + (idx + 1) + ' de ' + slides.length + ': ' + s.secTitle;
    $('#b-prev').disabled = idx === 0 && shown === 0;
    $('#b-next').disabled = idx === slides.length - 1 && shown >= frags.length;
    $$('#b-index [data-slide]').forEach(b => b.setAttribute('aria-current', String(+b.dataset.sec === s.sec)));
  }

  function next() {
    if (shown < frags.length) {
      frags[shown].classList.remove('hide');
      shown++;
      updateChrome();
      return;
    }
    if (idx < slides.length - 1) show(idx + 1, false);
  }

  function prev() {
    if (shown > 0 && frags.length) {
      shown--;
      frags[shown].classList.add('hide');
      updateChrome();
      return;
    }
    if (idx > 0) show(idx - 1, true);
  }

  function revealAll() {
    frags.forEach(f => f.classList.remove('hide'));
    shown = frags.length;
    updateChrome();
  }

  // ---------- índice ----------
  function buildIndex() {
    const seen = {};
    $('#b-index-list').innerHTML = slides.filter(s => { if (seen[s.sec]) return false; seen[s.sec] = true; return true; }).map(s => {
      const first = slides.indexOf(s);
      return '<li><button type="button" data-slide="' + first + '" data-sec="' + s.sec + '" aria-current="false">' + esc(s.secTitle) + '</button></li>';
    }).join('');
  }

  function toggleIndex(force) {
    const box = $('#b-index');
    box.hidden = force === undefined ? !box.hidden : !force;
    $('#b-tool-index').setAttribute('aria-expanded', String(!box.hidden));
    if (!box.hidden) { const cur = $('#b-index [aria-current="true"]'); if (cur) cur.focus(); }
  }

  // ---------- pantalla completa, tema y tamaño ----------
  function toggleFull() {
    const b = $('#board');
    if (document.fullscreenElement) { document.exitFullscreen(); return; }
    if (b.requestFullscreen) b.requestFullscreen().catch(() => api.toast('Este navegador no permite la pantalla completa aquí.'));
  }

  function setScale(delta) {
    prefs.scale = Math.max(0.75, Math.min(1.8, Math.round((prefs.scale + delta) * 100) / 100));
    applyPrefs(); savePrefs();
    requestAnimationFrame(() => Charts.resizeAll());
  }

  function toggleTheme() {
    prefs.theme = prefs.theme === 'chalk' ? 'paper' : 'chalk';
    applyPrefs(); savePrefs();
  }

  // Los controles se atenúan cuando no se usa el mouse ni el teclado
  function wake() {
    const b = $('#board');
    b.classList.remove('idle');
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { if ($('#b-index').hidden) b.classList.add('idle'); }, 4000);
  }

  function onKey(e) {
    if (!live) return;
    wake();
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const t = e.target;
    const interactive = t.closest && t.closest('button, input, select, textarea, summary, a');
    switch (e.key) {
      case 'ArrowRight': case 'PageDown': next(); break;
      case 'ArrowLeft': case 'PageUp': prev(); break;
      case ' ': case 'Enter': if (interactive) return; next(); break;
      case 'Backspace': if (interactive) return; prev(); break;
      case 'Home': show(0, false); break;
      case 'End': show(slides.length - 1, true); break;
      case 'Escape': if ($('#b-index').hidden) { if (!document.fullscreenElement) close(); } else toggleIndex(false); return;
      case 'f': case 'F': toggleFull(); break;
      case 't': case 'T': toggleTheme(); break;
      case 'i': case 'I': case 'g': case 'G': toggleIndex(); break;
      case 'a': case 'A': revealAll(); break;
      case '+': case '=': setScale(0.1); break;
      case '-': case '_': setScale(-0.1); break;
      default: return;
    }
    e.preventDefault();
  }

  // ---------- abrir y cerrar ----------
  function open(startSection) {
    const d = api.data();
    if (!d.M) { api.toast('Primero carga datos válidos para usar el pizarrón.'); return; }
    opener = document.activeElement;
    slides = build();
    buildIndex();
    applyPrefs();
    const b = $('#board');
    b.hidden = false;
    document.body.classList.add('board-open');
    live = true;
    toggleIndex(false);
    let start = 0;
    if (startSection) { const f = slides.findIndex(s => s.sec === startSection); if (f >= 0) start = f; }
    show(start, false);
    b.focus();
    wake();
  }

  function close() {
    if (!live) return;
    live = false;
    clearTimeout(idleTimer);
    const el = $('#b-slide');
    clearCharts(el);
    el.innerHTML = '';
    $('#board').hidden = true;
    document.body.classList.remove('board-open');
    if (document.fullscreenElement) document.exitFullscreen();
    if (opener && opener.focus) opener.focus();
  }

  function init(callbacks) {
    api = Object.assign(api, callbacks);
    const b = $('#board');
    if (!document.fullscreenEnabled) $('#b-tool-full').hidden = true;
    b.addEventListener('click', e => {
      const t = e.target.closest('[data-b]');
      if (t) {
        const a = t.dataset.b;
        if (a === 'next') next();
        if (a === 'prev') prev();
        if (a === 'close') close();
        if (a === 'index') toggleIndex();
        if (a === 'full') toggleFull();
        if (a === 'theme') toggleTheme();
        if (a === 'bigger') setScale(0.1);
        if (a === 'smaller') setScale(-0.1);
        return;
      }
      const s = e.target.closest('[data-slide]');
      if (s) { show(+s.dataset.slide, false); toggleIndex(false); }
    });
    ['pointermove', 'pointerdown', 'touchstart'].forEach(ev => b.addEventListener(ev, wake, { passive: true }));
    document.addEventListener('keydown', onKey);
    // Deslizar con el dedo para cambiar de diapositiva
    let sx = 0, sy = 0, tracking = false;
    const stage = $('#b-stage');
    stage.addEventListener('pointerdown', e => { if (e.pointerType === 'touch') { sx = e.clientX; sy = e.clientY; tracking = true; } });
    stage.addEventListener('pointerup', e => {
      if (!tracking) return;
      tracking = false;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.abs(dx) > 80 && Math.abs(dy) < 60) { if (dx < 0) next(); else prev(); }
    });
    stage.addEventListener('pointercancel', () => { tracking = false; });
    document.addEventListener('fullscreenchange', () => { requestAnimationFrame(() => Charts.resizeAll()); });
    window.addEventListener('resize', () => { if (live) Charts.resizeAll(); });
  }

  return { init, open, close, get isOpen() { return live; } };
})();
