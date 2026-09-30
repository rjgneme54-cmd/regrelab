(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.QR = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  let cb = { copy: null, toast() {} };
  let current = null;

  // ---------- codificación (sin DOM) ----------

  // Devuelve { q, level } con el código más chico que entra; null si el texto no cabe
  function encode(text) {
    const gen = typeof qrcode !== 'undefined' ? qrcode : null;
    if (!gen || !text) return null;
    const levels = ['M', 'L'];
    for (let i = 0; i < levels.length; i++) {
      try {
        const q = gen(0, levels[i]);
        q.addData(text);
        q.make();
        return { q, level: levels[i] };
      } catch (e) { /* no entra con este nivel de corrección: se prueba el siguiente */ }
    }
    return null;
  }

  // Matriz de módulos (true = oscuro) y versión
  function matrix(text) {
    const r = encode(text);
    if (!r) return null;
    const count = r.q.getModuleCount();
    const rows = [];
    for (let y = 0; y < count; y++) {
      const row = [];
      for (let x = 0; x < count; x++) row.push(r.q.isDark(y, x));
      rows.push(row);
    }
    return { rows, count, version: (count - 17) / 4, level: r.level };
  }

  // SVG negro sobre blanco con margen de 4 módulos (siempre con esos colores: es lo que mejor leen las cámaras)
  function svg(text, px) {
    const m = matrix(text);
    if (!m) return null;
    const quiet = 4, size = m.count + quiet * 2;
    let d = '';
    for (let y = 0; y < m.count; y++) {
      let x = 0;
      while (x < m.count) {
        if (!m.rows[y][x]) { x++; continue; }
        let run = 0;
        while (x + run < m.count && m.rows[y][x + run]) run++;
        d += 'M' + (x + quiet) + ' ' + (y + quiet) + 'h' + run + 'v1h-' + run + 'z';
        x += run;
      }
    }
    const dim = px ? ' width="' + px + '" height="' + px + '"' : '';
    return {
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + size + ' ' + size + '"' + dim + ' shape-rendering="crispEdges" role="img" aria-label="Código QR"><rect width="' + size + '" height="' + size + '" fill="#fff"/><path d="' + d + '" fill="#000"/></svg>',
      version: m.version, count: m.count, level: m.level
    };
  }

  // ---------- diálogo ----------

  const $ = s => document.querySelector(s);

  function download(name, href) {
    const a = document.createElement('a');
    a.href = href; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
  }

  function savePng() {
    if (!current) return;
    const s = svg(current.link, 1024);
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = c.height = 1024;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 1024, 1024);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, 1024, 1024);
      download('regrelab-qr.png', c.toDataURL('image/png'));
      cb.toast('Imagen del código QR descargada.');
    };
    img.onerror = () => cb.toast('No se pudo generar la imagen.');
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s.svg);
  }

  // opts: { title, link, note }
  function show(opts) {
    const r = svg(opts.link);
    if (!r) {
      cb.toast('El enlace es demasiado largo para un código QR. Reduce la cantidad de datos o comparte el enlace por otro medio.');
      return false;
    }
    current = { link: opts.link };
    $('#qr-title').textContent = opts.title || 'RegreLab';
    $('#qr-img').innerHTML = r.svg;
    const len = opts.link.length;
    $('#qr-link').textContent = len > 90 ? opts.link.slice(0, 60) + '… (' + len + ' caracteres)' : opts.link;
    const dense = r.version >= 18;
    $('#qr-note').textContent = (opts.note || '') + (dense ? ' Este código es muy denso: proyéctalo lo más grande posible y pide que se acerquen con la cámara.' : '');
    $('#qr-full').hidden = !document.fullscreenEnabled;
    $('#dlg-qr').showModal();
    return true;
  }

  function init(callbacks) {
    cb = Object.assign(cb, callbacks);
    const dlg = $('#dlg-qr');
    $('#qr-copy').addEventListener('click', () => {
      if (current && cb.copy) cb.copy(current.link).then(ok => cb.toast(ok ? 'Enlace copiado.' : 'No se pudo copiar.'));
    });
    $('#qr-png').addEventListener('click', savePng);
    $('#qr-full').addEventListener('click', () => {
      if (document.fullscreenElement) document.exitFullscreen();
      else if (dlg.requestFullscreen) dlg.requestFullscreen().catch(() => cb.toast('Este navegador no permite la pantalla completa aquí.'));
    });
    $('#qr-close').addEventListener('click', () => dlg.close());
    dlg.addEventListener('close', () => { if (document.fullscreenElement) document.exitFullscreen(); });
  }

  return { encode, matrix, svg, show, init };
});
