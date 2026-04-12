

import { reinit } from "./rollupBundle/codeMirrorManager.js";
import {
    initializeChannel, showChannelLive,
    setChannelSelected, setLoadprev, prev,
    autosave, channelSelected, loadprev,
    selectChannelLoad } from "./mixerManager.js";
import { showToast } from "./toastManager.js";
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
        selectChannelLoad(nextChannel.id);
    });
});

// Errore da 'delete_channel' (es: tentativo di cancellare l'unico canale).
// Mostra un toast di errore con il messaggio inviato dal server.
socket.on('delete_channel_error', function(message) {
    showToast('⚠ ' + message, 'error');
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
