/**
 * mappingManager.js — Dispatcher unico delle Mappature (PERFORM §2, RF5-RF7)
 *
 * Tutte le sorgenti (MIDI, gamepad, tastiera) arrivano qui come eventi normalizzati
 * { src, v, raw?, down? } e vengono confrontate con le macro dal DB:
 *  - variabile → macroVarManager.applyVarInput (la modalità decide cosa fare)
 *  - azione    → macroManager.executeActions sul fronte di pressione
 * Qui vivono anche il Learn unico ("muovi il controllo"), il monitor input e
 * gli indicatori MIDI/🎮 in navbar.
 */

import { getMappings, applyVarInput, stopRates, tickNow } from './macroVarManager.js';
import { executeActions } from './macroManager.js';
import { initMIDI } from './midiManager.js';
import { initGamepad, padCount } from './gamepadManager.js';
import { sameSource, sourceId, sourceLabel } from './sourceUtil.js';

var _down = {};          // id sorgente → ultimo stato premuto, per calcolare i fronti
var _learn = null;       // callback del Learn attivo
var _lastUnmapped = null;
var _padN = 0;

/**
 * Avvia MIDI (subito, non più solo da Learn), gamepad e tastiera.
 * @param {Function} onUnmappedClick - callback(src) quando si clicca il monitor su una
 *   sorgente non mappata (scorciatoia verso "nuova mappatura")
 */
export function initMappings(onUnmappedClick) {
    initMIDI(_onInput, function(s) { _status('midiStatus', 'MIDI', s); });
    initGamepad(_onInput, function(s) {
        if (s.devices.length < _padN) stopRates(); // pad scollegato: congela, niente deriva
        _padN = s.devices.length;
        _status('padStatus', '🎮', s);
    });
    // Capture: durante il Learn il tasto non deve arrivare a Bootstrap (Esc chiuderebbe la modal)
    window.addEventListener('keydown', _onKey, true);
    window.addEventListener('keyup', _onKey, true);

    var mon = document.getElementById('inputMonitor');
    if (mon) mon.addEventListener('click', function() {
        if (_lastUnmapped) onUnmappedClick(_lastUnmapped);
    });
    // Se il permesso è stato negato, il click è il gesto utente che permette di richiederlo di nuovo
    var midi = document.getElementById('midiStatus');
    if (midi) midi.addEventListener('click', function() { initMIDI(); });
}

/**
 * Learn: la prossima sorgente mossa (CC qualsiasi, nota/bottone/tasto premuto,
 * levetta oltre metà corsa) viene passata a callback; Esc annulla con callback(null).
 * @param {Function} callback - callback(src|null)
 */
export function startLearn(callback) {
    _learn = callback;
}

export function cancelLearn() {
    _learn = null;
}

function _onKey(e) {
    if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;
    var down = e.type === 'keydown';
    var t = e.target;
    if (_learn) {
        if (!down) return;
        e.preventDefault();
        e.stopPropagation();
        if (e.key === 'Escape') { var cb = _learn; _learn = null; cb(null); return; }
    } else if (t && (t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable ||
               (t.tagName === 'INPUT' && !['range', 'checkbox', 'button'].includes(t.type)))) {
        return; // si sta scrivendo (editor CodeMirror è contenteditable): niente trigger
    }
    var src = { type: 'key', key: e.key };
    if (down) { src.ctrl = e.ctrlKey; src.shift = e.shiftKey; src.alt = e.altKey; }
    _onInput({ src: src, v: down ? 1 : 0, down: down });
}

function _onInput(ev) {
    // Fronti calcolati qui una volta per tutti: CC/assi oltre metà corsa valgono "premuto",
    // così anche un CC a pulsante (127/0) può fare gate o lanciare un'azione.
    // Per i tasti l'id ignora i modificatori: al keyup possono essere già rilasciati.
    var id = ev.src.type === 'key' ? 'key:' + ev.src.key : sourceId(ev.src);
    var down = ev.down !== undefined ? ev.down : Math.abs(ev.v) > 0.5;
    ev.down = down;
    ev.edge = down !== !!_down[id];
    _down[id] = down;

    if (_learn) {
        if (ev.src.type === 'cc' || (ev.edge && down)) { var cb = _learn; _learn = null; cb(ev.src); }
        return;
    }

    var anyPad = padCount() === 1, hits = 0;
    getMappings().forEach(function(x) {
        if (x.m.type === 'variable') {
            if (sameSource(x.src, ev.src, anyPad)) { applyVarInput(x.key, ev, false); hits++; }
            else if (x.p.mode === 'inc' && sameSource(x.p.srcDec, ev.src, anyPad)) { applyVarInput(x.key, ev, true); hits++; }
        } else if (x.m.type === 'action' && sameSource(x.src, ev.src, anyPad)) {
            hits++;
            // Offset nell'intervallo di note: serve a rangeChannel (ottava come launchpad)
            if (ev.edge && down) executeActions(x.p.actions || [], x.m.name, x.m.id, ev.src.type === 'note' ? ev.src.n - x.src.n : 0);
        }
    });
    if (hits && document.hidden) tickNow(); // rAF fermo: applica e invia subito
    _monitor(ev, hits);
}

/** Ultima sorgente ricevuta + valore: diagnostica "il controller arriva o no?" (RF7) */
function _monitor(ev, hits) {
    var el = document.getElementById('inputMonitor');
    var s = ev.src;
    if (!el || (!hits && s.type === 'axis' && Math.abs(ev.v) < 0.1)) return; // rumore levetta ferma
    var val = s.type === 'cc' ? ev.raw
        : s.type === 'axis' || s.type === 'button' ? ev.v.toFixed(2)
        : ev.down ? 'on' + (s.type === 'note' ? ' ' + Math.round(ev.v * 127) : '') : 'off';
    el.textContent = sourceLabel(s) + ' → ' + val + (hits ? '' : ' · non mappata, clic per mappare');
    el.classList.toggle('mon-unmapped', !hits);
    _lastUnmapped = hits ? null : s;
}

/** Indicatore dispositivi in navbar: verde con dispositivi, rosso senza, bottone se negato */
function _status(id, label, s) {
    var el = document.getElementById(id);
    if (!el) return;
    var n = s.devices.length;
    el.className = 'dev-status ' + (s.state !== 'on' ? 'dev-off' : n ? 'dev-on' : 'dev-none');
    el.textContent = s.state === 'denied' ? label + ' ✕ Attiva' : s.state === 'unsupported' ? label + ' n/d' : label + ' ● ' + n;
    el.title = s.state === 'unsupported' ? 'Non supportato da questo browser: usa Chrome o Edge'
        : s.state === 'denied' ? 'Accesso MIDI negato: clic per riprovare'
        : n ? s.devices.join('\n') : 'Nessun dispositivo collegato';
}
