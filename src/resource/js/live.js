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

// Valori correnti delle macro variabili ricevuti via sync_macros dal mixer
window.macroVars = {};

/**
 * Sostituisce {{key}} nel codice Hydra con il valore numerico corrente.
 * Identica a processMacroVars in macroVarManager.js — inline per evitare dipendenze modulo.
 * @param {string} jsx - codice Hydra grezzo (può contenere {{placeholder}})
 * @returns {string} codice processato pronto per l'esecuzione
 */
function processMacroVars(jsx) {
    var vars = window.macroVars || {};
    if (!jsx || Object.keys(vars).length === 0) return jsx;
    return jsx.replace(/\{\{(\w+)\}\}/g, function(match, key) {
        return key in vars ? parseFloat(vars[key]) : match;
    });
}
hydra.setResolution(1920, 1080);
a.setBins(6);

// Rimuove un tag <script> dal DOM per id, se presente
function removeScript(id) {
    var el = document.getElementById(id);
    if (el) el.remove();
}

// Carica codice Hydra nel tag chalfunction (scrittura diretta su o0).
// Applica la sostituzione {{placeholder}} con i valori macro correnti prima dell'esecuzione.
function loadCode(code) {
    removeScript('chalfunction');
    var s = document.createElement('script');
    s.setAttribute("id", "chalfunction");
    s.textContent = processMacroVars(code);
    document.body.appendChild(s);
}

// Avvia una transizione CSS tra vecchio e nuovo canale:
//   1. Cattura il frame corrente via captureStream → video → ctx.drawImage su canvas 2D overlay
//   2. Posiziona l'overlay sopra il canvas Hydra (position: fixed, z-index 100)
//   3. Carica il nuovo canale su Hydra (visibile sotto l'overlay)
//   4. CSS opacity 1→0 sull'overlay rivela gradualmente il nuovo canale
//   5. transitionend: rimuove overlay
// Questo approccio non usa Hydra per il blend: nessun conflitto di buffer, nessun global state.
// type='add': mix-blend-mode: screen approssima un blend additivo durante il fade.
function startTransition(newCode, type, durationMs) {
    var stream, captureVideo;
    try {
        stream = hydra.canvas.captureStream(25);
    } catch(e) {
        loadCode(newCode); // fallback: cut
        return;
    }

    captureVideo = document.createElement('video');
    captureVideo.srcObject = stream;
    captureVideo.muted = true;
    // Nascosto fuori schermo (display:none blocca la riproduzione in alcuni browser)
    captureVideo.style.position = 'fixed';
    captureVideo.style.left = '-10000px';
    captureVideo.style.top = '-10000px';
    captureVideo.style.width = '1px';
    captureVideo.style.height = '1px';
    document.body.appendChild(captureVideo);

    var done = false;

    var onReady = function() {
        if (done) return;
        done = true;

        // Crea canvas 2D con il frame congelato del vecchio canale
        var rect = hydra.canvas.getBoundingClientRect();
        var overlay = document.createElement('canvas');
        overlay.width = hydra.canvas.width;
        overlay.height = hydra.canvas.height;
        overlay.style.position = 'fixed';
        overlay.style.left = rect.left + 'px';
        overlay.style.top = rect.top + 'px';
        overlay.style.width = rect.width + 'px';
        overlay.style.height = rect.height + 'px';
        overlay.style.zIndex = '100';
        overlay.style.pointerEvents = 'none';
        if (type === 'add') {
            overlay.style.mixBlendMode = 'screen';
        }

        // Disegna il frame del vecchio canale nell'overlay (statico)
        var ctx = overlay.getContext('2d');
        ctx.drawImage(captureVideo, 0, 0, overlay.width, overlay.height);

        // Libera subito il captureStream (non serve più)
        captureVideo.pause();
        stream.getTracks().forEach(function(t) { t.stop(); });
        captureVideo.remove();

        // Overlay in cima alla pagina, sopra il canvas Hydra
        document.body.appendChild(overlay);

        // Carica il nuovo canale su Hydra (visibile sotto l'overlay)
        loadCode(newCode);

        // CSS fade out: opacity 1→0 in durationMs
        // getBoundingClientRect() forza un reflow per applicare lo stato iniziale
        // prima di avviare la transizione (senza reflow il browser potrebbe ignorarla)
        overlay.style.opacity = '1';
        overlay.style.transition = 'opacity ' + durationMs + 'ms linear';
        overlay.getBoundingClientRect();
        overlay.style.opacity = '0';

        // Rimuove overlay quando la transizione CSS termina
        overlay.addEventListener('transitionend', function() {
            overlay.remove();
        });
    };

    // playing garantisce che il video stia decodificando frame reali;
    // il rAF successivo assicura che il primo frame sia disponibile per drawImage
    captureVideo.addEventListener('playing', function() {
        requestAnimationFrame(onReady);
    });
    captureVideo.play().catch(function() {
        captureVideo.remove();
        loadCode(newCode); // fallback: cut
    });
    // Timeout di sicurezza: se playing non arriva (browser senza captureStream), esegue cut
    setTimeout(function() {
        if (!done) {
            done = true;
            if (captureVideo.parentElement) captureVideo.remove();
            loadCode(newCode);
        }
    }, 500);
}

var loadChannel = function(){
    if(channel!==null && toload){
        var transition = channel.transition || { type: 'cut', duration: 0 };
        var hasTransition = transition.type !== 'cut' && transition.duration > 0;

        socket.emit('set_toload', false);
        a.hide();

        if (hasTransition) {
            startTransition(channel.code, transition.type, transition.duration);
        } else {
            loadCode(channel.code);
        }
    }
}

//SET SOCKET EVENT

// Riceve i valori aggiornati delle macro variabili dal mixer e li applica globalmente.
// loadCode() usa window.macroVars ad ogni esecuzione: il prossimo channel load usa i valori nuovi.
socket.on('sync_macros', function(vars) {
    window.macroVars = vars || {};
});

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

// pendingLoad: quando set_channel arriva e triggera loadChannel(), il successivo
// set_toload: true (inviato dal mixer subito dopo) viene assorbito senza riavviare
// la transizione già in corso (evita il double-trigger che causava un flash iniziale).
var pendingLoad = false;

socket.on('set_channel', function(variable) {
    channel = variable;
    pendingLoad = true;
    loadChannel();
});

socket.on('set_toload', function(variable) {
    toload = variable;
    if (pendingLoad && variable === true) {
        pendingLoad = false; // assorbe il set_toload: true conseguente al set_channel
    } else {
        loadChannel();
    }
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
