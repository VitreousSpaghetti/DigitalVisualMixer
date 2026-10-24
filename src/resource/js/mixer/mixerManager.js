

import { reinit, getDoc, onDocChange } from "./rollupBundle/codeMirrorManager.js";
import { emit } from "./mixerEmitter.js";
import { showToast } from "./toastManager.js";
import { refreshHydra } from "./hydraManager.js";
import { ModalPanel } from "./modalManager.js";
import { processMacroVars } from "./macroVarManager.js";



// Export channelMixer per deckManager.js (dropdown canali nell'editor azioni MACRO3)
export var channelMixer = [];
var channelLive= 0;
export var isautosave = false;

var transictions = [];
var transictionSelected =0;
export var isTransictionSelected= true;

// TODO-2.5: variabili di stato drag & drop
var dragSrcId = null;

// Gestori eventi HTML5 Drag API per riordinamento canali
function onDragStart(e) {
    dragSrcId = this.id;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', this.id);
    this.style.opacity = '0.4';
}

function onDragEnd(e) {
    this.style.opacity = '1';
    // Rimuovi evidenziazione drag-over da tutti i bottoni
    document.querySelectorAll('.channel-btn').forEach(function(btn) {
        btn.classList.remove('drag-over');
    });
}

function onDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    return false;
}

function onDragEnter(e) {
    this.classList.add('drag-over');
}

function onDragLeave(e) {
    this.classList.remove('drag-over');
}

function onDrop(e) {
    e.stopPropagation();
    e.preventDefault();
    this.classList.remove('drag-over');
    if (dragSrcId === this.id) return;

    // Trova le posizioni nell'array channelMixer
    var srcIdx = channelMixer.findIndex(function(c) { return String(c.id) === String(dragSrcId); });
    var dstIdx = channelMixer.findIndex(function(c) { return String(c.id) === this.id; }.bind(this));
    if (srcIdx === -1 || dstIdx === -1) return;

    // Sposta l'elemento nell'array (riordino locale immediato)
    var moved = channelMixer.splice(srcIdx, 1)[0];
    channelMixer.splice(dstIdx, 0, moved);

    // Ri-renderizza la griglia canali con il nuovo ordine
    initializeChannel(channelMixer);

    // Persiste il nuovo ordine sul server
    emit('save_order', channelMixer.map(function(c) { return c.id; }));
    console.log("Drag: save_order emitted");
    return false;
}

export var loadprev=false;
export var channelSelected= 0;
export function setChannelSelected(variable){
  channelSelected= variable;
} 
export function setLoadprev(variable){
  loadprev= variable;
}


//FUNCTION INIT TO CALL AT THE START OF THE PAGE
export function initializeChannel(variable){
  const firstInitRetrive = new Promise((resolve, reject) => {
    var container = document.getElementById("multychannel");
    // Tooltip delegati su [data-tip] (uiHelp.js): nessuna istanza da distruggere prima del re-render
    container.innerHTML = "";
    channelMixer = variable;

    var row = null;
    for (let index = 0; index < channelMixer.length; index++) {
      const element = channelMixer[index];

      // Ogni 4 canali inizia una nuova riga Bootstrap
      if (index % 4 === 0) {
        row = document.createElement('div');
        row.className = 'row spacingRowa';
        container.appendChild(row);
      }

      // Colonna
      var col = document.createElement('div');
      col.style.textAlign = 'center';
      col.className = 'col-3';

      // Bottone canale — usa textContent (sicuro vs XSS)
      var btn = document.createElement('button');
      btn.id = String(element.id);
      btn.className = 'btn btn-primary channel-btn';
      btn.style.cssText = 'width:90%;text-overflow:ellipsis;white-space:nowrap;overflow:hidden;';
      // E3: il click dell'utente chiede conferma se ci sono modifiche non salvate
      btn.setAttribute('onclick', "selectChannelClick('" + element.id + "')");

      // TODO-2.1: slot vuoti con stile differenziato
      if (!element.name || element.name === String(element.id)) {
        btn.textContent = '— empty —';
        btn.classList.add('empty-channel');
        btn.setAttribute('aria-label', 'Empty channel, id: ' + element.id); // TODO-6.3
      } else {
        btn.textContent = element.name; // textContent = sicuro vs XSS
        btn.setAttribute('aria-label', 'Channel: ' + element.name); // TODO-6.3
      }

      // Il thumbnail è conservato in data-thumbnail per uso futuro (es. modal dettaglio).
      if (element.thumbnail) {
        btn.setAttribute('data-thumbnail', element.thumbnail);
      }
      btn.dataset.tip = _channelTip(element.name, element.id);

      // TODO-2.5: drag & drop — abilita draggable e registra tutti i listener HTML5 Drag API
      btn.setAttribute('draggable', 'true');
      btn.addEventListener('dragstart',  onDragStart);
      btn.addEventListener('dragend',    onDragEnd);
      btn.addEventListener('dragover',   onDragOver);
      btn.addEventListener('dragenter',  onDragEnter);
      btn.addEventListener('dragleave',  onDragLeave);
      btn.addEventListener('drop',       onDrop);

      col.appendChild(btn);
      row.appendChild(col);
    }

    // Evidenzia canale selezionato
    var selEl = document.getElementById(channelSelected + "");
    if (selEl) selEl.classList.add("selectedChannel");

    // Ripristina liveChannel e badge dopo re-render (drag&drop o primo caricamento) — bug fix TODO-2.5
    // showChannelLive aggiorna sia la classe CSS che il testo del liveBadge in navbar
    showChannelLive(channelLive);



    updateEditingLabel(channelSelected); // TODO-3.1
    resolve(channelMixer);
    loadprev = true;
    load();
  });
  return firstInitRetrive;
}
export function nextRunLive(){ stepLive(1); }
export function prevRunLive(){ stepLive(-1); }

// channelLive è un id: la navigazione segue l'ordine della griglia (channelMixer), non gli id
function stepLive(dir){
  var len = channelMixer.length;
  if (!len) return;
  var i = channelMixer.findIndex(function(c) { return c.id == channelLive; });
  var n = i === -1 ? (dir > 0 ? 0 : len - 1) : (i + dir + len) % len;
  runChannel(channelMixer[n].id);
}
export function load() {
  emit('find_channel', channelSelected);
  console.log("load channel " + channelSelected);
}

export function runChannel(channel) {
  // La transizione è letta dal DB sul server, basta inviare l'id del canale
  startTransitionProgress();
  emit('set_channel', { id: channel });
  emit('set_toload', true);
  showChannelLive(channel);
  showToast('Live: ' + (channelMixer.find(c => c.id == channel)?.name || channel));
  console.log("run channel " + channel);
}

export function run() {
  // La transizione è letta dal DB sul server, basta inviare l'id del canale
  startTransitionProgress();
  emit('set_channel', { id: channelSelected });
  emit('set_toload', true);
  showChannelLive(channelSelected);
  showToast('Live: ' + (channelMixer.find(c => c.id == channelSelected)?.name || channelSelected));
  console.log("run channel " + channelSelected);
}

export function prev() {
  var jsx = getDoc();
  if (!jsx) {
    jsx = "hush();\nresetAudioAndSpeed();\ns0.initImage(\"./src/resource/img/alpha.png\");\nsrc(s0).out(o0);\nrender(o0);"
    reinit(jsx);
  }
  // {{key}} → ()=>M.key: il codice gira una volta, i knob cambiano il frame (PERFORM RF1)
  var processed = processMacroVars(jsx);
  refreshHydra(processed);
};

export function save() {
  var jsx = getDoc();
  var name = document.getElementById('channelName').value;
  if (!name) {
    name = channelSelected;
  }
  // TODO-2.3: cattura thumbnail dal canvas Hydra (JPEG 30% quality per ridurre dimensione)
  var thumbnail = null;
  try {
    var cvs = document.getElementById('hydra-canvas');
    if (cvs) thumbnail = cvs.toDataURL('image/jpeg', 0.3);
  } catch(e) {
    // canvas può lanciare SecurityError in alcuni contesti (es. cross-origin)
  }
  var channel = { id: channelSelected, code: jsx, name: name, thumbnail: thumbnail };

  // Aggiorna il bottone nel DOM sincronizzando testo e classe empty-channel
  var btn = document.getElementById(String(channelSelected));
  if (btn) {
    var nameStr = String(name);
    var isEmpty = !nameStr ;
    if (isEmpty) {
      btn.textContent = '— empty —';
      btn.classList.add('empty-channel');
    } else {
      btn.textContent = nameStr;
      btn.classList.remove('empty-channel');
    }
    btn.dataset.tip = _channelTip(nameStr, channelSelected);
  }

  // Aggiorna channelMixer in memoria per coerenza con il prossimo re-render (es. drag&drop)
  var entry = channelMixer.find(function(c) { return c.id == channelSelected; });
  if (entry) entry.name = String(name);

  emit('save_channel', channel);
  markClean(jsx);
  showToast('Saved: ' + name);
  console.log("Save channel " + channel.id);
}
// Save & Run con controllo runtime reale (stesso approccio del preview):
// 1. Salva sempre il codice
// 2. Esegue il codice localmente via refreshHydra (come fa prev()) per rilevare errori
// 3. Installa un listener temporaneo su window.error per intercettare errori sincroni
// 4. Dopo 120ms: se nessun errore → manda in live; se errore → mostra toast e blocca
// Limitazione: intercetta solo errori che si manifestano entro 120ms dall'esecuzione.
// Gli errori nell'animation loop di Hydra (asincroni) vengono comunque mostrati nel pannello.
// Non usato da autosave (il controllo in autosave sarebbe inutile e fastidioso).
export function saveAndRun() {
  var jsx = getDoc();
  save(); // salva sempre, indipendentemente dal risultato del controllo

  // Nasconde errori precedenti per un test pulito
  var errPanel = document.getElementById('hydraErrorPanel');
  if (errPanel) errPanel.style.display = 'none';

  // Listener temporaneo: intercetta il primo errore che arriva durante l'esecuzione locale
  var hadError = false;
  function tempErrorListener(event) {
    hadError = true;
  }
  window.addEventListener('error', tempErrorListener);

  // Esegue localmente: applica macro vars prima del preview (salva codice originale con {{...}})
  var processedJsx = processMacroVars(jsx);
  refreshHydra(processedJsx);

  // Dopo 120ms verifica se ci sono stati errori sincroni
  setTimeout(function() {
    window.removeEventListener('error', tempErrorListener);
    if (hadError) {
      // Errore rilevato: il pannello errore è già stato popolato da window.error in hydraManager
      showToast('Save and Run blocked — error in the code', 'error');
    } else {
      run(); // nessun errore rilevato → manda in live
    }
  }, 120);
}

export function sequence(){

}
export function autosave() {
  var element = document.getElementById("Autosave");
  isautosave = !isautosave;
  if (element) {
    if (isautosave) {
      element.classList.add("liveChannelAutosave");
    } else {
      element.classList.remove("liveChannelAutosave");
    }
  }
  // Aggiorna indicatore autosave in navbar (TODO-1.3)
  var ind = document.getElementById('autosaveIndicator');
  if (ind) {
      ind.className = 'as-indicator ' + (isautosave ? 'as-on' : 'as-off');
      // RF-B4: tooltip dinamico, letto da uiHelp.js all'apertura
      ind.dataset.tip = 'Autosave is ' + (isautosave ? 'ON' : 'OFF') + ': the channel is ' +
          (isautosave ? '' : 'not ') + 'saved when you switch to another one — click to toggle';
  }
}
export function showChannelLive(channel) {
  var elementToremove = document.getElementsByClassName("liveChannel");
  if (elementToremove.length > 0) {
    elementToremove[0].classList.remove("liveChannel");
  }
  var element = document.getElementById(channel);
  if (element)
    element.classList.add("liveChannel");
  // Pad della vista Perform: il pad live resta evidenziato (PERFORM RF8)
  document.querySelectorAll('[data-pad-ch]').forEach(function(pad) {
    pad.classList.toggle('pad-live', pad.dataset.padCh == channel);
  });
  // Aggiorna badge LIVE in navbar (TODO-1.1)
  var badge = document.getElementById('liveBadge');
  if (badge) {
      var liveChannel = channelMixer.find(function(c) { return c.id == channel; });
      badge.querySelector('.live-name').textContent = liveChannel ? liveChannel.name || String(liveChannel.id) : channel;
  }
  channelLive = parseInt(channel);
  // Il menu contestuale dell'editor si chiude quando cambia il live (UX_GUIDA edge case)
  window.dispatchEvent(new Event('dvm:live'));
}

export function selectChannelLoad(channel, skipSave = false) {
  // skipSave=true quando il canale corrente è stato eliminato: evita di re-inserirlo nel DB
  if (isautosave && !skipSave) {
    save();
  } else if (!skipSave && channel != channelSelected && isDirty()) {
    // E3: cambio da MIDI/preset/azione senza autosave — non si blocca il live con una modale,
    // ma la perdita non è più silenziosa
    showToast('Unsaved changes discarded: ' + _channelName(channelSelected), 'info');
  }
  var elementToremove = document.getElementsByClassName("selectedChannel");
  if (elementToremove.length > 0) {
    elementToremove[0].classList.remove("selectedChannel");
  }
  var element = document.getElementById(channel);
  if (element)
    element.classList.add("selectedChannel");

  channelSelected = parseInt(channel);
  loadprev = true;
  load();
  updateEditingLabel(channel); // TODO-3.1
}


// Salva la configurazione transizione globale.
// Chiamata automaticamente quando l'utente modifica #transitionType o #transitionDuration.
export function saveTransition() {
  var type     = document.getElementById('transitionType')?.value || 'cut';
  var duration = parseInt(document.getElementById('transitionDuration')?.value, 10) || 0;
  emit('save_transition', { type, duration });
  console.log("Auto-save transition: " + type + " " + duration + "ms");
}

// Aggiorna la label "Editing: <nome> [id: X]" sopra l'editor (TODO-3.1)
function updateEditingLabel(channelId) {
    var lbl = document.getElementById('editingName');
    if (!lbl) return;
    lbl.textContent = 'Editing: ' + _channelName(channelId) + ' [id: ' + channelId + ']';
}

function _channelName(channelId) {
    var ch = channelMixer.find(function(c) { return c.id == channelId; });
    return ch ? (ch.name || String(ch.id)) : String(channelId);
}

function _channelTip(name, id) {
    return (!name || name === String(id) ? 'Empty channel (id: ' + id + ')' : name) + ' — click to edit, drag to reorder';
}

// --- E3: modifiche non salvate ---
// Codice com'era all'ultimo caricamento/salvataggio; null finché nessun canale è caricato
var _savedCode = null;

/** Il codice nell'editor corrisponde a quello salvato (chiamata dopo find_channel e save) */
export function markClean(code) {
    _savedCode = code === undefined ? getDoc() : code;
    _paintDirty();
}

function isDirty() {
    return _savedCode !== null && getDoc() !== _savedCode;
}

/**
 * AUDIO_PARAMS RF6/E10: override audio spento → si riesegue in preview il canale SALVATO, così il
 * visual riprende i propri a.set*(). Non passa da load(): find_channel riscriverebbe l'editor.
 */
export function reloadSavedPreview() {
    if (_savedCode === null) { prev(); return; }
    if (isDirty()) showToast('Preview reloaded from saved channel', 'info');
    refreshHydra(processMacroVars(_savedCode));
}

function _paintDirty() {
    var m = document.getElementById('dirtyMark');
    if (m) m.hidden = !isDirty();
}

/**
 * Click su un canale della griglia o dalla command palette: senza autosave e con modifiche
 * non salvate chiede prima di scartarle (prima il codice si perdeva in silenzio).
 */
export function selectChannelClick(channel) {
    if (isautosave || channel == channelSelected || !isDirty()) { selectChannelLoad(channel); return; }
    ModalPanel(
        '<p>The code of <strong></strong> has unsaved changes. Switching channel discards them.</p>',
        'Discard unsaved changes?',
        'Cancel',
        function() { selectChannelLoad(channel, true); },
        'Discard and switch'
    );
    document.querySelector('#modalPanelHere strong').textContent = _channelName(channelSelected); // textContent: sicuro vs XSS
}

// Anima la progress bar per la durata della transizione (TODO-1.4)
function startTransitionProgress() {
    var dur = parseInt(document.getElementById('transitionDuration')?.value, 10) || 0;
    if (dur <= 0) return;
    var bar = document.getElementById('transProgressBar');
    if (!bar) return;
    bar.style.transition = 'none';
    bar.style.width = '0%';
    // requestAnimationFrame per garantire il repaint prima di avviare l'animazione
    requestAnimationFrame(function() {
        bar.style.transition = 'width ' + dur + 'ms linear';
        bar.style.width = '100%';
        setTimeout(function() {
            bar.style.transition = 'none';
            bar.style.width = '0%';
        }, dur + 100);
    });
}

/**
 * Richiede al server la creazione di un nuovo canale vuoto.
 * La risposta arriverà via socket 'channel_created' → mixerEmitter.js
 * che chiamerà initializeChannel() + selectChannelLoad() senza toccare autosave.
 */
export function addChannel() {
    emit('create_channel');
}

/**
 * Mostra una modale di conferma per eliminare il canale attualmente in editing.
 * Se il canale è in LIVE, aggiunge un avviso rosso rafforzato nel body della modale.
 * La conferma emette 'delete_channel'; la risposta arriva via socket 'channel_deleted'.
 */
export function deleteCurrentChannel() {
    // Trova il record del canale selezionato nell'array locale per mostrare il nome
    var ch = channelMixer.find(function(c) { return c.id == channelSelected; });
    var channelName = ch ? (ch.name || ('id: ' + channelSelected)) : ('id: ' + channelSelected);
    var isLive = (channelSelected == channelLive);

    var bodyHtml =
        '<p>Delete the channel <strong>' + channelName + '</strong>?<br>' +
        'This <strong>cannot be undone</strong>.</p>' +
        (isLive
            ? '<p style="color:#e74c3c;font-weight:bold;"><i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i> This channel is currently LIVE.</p>'
            : '');

    ModalPanel(
        bodyHtml,
        'Delete channel',
        'Cancel',
        function() { emit('delete_channel', channelSelected); },
        'Delete'
    );
}

export function initMixer(){
  emit('get_all');
  onDocChange(_paintDirty); // E3: indicatore "unsaved" accanto a "Editing"
  // Salvataggio automatico quando l'utente cambia tipo o durata transizione
  var typeEl = document.getElementById('transitionType');
  var durEl  = document.getElementById('transitionDuration');
  if (typeEl) typeEl.addEventListener('change', saveTransition);
  if (durEl)  durEl.addEventListener('change',  saveTransition);
  // TODO-2.4: filtro real-time canali per nome
  var searchEl = document.getElementById('channelSearch');
  if (searchEl) {
      searchEl.addEventListener('input', function() {
          var q = this.value.toLowerCase();
          document.querySelectorAll('#multychannel .channel-btn').forEach(function(btn) {
              var col = btn.closest('.col-3');
              if (col) col.style.display = btn.textContent.toLowerCase().includes(q) ? '' : 'none';
          });
      });
  }
}