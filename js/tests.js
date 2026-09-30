(function (root, factory) {
  const api = factory(typeof module === 'object' && module.exports ? require('./stats.js') : root.Stats);
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
})(typeof self !== 'undefined' ? self : this, function (Stats) {
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

  function run() {
    return cases().map(c => {
      const tol = c[4] || 0.5 * Math.pow(10, -c[3]) + 1e-12;
      const ok = isFinite(c[1]) && Math.abs(c[1] - c[2]) <= tol;
      return { name: c[0], ok, got: isFinite(c[1]) ? fmt(c[1], Math.max(c[3], 4)) : String(c[1]), expected: fmt(c[2], c[3]) };
    });
  }

  return { run };
});
