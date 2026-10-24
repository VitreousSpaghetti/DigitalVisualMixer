/**
 * audioInput.js — Sorgente audio di a.fft (af/AUDIO.md), script classico condiviso da mixer.html e live.html
 *
 * hydra-synth crea `a` con un analizzatore Meyda che ha setSource(node): si cambia la sorgente sullo
 * stesso `a`, senza ricreare Hydra (nessun frame nero, il codice in esecuzione continua a leggere a.fft).
 * Deve essere caricato PRIMA di creare Hydra: intercetta la richiesta del microfono che Hydra fa nel
 * costruttore, altrimenti "Off" e i dispositivi scelti farebbero comunque comparire il prompt del mic.
 *
 * window.DVMAudio:
 *  - apply(choice, gesture) → Promise<{ok, error?}>; choice = {type: off|default|device|system, deviceName}
 *    gesture = chiamata da un clic (serve a getDisplayMedia). error 'noaudio'|'cancelled'|'failed' = la
 *    scelta non è stata applicata e resta la sorgente precedente (E1)
 *  - capture()  → riprova la scelta corrente con il gesto (overlay Live, pulsante del pannello)
 *  - state()    → {type, deviceName, label, status, text, warn}
 *  - devices()  → Promise<{hidden, list: [{label, loopback}]}>; hidden = nomi nascosti finché non c'è il permesso
 *  - unlock()   → chiede il permesso del mic solo per leggere i nomi dei dispositivi
 *  - onChange(fn) → fn(state, event); event = 'disconnected'|'reconnected'|'stopped'|'devices'|null
 *  - params() / setParams(p) / DEFAULTS → override di scale/cutoff/smooth/bins (af/AUDIO_PARAMS.md);
 *    setParams ritorna true se l'override si è appena spento (va rieseguito il codice in onda)
 */
(function () {
    var md = navigator.mediaDevices;
    // Dispositivi virtuali che portano l'audio del PC (RF3)
    var LOOPBACK = /stereo mix|missaggio stereo|cable output|voicemeeter|blackhole|loopback|soundflower|^monitor of/i;
    // Per far reagire i visual serve il segnale com'è: AGC/soppressione rumore appiattiscono la musica
    var NOPROC = { echoCancellation: false, noiseSuppression: false, autoGainControl: false };

    var choice = { type: 'default', deviceName: '' };
    var status = 'off';      // stato "di base"; state() lo trasforma in waiting se l'AudioContext è sospeso
    var stream = null, silent = null, seq = 0;
    var wasActive = false;   // la scelta corrente è già stata attiva: assente = "disconnected", mai trovata = "notfound"
    var notified = {};       // E3b: un solo avviso per evento finché l'utente non cambia scelta
    var listeners = [];

    // AUDIO_PARAMS: default = quelli di resetAudioAndSpeed(); usati anche da un DB senza i campi (RF3, RF7)
    var DEFAULTS = { scale: 10, cutoff: 3, smooth: 0.8, bins: 6 };
    var params = Object.assign({ override: false }, DEFAULTS);
    var raw = null;          // setter originali di `a`, salvati quando `a` esiste

    var gum = md && md.getUserMedia ? md.getUserMedia.bind(md) : null;
    if (gum) {
        var hooked = false;
        // Solo la prima chiamata con questa forma esatta (quella del costruttore di Hydra) riceve uno
        // stream muto; webcam e tutto il resto passano invariati.
        md.getUserMedia = function (c) {
            if (!hooked && c && c.audio === true && c.video === false) {
                hooked = true;
                return Promise.resolve(new AudioContext().createMediaStreamDestination().stream);
            }
            return gum(c);
        };
    }

    // Meyda nasce nel .then() di Hydra: si aspetta che esista prima di toccare la sorgente
    var ready = new Promise(function (res) {
        if (!gum) return;
        var t = setInterval(function () {
            if (!window.a || !a.meyda) return;
            clearInterval(t);
            silent = a.context.createGain(); // nodo senza ingressi = silenzio, sorgente di "Off"
            a.meyda.setSource(silent);
            a.context.onstatechange = function () { set(status); };
            res();
        }, 50);
    });
    // Poll a parte: i setter di `a` esistono anche senza getUserMedia (Live in HTTP), E5
    var hookT = setInterval(function () {
        if (!window.a || !a.setBins) return;
        clearInterval(hookT);
        hookParams();
    }, 50);

    // Chrome avvia l'AudioContext solo dopo un gesto: il primo clic/tasto sulla pagina lo sblocca
    ['pointerdown', 'keydown'].forEach(function (ev) {
        document.addEventListener(ev, resumeCtx, true);
    });
    function resumeCtx() {
        if (window.a && a.context && a.context.state === 'suspended') a.context.resume().catch(function () {});
    }

    // AUDIO_PARAMS RF5: invece di accodare a.set*() a ogni codice eseguito (preview, transizioni,
    // preset, Live…) si avvolgono i setter una volta sola: con override acceso le chiamate dei visual
    // (anche da macro, a ogni frame o in un codice andato in errore: E2, E4) non hanno effetto.
    function hookParams() {
        raw = {};
        ['Scale', 'Cutoff', 'Smooth', 'Bins'].forEach(function (n) {
            raw[n] = a['set' + n].bind(a);
            a['set' + n] = function (v) { if (!params.override) raw[n](v); };
        });
        applyParams();
    }

    function applyParams() {
        if (!raw || !params.override) return;
        // setBins ricrea fft/settings: solo se cambia, così lo smoothing non riparte a ogni slider
        if (a.bins.length !== params.bins) raw.Bins(params.bins);
        raw.Scale(params.scale);
        raw.Cutoff(params.cutoff);
        raw.Smooth(params.smooth);
    }

    // Ritorna true se l'override si è appena spento: il chiamante riesegue il codice in onda (RF6)
    function setParams(p) {
        var was = params.override;
        Object.keys(params).forEach(function (k) { if (p && p[k] !== undefined) params[k] = p[k]; });
        // Niente emit(): sulla Live farebbe partire audio_status a ogni movimento di slider
        applyParams();
        return was && !params.override;
    }

    function stop(s) { s.getTracks().forEach(function (t) { t.onended = null; t.stop(); }); }

    function connect(s) {
        if (stream && stream !== s) stop(stream);
        stream = s;
        a.meyda.setSource(s ? a.context.createMediaStreamSource(s) : silent);
        if (s) s.getAudioTracks().forEach(function (t) { t.onended = lost; });
        resumeCtx();
    }

    // Traccia terminata: dispositivo staccato o "Interrompi condivisione" (RF10, E2). Fallback Off,
    // la scelta resta quella dell'utente (D5)
    function lost() {
        connect(null);
        var ev = choice.type === 'system' ? 'stopped' : 'disconnected';
        set(ev, ev);
    }

    function inputs() {
        if (!md || !md.enumerateDevices) return Promise.resolve([]);
        return md.enumerateDevices().then(function (l) {
            // 'default'/'communications' sono alias di Chrome di un dispositivo già in elenco
            return l.filter(function (d) { return d.kind === 'audioinput' && d.deviceId !== 'default' && d.deviceId !== 'communications'; });
        });
    }

    function unlock() { return gum({ audio: true }).then(stop); }

    // Corrispondenza per nome esatto: un nome diverso ("(2)" su un'altra porta) non si riprende da solo (E3c)
    function findDevice(name) {
        return inputs().then(function (l) {
            return l.length && !l.some(function (d) { return d.label; }) ? unlock().then(inputs) : l;
        }).then(function (l) {
            return (l.find(function (d) { return d.label === name; }) || {}).deviceId;
        });
    }

    // Apre la sorgente: {stream} | {status} (non attiva, fallback Off) | {error} (non applicata)
    function open(c, gesture) {
        if (c.type === 'off') return Promise.resolve({ status: 'off' });
        if (c.type === 'system') {
            // getDisplayMedia esige un clic sulla pagina a ogni apertura (vincolo del browser, RF9)
            if (!gesture) return Promise.resolve({ status: 'waiting' });
            if (!md.getDisplayMedia) return Promise.resolve({ error: 'failed' });
            return md.getDisplayMedia({ video: true, audio: NOPROC, systemAudio: 'include' }).then(function (s) {
                s.getVideoTracks().forEach(function (t) { t.stop(); }); // il video della condivisione non serve
                if (!s.getAudioTracks().length) { stop(s); return { error: 'noaudio' }; }
                return { stream: s };
            }, function (e) { return { error: e.name === 'NotAllowedError' ? 'cancelled' : 'failed' }; });
        }
        var missing = wasActive ? 'disconnected' : 'notfound';
        return (c.type === 'device' ? findDevice(c.deviceName) : Promise.resolve(null)).then(function (id) {
            if (c.type === 'device' && !id) return { status: missing };
            var audio = Object.assign({}, NOPROC);
            if (id) audio.deviceId = { exact: id };
            return gum({ audio: audio }).then(function (s) { return { stream: s }; });
        }).catch(function (e) {
            return { status: e.name === 'NotAllowedError' || e.name === 'SecurityError' ? 'denied' : missing };
        });
    }

    function apply(c, gesture) {
        c = { type: (c && c.type) || 'default', deviceName: (c && c.deviceName) || '' };
        var same = c.type === choice.type && c.deviceName === choice.deviceName;
        // Riconnessione socket con la stessa scelta già attiva: non riaprire lo stream
        if (same && !gesture && status === 'active') { set(status); return Promise.resolve({ ok: true }); }
        var my = ++seq, prev = choice;
        choice = c;
        if (!same) { notified = {}; wasActive = false; }
        if (!gum) { set('unsupported'); return Promise.resolve({ ok: true }); }
        return ready.then(function () { return open(c, gesture); }).then(function (r) {
            if (my !== seq) { if (r.stream) stop(r.stream); return { ok: false, error: 'superseded' }; }
            if (r.error) { choice = prev; set(status); return { ok: false, error: r.error }; }
            connect(r.stream || null);
            if (r.stream) wasActive = true;
            set(r.stream ? 'active' : r.status);
            return { ok: true };
        });
    }

    // RF10: un dispositivo con lo stesso nome ricompare → si riprende da solo, senza clic
    if (md && md.addEventListener) md.addEventListener('devicechange', function () {
        emit('devices');
        if (status !== 'disconnected' && status !== 'notfound') return;
        var my = seq;
        open(choice, false).then(function (r) {
            if (!r.stream) return;
            if (my !== seq) return stop(r.stream);
            connect(r.stream);
            wasActive = true;
            set('active', 'reconnected');
        });
    });

    function label() {
        return choice.type === 'off' ? 'Off' : choice.type === 'system' ? 'PC audio'
            : choice.type === 'device' ? choice.deviceName : 'Mic (default)';
    }

    function text(st) {
        return {
            active: 'Active',
            off: 'Off',
            waiting: choice.type === 'system' ? 'Waiting for a click to capture PC audio' : 'Waiting for a click to start audio',
            notfound: 'Device not found, audio off',
            disconnected: 'Device disconnected, audio off',
            stopped: 'PC audio sharing stopped, audio off',
            denied: 'Permission denied, audio off',
            unsupported: 'Not available here (needs HTTPS or localhost)'
        }[st];
    }

    function state() {
        // Stream aperto ma AudioContext fermo (nessun gesto ancora): per l'utente è "in attesa di clic"
        var st = status === 'active' && window.a && a.context && a.context.state !== 'running' ? 'waiting' : status;
        return { type: choice.type, deviceName: choice.deviceName, label: label(), status: st, text: text(st),
                 warn: st !== 'active' && st !== 'off' };
    }

    function emit(ev) {
        var s = state();
        listeners.forEach(function (fn) { fn(s, ev || null); });
    }

    function set(st, ev) {
        status = st;
        if (ev && notified[ev]) ev = null;
        if (ev) notified[ev] = true;
        emit(ev);
    }

    window.DVMAudio = {
        apply: apply,
        // Stream già aperto e contesto sospeso: basta sbloccarlo, non si richiede la condivisione
        capture: function () { if (status === 'active') { resumeCtx(); return Promise.resolve({ ok: true }); } return apply(choice, true); },
        state: state,
        devices: function () {
            return inputs().then(function (l) {
                return { hidden: l.length > 0 && !l.some(function (d) { return d.label; }),
                         list: l.filter(function (d) { return d.label; }).map(function (d) { return { label: d.label, loopback: LOOPBACK.test(d.label) }; }) };
            });
        },
        unlock: function () { return gum ? unlock() : Promise.reject(new Error('unsupported')); },
        onChange: function (fn) { listeners.push(fn); },
        DEFAULTS: DEFAULTS,
        params: function () { return Object.assign({}, params); },
        setParams: setParams
    };
})();
