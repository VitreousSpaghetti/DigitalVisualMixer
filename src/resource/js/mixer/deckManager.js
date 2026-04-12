
import { run,prev,save,saveAndRun,load,setLoadprev,selectChannelLoad,autosave,initMixer,nextRunLive,prevRunLive} from "./mixerManager.js";
import { initMirror } from "./rollupBundle/codeMirrorManager.js";
import { initMacro } from "./macroManager.js";
import { initNav,showMacro } from "./navManager.js";
import { inithydra } from "./hydraManager.js";

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
  window.selectChannelLoad =selectChannelLoad;
  window.selectActionExec = selectActionExec;
  window.autosave = autosave;
  window.apiLink = apiLink;
}

init();