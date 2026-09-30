const Icons = (function () {
  'use strict';

  // Trazos de 24 × 24, línea de 1,7 px, extremos redondeados
  const P = {
    data: '<rect x="3.5" y="4.5" width="17" height="15" rx="1.5"/><path d="M3.5 10h17M3.5 15h17M9.5 4.5v15"/>',
    results: '<path d="M18 5.5H6.5l6 6.5-6 6.5H18"/>',
    graphs: '<path d="M4 4v16h16"/><circle cx="8.5" cy="14.5" r="1.1"/><circle cx="12" cy="11.5" r="1.1"/><circle cx="16.2" cy="8.5" r="1.1"/><path d="M6.5 16l11-8.5"/>',
    learn: '<path d="M4 5.5c2.5-1 5-1 8 .8 3-1.8 5.5-1.8 8-.8v13c-2.5-1-5-1-8 .8-3-1.8-5.5-1.8-8-.8z"/><path d="M12 6.3v13"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.6a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1.1 1-1.1 1.7"/><path d="M12 17h.01"/>',
    moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
    sun: '<circle cx="12" cy="12" r="3.8"/><path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.5 1.5M16.9 16.9l1.5 1.5M18.4 5.6l-1.5 1.5M7.1 16.9l-1.5 1.5"/>',
    share: '<circle cx="6" cy="12" r="2.2"/><circle cx="17.5" cy="6" r="2.2"/><circle cx="17.5" cy="18" r="2.2"/><path d="M8 11l7.5-4M8 13l7.5 4"/>',
    print: '<path d="M7 9V4h10v5"/><rect x="4" y="9" width="16" height="8" rx="1.5"/><path d="M7 14h10v6H7z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    trash: '<path d="M5 7h14M10 7V4.5h4V7M7 7l1 12.5h8L17 7"/>',
    upload: '<path d="M12 15V4M7.5 8.5L12 4l4.5 4.5"/><path d="M4.5 15v4.5h15V15"/>',
    download: '<path d="M12 4v11M7.5 10.5L12 15l4.5-4.5"/><path d="M4.5 15v4.5h15V15"/>',
    paste: '<rect x="6" y="5" width="12" height="15.5" rx="1.5"/><path d="M9.5 5V3.5h5V5M9 11h6M9 15h6"/>',
    flask: '<path d="M9.5 4h5M10.5 4v5.5L5.5 18a1.5 1.5 0 0 0 1.3 2.2h10.4a1.5 1.5 0 0 0 1.3-2.2l-5-8.5V4"/><path d="M8 15h8"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    warn: '<path d="M12 4l9 15.5H3z"/><path d="M12 10v4.5M12 17.2h.01"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.8h.01"/>',
    note: '<path d="M5 4.5h14v11H10l-5 4z"/><path d="M8.5 9h7M8.5 12h4.5"/>',
    chev: '<path d="M6 9.5l6 6 6-6"/>',
    copy: '<rect x="8.5" y="8.5" width="11" height="11" rx="1.5"/><path d="M15.5 8.5V5.5a1 1 0 0 0-1-1h-9a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h3"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r=".6"/>',
    shield: '<path d="M12 3.5l7 2.5v5.5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/><path d="M9 12l2.3 2.3L15.5 10"/>',
    road: '<path d="M8 20L10 4M16 20L14 4M12 6v2.5M12 11v2.5M12 16v2.5"/>',
    hash: '<path d="M9.5 4L8 20M16 4l-1.5 16M4.5 9h15M4 15h15"/>',
    spark: '<path d="M12 4v4M12 16v4M4 12h4M16 12h4M6.5 6.5l2.5 2.5M15 15l2.5 2.5M17.5 6.5L15 9M9 15l-2.5 2.5"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
    reset: '<path d="M5 12a7 7 0 1 0 2.2-5.1"/><path d="M5 5v4.5h4.5"/>',
    next: '<path d="M5 12h14M13.5 6.5L19 12l-5.5 5.5"/>',
    board: '<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M8 20h8M12 16v4"/><path d="M7 12.5l3-3 2.5 2.5L17 7.5"/>',
    expand: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    list: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
    contrast: '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor"/>'
  };

  function svg(name, cls) {
    return '<svg class="i' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + (P[name] || '') + '</svg>';
  }

  // Rellena todos los elementos [data-icon="nombre"]
  function hydrate(root) {
    (root || document).querySelectorAll('[data-icon]').forEach(el => {
      if (!el.firstChild) el.innerHTML = svg(el.dataset.icon);
    });
  }

  return { svg, hydrate };
})();
