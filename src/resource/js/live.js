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

// transProgress è globale: viene letto come lambda () => window.transProgress dagli script Hydra iniettati
window.transProgress = 0;
var isTransitioning = false;

// Rimuove un tag <script> dal DOM per id, se presente
function removeScript(id) {
    var el = document.getElementById(id);
    if (el) el.remove();
}

// Carica codice Hydra nel tag chalfunction (scrittura diretta su o0)
function loadCode(code) {
    removeScript('chalfunction');
    var s = document.createElement('script');
    s.setAttribute("id", "chalfunction");
    s.textContent = code;
    document.body.appendChild(s);
}

// Redirige l'output del codice canale da o0 a o1 per eseguirlo in parallelo durante la transizione.
// Rimuove hush() per non cancellare il canale vecchio ancora attivo in o0.
// Rimuove render() perché la transizione gestisce il rendering su o2.
function redirectCodeToO1(code) {
    return code
        .replace(/hush\(\);?\s*/g, '')
        .replace(/\.out\(o0\)/g, '.out(o1)')
        .replace(/\.out\(\)/g, '.out(o1)')
        .replace(/render\s*\([^)]*\);?\s*/g, '');
}

// Inietta lo script Hydra che blenda old (o0) con new (o1) e mostra il risultato su o2.
// Usare o2 evita la dipendenza circolare che si crea blendando su o0.
function injectTransitionScript(type) {
    removeScript('chalTransition');
    var s = document.createElement('script');
    s.setAttribute("id", "chalTransition");
    if (type === 'crossfade') {
        s.textContent = "src(o0).blend(src(o1), () => window.transProgress).out(o2); render(o2);";
    } else if (type === 'add') {
        s.textContent = "src(o0).add(src(o1), () => window.transProgress).out(o2); render(o2);";
    }
    document.body.appendChild(s);
}

// Avvia la transizione:
//   o0 = vecchio canale (chalfunction intatto, continua a girare)
//   o1 = nuovo canale (codice rediretto, chalNew)
//   o2 = blend animato di o0→o1 (chalTransition), visualizzato su schermo
// Quando transProgress raggiunge 1.0: carica il nuovo canale normalmente in o0 e torna a render(o0)
function startTransition(newCode, type, durationMs) {
    // Interrompe eventuale transizione in corso prima di avviarne una nuova
    if (isTransitioning) {
        update = null;
        removeScript('chalTransition');
        removeScript('chalNew');
        render(o0);
        isTransitioning = false;
    }

    window.transProgress = 0;
    isTransitioning = true;
    var elapsed = 0;
    // dt passato da Hydra a update() è timeSinceLastUpdate in millisecondi (non secondi)

    // Nuovo canale reindirizzato su o1: non sovrascrive o0 dove gira ancora il vecchio canale
    removeScript('chalNew');
    var s = document.createElement('script');
    s.setAttribute("id", "chalNew");
    s.textContent = redirectCodeToO1(newCode);
    document.body.appendChild(s);

    // Blend o0 (vecchio) → o1 (nuovo) su o2 separato, senza toccare o0
    injectTransitionScript(type);

    // update(dt) è il callback di Hydra chiamato ogni frame, dt = delta time in secondi
    update = function(dt) {
        elapsed += dt;
        window.transProgress = Math.min(elapsed / durationMs, 1.0);
        if (window.transProgress >= 1.0) {
            update = null;
            removeScript('chalTransition');
            removeScript('chalNew');
            window.transProgress = 0;
            isTransitioning = false;
            // Carica il nuovo canale normalmente in o0 e ripristina render(o0)
            loadCode(newCode);
            render(o0);
        }
    };
}

var loadChannel = function(){
    if(channel!==null && toload){
        var transition = channel.transition || { type: 'cut', duration: 0 };
        var hasTransition = transition.type !== 'cut' && transition.duration > 0;

        socket.emit('set_toload', false);
        a.hide();

        if (hasTransition) {
            // Transizione: old in o0, new in o1, blend su o2
            startTransition(channel.code, transition.type, transition.duration);
        } else {
            // Cut diretto: sostituisce chalfunction immediatamente
            loadCode(channel.code);
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
