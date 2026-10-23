/**
 * midiManager.js — Driver MIDI (Web MIDI API), PERFORM RF5
 *
 * Solo input: converte i messaggi MIDI in eventi sorgente normalizzati e li passa al
 * dispatcher (mappingManager.js). Matching, Learn e modalità vivono lì, non qui.
 *
 * Evento: { src: {type:'cc', ch, n}, v: 0..1, raw: 0..127 }
 *         { src: {type:'note', ch, n}, v: velocity 0..1, down: bool }
 */

var _access = null;
var _onInput = null;
var _onStatus = null;

/**
 * Richiede l'accesso MIDI e collega tutti gli input. Chiamato all'avvio del mixer (non più
 * solo da Learn): se il browser chiede il permesso il prompt non blocca, e se viene negato
 * l'indicatore in navbar diventa il bottone "Attiva MIDI" che richiama questa funzione.
 * @param {Function} onInput  - callback(evento)
 * @param {Function} onStatus - callback({state:'on'|'denied'|'unsupported', devices:[nomi]})
 * @returns {Promise<boolean>}
 */
export async function initMIDI(onInput, onStatus) {
    if (onInput)  _onInput  = onInput;
    if (onStatus) _onStatus = onStatus;
    if (_access) return true;
    if (!navigator.requestMIDIAccess) { _status('unsupported'); return false; }
    try {
        _access = await navigator.requestMIDIAccess();
    } catch (e) {
        console.warn('midiManager: accesso MIDI negato —', e.message);
        _status('denied');
        return false;
    }
    // Collegamento/scollegamento a caldo: ricollega gli input e aggiorna l'indicatore
    _access.onstatechange = _attach;
    _attach();
    return true;
}

function _attach() {
    var names = [];
    _access.inputs.forEach(function(input) {
        // Assegnazione (non addEventListener): ricollegare più volte non duplica il listener
        input.onmidimessage = _handle;
        if (input.state !== 'disconnected') names.push(input.name);
    });
    _status('on', names);
}

function _status(state, devices) {
    if (_onStatus) _onStatus({ state: state, devices: devices || [] });
}

function _handle(event) {
    var type = event.data[0] & 0xf0;
    var ch   = (event.data[0] & 0x0f) + 1; // canale MIDI 1-16
    var d1   = event.data[1];
    var d2   = event.data[2];
    if (!_onInput) return;
    if (type === 0x90 || type === 0x80) {
        // Note On con velocity 0 = Note Off (standard di molte tastiere): serve per gate/impulso
        var down = type === 0x90 && d2 > 0;
        _onInput({ src: { type: 'note', ch: ch, n: d1 }, v: down ? d2 / 127 : 0, down: down });
    } else if (type === 0xb0) {
        // raw serve alla modalità Incremento (differenza tra due CC consecutivi)
        _onInput({ src: { type: 'cc', ch: ch, n: d1 }, v: d2 / 127, raw: d2 });
    }
}
