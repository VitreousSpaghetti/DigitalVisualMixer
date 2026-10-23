/**
 * sourceUtil.js — Sorgenti delle Mappature (PERFORM §2), senza dipendenze.
 *
 * Una sorgente è il `trigger` di una macro, in un unico formato per tutti i controller:
 *   {type:'cc',     ch, n}            CC MIDI (ch assente = qualsiasi canale)
 *   {type:'note',   ch, n, nTo?}      nota MIDI, opzionale intervallo n..nTo
 *   {type:'axis',   pad, i}           asse gamepad
 *   {type:'button', pad, i}           bottone/grilletto gamepad
 *   {type:'key',    key, ctrl, shift, alt}
 * Modulo a parte per evitare import circolari tra motore, dispatcher e UI.
 */

/** Parse sicuro di una stringa JSON (o oggetto già parsato) */
export function parseJSON(s, fallback) {
    if (s && typeof s === 'object') return s;
    try { return (s && JSON.parse(s)) || fallback; } catch (e) { return fallback; }
}

/** Sorgenti "a pressione" (fronte su/giù) contro quelle continue (cc, axis) */
export function isPress(src) {
    return !!src && (src.type === 'note' || src.type === 'button' || src.type === 'key');
}

var NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
/** 60 → "C4" (convenzione General MIDI) */
export function noteName(n) {
    return NOTES[n % 12] + (Math.floor(n / 12) - 1);
}

/** Etichetta leggibile, usata in Macro Manager, monitor input e vista Perform */
export function sourceLabel(src) {
    if (!src) return '—';
    var ch = src.ch ? ' ch' + src.ch : '';
    switch (src.type) {
        case 'cc':     return 'CC' + src.n + ch;
        case 'note':   return '♪' + noteName(src.n) + (src.nTo > src.n ? '–' + noteName(src.nTo) : '') + ch;
        case 'axis':   return '🎮' + src.pad + ' asse ' + src.i;
        case 'button': return '🎮' + src.pad + ' B' + src.i;
        case 'key':    return '⌨ ' + (src.ctrl ? 'Ctrl+' : '') + (src.shift ? 'Shift+' : '') + (src.alt ? 'Alt+' : '') + src.key;
    }
    return '?';
}

/** Famiglia per il filtro del Macro Manager */
export function sourceFamily(src) {
    if (!src) return 'none';
    return src.type === 'cc' || src.type === 'note' ? 'midi' : src.type === 'key' ? 'key' : 'gamepad';
}

/** Identità della sorgente per evidenziare i conflitti (stessa sorgente su più righe) */
export function sourceId(src) {
    if (!src) return '';
    if (src.type === 'key') return 'key:' + src.key + (src.ctrl ? 'C' : '') + (src.shift ? 'S' : '') + (src.alt ? 'A' : '');
    if (src.type === 'cc' || src.type === 'note') return src.type + ':' + (src.ch || '*') + ':' + src.n;
    return src.type + ':' + src.pad + ':' + src.i;
}

/**
 * La sorgente mappata `m` corrisponde alla sorgente dell'evento `e`?
 * @param {boolean} anyPad - true con un solo gamepad collegato: l'indice del pad viene
 *   ignorato, così le mappature sopravvivono a un ricollegamento con indice diverso
 */
export function sameSource(m, e, anyPad) {
    if (!m || !e || m.type !== e.type) return false;
    switch (m.type) {
        case 'cc':     return m.n === e.n && (!m.ch || m.ch === e.ch);
        case 'note':   return (!m.ch || m.ch === e.ch) && e.n >= m.n && e.n <= Math.max(m.n, m.nTo || 0);
        case 'axis':
        case 'button': return m.i === e.i && (anyPad || m.pad === e.pad);
        // Al keyup i modificatori possono essere già rilasciati: l'evento li omette e si confronta solo il tasto
        case 'key':    return m.key === e.key && (e.ctrl === undefined ||
                              (!!m.ctrl === e.ctrl && !!m.shift === e.shift && !!m.alt === e.alt));
    }
    return false;
}
