

import { reinit } from "./rollupBundle/codeMirrorManager.js";
import {
    initializeChannel, showChannelLive,
    setChannelSelected, setLoadprev, prev,
    autosave, channelSelected, loadprev,
    selectChannelLoad, markClean } from "./mixerManager.js";
import { showToast } from "./toastManager.js";
import { setMacroList, setMacroVars } from "./macroVarManager.js";
import { renderActionPanel } from "./macroManager.js";
import { setPresetList } from "./presetManager.js";
import { refreshMappingPanel } from "./mappingPanel.js";
import { renderPerform } from "./performManager.js";
var socket = io();

// TODO-6.2: Mostra/nasconde banner disconnessione
socket.on('disconnect', () => {
    var b = document.getElementById('disconnectBanner');
    if (b) b.style.display = 'flex';
});
socket.on('connect', () => {
    var b = document.getElementById('disconnectBanner');
    if (b) b.style.display = 'none';
});

//RETRIVE CHANNEL IN LIVE
socket.on('get_in_load', function (variable) {
    var element = document.getElementById(variable + "");
    if (element)
        element.classList.add("liveChannel");
    if(channelSelected)
        setChannelSelected(parseInt(variable)); // TODO-6.1: fix bug — era `channel` (undefined), ora `variable` (parametro del callback)
});


//RETRIVE GETCHANNEL
socket.on('get_channel', function (variable) {
    showChannelLive(variable.id);
});


socket.on('set_channel', function(variable) {
    showChannelLive(variable.id);
});

//RETRIVE CHANNEL BY FIND CHANNEL
socket.on('find_channel', function (variable) {
    var code = variable.code;
    reinit(code);
    markClean(code); // E3: appena caricato = nessuna modifica non salvata
    if (loadprev) {
        prev();
        setLoadprev(false);
    }
    if (!variable.name) {
        variable.name = variable.id;
    }
    document.getElementById('channelName').value = variable.name + "";
});

// Riceve la transizione globale dal server e popola la UI
socket.on('get_transition', function (variable) {
    var typeEl = document.getElementById('transitionType');
    var durEl  = document.getElementById('transitionDuration');
    if (typeEl) typeEl.value = variable.type     || 'cut';
    if (durEl)  durEl.value  = variable.duration ?? 0;
});


//RETRIVE CHANNELS BY GET ALL
socket.on('get_all', function (variable) {

    initializeChannel(variable).then(data => {
        autosave();
        emit('get_in_load');
        renderPerform(); // pad Canali
    })
});

// Risposta a 'create_channel': ricarica la griglia canali e seleziona il nuovo canale.
// Non usa il percorso socket 'get_all' per evitare il side effect autosave() toggle
// che scatterebbe su tutti i client connessi.
socket.on('channel_created', function(data) {
    initializeChannel(data.channels).then(function() {
        selectChannelLoad(data.id);
    });
});

// Risposta a 'delete_channel': ricarica la griglia e seleziona il primo canale rimasto.
// data.channels è già ordinato per sortOrder/id dal server (via getAll()).
socket.on('channel_deleted', function(data) {
    initializeChannel(data.channels).then(function() {
        var nextChannel = data.channels[0]; // primo canale disponibile dopo la cancellazione
        selectChannelLoad(nextChannel.id, true); // skipSave: il canale eliminato non va risalvato
    });
});

// Errore da 'delete_channel' (es: tentativo di cancellare l'unico canale).
// Mostra un toast di errore con il messaggio inviato dal server.
socket.on('delete_channel_error', function(message) {
    showToast(message, 'error'); // l'icona la mette showToast in base al tipo
});

// --- MACRO ---

// Lista macro cambiata: motore variabili + mappature, sidebar, Macro Manager aperto, vista Perform.
// I trigger non vanno ri-registrati: il dispatcher (mappingManager.js) legge la lista a ogni evento.
function onMacros(macros) {
    setMacroList(macros);
    renderActionPanel(macros);
    refreshMappingPanel();
    renderPerform();
}
socket.on('get_macros', onMacros);
socket.on('macro_created', function(data) { onMacros(data.macros); });
socket.on('macro_deleted', function(data) { onMacros(data.macros); });

// Valori macro: stato completo dal server alla connessione (reload senza salti sul live)
// oppure valori di un altro mixer connesso. Mai rimandati indietro.
socket.on('sync_macros', function(vars) {
    setMacroVars(vars);
});

// --- PRESET ---

// Lista preset cambiata: sidebar, tab Preset del Macro Manager, pad della vista Perform
function onPresets(presets) {
    setPresetList(presets);
    refreshMappingPanel();
    renderPerform();
}

// Riceve la lista completa dei preset e aggiorna il panel
socket.on('get_presets', function(presets) {
    onPresets(presets);
});

// Preset creato: aggiorna la lista
socket.on('preset_created', function(data) {
    onPresets(data.presets);
});

// Preset eliminato: aggiorna la lista
socket.on('preset_deleted', function(data) {
    onPresets(data.presets);
});

// Preset aggiornato (update_preset): aggiorna la lista
socket.on('preset_updated', function(data) {
    onPresets(data.presets);
});

export function emit(emitter, arg){
    const emitPromise = new Promise((resolve, reject) => {
        if(arg  !== 'undefined'){
            socket.emit(emitter, arg); 

        }else{
            socket.emit(emitter); 
        }
        resolve();
    });
    return emitPromise;
}
