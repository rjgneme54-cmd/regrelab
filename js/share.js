const Share = (function () {
  'use strict';

  // ---------- codificación del ejercicio en la URL ----------
  function toB64Url(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = '';
    bytes.forEach(b => { bin += String.fromCharCode(b); });
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function fromB64Url(s) {
    let b = s.replace(/-/g, '+').replace(/_/g, '/');
    while (b.length % 4) b += '=';
    const bin = atob(b);
    const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  function encode(S) {
    const rows = S.rows.filter(r => String(r[0]).trim() !== '' || String(r[1]).trim() !== '').map(r => [String(r[0]).trim(), String(r[1]).trim()]);
    return toB64Url(JSON.stringify({
      v: 1, xn: S.xName, xu: S.xUnit, yn: S.yName, yu: S.yUnit, r: rows,
      a: S.alpha, c: S.conf, d: S.dec, p: S.xPred, t: S.tail, s: S.ts ? 1 : 0
    }));
  }

  function decode(hash) {
    const m = /(?:^|[#&])d=([A-Za-z0-9_-]+)/.exec(hash || '');
    if (!m) return null;
    try {
      const o = JSON.parse(fromB64Url(m[1]));
      if (!o || !Array.isArray(o.r)) return null;
      return {
        xName: String(o.xn || ''), xUnit: String(o.xu || ''), yName: String(o.yn || ''), yUnit: String(o.yu || ''),
        rows: o.r.map(r => [String(r[0]), String(r[1])]),
        alpha: Number(o.a) || 0.05, conf: Number(o.c) || 0.95, dec: Number(o.d) || 4,
        xPred: o.p === undefined || o.p === null ? '' : String(o.p),
        tail: ['two', 'right', 'left'].indexOf(o.t) >= 0 ? o.t : 'two', ts: !!o.s
      };
    } catch (e) {
      return null;
    }
  }

  function link(S) {
    const base = location.href.split('#')[0];
    return base + '#d=' + encode(S);
  }

  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
      ta.remove();
      return ok;
    }
  }

  async function nativeShare(S, title, text) {
    if (!navigator.share) return false;
    try {
      await navigator.share({ title, text, url: link(S) });
      return true;
    } catch (e) {
      return false;
    }
  }

  // ---------- CSV ----------
  const label = (name, unit, def) => (name.trim() || def) + (unit.trim() ? ' (' + unit.trim() + ')' : '');

  function toCSV(S) {
    const lines = [label(S.xName, S.xUnit, 'X') + ';' + label(S.yName, S.yUnit, 'Y')];
    S.rows.forEach(r => {
      if (String(r[0]).trim() === '' && String(r[1]).trim() === '') return;
      lines.push(String(r[0]).trim().replace('.', ',') + ';' + String(r[1]).trim().replace('.', ','));
    });
    return lines.join('\r\n');
  }

  function download(filename, text, mime) {
    const blob = new Blob(['﻿' + text], { type: (mime || 'text/csv') + ';charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function splitLabel(cell) {
    const m = /^(.*?)\s*\((.*)\)\s*$/.exec(cell.trim());
    return m ? { name: m[1].trim(), unit: m[2].trim() } : { name: cell.trim(), unit: '' };
  }

  // Interpreta texto pegado o un CSV con dos columnas (si hay más, se usan las dos últimas)
  function parseTable(text) {
    const lines = String(text).replace(/\r/g, '').split('\n').map(l => l.trim()).filter(l => l !== '');
    if (!lines.length) return { rows: [] };
    let split;
    if (lines.some(l => l.indexOf('\t') >= 0)) split = l => l.split('\t');
    else if (lines.some(l => l.indexOf(';') >= 0)) split = l => l.split(';');
    else if (lines.some(l => /\S\s+\S/.test(l))) split = l => l.split(/\s+/);
    else split = l => l.split(',');
    const table = lines.map(l => split(l).map(c => c.trim().replace(/^"|"$/g, '')));
    const last2 = cells => (cells.length >= 2 ? [cells[cells.length - 2], cells[cells.length - 1]] : null);
    const out = { rows: [] };
    let start = 0;
    const first = last2(table[0]);
    if (first && (isNaN(Fmt.parse(first[0])) || isNaN(Fmt.parse(first[1])))) {
      const a = splitLabel(first[0]), b = splitLabel(first[1]);
      out.xName = a.name; out.xUnit = a.unit; out.yName = b.name; out.yUnit = b.unit;
      start = 1;
    }
    for (let i = start; i < table.length; i++) {
      const c = last2(table[i]);
      if (c) out.rows.push([c[0], c[1]]);
    }
    return out;
  }

  return { encode, decode, link, copy, nativeShare, toCSV, download, parseTable };
})();
