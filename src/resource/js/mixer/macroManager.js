/**
 * macroManager.js — Keyboard shortcuts e Macro Azioni
 *
 * Responsabilità:
 *  - Shortcut keyboard hardcoded (Ctrl+Arrow, Ctrl+Enter)
 *  - Caricamento e binding dinamico delle Macro Azione dal DB
 *  - Esecuzione sequenze di azioni (setChannel, run, save, prev, …)
 *  - setActionMacros() chiamato da mixerEmitter.js alla ricezione get_macros
 *
 * Le Macro Variabile sono gestite da macroVarManager.js.
 * window.selectActionExec e window.selectChannelLoad sono esposti da deckManager.js.
 */

// Listener dinamici installati per i trigger keyboard delle macro azione.
var _dynamicListeners = [];

// Riferimento emit iniettato da deckManager.js (evita circular imports)
var _emit = null;

/**
 * Inietta la funzione emit Socket.IO nel modulo.
 * Va chiamata in init() da deckManager.js.
 * @param {Function} emitFn
 */
export function initActionMacros(emitFn) {
    _emit = emitFn;
}

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
 * Aggiorna i binding dinamici per le macro di tipo 'action'.
 * Rimuove i listener precedenti e installa quelli nuovi.
 * Chiamato da mixerEmitter.js a ogni aggiornamento della lista macro.
 * @param {Array} macros - array di oggetti macro dal DB
 */
export function setActionMacros(macros) {
    // Rimuove tutti i listener dinamici precedenti
    _dynamicListeners.forEach(function(fn) {
        document.removeEventListener('keyup', fn);
    });
    _dynamicListeners = [];

    // Filtra solo le macro di tipo 'action' con trigger keyboard
    var actionMacros = (macros || []).filter(function(m) {
        if (m.type !== 'action') return false;
        var trigger = parseTrigger(m.trigger);
        return trigger && trigger.type === 'keyboard' && trigger.key;
    });

    actionMacros.forEach(function(macro) {
        var trigger = parseTrigger(macro.trigger);
        var params  = parseParams(macro.params);
        var actions = params.actions || [];

        var listener = function(e) {
            var tag = document.activeElement?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA') return;
            if (e.key !== trigger.key) return;
            if (!!trigger.ctrl  !== e.ctrlKey)  return;
            if (!!trigger.shift !== e.shiftKey) return;
            if (!!trigger.alt   !== e.altKey)   return;
            executeActions(actions, macro.name, macro.id);
        };

        document.addEventListener('keyup', listener);
        _dynamicListeners.push(listener);
        console.log('macroManager: bind keyboard "' + trigger.key + '" → macro "' + macro.name + '"');
    });

    // Aggiorna la UI del panel azioni
    renderActionPanel(macros);
}

/**
 * Esegue una sequenza di azioni macro in ordine.
 * Le azioni supportate mappano alle funzioni di selectActionExec e selectChannelLoad.
 * @param {Array} actions - array di oggetti { type, channelId? }
 * @param {string} macroName - nome macro (per log)
 */
function executeActions(actions, macroName, macroId) {
    console.log('macroManager: esegui macro "' + macroName + '" — ' + actions.length + ' azioni');
    // Flash visivo sulla riga del panel (MACRO3 §8.1)
    if (macroId !== undefined) {
        var flashRow = document.querySelector('[data-macro-id="' + macroId + '"]');
        if (flashRow) {
            flashRow.classList.add('macro-flash');
            setTimeout(function() { flashRow.classList.remove('macro-flash'); }, 300);
        }
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
            // Applica un preset per id — window.applyPresetById esposto da deckManager.js
            case 'applyPreset':
                if (action.presetId !== undefined && window.applyPresetById) {
                    window.applyPresetById(action.presetId);
                }
                break;
            default:
                console.warn('macroManager: azione sconosciuta "' + action.type + '"');
        }
    });
}

/**
 * Renderizza la lista macro azione nel DOM (#macroActionsList).
 * Mostra nome + trigger key + bottone elimina per ogni macro azione.
 * Chiamato da setActionMacros() dopo ogni aggiornamento lista.
 * @param {Array} macros - array completo di macro dal DB
 */
export function renderActionPanel(macros) {
    var container = document.getElementById('macroActionsList');
    var panel = document.getElementById('macroActionsPanel');
    if (!container) return;

    var actionMacros = (macros || []).filter(function(m) { return m.type === 'action'; });

    if (panel) panel.style.display = actionMacros.length > 0 ? '' : 'none';
    container.innerHTML = '';

    actionMacros.forEach(function(macro) {
        var trigger = parseTrigger(macro.trigger);
        var keyLabel = trigger
            ? (trigger.ctrl ? 'Ctrl+' : '') + (trigger.shift ? 'Shift+' : '') + trigger.key
            : '—';

        var row = document.createElement('div');
        // data-macro-id usato da executeActions per il flash visivo (MACRO3 §8.1)
        row.dataset.macroId = macro.id;
        row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:3px 2px;font-size:0.82em;color:#ccc;border-bottom:1px solid #333;';

        var nameSpan = document.createElement('span');
        nameSpan.textContent = macro.name || ('macro #' + macro.id);

        var rightGroup = document.createElement('span');
        rightGroup.style.cssText = 'display:flex;align-items:center;gap:6px;';

        var keySpan = document.createElement('kbd');
        keySpan.textContent = keyLabel;
        keySpan.style.cssText = 'font-size:0.85em;padding:1px 4px;background:#333;border:1px solid #555;border-radius:3px;color:#aaa;';

        var delBtn = document.createElement('button');
        delBtn.textContent = '×';
        delBtn.title = 'Elimina macro azione';
        delBtn.style.cssText = 'background:none;border:none;color:#9a3a3a;cursor:pointer;font-size:1em;padding:0 2px;';
        delBtn.addEventListener('click', (function(id, name) {
            return function() {
                if (confirm('Eliminare la macro azione "' + name + '"?')) {
                    if (_emit) _emit('delete_macro', id);
                }
            };
        })(macro.id, macro.name));

        rightGroup.appendChild(keySpan);
        rightGroup.appendChild(delBtn);
        row.appendChild(nameSpan);
        row.appendChild(rightGroup);
        container.appendChild(row);
    });
}

/** Parse sicuro di trigger (stringa JSON o oggetto) */
function parseTrigger(trigger) {
    if (!trigger) return null;
    if (typeof trigger === 'string') {
        try { return JSON.parse(trigger); } catch(e) { return null; }
    }
    return trigger;
}

/** Parse sicuro di params (stringa JSON o oggetto) */
function parseParams(params) {
    if (!params) return {};
    if (typeof params === 'string') {
        try { return JSON.parse(params); } catch(e) { return {}; }
    }
    return params;
}

/**
 * Proxy locale per selectActionExec esposta globalmente da deckManager.js.
 * Evita import circolare: deckManager → macroManager → deckManager.
 */
function selectActionExec(action) {
    if (window.selectActionExec) window.selectActionExec(action);
}
