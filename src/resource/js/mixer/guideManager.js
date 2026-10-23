/**
 * guideManager.js — Guida integrata (UX_GUIDA RF-D1, RF-D2)
 *
 * Unico posto dove vivono i testi d'aiuto: About rimanda qui, i tooltip restano frasi brevi.
 * Shortcut generate da SHORTCUTS (uiHelp.js) e funzioni Hydra da hydraCategories(), così
 * la Guida non va fuori sincrono con menu e tooltip.
 * - openGuide(sectionId?) apre la modale già posizionata sulla sezione
 * - [data-help="<sectionId>"] in qualsiasi punto della pagina apre la Guida su quella sezione
 * - F1 apre la Guida
 */

import { SHORTCUTS, icon } from './uiHelp.js';
import { hydraCategories } from './menuFunctionManager.js';
import { insertText } from './rollupBundle/codeMirrorManager.js';
import { showToast } from './toastManager.js';

var _modal = null;

function _kbd(keys) { return '<kbd>' + keys + '</kbd>'; }

function _esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// [id, titolo, icona, html]. Gli id sono quelli usati da data-help negli header.
function _sections() {
    return [
        ['start', 'Getting started', 'circle-play',
            '<ol>' +
            '<li>Pick a <b>channel</b> in the sidebar: its code opens in the editor.</li>' +
            '<li>Write Hydra code, e.g. <code>osc(10, 0.1).out()</code>, and press ' + icon('play') + ' <b>Preview</b> (' + _kbd(SHORTCUTS.prev.keys) + '): it runs only in the <b>Local Preview</b>, the audience sees nothing.</li>' +
            '<li>' + icon('floppy-disk') + ' <b>Save</b> (' + _kbd(SHORTCUTS.save.keys) + ') stores the code in the channel.</li>' +
            '<li>' + icon('tower-broadcast') + ' <b>Save and Run</b> saves and sends the channel to the <b>live output</b>.</li>' +
            '<li>Open the output with Visual Deck → ' + icon('up-right-from-square') + ' <b>Open Live window</b> and move it to the projector.</li>' +
            '</ol>' +
            '<p>Right-click in the editor (or ' + _kbd(SHORTCUTS.menu.keys) + ') to insert Hydra functions and macro variables where you clicked. ' +
            _kbd(SHORTCUTS.palette.keys) + ' searches every action by name.</p>'],
        ['concepts-channels', 'Channels', 'table-cells',
            '<p>A channel is a saved Hydra sketch. The grid shows all channels: click to edit one, drag to reorder, ' +
            icon('plus') + ' adds an empty one, ' + icon('trash') + ' deletes the one being edited.</p>' +
            '<p>The channel <b>being edited</b> is highlighted; the one <b>on live</b> is red and shown in the LIVE badge of the navbar. ' +
            'A dot next to "Editing" means unsaved changes.</p>'],
        ['concepts-preview', 'Local preview vs live', 'eye',
            '<p><b>Local Preview</b> runs the editor code only in this window. <b>Live</b> is the separate <code>/live</code> window ' +
            '(projector/screen) and changes only with Save and Run, ' + _kbd(SHORTCUTS.run.keys) + ', ' + _kbd(SHORTCUTS.prevLive.keys) + ' / ' +
            _kbd(SHORTCUTS.nextLive.keys) + ', channel pads in Perform or a mapped control.</p>' +
            '<p>Drag the bottom-right corner of the preview to resize it. Click a section title to collapse it.</p>'],
        ['concepts-autosave', 'Autosave', 'rotate',
            '<p>With Autosave on (AS badge green) the channel is saved automatically when you switch to another one. ' +
            'With Autosave off, switching channel asks before discarding unsaved changes.</p>'],
        ['concepts-transitions', 'Transitions', 'shuffle',
            '<p>The Transition menu sets how the live output changes channel: <b>Cut</b> (instant), <b>Crossfade</b> or <b>Add</b>, ' +
            'with a duration in ms. A red bar at the top shows the transition in progress.</p>'],
        ['concepts-variables', 'Macro variables', 'wave-square',
            '<p>A macro variable is a number you can move live with a slider, a MIDI knob, a gamepad stick or a key, ' +
            'without re-running the code. Use it in the code as <code>{{key}}</code>:</p>' +
            '<ul><li><code>osc({{freq}}, 0.1).out()</code> — direct argument: changes every frame while you move the control.</li>' +
            '<li><code>osc(() =&gt; M.freq * 2).out()</code> — inside a calculation use <code>M.key</code> in an arrow function.</li>' +
            '<li><code>a.setCutoff(M.c)</code> — outside Hydra functions <code>M.key</code> is read once, when the code runs.</li></ul>' +
            '<p>Create variables with ' + icon('plus') + ' in the Macro Variables panel; insert them with right-click → Macro variable.</p>'],
        ['concepts-mappings', 'Mappings', 'sliders',
            '<p>A mapping connects a <b>source</b> (' + icon('music') + ' MIDI CC/note, ' + icon('gamepad') + ' gamepad axis/button, ' +
            icon('keyboard') + ' key) to a <b>destination</b>: a macro variable or a sequence of actions (go live, next channel, apply preset…).</p>' +
            '<p>Open the Mappings manager, press ' + icon('wand-magic-sparkles') + ' <b>Learn</b> and move the control. Variable modes:</p>' +
            '<ul><li><b>Absolute</b> — the control position is the value (knobs, sticks). A MIDI knob must reach the current value to take over (' + icon('diamond') + ' shows where the knob is).</li>' +
            '<li><b>Increment</b> — the control adds/subtracts a step; stops at min/max.</li>' +
            '<li><b>Gate</b> — ON value while held, rest value when released.</li>' +
            '<li><b>Toggle</b> — each press switches between ON and rest.</li>' +
            '<li><b>Impulse</b> — each press jumps to a peak and decays back to rest.</li></ul>' +
            '<p>The navbar input monitor shows the last control received; click it on an unmapped control to map it.</p>'],
        ['concepts-presets', 'Presets', 'bookmark',
            '<p>A preset stores the current channel, macro variable values and transition. Applying it loads the channel in the editor and restores the values; ' +
            'it does not go live by itself.</p>'],
        ['concepts-perform', 'Perform view', 'circle-play',
            '<p>' + _kbd(SHORTCUTS.perform.keys) + ' switches to Perform: big preview, variables as vertical bars, channel pads (click = live) and preset pads. ' +
            'Nothing destructive is reachable from there and tooltips are off.</p>'],
        // R-LAN1: URL letti da /api/lan dopo l'apertura (dipendono dalla rete del PC che fa da server)
        ['live-lan', 'Live on another PC', 'display',
            '<p>Open the live output on a second PC on the same network (e.g. the one connected to the projector):</p>' +
            '<ol><li>On the other PC open: <ul id="guideLanUrls"><li>…</li></ul></li>' +
            '<li>The browser warns that the connection is not private (self-signed certificate): choose <b>Advanced → Proceed</b>. Once per PC.</li>' +
            '<li>Allow <b>microphone</b> and <b>camera</b> when asked: <code>a.fft</code> and <code>s0.initCam()</code> use the devices of that PC.</li>' +
            '<li>If the page does not load, allow the app (Node.js) in the <b>Windows firewall</b> on private networks, on the PC running the server.</li></ol>' +
            '<p>The same URLs are printed in the server console at startup.</p>'],
        ['shortcuts', 'Shortcuts', 'keyboard',
            '<table class="guide-table">' + Object.keys(SHORTCUTS).map(function(k) {
                return '<tr><td>' + _kbd(SHORTCUTS[k].keys) + '</td><td>' + SHORTCUTS[k].label + '</td></tr>';
            }).join('') + '</table>'],
        ['functions', 'Hydra functions', 'code',
            '<p>Insert puts the call with default parameters at the editor cursor. Full docs: Help → Hydra API Docs.</p>' +
            hydraCategories().map(function(cat) {
                return '<h6>' + icon(cat.icon, 'fa-fw') + ' ' + cat.title + '</h6><table class="guide-table guide-fn">' +
                    cat.data.map(function(fn) {
                        return '<tr><td><code>' + _esc(fn.snippet) + '</code></td><td>' + _esc(fn.signature) + '</td>' +
                            '<td><button class="mm-btn guide-insert" data-snippet="' + _esc(fn.snippet) + '">' + icon('plus') + ' Insert</button></td></tr>';
                    }).join('') + '</table>';
            }).join('')],
        ['troubleshooting', 'Troubleshooting', 'triangle-exclamation',
            '<ul><li><b>MIDI badge red / no device</b> — use Chrome or Edge, connect the device and click the MIDI badge to ask permission again.</li>' +
            '<li><b>Gamepad shows 0</b> — browsers see a gamepad only after you press one of its buttons.</li>' +
            '<li><b>Syntax error</b> — the red panel under the editor shows it; Save and Run does not go live until the code is fixed.</li>' +
            '<li><b>Server disconnected</b> (red banner) — restart <code>npm start</code>; nothing is saved meanwhile.</li>' +
            '<li><b>Live window is black</b> — send a channel live (Save and Run) after opening it; check the channel works in Preview.</li>' +
            '<li><b>Paste from the menu does nothing</b> — the browser blocks the clipboard outside localhost: use Ctrl+V.</li></ul>'],
        ['glossary', 'Glossary', 'book',
            '<table class="guide-table">' +
            '<tr><td>Channel</td><td>a saved Hydra sketch</td></tr>' +
            '<tr><td>Live</td><td>the output window seen by the audience</td></tr>' +
            '<tr><td>Preview</td><td>local run in the mixer only</td></tr>' +
            '<tr><td>Macro variable</td><td>a live number used as <code>{{key}}</code></td></tr>' +
            '<tr><td>Mapping</td><td>source (MIDI/gamepad/key) → variable or actions</td></tr>' +
            '<tr><td>Preset</td><td>channel + variable values + transition</td></tr>' +
            '<tr><td>Learn</td><td>map by moving the physical control</td></tr></table>']
    ];
}

/**
 * @param {string} [sectionId] - sezione su cui posizionarsi (data-help degli header)
 */
export function openGuide(sectionId) {
    if (_modal) bootstrap.Modal.getInstance(_modal)?.hide();
    var secs = _sections();
    document.body.insertAdjacentHTML('beforeend',
        '<div class="modal fade guide" id="guideModal" tabindex="-1" aria-labelledby="guideTitle">' +
        '<div class="modal-dialog modal-xl modal-dialog-scrollable"><div class="modal-content">' +
        '<div class="modal-header"><h5 class="modal-title" id="guideTitle">' + icon('circle-question') + ' Guide</h5>' +
            '<button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button></div>' +
        '<div class="modal-body guide-body">' +
            '<nav class="guide-index"><input type="search" id="guideSearch" class="mm-input" placeholder="Search the guide…" aria-label="Search the guide">' +
            secs.map(function(s) { return '<a href="#" data-goto="' + s[0] + '">' + icon(s[2], 'fa-fw') + ' ' + s[1] + '</a>'; }).join('') +
            '</nav><div class="guide-content" id="guideContent">' +
            secs.map(function(s) { return '<section id="guide-' + s[0] + '"><h5>' + icon(s[2], 'fa-fw') + ' ' + s[1] + '</h5>' + s[3] + '</section>'; }).join('') +
            '<p id="guideEmpty" class="mm-empty" style="display:none">Nothing found.</p>' +
        '</div></div></div></div></div>');
    _modal = document.getElementById('guideModal');
    fetch('/api/lan').then(function(r) { return r.json(); }).then(function(d) {
        var ul = document.getElementById('guideLanUrls');
        if (ul) ul.innerHTML = d.live.length ? d.live.map(function(u) { return '<li><code>' + _esc(u) + '</code></li>'; }).join('')
                                             : '<li>No network found: connect this PC to the LAN and restart the server.</li>';
    }).catch(function() {});

    _modal.addEventListener('click', function(e) {
        var a = e.target.closest('[data-goto]');
        if (a) { e.preventDefault(); _goto(a.dataset.goto); }
        var ins = e.target.closest('.guide-insert');
        if (ins) {
            insertText(ins.dataset.snippet);
            showToast('Inserted ' + ins.dataset.snippet);
            bootstrap.Modal.getInstance(_modal).hide();
        }
    });
    // Ricerca: mostra solo le sezioni (e le righe funzione) che contengono tutte le parole
    document.getElementById('guideSearch').addEventListener('input', function() {
        var words = this.value.toLowerCase().split(/\s+/).filter(Boolean), any = false;
        var match = function(el) { var t = el.textContent.toLowerCase(); return words.every(function(w) { return t.includes(w); }); };
        _modal.querySelectorAll('.guide-content section').forEach(function(sec) {
            sec.querySelectorAll('.guide-fn tr').forEach(function(tr) { tr.style.display = !words.length || match(tr) ? '' : 'none'; });
            var on = !words.length || match(sec);
            sec.style.display = on ? '' : 'none';
            any = any || on;
        });
        document.getElementById('guideEmpty').style.display = any ? 'none' : '';
    });
    _modal.addEventListener('shown.bs.modal', function() {
        if (sectionId) _goto(sectionId); else document.getElementById('guideSearch').focus();
    });
    _modal.addEventListener('hidden.bs.modal', function() { _modal.remove(); _modal = null; });
    new bootstrap.Modal(_modal).show();
}

function _goto(id) {
    var sec = document.getElementById('guide-' + id);
    if (!sec) return;
    sec.style.display = '';
    sec.scrollIntoView({ block: 'start' });
    _modal.querySelectorAll('[data-goto]').forEach(function(a) { a.classList.toggle('active', a.dataset.goto === id); });
}

export function initGuide() {
    window.addEventListener('keydown', function(e) {
        if (e.key === 'F1') { e.preventDefault(); openGuide(); } // F1 del browser aprirebbe il suo help
    });
    // RF-D2: le icone ? sugli header (anche dentro header comprimibili e modali) aprono la sezione giusta
    document.addEventListener('click', function(e) {
        var h = e.target.closest('[data-help]');
        if (!h) return;
        e.preventDefault();
        e.stopPropagation(); // non comprimere la sezione / non chiudere il dropdown Transition
        openGuide(h.dataset.help);
    }, true);
}
