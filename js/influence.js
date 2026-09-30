(function (root, factory) {
  const api = factory(typeof module === 'object' && module.exports ? require('./stats.js') : root.Stats);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Influence = api;
})(typeof self !== 'undefined' ? self : this, function (Stats) {
  'use strict';

  // ---------- cálculo (sin DOM) ----------

  // Vuelve a ajustar la recta sin los puntos excluidos (índices sobre M.x). null si no se puede.
  function without(M, excluded) {
    const keep = M.x.map((_, i) => i).filter(i => excluded.indexOf(i) < 0);
    if (keep.length < 3) return null;
    const x = keep.map(i => M.x[i]), y = keep.map(i => M.y[i]);
    if (x.every(v => v === x[0])) return null;
    return Stats.analyze(x, y, { alpha: M.opts.alpha, conf: M.opts.conf, tail: M.opts.tail, xPred: M.xPred, timeOrdered: M.opts.timeOrdered });
  }

  // Cuánto cambia la pendiente al quitar cada punto por separado
  function influence(M) {
    return M.x.map((_, i) => {
      const sub = without(M, [i]);
      return sub ? { i, db1: sub.b1 - M.b1, rel: Math.abs(sub.b1 - M.b1) / (Math.abs(M.b1) || 1), r2: sub.r2, reject: sub.tSlopeTest.reject, sub } : { i, db1: NaN, rel: 0, r2: NaN, reject: null, sub: null };
    });
  }

  // Punto más influyente si su efecto es notable (cambia mucho la pendiente, r² o la decisión)
  function mostInfluential(M, infl) {
    let best = null;
    infl.forEach(o => {
      if (!o.sub) return;
      const score = o.rel + Math.abs(o.r2 - M.r2) + (o.reject !== M.tSlopeTest.reject ? 1 : 0);
      if (!best || score > best.score) best = { i: o.i, score };
    });
    return best && best.score > 0.15 ? best.i : -1;
  }

  // ---------- interfaz ----------

  function mount(el, M, S, L, hooks) {
    const { n, esc } = Fmt;
    const infl = influence(M);
    const top = mostInfluential(M, infl);
    const excluded = [];
    const hk = hooks || {};

    const dec = m => (m.tSlopeTest.reject ? 'Se rechaza H₀' : 'No se rechaza H₀');
    const low = m => dec(m).charAt(0).toLowerCase() + dec(m).slice(1);
    const pv = m => Fmt.p(m.tSlopeTest.p);

    function summary(sub) {
      if (!excluded.length) return '<p class="small">Marca uno o más puntos para ver cómo cambia todo. El más influyente está señalado.</p>';
      if (!sub) return '<div class="warn"><span class="ic">' + Icons.svg('warn') + '</span><div><p>No se puede ajustar una recta con los puntos que quedan: hacen falta al menos 3 datos y que X tome dos valores distintos.</p></div></div>';
      const same = sub.tSlopeTest.reject === M.tSlopeTest.reject;
      return '<div class="interp"><div class="lab">' + Icons.svg('note') + 'Qué cambió</div><div class="body"><p>Al excluir ' + (excluded.length === 1 ? 'el punto ' + (excluded[0] + 1) : 'los ' + excluded.length + ' puntos marcados') + ': la pendiente pasa de <strong>' + n(M.b1) + '</strong> a <strong>' + n(sub.b1) +
        '</strong> y r² de <strong>' + n(M.r2) + '</strong> a <strong>' + n(sub.r2) + '</strong>. ' +
        (same ? 'La conclusión de la prueba <strong>no cambia</strong>: ' + low(sub) + '.'
          : 'La conclusión <strong>cambia</strong>: antes «' + low(M) + '», ahora «' + low(sub) + '».') + '</p></div></div>';
    }

    function render(focusIdx) {
      el.querySelectorAll('canvas').forEach(c => { if (c._chart) { c._chart.destroy(); c._chart = null; } });
      const sub = excluded.length ? without(M, excluded) : null;
      const rows = M.x.map((v, i) => {
        const o = infl[i], on = excluded.indexOf(i) >= 0;
        return '<tr class="' + (i === top ? 'infl' : '') + (on ? ' off' : '') + '"><td class="chk"><label><input type="checkbox" data-i="' + i + '"' + (on ? ' checked' : '') + ' aria-label="Excluir el punto ' + (i + 1) + '"></label></td>' +
          '<td>' + (i + 1) + '</td><td>' + n(v) + '</td><td>' + n(M.y[i]) + '</td><td class="c-res">' + n(M.stdRes[i], 2) + '</td><td>' + (o.sub ? n(o.db1, 2) : '—') + '</td><td>' + (o.sub ? n(o.r2, 2) : '—') + '</td><td class="c-tag">' + (i === top ? '<span class="tagx">Más influyente</span>' : '') + '</td></tr>';
      }).join('');
      const cmp = sub
        ? '<div class="tbl-wrap"><table class="tbl cmp-t"><thead><tr><th></th><th>Con todos los datos</th><th>Sin los excluidos</th></tr></thead><tbody>' +
          [['n', M.n, sub.n], ['b₀', n(M.b0), n(sub.b0)], ['b₁ (pendiente)', n(M.b1), n(sub.b1)], ['r', n(M.r), n(sub.r)], ['r²', n(M.r2), n(sub.r2)], ['S_YX', n(M.syx), n(sub.syx)],
            ['t (pendiente)', n(M.tSlope), n(sub.tSlope)], ['valor-p', pv(M), pv(sub)], ['Decisión (α = ' + n(S.alpha) + ')', dec(M), dec(sub)]]
            .map(r => '<tr><td>' + r[0] + '</td><td>' + r[1] + '</td><td>' + r[2] + '</td></tr>').join('') + '</tbody></table></div>'
        : '';
      el.innerHTML =
        '<p>Un solo punto puede cambiar la recta, el r² y hasta la conclusión de la prueba. Marca los puntos que quieras <strong>excluir</strong> y compara.</p>' +
        '<div class="tbl-wrap"><table class="tbl excl-tbl"><thead><tr><th>Excluir</th><th>N.º</th><th title="' + esc(L.x) + '">X</th><th title="' + esc(L.y) + '">Y</th><th class="c-res">Residuo est.</th><th>Δb₁</th><th>r² sin él</th><th class="c-tag"></th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
        '<p class="small">X = ' + esc(L.x) + '; Y = ' + esc(L.y) + '. Δb₁ es cuánto cambia la pendiente al quitar ese punto.' + (top >= 0 ? ' La fila resaltada es el punto más influyente.' : ' Ningún punto cambia mucho la recta.') + '</p>' +
        '<div class="btn-row excl-btns">' +
        (top >= 0 ? '<button type="button" class="btn small" data-x="top">' + Icons.svg('target') + 'Excluir el más influyente (punto ' + (top + 1) + ')</button>' : '') +
        '<button type="button" class="btn small ghost" data-x="reset"' + (excluded.length ? '' : ' disabled') + '>' + Icons.svg('reset') + 'Incluir todos</button>' +
        (hk.apply ? '<button type="button" class="btn small ghost excl-apply" data-x="apply"' + (sub ? '' : ' disabled') + '>' + Icons.svg('trash') + 'Quitarlos de la tabla de datos</button>' : '') + '</div>' +
        '<figure class="chartbox" data-name="regrelab-exclusion"><figcaption><span>Recta con y sin los puntos excluidos</span><button class="btn small ghost png-btn" type="button">' + Icons.svg('download') + 'PNG</button></figcaption>' +
        '<div class="chart-canvas"><canvas role="img" aria-label="Recta con y sin los puntos excluidos"></canvas></div></figure>' +
        summary(sub) + cmp +
        '<div class="note"><span class="ic">' + Icons.svg('info') + '</span><div><p><strong>Cuidado.</strong> Excluir un dato solo se justifica si hay una razón concreta (un error de carga, un caso que no pertenece a la población estudiada). Descartar puntos solo porque «no encajan» distorsiona los resultados.</p></div></div>';
      const cv = el.querySelector('canvas');
      cv.dataset.chart = 'exclude';
      Charts.mount(cv, 'exclude', M, L, { excluded: excluded.slice(), sub });
      if (focusIdx !== undefined) { const c = el.querySelector('input[data-i="' + focusIdx + '"]'); if (c) c.focus(); }
    }

    el.onchange = e => {
      const c = e.target.closest('input[data-i]');
      if (!c) return;
      const i = +c.dataset.i;
      const k = excluded.indexOf(i);
      if (c.checked && k < 0) excluded.push(i); else if (!c.checked && k >= 0) excluded.splice(k, 1);
      excluded.sort((a, b) => a - b);
      render(i);
    };
    el.onclick = e => {
      const b = e.target.closest('[data-x]');
      if (!b || b.disabled) return;
      if (b.dataset.x === 'top' && top >= 0) { excluded.length = 0; excluded.push(top); render(); }
      if (b.dataset.x === 'reset') { excluded.length = 0; render(); }
      if (b.dataset.x === 'apply' && hk.apply) hk.apply(excluded.slice());
    };
    render();
  }

  return { without, influence, mostInfluential, mount };
});
