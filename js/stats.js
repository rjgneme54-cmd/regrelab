(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Stats = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const LANCZOS = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012,
    9.9843695780195716e-6, 1.5056327351493116e-7
  ];

  function lgamma(x) {
    if (x < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * x))) - lgamma(1 - x);
    x -= 1;
    let a = LANCZOS[0];
    const t = x + 7.5;
    for (let i = 1; i < 9; i++) a += LANCZOS[i] / (x + i);
    return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
  }

  const lbeta = (a, b) => lgamma(a) + lgamma(b) - lgamma(a + b);

  function betacf(a, b, x) {
    const MAXIT = 1000, EPS = 1e-15, FPMIN = 1e-300;
    const qab = a + b, qap = a + 1, qam = a - 1;
    let c = 1, d = 1 - qab * x / qap;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    d = 1 / d;
    let h = d;
    for (let m = 1; m <= MAXIT; m++) {
      const m2 = 2 * m;
      let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
      d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
      c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d; h *= d * c;
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
      d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
      c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d;
      const del = d * c;
      h *= del;
      if (Math.abs(del - 1) < EPS) break;
    }
    return h;
  }

  // Función beta incompleta regularizada I_x(a, b)
  function betai(x, a, b) {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    const bt = Math.exp(a * Math.log(x) + b * Math.log(1 - x) - lbeta(a, b));
    if (x < (a + 1) / (a + b + 2)) return bt * betacf(a, b, x) / a;
    return 1 - bt * betacf(b, a, 1 - x) / b;
  }

  // Búsqueda por bisección del cuantil superior de una cola decreciente
  function upperQuantile(sf, alpha, start) {
    let lo = 0, hi = start;
    let guard = 0;
    while (sf(hi) > alpha && guard++ < 2000) { lo = hi; hi *= 2; }
    for (let i = 0; i < 300; i++) {
      const mid = 0.5 * (lo + hi);
      if (sf(mid) > alpha) lo = mid; else hi = mid;
      if (hi - lo <= 1e-15 * Math.max(1, hi)) break;
    }
    return 0.5 * (lo + hi);
  }

  // ---------- t de Student ----------
  const tSfTwo = (t, df) => betai(df / (df + t * t), df / 2, 0.5);
  function tSf(t, df) {
    const p = 0.5 * tSfTwo(t, df);
    return t > 0 ? p : 1 - p;
  }
  const tCdf = (t, df) => tSf(-t, df);
  const tPdf = (t, df) =>
    Math.exp(lgamma((df + 1) / 2) - lgamma(df / 2) - 0.5 * Math.log(df * Math.PI) -
      (df + 1) / 2 * Math.log(1 + t * t / df));
  // q tal que P(T > q) = a
  function tUpper(a, df) {
    if (a === 0.5) return 0;
    if (a > 0.5) return -tUpper(1 - a, df);
    return upperQuantile(t => tSf(t, df), a, 1);
  }
  const tInv = (p, df) => tUpper(1 - p, df);

  // ---------- F de Fisher ----------
  const fSf = (f, d1, d2) => (f <= 0 ? 1 : betai(d2 / (d2 + d1 * f), d2 / 2, d1 / 2));
  const fCdf = (f, d1, d2) => 1 - fSf(f, d1, d2);
  function fPdf(x, d1, d2) {
    if (x <= 0) return 0;
    return Math.exp(0.5 * (d1 * Math.log(d1 * x) + d2 * Math.log(d2) - (d1 + d2) * Math.log(d1 * x + d2)) -
      Math.log(x) - lbeta(d1 / 2, d2 / 2));
  }
  const fUpper = (a, d1, d2) => upperQuantile(f => fSf(f, d1, d2), a, 1);

  // ---------- distribución normal ----------
  // Gamma incompleta regularizada (serie y fracción continua): base de la normal
  function gammaSeries(a, x) {
    let ap = a, sum = 1 / a, del = sum;
    for (let i = 0; i < 500; i++) {
      ap += 1; del *= x / ap; sum += del;
      if (Math.abs(del) < Math.abs(sum) * 1e-16) break;
    }
    return sum * Math.exp(-x + a * Math.log(x) - lgamma(a));
  }

  function gammaFrac(a, x) {
    const TINY = 1e-300;
    let b = x + 1 - a, c = 1 / TINY, d = 1 / b, h = d;
    for (let i = 1; i <= 500; i++) {
      const an = -i * (i - a);
      b += 2;
      d = an * d + b; if (Math.abs(d) < TINY) d = TINY;
      c = b + an / c; if (Math.abs(c) < TINY) c = TINY;
      d = 1 / d;
      const del = d * c;
      h *= del;
      if (Math.abs(del - 1) < 1e-16) break;
    }
    return Math.exp(-x + a * Math.log(x) - lgamma(a)) * h;
  }

  const gammaQ = (a, x) => (x <= 0 ? 1 : (x < a + 1 ? 1 - gammaSeries(a, x) : gammaFrac(a, x)));

  const normPdf = z => Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);

  function normCdf(z) {
    if (z === 0) return 0.5;
    const tail = 0.5 * gammaQ(0.5, z * z / 2);
    return z < 0 ? tail : 1 - tail;
  }

  // Cuantil de la normal estándar por bisección sobre la cola inferior
  function normInv(p) {
    if (!(p > 0)) return -Infinity;
    if (!(p < 1)) return Infinity;
    if (p === 0.5) return 0;
    const q = p < 0.5 ? p : 1 - p;
    let lo = -40, hi = 0;
    for (let i = 0; i < 200; i++) {
      const mid = 0.5 * (lo + hi);
      if (normCdf(mid) < q) lo = mid; else hi = mid;
      if (hi - lo < 1e-14) break;
    }
    const z = 0.5 * (lo + hi);
    return p < 0.5 ? z : -z;
  }

  // ---------- utilidades ----------
  const sum = arr => arr.reduce((s, v) => s + v, 0);

  function quantile(sorted, q) {
    const pos = (sorted.length - 1) * q;
    const lo = Math.floor(pos), hi = Math.ceil(pos);
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
  }

  // Puntos del gráfico de probabilidad normal (posiciones de Blom) y recta de referencia por los cuartiles
  function qqPoints(values) {
    const e = values.slice().sort((a, b) => a - b);
    const n = e.length;
    const z = e.map((_, i) => normInv((i + 1 - 0.375) / (n + 0.25)));
    const q1 = quantile(e, 0.25), q3 = quantile(e, 0.75);
    const z1 = normInv(0.25), z3 = normInv(0.75);
    const slope = q3 > q1 ? (q3 - q1) / (z3 - z1) : Math.sqrt(e.reduce((s, v) => s + v * v, 0) / Math.max(1, n - 1));
    return { z, e, slope, intercept: q1 - slope * z1 };
  }

  function iqrOutliers(arr) {
    if (arr.length < 4) return [];
    const s = arr.slice().sort((a, b) => a - b);
    const q1 = quantile(s, 0.25), q3 = quantile(s, 0.75), iqr = q3 - q1;
    const lo = q1 - 1.5 * iqr, hi = q3 + 1.5 * iqr;
    const out = [];
    arr.forEach((v, i) => { if (v < lo || v > hi) out.push(i); });
    return out;
  }

  // Prueba t según el tipo de cola: dos colas, cola derecha o cola izquierda
  function ttest(t, df, tail, alpha) {
    if (tail === 'right') {
      const c = tUpper(alpha, df);
      return { crit: { lo: null, hi: c }, c, p: tSf(t, df), reject: t > c };
    }
    if (tail === 'left') {
      const c = tUpper(alpha, df);
      return { crit: { lo: -c, hi: null }, c, p: tSf(-t, df), reject: t < -c };
    }
    const c = tUpper(alpha / 2, df);
    return { crit: { lo: -c, hi: c }, c, p: tSfTwo(t, df), reject: Math.abs(t) > c };
  }

  // ---------- regresión lineal simple ----------
  function analyze(x, y, opts) {
    const o = Object.assign({ alpha: 0.05, conf: 0.95, tail: 'two', xPred: null, timeOrdered: false }, opts || {});
    const n = x.length, df = n - 2;
    const sx = sum(x), sy = sum(y);
    const sxy = sum(x.map((v, i) => v * y[i]));
    const sxx = sum(x.map(v => v * v));
    const syy = sum(y.map(v => v * v));
    const xbar = sx / n, ybar = sy / n;
    const ssx = sum(x.map(v => (v - xbar) * (v - xbar)));
    const ssxy = sum(x.map((v, i) => (v - xbar) * (y[i] - ybar)));
    const sst = sum(y.map(v => (v - ybar) * (v - ybar)));
    const b1 = ssxy / ssx;
    const b0 = ybar - b1 * xbar;
    const yhat = x.map(v => b0 + b1 * v);
    const e = y.map((v, i) => v - yhat[i]);
    const ssr = sum(yhat.map(v => (v - ybar) * (v - ybar)));
    const sse = sum(e.map(v => v * v));
    const r2 = sst > 0 ? ssr / sst : NaN;
    const r = sst > 0 ? ssxy / Math.sqrt(ssx * sst) : NaN;
    const syx = Math.sqrt(sse / df);
    const sb1 = syx / Math.sqrt(ssx);
    const tSlope = b1 === 0 && sb1 === 0 ? NaN : b1 / sb1;
    const msr = ssr, mse = sse / df;
    const F = mse === 0 ? (msr === 0 ? NaN : Infinity) : msr / mse;
    const tCorr = r === 1 || r === -1 ? Math.sign(r) * Infinity : r / Math.sqrt((1 - r * r) / df);

    const tSlopeTest = ttest(tSlope, df, o.tail, o.alpha);
    const tCorrTest = ttest(tCorr, df, o.tail, o.alpha);
    const fCrit = fUpper(o.alpha, 1, df);
    const pF = fSf(F, 1, df);

    const tConf = tUpper((1 - o.conf) / 2, df);
    // El IC de β₁ se arma como a mano: t y S_b1 redondeados a 4 decimales (así coincide con el apunte)
    const r4 = v => Math.round(v * 1e4) / 1e4;
    const tConfR = r4(tConf), sb1R = r4(sb1);
    const ciSlope = [b1 - tConfR * sb1R, b1 + tConfR * sb1R];
    const ciSlopeExact = [b1 - tConf * sb1, b1 + tConf * sb1];

    const xPred = o.xPred === null || !isFinite(o.xPred) ? xbar : o.xPred;
    const hAt = v => 1 / n + (v - xbar) * (v - xbar) / ssx;
    const band = v => {
      const yh = b0 + b1 * v, h = hAt(v);
      const mc = tConf * syx * Math.sqrt(h), mp = tConf * syx * Math.sqrt(1 + h);
      return { yhat: yh, h, ci: [yh - mc, yh + mc], pi: [yh - mp, yh + mp], mc, mp };
    };
    const pred = Object.assign({ x: xPred }, band(xPred));

    const xMin = Math.min.apply(null, x), xMax = Math.max.apply(null, x);
    const dw = sse > 0 ? sum(e.slice(1).map((v, i) => (v - e[i]) * (v - e[i]))) / sse : NaN;

    const stdRes = e.map(v => (syx > 0 ? v / syx : 0));
    const m2 = sum(e.map(v => v * v)) / n;
    const skew = m2 > 0 ? sum(e.map(v => v * v * v)) / n / Math.pow(m2, 1.5) : NaN;
    const exKurt = m2 > 0 ? sum(e.map(v => v * v * v * v)) / n / (m2 * m2) - 3 : NaN;
    const outliers = {
      x: iqrOutliers(x),
      y: iqrOutliers(y),
      resid: n >= 4 ? stdRes.map((v, i) => (Math.abs(v) > 2 ? i : -1)).filter(i => i >= 0) : []
    };

    return {
      n, df, opts: o,
      sums: { x: sx, y: sy, xy: sxy, xx: sxx, yy: syy },
      xbar, ybar, ssx, ssxy, sst, ssr, sse,
      b0, b1, yhat, e, stdRes, skew, exKurt,
      r, r2, syx, sb1, msr, mse, F,
      sx2: ssx / (n - 1), sy2: sst / (n - 1),
      sxStd: Math.sqrt(ssx / (n - 1)), syStd: Math.sqrt(sst / (n - 1)),
      cov: ssxy / (n - 1),
      tSlope, tSlopeTest, tCorr, tCorrTest,
      fCrit, pF, tConf, tConfR, sb1R, ciSlope, ciSlopeExact,
      xPred, pred, band, hAt,
      xMin, xMax, yMin: Math.min.apply(null, y), yMax: Math.max.apply(null, y),
      dw, outliers,
      degenerateY: !(sst > 0),
      perfectFit: sse < 1e-12 * Math.max(1, sst)
    };
  }

  return {
    lgamma, betai, tSfTwo, tSf, tCdf, tPdf, tUpper, tInv,
    fSf, fCdf, fPdf, fUpper, ttest, analyze, sum, normPdf, normCdf, normInv, qqPoints
  };
});
