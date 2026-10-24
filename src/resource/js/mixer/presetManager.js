/**
 * presetManager.js — Gestione preset nominati
 *
 * Responsabilità:
 *  - Stato lista preset { id, name, channelId, macroVars, transition, createdAt }
 *  - Unica implementazione di righe e azioni preset (Apply/Update/Rename/Delete) per sidebar
 *    (#presetList) e tab Presets di Mappings: così le due liste non si disallineano (PRESET RF4)
 *  - Apply preset: canale (se esiste ancora) + variabili + transizione attiva e salvata
 *  - applyPresetById: usato da macroManager.js (step 'applyPreset'), Perform e palette
 *
 * window.selectChannelLoad, window.getChannelList e window.applyPresetById sono esposti da
 * deckManager.js all'init. La funzione emit viene iniettata da deckManager.js via initPresets().
 */

import { loadPresetVars, getCurrentMacroVars, getMacroList } from './macroVarManager.js';
import { channelSelected } from './mixerManager.js';
import { parseJSON } from './sourceUtil.js';
import { showToast } from './toastManager.js';
import { icon } from './uiHelp.js';

// Lista preset dal DB (aggiornata da setPresetList)
var presetList = [];
// Nomi di tutti i preset visti nella sessione, anche se poi eliminati: il toast di un'Action
// su un preset mancante può ancora dire quale era (RF1)
var _names = {};

// Riferimento emit Socket.IO (iniettato da deckManager.js)
var _emit = null;

var MISSING_CH_TIP = 'Its channel was deleted: apply a channel and press Update to fix it';

function _esc(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function _name(p) { return p.name || 'Preset #' + p.id; }

/**
 * Inizializza il modulo con la funzione emit Socket.IO.
 * Va chiamata una sola volta durante init() in deckManager.js.
 * @param {Function} emitFn - funzione emit da mixerEmitter.js
 */
export function initPresets(emitFn) {
    _emit = emitFn;
    var list = document.getElementById('presetList');
    if (list) list.addEventListener('click', onPresetClick);
}

/**
 * Aggiorna la lista preset e ri-renderizza il panel.
 * Chiamato da mixerEmitter.js su get_presets / preset_created / preset_deleted / preset_updated.
 * @param {Array} presets - array di oggetti preset dal DB
 */
export function setPresetList(presets) {
    presetList = presets || [];
    presetList.forEach(function(p) { _names[p.id] = p.name; });
    renderPresetPanel();
}

/** Restituisce una copia della lista preset corrente (per Macro Manager Panel - MACRO3) */
export function getPresetList() {
    return presetList.slice();
}

/** Nome di un preset per i messaggi: '"Intro"' se noto (anche se eliminato), altrimenti '#id' */
export function presetLabel(id) {
    return _names[id] ? '"' + _names[id] + '"' : '#' + (id ?? '?');
}

/**
 * Canale del preset per le liste (RF12) e stato "canale eliminato" (RF7).
 * Con la lista canali non ancora arrivata dal server non si segnala nulla: sarebbe un falso allarme.
 * @returns {{label: string, tip: string, missing: boolean}}
 */
export function presetChannel(p) {
    var list = window.getChannelList ? window.getChannelList() : [];
    var c = list.find(function(x) { return x.id == p.channelId; });
    if (c) return { label: c.name || String(c.id), tip: 'Channel id: ' + c.id, missing: false };
    return { label: 'ch #' + p.channelId, tip: list.length ? MISSING_CH_TIP : '', missing: list.length > 0 };
}

/** Stato corrente da salvare in un preset (Save preset e Update) */
export function currentPresetState() {
    var typeEl = document.getElementById('transitionType');
    var durEl  = document.getElementById('transitionDuration');
    return {
        channelId:  channelSelected,
        macroVars:  getCurrentMacroVars(),
        transition: { type: typeEl ? typeEl.value : 'cut', duration: durEl ? parseInt(durEl.value) || 0 : 0 }
    };
}

/**
 * Applica un preset per id numerico (step 'applyPreset', Perform, palette).
 * Preset eliminato: solo toast, niente modale, si è in live; gli altri step dell'Action
 * continuano perché executeActions non si interrompe (RF1).
 * @param {number} presetId
 * @param {string} [mappingName] - nome dell'Action che lo applica, per il toast
 */
export function applyPresetById(presetId, mappingName) {
    var preset = presetList.find(function(p) { return p.id === presetId; });
    if (!preset) {
        showToast('Preset not found: ' + presetLabel(presetId) + (mappingName ? ' (mapping "' + mappingName + '")' : ''), 'error');
        return;
    }
    applyPreset(preset);
}

/**
 * Applica un preset: carica canale, imposta variabili macro, imposta e salva la transizione.
 * Nessun auto-run: l'operatore decide quando mandare in live.
 * @param {object} preset - oggetto preset dal DB
 */
function applyPreset(preset) {
    console.log('presetManager: apply preset "' + preset.name + '" id=' + preset.id);

    // RF7/E7: canale eliminato → l'editor resta dov'è (niente id inesistente, niente autosave
    // su un canale che non c'è); variabili e transizione si applicano comunque
    if (presetChannel(preset).missing) {
        showToast('Channel of preset "' + _name(preset) + '" no longer exists: only variables and transition applied', 'error');
    } else if (window.selectChannelLoad) {
        window.selectChannelLoad(preset.channelId);
    }

    loadPresetVars(parseJSON(preset.macroVars, {}));
    _applyTransition(parseJSON(preset.transition, {}));
}

/**
 * RF6: la transizione del preset diventa quella attiva. Il 'change' su #transitionType passa da
 * saveTransition() (mixerManager.js), lo stesso percorso della scelta a mano: il server la salva
 * e il prossimo invio in Live la usa. Transizione assente o non valida (vecchi record, E3): invariata.
 */
function _applyTransition(t) {
    var typeEl = document.getElementById('transitionType');
    var durEl  = document.getElementById('transitionDuration');
    if (!typeEl || !durEl) return;
    var validType = Array.from(typeEl.options).some(function(o) { return o.value === t.type; });
    var dur = Number(t.duration);
    if (!validType || t.duration === null || t.duration === '' || !isFinite(dur) || dur < 0) return;
    typeEl.value = t.type;
    durEl.value = dur;
    typeEl.dispatchEvent(new Event('change'));
}

// RF11: sovrascrittura solo dopo conferma (le azioni con conferma esistono solo col mouse)
function _update(p) {
    if (!confirm('Overwrite preset "' + _name(p) + '" with the current channel, variables and transition?')) return;
    _emit('update_preset', Object.assign({ id: p.id }, currentPresetState()));
    showToast('Preset updated with the current state');
}

// RF10: le Action che usano il preset restano, con lo step marcato "missing" in Mappings
function _delete(p) {
    var users = getMacroList().filter(function(m) {
        return m.type === 'action' && (parseJSON(m.params, {}).actions || []).some(function(a) {
            return a.type === 'applyPreset' && a.presetId === p.id;
        });
    }).map(function(m) { return '"' + (m.name || m.id) + '"'; });
    var msg = 'Delete the preset "' + _name(p) + '"?';
    if (users.length) msg += '\n\nUsed by: ' + users.join(', ') + '\nThose steps will be marked "missing".';
    if (confirm(msg)) _emit('delete_preset', p.id);
}

/** RF3: rinomina sul posto. Invio = salva, Esc/uscita dal campo = annulla */
function _rename(p, row) {
    var nameEl = row && row.querySelector('[data-pr-name]');
    if (!nameEl || row.querySelector('.pr-rename-input')) return;
    var input = document.createElement('input');
    input.className = 'mm-input pr-rename-input';
    input.value = p.name || '';
    input.setAttribute('aria-label', 'Preset name');
    nameEl.hidden = true;
    nameEl.after(input);
    input.focus();
    input.select();

    var done = false;
    function finish(save) {
        if (done) return; // Invio rimuove il campo e scatena anche il blur
        done = true;
        var name = input.value.trim();
        input.remove();
        nameEl.hidden = false;
        if (!save || name === p.name) return;
        if (!name) { showToast('The name cannot be empty', 'info'); return; }
        // E5: eliminato da un'altra finestra nel frattempo → il rename non ha effetto
        if (!presetList.some(function(x) { return x.id === p.id; })) return;
        // Duplicati ammessi: preset e Action si legano per id, il nome è solo un'etichetta
        if (presetList.some(function(x) { return x.id !== p.id && x.name === name; })) {
            showToast('Another preset has the same name', 'info');
        }
        _emit('update_preset', { id: p.id, name: name });
    }
    input.addEventListener('keydown', function(e) {
        e.stopPropagation(); // Esc non deve chiudere la modale Mappings
        if (e.key === 'Enter') finish(true);
        if (e.key === 'Escape') finish(false);
    });
    input.addEventListener('blur', function() { finish(false); });
}

var ACTS = [
    { act: 'apply',  icon: 'play',       tip: 'Apply: loads its channel, variables and transition (does not go live)' },
    { act: 'update', icon: 'rotate-left', tip: 'Update with the current channel, variables and transition' },
    { act: 'rename', icon: 'pen',        tip: 'Rename' },
    { act: 'delete', icon: 'trash',      tip: 'Delete' }
];

/**
 * Riga di un preset con le quattro azioni. Sidebar e tab Presets usano questa stessa funzione
 * e lo stesso handler onPresetClick, per non divergere di nuovo (RF4).
 * @param {object} p
 * @param {boolean} table - true: <tr> per il tab Presets; false: riga della sidebar
 */
export function presetRowHtml(p, table) {
    var ch = presetChannel(p), name = _esc(_name(p));
    // E8: nome troncato con ellissi da CSS, intero nel tooltip
    var nameHtml = '<span class="pr-name" data-pr-name data-tip="' + name + '">' + name + '</span>';
    var chHtml = '<span class="pr-ch' + (ch.missing ? ' pr-missing' : '') + '"' +
        (ch.tip ? ' data-tip="' + _esc(ch.tip) + '"' : '') + '>' + _esc(ch.label) + '</span>';
    var acts = '<span class="pr-acts">' + ACTS.map(function(a) {
        return '<button type="button" class="mm-btn pr-act pr-' + a.act + '" data-pr-act="' + a.act + '" data-id="' + p.id + '" ' +
            'data-tip="' + a.tip + '" aria-label="' + a.act + ' ' + name + '">' + icon(a.icon) + '</button>';
    }).join('') + '</span>';
    if (!table) {
        return '<div class="pr-row" data-pr-row="' + p.id + '"><div class="pr-info">' + nameHtml + chHtml + '</div>' + acts + '</div>';
    }
    var tr = parseJSON(p.transition, {});
    return '<tr data-pr-row="' + p.id + '"><td class="pr-cell">' + nameHtml + '</td><td>' + chHtml + '</td>' +
        '<td>' + _esc((tr.type || '—') + '/' + (tr.duration !== undefined ? tr.duration + 'ms' : '?')) + '</td>' +
        '<td class="mm-actions">' + acts + '</td></tr>';
}

/** Click delegato su sidebar e tab Presets: [data-pr-act] → azione sul preset */
export function onPresetClick(e) {
    var b = e.target.closest('[data-pr-act]');
    if (!b) return;
    var p = presetList.find(function(x) { return x.id === parseInt(b.dataset.id); });
    if (!p) return;
    var act = b.dataset.prAct;
    if (act === 'apply')  applyPreset(p);
    if (act === 'update') _update(p);
    if (act === 'rename') _rename(p, b.closest('[data-pr-row]'));
    if (act === 'delete') _delete(p);
}

/**
 * Renderizza il panel preset nel DOM (#presetList).
 * RF5: il pannello resta sempre visibile, altrimenti sparirebbe anche il + per creare il primo preset.
 */
export function renderPresetPanel() {
    var container = document.getElementById('presetList');
    if (!container) return;
    container.innerHTML = presetList.map(function(p) { return presetRowHtml(p, false); }).join('') ||
        '<div class="pr-empty">No presets yet: press + to save the current channel, variables and transition</div>';
}
