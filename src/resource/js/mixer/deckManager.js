
import { run,prev,save,saveAndRun,load,setLoadprev,selectChannelLoad,autosave,initMixer,nextRunLive,prevRunLive, addChannel, deleteCurrentChannel, channelSelected, channelMixer} from "./mixerManager.js";
import { initMirror } from "./rollupBundle/codeMirrorManager.js";
import { initMacro, initActionMacros } from "./macroManager.js";
import { initNav,showMacro } from "./navManager.js";
import { inithydra } from "./hydraManager.js";
import { initMacroVars, getCurrentMacroVars, getMacroList, updateMacroVar } from "./macroVarManager.js";
import { emit } from "./mixerEmitter.js";
import { ModalPanel } from "./modalManager.js";
import { initPresets, applyPresetById, getPresetList } from "./presetManager.js";
import { initMIDI, startLearn, stopLearn, normalizeCCValue } from "./midiManager.js";

var apiLink = 'https:/'+'/hydra.ojack.xyz/api/';

var selectActionExec = function (selectedAction) { 
  if(selectedAction === 'showMacro'){
    showMacro();
  }
  if(selectedAction === 'run'){
    run();
  }
  if(selectedAction === 'prev'){
    prev();
  }  
  if(selectedAction === 'nextRunLive'){
    nextRunLive();
  }
  if(selectedAction === 'prevRunLive'){
    prevRunLive();
  }
  if(selectedAction === 'save'){
    save();
  }
  if(selectedAction === 'load'){
    load();
  }
  if(selectedAction === 'loadprev'){
    setLoadprev(true);
    load(); 
  }
  if(selectedAction === 'saverun'){
    // TODO-3.3: conferma se il canale selezionato è già quello live (evita errori accidentali)
    // Il confirm avviene PRIMA di saveAndRun: se l'utente annulla non vogliamo nemmeno salvare
    var currentLiveEl = document.querySelector('.liveChannel');
    var selectedEl = document.querySelector('.selectedChannel');
    if (currentLiveEl && selectedEl && currentLiveEl.id === selectedEl.id) {
      if (!confirm('Questo canale è già LIVE. Mandare in live la nuova versione?')) return;
    }
    // saveAndRun: salva sempre, va live solo se il codice è sintatticamente valido
    saveAndRun();
  }
  // Crea un nuovo canale vuoto — risposta asincrona via socket 'channel_created'
  if(selectedAction === 'addChannel') { addChannel(); }
  // Mostra modale di conferma per cancellare il canale in editing
  if(selectedAction === 'deleteChannel') { deleteCurrentChannel(); }
  // Mostra modale per creare una nuova macro variabile
  if(selectedAction === 'addMacroVar') { showAddMacroVarModal(); }
  // Mostra modale per creare una nuova macro azione
  if(selectedAction === 'addMacroAction') { showAddMacroActionModal(); }
  // Mostra modale per salvare lo stato corrente come preset
  if(selectedAction === 'addPreset') { showAddPresetModal(); }
  // Apre il Macro Manager Panel (modal-xl con tab Variabili | Azioni | Preset)
  if(selectedAction === 'openMacroManager') { showMacroManagerPanel(); }
}

/**
 * Mostra una modale per salvare lo stato corrente (canale + macro vars + transizione) come preset.
 * L'operatore inserisce un nome; i valori vengono catturati automaticamente dal mixer.
 */
function showAddPresetModal() {
    var bodyHtml =
        '<div class="mb-2">' +
        '  <label style="color:#aaa;font-size:0.85em;">Nome preset</label>' +
        '  <input type="text" id="presetNameInput" class="form-control form-control-sm" ' +
        '    style="background:#363636;color:#fff;border:1px solid #555;" placeholder="es: Intro Rossa">' +
        '</div>' +
        '<div style="font-size:0.8em;color:#777;margin-top:6px;">Salva: canale corrente + slider macro + transizione</div>';

    ModalPanel(
        bodyHtml,
        'Salva Preset',
        'Annulla',
        function() {
            var name = (document.getElementById('presetNameInput')?.value || '').trim();
            if (!name) return;
            // Cattura stato corrente dal mixer
            var macroVars  = getCurrentMacroVars();
            var typeEl     = document.getElementById('transitionType');
            var durEl      = document.getElementById('transitionDuration');
            var transition = {
                type:     typeEl ? typeEl.value : 'cut',
                duration: durEl  ? parseInt(durEl.value) || 0 : 0
            };
            emit('create_preset', {
                name:       name,
                channelId:  channelSelected,
                macroVars:  macroVars,
                transition: transition
            });
        },
        'Salva'
    );
}

/**
 * Mostra una modale per configurare e creare una nuova macro variabile.
 * Raccoglie key, min, max, step, valore default.
 * Emette 'create_macro' al server con i dati serializzati.
 */
function showAddMacroVarModal() {
    var bodyHtml =
        '<div class="mb-2">' +
        '  <label style="color:#aaa;font-size:0.85em;">Key — usato in {{...}} nel codice Hydra</label>' +
        '  <input type="text" id="macroKeyInput" class="form-control form-control-sm" ' +
        '    style="background:#363636;color:#fff;border:1px solid #555;" placeholder="es: freq">' +
        '</div>' +
        '<div class="row g-2">' +
        '  <div class="col">' +
        '    <label style="color:#aaa;font-size:0.85em;">Min</label>' +
        '    <input type="number" id="macroMinInput" class="form-control form-control-sm" ' +
        '      style="background:#363636;color:#fff;border:1px solid #555;" value="0" step="any">' +
        '  </div>' +
        '  <div class="col">' +
        '    <label style="color:#aaa;font-size:0.85em;">Max</label>' +
        '    <input type="number" id="macroMaxInput" class="form-control form-control-sm" ' +
        '      style="background:#363636;color:#fff;border:1px solid #555;" value="1" step="any">' +
        '  </div>' +
        '  <div class="col">' +
        '    <label style="color:#aaa;font-size:0.85em;">Step</label>' +
        '    <input type="number" id="macroStepInput" class="form-control form-control-sm" ' +
        '      style="background:#363636;color:#fff;border:1px solid #555;" value="0.01" step="any">' +
        '  </div>' +
        '  <div class="col">' +
        '    <label style="color:#aaa;font-size:0.85em;">Default</label>' +
        '    <input type="number" id="macroDefaultInput" class="form-control form-control-sm" ' +
        '      style="background:#363636;color:#fff;border:1px solid #555;" value="0" step="any">' +
        '  </div>' +
        '</div>';

    ModalPanel(
        bodyHtml,
        'Nuova Macro Variabile',
        'Annulla',
        function() {
            var key = (document.getElementById('macroKeyInput')?.value || '').trim();
            if (!key) return;
            var min      = parseFloat(document.getElementById('macroMinInput')?.value)     || 0;
            var max      = parseFloat(document.getElementById('macroMaxInput')?.value)     || 1;
            var step     = parseFloat(document.getElementById('macroStepInput')?.value)    || 0.01;
            var defVal   = parseFloat(document.getElementById('macroDefaultInput')?.value) || 0;
            emit('create_macro', {
                name:      key,
                type:      'variable',
                params:    JSON.stringify({ key: key, min: min, max: max, step: step, value: defVal }),
                trigger:   null,
                sortOrder: 0
            });
        },
        'Crea'
    );
} 


/**
 * Mostra una modale per creare una nuova macro azione.
 * Raccoglie nome, tasto trigger e azione da eseguire.
 * Per v1: supporta una singola azione. Sequenze multiple gestibili via save_macro.
 */
function showAddMacroActionModal() {
    var bodyHtml =
        '<div class="mb-2">' +
        '  <label style="color:#aaa;font-size:0.85em;">Nome</label>' +
        '  <input type="text" id="macroActionNameInput" class="form-control form-control-sm" ' +
        '    style="background:#363636;color:#fff;border:1px solid #555;" placeholder="es: Intro Scene">' +
        '</div>' +
        '<div class="row g-2 mb-2">' +
        '  <div class="col">' +
        '    <label style="color:#aaa;font-size:0.85em;">Tasto trigger</label>' +
        '    <input type="text" id="macroActionKeyInput" class="form-control form-control-sm" ' +
        '      style="background:#363636;color:#fff;border:1px solid #555;" placeholder="es: F1">' +
        '  </div>' +
        '  <div class="col-auto d-flex align-items-end">' +
        '    <div class="form-check mb-1">' +
        '      <input class="form-check-input" type="checkbox" id="macroActionCtrlInput">' +
        '      <label class="form-check-label" style="color:#aaa;font-size:0.85em;" for="macroActionCtrlInput">Ctrl</label>' +
        '    </div>' +
        '  </div>' +
        '</div>' +
        '<div class="mb-2">' +
        '  <label style="color:#aaa;font-size:0.85em;">Azione</label>' +
        '  <select id="macroActionTypeInput" class="form-select form-select-sm" ' +
        '    style="background:#363636;color:#fff;border:1px solid #555;">' +
        '    <option value="run">Run (manda in live)</option>' +
        '    <option value="prev">Preview (locale)</option>' +
        '    <option value="save">Save</option>' +
        '    <option value="saverun">Save and Run</option>' +
        '    <option value="nextRunLive">Next Channel Live</option>' +
        '    <option value="prevRunLive">Prev Channel Live</option>' +
        '    <option value="applyPreset">Apply Preset (per ID)</option>' +
        '  </select>' +
        '</div>';

    ModalPanel(
        bodyHtml,
        'Nuova Macro Azione',
        'Annulla',
        function() {
            var name    = (document.getElementById('macroActionNameInput')?.value || '').trim();
            var key     = (document.getElementById('macroActionKeyInput')?.value  || '').trim();
            var useCtrl = document.getElementById('macroActionCtrlInput')?.checked || false;
            var action  = document.getElementById('macroActionTypeInput')?.value  || 'run';
            if (!name || !key) return;
            var actionObj = { type: action };
            // Cattura channelId o presetId se rilevante (GAP-3 MACRO3)
            var chEl = document.getElementById('macroActionChannelInput');
            var prEl = document.getElementById('macroActionPresetInput');
            if (action === 'setChannel'  && chEl) actionObj.channelId = parseInt(chEl.value);
            if (action === 'applyPreset' && prEl) actionObj.presetId  = parseInt(prEl.value);
            emit('create_macro', {
                name:      name,
                type:      'action',
                params:    JSON.stringify({ actions: [actionObj] }),
                trigger:   JSON.stringify({ type: 'keyboard', key: key, ctrl: useCtrl }),
                sortOrder: 0
            });
        },
        'Crea'
    );
}

// ---------------------------------------------------------------------------
// MACRO MANAGER PANEL (MACRO3)
// Modal-xl con 3 tab: Variabili | Azioni | Preset
// ---------------------------------------------------------------------------

/**
 * Dispatcher MIDI per macro variabili e azioni.
 * Chiamato da midiManager.js per ogni messaggio MIDI ricevuto (escluso Learn).
 * Matcha il messaggio con le macro dal DB e aggiorna lo stato o esegue azioni.
 * @param {object} midiInfo - { type, channel, note?, ccNumber?, value }
 */
function onMidiMessage(midiInfo) {
    var macros = getMacroList();
    macros.forEach(function(macro) {
        var trigger = null;
        try {
            trigger = typeof macro.trigger === 'string'
                ? JSON.parse(macro.trigger) : macro.trigger;
        } catch(e) { return; }
        if (!trigger || trigger.type !== 'midi') return;
        if (trigger.channel !== undefined && trigger.channel !== midiInfo.channel) return;

        if (macro.type === 'variable') {
            // CC → normalizza al range della variabile e aggiorna
            if (midiInfo.type === 'cc' && trigger.ccNumber === midiInfo.ccNumber) {
                var params = {};
                try { params = typeof macro.params === 'string' ? JSON.parse(macro.params) : (macro.params || {}); } catch(e) {}
                var key = params.key || macro.name;
                var min = params.min !== undefined ? params.min : 0;
                var max = params.max !== undefined ? params.max : 1;
                var normalizedVal = normalizeCCValue(midiInfo.value, min, max);
                updateMacroVar(key, normalizedVal);
            }
        } else if (macro.type === 'action') {
            // Note On → esegui le azioni
            if (midiInfo.type === 'note' && trigger.note === midiInfo.note) {
                var params = {};
                try { params = typeof macro.params === 'string' ? JSON.parse(macro.params) : (macro.params || {}); } catch(e) {}
                var actions = params.actions || [];
                if (window.selectActionExec && actions.length > 0) {
                    actions.forEach(function(action) {
                        if (action.type === 'setChannel' && action.channelId !== undefined && window.selectChannelLoad) {
                            window.selectChannelLoad(action.channelId);
                        } else if (action.type === 'applyPreset' && action.presetId !== undefined && window.applyPresetById) {
                            window.applyPresetById(action.presetId);
                        } else {
                            window.selectActionExec(action.type);
                        }
                    });
                }
            }
        }
    });
}

/**
 * Apre il Macro Manager Panel: modal-xl Bootstrap con 3 tab (Variabili, Azioni, Preset).
 * Costruisce la modal direttamente con innerHTML + bootstrap.Modal per usare modal-xl.
 */
function showMacroManagerPanel() {
    // Rimuovi istanza precedente se esiste
    var existingEl = document.getElementById('macroManagerModal');
    if (existingEl) { existingEl.remove(); }

    var macros   = getMacroList();
    var presets  = getPresetList();
    var channels = channelMixer;

    var varMacros    = macros.filter(function(m) { return m.type === 'variable'; });
    var actionMacros = macros.filter(function(m) { return m.type === 'action'; });

    // Helper: select canali
    function buildChannelSelect(id, selectedId) {
        var opts = channels.map(function(ch) {
            var name = ch.name || String(ch.id);
            var sel = (ch.id === selectedId) ? ' selected' : '';
            return '<option value="' + ch.id + '"' + sel + '>' + name + ' [' + ch.id + ']</option>';
        }).join('');
        return '<select id="' + id + '" class="form-select form-select-sm" style="background:#2a2a2a;color:#fff;border:1px solid #555;">' + opts + '</select>';
    }

    // Helper: select preset
    function buildPresetSelect(id, selectedId) {
        var opts = presets.map(function(p) {
            var sel = (p.id === selectedId) ? ' selected' : '';
            return '<option value="' + p.id + '"' + sel + '>' + (p.name || 'Preset #' + p.id) + '</option>';
        }).join('');
        return '<select id="' + id + '" class="form-select form-select-sm" style="background:#2a2a2a;color:#fff;border:1px solid #555;">' + opts + '</select>';
    }

    // Helper: riga variabile
    function buildVarRow(macro) {
        var params = {};
        try { params = typeof macro.params === 'string' ? JSON.parse(macro.params) : (macro.params || {}); } catch(e) {}
        var key  = params.key  || macro.name || String(macro.id);
        var min  = params.min  !== undefined ? params.min  : 0;
        var max  = params.max  !== undefined ? params.max  : 1;
        var step = params.step !== undefined ? params.step : 0.01;
        var def  = params.value !== undefined ? params.value : min;

        var trigger = null;
        try { trigger = typeof macro.trigger === 'string' ? JSON.parse(macro.trigger) : macro.trigger; } catch(e) {}
        var tKey   = (trigger && trigger.type === 'keyboard') ? (trigger.key || '') : '';
        var tCtrl  = (trigger && trigger.ctrl)  ? 'checked' : '';
        var tShift = (trigger && trigger.shift) ? 'checked' : '';
        var tAlt   = (trigger && trigger.alt)   ? 'checked' : '';
        var midiCh = (trigger && trigger.type === 'midi') ? (trigger.channel || '') : '';
        var midiCC = (trigger && trigger.type === 'midi') ? (trigger.ccNumber !== undefined ? trigger.ccNumber : '') : '';

        return '<tr data-macro-id="' + macro.id + '">' +
            '<td style="font-family:monospace;color:#4a9eff;">{{' + _esc(key) + '}}</td>' +
            '<td><input type="number" class="mmv-min form-control form-control-sm" style="background:#2a2a2a;color:#fff;border:1px solid #555;width:70px;" value="' + min + '" step="any"></td>' +
            '<td><input type="number" class="mmv-max form-control form-control-sm" style="background:#2a2a2a;color:#fff;border:1px solid #555;width:70px;" value="' + max + '" step="any"></td>' +
            '<td><input type="number" class="mmv-step form-control form-control-sm" style="background:#2a2a2a;color:#fff;border:1px solid #555;width:70px;" value="' + step + '" step="any"></td>' +
            '<td><input type="number" class="mmv-def form-control form-control-sm" style="background:#2a2a2a;color:#fff;border:1px solid #555;width:70px;" value="' + def + '" step="any"></td>' +
            '<td>' +
              '<input type="text" class="mmv-key form-control form-control-sm" style="background:#2a2a2a;color:#fff;border:1px solid #555;width:60px;display:inline-block;" placeholder="F1" value="' + _esc(tKey) + '">' +
              ' <input type="checkbox" class="mmv-ctrl" ' + tCtrl + ' title="Ctrl">' +
              '<small style="color:#999"> Ctrl</small>' +
              ' <input type="checkbox" class="mmv-shift" ' + tShift + ' title="Shift">' +
              '<small style="color:#999"> Shift</small>' +
              ' <input type="checkbox" class="mmv-alt" ' + tAlt + ' title="Alt">' +
              '<small style="color:#999"> Alt</small>' +
            '</td>' +
            '<td>' +
              '<input type="number" class="mmv-midi-ch form-control form-control-sm" style="background:#2a2a2a;color:#fff;border:1px solid #555;width:55px;display:inline-block;" placeholder="ch" value="' + midiCh + '">' +
              ' CC# <input type="number" class="mmv-midi-cc form-control form-control-sm" style="background:#2a2a2a;color:#fff;border:1px solid #555;width:55px;display:inline-block;" placeholder="cc" value="' + midiCC + '">' +
              ' <button class="btn btn-sm mmv-midi-learn" data-id="' + macro.id + '" style="padding:1px 6px;font-size:0.75em;background:#333;border:1px solid #555;color:#aaa;" title="MIDI Learn">🎹</button>' +
            '</td>' +
            '<td>' +
              '<button class="btn btn-sm mmv-save" data-id="' + macro.id + '" style="padding:1px 6px;font-size:0.75em;background:#1a4a1a;border:1px solid #3a9a3a;color:#aaffaa;">✓</button>' +
              ' <button class="btn btn-sm mmv-del" data-id="' + macro.id + '" style="padding:1px 5px;font-size:0.75em;background:none;border:none;color:#9a3a3a;">×</button>' +
            '</td>' +
        '</tr>';
    }

    // Helper: riga azione (con edit inline espanso sotto)
    function buildActionRow(macro) {
        var trigger = null;
        try { trigger = typeof macro.trigger === 'string' ? JSON.parse(macro.trigger) : macro.trigger; } catch(e) {}
        var tKey   = (trigger && trigger.type === 'keyboard') ? (trigger.key || '—') : '—';
        var tMod   = trigger ? [(trigger.ctrl ? 'Ctrl' : ''), (trigger.shift ? 'Shift' : ''), (trigger.alt ? 'Alt' : '')].filter(Boolean).join('+') : '';
        if (tMod) tKey = tMod + '+' + tKey;

        var params = {};
        try { params = typeof macro.params === 'string' ? JSON.parse(macro.params) : (macro.params || {}); } catch(e) {}
        var actions = params.actions || [];
        var actSummary = actions.map(function(a) {
            if (a.type === 'setChannel') return 'setChannel(' + (a.channelId !== undefined ? a.channelId : '?') + ')';
            if (a.type === 'applyPreset') return 'applyPreset(' + (a.presetId !== undefined ? a.presetId : '?') + ')';
            return a.type;
        }).join(' → ');

        return '<tr data-macro-id="' + macro.id + '">' +
            '<td style="color:#ccc;">' + _esc(macro.name || String(macro.id)) + '</td>' +
            '<td><kbd style="font-size:0.8em;padding:1px 4px;background:#333;border:1px solid #555;border-radius:3px;color:#aaa;">' + _esc(tKey) + '</kbd></td>' +
            '<td style="font-size:0.8em;color:#999;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + _esc(actSummary) + '</td>' +
            '<td>' +
              '<button class="btn btn-sm mma-edit" data-id="' + macro.id + '" style="padding:1px 6px;font-size:0.75em;background:#2a3a4a;border:1px solid #4a7aaa;color:#aacfff;">✏</button>' +
              ' <button class="btn btn-sm mma-del" data-id="' + macro.id + '" style="padding:1px 5px;font-size:0.75em;background:none;border:none;color:#9a3a3a;">×</button>' +
            '</td>' +
        '</tr>';
    }

    // Helper: riga preset
    function buildPresetRow(preset) {
        var trans = {};
        try { trans = typeof preset.transition === 'string' ? JSON.parse(preset.transition) : (preset.transition || {}); } catch(e) {}
        var transLabel = (trans.type || '—') + '/' + (trans.duration !== undefined ? trans.duration + 'ms' : '?');
        return '<tr data-preset-id="' + preset.id + '">' +
            '<td style="color:#ccc;">' + _esc(preset.name || String(preset.id)) + '</td>' +
            '<td style="color:#999;font-size:0.8em;">ch: ' + preset.channelId + '</td>' +
            '<td style="color:#999;font-size:0.8em;">' + _esc(transLabel) + '</td>' +
            '<td>' +
              '<button class="btn btn-sm mmp-apply" data-id="' + preset.id + '" title="Applica preset" style="padding:1px 6px;font-size:0.75em;background:#1a4a1a;border:1px solid #3a9a3a;color:#aaffaa;">▶</button>' +
              ' <button class="btn btn-sm mmp-update" data-id="' + preset.id + '" title="Aggiorna con stato corrente" style="padding:1px 6px;font-size:0.75em;background:#2a3a4a;border:1px solid #4a7aaa;color:#aacfff;">↺</button>' +
              ' <button class="btn btn-sm mmp-del" data-id="' + preset.id + '" style="padding:1px 5px;font-size:0.75em;background:none;border:none;color:#9a3a3a;">×</button>' +
            '</td>' +
        '</tr>';
    }

    var colStyle = 'style="color:#888;font-size:0.78em;padding:4px 6px;border-bottom:1px solid #333;"';
    var tdStyle  = 'style="padding:3px 6px;vertical-align:middle;"';

    var varTab = '<div style="overflow-x:auto;">' +
        '<table style="width:100%;border-collapse:collapse;font-size:0.82em;">' +
        '<thead><tr>' +
            '<th ' + colStyle + '>Key</th><th ' + colStyle + '>Min</th><th ' + colStyle + '>Max</th>' +
            '<th ' + colStyle + '>Step</th><th ' + colStyle + '>Default</th>' +
            '<th ' + colStyle + '>Trigger Keyboard</th><th ' + colStyle + '>MIDI CC</th><th ' + colStyle + '>Azioni</th>' +
        '</tr></thead>' +
        '<tbody id="mmVarBody">' +
            (varMacros.length > 0 ? varMacros.map(buildVarRow).join('') :
                '<tr><td colspan="8" style="color:#555;padding:8px;text-align:center;">Nessuna macro variabile</td></tr>') +
        '</tbody></table></div>' +
        '<div style="margin-top:10px;">' +
            '<button id="mmAddVar" class="btn btn-sm" style="padding:2px 10px;font-size:0.8em;background:#2e6e2e;border:1px solid #3a9a3a;color:#fff;">+ Nuova Variabile</button>' +
        '</div>';

    var actionTab = '<div style="overflow-x:auto;">' +
        '<table style="width:100%;border-collapse:collapse;font-size:0.82em;">' +
        '<thead><tr>' +
            '<th ' + colStyle + '>Nome</th><th ' + colStyle + '>Trigger</th>' +
            '<th ' + colStyle + '>Sequenza azioni</th><th ' + colStyle + '>Controlli</th>' +
        '</tr></thead>' +
        '<tbody id="mmActionBody">' +
            (actionMacros.length > 0 ? actionMacros.map(buildActionRow).join('') :
                '<tr><td colspan="4" style="color:#555;padding:8px;text-align:center;">Nessuna macro azione</td></tr>') +
        '</tbody></table></div>' +
        '<div style="margin-top:10px;">' +
            '<button id="mmAddAction" class="btn btn-sm" style="padding:2px 10px;font-size:0.8em;background:#2e6e2e;border:1px solid #3a9a3a;color:#fff;">+ Nuova Azione</button>' +
        '</div>' +
        '<!-- Editor azioni inline (sostituisce contenuto al click ✏) -->' +
        '<div id="mmActionEditor" style="display:none;margin-top:14px;padding:10px;background:#1a1a2a;border:1px solid #4a7aaa;border-radius:4px;">' +
            '<div class="row g-2 mb-2">' +
                '<div class="col">' +
                    '<label style="color:#aaa;font-size:0.8em;">Nome</label>' +
                    '<input id="mmaEdName" type="text" class="form-control form-control-sm" style="background:#2a2a2a;color:#fff;border:1px solid #555;">' +
                '</div>' +
            '</div>' +
            '<div class="row g-2 mb-2">' +
                '<div class="col-auto"><label style="color:#aaa;font-size:0.8em;">Tasto</label>' +
                    '<input id="mmaEdKey" type="text" class="form-control form-control-sm" style="background:#2a2a2a;color:#fff;border:1px solid #555;width:70px;" placeholder="F1"></div>' +
                '<div class="col-auto d-flex align-items-end gap-2">' +
                    '<div><input type="checkbox" id="mmaEdCtrl"> <small style="color:#aaa;">Ctrl</small></div>' +
                    '<div><input type="checkbox" id="mmaEdShift"> <small style="color:#aaa;">Shift</small></div>' +
                    '<div><input type="checkbox" id="mmaEdAlt"> <small style="color:#aaa;">Alt</small></div>' +
                '</div>' +
                '<div class="col-auto d-flex align-items-end gap-1">' +
                    'MIDI ch <input id="mmaEdMidiCh" type="number" class="form-control form-control-sm" style="background:#2a2a2a;color:#fff;border:1px solid #555;width:55px;" placeholder="ch">' +
                    ' note <input id="mmaEdMidiNote" type="number" class="form-control form-control-sm" style="background:#2a2a2a;color:#fff;border:1px solid #555;width:55px;" placeholder="note">' +
                    ' <button id="mmaEdMidiLearn" class="btn btn-sm" style="padding:1px 8px;font-size:0.8em;background:#333;border:1px solid #555;color:#aaa;">🎹 Learn</button>' +
                '</div>' +
            '</div>' +
            '<div id="mmaEdSteps" style="margin-bottom:8px;"></div>' +
            '<button id="mmaEdAddStep" class="btn btn-sm" style="padding:1px 8px;font-size:0.8em;background:#2a3a4a;border:1px solid #4a7aaa;color:#aacfff;">+ Step</button>' +
            ' <button id="mmaEdSave" class="btn btn-sm" style="padding:1px 10px;font-size:0.8em;background:#1a4a1a;border:1px solid #3a9a3a;color:#aaffaa;margin-left:8px;">✓ Salva</button>' +
            ' <button id="mmaEdCancel" class="btn btn-sm" style="padding:1px 8px;font-size:0.8em;background:none;border:1px solid #555;color:#aaa;">Annulla</button>' +
            '<input type="hidden" id="mmaEdMacroId">' +
        '</div>';

    var presetTab = '<div style="overflow-x:auto;">' +
        '<table style="width:100%;border-collapse:collapse;font-size:0.82em;">' +
        '<thead><tr>' +
            '<th ' + colStyle + '>Nome</th><th ' + colStyle + '>Canale</th>' +
            '<th ' + colStyle + '>Transizione</th><th ' + colStyle + '>Controlli</th>' +
        '</tr></thead>' +
        '<tbody id="mmPresetBody">' +
            (presets.length > 0 ? presets.map(buildPresetRow).join('') :
                '<tr><td colspan="4" style="color:#555;padding:8px;text-align:center;">Nessun preset salvato</td></tr>') +
        '</tbody></table></div>';

    var modalHtml =
        '<div class="modal fade" id="macroManagerModal" tabindex="-1" style="color:#fff;">' +
        '<div class="modal-dialog modal-xl" style="max-width:95vw;">' +
        '<div class="modal-content" style="background:#1e1e1e;border:1px solid #444;">' +
        '<div class="modal-header" style="border-bottom:1px solid #333;padding:8px 16px;">' +
            '<h5 class="modal-title" style="font-size:0.95em;">Macro Manager</h5>' +
            '<button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>' +
        '</div>' +
        '<div class="modal-body" style="padding:12px 16px;">' +
            '<ul class="nav nav-tabs mb-3" id="mmTabs" style="border-bottom:1px solid #333;">' +
                '<li class="nav-item"><button class="nav-link active" id="mmTabVar" data-tab="var" style="color:#aaa;background:none;border:none;padding:6px 14px;font-size:0.85em;">Variabili (' + varMacros.length + ')</button></li>' +
                '<li class="nav-item"><button class="nav-link" id="mmTabAct" data-tab="act" style="color:#aaa;background:none;border:none;padding:6px 14px;font-size:0.85em;">Azioni (' + actionMacros.length + ')</button></li>' +
                '<li class="nav-item"><button class="nav-link" id="mmTabPre" data-tab="pre" style="color:#aaa;background:none;border:none;padding:6px 14px;font-size:0.85em;">Preset (' + presets.length + ')</button></li>' +
            '</ul>' +
            '<div id="mmTabContentVar">' + varTab + '</div>' +
            '<div id="mmTabContentAct" style="display:none;">' + actionTab + '</div>' +
            '<div id="mmTabContentPre" style="display:none;">' + presetTab + '</div>' +
        '</div>' +
        '</div></div></div>';

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    var modalEl = document.getElementById('macroManagerModal');
    var bsModal = new bootstrap.Modal(modalEl, { backdrop: true, keyboard: true });
    bsModal.show();

    // --- Tab switching ---
    modalEl.querySelectorAll('[data-tab]').forEach(function(btn) {
        btn.addEventListener('click', function() {
            modalEl.querySelectorAll('[data-tab]').forEach(function(b) {
                b.classList.remove('active');
                b.style.color = '#aaa';
                b.style.borderBottom = 'none';
            });
            btn.classList.add('active');
            btn.style.color = '#fff';
            btn.style.borderBottom = '2px solid #4a9eff';
            var map = { var: 'mmTabContentVar', act: 'mmTabContentAct', pre: 'mmTabContentPre' };
            ['mmTabContentVar','mmTabContentAct','mmTabContentPre'].forEach(function(id) {
                var el = document.getElementById(id);
                if (el) el.style.display = 'none';
            });
            var show = document.getElementById(map[btn.dataset.tab]);
            if (show) show.style.display = '';
        });
    });
    // Evidenzia tab attivo all'apertura
    var firstTab = modalEl.querySelector('[data-tab="var"]');
    if (firstTab) { firstTab.style.color = '#fff'; firstTab.style.borderBottom = '2px solid #4a9eff'; }

    // --- Tab Variabili: save + delete + MIDI Learn ---
    modalEl.addEventListener('click', function(e) {
        var target = e.target;

        // Salva variabile
        if (target.classList.contains('mmv-save')) {
            var row = target.closest('tr');
            var id = parseInt(target.dataset.id);
            var macro = macros.find(function(m) { return m.id === id; });
            if (!macro) return;
            var params = {};
            try { params = typeof macro.params === 'string' ? JSON.parse(macro.params) : (macro.params || {}); } catch(e) {}
            var key  = params.key || macro.name;
            var min  = parseFloat(row.querySelector('.mmv-min').value)  || 0;
            var max  = parseFloat(row.querySelector('.mmv-max').value)  || 1;
            var step = parseFloat(row.querySelector('.mmv-step').value) || 0.01;
            var def  = parseFloat(row.querySelector('.mmv-def').value)  || 0;
            var tKey = (row.querySelector('.mmv-key').value || '').trim();
            var tCtrl  = row.querySelector('.mmv-ctrl').checked;
            var tShift = row.querySelector('.mmv-shift').checked;
            var tAlt   = row.querySelector('.mmv-alt').checked;
            var midiCh = row.querySelector('.mmv-midi-ch').value;
            var midiCC = row.querySelector('.mmv-midi-cc').value;
            var triggerObj = null;
            if (midiCh !== '' && midiCC !== '') {
                triggerObj = { type: 'midi', channel: parseInt(midiCh), ccNumber: parseInt(midiCC) };
            } else if (tKey) {
                triggerObj = { type: 'keyboard', key: tKey, ctrl: tCtrl, shift: tShift, alt: tAlt };
            }
            emit('save_macro', {
                id:        id,
                name:      key,
                type:      'variable',
                params:    JSON.stringify({ key: key, min: min, max: max, step: step, value: def }),
                trigger:   triggerObj ? JSON.stringify(triggerObj) : null,
                sortOrder: macro.sortOrder ?? 0
            });
            bsModal.hide();
        }

        // Elimina variabile
        if (target.classList.contains('mmv-del')) {
            var id = parseInt(target.dataset.id);
            var m = macros.find(function(m) { return m.id === id; });
            if (m && confirm('Eliminare la macro variabile "' + (m.name || id) + '"?')) {
                emit('delete_macro', id);
                bsModal.hide();
            }
        }

        // MIDI Learn per variabile
        if (target.classList.contains('mmv-midi-learn')) {
            var btn = target;
            var row = btn.closest('tr');
            btn.textContent = '🔴';
            btn.title = 'In ascolto…';
            initMIDI(onMidiMessage).then(function(ok) {
                if (!ok) { btn.textContent = '🎹'; return; }
                startLearn(function(midiInfo) {
                    btn.textContent = '🎹';
                    if (midiInfo.type === 'cc') {
                        row.querySelector('.mmv-midi-ch').value = midiInfo.channel;
                        row.querySelector('.mmv-midi-cc').value = midiInfo.ccNumber;
                    }
                });
            });
        }

        // Elimina azione
        if (target.classList.contains('mma-del')) {
            var id = parseInt(target.dataset.id);
            var m = macros.find(function(m) { return m.id === id; });
            if (m && confirm('Eliminare la macro azione "' + (m.name || id) + '"?')) {
                emit('delete_macro', id);
                bsModal.hide();
            }
        }

        // Apri editor azione
        if (target.classList.contains('mma-edit')) {
            var id = parseInt(target.dataset.id);
            var m = macros.find(function(mx) { return mx.id === id; });
            if (!m) return;
            _openActionEditor(modalEl, m, channels, presets);
        }

        // Apply preset
        if (target.classList.contains('mmp-apply')) {
            var id = parseInt(target.dataset.id);
            if (window.applyPresetById) window.applyPresetById(id);
            bsModal.hide();
        }

        // Update preset con stato corrente
        if (target.classList.contains('mmp-update')) {
            var id = parseInt(target.dataset.id);
            var macroVars  = getCurrentMacroVars();
            var typeEl     = document.getElementById('transitionType');
            var durEl      = document.getElementById('transitionDuration');
            var transition = { type: typeEl ? typeEl.value : 'cut', duration: durEl ? parseInt(durEl.value) || 0 : 0 };
            emit('update_preset', { id: id, channelId: channelSelected, macroVars: macroVars, transition: transition });
            bsModal.hide();
        }

        // Delete preset
        if (target.classList.contains('mmp-del')) {
            var id = parseInt(target.dataset.id);
            var p = presets.find(function(px) { return px.id === id; });
            if (p && confirm('Eliminare il preset "' + (p.name || id) + '"?')) {
                emit('delete_preset', id);
                bsModal.hide();
            }
        }

        // Aggiungi variabile
        if (target.id === 'mmAddVar') { bsModal.hide(); showAddMacroVarModal(); }

        // Aggiungi azione
        if (target.id === 'mmAddAction') { bsModal.hide(); showAddMacroActionModal(); }

        // Editor azione: aggiungi step
        if (target.id === 'mmaEdAddStep') { _addActionStep(modalEl, null, channels, presets); }

        // Editor azione: salva
        if (target.id === 'mmaEdSave') { _saveActionEditor(modalEl, emit, bsModal); }

        // Editor azione: annulla
        if (target.id === 'mmaEdCancel') {
            var ed = document.getElementById('mmActionEditor');
            if (ed) ed.style.display = 'none';
        }

        // Editor azione: MIDI Learn note
        if (target.id === 'mmaEdMidiLearn') {
            target.textContent = '🔴 In ascolto…';
            initMIDI(onMidiMessage).then(function(ok) {
                if (!ok) { target.textContent = '🎹 Learn'; return; }
                startLearn(function(midiInfo) {
                    target.textContent = '🎹 Learn';
                    if (midiInfo.type === 'note') {
                        var chIn   = document.getElementById('mmaEdMidiCh');
                        var noteIn = document.getElementById('mmaEdMidiNote');
                        if (chIn)   chIn.value   = midiInfo.channel;
                        if (noteIn) noteIn.value = midiInfo.note;
                    }
                });
            });
        }
    });

    // Pulisci la modal dal DOM quando viene nascosta
    modalEl.addEventListener('hidden.bs.modal', function() { modalEl.remove(); });
}

/** Apre l'editor azioni inline per una macro azione esistente */
function _openActionEditor(modalEl, macro, channels, presets) {
    var trigger = null;
    try { trigger = typeof macro.trigger === 'string' ? JSON.parse(macro.trigger) : macro.trigger; } catch(e) {}
    var params = {};
    try { params = typeof macro.params === 'string' ? JSON.parse(macro.params) : (macro.params || {}); } catch(e) {}
    var actions = params.actions || [];

    document.getElementById('mmaEdMacroId').value = macro.id;
    document.getElementById('mmaEdName').value = macro.name || '';
    document.getElementById('mmaEdKey').value  = (trigger && trigger.type === 'keyboard') ? (trigger.key || '') : '';
    document.getElementById('mmaEdCtrl').checked  = !!(trigger && trigger.ctrl);
    document.getElementById('mmaEdShift').checked = !!(trigger && trigger.shift);
    document.getElementById('mmaEdAlt').checked   = !!(trigger && trigger.alt);
    var midiCh   = (trigger && trigger.type === 'midi') ? (trigger.channel || '') : '';
    var midiNote = (trigger && trigger.type === 'midi') ? (trigger.note !== undefined ? trigger.note : '') : '';
    document.getElementById('mmaEdMidiCh').value   = midiCh;
    document.getElementById('mmaEdMidiNote').value = midiNote;

    var stepsContainer = document.getElementById('mmaEdSteps');
    stepsContainer.innerHTML = '';
    actions.forEach(function(action) { _addActionStep(modalEl, action, channels, presets); });
    if (actions.length === 0) { _addActionStep(modalEl, null, channels, presets); }

    var ed = document.getElementById('mmActionEditor');
    if (ed) ed.style.display = '';
    ed.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

var _actionTypes = [
    { value: 'run',        label: 'Run live',              param: null },
    { value: 'prev',       label: 'Preview locale',        param: null },
    { value: 'save',       label: 'Save',                  param: null },
    { value: 'saverun',    label: 'Save and Run',          param: null },
    { value: 'nextRunLive',label: 'Canale successivo live', param: null },
    { value: 'prevRunLive',label: 'Canale precedente live', param: null },
    { value: 'setChannel', label: 'Vai al canale',         param: 'channelId' },
    { value: 'applyPreset',label: 'Applica preset',        param: 'presetId' }
];

/** Aggiunge uno step all'editor azioni inline */
function _addActionStep(modalEl, action, channels, presets) {
    var container = document.getElementById('mmaEdSteps');
    if (!container) return;
    var stepDiv = document.createElement('div');
    stepDiv.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:4px;';
    stepDiv.className = 'mma-step';

    var selHtml = '<select class="mma-step-type form-select form-select-sm" style="background:#2a2a2a;color:#fff;border:1px solid #555;width:180px;">' +
        _actionTypes.map(function(t) {
            var sel = (action && action.type === t.value) ? ' selected' : '';
            return '<option value="' + t.value + '"' + sel + '>' + t.label + '</option>';
        }).join('') + '</select>';

    var paramValue = action ? (action.channelId !== undefined ? action.channelId : (action.presetId !== undefined ? action.presetId : '')) : '';
    var paramHtml = '<span class="mma-step-param-wrap" style="display:inline-block;min-width:120px;"></span>';

    stepDiv.innerHTML = selHtml + paramHtml +
        '<button type="button" class="mma-step-del btn btn-sm" style="padding:0 5px;background:none;border:none;color:#9a3a3a;font-size:1.1em;" title="Rimuovi step">×</button>';

    container.appendChild(stepDiv);

    var sel = stepDiv.querySelector('.mma-step-type');
    var paramWrap = stepDiv.querySelector('.mma-step-param-wrap');

    function updateParamField() {
        var chosen = _actionTypes.find(function(t) { return t.value === sel.value; });
        paramWrap.innerHTML = '';
        if (!chosen || !chosen.param) return;
        if (chosen.param === 'channelId') {
            var chOpts = channels.map(function(ch) {
                var sel2 = (parseInt(paramValue) === ch.id && sel.value === 'setChannel') ? ' selected' : '';
                return '<option value="' + ch.id + '"' + sel2 + '>' + (ch.name || ch.id) + ' [' + ch.id + ']</option>';
            }).join('');
            paramWrap.innerHTML = '<select class="mma-step-param form-select form-select-sm" style="background:#2a2a2a;color:#fff;border:1px solid #555;">' + chOpts + '</select>';
        } else if (chosen.param === 'presetId') {
            var prOpts = presets.map(function(p) {
                var sel2 = (parseInt(paramValue) === p.id && sel.value === 'applyPreset') ? ' selected' : '';
                return '<option value="' + p.id + '"' + sel2 + '>' + (p.name || 'Preset #' + p.id) + '</option>';
            }).join('');
            paramWrap.innerHTML = '<select class="mma-step-param form-select form-select-sm" style="background:#2a2a2a;color:#fff;border:1px solid #555;">' + prOpts + '</select>';
        }
    }

    updateParamField();
    sel.addEventListener('change', updateParamField);

    stepDiv.querySelector('.mma-step-del').addEventListener('click', function() {
        stepDiv.remove();
    });
}

/** Serializza e salva la macro azione dall'editor inline */
function _saveActionEditor(modalEl, emitFn, bsModal) {
    var id   = parseInt(document.getElementById('mmaEdMacroId').value);
    var name = (document.getElementById('mmaEdName').value || '').trim();
    var key  = (document.getElementById('mmaEdKey').value || '').trim();
    var ctrl  = document.getElementById('mmaEdCtrl').checked;
    var shift = document.getElementById('mmaEdShift').checked;
    var alt   = document.getElementById('mmaEdAlt').checked;
    var midiCh   = document.getElementById('mmaEdMidiCh').value;
    var midiNote = document.getElementById('mmaEdMidiNote').value;
    if (!name) return;

    var triggerObj = null;
    if (midiCh !== '' && midiNote !== '') {
        triggerObj = { type: 'midi', channel: parseInt(midiCh), note: parseInt(midiNote) };
    } else if (key) {
        triggerObj = { type: 'keyboard', key: key, ctrl: ctrl, shift: shift, alt: alt };
    }

    var steps = Array.from(document.querySelectorAll('#mmaEdSteps .mma-step'));
    var actions = steps.map(function(step) {
        var typeEl  = step.querySelector('.mma-step-type');
        var paramEl = step.querySelector('.mma-step-param');
        var actionObj = { type: typeEl ? typeEl.value : 'run' };
        if (paramEl) {
            var chosen = _actionTypes.find(function(t) { return t.value === actionObj.type; });
            if (chosen && chosen.param === 'channelId') actionObj.channelId = parseInt(paramEl.value);
            if (chosen && chosen.param === 'presetId')  actionObj.presetId  = parseInt(paramEl.value);
        }
        return actionObj;
    });

    emitFn('save_macro', {
        id:        id,
        name:      name,
        type:      'action',
        params:    JSON.stringify({ actions: actions }),
        trigger:   triggerObj ? JSON.stringify(triggerObj) : null,
        sortOrder: 0
    });
    bsModal.hide();
}

/** Escape HTML per sicurezza XSS */
function _esc(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// TODO-4.2: mostra/nasconde il canvas di preview, salva preferenza in localStorage
var toggleCanvas = function() {
    var tv = document.querySelector('.tv');
    var btn = document.getElementById('canvasToggle');
    if (!tv) return;
    var isHidden = tv.style.display === 'none';
    tv.style.display = isHidden ? '' : 'none';
    if (btn) btn.textContent = isHidden ? 'Hide Preview' : 'Show Preview';
    localStorage.setItem('canvasHidden', isHidden ? 'false' : 'true');
};
window.toggleCanvas = toggleCanvas;
// Ripristina preferenza al caricamento
if (localStorage.getItem('canvasHidden') === 'true') {
    toggleCanvas();
}

var init = function(){
  initMixer();
  initMirror();
  initMacro();
  initNav();
  inithydra();
  // Inietta emit nei moduli macro e preset (evita circular imports)
  initMacroVars(emit);
  initActionMacros(emit);
  initPresets(emit);
  // Richiede la lista macro e preset al server
  emit('get_macros');
  emit('get_presets');
  // Esponi helper canali per dropdown editor azioni (MACRO3)
  window.getChannelList = function() { return channelMixer; };
  window.selectChannelLoad = selectChannelLoad;
  window.selectActionExec = selectActionExec;
  window.autosave = autosave;
  window.apiLink = apiLink;
  // Esponi le azioni canale come globali per i bottoni onclick nell'HTML
  window.addChannel = addChannel;
  window.deleteCurrentChannel = deleteCurrentChannel;
  // Esponi applyPresetById per macroManager.js (macro azione applyPreset)
  window.applyPresetById = applyPresetById;
  // Export/Import DB — referenziati in mixer.html onclick
  window.exportDb = function() {
      window.open('/api/db/export', '_blank');
  };
  window.importDb = function(event) {
      var file = event.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function(e) {
          var data;
          try { data = JSON.parse(e.target.result); } catch(err) { alert('File JSON non valido'); return; }
          fetch('/api/db/import', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data)
          })
          .then(function(r) { return r.json(); })
          .then(function(res) {
              if (res.ok) location.reload();
              else alert('Errore import DB: ' + (res.error || 'sconosciuto'));
          })
          .catch(function(err) { alert('Errore import DB: ' + err.message); });
      };
      reader.readAsText(file);
  };
}

init();