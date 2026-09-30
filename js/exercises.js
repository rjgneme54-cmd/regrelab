(function (root, factory) {
  const api = factory(typeof module === 'object' && module.exports ? require('./stats.js') : root.Stats);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Exercises = api;
})(typeof self !== 'undefined' ? self : this, function (Stats) {
  'use strict';

  // Contextos de los ejercicios (X explica Y). sign: sentido natural de la relación.
  const SCENARIOS = [
    { id: 'estudio', intro: 'Un docente registró las horas de estudio y la nota del parcial de {n} estudiantes.', x: ['Horas de estudio', 'h', 1, 12], y: ['Nota del parcial', 'puntos'], a: 28, b: 6, sd: 4, sign: 1, ymax: 100 },
    { id: 'publicidad', intro: 'Un comercio relevó, durante {n} meses, la inversión en publicidad y las ventas.', x: ['Publicidad', 'miles de $', 1, 12], y: ['Ventas', 'miles de $'], a: 10, b: 4, sd: 3, sign: 1 },
    { id: 'helados', intro: 'Una heladería anotó, durante {n} días, la temperatura máxima y las unidades vendidas.', x: ['Temperatura máxima', '°C', 18, 36], y: ['Helados vendidos', 'unidades'], a: -40, b: 5, sd: 6, sign: 1 },
    { id: 'autos', intro: 'Un concesionario registró la antigüedad y el precio de reventa de {n} autos usados.', x: ['Antigüedad', 'años', 1, 12], y: ['Precio de reventa', 'miles de $'], a: 95, b: 6, sd: 5, sign: -1 },
    { id: 'precio', intro: 'Un supermercado probó distintos precios de un producto durante {n} semanas y anotó las unidades vendidas.', x: ['Precio', '$', 10, 30], y: ['Unidades vendidas', 'unidades'], a: 140, b: 4, sd: 6, sign: -1 },
    { id: 'capacitacion', intro: 'Una empresa registró las horas de capacitación de {n} operarios y los errores cometidos por semana.', x: ['Horas de capacitación', 'h', 1, 15], y: ['Errores por semana', 'errores'], a: 22, b: 1.2, sd: 1.5, sign: -1, ymin: 0 },
    { id: 'alquiler', intro: 'Una inmobiliaria relevó la superficie y el alquiler mensual de {n} departamentos.', x: ['Superficie', 'decenas de m²', 3, 12], y: ['Alquiler mensual', 'miles de $'], a: 20, b: 9, sd: 8, sign: 1 },
    { id: 'aire', intro: 'Se midió, en {n} hogares, las horas diarias de uso del aire acondicionado y el consumo eléctrico.', x: ['Uso del aire', 'h por día', 1, 10], y: ['Consumo eléctrico', 'kWh'], a: 150, b: 22, sd: 25, sign: 1 }
  ];

  const LEVELS = {
    1: { name: 'La recta', text: 'Sumas, SSX, SSXY, b₁ y b₀', n: [5, 6] },
    2: { name: 'Variación y ajuste', text: 'SST, SSR, SSE, r², r, S_YX y una predicción', n: [6, 7] },
    3: { name: 'Inferencia', text: 'S_b1, t, valor crítico, decisión, IC de β₁ y F', n: [7, 8] }
  };

  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function gauss(r) {
    return Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());
  }

  // Tolerancia de cada respuesta: admite el redondeo que se hace a mano
  function tolFor(kind, c) {
    const a = Math.abs(c);
    switch (kind) {
      case 'sx': case 'sy': case 'sxy': case 'sxx': return 0.0001;
      case 'ssx': case 'ssxy': case 'sst': case 'ssr': return Math.max(0.05, 0.005 * a);
      case 'sse': return Math.max(0.15, 0.03 * a);
      case 'b1': return Math.max(0.011, 0.005 * a);
      case 'b0': return Math.max(0.05, 0.01 * a);
      case 'r2': case 'r': return 0.006;
      case 'syx': case 'sb1': return Math.max(0.011, 0.01 * a);
      case 'ypred': return Math.max(0.05, 0.005 * a);
      case 't': case 'f': return Math.max(0.05, 0.01 * a);
      case 'tcrit': return 0.006;
      case 'cilo': case 'cihi': return Math.max(0.02, 0.01 * a);
      default: return 0.01;
    }
  }

  function candidate(sc, level, r, wantReject) {
    const [lo, hi] = LEVELS[level].n;
    const n = lo + Math.floor(r() * (hi - lo + 1));
    const pool = [];
    for (let v = sc.x[2]; v <= sc.x[3]; v++) pool.push(v);
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = pool[i]; pool[i] = pool[j]; pool[j] = t; }
    const x = pool.slice(0, n).sort((p, q) => p - q);
    const mult = wantReject ? 0.85 + 0.4 * r() : 0.05 + 0.2 * r();
    const sd = sc.sd * (wantReject ? 1 : 1.3);
    const y = x.map(v => {
      let val = Math.round(sc.a + sc.sign * sc.b * mult * v + gauss(r) * sd);
      if (sc.ymin !== undefined) val = Math.max(sc.ymin, val);
      if (sc.ymax !== undefined) val = Math.min(sc.ymax, val);
      return val;
    });
    return { x, y };
  }

  function accept(m, level, wantReject) {
    if (!(m.ssx > 0) || !(m.sst > 0) || m.sse < 1e-9) return false;
    if (level < 3) return Math.abs(m.r) >= 0.8;
    if (wantReject) return m.tSlopeTest.reject && Math.abs(m.r) >= 0.7;
    return !m.tSlopeTest.reject && m.tSlopeTest.p > 0.1 && m.tSlopeTest.p < 0.7;
  }

  function generate(seed, level) {
    const r = rng(seed * 7919 + level * 104729 + 1);
    const sc = SCENARIOS[Math.floor(r() * SCENARIOS.length)];
    const wantReject = level === 3 ? seed % 3 !== 0 : true;
    let cand = null, m = null;
    for (let tries = 0; tries < 600; tries++) {
      cand = candidate(sc, level, r, wantReject);
      m = Stats.analyze(cand.x, cand.y, { alpha: 0.05, conf: 0.95, tail: 'two' });
      if (accept(m, level, wantReject)) break;
    }
    const xp = Math.round((m.xMin + m.xMax) / 2 + (r() - 0.5) * (m.xMax - m.xMin) * 0.4);
    const mp = Stats.analyze(cand.x, cand.y, { alpha: 0.05, conf: 0.95, tail: 'two', xPred: xp });
    const ex = {
      seed, level, scenario: sc.id, intro: sc.intro.replace('{n}', String(cand.x.length)),
      xName: sc.x[0], xUnit: sc.x[1], yName: sc.y[0], yUnit: sc.y[1],
      x: cand.x, y: cand.y, n: cand.x.length, alpha: 0.05, conf: 0.95, xp, m: mp
    };
    ex.given = givenFor(ex);
    ex.questions = questionsFor(ex);
    return ex;
  }

  function givenFor(ex) {
    const m = ex.m;
    if (ex.level === 2) return [
      ['n', ex.n], ['sx', m.sums.x], ['sy', m.sums.y], ['sxy', m.sums.xy], ['sxx', m.sums.xx], ['syy', m.sums.yy],
      ['xbar', m.xbar], ['ybar', m.ybar], ['b0', m.b0], ['b1', m.b1]
    ];
    if (ex.level === 3) return [['n', ex.n], ['ssx', m.ssx], ['sst', m.sst], ['ssr', m.ssr], ['sse', m.sse], ['b1', m.b1]];
    return [];
  }

  function questionsFor(ex) {
    const m = ex.m;
    const q = (kind, correct) => ({ key: kind, kind, correct, tol: typeof correct === 'number' ? tolFor(kind, correct) : 0 });
    if (ex.level === 1) return [q('sx', m.sums.x), q('sy', m.sums.y), q('sxy', m.sums.xy), q('sxx', m.sums.xx), q('ssx', m.ssx), q('ssxy', m.ssxy), q('b1', m.b1), q('b0', m.b0)];
    if (ex.level === 2) return [q('sst', m.sst), q('ssr', m.ssr), q('sse', m.sse), q('r2', m.r2), q('r', m.r), q('syx', m.syx), q('ypred', m.pred.yhat)];
    return [
      q('syx', m.syx), q('sb1', m.sb1), q('t', m.tSlope), q('tcrit', m.tSlopeTest.c),
      q('dec', m.tSlopeTest.reject ? 'rej' : 'keep'), q('cilo', m.ciSlope[0]), q('cihi', m.ciSlope[1]), q('f', m.F)
    ];
  }

  // val: número ingresado (NaN si no es válido) o 'rej' / 'keep' en la decisión
  function grade(question, val) {
    if (question.kind === 'dec') return val === undefined || val === '' || val === null ? 'empty' : (val === question.correct ? 'ok' : 'bad');
    if (val === undefined || val === null || val === '') return 'empty';
    if (typeof val !== 'number' || !isFinite(val)) return 'bad';
    return Math.abs(val - question.correct) <= question.tol ? 'ok' : 'bad';
  }

  return { SCENARIOS, LEVELS, generate, grade, rng };
});
