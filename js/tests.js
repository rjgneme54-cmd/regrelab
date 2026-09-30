(function (root, factory) {
  const isNode = typeof module === 'object' && module.exports;
  if (isNode) global.qrcode = require('../vendor/qrcode.js');
  const api = factory(isNode ? require('./stats.js') : root.Stats, isNode ? require('./exercises.js') : root.Exercises, isNode ? require('./influence.js') : root.Influence, isNode ? require('./qr.js') : root.QR);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
    if (require.main === module) {
      const res = api.run();
      res.forEach(r => console.log((r.ok ? 'OK    ' : 'FALLA ') + r.name + ' | esperado ' + r.expected + ' | obtenido ' + r.got));
      const bad = res.filter(r => !r.ok).length;
      console.log('\n' + (res.length - bad) + '/' + res.length + ' pruebas aprobadas');
      process.exit(bad ? 1 : 0);
    }
  } else root.RegreTests = api;
})(typeof self !== 'undefined' ? self : this, function (Stats, Exercises, Influence, QR) {
  'use strict';

  const X = [1, 2, 3, 4, 5, 6, 7, 8];
  const Y = [11, 16, 18, 19, 24, 25, 29, 28];

  const fmt = (v, d) => v.toFixed(d).replace('.', ',');

  // [nombre, valor obtenido, valor esperado, decimales del esperado, tolerancia opcional]
  function cases() {
    const m = Stats.analyze(X, Y, { alpha: 0.05, conf: 0.95, tail: 'two', xPred: 5 });
    const b = m.band(5);
    const tOne = Stats.tUpper(0.05, 6);
    return [
      ['ΣX', m.sums.x, 36, 0], ['ΣY', m.sums.y, 170, 0], ['ΣXY', m.sums.xy, 870, 0],
      ['ΣX²', m.sums.xx, 204, 0], ['ΣY²', m.sums.yy, 3888, 0],
      ['X̄', m.xbar, 4.5, 2], ['Ȳ', m.ybar, 21.25, 2],
      ['SSX', m.ssx, 42, 0], ['SSXY', m.ssxy, 105, 0],
      ['b₁', m.b1, 2.5, 4], ['b₀', m.b0, 10, 4],
      ['SST', m.sst, 275.5, 1], ['SSR', m.ssr, 262.5, 1], ['SSE', m.sse, 13, 1],
      ['r²', m.r2, 0.9528, 4], ['r', m.r, 0.9761, 4],
      ['S_YX', m.syx, 1.4720, 4], ['S_b1', m.sb1, 0.2271, 4],
      ['t (pendiente)', m.tSlope, 11.01, 2],
      ['t crítico (dos colas, gl = 6)', m.tSlopeTest.c, 2.4469, 4],
      ['F', m.F, 121.15, 2], ['F crítico (1 ; 6)', m.fCrit, 5.99, 2],
      ['IC 95 % β₁ (límite inferior)', m.ciSlope[0], 1.9443, 4],
      ['IC 95 % β₁ (límite superior)', m.ciSlope[1], 3.0557, 4],
      ['IC 95 % β₁ con precisión completa (referencia, ±0,0001)', m.ciSlopeExact[0], 1.9443, 4, 1.5e-4],
      ['t crítico (una cola, gl = 6)', tOne, 1.9432, 4],
      ['Ŷ (X = 5)', b.yhat, 22.5, 1], ['h (X = 5)', b.h, 0.13095, 5],
      ['IC 95 % media (inferior)', b.ci[0], 21.20, 2], ['IC 95 % media (superior)', b.ci[1], 23.80, 2],
      ['IP 95 % individual (inferior)', b.pi[0], 18.67, 2], ['IP 95 % individual (superior)', b.pi[1], 26.33, 2],
      ['F = t²', m.F, m.tSlope * m.tSlope, 8],
      ['SST = SSR + SSE', m.ssr + m.sse, m.sst, 8],
      ['Σe = 0', Stats.sum(m.e), 0, 8],
      ['Σe² = SSE', Stats.sum(m.e.map(v => v * v)), m.sse, 8],
      ['r² = r · r', m.r * m.r, m.r2, 8],
      ['t (correlación) = t (pendiente)', m.tCorr, m.tSlope, 8],
      ['valor-p (pendiente) < 0,001', m.tSlopeTest.p < 0.001 ? 1 : 0, 1, 0],
      ['valor-p F = valor-p t', m.pF, m.tSlopeTest.p, 10],
      ['t crítico gl = 1, α/2 = 0,025 (12,7062)', Stats.tUpper(0.025, 1), 12.7062, 4],
      ['t crítico gl = 30, α/2 = 0,025 (2,0423)', Stats.tUpper(0.025, 30), 2.0423, 4],
      ['t crítico gl = 100, α = 0,05 (1,6602)', Stats.tUpper(0.05, 100), 1.6602, 4],
      ['F crítico (2 ; 10) α = 0,05 (4,1028)', Stats.fUpper(0.05, 2, 10), 4.1028, 4],
      ['F crítico (5 ; 20) α = 0,01 (4,1027)', Stats.fUpper(0.01, 5, 20), 4.1027, 4],
      ['P(T ≤ 0) = 0,5', Stats.tCdf(0, 7), 0.5, 10]
    ];
  }

  // Ejercicios del modo práctica: 60 semillas por nivel
  function exerciseCases() {
    let badCond = 0, badAccept = 0, badReject = 0, nonDet = 0, rejects = 0, keeps = 0, empty = 0, count = 0;
    for (let level = 1; level <= 3; level++) {
      for (let seed = 1; seed <= 60; seed++) {
        const ex = Exercises.generate(seed, level), again = Exercises.generate(seed, level);
        count++;
        if (JSON.stringify(ex.x) !== JSON.stringify(again.x) || JSON.stringify(ex.y) !== JSON.stringify(again.y)) nonDet++;
        const m = ex.m;
        const okCond = m.ssx > 0 && m.sst > 0 && m.sse > 0 && ex.x.length >= 5 && new Set(ex.x).size === ex.x.length &&
          ex.y.every(v => Number.isInteger(v)) && (level < 3 ? Math.abs(m.r) >= 0.8 : (seed % 3 !== 0 ? m.tSlopeTest.reject : !m.tSlopeTest.reject));
        if (!okCond) badCond++;
        ex.questions.forEach(q => {
          const good = q.kind === 'dec' ? q.correct : q.correct;
          if (Exercises.grade(q, good) !== 'ok') badAccept++;
          if (q.kind !== 'dec') {
            const off = q.correct + Math.max(10 * q.tol, Math.abs(q.correct) * 0.1 + 1);
            if (Exercises.grade(q, off) !== 'bad') badReject++;
            if (Exercises.grade(q, NaN) !== 'bad') badReject++;
          } else if (Exercises.grade(q, q.correct === 'rej' ? 'keep' : 'rej') !== 'bad') badReject++;
          if (Exercises.grade(q, '') !== 'empty') empty++;
        });
        if (level === 3) { if (m.tSlopeTest.reject) rejects++; else keeps++; }
      }
    }
    return [
      ['Ejercicios: ' + count + ' generados cumplen las condiciones de cada nivel', badCond, 0, 0],
      ['Ejercicios: la misma semilla da el mismo ejercicio', nonDet, 0, 0],
      ['Ejercicios: toda respuesta correcta se acepta', badAccept, 0, 0],
      ['Ejercicios: respuestas erróneas o inválidas se rechazan', badReject, 0, 0],
      ['Ejercicios: respuestas vacías se detectan', empty, 0, 0],
      ['Ejercicios nivel 3: hay casos que rechazan y que no rechazan H₀', rejects > 10 && keeps > 10 ? 1 : 0, 1, 0]
    ];
  }

  // Excluir puntos: dato atípico del ejemplo (X = 1…10; la fila 8 tiene Y = 20)
  function influenceCases() {
    const x = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], y = [35, 42, 48, 55, 60, 68, 73, 20, 85, 90];
    const M = Stats.analyze(x, y, { alpha: 0.05, conf: 0.95, tail: 'two', xPred: 5.5 });
    M.x = x; M.y = y;
    const all = Influence.without(M, []);
    const sub = Influence.without(M, [7]);
    const infl = Influence.influence(M);
    return [
      ['Excluir: sin excluir nada se obtiene la misma pendiente', all.b1, M.b1, 10],
      ['Excluir: la fila 8 es el punto más influyente', Influence.mostInfluential(M, infl), 7, 0],
      ['Excluir la fila 8: r² sube de 0,354 a más de 0,95', sub.r2 > 0.95 && M.r2 < 0.4 ? 1 : 0, 1, 0],
      ['Excluir la fila 8: la decisión pasa de no rechazar a rechazar H₀', !M.tSlopeTest.reject && sub.tSlopeTest.reject ? 1 : 0, 1, 0],
      ['Excluir la fila 8: n = 9', sub.n, 9, 0],
      ['Excluir: con menos de 3 puntos no se puede ajustar', Influence.without(M, [0, 1, 2, 3, 4, 5, 6, 7]) === null ? 1 : 0, 1, 0],
      ['Excluir: si todas las X quedan iguales no se puede ajustar', Influence.without({ x: [1, 1, 1, 5], y: [1, 2, 3, 4], opts: M.opts, xPred: 1 }, [3]) === null ? 1 : 0, 1, 0]
    ];
  }

  // Ejercicios asignados por un docente
  function assignedCases() {
    const raw = { t: 'Parcial', s: 'Enunciado', xn: 'Publicidad', xu: 'millones de $', yn: 'Ventas', yu: 'millones de $', r: [[1, 11], [2, 16], [3, 18], [4, 19], [5, 24], [6, 25], [7, 29], [8, 28]], l: 2, a: 0.05, p: '5', sol: 0, q: ['sst', 'r2', 'zzz'] };
    const spec = Exercises.specFromRaw(raw);
    const ex = Exercises.fromSpec(spec);
    const l1 = Exercises.fromSpec(Exercises.specFromRaw({ r: raw.r, l: 1 }));
    const l3 = Exercises.fromSpec(Exercises.specFromRaw({ r: raw.r, l: 3, a: 0.01 }));
    const bad = raw2 => { const s = Exercises.specFromRaw(raw2); return s === null || !!Exercises.fromSpec(s).error ? 1 : 0; };
    return [
      ['Asignado: se reconocen los datos y el nivel', spec && spec.x.length === 8 && spec.level === 2 ? 1 : 0, 1, 0],
      ['Asignado: solo se mantienen las preguntas válidas elegidas', ex.questions.map(q => q.kind).join(','), 'sst,r2', 'x'],
      ['Asignado: la respuesta de SST es 275,5', ex.questions[0].correct, 275.5, 4],
      ['Asignado: r² = 0,9528', ex.questions[1].correct, 0.9528, 4],
      ['Asignado: sin soluciones cuando se pidió ocultarlas', spec.sol ? 1 : 0, 0, 0],
      ['Asignado: el nivel 1 tiene 8 preguntas', l1.questions.length, 8, 0],
      ['Asignado: el nivel 3 con α = 0,01 usa el crítico de t con 0,005 por cola (3,7074)', l3.questions.find(q => q.kind === 'tcrit').correct, 3.7074, 4],
      ['Asignado: con X constante no se arma el ejercicio', bad({ r: [[1, 2], [1, 3], [1, 5]] }), 1, 0],
      ['Asignado: con menos de 3 pares no se arma', bad({ r: [[1, 2], [2, 3]] }), 1, 0],
      ['Asignado: con un valor que no es número no se arma', bad({ r: [[1, 2], [2, 'x'], [3, 4]] }), 1, 0],
      ['Asignado: con Y constante no se arma', bad({ r: [[1, 5], [2, 5], [3, 5]] }), 1, 0]
    ];
  }

  // Código QR: estructura del símbolo y capacidad
  function qrCases() {
    const url = 'https://rjgneme54-cmd.github.io/regrelab/#e=' + 'A'.repeat(500);
    const m = QR.matrix(url);
    const finder = (r0, c0) => {
      for (let dy = 0; dy < 7; dy++) for (let dx = 0; dx < 7; dx++) {
        const dark = dy === 0 || dy === 6 || dx === 0 || dx === 6 || (dy >= 2 && dy <= 4 && dx >= 2 && dx <= 4);
        if (m.rows[r0 + dy][c0 + dx] !== dark) return 0;
      }
      return 1;
    };
    let timing = 1;
    for (let i = 8; i < m.count - 8; i++) if (m.rows[6][i] !== (i % 2 === 0) || m.rows[i][6] !== (i % 2 === 0)) timing = 0;
    const app = QR.matrix('https://rjgneme54-cmd.github.io/regrelab/');
    return [
      ['QR: el tamaño coincide con la versión (17 + 4·v)', m.count === 17 + 4 * m.version ? 1 : 0, 1, 0],
      ['QR: los tres patrones de posición están en su lugar', finder(0, 0) + finder(0, m.count - 7) + finder(m.count - 7, 0), 3, 0],
      ['QR: el patrón de sincronización alterna claro y oscuro', timing, 1, 0],
      ['QR: la dirección de la app entra en la versión 3', app.version, 3, 0],
      ['QR: la misma dirección da siempre el mismo código', JSON.stringify(QR.matrix(url).rows) === JSON.stringify(m.rows) ? 1 : 0, 1, 0],
      ['QR: 2000 caracteres caben', QR.svg('x'.repeat(2000)) ? 1 : 0, 1, 0],
      ['QR: 3000 caracteres no caben (se avisa)', QR.svg('x'.repeat(3000)) === null ? 1 : 0, 1, 0],
      ['QR: el texto vacío no genera código', QR.svg('') === null ? 1 : 0, 1, 0],
      ['QR: el SVG es blanco y negro con margen', /fill="#fff"/.test(QR.svg(url).svg) && /fill="#000"/.test(QR.svg(url).svg) ? 1 : 0, 1, 0]
    ];
  }

  function run() {
    return cases().concat(exerciseCases(), influenceCases(), assignedCases(), qrCases()).map(c => {
      const tol = c[4] || (c[3] === 'x' ? 0 : 0.5 * Math.pow(10, -c[3]) + 1e-12);
      const ok = c[3] === 'x' ? c[1] === c[2] : isFinite(c[1]) && Math.abs(c[1] - c[2]) <= tol;
      if (c[3] === 'x') return { name: c[0], ok: c[1] === c[2], got: String(c[1]), expected: String(c[2]) };
      return { name: c[0], ok, got: isFinite(c[1]) ? fmt(c[1], Math.max(c[3], 4)) : String(c[1]), expected: fmt(c[2], c[3]) };
    });
  }

  return { run };
});
