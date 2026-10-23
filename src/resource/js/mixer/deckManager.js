
import { run,prev,save,saveAndRun,load,setLoadprev,selectChannelLoad,autosave,initMixer,nextRunLive,prevRunLive, addChannel, deleteCurrentChannel, channelSelected, channelMixer, runChannel} from "./mixerManager.js";
import { initMirror } from "./rollupBundle/codeMirrorManager.js";
import { initMacro } from "./macroManager.js";
import { initNav,showMacro } from "./navManager.js";
import { inithydra } from "./hydraManager.js";
import { initMacroVars, getCurrentMacroVars } from "./macroVarManager.js";
import { emit } from "./mixerEmitter.js";
import { ModalPanel } from "./modalManager.js";
import { initPresets, applyPresetById } from "./presetManager.js";
import { initMappings } from "./mappingManager.js";
import { openMappingPanel } from "./mappingPanel.js";
import { initPerform } from "./performManager.js";

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
  // Bottoni + della sidebar: Macro Manager con l'editor di una nuova mappatura già aperto (PERFORM RF10)
  if(selectedAction === 'addMacroVar') { openMappingPanel({ type: 'variable' }); }
  if(selectedAction === 'addMacroAction') { openMappingPanel({ type: 'action' }); }
  // Mostra modale per salvare lo stato corrente come preset
  if(selectedAction === 'addPreset') { showAddPresetModal(); }
  // Apre il Macro Manager (tabella Mappature + tab Preset, PERFORM RF9)
  if(selectedAction === 'openMacroManager') { openMappingPanel(); }
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

var init = function(){
  initMixer();
  initMirror();
  initMacro();
  initNav();
  inithydra();
  // Inietta emit nei moduli macro e preset (evita circular imports)
  initMacroVars(emit);
  initPresets(emit);
  // Richiede la lista macro e preset al server
  emit('get_macros');
  emit('get_presets');
  // MIDI, gamepad e tastiera attivi da subito, senza passare dal Learn (PERFORM RF5).
  // Click sul monitor su una sorgente non mappata → nuova variabile con quella sorgente
  initMappings(function(src) { openMappingPanel({ type: 'variable', src: src }); });
  initPerform();
  // Lista canali (ordine sortOrder) e go-live per l'azione rangeChannel in macroManager.js
  window.getChannelList = function() { return channelMixer; };
  window.runChannel = runChannel;
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