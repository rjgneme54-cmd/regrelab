const Fmt = (function () {
  'use strict';

  let decimals = 4;

  function group(intStr) {
    return intStr.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  // Número con coma decimal y punto de miles. Si el valor es exacto en la precisión pedida, se omiten ceros sobrantes.
  function n(v, d) {
    if (v === null || v === undefined || Number.isNaN(v)) return '—';
    if (v === Infinity) return '∞';
    if (v === -Infinity) return '−∞';
    const dec = d === undefined ? decimals : d;
    const exact = Math.abs(v - Math.round(v * Math.pow(10, dec)) / Math.pow(10, dec)) < 1e-9;
    let s = Math.abs(v).toFixed(dec);
    if (exact && s.indexOf('.') >= 0) s = s.replace(/0+$/, '').replace(/\.$/, '');
    let [i, f] = s.split('.');
    const neg = v < 0 && Number(s) !== 0;
    return (neg ? '−' : '') + group(i) + (f ? ',' + f : '');
  }

  const pct = (v, d) => n(v * 100, d === undefined ? 2 : d) + ' %';

  function p(v) {
    if (Number.isNaN(v)) return '—';
    const lim = Math.pow(10, -decimals);
    if (v < lim && v >= 0) return '< ' + n(lim, decimals);
    return n(v, decimals);
  }

  // Número para KaTeX: coma decimal sin espacio
  function tex(v, d) {
    if (v === Infinity) return '\\infty';
    if (v === -Infinity) return '-\\infty';
    return n(v, d).replace('−', '-').replace(',', '{,}');
  }

  // Igual que tex(), pero entre paréntesis si es negativo
  function texp(v, d) {
    return v < 0 && Number(Math.abs(v).toFixed(d === undefined ? decimals : d)) !== 0 ? '\\left(' + tex(v, d) + '\\right)' : tex(v, d);
  }

  // Signo explícito para sumar/restar un término: "+ 2{,}5" / "- 2{,}5"
  function signed(v, d) {
    return (v < 0 ? '- ' : '+ ') + tex(Math.abs(v), d);
  }

  // Interpreta "3,5", "3.5", "1.234,5", "1,234.5"
  function parse(str) {
    if (typeof str === 'number') return str;
    let s = String(str === undefined || str === null ? '' : str).trim().replace(/\s/g, '').replace('−', '-');
    if (s === '' || !/^[+-]?[\d.,]+$/.test(s)) return NaN;
    const lc = s.lastIndexOf(','), ld = s.lastIndexOf('.');
    if (lc >= 0 && ld >= 0) {
      if (lc > ld) s = s.replace(/\./g, '').replace(',', '.');
      else s = s.replace(/,/g, '');
    } else if (lc >= 0) {
      if ((s.match(/,/g) || []).length > 1) s = s.replace(/,/g, '');
      else s = s.replace(',', '.');
    } else if ((s.match(/\./g) || []).length > 1) s = s.replace(/\./g, '');
    const v = Number(s);
    return Number.isFinite(v) ? v : NaN;
  }

  function K(t, display) {
    try {
      return katex.renderToString(t, { displayMode: !!display, throwOnError: false, strict: false });
    } catch (e) {
      return '<code>' + t + '</code>';
    }
  }

  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // Mini-marcado: **negrita**, $tex$ en línea, $$tex$$ en bloque, saltos de párrafo con línea vacía
  function md(text) {
    const parts = String(text).split(/\n\s*\n/).map(par => {
      let h = par.replace(/\$\$([^$]+)\$\$/g, (_, t) => '\u0001' + K(t, true) + '\u0002')
        .replace(/\$([^$]+)\$/g, (_, t) => '\u0001' + K(t, false) + '\u0002');
      const segs = h.split(/[\u0001\u0002]/);
      h = segs.map((sgm, i) => (i % 2 ? sgm : esc(sgm).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>'))).join('');
      return h.indexOf('katex-display') >= 0 ? h : '<p>' + h + '</p>';
    });
    return parts.join('');
  }

  return {
    n, pct, p, tex, texp, signed, parse, K, esc, md,
    setDecimals: d => { decimals = d; },
    get decimals() { return decimals; }
  };
})();
