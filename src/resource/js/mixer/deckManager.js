
import { run,prev,save,saveAndRun,load,setLoadprev,selectChannelLoad,selectChannelClick,autosave,initMixer,nextRunLive,prevRunLive, addChannel, deleteCurrentChannel, channelMixer, runChannel} from "./mixerManager.js";
import { initMirror } from "./rollupBundle/codeMirrorManager.js";
import { initMacro } from "./macroManager.js";
import { initNav } from "./navManager.js";
import { inithydra } from "./hydraManager.js";
import { initMacroVars } from "./macroVarManager.js";
import { emit } from "./mixerEmitter.js";
import { ModalPanel } from "./modalManager.js";
import { initPresets, applyPresetById, currentPresetState } from "./presetManager.js";
import { initMappings } from "./mappingManager.js";
import { openMappingPanel } from "./mappingPanel.js";
import { initPerform } from "./performManager.js";
import { initTooltips, sc } from "./uiHelp.js";
import { initContextMenu } from "./contextMenu.js";
import { initGuide, openGuide } from "./guideManager.js";
import { initPalette, openPalette } from "./palette.js";
import { showToast } from "./toastManager.js";
import { initAudioPanel, openAudioPanel } from "./audioPanel.js";

var apiLink = 'https:/'+'/hydra.ojack.xyz/api/';

var selectActionExec = function (selectedAction) { 
  // Help → Guide (UX_GUIDA RF-D1, sostituisce il vecchio modale "Deck Macro")
  if(selectedAction === 'showMacro' || selectedAction === 'guide'){
    openGuide();
  }
  if(selectedAction === 'shortcuts'){
    openGuide('shortcuts');
  }
  if(selectedAction === 'palette'){
    openPalette();
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
    // E6: modale dell'app invece di confirm() del browser
    var currentLiveEl = document.querySelector('.liveChannel');
    var selectedEl = document.querySelector('.selectedChannel');
    if (currentLiveEl && selectedEl && currentLiveEl.id === selectedEl.id) {
      ModalPanel('<p>This channel is already <strong>LIVE</strong>. Send the new version live?</p>',
        'Channel already live', 'Cancel', saveAndRun, 'Save and Run');
      return;
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
  // Pannello Audio: sorgente di a.fft per mixer e Live (af/AUDIO.md RF1)
  if(selectedAction === 'openAudio') { openAudioPanel(); }
}

/**
 * Mostra una modale per salvare lo stato corrente (canale + macro vars + transizione) come preset.
 * L'operatore inserisce un nome; i valori vengono catturati automaticamente dal mixer.
 */
function showAddPresetModal() {
    var bodyHtml =
        '<div class="mb-2">' +
        '  <label style="color:#aaa;font-size:0.85em;">Preset name</label>' +
        '  <input type="text" id="presetNameInput" class="form-control form-control-sm" ' +
        '    style="background:#363636;color:#fff;border:1px solid #555;" placeholder="e.g. Red Intro">' +
        '</div>' +
        '<div style="font-size:0.8em;color:#777;margin-top:6px;">Saves: current channel + macro variable values + transition</div>';

    ModalPanel(
        bodyHtml,
        'Save preset',
        'Cancel',
        function() {
            var name = (document.getElementById('presetNameInput')?.value || '').trim();
            if (!name) return;
            // Stato corrente dal mixer: stessa cattura di Update (presetManager.js)
            emit('create_preset', Object.assign({ name: name }, currentPresetState()));
        },
        'Save'
    );
}

var init = function(){
  initTooltips(); // UX_GUIDA RF-B3: prima di tutto, i moduli sotto scrivono già data-tip
  initMixer();
  initMirror();
  initMacro();
  initNav();
  inithydra();
  // Inietta emit nei moduli macro e preset (evita circular imports)
  initMacroVars(emit);
  initPresets(emit);
  initAudioPanel(emit);
  // Richiede la lista macro e preset al server
  emit('get_macros');
  emit('get_presets');
  // MIDI, gamepad e tastiera attivi da subito, senza passare dal Learn (PERFORM RF5).
  // Click sul monitor su una sorgente non mappata → nuova variabile con quella sorgente
  initMappings(function(src) { openMappingPanel({ type: 'variable', src: src }); });
  initPerform();
  initContextMenu();
  initGuide();
  initPalette();
  // RF-B7: i <kbd data-sc> statici di mixer.html prendono i tasti dalla fonte unica
  document.querySelectorAll('kbd[data-sc]').forEach(function(k) { k.textContent = sc(k.dataset.sc); });
  // Lista canali (ordine sortOrder) e go-live per l'azione rangeChannel in macroManager.js
  window.getChannelList = function() { return channelMixer; };
  window.runChannel = runChannel;
  window.selectChannelLoad = selectChannelLoad;
  window.selectChannelClick = selectChannelClick; // click sui bottoni canale (conferma modifiche non salvate)
  window.openLiveWindow = function() {
    window.open('./live?fit=cover','winname','directories=no,titlebar=no,toolbar=no,location=no,status=no,menubar=no,scrollbars=no,resizable=no,width=400,height=350');
  };
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
          // E6: errori come toast dell'app, non alert() del browser
          try { data = JSON.parse(e.target.result); } catch(err) { showToast('Invalid JSON file', 'error'); return; }
          fetch('/api/db/import', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data)
          })
          .then(function(r) { return r.json(); })
          .then(function(res) {
              if (res.ok) location.reload();
              else showToast('Import DB failed: ' + (res.error || 'unknown error'), 'error');
          })
          .catch(function(err) { showToast('Import DB failed: ' + err.message, 'error'); });
      };
      reader.readAsText(file);
  };
}

init();