const Practice = (function () {
  'use strict';

  const R = String.raw;
  const { n, tex, K, esc, parse } = Fmt;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  const KEY_CUR = 'regrelab.practice.cur';
  const KEY_STATS = 'regrelab.practice.stats';

  let api = { toast() {}, resolve() {}, copy() {}, data() { return {}; } };
  let P = null;
  let ready = false;
  let creator = null;

  const safeGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const safeSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* sin almacenamiento */ } };

  const newSeed = () => 10000 + Math.floor(Math.random() * 89999);
  const up = u => (u ? ' (' + esc(u) + ')' : '');
  const num = v => tex(v, 4);

  // Nombre y símbolo de cada dato pedido o entregado
  const LABEL = {
    n: [R`n`, 'Cantidad de datos'], sx: [R`\sum X`, 'Suma de X'], sy: [R`\sum Y`, 'Suma de Y'], sxy: [R`\sum XY`, 'Suma de los productos X·Y'],
    sxx: [R`\sum X^2`, 'Suma de los cuadrados de X'], syy: [R`\sum Y^2`, 'Suma de los cuadrados de Y'], xbar: [R`\bar{X}`, 'Media de X'], ybar: [R`\bar{Y}`, 'Media de Y'],
    ssx: [R`SSX`, 'Suma de cuadrados de X'], ssxy: [R`SSXY`, 'Suma de productos cruzados'], sst: [R`SST`, 'Variación total'], ssr: [R`SSR`, 'Variación explicada'],
    sse: [R`SSE`, 'Variación no explicada'], b1: [R`b_1`, 'Pendiente'], b0: [R`b_0`, 'Ordenada al origen'], r2: [R`r^2`, 'Coeficiente de determinación'],
    r: [R`r`, 'Coeficiente de correlación'], syx: [R`S_{YX}`, 'Error estándar de la estimación'], ypred: [R`\hat{Y}`, 'Predicción'],
    sb1: [R`S_{b_1}`, 'Error estándar de la pendiente'], t: [R`t`, 'Estadístico t de la pendiente'], tcrit: [R`t_{crit}`, 'Valor crítico t'],
    dec: [R`\text{Decisión}`, 'Decisión'], cilo: [R`\beta_1\ \text{mín.}`, 'Límite inferior del IC de β₁'],
    cihi: [R`\beta_1\ \text{máx.}`, 'Límite superior del IC de β₁'], f: [R`F`, 'Estadístico F']
  };

  // Nombre completo de una pregunta según el ejercicio (α, confianza y X de predicción varían)
  function nameOf(kind, ex) {
    if (kind === 'ypred') return 'Predicción de ' + ex.yName + ' para ' + ex.xName + ' = ' + n(ex.xp);
    if (kind === 'tcrit') return 'Valor crítico t (α = ' + n(ex.alpha) + ', dos colas)';
    if (kind === 'dec') return 'Decisión con α = ' + n(ex.alpha);
    if (kind === 'cilo') return 'Límite inferior del IC de β₁ al ' + Fmt.pct(ex.conf, 0);
    if (kind === 'cihi') return 'Límite superior del IC de β₁ al ' + Fmt.pct(ex.conf, 0);
    return LABEL[kind][1];
  }

  const HINT = {
    sx: 'Suma todos los valores de X.', sy: 'Suma todos los valores de Y.', sxy: 'Multiplica cada X por su Y y suma los productos.',
    sxx: 'Eleva cada X al cuadrado y suma.', ssx: 'SSX = ΣX² − (ΣX)²/n.', ssxy: 'SSXY = ΣXY − (ΣX)(ΣY)/n.', b1: 'b₁ = SSXY / SSX.',
    b0: 'b₀ = Ȳ − b₁·X̄ (las medias son ΣX/n y ΣY/n).', sst: 'SST = ΣY² − (ΣY)²/n.', ssr: 'SSR = b₀ΣY + b₁ΣXY − (ΣY)²/n.',
    sse: 'SSE = SST − SSR (o ΣY² − b₀ΣY − b₁ΣXY).', r2: 'r² = SSR / SST.', r: 'r = ±√r²; el signo es el de b₁.', syx: 'S_YX = √(SSE / (n − 2)).',
    ypred: 'Ŷ = b₀ + b₁·X, con el X pedido.', sb1: 'S_b1 = S_YX / √SSX.', t: 't = b₁ / S_b1.',
    tcrit: ex => 'Busca t con gl = n − 2 y α/2 = ' + n(ex.alpha / 2) + ' en cada cola.',
    dec: 'Compara |t| con el valor crítico: si lo supera, se rechaza H₀.', cilo: 'b₁ − t crítico · S_b1.', cihi: 'b₁ + t crítico · S_b1.', f: 'F = MSR / MSE = SSR / (SSE/(n − 2)); recuerda que F = t².'
  };
  const hintOf = (kind, ex) => (typeof HINT[kind] === 'function' ? HINT[kind](ex) : HINT[kind]);

  function list(arr) { return arr.length <= 8 ? arr.map(num).join('+') : arr.slice(0, 4).map(num).join('+') + R`+\cdots+` + num(arr[arr.length - 1]); }

  // Solución paso a paso de cada pregunta (HTML)
  function solution(kind, ex) {
    const m = ex.m, N = ex.n, x = ex.x, y = ex.y;
    const d = t => K(t, true);
    const pairs = x.map((v, i) => num(v) + R`\cdot ` + num(y[i]));
    switch (kind) {
      case 'sx': return d(R`\sum X=${list(x)}=${num(m.sums.x)}`);
      case 'sy': return d(R`\sum Y=${list(y)}=${num(m.sums.y)}`);
      case 'sxy': return d(R`\sum XY=${pairs.length <= 8 ? pairs.join('+') : pairs.slice(0, 3).join('+') + R`+\cdots+` + pairs[pairs.length - 1]}=${num(m.sums.xy)}`);
      case 'sxx': return d(R`\sum X^2=${list(x.map(v => v * v))}=${num(m.sums.xx)}`);
      case 'ssx': return d(R`SSX=\sum X^2-\frac{(\sum X)^2}{n}=${num(m.sums.xx)}-\frac{${num(m.sums.x)}^2}{${N}}=${num(m.ssx)}`);
      case 'ssxy': return d(R`SSXY=\sum XY-\frac{\sum X\sum Y}{n}=${num(m.sums.xy)}-\frac{${num(m.sums.x)}\cdot ${num(m.sums.y)}}{${N}}=${num(m.ssxy)}`);
      case 'b1': return d(R`b_1=\frac{SSXY}{SSX}=\frac{${num(m.ssxy)}}{${num(m.ssx)}}=${num(m.b1)}`);
      case 'b0': return d(R`b_0=\bar{Y}-b_1\bar{X}=${num(m.ybar)}-\left(${num(m.b1)}\right)\cdot ${num(m.xbar)}=${num(m.b0)}`);
      case 'sst': return d(R`SST=\sum Y^2-\frac{(\sum Y)^2}{n}=${num(m.sums.yy)}-\frac{${num(m.sums.y)}^2}{${N}}=${num(m.sst)}`);
      case 'ssr': return d(R`SSR=b_0\sum Y+b_1\sum XY-\frac{(\sum Y)^2}{n}=${num(m.ssr)}`);
      case 'sse': return d(R`SSE=SST-SSR=${num(m.sst)}-${num(m.ssr)}=${num(m.sse)}`);
      case 'r2': return d(R`r^2=\frac{SSR}{SST}=\frac{${num(m.ssr)}}{${num(m.sst)}}=${num(m.r2)}`);
      case 'r': return d(R`r=${m.b1 < 0 ? '-' : '+'}\sqrt{r^2}=${m.b1 < 0 ? '-' : '+'}\sqrt{${num(m.r2)}}=${num(m.r)}`);
      case 'syx': return d(R`S_{YX}=\sqrt{\frac{SSE}{n-2}}=\sqrt{\frac{${num(m.sse)}}{${N}-2}}=${num(m.syx)}`);
      case 'ypred': return d(R`\hat{Y}=b_0+b_1X=${num(m.b0)}+\left(${num(m.b1)}\right)\cdot ${num(ex.xp)}=${num(m.pred.yhat)}`);
      case 'sb1': return d(R`S_{b_1}=\frac{S_{YX}}{\sqrt{SSX}}=\frac{${num(m.syx)}}{\sqrt{${num(m.ssx)}}}=${num(m.sb1)}`);
      case 't': return d(R`t=\frac{b_1}{S_{b_1}}=\frac{${num(m.b1)}}{${num(m.sb1)}}=${num(m.tSlope)}`);
      case 'tcrit': return d(R`t_{${num(ex.alpha / 2)};\,${N - 2}}=${num(m.tSlopeTest.c)}`);
      case 'dec': return '<p>' + K(R`|t|=${num(Math.abs(m.tSlope))}`) + (m.tSlopeTest.reject ? ' es mayor que ' : ' no supera a ') + K(num(m.tSlopeTest.c)) +
        ': <strong>' + (m.tSlopeTest.reject ? 'se rechaza H₀' : 'no se rechaza H₀') + '</strong>' + (m.tSlopeTest.reject ? ' (hay relación lineal significativa).' : ' (no hay evidencia suficiente de relación lineal).') + '</p>';
      case 'cilo': return d(R`b_1-t\cdot S_{b_1}=${num(m.b1)}-${num(m.tConfR)}\cdot ${num(m.sb1R)}=${num(m.ciSlope[0])}`);
      case 'cihi': return d(R`b_1+t\cdot S_{b_1}=${num(m.b1)}+${num(m.tConfR)}\cdot ${num(m.sb1R)}=${num(m.ciSlope[1])}`);
      case 'f': return d(R`F=\frac{SSR}{SSE/(n-2)}=\frac{${num(m.ssr)}}{${num(m.sse)}/${N - 2}}=${num(m.F)}`);
      default: return '';
    }
  }

  function correctText(q) {
    if (q.kind === 'dec') return q.correct === 'rej' ? 'Rechazar H₀' : 'No rechazar H₀';
    return n(q.correct, 4);
  }

  // ---------- estado ----------
  function saveCur() {
    if (!P) return;
    const base = { answers: P.answers, name: P.name || '' };
    safeSet(KEY_CUR, JSON.stringify(P.ex.custom ? Object.assign(base, { spec: P.ex.spec }) : Object.assign(base, { seed: P.ex.seed, level: P.ex.level })));
  }

  function stats() {
    try { return Object.assign({ exercises: 0, total: 0, correct: 0 }, JSON.parse(safeGet(KEY_STATS) || '{}')); } catch (e) { return { exercises: 0, total: 0, correct: 0 }; }
  }

  function begin(ex, answers, name) {
    P = { ex, answers: answers || {}, results: {}, checked: false, revealed: false, credited: 0, counted: false, name: name || '' };
    saveCur();
    render();
  }

  function start(seed, level, answers) { begin(Exercises.generate(seed, level), answers); }

  // Ejercicio asignado por un docente (spec ya normalizado)
  function startCustom(spec, answers, name) {
    const ex = Exercises.fromSpec(spec);
    if (ex.error) { api.toast(ex.error); return false; }
    begin(ex, answers, name);
    return true;
  }

  // Abre el ejercicio contenido en un enlace (#e=...)
  function openPacked(packed) {
    const spec = Exercises.specFromRaw(Share.unpack(packed));
    if (!spec) { api.toast('El enlace del ejercicio no es válido o está incompleto.'); return false; }
    return startCustom(spec);
  }

  // ---------- pantalla ----------
  function levelButtons() {
    return [1, 2, 3].map(l => {
      const L = Exercises.LEVELS[l];
      return '<button type="button" class="lvl" data-level="' + l + '" aria-pressed="' + (P.ex.level === l) + '"><span class="lvl-n">Nivel ' + l + '</span><span class="lvl-t">' + esc(L.name) + '</span><span class="lvl-d">' + esc(L.text) + '</span></button>';
    }).join('');
  }

  function givenBox(ex) {
    if (!ex.given.length) return '';
    return '<div class="p-given"><p class="p-lab">Datos ya calculados (úsalos tal como se muestran)</p><dl>' +
      ex.given.map(g => '<div><dt>' + K(LABEL[g[0]][0]) + '</dt><dd>' + (g[0] === 'n' ? g[1] : n(g[1], 4)) + '</dd></div>').join('') + '</dl></div>';
  }

  function dataTable(ex) {
    return '<div class="tbl-wrap"><table class="tbl p-data"><thead><tr><th>N.º</th><th>' + esc(ex.xName) + up(ex.xUnit) + '</th><th>' + esc(ex.yName) + up(ex.yUnit) + '</th></tr></thead><tbody>' +
      ex.x.map((v, i) => '<tr><td>' + (i + 1) + '</td><td>' + n(v) + '</td><td>' + n(ex.y[i]) + '</td></tr>').join('') + '</tbody></table></div>';
  }

  function questionRow(q, ex) {
    const L = LABEL[q.kind];
    const name = nameOf(q.kind, ex);
    const val = P.answers[q.key] === undefined ? '' : P.answers[q.key];
    let input;
    if (q.kind === 'dec') {
      input = '<div class="q-radios" role="radiogroup" aria-label="Decisión">' +
        ['rej', 'keep'].map(v => '<label><input type="radio" name="q-dec" value="' + v + '"' + (val === v ? ' checked' : '') + '> ' + (v === 'rej' ? 'Rechazar H₀' : 'No rechazar H₀') + '</label>').join('') + '</div>';
    } else {
      input = '<input id="q-' + q.key + '" class="cell ans" type="text" inputmode="decimal" enterkeyhint="next" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" data-q="' + q.key + '" value="' + esc(val) + '" aria-label="' + esc(name) + '" placeholder="?">';
    }
    return '<li class="q" data-k="' + q.key + '"><div class="q-l"><span class="q-sym">' + K(L[0]) + '</span><span class="q-name">' + esc(name) + '</span></div>' +
      '<div class="q-in">' + input + '<span class="q-st" aria-live="polite"></span></div><div class="q-fb" hidden></div></li>';
  }

  function headCard(ex) {
    const s = stats();
    const pct = s.total ? Math.round(100 * s.correct / s.total) : 0;
    if (ex.custom) {
      return '<div class="card p-head p-assigned"><p class="kicker-line">Ejercicio asignado</p><h3>' + esc(ex.title) + '</h3>' +
        '<p>Tu docente preparó este ejercicio. Calcula a mano, escribe tus resultados y pulsa «Comprobar».</p>' +
        '<label class="field p-name">Tu nombre (opcional, para el resultado que entregues)<input id="p-name" type="text" autocomplete="name" value="' + esc(P.name) + '" placeholder="Nombre y apellido"></label>' +
        '<div class="btn-row"><button type="button" class="btn ghost" data-p="leave">' + Icons.svg('reset') + 'Practicar con ejercicios al azar</button></div></div>';
    }
    return '<div class="card p-head"><p class="lead">Resuelve a mano, con calculadora, y comprueba tus resultados. Si te equivocas, la app te da una pista y, cuando quieras, te muestra la solución paso a paso.</p>' +
      '<div class="p-levels" role="group" aria-label="Nivel del ejercicio">' + levelButtons() + '</div>' +
      '<div class="btn-row"><button type="button" class="btn primary" data-p="new">' + Icons.svg('reset') + 'Ejercicio nuevo</button>' +
      '<button type="button" class="btn" data-p="share">' + Icons.svg('share') + 'Compartir este ejercicio</button>' +
      '<button type="button" class="btn" data-p="qr">' + Icons.svg('qr') + 'Mostrar QR</button>' +
      '<button type="button" class="btn" data-p="create">' + Icons.svg('paste') + 'Crear ejercicio con mis datos</button></div>' +
      '<p class="small p-stats">' + (s.exercises ? 'Llevas <strong>' + s.exercises + '</strong> ejercicio' + (s.exercises === 1 ? '' : 's') + ' con <strong>' + pct + ' %</strong> de aciertos.' : 'Todavía no resolviste ningún ejercicio. ¡Anímate con el primero!') + '</p></div>';
  }

  function render() {
    const root = $('#practice');
    if (!root || !P) return;
    const ex = P.ex;
    const custom = !!ex.custom;
    const canSolve = !custom || ex.spec.sol;
    const kick = custom ? 'Ejercicio asignado · Nivel ' + ex.level + ' · ' + esc(Exercises.LEVELS[ex.level].name) : 'Ejercicio n.º ' + ex.seed + ' · Nivel ' + ex.level + ' · ' + esc(Exercises.LEVELS[ex.level].name);
    const intro = custom && ex.intro ? '<p class="p-intro">' + esc(ex.intro).replace(/\n/g, '<br>') + '</p><p class="small">Usa <strong>α = ' + n(ex.alpha) + '</strong>' + (ex.level === 3 ? ' y una prueba de dos colas.' : '.') + '</p>'
      : '<p class="p-intro">' + esc(custom ? 'Con los datos de la tabla, calcula lo que se pide.' : ex.intro) + ' Usa <strong>α = ' + n(ex.alpha) + '</strong>' + (ex.level === 3 ? ' y una prueba de dos colas.' : '.') + '</p>';
    root.innerHTML = headCard(ex) +
      '<article class="card p-ex"><p class="kicker-line">' + kick + '</p>' + intro + dataTable(ex) + givenBox(ex) +
      '<h3 class="p-h">Calcula</h3><ol class="p-qs" data-cells>' + ex.questions.map(q => questionRow(q, ex)).join('') + '</ol>' +
      '<div class="btn-row"><button type="button" class="btn primary" data-p="check">' + Icons.svg('check') + 'Comprobar</button>' +
      (canSolve ? '<button type="button" class="btn" data-p="reveal">Ver respuestas</button>' : '') +
      '<button type="button" class="btn ghost" data-p="clear">' + Icons.svg('trash') + 'Borrar respuestas</button></div>' +
      '<div class="p-score" id="p-score" hidden></div>' +
      '<div class="btn-row">' + (custom ? '<button type="button" class="btn" data-p="deliver">' + Icons.svg('copy') + 'Copiar mi resultado para entregar</button>' +
        (navigator.share ? '<button type="button" class="btn" data-p="deliver-share">' + Icons.svg('share') + 'Enviar mi resultado</button>' : '') : '') +
      (canSolve ? '<button type="button" class="btn" data-p="resolve">' + Icons.svg('results') + 'Ver la resolución completa en la app</button>' : '') + '</div></article>';
    paint();
    if (api.tips) api.tips(root);
  }

  // Pinta estados, pistas y soluciones según lo comprobado
  function paint() {
    const ex = P.ex;
    ex.questions.forEach(q => {
      const li = $('.q[data-k="' + q.key + '"]');
      if (!li) return;
      const st = P.results[q.key];
      li.classList.toggle('ok', st === 'ok');
      li.classList.toggle('bad', st === 'bad');
      const stEl = $('.q-st', li), fb = $('.q-fb', li);
      stEl.innerHTML = st === 'ok' ? Icons.svg('check') + '<span>Correcto</span>' : st === 'bad' ? Icons.svg('x') + '<span>Revisa</span>' : st === 'empty' ? '<span class="muted">Sin responder</span>' : '';
      let html = '';
      if (st === 'bad' && !P.revealed) html += '<p><strong>Pista.</strong> ' + esc(hintOf(q.kind, ex)) + '</p>';
      if (P.revealed) html += '<p>Respuesta: <strong>' + esc(correctText(q)) + '</strong></p>' + solution(q.kind, ex);
      fb.innerHTML = html;
      fb.hidden = !html;
    });
    const box = $('#p-score');
    if (P.checked || P.revealed) {
      const total = ex.questions.length;
      const ok = ex.questions.filter(q => P.results[q.key] === 'ok').length;
      const empty = ex.questions.filter(q => P.results[q.key] === 'empty').length;
      let msg;
      if (ok === total) msg = '¡Excelente! Todo correcto.' + (ex.custom ? ' Puedes copiar tu resultado para entregarlo.' : ' Puedes probar un ejercicio nuevo o subir de nivel.');
      else if (ok / total >= 0.6) msg = 'Muy bien, vas por buen camino. Revisa las pistas y vuelve a comprobar.';
      else if (empty === total) msg = 'Escribe tus resultados y pulsa «Comprobar».';
      else msg = 'Sigue intentando: repasa las pistas' + (!ex.custom || ex.spec.sol ? ' o mira la solución paso a paso.' : '.');
      box.innerHTML = '<div class="p-score-n"><strong>' + ok + '</strong><span> de ' + total + '</span></div><p>' + msg + '</p>';
      box.hidden = false;
      box.classList.toggle('perfect', ok === total);
    } else box.hidden = true;
    if (P.revealed && api.tips) api.tips($('#practice'));
  }

  function readAnswers() {
    $$('#practice .ans').forEach(inp => { P.answers[inp.dataset.q] = inp.value; });
    const dec = $('#practice input[name="q-dec"]:checked');
    if (dec) P.answers.dec = dec.value;
    const nm = $('#p-name');
    if (nm) P.name = nm.value.trim();
  }

  function check() {
    readAnswers();
    const ex = P.ex;
    P.results = {};
    ex.questions.forEach(q => {
      const raw = P.answers[q.key];
      const v = q.kind === 'dec' ? raw : (raw === undefined || String(raw).trim() === '' ? '' : parse(raw));
      P.results[q.key] = Exercises.grade(q, v);
    });
    P.checked = true;
    const okN = ex.questions.filter(q => P.results[q.key] === 'ok').length;
    const answered = ex.questions.filter(q => P.results[q.key] !== 'empty').length;
    if (answered) {
      const s = stats();
      if (!P.counted) { s.exercises += 1; s.total += ex.questions.length; P.counted = true; }
      if (okN > P.credited) { s.correct += okN - P.credited; P.credited = okN; }
      safeSet(KEY_STATS, JSON.stringify(s));
      const line = $('.p-stats');
      if (line) line.innerHTML = 'Llevas <strong>' + s.exercises + '</strong> ejercicio' + (s.exercises === 1 ? '' : 's') + ' con <strong>' + Math.round(100 * s.correct / s.total) + ' %</strong> de aciertos.';
    }
    saveCur();
    paint();
    const box = $('#p-score');
    if (box && !box.hidden) box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // Texto con el resultado del estudiante, listo para pegar en un mensaje o correo
  function resultText() {
    readAnswers();
    if (!P.checked) check();
    const ex = P.ex;
    const ok = ex.questions.filter(q => P.results[q.key] === 'ok').length;
    const d = new Date();
    const lines = ['RegreLab — Resultado de un ejercicio asignado', 'Ejercicio: ' + ex.title, 'Estudiante: ' + (P.name || '(sin nombre)'),
      'Fecha: ' + d.toLocaleDateString('es-AR'), 'Aciertos: ' + ok + ' de ' + ex.questions.length, ''];
    ex.questions.forEach(q => {
      const raw = P.answers[q.key];
      const shown = q.kind === 'dec' ? (raw === 'rej' ? 'Rechazar H₀' : raw === 'keep' ? 'No rechazar H₀' : '—') : (raw === undefined || String(raw).trim() === '' ? '—' : String(raw).trim());
      lines.push('• ' + nameOf(q.kind, ex) + ': ' + shown + ' ' + (P.results[q.key] === 'ok' ? '(correcto)' : P.results[q.key] === 'bad' ? '(incorrecto)' : '(sin responder)'));
    });
    lines.push('', 'Ejercicio: ' + location.href);
    return lines.join('\n');
  }

  function onClick(e) {
    const lvl = e.target.closest('[data-level]');
    if (lvl) { start(newSeed(), +lvl.dataset.level); return; }
    const b = e.target.closest('[data-p]');
    if (!b) return;
    const a = b.dataset.p;
    if (a === 'new') start(newSeed(), P.ex.level);
    if (a === 'leave') { history.replaceState(null, '', location.pathname + location.search); start(newSeed(), 1); }
    if (a === 'check') check();
    if (a === 'reveal') { readAnswers(); check(); P.revealed = true; paint(); }
    if (a === 'clear') { P.answers = {}; P.results = {}; P.checked = false; P.revealed = false; saveCur(); render(); }
    if (a === 'resolve') api.resolve(P.ex);
    if (a === 'create') openCreator();
    if (a === 'deliver') api.copy(resultText()).then(ok => { paint(); api.toast(ok ? 'Resultado copiado: pégalo en un mensaje o correo para entregarlo.' : 'No se pudo copiar el resultado.'); });
    if (a === 'deliver-share') {
      const text = resultText();
      paint();
      navigator.share({ title: 'Resultado: ' + P.ex.title, text }).catch(() => { /* cancelado */ });
    }
    if (a === 'qr' && api.qr) api.qr({ title: 'Ejercicio n.º ' + P.ex.seed, link: location.href.split('#')[0] + '#p=' + P.ex.seed + '.' + P.ex.level, note: 'Escanéalo para abrir este mismo ejercicio en el celular.' });
    if (a === 'share') {
      const link = location.href.split('#')[0] + '#p=' + P.ex.seed + '.' + P.ex.level;
      api.copy(link).then(ok => api.toast(ok ? 'Enlace copiado: quien lo abra verá este mismo ejercicio.' : 'No se pudo copiar el enlace.'));
    }
  }

  function onInput(e) {
    if (e.target.classList.contains('ans')) { P.answers[e.target.dataset.q] = e.target.value; saveCur(); }
    if (e.target.name === 'q-dec') { P.answers.dec = e.target.value; saveCur(); }
    if (e.target.id === 'p-name') { P.name = e.target.value.trim(); saveCur(); }
  }

  function onKey(e) {
    if (e.key !== 'Enter' || !e.target.classList.contains('ans')) return;
    e.preventDefault();
    const cells = $$('#practice .ans');
    const i = cells.indexOf(e.target) + 1;
    if (i < cells.length) cells[i].focus(); else { e.target.blur(); const c = $('#practice [data-p="check"]'); if (c) c.focus(); }
  }

  // ---------- creador de ejercicios (docente) ----------
  function creatorRaw() {
    const c = creator;
    const q = Exercises.KINDS[c.level].filter(k => c.only[k]);
    const raw = { t: c.title.trim(), s: c.statement.trim(), xn: c.d.L.xn, xu: c.d.L.ux || '', yn: c.d.L.yn, yu: c.d.L.uy || '', r: c.d.M.x.map((v, i) => [v, c.d.M.y[i]]),
      l: c.level, a: c.d.S.alpha, sol: c.sol ? 1 : 0 };
    if (c.level === 2 && String(c.xp).trim() !== '') raw.p = String(c.xp).trim();
    if (q.length && q.length < Exercises.KINDS[c.level].length) raw.q = q;
    return raw;
  }

  function creatorLink() {
    return location.href.split('#')[0] + '#e=' + Share.pack(creatorRaw());
  }

  function renderCreatorQuestions() {
    const c = creator;
    $('#as-questions').innerHTML = Exercises.KINDS[c.level].map(k =>
      '<label class="check"><input type="checkbox" data-k="' + k + '"' + (c.only[k] ? ' checked' : '') + '> <span>' + K(LABEL[k][0]) + ' <span class="small">' + esc(LABEL[k][1]) + '</span></span></label>').join('');
    $('#as-xp-wrap').hidden = c.level !== 2;
  }

  function refreshCreator() {
    const c = creator;
    const link = creatorLink();
    const count = Exercises.KINDS[c.level].filter(k => c.only[k]).length;
    $('#as-link').value = link;
    $('#as-count').textContent = count + (count === 1 ? ' pregunta' : ' preguntas');
    $$('#as-copy, #as-test, #as-native, #as-qr').forEach(b => { b.disabled = count === 0; });
    const spec = Exercises.specFromRaw(creatorRaw());
    const err = spec ? Exercises.fromSpec(spec).error : 'Faltan datos.';
    $('#as-error').hidden = !err;
    $('#as-error').textContent = err || '';
    if (err) $$('#as-copy, #as-test, #as-native, #as-qr').forEach(b => { b.disabled = true; });
  }

  function openCreator() {
    const d = api.data();
    if (!d.M) { api.toast('Primero carga datos válidos: el ejercicio se arma con los datos de la pantalla «Datos».'); return; }
    const mean = d.M.xbar;
    creator = { d, title: 'Ejercicio de regresión', statement: '', level: 1, only: {}, xp: d.S.xPredEmpty ? String(Math.round(mean * 100) / 100).replace('.', ',') : String(d.M.xPred).replace('.', ','), sol: true };
    Exercises.KINDS[1].forEach(k => { creator.only[k] = true; });
    $('#as-title').value = creator.title;
    $('#as-statement').value = '';
    $('#as-xp').value = creator.xp;
    $('#as-sol').checked = true;
    $$('input[name="as-level"]').forEach(r => { r.checked = r.value === '1'; });
    $('#as-data').textContent = d.M.n + ' pares de datos: ' + d.L.x + ' y ' + d.L.y + ', α = ' + n(d.S.alpha) + '.';
    renderCreatorQuestions();
    refreshCreator();
    $('#dlg-assign').showModal();
  }

  function initCreator() {
    const dlg = $('#dlg-assign');
    dlg.addEventListener('input', e => {
      const c = creator;
      if (!c) return;
      if (e.target.id === 'as-title') c.title = e.target.value;
      if (e.target.id === 'as-statement') c.statement = e.target.value;
      if (e.target.id === 'as-xp') c.xp = e.target.value;
      if (e.target.id === 'as-sol') c.sol = e.target.checked;
      if (e.target.dataset && e.target.dataset.k) c.only[e.target.dataset.k] = e.target.checked;
      refreshCreator();
    });
    dlg.addEventListener('change', e => {
      const c = creator;
      if (!c || e.target.name !== 'as-level') return;
      c.level = +e.target.value;
      c.only = {};
      Exercises.KINDS[c.level].forEach(k => { c.only[k] = true; });
      renderCreatorQuestions();
      refreshCreator();
    });
    $('#as-copy').addEventListener('click', () => api.copy($('#as-link').value).then(ok => api.toast(ok ? 'Enlace copiado: envíalo a tus estudiantes.' : 'No se pudo copiar; selecciónalo manualmente.')));
    $('#as-qr').addEventListener('click', () => {
      if (api.qr) api.qr({ title: creator.title.trim() || 'Ejercicio de regresión', link: $('#as-link').value, note: 'Tus estudiantes escanean este código con la cámara del celular para abrir el ejercicio.' });
    });
    $('#as-native').hidden = !navigator.share;
    $('#as-native').addEventListener('click', () => {
      navigator.share({ title: creator.title, text: 'Ejercicio de regresión y correlación para resolver en RegreLab:', url: $('#as-link').value }).catch(() => { /* cancelado */ });
    });
    $('#as-test').addEventListener('click', () => {
      const link = $('#as-link').value;
      dlg.close();
      openPacked(link.split('#e=')[1]);
      api.showPractice();
      api.toast('Así lo verá el estudiante. Para salir, «Practicar con ejercicios al azar».');
    });
  }

  // Abre un ejercicio concreto (semilla y nivel) o recupera el último
  function open(seed, level) {
    if (seed) { start(seed, level); return; }
    if (P) return;
    try {
      const cur = JSON.parse(safeGet(KEY_CUR) || 'null');
      if (cur && cur.spec) {
        const spec = Exercises.specFromRaw({ t: cur.spec.title, s: cur.spec.statement, xn: cur.spec.xName, xu: cur.spec.xUnit, yn: cur.spec.yName, yu: cur.spec.yUnit,
          r: cur.spec.x.map((v, i) => [v, cur.spec.y[i]]), l: cur.spec.level, a: cur.spec.alpha, p: cur.spec.xp, sol: cur.spec.sol ? 1 : 0, q: cur.spec.only || undefined });
        if (spec && startCustom(spec, cur.answers || {}, cur.name)) return;
      }
      if (cur && cur.seed && cur.level >= 1 && cur.level <= 3) { start(cur.seed, cur.level, cur.answers || {}); return; }
    } catch (e) { /* ejercicio nuevo */ }
    start(newSeed(), 1);
  }

  function init(callbacks) {
    api = Object.assign(api, callbacks);
    const root = $('#practice');
    root.addEventListener('click', onClick);
    root.addEventListener('input', onInput);
    root.addEventListener('change', onInput);
    root.addEventListener('keydown', onKey);
    initCreator();
    ready = true;
  }

  return { init, open, openPacked, openCreator, get current() { return P; } };
})();
