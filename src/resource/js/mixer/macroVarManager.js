/**
 * macroVarManager.js — Motore delle variabili macro (PERFORM RF1-RF3)
 *
 * Responsabilità:
 *  - Definizioni variabili dal DB (range, riposo, ON, modalità, glide, decadimento…)
 *  - Modalità per sorgente: assoluta, incremento, gate, impulso, toggle (applyVarInput)
 *  - Loop per frame: incremento continuo da levetta, decadimento impulsi, glide → window.M
 *  - Un solo sync_macros parziale per frame (rate limit NFR, l'ultimo valore vince)
 *  - Soft takeover per i CC in modalità Assoluta
 *  - Slider della sidebar; aggiornamento di tutti gli elementi [data-var-*] (sidebar,
 *    Macro Manager, vista Perform) senza che questi moduli debbano iscriversi a nulla
 *
 * window.M (da macroLive.js) contiene il valore effettivo letto da Hydra a ogni frame.
 * La funzione emit viene iniettata da deckManager.js via initMacroVars().
 */

import { showToast } from './toastManager.js';
import { parseJSON, isPress, sourceLabel } from './sourceUtil.js';

var M = window.M = window.M || {};

// Lista macro dal DB e versione parsata una volta sola (il dispatcher la scorre a ogni evento)
var macroList = [];
var mappings = [];   // [{ m: macro, src, p: params, key? }]
var defs = {};       // key → definizione normalizzata
var st = {};         // key → stato runtime { target, value, picked, ctrl, rate, imp, toggled, lastRaw }
var dirty = null;    // { key: value } da inviare al prossimo frame
var _emit = null;
var _last = 0;

export var MODES = { abs: 'Assoluta', inc: 'Incremento', gate: 'Gate', impulse: 'Impulso', toggle: 'Toggle' };

/**
 * Inizializza il modulo con emit e avvia il loop per frame.
 * ponytail: loop su requestAnimationFrame, si ferma se la finestra del mixer è minimizzata;
 * passare a un worker/timer se serve suonare col mixer nascosto.
 * @param {Function} emitFn - funzione emit da mixerEmitter.js
 */
export function initMacroVars(emitFn) {
    _emit = emitFn;
    _last = performance.now();
    requestAnimationFrame(_loop);
}

function _loop(now) {
    _tick(now);
    requestAnimationFrame(_loop);
}

/**
 * Esegue subito un passo del motore. Usato dal dispatcher quando il mixer è nascosto
 * (tab in background o finestra coperta da /live a schermo intero): rAF è fermo ma i
 * messaggi MIDI arrivano ancora, e devono raggiungere /live senza aspettare un frame.
 * Senza glide (snap): non ci sarebbero altri frame a completarlo e il valore resterebbe a metà.
 * ponytail: da nascosto il decadimento degli impulsi avanza solo all'arrivo di eventi.
 */
export function tickNow() {
    _tick(performance.now(), true);
}

function _tick(now, snap) {
    var dt = Math.min(now - _last, 100); // dopo una pausa lunga niente salti enormi
    _last = now;
    Object.keys(defs).forEach(function(key) {
        var d = defs[key], s = _state(key);
        // Incremento da levetta: velocità ∝ inclinazione, uno step per frame a 60fps a fondo corsa
        if (s.rate) s.target = _clamp(d, s.target + s.rate * d.step * dt / 16.67);
        var base = s.target;
        if (s.imp) {
            var t = (now - s.imp.t0) / Math.max(d.decay, 1);
            if (t >= 1) s.imp = null;
            else base = d.value + (s.imp.peak - d.value) * (d.curve === 'exp' ? Math.exp(-5 * t) : 1 - t);
        }
        // Glide esponenziale: toglie gli scalini dei 128 valori MIDI e il jitter delle levette
        var v = d.glide > 0 && !snap ? s.value + (base - s.value) * (1 - Math.exp(-dt / d.glide)) : base;
        if (Math.abs(v - base) < Math.abs(d.max - d.min) * 1e-4) v = base;
        if (v !== s.value) { s.value = v; _set(key, v); }
    });
    if (dirty && _emit) _emit('sync_macros', dirty);
    dirty = null;
}

function _set(key, v) {
    M[key] = v;
    (dirty = dirty || {})[key] = v;
    _paint(key);
}

function _num(v, def) {
    return (v === undefined || v === null || v === '' || isNaN(+v)) ? def : +v;
}

function _clamp(d, v) {
    return Math.min(Math.max(v, Math.min(d.min, d.max)), Math.max(d.min, d.max));
}

/** Deadzone con riscalatura: fuori dalla zona morta il range resta -1..1 pieno */
function _dz(v, dz) {
    return Math.abs(v) < dz ? 0 : (v - Math.sign(v) * dz) / (1 - dz);
}

function _state(key) {
    if (!st[key]) {
        // Parte dall'ultimo valore noto (server/sync) se c'è, non dal default: niente salti sul live
        var v0 = key in M ? +M[key] : (defs[key] ? defs[key].value : 0);
        M[key] = v0;
        st[key] = { target: v0, value: v0, picked: false };
    }
    return st[key];
}

/** Normalizza i params di una macro variabile con i default dell'AF (RF2/RF3) */
function _def(x) {
    var p = x.p, min = _num(p.min, 0), max = _num(p.max, 1);
    var mode = MODES[p.mode] ? p.mode : (isPress(x.src) ? 'gate' : 'abs');
    return {
        id: x.m.id, key: p.key || x.m.name || String(x.m.id), min: min, max: max,
        step:  _num(p.step, (max - min) / 100),          // slider + passo Incremento (default 1% range)
        value: _num(p.value, min),                       // default = valore di riposo
        on:    _num(p.on, max),                          // valore ON di gate/toggle, picco impulso
        mode:  mode,
        glide: _num(p.glide, mode === 'abs' || mode === 'inc' ? 40 : 0), // gate/impulso: risposta secca
        decay: _num(p.decay, 300),
        curve: p.curve === 'exp' ? 'exp' : 'lin',
        invert: !!p.invert,
        deadzone: _num(p.deadzone, 0.1),
        src: x.src,
        srcDec: p.srcDec || null
    };
}

/**
 * Applica un evento sorgente a una variabile secondo la sua modalità.
 * Chiamato da mappingManager.js per ogni sorgente che corrisponde alla variabile.
 * @param {string} key
 * @param {object} ev  - { src, v, raw?, down, edge }
 * @param {boolean} dec - true se l'evento arriva dalla sorgente "−" (Incremento a due bottoni)
 */
export function applyVarInput(key, ev, dec) {
    var d = defs[key];
    if (!d) return;
    var s = _state(key), t = ev.src.type, range = d.max - d.min;
    _flash(key, s);

    if (d.mode === 'abs') {
        if (t === 'note' || t === 'key') {
            if (ev.edge && ev.down) s.target = d.min + (d.invert ? 1 - ev.v : ev.v) * range; // velocity → valore
            return;
        }
        var x = t === 'axis' ? (_dz(ev.v, d.deadzone) + 1) / 2 : ev.v;
        var c = d.min + (d.invert ? 1 - x : x) * range;
        // Soft takeover solo per i CC: levette e grilletti tornano da soli a riposo, aspettare
        // che "raggiungano" il valore li renderebbe inutilizzabili
        if (t === 'cc' && !s.picked) {
            var crossed = s.ctrl !== undefined && (s.ctrl - s.target) * (c - s.target) <= 0;
            s.ctrl = c;
            if (!crossed && Math.abs(c - s.target) > Math.abs(range) * 0.03) { _paintCtrl(key, s); return; }
            s.picked = true;
            _paintCtrl(key, s);
        }
        s.target = c;
        return;
    }

    if (d.mode === 'inc') {
        var sign = (d.invert ? -1 : 1) * (dec ? -1 : 1);
        if (t === 'cc') {
            // Differenza tra CC consecutivi: un knob assoluto a fine corsa non genera più delta
            if (s.lastRaw !== undefined) s.target = _clamp(d, s.target + (ev.raw - s.lastRaw) * d.step * sign);
            s.lastRaw = ev.raw;
        } else if (t === 'axis') {
            s.rate = _dz(ev.v, d.deadzone) * sign; // applicato nel loop finché la levetta resta inclinata
        } else if (ev.edge && ev.down) {
            s.target = _clamp(d, s.target + d.step * sign);
        }
        return;
    }

    if (!ev.edge) return; // gate / toggle / impulso reagiscono solo ai fronti
    if (d.mode === 'gate') {
        s.target = ev.down ? d.on : d.value;
    } else if (d.mode === 'toggle' && ev.down) {
        s.toggled = !s.toggled;
        s.target = s.toggled ? d.on : d.value;
    } else if (d.mode === 'impulse' && ev.down) {
        // Picco proporzionale alla velocity (MIDI) o al valore analogico (grilletti)
        s.imp = { t0: performance.now(), peak: d.value + (d.on - d.value) * Math.abs(ev.v) };
    }
}

/** Ferma gli incrementi continui (gamepad scollegato: valori congelati, niente deriva) */
export function stopRates() {
    Object.keys(st).forEach(function(k) { st[k].rate = 0; });
}

/**
 * Imposta un valore dall'interfaccia (slider, preset). Il controllo fisico in Assoluta
 * dovrà "raggiungere" il nuovo valore prima di riprenderlo (soft takeover).
 * @param {string} key
 * @param {number} value
 */
export function updateMacroVar(key, value) {
    if (!defs[key]) { _set(key, +value); return; } // key di un preset senza variabile: solo valore
    var s = _state(key);
    s.target = _clamp(defs[key], +value);
    s.picked = false;
    s.imp = null;
    _paintCtrl(key, s);
}

/** Valori correnti (target, non il picco di un impulso in corso) — usati per salvare i preset */
export function getCurrentMacroVars() {
    var out = {};
    Object.keys(defs).forEach(function(k) { out[k] = _state(k).target; });
    return out;
}

/** Copia della lista macro dal DB (per Macro Manager) */
export function getMacroList() {
    return macroList.slice();
}

/** Mappature parsate (sorgente + params) per il dispatcher — non modificare */
export function getMappings() {
    return mappings;
}

/** Key di tutte le variabili definite, in ordine DB (per la vista Perform) */
export function getVarKeys() {
    return Object.keys(defs);
}

/** Definizione normalizzata di una variabile (per UI) */
export function getVarDef(key) {
    return defs[key];
}

/**
 * Valori ricevuti da sync_macros (stato server alla connessione o un altro mixer).
 * Applicati direttamente senza glide e senza rimandarli: niente ping-pong tra mixer.
 */
export function setMacroVars(vars) {
    Object.keys(vars || {}).forEach(function(k) {
        var v = +vars[k], s = _state(k);
        s.target = s.value = M[k] = v;
        s.picked = false;
        s.imp = null;
        _paint(k);
    });
}

/** Valori di un preset (merge, non sostituzione: le variabili assenti restano dove sono) */
export function loadPresetVars(vars) {
    Object.keys(vars || {}).forEach(function(k) { updateMacroVar(k, vars[k]); });
}

/**
 * Aggiorna la lista macro, ricalcola definizioni/mappature e ri-renderizza gli slider.
 * Chiamato da mixerEmitter.js su get_macros / macro_created / macro_deleted.
 */
export function setMacroList(macros) {
    macroList = macros || [];
    mappings = macroList.map(function(m) {
        return { m: m, src: parseJSON(m.trigger, null), p: parseJSON(m.params, {}) };
    });
    defs = {};
    mappings.forEach(function(x) {
        if (x.m.type !== 'variable') return;
        var d = _def(x);
        x.key = d.key; // il dispatcher usa la stessa key normalizzata
        defs[d.key] = d;
        _state(d.key); // garantisce M[key]: processMacroVars non lascia placeholder
    });
    renderMacroPanel();
}

/**
 * Sostituisce {{key}} (vedi macroLive.js) e segnala i casi che altrimenti
 * fallirebbero in silenzio: variabile non definita, uso dentro un'espressione.
 * @param {string} jsx
 * @returns {string}
 */
export function processMacroVars(jsx) {
    var r = window.processMacroVars(jsx);
    var uniq = function(a) { return a.filter(function(k, i) { return a.indexOf(k) === i; }); };
    if (r.missing.length) {
        showToast('⚠ Variabile non definita: {{' + uniq(r.missing).join('}} {{') + '}}', 'error');
    }
    if (r.warnings.length) {
        var k = r.warnings[0];
        showToast('ℹ {{' + k + '}} in un\'espressione: è live solo in una funzione, es. ()=>M.' + k + '*2', 'info');
    }
    return r.code;
}

// --- UI ---

function _fmt(v) {
    return String(+(+v).toFixed(Math.abs(v) >= 100 ? 0 : 3));
}

/** Aggiorna tutti gli elementi legati alla variabile (slider, valore) ovunque siano */
function _paint(key) {
    var v = M[key], txt = _fmt(v);
    document.querySelectorAll('[data-var-key="' + CSS.escape(key) + '"]').forEach(function(el) {
        if (!el.matches(':active')) el.value = v; // non strappare lo slider sotto il mouse
    });
    document.querySelectorAll('[data-var-val="' + CSS.escape(key) + '"]').forEach(function(el) { el.textContent = txt; });
}

/** Posizione del controllo fisico quando non ha ancora "agganciato" il valore (soft takeover) */
function _ctrlText(s) {
    return s.picked || s.ctrl === undefined ? '' : '◇' + _fmt(s.ctrl);
}
function _paintCtrl(key, s) {
    var txt = _ctrlText(s);
    document.querySelectorAll('[data-var-ctrl="' + CSS.escape(key) + '"]').forEach(function(el) { el.textContent = txt; });
}

/** Evidenzia la variabile quando la sua sorgente si muove (RF7) */
function _flash(key, s) {
    document.querySelectorAll('[data-var-row="' + CSS.escape(key) + '"]').forEach(function(el) { el.classList.add('var-active'); });
    clearTimeout(s.flashT);
    s.flashT = setTimeout(function() {
        document.querySelectorAll('[data-var-row="' + CSS.escape(key) + '"]').forEach(function(el) { el.classList.remove('var-active'); });
    }, 200);
}

/**
 * Controllo di una variabile: nome, valore, posizione controller, slider, sorgente.
 * Usato dalla sidebar e (vertical=true) dalla vista Perform.
 * @param {string} key
 * @param {boolean} vertical
 * @returns {HTMLElement}
 */
export function buildVarControl(key, vertical) {
    var d = defs[key], s = _state(key);
    var row = document.createElement('div');
    row.className = 'var-ctl' + (vertical ? ' var-vert' : '');
    row.dataset.varRow = key;

    var head = document.createElement('div');
    head.className = 'var-head';
    var name = document.createElement('span');
    name.className = 'var-name';
    name.textContent = '{{' + key + '}}';
    var ctrl = document.createElement('span');
    ctrl.className = 'var-ctrl';
    ctrl.dataset.varCtrl = key;
    ctrl.textContent = _ctrlText(s);
    ctrl.title = 'Posizione del controllo: portalo al valore per riprenderlo (soft takeover)';
    var val = document.createElement('span');
    val.className = 'var-val';
    val.dataset.varVal = key;
    val.textContent = _fmt(M[key]);
    head.append(name, ctrl, val);

    var slider = document.createElement('input');
    slider.type = 'range';
    slider.min = Math.min(d.min, d.max);
    slider.max = Math.max(d.min, d.max);
    slider.step = Math.abs(d.step) || 'any';
    slider.value = M[key];
    slider.dataset.varKey = key;
    slider.addEventListener('input', function() { updateMacroVar(key, parseFloat(this.value)); });

    var src = document.createElement('div');
    src.className = 'var-src';
    src.textContent = d.src ? sourceLabel(d.src) + ' · ' + MODES[d.mode] : 'nessuna sorgente';

    // Sidebar: sorgente nella riga del nome, per stare in poco spazio; Perform: sotto la barra
    if (vertical) row.append(head, slider, src);
    else { head.insertBefore(src, ctrl); row.append(head, slider); }
    return row;
}

/** Slider delle variabili nella sidebar (#macroSliders); gestione nel Macro Manager */
export function renderMacroPanel() {
    var container = document.getElementById('macroSliders');
    var panel = document.getElementById('macroPanel');
    if (!container) return;
    var keys = Object.keys(defs);
    if (panel) panel.style.display = keys.length > 0 ? '' : 'none';
    container.innerHTML = '';
    keys.forEach(function(key) { container.appendChild(buildVarControl(key, false)); });
}
