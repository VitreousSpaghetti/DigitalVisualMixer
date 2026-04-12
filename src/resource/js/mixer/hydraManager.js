
var hydraMain;
var sepped = 1;
var bpm = 30;
function refreshHydra(jsx) {
    // Rimuovi pannello errore precedente se presente
    var errPanel = document.getElementById('hydraErrorPanel');
    if (errPanel) errPanel.style.display = 'none';

    if (document.getElementById('chalfunction')) {
        document.getElementById('chalfunction').remove();
    }
    var s = document.createElement('script');
    s.setAttribute("id", "chalfunction");
    s.textContent = jsx;
    // TODO-7.2: cattura errori di sintassi tramite onerror sul document
    s.setAttribute('type', 'text/javascript');
    document.body.appendChild(s);
}

// Esegue una transizione nel canvas del mixer tra source1 (vecchio) e source2 (nuovo)
// Usa window.transProgress come fattore di blend animato (0→1)
function refreshHydraWithTransiction(source1, source2, transition) {
    if (document.getElementById('chalTransition')) {
        document.getElementById('chalTransition').remove();
    }
    var s = document.createElement('script');
    s.setAttribute("id", "chalTransition");
    // Genera: src(o1).blend(src(o0), () => window.transProgress).out(o0); render(o0);
    s.textContent = source1 + "." + transition + "(" + source2 + ", () => window.transProgress).out(o0); render(o0);";
    document.body.appendChild(s);
}
function resetAudioAndSpeed() {
    a.setScale(10)
    a.setBins(6)
    a.setSmooth(0.8)
    a.setCutoff(3)
    sepped = 1;
    bpm = 30;
    console.log(a);
    console.log("speed " + speed);
    console.log("bpm " + bpm);
}
function inithydra() {
    hydraMain = new Hydra({ detectAudio: true, canvas: document.getElementById("hydra-canvas"), numSources: 8, numOutputs: 8 }).synth;
    hydraMain.setResolution(1920, 1080);
    resetAudioAndSpeed();
    a.show();
    window.hydraMain = hydraMain;
    window.resetAudioAndSpeed = resetAudioAndSpeed;
}
// TODO-7.2: intercetta errori runtime Hydra e li mostra nel pannello errore
window.addEventListener('error', function(event) {
    // Filtra solo errori provenienti da script Hydra (chalfunction)
    var errPanel = document.getElementById('hydraErrorPanel');
    if (!errPanel) return;
    errPanel.textContent = '⚠ Hydra error: ' + (event.message || 'errore sconosciuto');
    errPanel.style.display = 'block';
    // Auto-hide dopo 5 secondi
    setTimeout(function() { errPanel.style.display = 'none'; }, 5000);
});

// Controlla la sintassi del codice Hydra senza eseguirlo — usa new Function() che
// esegue solo il parsing JS e lancia SyntaxError su codice malformato (parentesi mancanti,
// stringhe non chiuse, ecc.). Non rileva errori Hydra runtime (variabili undefined come
// osc, solid, o0, ecc.) perché queste esistono solo nel contesto del browser con Hydra caricato.
// Ritorna { valid: true } oppure { valid: false, error: string }.
export function validateHydraCode(jsx) {
    try {
        // eslint-disable-next-line no-new-func
        new Function(jsx);
        return { valid: true };
    } catch (e) {
        return { valid: false, error: e.message };
    }
}

export { inithydra, refreshHydra, refreshHydraWithTransiction, resetAudioAndSpeed }