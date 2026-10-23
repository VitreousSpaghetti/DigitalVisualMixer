/**
 * macroLive.js — valori macro live (PERFORM RF1), condiviso da mixer.html e live.html.
 *
 * Script classico (non modulo) perché live.js non usa ES modules: un solo file evita
 * di tenere due copie della stessa sostituzione {{key}} come prima.
 *
 * window.M = { key: valore } è un oggetto unico mutato in place: le funzioni ()=>M.key
 * iniettate nel codice Hydra lo rileggono a ogni frame, quindi girare un knob cambia il
 * visual senza rieseguire il codice né cambiare canale.
 */
window.M = window.M || {};

/**
 * Sostituisce {{key}} nel codice Hydra:
 *  - argomento diretto (`osc({{f}}, 0.1)`) → `()=>M.f`: Hydra chiama la funzione a ogni frame
 *  - dentro un'espressione/array/assegnazione (`{{f}}*2`, `[{{a}}]`, `b={{x}}`) → `M.f`:
 *    stesso valore di prima all'esecuzione, ed è live se l'espressione viene rivalutata
 *    (es. dentro update o ()=>). Segnalato in `warnings` perché altrimenti resta fisso.
 *  - key assente da M → placeholder invariato (errore di sintassi visibile) e segnalato in `missing`
 * ponytail: profondità [] contata a testo (anche dentro commenti/stringhe); basta per il codice Hydra tipico.
 * @param {string} jsx
 * @returns {{code: string, warnings: string[], missing: string[]}}
 */
window.processMacroVars = function(jsx) {
    var warnings = [], missing = [];
    if (!jsx) return { code: jsx, warnings: warnings, missing: missing };
    var code = jsx.replace(/\{\{(\w+)\}\}/g, function(match, key, offset, src) {
        if (!(key in window.M)) { missing.push(key); return match; }
        var ref = /^[A-Za-z_$][\w$]*$/.test(key) ? 'M.' + key : 'M["' + key + '"]';
        var before = src.slice(0, offset);
        var prev = before.replace(/\s+$/, '').slice(-1);
        var next = src.slice(offset + match.length).replace(/^\s+/, '').charAt(0);
        var depth = (before.match(/\[/g) || []).length - (before.match(/\]/g) || []).length;
        if ((prev === '(' || prev === ',') && (next === ')' || next === ',') && depth <= 0) {
            return '()=>' + ref;
        }
        warnings.push(key);
        return ref;
    });
    return { code: code, warnings: warnings, missing: missing };
};
