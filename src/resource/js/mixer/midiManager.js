/**
 * midiManager.js — Gestione MIDI Web API (MACRO3 §6)
 *
 * Responsabilità:
 *  - Richiedere accesso MIDI via navigator.requestMIDIAccess (lazy al primo uso)
 *  - Ricevere messaggi MIDI in arrivo (note on, CC) da tutti gli input connessi
 *  - Modalità "MIDI Learn": cattura il primo messaggio ricevuto e lo passa a callback
 *  - Normalizzazione CC (0–127) → range variabile [min, max]
 *
 * Non importa altri moduli per evitare dipendenze circolari.
 * Il dispatcher (onMidiMessage) è iniettato da deckManager.js via initMIDI().
 */

// Riferimento al MIDIAccess object (null finché non inizializzato)
var _midiAccess = null;

// Callback dispatcher iniettato da deckManager.js
var _onMessage = null;

// Stato modalità Learn
var _learnCallback = null;
var _learnActive = false;

/**
 * Inizializza l'accesso MIDI e attacca il listener globale.
 * Chiamato lazy (al primo click su "Learn MIDI") per rispettare la user gesture requirement.
 * @param {Function} onMessage - callback(midiInfo) dove midiInfo = { type, channel, note, ccNumber, value }
 * @returns {Promise<boolean>} true se accesso concesso
 */
export async function initMIDI(onMessage) {
    _onMessage = onMessage;
    if (_midiAccess) return true; // già inizializzato
    if (!navigator.requestMIDIAccess) {
        console.warn('midiManager: Web MIDI API non supportata da questo browser');
        return false;
    }
    try {
        _midiAccess = await navigator.requestMIDIAccess();
        _attachListeners();
        // Re-attacca listener se nuovi device vengono connessi a runtime
        _midiAccess.onstatechange = function() { _attachListeners(); };
        console.log('midiManager: accesso MIDI concesso, input disponibili:', _midiAccess.inputs.size);
        return true;
    } catch (e) {
        console.warn('midiManager: accesso MIDI negato —', e.message);
        return false;
    }
}

/**
 * Attiva la modalità "Learn": il prossimo messaggio MIDI ricevuto viene passato
 * a callback e la modalità si disattiva automaticamente.
 * @param {Function} callback - callback({ channel, note, ccNumber, type }) — un campo per tipo
 */
export function startLearn(callback) {
    _learnCallback = callback;
    _learnActive = true;
    console.log('midiManager: MIDI Learn attivato');
}

/**
 * Disattiva la modalità Learn senza attendere un messaggio.
 */
export function stopLearn() {
    _learnActive = false;
    _learnCallback = null;
    console.log('midiManager: MIDI Learn disattivato');
}

/**
 * Normalizza un valore CC MIDI (0–127) al range [min, max] della variabile.
 * @param {number} ccValue - valore CC 0-127
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function normalizeCCValue(ccValue, min, max) {
    return min + (ccValue / 127) * (max - min);
}

// --- INTERNALS ---

function _attachListeners() {
    if (!_midiAccess) return;
    _midiAccess.inputs.forEach(function(input) {
        // Sovrascrive sempre: evita listener duplicati su stesso input
        input.onmidimessage = _handleMidiMessage;
    });
}

function _handleMidiMessage(event) {
    var data    = event.data;
    var status  = data[0];
    var data1   = data[1]; // note o CC number
    var data2   = data[2]; // velocity o CC value

    var channel = (status & 0x0f) + 1; // canale MIDI 1-16
    var type    = status & 0xf0;       // tipo messaggio

    var midiInfo = null;

    if (type === 0x90 && data2 > 0) {
        // Note On
        midiInfo = { type: 'note', channel: channel, note: data1, value: data2 };
    } else if (type === 0xb0) {
        // Control Change
        midiInfo = { type: 'cc', channel: channel, ccNumber: data1, value: data2 };
    }

    if (!midiInfo) return;

    // Modalità Learn: intercetta il primo messaggio e chiama callback
    if (_learnActive && _learnCallback) {
        _learnActive = false;
        var cb = _learnCallback;
        _learnCallback = null;
        cb(midiInfo);
        return; // non passa al dispatcher normale durante learn
    }

    // Dispatcher normale
    if (_onMessage) _onMessage(midiInfo);
}
