/**
 * gamepadManager.js — Driver Gamepad (Web Gamepad API), PERFORM RF6
 *
 * Il Gamepad API non genera eventi di input: si fa polling a ogni frame e si emette un
 * evento solo quando un asse o un bottone cambia valore. Assi e grilletti analogici sono
 * continui (prima si leggeva solo il fronte di salita dei bottoni sopra 0.5).
 *
 * Evento: { src: {type:'axis', pad, i}, v: -1..1 }
 *         { src: {type:'button', pad, i}, v: 0..1, down: bool }
 * Deadzone e inversione sono per variabile (macroVarManager.js), non qui.
 */

var _prev = {};
var _onInput = null;
var _onStatus = null;

/**
 * Avvia il polling continuo. Idempotente.
 * @param {Function} onInput  - callback(evento)
 * @param {Function} onStatus - callback({state:'on'|'unsupported', devices:[id]})
 */
export function initGamepad(onInput, onStatus) {
    if (_onInput) return;
    _onInput = onInput;
    _onStatus = onStatus;
    if (!navigator.getGamepads) { onStatus({ state: 'unsupported', devices: [] }); return; }
    window.addEventListener('gamepadconnected', _report);
    window.addEventListener('gamepaddisconnected', function(e) {
        // Dimentica lo stato del pad: al ricollegamento i valori ripartono senza falsi fronti.
        // Nessun evento a 0: le variabili restano congelate all'ultimo valore (edge case AF).
        Object.keys(_prev).forEach(function(k) { if (k.indexOf(e.gamepad.index + '_') === 0) delete _prev[k]; });
        _report();
    });
    _report();
    requestAnimationFrame(_poll);
}

/** Numero di pad collegati: con un solo pad le mappature ignorano l'indice (fallback AF) */
export function padCount() {
    return _pads().length;
}

function _pads() {
    return Array.prototype.filter.call(navigator.getGamepads ? navigator.getGamepads() : [], Boolean);
}

function _report() {
    _onStatus({ state: 'on', devices: _pads().map(function(p) { return p.index + ': ' + p.id; }) });
}

function _poll() {
    _pads().forEach(function(gp) {
        gp.axes.forEach(function(v, i) {
            var k = gp.index + '_a' + i;
            // Primo frame solo baseline (niente salto delle variabili al collegamento);
            // soglia minima per non inondare il dispatcher col rumore della levetta ferma
            if (_prev[k] === undefined) { _prev[k] = v; return; }
            if (Math.abs(v - _prev[k]) > 0.01) {
                _prev[k] = v;
                _onInput({ src: { type: 'axis', pad: gp.index, i: i }, v: v });
            }
        });
        gp.buttons.forEach(function(b, i) {
            var k = gp.index + '_b' + i;
            if (_prev[k] === undefined) { _prev[k] = b.value; return; } // primo frame: solo baseline
            if (b.value !== _prev[k]) {
                _prev[k] = b.value;
                _onInput({ src: { type: 'button', pad: gp.index, i: i }, v: b.value, down: b.pressed || b.value > 0.5 });
            }
        });
    });
    requestAnimationFrame(_poll);
}
