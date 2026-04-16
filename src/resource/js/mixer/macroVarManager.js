/**
 * macroVarManager.js — Gestione variabili macro live
 *
 * Responsabilità:
 *  - Stato corrente delle variabili macro { key: numericValue }
 *  - Preprocessing codice Hydra: sostituisce {{key}} con valore numerico
 *  - Rendering panel slider nel DOM (#macroSliders)
 *  - Sincronizzazione valori via socket (sync_macros) al live.html
 *
 * Non importa altri moduli mixer per evitare dipendenze circolari.
 * La funzione emit viene iniettata da deckManager.js via initMacroVars().
 */

// Valori correnti delle variabili macro (stato locale mixer)
var currentMacroVars = {};

// Lista completa delle macro dal DB (aggiornata da setMacroList)
var macroList = [];

// Riferimento alla funzione emit Socket.IO (iniettato da deckManager.js)
var _emit = null;

/**
 * Inizializza il modulo con la funzione emit Socket.IO.
 * Va chiamata una sola volta durante init().
 * @param {Function} emitFn - funzione emit da mixerEmitter.js
 */
export function initMacroVars(emitFn) {
    _emit = emitFn;
}

/**
 * Sostituisce {{key}} nel codice Hydra con il valore numerico corrente.
 * Usa parseFloat per sicurezza: non inserisce mai stringhe arbitrarie nel codice.
 * Se un placeholder non ha valore, lo lascia invariato.
 * @param {string} jsx - codice Hydra da processare
 * @param {object} vars - mappa { key: value }
 * @returns {string} codice con placeholder sostituiti
 */
export function processMacroVars(jsx, vars) {
    if (!jsx || !vars || Object.keys(vars).length === 0) return jsx;
    return jsx.replace(/\{\{(\w+)\}\}/g, function(match, key) {
        return key in vars ? parseFloat(vars[key]) : match;
    });
}

/**
 * Aggiorna un singolo valore macro e sincronizza via socket verso live.html.
 * Aggiorna anche il DOM slider e il valSpan se la chiamata viene da MIDI (MACRO3).
 * @param {string} key - nome del placeholder
 * @param {number} value - nuovo valore numerico
 */
export function updateMacroVar(key, value) {
    currentMacroVars[key] = parseFloat(value);
    // Aggiorna slider DOM (usato quando la sorgente è MIDI, non l'input range)
    var sliderEl = document.querySelector('#macroSliders input[data-key="' + key + '"]');
    if (sliderEl && sliderEl !== document.activeElement) sliderEl.value = value;
    var valSpanEl = sliderEl && sliderEl.parentElement && sliderEl.parentElement.querySelector('[id^="macro-val-"]');
    if (valSpanEl) valSpanEl.textContent = parseFloat(value);
    if (_emit) _emit('sync_macros', currentMacroVars);
}

/** Restituisce una copia dell'oggetto valori correnti */
export function getCurrentMacroVars() {
    return currentMacroVars;
}

/** Restituisce una copia della lista macro dal DB (per Macro Manager Panel) */
export function getMacroList() {
    return macroList.slice();
}

/**
 * Sovrascrive lo stato locale con i valori ricevuti dal socket.
 * Usato da mixerEmitter.js quando arriva sync_macros da altri client.
 */
export function setMacroVars(vars) {
    currentMacroVars = Object.assign({}, vars);
}

/**
 * Sovrascrive i valori macro correnti con quelli di un preset, re-renderizza gli slider
 * e sincronizza verso live.html via sync_macros.
 * Chiamato da presetManager.js quando si applica un preset.
 * @param {object} vars - mappa { key: value } dai dati del preset
 */
export function loadPresetVars(vars) {
    currentMacroVars = Object.assign({}, vars);
    renderMacroPanel();
    if (_emit) _emit('sync_macros', currentMacroVars);
}

/**
 * Aggiorna la lista macro e ri-renderizza il panel slider.
 * Chiamato da mixerEmitter.js su get_macros / macro_created / macro_deleted.
 * @param {Array} macros - array di oggetti macro dal DB
 */
export function setMacroList(macros) {
    macroList = macros || [];
    renderMacroPanel();
}

/**
 * Renderizza il panel slider nel DOM per le macro di tipo 'variable'.
 * Ogni slider aggiorna currentMacroVars e invia sync_macros al live.
 * Usa confirm() per la conferma di eliminazione (semplice, senza modal).
 */
export function renderMacroPanel() {
    var container = document.getElementById('macroSliders');
    var panel = document.getElementById('macroPanel');
    if (!container) return;

    // Filtra solo le macro di tipo variabile
    var varMacros = macroList.filter(function(m) { return m.type === 'variable'; });

    // Mostra/nasconde il panel in base al contenuto
    if (panel) panel.style.display = varMacros.length > 0 ? '' : 'none';
    container.innerHTML = '';

    varMacros.forEach(function(macro) {
        // params può essere stringa JSON o oggetto
        var params = {};
        try {
            params = typeof macro.params === 'string' ? JSON.parse(macro.params) : (macro.params || {});
        } catch(e) {}

        var key      = params.key  || macro.name || String(macro.id);
        var min      = params.min  !== undefined ? params.min  : 0;
        var max      = params.max  !== undefined ? params.max  : 1;
        var step     = params.step !== undefined ? params.step : 0.01;
        var defVal   = params.value !== undefined ? params.value : min;

        // Inizializza il valore corrente se non già presente
        if (currentMacroVars[key] === undefined) currentMacroVars[key] = defVal;
        var curVal = currentMacroVars[key];

        // Riga contenitore slider
        var row = document.createElement('div');
        row.style.cssText = 'margin:4px 0;padding:0 2px;';

        // Label riga: nome key + valore corrente + bottone elimina
        var labelRow = document.createElement('div');
        labelRow.style.cssText = 'display:flex;justify-content:space-between;align-items:center;font-size:0.8em;color:#aaa;margin-bottom:2px;';

        var nameSpan = document.createElement('span');
        nameSpan.textContent = '{{' + key + '}}';
        nameSpan.style.fontFamily = 'monospace';

        var rightGroup = document.createElement('span');
        rightGroup.style.cssText = 'display:flex;align-items:center;gap:6px;';

        var valSpan = document.createElement('span');
        valSpan.id = 'macro-val-' + macro.id;
        valSpan.textContent = curVal;
        valSpan.style.color = '#4a9eff';

        // Bottone elimina macro
        var delBtn = document.createElement('button');
        delBtn.textContent = '×';
        delBtn.title = 'Elimina macro ' + key;
        delBtn.style.cssText = 'background:none;border:none;color:#9a3a3a;cursor:pointer;font-size:1em;line-height:1;padding:0 2px;';
        delBtn.addEventListener('click', (function(macroId, macroKey) {
            return function() {
                if (confirm('Eliminare la macro variabile "' + macroKey + '"?')) {
                    if (_emit) _emit('delete_macro', macroId);
                }
            };
        })(macro.id, key));

        rightGroup.appendChild(valSpan);
        rightGroup.appendChild(delBtn);

        labelRow.appendChild(nameSpan);
        labelRow.appendChild(rightGroup);

        // Slider range — data-key usato da updateMacroVar per aggiornamento DOM da MIDI (MACRO3)
        var slider = document.createElement('input');
        slider.type = 'range';
        slider.min = min;
        slider.max = max;
        slider.step = step;
        slider.value = curVal;
        slider.dataset.key = key;
        slider.style.cssText = 'width:100%;accent-color:#4a9eff;cursor:pointer;';
        slider.addEventListener('input', (function(k, vs) {
            return function() {
                var v = parseFloat(this.value);
                vs.textContent = v;
                updateMacroVar(k, v);
            };
        })(key, valSpan));

        row.appendChild(labelRow);
        row.appendChild(slider);
        container.appendChild(row);
    });
}
