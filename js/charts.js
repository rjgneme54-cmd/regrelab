const Charts = (function () {
  'use strict';

  const COL = {
    sst: '#7B3FA0', ssr: '#1E6FD9', sse: '#C62828', navy: '#1F3864',
    ci: '#00897B', pi: '#EF6C00', crit: '#B26A00', reject: '#D84315', keep: '#2E7D32', amber: '#F9A825'
  };

  const live = new Set();
  const hooks = { pick: null };

  // Elemento del gráfico que se está dibujando: su ámbito de estilos define los colores (el pizarrón usa un panel claro)
  let ctxEl = null;

  function withCtx(el, fn) {
    const prev = ctxEl;
    ctxEl = el;
    try { return fn(); } finally { ctxEl = prev; }
  }

  function theme() {
    const cs = getComputedStyle(ctxEl || document.documentElement);
    const g = n => cs.getPropertyValue(n).trim();
    const k = ctxEl && ctxEl.closest && ctxEl.closest('#board') ? 1.4 : 1;
    return { text: g('--text'), muted: g('--muted'), grid: g('--grid'), bg: g('--card'), accent: g('--accent'), k };
  }

  // ---------- plugins ----------
  const bgPlugin = {
    id: 'bgfill',
    beforeDraw(chart, args, opts) {
      const { ctx, width, height } = chart;
      ctx.save();
      ctx.fillStyle = opts.color || '#fff';
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }
  };

  const annPlugin = {
    id: 'ann',
    beforeDatasetsDraw(chart, args, opts) {
      const lines = opts.lines || [];
      if (!lines.length) return;
      const { ctx, chartArea: a, scales: { x, y } } = chart;
      ctx.save();
      ctx.beginPath(); ctx.rect(a.left, a.top, a.right - a.left, a.bottom - a.top); ctx.clip();
      lines.forEach(l => {
        ctx.beginPath();
        ctx.strokeStyle = l.color; ctx.lineWidth = l.w || 1.5;
        ctx.setLineDash(l.dash || []);
        ctx.moveTo(x.getPixelForValue(l.x1), y.getPixelForValue(l.y1));
        ctx.lineTo(x.getPixelForValue(l.x2), y.getPixelForValue(l.y2));
        ctx.stroke();
      });
      ctx.restore();
    },
    afterDatasetsDraw(chart, args, opts) {
      const { ctx, scales: { x, y } } = chart;
      (opts.arrows || []).forEach(ar => {
        const x1 = x.getPixelForValue(ar.x1), y1 = y.getPixelForValue(ar.y1);
        const x2 = x.getPixelForValue(ar.x2), y2 = y.getPixelForValue(ar.y2);
        const ang = Math.atan2(y2 - y1, x2 - x1);
        ctx.save();
        ctx.strokeStyle = ctx.fillStyle = ar.color; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - 10 * Math.cos(ang - 0.45), y2 - 10 * Math.sin(ang - 0.45));
        ctx.lineTo(x2 - 10 * Math.cos(ang + 0.45), y2 - 10 * Math.sin(ang + 0.45));
        ctx.closePath(); ctx.fill();
        ctx.restore();
      });
      const fk = opts.k || 1;
      (opts.texts || []).forEach(tx => {
        ctx.save();
        ctx.font = (tx.font || '600 12px IBM Plex Sans, system-ui, sans-serif').replace(/(\d+(?:\.\d+)?)px/, (m, px) => (px * fk) + 'px');
        ctx.textAlign = tx.align || 'center';
        ctx.textBaseline = tx.base || 'middle';
        const px = x.getPixelForValue(tx.x) + (tx.dx || 0), py = y.getPixelForValue(tx.y) + (tx.dy || 0);
        if (tx.bg) {
          const w = ctx.measureText(tx.text).width + 8;
          const left = tx.align === 'left' ? px - 4 : tx.align === 'right' ? px - w + 4 : px - w / 2;
          ctx.fillStyle = tx.bg;
          ctx.fillRect(left, py - 10, w, 20);
        }
        ctx.fillStyle = tx.color;
        ctx.fillText(tx.text, px, py);
        ctx.restore();
      });
    }
  };

  Chart.defaults.font.family = "'IBM Plex Sans', system-ui, sans-serif";
  Chart.defaults.font.size = 12;
  Chart.register(bgPlugin, annPlugin);

  // ---------- utilidades ----------
  function niceStep(R, target) {
    const raw = R / (target || 6);
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const f = raw / mag;
    return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * mag;
  }

  function bounds(min, max) {
    let R = max - min;
    if (!(R > 0)) R = Math.abs(max) || 1;
    const step = niceStep(R * 1.1, 5);
    const r12 = v => +v.toPrecision(12);
    return { min: r12(Math.floor((min - R * 0.04) / step) * step), max: r12(Math.ceil((max + R * 0.04) / step) * step), step };
  }

  function axis(t, title, b, extra) {
    return Object.assign({
      type: 'linear',
      min: b && b.min, max: b && b.max,
      title: { display: !!title, text: title, color: t.text, font: { weight: '600' } },
      ticks: { color: t.muted, stepSize: b && b.step, callback: v => Fmt.n(v, 4), maxTicksLimit: 14 },
      grid: { color: t.grid },
      border: { color: t.muted }
    }, extra || {});
  }

  function baseOptions(t, o) {
    const legendLabels = { color: t.text, boxWidth: o.box ? 14 : 8, usePointStyle: !o.box, padding: 10, font: { size: 12 } };
    if (o.legendFilter) legendLabels.filter = o.legendFilter;
    return {
      font: { size: Math.round(12 * t.k) },
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: o.noAnim ? 0 : 450 },
      layout: { padding: { top: 6, right: 14, bottom: 2 } },
      interaction: { mode: 'nearest', intersect: true },
      plugins: {
        bgfill: { color: t.bg },
        legend: { display: o.legend !== false, position: 'bottom', labels: legendLabels },
        title: { display: !!o.title, text: o.title, color: t.text, font: { size: Math.round(14 * t.k), weight: '700' }, padding: { bottom: 8 } },
        tooltip: o.tooltip || {},
        ann: Object.assign({ k: t.k }, o.ann || {})
      },
      scales: o.scales
    };
  }

  function make(canvas, config) {
    if (canvas._chart) canvas._chart.destroy();
    const ch = new Chart(canvas, config);
    canvas._chart = ch;
    live.add(canvas);
    return ch;
  }

  const ptTooltip = (L, extra) => ({
    callbacks: {
      label: c => (c.dataset.label ? c.dataset.label + ': ' : '') + '(' + Fmt.n(c.parsed.x) + '; ' + Fmt.n(c.parsed.y) + ')' + (extra ? extra(c) : '')
    }
  });

  function points(M, extra) {
    return M.x.map((v, i) => Object.assign({ x: v, y: M.y[i] }, extra || {}));
  }

  function ranges(M, includeY) {
    const bx = bounds(Math.min(M.xMin, M.xPred), Math.max(M.xMax, M.xPred));
    const ys = includeY || [M.yMin, M.yMax];
    const by = bounds(Math.min.apply(null, ys), Math.max.apply(null, ys));
    return { bx, by };
  }

  const eqLabel = M => 'Ŷ = ' + Fmt.n(M.b0) + (M.b1 < 0 ? ' − ' : ' + ') + Fmt.n(Math.abs(M.b1)) + ' X';

  const dataset = (label, data, color, extra) => Object.assign({
    type: 'scatter', label, data, backgroundColor: color, borderColor: color, pointRadius: 5, pointHoverRadius: 7
  }, extra || {});

  const lineDs = (label, data, color, extra) => Object.assign({
    type: 'scatter', label, data, showLine: true, borderColor: color, backgroundColor: color, borderWidth: 2.5, pointRadius: 0, pointHoverRadius: 0
  }, extra || {});

  // ---------- gráficos ----------
  const draw = {};

  draw.scatter = function (canvas, M, L) {
    const t = theme();
    const { bx, by } = ranges(M);
    make(canvas, {
      type: 'scatter',
      data: { datasets: [dataset('Datos (X; Y)', points(M), COL.navy)] },
      options: baseOptions(t, {
        title: 'Diagrama de dispersión', tooltip: ptTooltip(L),
        scales: { x: axis(t, L.x, bx), y: axis(t, L.y, by) }
      })
    });
  };

  draw.regression = function (canvas, M, L) {
    const t = theme();
    const { bx, by } = ranges(M, M.yhat.concat([M.yMin, M.yMax]));
    const lines = M.x.map((v, i) => ({ x1: v, y1: M.y[i], x2: v, y2: M.yhat[i], color: COL.sse, w: 2 }));
    make(canvas, {
      type: 'scatter',
      data: {
        datasets: [
          dataset('Datos (X; Y)', points(M), COL.navy),
          lineDs(eqLabel(M), [{ x: bx.min, y: M.b0 + M.b1 * bx.min }, { x: bx.max, y: M.b0 + M.b1 * bx.max }], COL.ssr),
          lineDs('Residuos e = Y − Ŷ (segmentos)', [], COL.sse, { borderDash: [] })
        ]
      },
      options: baseOptions(t, {
        title: 'Recta de mínimos cuadrados y residuos', tooltip: ptTooltip(L),
        ann: { lines },
        scales: { x: axis(t, L.x, bx), y: axis(t, L.y, by) }
      })
    });
  };

  draw.scatterTrend = draw.scatter;

  // Tres paneles: SST, SSR y SSE
  draw.panels = function (box, M, L) {
    const t = theme();
    const sel = box._sel === undefined ? -1 : box._sel;
    if (!box._canvases) {
      box.innerHTML = '';
      box.classList.add('panels');
      box._canvases = [0, 1, 2].map(() => {
        const wrap = document.createElement('div');
        wrap.className = 'panel-cell';
        const c = document.createElement('canvas');
        wrap.appendChild(c); box.appendChild(wrap);
        return c;
      });
    }
    const { bx, by } = ranges(M, M.yhat.concat([M.yMin, M.yMax]));
    const meanLine = { x1: bx.min, y1: M.ybar, x2: bx.max, y2: M.ybar, color: t.muted, w: 1.5, dash: [6, 4] };
    const meanText = { x: bx.max, y: M.ybar, text: 'Ȳ = ' + Fmt.n(M.ybar), color: t.text, align: 'right', base: 'bottom', dy: -3, font: '600 11px IBM Plex Sans, system-ui, sans-serif' };
    const specs = [
      { title: 'SST = Σ(Y − Ȳ)² = ' + Fmt.n(M.sst), color: COL.sst, from: M.y, to: M.x.map(() => M.ybar), showLine: false },
      { title: 'SSR = Σ(Ŷ − Ȳ)² = ' + Fmt.n(M.ssr), color: COL.ssr, from: M.yhat, to: M.x.map(() => M.ybar), showLine: true },
      { title: 'SSE = Σ(Y − Ŷ)² = ' + Fmt.n(M.sse), color: COL.sse, from: M.y, to: M.yhat, showLine: true }
    ];
    specs.forEach((sp, k) => {
      const lines = [meanLine].concat(M.x.map((v, i) => ({
        x1: v, y1: sp.from[i], x2: v, y2: sp.to[i], color: sp.color, w: i === sel ? 5 : 2.5
      })));
      const ds = [];
      if (sp.showLine) ds.push(lineDs('Recta Ŷ', [{ x: bx.min, y: M.b0 + M.b1 * bx.min }, { x: bx.max, y: M.b0 + M.b1 * bx.max }], k === 1 ? COL.ssr : t.muted, { borderWidth: k === 1 ? 2.5 : 1.5 }));
      const dsPoints = k === 1
        ? M.x.map((v, i) => ({ x: v, y: M.yhat[i] }))
        : points(M);
      ds.push(dataset(k === 1 ? 'Ŷ (sobre la recta)' : 'Y (datos)', dsPoints, k === 1 ? COL.ssr : COL.navy, {
        pointStyle: k === 1 ? 'rectRot' : 'circle',
        pointRadius: dsPoints.map((_, i) => (i === sel ? 9 : 5)),
        pointBorderColor: dsPoints.map((_, i) => (i === sel ? COL.amber : (k === 1 ? COL.ssr : COL.navy))),
        pointBorderWidth: dsPoints.map((_, i) => (i === sel ? 3 : 1))
      }));
      make(box._canvases[k], {
        type: 'scatter',
        data: { datasets: ds },
        options: Object.assign(baseOptions(t, {
          title: sp.title, legend: false, noAnim: true, tooltip: ptTooltip(L),
          ann: { lines, texts: [meanText] },
          scales: { x: axis(t, L.x, bx), y: axis(t, k === 0 ? L.y : '', by, k === 0 ? {} : {}) }
        }), {
          onClick: (evt, els, chart) => {
            const hit = chart.getElementsAtEventForMode(evt, 'nearest', { intersect: false }, true).filter(e => chart.data.datasets[e.datasetIndex].pointStyle !== undefined);
            if (!hit.length) return;
            const idx = hit[0].index;
            box._sel = idx;
            setTimeout(() => {
              withCtx(box, () => draw.panels(box, M, L));
              if (hooks.pick) hooks.pick(box, idx);
            }, 0);
          }
        })
      });
    });
    box._spec = { kind: 'panels', M, L };
  };

  draw.bars = function (canvas, M, L) {
    const t = theme();
    const vals = [M.sst, M.ssr, M.sse];
    const pcts = [1, M.ssr / M.sst, M.sse / M.sst];
    const names = ['SST (total)', 'SSR (explicada)', 'SSE (no explicada)'];
    const colors = [COL.sst, COL.ssr, COL.sse];
    const texts = vals.map((v, i) => ({
      x: i, y: v, text: Fmt.n(v) + ' (' + Fmt.pct(pcts[i], 1) + ')', color: t.text, base: 'bottom', dy: -4
    }));
    make(canvas, {
      type: 'bar',
      data: { labels: names, datasets: [{ label: 'Suma de cuadrados', data: vals, backgroundColor: colors, borderColor: colors, borderWidth: 1 }] },
      options: baseOptions(t, {
        title: 'Descomposición de la variación', legend: false,
        tooltip: { callbacks: { label: c => Fmt.n(c.parsed.y) + ' (' + Fmt.pct(pcts[c.dataIndex], 2) + ' de SST)' } },
        ann: { texts },
        scales: {
          x: { type: 'category', ticks: { color: t.text, font: { weight: '600' } }, grid: { display: false } },
          y: axis(t, 'Suma de cuadrados', null, { beginAtZero: true, grace: '14%' })
        }
      })
    });
  };

  draw.residuals = function (canvas, M, L) {
    const t = theme();
    const rMax = Math.max.apply(null, M.e.map(Math.abs)) || 1;
    const by = bounds(-rMax, rMax);
    const bx = bounds(M.xMin, M.xMax);
    const lines = [{ x1: bx.min, y1: 0, x2: bx.max, y2: 0, color: t.text, w: 1.5 }]
      .concat(M.x.map((v, i) => ({ x1: v, y1: 0, x2: v, y2: M.e[i], color: COL.sse, w: 1.2, dash: [3, 3] })));
    make(canvas, {
      type: 'scatter',
      data: { datasets: [dataset('Residuo e = Y − Ŷ', M.x.map((v, i) => ({ x: v, y: M.e[i] })), COL.sse, { pointStyle: 'triangle', pointRadius: 6 })] },
      options: baseOptions(t, {
        title: 'Residuos frente a X', tooltip: ptTooltip(L),
        ann: { lines, texts: [{ x: bx.max, y: 0, text: 'e = 0', color: t.text, align: 'right', base: 'bottom', dy: -3 }] },
        scales: { x: axis(t, L.x, bx), y: axis(t, 'Residuo e (' + (L.uy || 'unidades de Y') + ')', by) }
      })
    });
  };

  // Distribución t o F con regiones de rechazo
  draw.dist = function (canvas, M, L, o) {
    const t = theme();
    let xmin, xmax, pdf;
    if (o.kind === 't') {
      const cm = Math.max(o.crit.lo != null ? -o.crit.lo : 0, o.crit.hi || 0);
      xmax = Math.ceil(Math.max(4, cm * 1.35));
      xmin = -xmax;
      pdf = x => Stats.tPdf(x, o.df);
    } else {
      xmax = Math.ceil(Math.max(o.crit.hi * 2.2, 5));
      xmin = 0;
      pdf = x => Stats.fPdf(x, o.df1, o.df2);
    }
    const N = 400;
    const xs = [];
    for (let i = 0; i <= N; i++) xs.push(Math.max(xmin + (xmax - xmin) * i / N, o.kind === 'F' ? xmax * 0.003 : -Infinity));
    const curve = xs.map(x => ({ x, y: pdf(x) }));
    const ymax = Math.max.apply(null, curve.filter(p => o.kind === 't' || p.x >= xmax * 0.03).map(p => p.y)) * 1.12;
    const seg = (a, b) => {
      const out = [{ x: a, y: 0 }];
      curve.forEach(p => { if (p.x > a && p.x < b) out.push(p); });
      out.push({ x: b, y: 0 });
      return out.map(p => ({ x: p.x, y: p.x === a || p.x === b ? Math.min(pdf(p.x), ymax) : p.y }));
    };
    const lo = o.crit.lo, hi = o.crit.hi;
    const fillDs = (label, data, color, hidden) => ({
      type: 'scatter', label, data, showLine: true, fill: 'origin', borderWidth: 0, pointRadius: 0, pointHoverRadius: 0,
      backgroundColor: color, borderColor: color, _hide: hidden
    });
    const datasets = [];
    const keepFrom = lo != null ? lo : xmin, keepTo = hi != null ? hi : xmax;
    datasets.push(fillDs('Región de no rechazo de H₀', seg(keepFrom, keepTo), 'rgba(46,125,50,0.16)'));
    if (hi != null) datasets.push(fillDs('Región de rechazo de H₀ (α = ' + Fmt.n(o.alpha) + ')', seg(hi, xmax), 'rgba(216,67,21,0.45)'));
    if (lo != null) datasets.push(fillDs('Región de rechazo de H₀ (α = ' + Fmt.n(o.alpha) + ')', seg(xmin, lo), 'rgba(216,67,21,0.45)', hi != null));
    datasets.push(lineDs(o.kind === 't' ? 'Distribución t (gl = ' + o.df + ')' : 'Distribución F (gl = ' + o.df1 + '; ' + o.df2 + ')', curve, COL.navy, { borderWidth: 2.5 }));

    const lines = [], texts = [], arrows = [];
    const sym = o.symbol;
    const critText = v => (v < 0 ? '−' : '') + Fmt.n(Math.abs(v));
    [lo, hi].forEach(c => {
      if (c == null) return;
      lines.push({ x1: c, y1: 0, x2: c, y2: ymax * 0.8, color: COL.crit, w: 2, dash: [6, 4] });
      texts.push({ x: c, y: ymax * 0.84, text: 'crítico ' + critText(c), color: COL.crit, bg: t.bg, base: 'middle' });
    });
    const sIn = o.stat >= xmin && o.stat <= xmax && isFinite(o.stat);
    if (sIn) {
      lines.push({ x1: o.stat, y1: 0, x2: o.stat, y2: ymax * 0.62, color: t.text, w: 3 });
      texts.push({ x: o.stat, y: ymax * 0.67, text: sym + ' = ' + Fmt.n(o.stat), color: t.text, bg: t.bg, font: '700 12px IBM Plex Sans, system-ui, sans-serif' });
    } else if (o.stat > xmax || o.stat === Infinity) {
      const span = xmax - xmin;
      arrows.push({ x1: xmax - span * 0.16, y1: ymax * 0.36, x2: xmax - span * 0.008, y2: ymax * 0.36, color: t.text });
      texts.push({ x: xmax - span * 0.008, y: ymax * 0.44, text: sym + ' = ' + Fmt.n(o.stat), color: t.text, align: 'right', font: '700 12px IBM Plex Sans, system-ui, sans-serif' });
      texts.push({ x: xmax - span * 0.008, y: ymax * 0.28, text: 'fuera de la escala', color: t.muted, align: 'right', font: '400 11px IBM Plex Sans, system-ui, sans-serif' });
    } else {
      const span = xmax - xmin;
      arrows.push({ x1: xmin + span * 0.16, y1: ymax * 0.36, x2: xmin + span * 0.008, y2: ymax * 0.36, color: t.text });
      texts.push({ x: xmin + span * 0.008, y: ymax * 0.44, text: sym + ' = ' + Fmt.n(o.stat), color: t.text, align: 'left', font: '700 12px IBM Plex Sans, system-ui, sans-serif' });
      texts.push({ x: xmin + span * 0.008, y: ymax * 0.28, text: 'fuera de la escala', color: t.muted, align: 'left', font: '400 11px IBM Plex Sans, system-ui, sans-serif' });
    }

    make(canvas, {
      type: 'scatter',
      data: { datasets },
      options: baseOptions(t, {
        title: o.title, box: true,
        legendFilter: (item, data) => {
          const ds = data.datasets[item.datasetIndex];
          return !ds._hide && data.datasets.findIndex(d => d.label === ds.label) === item.datasetIndex;
        },
        tooltip: { enabled: false },
        ann: { lines, texts, arrows },
        scales: {
          x: axis(t, o.xTitle, { min: xmin, max: xmax, step: niceStep(xmax - xmin, 8) }),
          y: axis(t, 'Densidad', { min: 0, max: ymax }, { ticks: { display: false }, grid: { display: false } })
        }
      })
    });
  };

  // Recta con bandas de confianza y de predicción
  draw.bands = function (canvas, M, L) {
    const t = theme();
    const lo0 = Math.min(M.xMin, M.xPred), hi0 = Math.max(M.xMax, M.xPred);
    const R = hi0 - lo0 || 1;
    const a = lo0 - R * 0.06, b = hi0 + R * 0.06;
    const N = 60;
    const gx = [], bandAt = [];
    for (let i = 0; i <= N; i++) { const v = a + (b - a) * i / N; gx.push(v); bandAt.push(M.band(v)); }
    const ys = bandAt.map(q => q.pi[0]).concat(bandAt.map(q => q.pi[1]), [M.yMin, M.yMax]);
    const by = bounds(Math.min.apply(null, ys), Math.max.apply(null, ys));
    const bx = bounds(a, b);
    const pr = M.pred;
    const ds = [
      lineDs('Banda de predicción (IP de un valor individual)', gx.map((x, i) => ({ x, y: bandAt[i].pi[1] })), 'rgba(239,108,0,0.6)', { fill: '+1', backgroundColor: 'rgba(239,108,0,0.16)', borderWidth: 1.5, borderDash: [5, 4] }),
      lineDs('IP inferior', gx.map((x, i) => ({ x, y: bandAt[i].pi[0] })), 'rgba(239,108,0,0.6)', { borderWidth: 1.5, borderDash: [5, 4] }),
      lineDs('Banda de confianza (IC de la media de Y)', gx.map((x, i) => ({ x, y: bandAt[i].ci[1] })), 'rgba(0,137,123,0.8)', { fill: '+1', backgroundColor: 'rgba(0,137,123,0.25)', borderWidth: 1.5 }),
      lineDs('IC inferior', gx.map((x, i) => ({ x, y: bandAt[i].ci[0] })), 'rgba(0,137,123,0.8)', { borderWidth: 1.5 }),
      lineDs('Recta de regresión', [{ x: a, y: M.b0 + M.b1 * a }, { x: b, y: M.b0 + M.b1 * b }], COL.navy, { borderWidth: 2.5 }),
      dataset('Datos (X; Y)', points(M), COL.navy),
      dataset('Ŷ en X = ' + Fmt.n(pr.x), [{ x: pr.x, y: pr.yhat }], COL.amber, { pointStyle: 'star', pointRadius: 10, pointBorderColor: t.text, pointBorderWidth: 1.5 })
    ];
    const lines = [
      { x1: pr.x, y1: pr.pi[0], x2: pr.x, y2: pr.pi[1], color: COL.pi, w: 5 },
      { x1: pr.x, y1: pr.ci[0], x2: pr.x, y2: pr.ci[1], color: COL.ci, w: 5 }
    ];
    make(canvas, {
      type: 'scatter',
      data: { datasets: ds },
      options: baseOptions(t, {
        title: 'Bandas de confianza y de predicción', box: true, tooltip: ptTooltip(L),
        legendFilter: item => [0, 2, 4, 5, 6].indexOf(item.datasetIndex) >= 0,
        ann: { lines },
        scales: { x: axis(t, L.x, bx), y: axis(t, L.y, by) }
      })
    });
  };

  // ---------- API ----------
  function mount(el, kind, M, L, extra) {
    if (!draw[kind]) return;
    el._spec = { kind, M, L, extra };
    withCtx(el, () => draw[kind](el, M, L, extra));
    if (kind !== 'panels') live.add(el);
  }

  function redrawAll() {
    document.querySelectorAll('[data-chart]').forEach(el => {
      if (el._spec) {
        withCtx(el, () => draw[el._spec.kind](el, el._spec.M, el._spec.L, el._spec.extra));
      }
    });
  }

  function resizeAll() {
    document.querySelectorAll('[data-chart] canvas, canvas[data-chart]').forEach(c => { if (c._chart) c._chart.resize(); });
  }

  function destroyAll() {
    document.querySelectorAll('canvas').forEach(c => { if (c._chart) { c._chart.destroy(); c._chart = null; } });
    live.clear();
  }

  function download(href, name) {
    const a = document.createElement('a');
    a.href = href; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
  }

  function exportPNG(box, name) {
    const cs = Array.from(box.querySelectorAll('canvas')).filter(c => c._chart);
    if (!cs.length) return;
    if (cs.length === 1) { download(cs[0].toDataURL('image/png'), name + '.png'); return; }
    const horizontal = cs[1].getBoundingClientRect().left > cs[0].getBoundingClientRect().left + 5;
    const W = horizontal ? cs.reduce((s, c) => s + c.width, 0) : Math.max.apply(null, cs.map(c => c.width));
    const H = horizontal ? Math.max.apply(null, cs.map(c => c.height)) : cs.reduce((s, c) => s + c.height, 0);
    const out = document.createElement('canvas');
    out.width = W; out.height = H;
    const ctx = out.getContext('2d');
    ctx.fillStyle = theme().bg; ctx.fillRect(0, 0, W, H);
    let off = 0;
    cs.forEach(c => {
      if (horizontal) { ctx.drawImage(c, off, 0); off += c.width; } else { ctx.drawImage(c, 0, off); off += c.height; }
    });
    download(out.toDataURL('image/png'), name + '.png');
  }

  return { COL, mount, redrawAll, resizeAll, destroyAll, exportPNG, hooks };
})();
