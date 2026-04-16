/**
 * presetManager.js — Gestione preset nominati
 *
 * Responsabilità:
 *  - Stato lista preset { id, name, channelId, macroVars, transition, createdAt }
 *  - Rendering panel preset nel DOM (#presetList)
 *  - Apply preset: selectChannelLoad + loadPresetVars + aggiorna UI transizione
 *  - applyPresetById: usato da macroManager.js per le macro azione con tipo 'applyPreset'
 *
 * Non importa mixerManager/deckManager per evitare circular imports.
 * Le funzioni globali window.selectChannelLoad e window.applyPresetById
 * sono esposte da deckManager.js al momento dell'init.
 * La funzione emit viene iniettata da deckManager.js via initPresets().
 */

import { loadPresetVars } from './macroVarManager.js';

// Lista preset dal DB (aggiornata da setPresetList)
var presetList = [];

// Riferimento emit Socket.IO (iniettato da deckManager.js)
var _emit = null;

/**
 * Inizializza il modulo con la funzione emit Socket.IO.
 * Va chiamata una sola volta durante init() in deckManager.js.
 * @param {Function} emitFn - funzione emit da mixerEmitter.js
 */
export function initPresets(emitFn) {
    _emit = emitFn;
}

/**
 * Aggiorna la lista preset e ri-renderizza il panel.
 * Chiamato da mixerEmitter.js su get_presets / preset_created / preset_deleted.
 * @param {Array} presets - array di oggetti preset dal DB
 */
export function setPresetList(presets) {
    presetList = presets || [];
    renderPresetPanel();
}

/** Restituisce una copia della lista preset corrente (per Macro Manager Panel - MACRO3) */
export function getPresetList() {
    return presetList.slice();
}

/**
 * Applica un preset per id numerico.
 * Usato da macroManager.js nel case 'applyPreset' delle macro azione.
 * @param {number} presetId
 */
export function applyPresetById(presetId) {
    var preset = presetList.find(function(p) { return p.id === presetId; });
    if (!preset) {
        console.warn('presetManager: preset id=' + presetId + ' non trovato');
        return;
    }
    applyPreset(preset);
}

/**
 * Applica un preset: carica canale, imposta variabili macro, aggiorna UI transizione.
 * Nessun auto-run: l'operatore decide quando mandare in live.
 * @param {object} preset - oggetto preset dal DB
 */
function applyPreset(preset) {
    console.log('presetManager: apply preset "' + preset.name + '" id=' + preset.id);

    // 1. Carica il canale nell'editor (già esposto come globale da deckManager.js)
    if (window.selectChannelLoad) {
        window.selectChannelLoad(preset.channelId);
    }

    // 2. Parse macroVars (JSON string → oggetto)
    var vars = {};
    try {
        vars = typeof preset.macroVars === 'string'
            ? JSON.parse(preset.macroVars)
            : (preset.macroVars || {});
    } catch(e) {
        console.warn('presetManager: macroVars parse error', e);
    }

    // 3. Applica variabili macro → aggiorna slider + sync verso live.html
    loadPresetVars(vars);

    // 4. Parse transition e aggiorna UI (non salva nel DB: solo aggiornamento visuale)
    var trans = {};
    try {
        trans = typeof preset.transition === 'string'
            ? JSON.parse(preset.transition)
            : (preset.transition || {});
    } catch(e) {}
    var typeEl = document.getElementById('transitionType');
    var durEl  = document.getElementById('transitionDuration');
    if (typeEl && trans.type)     typeEl.value = trans.type;
    if (durEl  && trans.duration !== undefined) durEl.value = trans.duration;
}

/**
 * Renderizza il panel preset nel DOM (#presetList).
 * Ogni riga: nome preset + canale id + bottone ▶ apply + bottone × delete.
 * Mostra/nasconde #presetPanel in base al contenuto.
 */
export function renderPresetPanel() {
    var container = document.getElementById('presetList');
    var panel     = document.getElementById('presetPanel');
    if (!container) return;

    // Mostra/nasconde il panel in base alla presenza di preset
    if (panel) panel.style.display = presetList.length > 0 ? '' : 'none';
    container.innerHTML = '';

    presetList.forEach(function(preset) {
        var row = document.createElement('div');
        row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:4px 2px;font-size:0.82em;color:#ccc;border-bottom:1px solid #333;';

        // Colonna sinistra: nome + canale
        var infoCol = document.createElement('div');
        infoCol.style.cssText = 'flex:1;overflow:hidden;';

        var nameSpan = document.createElement('span');
        nameSpan.textContent = preset.name || ('Preset #' + preset.id);
        nameSpan.style.cssText = 'display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';

        var channelSpan = document.createElement('span');
        channelSpan.textContent = 'ch: ' + preset.channelId;
        channelSpan.style.cssText = 'font-size:0.8em;color:#777;';

        infoCol.appendChild(nameSpan);
        infoCol.appendChild(channelSpan);

        // Colonna destra: bottoni apply + delete
        var btnGroup = document.createElement('span');
        btnGroup.style.cssText = 'display:flex;align-items:center;gap:4px;flex-shrink:0;';

        // Bottone ▶ — applica preset
        var applyBtn = document.createElement('button');
        applyBtn.textContent = '▶';
        applyBtn.title = 'Applica preset "' + (preset.name || preset.id) + '"';
        applyBtn.style.cssText = 'background:#1a4a1a;border:1px solid #3a9a3a;color:#aaffaa;cursor:pointer;font-size:0.85em;padding:1px 5px;border-radius:3px;';
        applyBtn.addEventListener('click', (function(p) {
            return function() { applyPreset(p); };
        })(preset));

        // Bottone × — elimina preset
        var delBtn = document.createElement('button');
        delBtn.textContent = '×';
        delBtn.title = 'Elimina preset "' + (preset.name || preset.id) + '"';
        delBtn.style.cssText = 'background:none;border:none;color:#9a3a3a;cursor:pointer;font-size:1em;padding:0 2px;';
        delBtn.addEventListener('click', (function(id, name) {
            return function() {
                if (confirm('Eliminare il preset "' + name + '"?')) {
                    if (_emit) _emit('delete_preset', id);
                }
            };
        })(preset.id, preset.name || preset.id));

        btnGroup.appendChild(applyBtn);
        btnGroup.appendChild(delBtn);

        row.appendChild(infoCol);
        row.appendChild(btnGroup);
        container.appendChild(row);
    });
}
