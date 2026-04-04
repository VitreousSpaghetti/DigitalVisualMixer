/*
osc() oscilla su tre valori: primo indica larghezza (più è piccolo più la banda è grande), velocità (negativo per andare a sinistra), colore (colori bande)
rotate() ruota su due valori (il primo è di quanto ruota, il secondo è quanto veloce)
repeat() su due valori, il primo è le colonne e la seconda sono le righe
kaleid() caleido su un valore che ne indica i punti del poligono (minimo 2 per un rettangolo)
noise() ruomore (bolle) su due valori, uno indica quanto sono piccoli e il secondo quanto sono veloci
scrollX da dove parte, quanto veloce
scrollY da dove parte, quanto veloce
scroll da dove parte x,y, quanto veloce x,y
colorama indica quanto colorizzare
out() butta fuori il risultato
s0.initCam() initialize webcam as external source 's0'
src(s0).out() use external source 's0' inside Hydra
color tre valori RGB
render(o2)  // show only output o2
blend() combines the colors from two sources to create a third source. il secondo valore aumenta il colore di differenza
modulate() does not change color or luminosity but distorts one visual source using another visual source.
modulateRotate() is similar to .rotate(), but it allows you to apply different amounts of rotation to different parts of the visual source
shape indica i lati, quanto è largo e quanto sfumare i bordi
https://hydra.ojack.xyz/api/
*/


//INIT SOCKET

var socket = io();
var channel =  null; //default
var toload = null; //default
var hydra = new Hydra({ detectAudio: true, canvas: document.getElementById("hydra-canvas") });
hydra.setResolution(1920, 1080);
a.setBins(6);

// Stato transizione: transProgress è globale perché letto dagli script Hydra iniettati
window.transProgress = 0;
var isTransitioning = false;

// Congela il frame corrente in o1 prima di caricare il nuovo canale
function captureCurrentFrame() {
    src(o0).out(o1);
}

function removeTransitionScript() {
    var el = document.getElementById('chalTransition');
    if (el) el.remove();
}

// Inietta lo script Hydra che esegue il blend tra o1 (vecchio) e o0 (nuovo)
function injectTransitionScript(type) {
    removeTransitionScript();
    var s = document.createElement('script');
    s.setAttribute("id", "chalTransition");
    if (type === 'crossfade') {
        s.textContent = "src(o1).blend(src(o0), () => window.transProgress).out(o0); render(o0);";
    } else if (type === 'add') {
        s.textContent = "src(o1).add(src(o0), () => window.transProgress).out(o0); render(o0);";
    }
    document.body.appendChild(s);
}

// Avvia la transizione animando transProgress da 0 a 1 tramite il callback update(dt) di Hydra
function startTransition(type, durationMs) {
    // Interrompe eventuale transizione in corso prima di avviarne una nuova
    if (isTransitioning) {
        update = null;
        removeTransitionScript();
        isTransitioning = false;
    }
    window.transProgress = 0;
    isTransitioning = true;
    var elapsed = 0;
    var durationSec = durationMs / 1000; // dt di Hydra è in secondi

    injectTransitionScript(type);

    // update(dt) è il callback Hydra chiamato ogni frame, dt = delta time in secondi
    update = function(dt) {
        elapsed += dt;
        window.transProgress = Math.min(elapsed / durationSec, 1.0);
        if (window.transProgress >= 1.0) {
            // Transizione completata: rimuove lo script e torna al render normale
            update = null;
            removeTransitionScript();
            window.transProgress = 0;
            isTransitioning = false;
            render(o0);
        }
    };
}

var loadChannel = function(){
    if(channel!==null && toload){
        var transition = channel.transition || { type: 'cut', duration: 0 };
        var hasTransition = transition.type !== 'cut' && transition.duration > 0;

        // Cattura il frame corrente PRIMA di caricare il nuovo codice
        if (hasTransition) {
            captureCurrentFrame();
        }

        // Carica il codice del nuovo canale (scrive su o0)
        if (document.getElementById('chalfunction')) {
            document.getElementById('chalfunction').remove();
        }
        var s = document.createElement('script');
        s.setAttribute("id", "chalfunction");
        s.textContent = channel.code;
        document.body.appendChild(s);
        socket.emit('set_toload', false);
        a.hide();

        // Avvia animazione transizione dopo che il nuovo codice è in esecuzione
        if (hasTransition) {
            startTransition(transition.type, transition.duration);
        }
    }
}

//SET SOCKET EVENT

socket.on('get_channel', function(variable) {
    channel = variable; 
    loadChannel();
});

socket.on('get_toload', function(variable) {
    if(toload === null){
        toload = true;
    }else{
        toload = variable; 
    }
    loadChannel();
});

socket.on('set_channel', function(variable) {
    channel = variable; 
    loadChannel(); 
});

socket.on('set_toload', function(variable) {
    toload = variable;  
    loadChannel(); 
});
 
var resetAudioAndSpeed = function(){ 
    a.setScale(10)
    a.setBins(6)
    a.setSmooth(0.8)
    a.setCutoff(3)
    sepped=1;
    bpm=30;
    console.log(a);
    console.log("speed "+speed);
    console.log("bpm "+bpm); 
  }
  
var init = function(){
    //START SOCKET CONNECTION
    socket.on('connect', function() { 
    }); 
    loadChannel();
     
}

init();
 
 