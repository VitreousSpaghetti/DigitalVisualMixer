/**
 * macroManager.js — Keyboard shortcuts e Macro Azioni
 *
 * Responsabilità:
 *  - Shortcut keyboard hardcoded (Ctrl+Arrow, Ctrl+Enter)
 *  - Esecuzione sequenze di azioni (setChannel, run, save, prev, rangeChannel, …)
 *  - Lista compatta in sola lettura delle mappature nella sidebar (PERFORM RF10)
 *
 * I trigger (tastiera, MIDI, gamepad) sono confrontati da mappingManager.js, che chiama
 * executeActions(); le variabili sono gestite da macroVarManager.js.
 * window.selectActionExec e window.selectChannelLoad sono esposti da deckManager.js.
 */

import { parseJSON, sourceLabel, sourceIcon } from './sourceUtil.js';

/**
 * Inizializza i keyboard shortcut hardcoded.
 * Usa addEventListener invece di document.onkeyup per non sovrascrivere
 * eventuali altri listener (inclusi quelli dinamici delle macro azione).
 */
export function initMacro() {
    document.addEventListener('keyup', function(e) {
        // Ignora shortcut se il focus è su un input/textarea (es. channelName)
        var tag = document.activeElement?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;

        if (e.ctrlKey && e.key === 'Enter')      { selectActionExec('prev'); }
        if (e.ctrlKey && e.key === 'ArrowLeft')  { selectActionExec('prevRunLive'); }
        if (e.ctrlKey && e.key === 'ArrowRight') { selectActionExec('nextRunLive'); }
        if (e.ctrlKey && e.key === 'ArrowUp')    { selectActionExec('save'); }
        if (e.ctrlKey && e.key === 'ArrowDown')  { selectActionExec('run'); }
    });
}

/**
 * Esegue una sequenza di azioni macro in ordine.
 * Le azioni supportate mappano alle funzioni di selectActionExec e selectChannelLoad.
 * @param {Array} actions - array di oggetti { type, channelId?, presetId? }
 * @param {string} macroName - nome macro (per log)
 * @param {number} macroId - per il flash visivo delle righe
 * @param {number} [noteOffset] - posizione della nota nell'intervallo della sorgente (rangeChannel)
 */
export function executeActions(actions, macroName, macroId, noteOffset) {
    console.log('macroManager: esegui macro "' + macroName + '" — ' + actions.length + ' azioni');
    // Flash visivo su tutte le righe della macro (sidebar + Macro Manager), MACRO3 §8.1 / PERFORM RF7
    if (macroId !== undefined) {
        document.querySelectorAll('[data-macro-id="' + macroId + '"]').forEach(function(flashRow) {
            flashRow.classList.add('macro-flash');
            setTimeout(function() { flashRow.classList.remove('macro-flash'); }, 300);
        });
    }
    actions.forEach(function(action) {
        switch (action.type) {
            // Seleziona e carica un canale specifico
            case 'setChannel':
                if (action.channelId !== undefined && window.selectChannelLoad) {
                    window.selectChannelLoad(action.channelId);
                }
                break;
            // Azioni già gestite da selectActionExec in deckManager.js
            case 'run':
            case 'prev':
            case 'save':
            case 'saverun':
            case 'nextRunLive':
            case 'prevRunLive':
            case 'addChannel':
            case 'deleteChannel':
                selectActionExec(action.type);
                break;
            // Ottava come launchpad (RF4): nota N dell'intervallo → N-esimo canale in ordine → live
            case 'rangeChannel':
                var ch = window.getChannelList ? window.getChannelList()[noteOffset || 0] : null;
                if (ch && window.runChannel) window.runChannel(ch.id);
                break;
            // Applica un preset per id — window.applyPresetById esposto da deckManager.js.
            // Preset mancante: toast con il nome della mappatura, il forEach prosegue (PRESET RF1)
            case 'applyPreset':
                if (window.applyPresetById) window.applyPresetById(action.presetId, macroName);
                break;
            default:
                console.warn('macroManager: azione sconosciuta "' + action.type + '"');
        }
    });
}

/**
 * Lista compatta in sola lettura delle mappature attive (#macroActionsList): "sorgente → destinazione".
 * La gestione avviene nel Macro Manager (PERFORM RF10), qui niente bottoni di cancellazione.
 * @param {Array} macros - array completo di macro dal DB
 */
export function renderActionPanel(macros) {
    var container = document.getElementById('macroActionsList');
    var panel = document.getElementById('macroActionsPanel');
    if (!container) return;

    var mapped = (macros || []).filter(function(m) { return parseJSON(m.trigger, null); });
    if (panel) panel.style.display = mapped.length > 0 ? '' : 'none';
    container.innerHTML = '';

    mapped.forEach(function(macro) {
        var p = parseJSON(macro.params, {});
        var row = document.createElement('div');
        row.className = 'map-row';
        // data-macro-id / data-var-row: flash quando la sorgente scatta o si muove
        row.dataset.macroId = macro.id;
        if (macro.type === 'variable') row.dataset.varRow = p.key || macro.name;

        var src = document.createElement('kbd');
        var s = parseJSON(macro.trigger, null);
        src.innerHTML = '<i class="fa-solid fa-' + sourceIcon(s) + '" aria-hidden="true"></i> ';
        src.appendChild(document.createTextNode(sourceLabel(s)));
        row.dataset.tip = 'Source → destination. Edit it in the Mappings manager (sliders button above)';
        var dest = document.createElement('span');
        dest.textContent = macro.type === 'variable'
            ? '{{' + (p.key || macro.name) + '}}'
            : (macro.name || ('macro #' + macro.id));
        row.append(src, document.createTextNode(' → '), dest);
        container.appendChild(row);
    });
}

/**
 * Proxy locale per selectActionExec esposta globalmente da deckManager.js.
 * Evita import circolare: deckManager → macroManager → deckManager.
 */
function selectActionExec(action) {
    if (window.selectActionExec) window.selectActionExec(action);
}
