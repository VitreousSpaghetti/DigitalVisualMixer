/**
 * uiHelp.js — Shortcut, tooltip e icone condivisi da tutta la UI del mixer (UX_GUIDA A, B)
 *
 * - SHORTCUTS è l'unica fonte delle scorciatoie (RF-B7): tooltip, menu, Guida e command
 *   palette le leggono da qui, così non vanno fuori sincrono.
 * - Tooltip: un solo elemento con le classi di Bootstrap (.tooltip/.tooltip-inner, stesso
 *   aspetto dei tooltip Bootstrap) delegato su [data-tip]. Il testo si legge all'apertura,
 *   quindi i tooltip dinamici (badge MIDI, autosave…) non richiedono aggiornamenti e un
 *   re-render dei pannelli non può lasciare tooltip orfani a schermo.
 *   data-sc="<id>" aggiunge la shortcut di SHORTCUTS in coda al testo.
 * Nessuna dipendenza: importabile da qualsiasi modulo senza cicli.
 */

export var SHORTCUTS = {
    prev:     { keys: 'Ctrl+Enter', label: 'Preview the code locally (not live)' },
    save:     { keys: 'Ctrl+↑',     label: 'Save the channel being edited' },
    run:      { keys: 'Ctrl+↓',     label: 'Send the channel being edited to live (without saving)' },
    prevLive: { keys: 'Ctrl+←',     label: 'Send the previous channel to live' },
    nextLive: { keys: 'Ctrl+→',     label: 'Send the next channel to live' },
    perform:  { keys: 'F2',         label: 'Switch between Edit and Perform view' },
    guide:    { keys: 'F1',         label: 'Open the Guide' },
    palette:  { keys: 'Ctrl+K',     label: 'Command palette: search any action' },
    menu:     { keys: 'Shift+F10',  label: 'Editor context menu at the cursor (also right-click or Menu key)' }
};

/** Tasti della shortcut, '' se non esiste */
export function sc(id) {
    return SHORTCUTS[id] ? SHORTCUTS[id].keys : '';
}

/** HTML di un'icona Font Awesome (solid); aria-hidden: il testo/aria-label la descrive già */
export function icon(name, extra) {
    return name ? '<i class="fa-solid fa-' + name + (extra ? ' ' + extra : '') + '" aria-hidden="true"></i>' : '';
}

var _tip = null, _timer = null, _target = null, _dragging = false;

export function initTooltips() {
    _tip = document.createElement('div');
    _tip.className = 'tooltip dvm-tip';
    _tip.setAttribute('role', 'tooltip');
    _tip.innerHTML = '<div class="tooltip-inner"></div>';
    document.body.appendChild(_tip);

    document.addEventListener('mouseover', function(e) {
        var t = e.target.closest ? e.target.closest('[data-tip]') : null;
        if (t === _target) return;
        hideTip();
        if (!t) return;
        _target = t;
        _timer = setTimeout(function() { _show(t); }, 400); // RF-B5: ritardo ~400 ms
    });
    document.addEventListener('mouseout', function(e) { if (!e.relatedTarget) hideTip(); });
    // RF-B5: si chiude al click (non resta appeso sopra i bottoni), allo scroll, ai tasti
    ['mousedown', 'keydown', 'wheel'].forEach(function(ev) { document.addEventListener(ev, hideTip, true); });
    window.addEventListener('blur', hideTip);
    document.addEventListener('dragstart', function() { _dragging = true; hideTip(); });
    document.addEventListener('dragend', function() { _dragging = false; });
}

export function hideTip() {
    clearTimeout(_timer);
    _target = null;
    if (_tip) _tip.classList.remove('show');
}

function _show(t) {
    // RF-B6: niente tooltip in Perform (coprirebbero i pad); niente durante il drag dei canali
    if (!t.isConnected || _dragging || document.body.classList.contains('perform-mode')) return;
    var text = t.dataset.tip || '';
    if (t.dataset.sc && sc(t.dataset.sc)) text += ' — ' + sc(t.dataset.sc);
    if (!text) return;
    _tip.firstChild.textContent = text;
    _tip.classList.add('show');
    // Sotto l'elemento, centrato; sopra se non c'è spazio; sempre dentro la finestra
    var r = t.getBoundingClientRect(), w = _tip.offsetWidth, h = _tip.offsetHeight;
    var x = Math.min(Math.max(4, r.left + r.width / 2 - w / 2), window.innerWidth - w - 4);
    var y = r.bottom + 6 + h > window.innerHeight ? r.top - h - 6 : r.bottom + 6;
    _tip.style.left = x + 'px';
    _tip.style.top = Math.max(4, y) + 'px';
}
