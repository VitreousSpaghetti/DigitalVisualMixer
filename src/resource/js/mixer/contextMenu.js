/**
 * contextMenu.js — Menu tasto destro dell'editor principale (UX_GUIDA blocco C)
 *
 * Solo dentro #codejs (RF-C1): fuori dall'editor resta il menu del browser.
 * Il punto di inserimento è quello del clic destro, non l'ultimo cursore (RF-C3):
 * contextTarget() del bundle lo calcola all'apertura e le voci inseriscono lì.
 * Ogni livello (menu, sottomenu) è un <ul> position:fixed separato: così un sottomenu
 * lungo può scorrere senza tagliare i suoi figli, e ognuno si riposiziona dentro lo schermo.
 */

import {
    contextTarget, insertAt, getDoc, getSelectionText, selectAll, cursorCoords, focusEditor, editorDom, onDocChange
} from './rollupBundle/codeMirrorManager.js';
import { hydraCategories } from './menuFunctionManager.js';
import { getVarKeys, getVarDef } from './macroVarManager.js';
import { showToast } from './toastManager.js';
import { icon, hideTip } from './uiHelp.js';

var _stack = [];      // livelli aperti: [{ el, items, idx }]
var _target = null;   // { from, to } del clic destro
var _kbdAt = 0;       // apertura da tastiera: ignora il contextmenu che il browser genera subito dopo

export function initContextMenu() {
    var dom = editorDom();
    dom.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        if (Date.now() - _kbdAt < 500) return;
        _target = contextTarget(e.clientX, e.clientY);
        _open(e.clientX, e.clientY);
    });
    // RF-C7: tasto Menu e Shift+F10 aprono il menu alla posizione del cursore
    dom.addEventListener('keydown', function(e) {
        if (e.key !== 'ContextMenu' && !(e.shiftKey && e.key === 'F10')) return;
        e.preventDefault();
        _kbdAt = Date.now();
        // Le coordinate del cursore cadono sul bordo della selezione: contextTarget la mantiene
        var c = cursorCoords();
        _target = contextTarget(c.left, c.top + 2);
        _open(c.left, c.bottom);
    });
    // RF-C10: con il menu aperto i tasti non arrivano alle scorciatoie globali (Ctrl+frecce su keyup, F2)
    document.addEventListener('keydown', _onKey, true);
    document.addEventListener('keyup', function(e) { if (_stack.length) { e.stopPropagation(); } }, true);
    // RF-C9: clic fuori, scroll, resize, perdita di focus della finestra, testo cambiato (canale caricato)
    document.addEventListener('mousedown', function(e) { if (_stack.length && !e.target.closest('.ctx-menu')) closeContextMenu(); }, true);
    window.addEventListener('scroll', function(e) { if (!e.target.closest || !e.target.closest('.ctx-menu')) closeContextMenu(); }, true);
    window.addEventListener('resize', function() { closeContextMenu(); });
    window.addEventListener('blur', function() { closeContextMenu(); });
    window.addEventListener('dvm:live', function() { closeContextMenu(); }); // canale live cambiato (mixerManager)
    onDocChange(function() { closeContextMenu(); });
}

export function closeContextMenu(refocus) {
    if (!_stack.length) return;
    _stack.forEach(function(l) { l.el.remove(); });
    _stack = [];
    if (refocus) focusEditor();
}

function _items() {
    var hasSel = !!getSelectionText();
    var vars = getVarKeys();
    return [
        { label: 'Cut', icon: 'scissors', hint: 'Ctrl+X', disabled: !hasSel, run: function() { focusEditor(); document.execCommand('cut'); } },
        { label: 'Copy', icon: 'copy', hint: 'Ctrl+C', disabled: !hasSel, run: function() { focusEditor(); document.execCommand('copy'); } },
        { label: 'Paste', icon: 'paste', hint: 'Ctrl+V', run: _paste },
        { label: 'Select all', icon: 'i-cursor', hint: 'Ctrl+A', run: selectAll },
        { sep: true },
        { label: 'Hydra Function', icon: 'code', sub: hydraCategories().map(function(cat) {
            return { label: cat.title, icon: cat.icon, sub: cat.data.map(function(fn) {
                return { label: fn.title, hint: fn.snippet, tip: fn.signature || fn.snippet, run: function() { _insert(fn.snippet); } };
            }) };
        }) },
        // RF-C2/D3: solo le variabili già configurate, si creano dal Macro Manager
        { label: 'Macro variable', icon: 'wave-square', sub: vars.length ? vars.map(function(k) {
            var d = getVarDef(k) || {};
            return { label: '{{' + k + '}}', hint: d.min + '…' + d.max, run: function() { _insert('{{' + k + '}}'); } };
        }) : [{ label: 'No macro variables — create one in Mappings', disabled: true }] }
    ];
}

function _insert(text) {
    // UC1: l'utente ha già scritto "osc(10)." e clicca dopo il punto → niente doppio punto
    if (text.charAt(0) === '.' && getDoc().charAt(_target.from - 1) === '.') text = text.slice(1);
    insertAt(text, _target.from, _target.to);
}

// Gli appunti da JS funzionano solo in contesto sicuro (localhost sì, IP di rete no) e il browser
// può negare il permesso: in quel caso si dice di usare Ctrl+V invece di fallire in silenzio
function _paste() {
    var t = _target;
    if (!navigator.clipboard || !navigator.clipboard.readText) { showToast('Clipboard not available here: use Ctrl+V', 'info'); focusEditor(); return; }
    navigator.clipboard.readText()
        .then(function(text) { insertAt(text, t.from, t.to); })
        .catch(function() { showToast('Clipboard access denied: use Ctrl+V', 'info'); focusEditor(); });
}

function _open(x, y) {
    closeContextMenu();
    hideTip();
    _level(_items(), 0, { x: x, y: y });
    _focus(0, _next(0, -1, 1));
}

/** Crea il livello depth (chiude quelli più profondi); anchor = {x,y} o la voce padre */
function _level(items, depth, anchor) {
    while (_stack.length > depth) _stack.pop().el.remove();
    var ul = document.createElement('ul');
    ul.className = 'ctx-menu';
    ul.setAttribute('role', 'menu');
    items.forEach(function(it, i) {
        var li = document.createElement('li');
        if (it.sep) { li.className = 'ctx-sep'; li.setAttribute('role', 'separator'); ul.appendChild(li); return; }
        li.className = 'ctx-item' + (it.disabled ? ' disabled' : '');
        li.setAttribute('role', 'menuitem');
        li.tabIndex = -1;
        if (it.disabled) li.setAttribute('aria-disabled', 'true');
        if (it.sub) li.setAttribute('aria-haspopup', 'true');
        if (it.tip) li.dataset.tip = it.tip;
        li.innerHTML = '<span class="ctx-ico">' + icon(it.icon) + '</span><span class="ctx-label"></span>' +
            '<span class="ctx-hint"></span>' + (it.sub ? icon('caret-right', 'ctx-arrow') : '');
        li.querySelector('.ctx-label').textContent = it.label;
        li.querySelector('.ctx-hint').textContent = it.hint || '';
        li.addEventListener('mouseenter', function() {
            _focus(depth, i);
            if (it.sub && !it.disabled) _activate(depth, i, true);
            else while (_stack.length > depth + 1) _stack.pop().el.remove(); // chiude il sottomenu di un'altra voce
        });
        li.addEventListener('click', function(e) { e.stopPropagation(); _activate(depth, i); });
        ul.appendChild(li);
    });
    document.body.appendChild(ul);
    _stack.push({ el: ul, items: items, idx: -1 });

    // RF-C8: vicino al bordo destro/basso si apre verso sinistra/alto
    var r = ul.getBoundingClientRect(), W = window.innerWidth, H = window.innerHeight, x, y;
    if (anchor.nodeType) {
        var a = anchor.getBoundingClientRect();
        x = a.right; y = a.top;
        if (x + r.width > W) x = a.left - r.width;
    } else {
        x = anchor.x; y = anchor.y;
        if (x + r.width > W) x = x - r.width;
    }
    if (y + r.height > H) y = H - r.height - 4;
    ul.style.left = Math.max(0, x) + 'px';
    ul.style.top = Math.max(0, y) + 'px';
}

function _focus(depth, i) {
    var l = _stack[depth];
    if (!l || i < 0) return;
    l.idx = i;
    var li = l.el.children[i];
    l.el.querySelectorAll('.ctx-item.active').forEach(function(el) { el.classList.remove('active'); });
    li.classList.add('active');
    li.focus({ preventScroll: false });
}

/** @param {boolean} [hover] - apertura sottomenu al passaggio del mouse: il focus resta sulla voce */
function _activate(depth, i, hover) {
    var l = _stack[depth], it = l.items[i];
    if (!it || it.disabled || it.sep) return;
    if (it.sub) {
        if (_stack[depth + 1] && _stack[depth + 1].items === it.sub) return; // già aperto
        _level(it.sub, depth + 1, l.el.children[i]);
        if (!hover) _focus(depth + 1, _next(depth + 1, -1, 1));
        return;
    }
    closeContextMenu();
    it.run();
}

/** Indice della prossima voce selezionabile (salta separatori) nella direzione dir */
function _next(depth, from, dir) {
    var items = _stack[depth].items, n = items.length;
    for (var k = 1; k <= n; k++) {
        var j = (from + dir * k + n * 2) % n;
        if (!items[j].sep) return j;
    }
    return -1;
}

function _onKey(e) {
    if (!_stack.length) return;
    var depth = _stack.length - 1, l = _stack[depth];
    // Mouse sul sottomenu ma focus sul livello sopra: le frecce agiscono dove sta il focus
    var focused = document.activeElement && document.activeElement.closest('.ctx-menu');
    _stack.forEach(function(s, d) { if (s.el === focused) { depth = d; l = s; } });
    var handled = true;
    switch (e.key) {
        case 'ArrowDown': _focus(depth, _next(depth, l.idx, 1)); break;
        case 'ArrowUp':   _focus(depth, _next(depth, l.idx < 0 ? 0 : l.idx, -1)); break;
        case 'ArrowRight': if (l.items[l.idx] && l.items[l.idx].sub) _activate(depth, l.idx); break;
        case 'ArrowLeft':
            if (depth > 0) { while (_stack.length > depth) _stack.pop().el.remove(); _focus(depth - 1, _stack[depth - 1].idx); }
            break;
        case 'Enter': case ' ': _activate(depth, l.idx); break;
        case 'Escape': closeContextMenu(true); break;
        case 'Tab': closeContextMenu(true); break;
        default: handled = !!(e.ctrlKey || e.key === 'F2' || e.key === 'F1'); // niente scorciatoie globali
    }
    if (handled) { e.preventDefault(); e.stopPropagation(); }
}
