

import { reinit, getDoc } from "./rollupBundle/codeMirrorManager.js";
import { emit } from "./mixerEmitter.js";
import { showToast } from "./toastManager.js";
import { refreshHydra } from "./hydraManager.js";



var channelMixer = []; 
var channelLive= 0;
export var isautosave = false; 

var transictions = [];
var transictionSelected =0;
export var isTransictionSelected= true;

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
      btn.setAttribute('onclick', "selectChannelLoad('" + element.id + "')");

      // TODO-2.1: slot vuoti con stile differenziato
      if (!element.name || element.name === String(element.id)) {
        btn.textContent = '— empty —';
        btn.classList.add('empty-channel');
        btn.title = 'Slot vuoto (id: ' + element.id + ')';
        btn.setAttribute('aria-label', 'Empty channel, id: ' + element.id); // TODO-6.3
      } else {
        btn.textContent = element.name; // textContent = sicuro vs XSS
        btn.title = element.name;
        btn.setAttribute('aria-label', 'Channel: ' + element.name); // TODO-6.3
      }

      // TODO-2.3: un bottone non può avere sia tooltip che popover.
      // Se esiste thumbnail → popover con preview immagine; altrimenti tooltip semplice (TODO-2.2).
      if (element.thumbnail) {
        btn.setAttribute('data-bs-toggle', 'popover');
        btn.setAttribute('data-bs-trigger', 'hover');
        btn.setAttribute('data-bs-placement', 'left');
        btn.setAttribute('data-bs-html', 'true');
        btn.setAttribute('data-bs-content', '<img src="' + element.thumbnail + '" style="width:120px;height:auto;display:block;">');
        btn.setAttribute('data-thumbnail', element.thumbnail); // usato anche da dragManager se necessario
      } else {
        // TODO-2.2: Bootstrap tooltip (solo canali senza thumbnail)
        btn.setAttribute('data-bs-toggle', 'tooltip');
        btn.setAttribute('data-bs-placement', 'top');
      }

      // TODO-2.5: drag & drop attributi (gestione eventi aggiunta in dragManager)
      btn.setAttribute('draggable', 'true');

      col.appendChild(btn);
      row.appendChild(col);
    }

    // Evidenzia canale selezionato
    var selEl = document.getElementById(channelSelected + "");
    if (selEl) selEl.classList.add("selectedChannel");

    // TODO-2.2: inizializza Bootstrap tooltip su tutti i bottoni senza thumbnail
    document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(function(el) {
      new bootstrap.Tooltip(el);
    });

    // TODO-2.3: inizializza Bootstrap popover con thumbnail preview
    document.querySelectorAll('[data-bs-toggle="popover"]').forEach(function(el) {
      new bootstrap.Popover(el);
    });

    updateEditingLabel(channelSelected); // TODO-3.1
    resolve(channelMixer);
    loadprev = true;
    load();
  });
  return firstInitRetrive;
}
export function nextRunLive(){

  channelLive++;
  if(channelLive >=channelMixer.length){
    channelLive=0;
  }
  runChannel(channelLive);
}
export function prevRunLive(){
  
  channelLive--;
  if(channelLive <0){
    channelLive=channelMixer.length-1;
  }
  runChannel(channelLive);
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
  showToast('▶ Running: ' + (channelMixer.find(c => c.id == channel)?.name || channel));
  console.log("run channel " + channel);
}

export function run() {
  // La transizione è letta dal DB sul server, basta inviare l'id del canale
  startTransitionProgress();
  emit('set_channel', { id: channelSelected });
  emit('set_toload', true);
  showChannelLive(channelSelected);
  showToast('▶ Running: ' + (channelMixer.find(c => c.id == channelSelected)?.name || channelSelected));
  console.log("run channel " + channelSelected);
}

export function prev() {

  
  var jsx = getDoc();
  if (!jsx) {
    jsx = "hush();\nresetAudioAndSpeed();\ns0.initImage(\"./src/resource/img/alpha.png\");\nsrc(s0).out(o0);\nrender(o0);"
    reinit(jsx);
  }
  refreshHydra(jsx);
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
  document.getElementById(channelSelected).innerText = name;
  document.getElementById(channelSelected).title = name;
  emit('save_channel', channel);
  showToast('✓ Saved: ' + name);
  console.log("Save channel " + channel.id);
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
      ind.title = 'Autosave ' + (isautosave ? 'ON' : 'OFF');
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
  // Aggiorna badge LIVE in navbar (TODO-1.1)
  var badge = document.getElementById('liveBadge');
  if (badge) {
      var liveChannel = channelMixer.find(function(c) { return c.id == channel; });
      badge.textContent = '● LIVE: ' + (liveChannel ? liveChannel.name || String(liveChannel.id) : channel);
  }
  channelLive = parseInt(channel);
}

export function selectChannelLoad(channel) {
  if (isautosave) {
    save();
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
    var lbl = document.getElementById('editingLabel');
    if (!lbl) return;
    var ch = channelMixer.find(function(c) { return c.id == channelId; });
    var name = ch ? (ch.name || String(ch.id)) : String(channelId);
    lbl.textContent = 'Editing: ' + name + ' [id: ' + channelId + ']';
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

export function initMixer(){
  emit('get_all');
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