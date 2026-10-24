/**
 * audioPanel.js — Pannello "Audio" del mixer (af/AUDIO.md)
 *
 * Sceglie la sorgente di a.fft (Off / Mic default / dispositivo / audio del PC) tramite
 * window.DVMAudio (audioInput.js, condiviso con la Live), la salva (set_audio → DB + Live) e mostra:
 * sistema rilevato con suggerimento (RF2), meter FFT grande (RF7), stato di ogni Live (RF11).
 * L'indicatore #audioStatus in navbar va in avviso se la sorgente locale o una Live ha un problema.
 * I parametri di `a` (bins, cutoff…) restano al codice Hydra di ogni visual (D4): qui solo la sorgente.
 */

import { showToast } from './toastManager.js';
import { icon } from './uiHelp.js';

var _emit = null;
var _modal = null;
var _lives = [];
var _raf = 0;

function $(id) { return document.getElementById(id); }

function _esc(str) {
    return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// RF2: l'user-agent decide solo il TESTO del suggerimento; lo stato reale lo dà la sorgente aperta (§4)
function _system() {
    var ua = navigator.userAgent;
    var plat = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || '';
    var os = /win/i.test(plat + ua) ? 'Windows' : /mac/i.test(plat) || /Mac OS X/.test(ua) ? 'macOS'
        : /linux|x11/i.test(plat + ua) ? 'Linux' : 'Other';
    var br = /Edg\//.test(ua) ? 'Edge' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome'
        : /Safari\//.test(ua) ? 'Safari' : 'Other';
    var chromium = br === 'Chrome' || br === 'Edge';
    var canCapture = chromium && !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);
    var hint =
        br === 'Firefox' ? 'Firefox cannot capture PC or tab audio: pick a loopback device (Stereo Mix, VB-Audio Cable, BlackHole, Monitor of …) or use Chrome / Edge.'
        : br === 'Safari' ? 'Safari cannot capture PC or tab audio: install BlackHole and pick it as device. Chrome is recommended (Web MIDI too).'
        : !chromium ? 'Pick a loopback device to use the PC audio (Stereo Mix, VB-Audio Cable, BlackHole, Monitor of …).'
        : os === 'Windows' ? 'Capture PC audio: choose "Entire screen" and tick "Share system audio". For a setup that starts by itself, enable "Stereo Mix" (Sound settings → Recording) or install VB-Audio Cable and pick it as device.'
        : os === 'macOS' ? 'Capture PC audio works for one browser tab (choose a tab and tick "Share tab audio"); whole-system capture is not reliable on macOS. For the whole system install BlackHole, create a Multi-Output Device in Audio MIDI Setup and pick BlackHole as device.'
        : os === 'Linux' ? 'Capture PC audio works for one browser tab (tick "Share tab audio"). For the whole system pick a "Monitor of …" device (PulseAudio / PipeWire).'
        : 'Capture PC audio works for one browser tab (tick "Share tab audio"), or pick a loopback device.';
    return { os: os, br: br, canCapture: canCapture, hint: hint };
}

/** @param {Function} emitFn - emit di mixerEmitter (iniettato: niente import circolari) */
export function initAudioPanel(emitFn) {
    _emit = emitFn;
    DVMAudio.onChange(function(st, ev) {
        // E3b: audioInput.js passa ogni evento una sola volta per scelta, qui niente filtri
        if (ev === 'disconnected') showToast('Device disconnected: ' + st.label + ' — audio off', 'error');
        if (ev === 'reconnected') showToast('Device reconnected: ' + st.label);
        if (ev === 'stopped') showToast('PC audio sharing stopped — audio off', 'error');
        _indicator();
        if (_modal) { _renderState(); if (ev === 'devices') _renderDevices(); }
    });
    var el = $('audioStatus');
    if (el) el.addEventListener('click', openAudioPanel);
    _indicator();
}

/** Scelta salvata (get_audio alla connessione) o cambiata da un altro mixer: si apre su questo PC */
export function setAudioChoice(choice) {
    DVMAudio.apply(choice, false);
}

/** Stato delle Live connesse (audio_lives) */
export function setLiveAudio(list) {
    _lives = list || [];
    _indicator();
    if (_modal) _renderLives();
}

// RF6/RF11: sorgente locale in breve; avviso se questa pagina o almeno una Live ha un problema
function _indicator() {
    var el = $('audioStatus');
    if (!el) return;
    var st = DVMAudio.state();
    var liveWarn = _lives.some(function(l) { return l.warn; });
    var short = st.type === 'off' ? 'Off' : st.type === 'system' ? 'PC' : st.type === 'default' ? 'Mic'
        : st.label.length > 14 ? st.label.slice(0, 13) + '…' : st.label;
    el.className = 'dev-status ' + (st.warn || liveWarn ? 'dev-none' : st.status === 'active' ? 'dev-on' : 'dev-idle');
    el.innerHTML = icon(st.warn || liveWarn ? 'triangle-exclamation' : 'volume-high') + ' ';
    el.appendChild(document.createTextNode(short));
    el.setAttribute('aria-label', 'Audio: ' + st.label + ', ' + st.text);
    el.dataset.tip = 'Audio: ' + st.label + ' — ' + st.text + (liveWarn ? '\nAudio problem on a Live' : '') + '\nClick to open the Audio panel';
}

export function openAudioPanel() {
    if (_modal) return;
    var sys = _system();
    document.body.insertAdjacentHTML('beforeend',
        '<div class="modal fade mm" id="audioModal" tabindex="-1">' +
        '<div class="modal-dialog modal-lg"><div class="modal-content">' +
        '<div class="modal-header"><h5 class="modal-title">' + icon('volume-high') + ' Audio input</h5>' +
            '<button type="button" class="help-btn ms-2" data-help="audio" data-tip="Help: Audio input" aria-label="Help: Audio input">' + icon('circle-question') + '</button>' +
            '<button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button></div>' +
        '<div class="modal-body">' +
            '<div class="au-sys">' + icon('desktop') + ' System detected: <b>' + sys.os + ' · ' + sys.br + '</b>' +
                '<div class="au-hint">' + _esc(sys.hint) + '</div></div>' +
            '<div class="au-sources" role="radiogroup" aria-label="Audio source">' +
                '<label class="au-src"><input type="radio" name="auType" value="off"> ' + icon('volume-xmark') + ' Off <small>no input, no permission asked</small></label>' +
                '<label class="au-src"><input type="radio" name="auType" value="default"> ' + icon('microphone') + ' Mic (default) <small>the browser default microphone</small></label>' +
                '<label class="au-src"><input type="radio" name="auType" value="device"> ' + icon('plug') + ' Device ' +
                    '<select id="auDevice" class="mm-input" aria-label="Input device" data-tip="Input devices of this PC; loopback devices carry the PC audio"></select>' +
                    '<button id="auRefresh" class="mm-btn" data-tip="Reload the device list" aria-label="Refresh devices">' + icon('rotate') + '</button>' +
                    '<button id="auUnlock" class="mm-btn" style="display:none" data-tip="The browser shows device names only after you allow the microphone">' + icon('lock-open') + ' Allow microphone to see device names</button></label>' +
                '<label class="au-src"><input type="radio" name="auType" value="system"' + (sys.canCapture ? '' : ' disabled') + '> ' + icon('desktop') + ' PC audio ' +
                    '<button id="auCapture" class="mm-btn mm-primary"' + (sys.canCapture ? '' : ' disabled') +
                    ' data-tip="' + (sys.canCapture ? 'Opens the browser share window: pick the screen or tab and tick the audio checkbox. Needed again after every reload'
                        : _esc(sys.br) + ' cannot capture PC audio: pick a loopback device') + '">' + icon('share-from-square') + ' Capture PC audio</button></label>' +
            '</div>' +
            '<div id="auState" class="au-state"></div>' +
            '<canvas id="auMeter" class="au-meter" height="200" aria-label="Audio levels per bin"></canvas>' +
            '<h6 class="au-h">' + icon('display') + ' Live</h6><div id="auLives"></div>' +
        '</div></div></div></div>');
    _modal = $('audioModal');

    _modal.addEventListener('change', function(e) {
        // Il clic sul radio è già un gesto: vale anche per "PC audio". Bottoni/select dentro la label
        // non attivano il radio (contenuto interattivo), quindi niente doppia richiesta
        if (e.target.name === 'auType') _choose(e.target.value);
        if (e.target.id === 'auDevice') _choose('device');
    });
    _modal.addEventListener('click', function(e) {
        var b = e.target.closest('button');
        if (!b) return;
        if (b.id === 'auRefresh') _renderDevices();
        if (b.id === 'auUnlock') DVMAudio.unlock().then(_renderDevices, function() { showToast('Microphone permission denied', 'error'); });
        // Clic diretto: getDisplayMedia esige il gesto dell'utente (RF4)
        if (b.id === 'auCapture') _choose('system');
    });
    _modal.addEventListener('hidden.bs.modal', function() {
        cancelAnimationFrame(_raf);
        _modal.remove();
        _modal = null;
    });
    new bootstrap.Modal(_modal).show();
    _renderDevices();
    _renderState();
    _renderLives();
    _meter();
}

// Scelta dell'utente: si applica (con il gesto) e si salva; se non si applica (E1, finestra annullata) resta la precedente
function _choose(type) {
    var sel = $('auDevice');
    var choice = { type: type, deviceName: type === 'device' && sel ? sel.value : '' };
    if (type === 'device' && !choice.deviceName) { _renderState(); return; }
    DVMAudio.apply(choice, true).then(function(r) {
        if (r.ok) { _emit('set_audio', choice); return; }
        if (r.error === 'noaudio') showToast("No audio in the shared source: tick 'Share audio'", 'error');
        if (r.error === 'failed') showToast('PC audio capture failed', 'error');
        _renderState();
    });
}

function _renderDevices() {
    DVMAudio.devices().then(function(d) {
        var sel = $('auDevice');
        if (!sel) return;
        var cur = DVMAudio.state();
        var names = d.list.map(function(x) { return x.label; });
        // Dispositivo scelto ma assente (scollegato, altro PC): resta visibile nel menu come "not found"
        if (cur.type === 'device' && cur.deviceName && names.indexOf(cur.deviceName) === -1)
            d.list.unshift({ label: cur.deviceName, missing: true });
        sel.innerHTML = '<option value="">' + (d.list.length ? 'Choose a device…' : 'No input device') + '</option>' +
            d.list.map(function(x) {
                // Niente icone dentro <option>: l'evidenza "audio del PC" è testuale (RF3)
                return '<option value="' + _esc(x.label) + '">' + _esc(x.label) +
                    (x.loopback ? ' — PC audio' : '') + (x.missing ? ' — not found' : '') + '</option>';
            }).join('');
        sel.value = cur.type === 'device' ? cur.deviceName : '';
        $('auUnlock').style.display = d.hidden ? '' : 'none';
    });
}

function _renderState() {
    var st = DVMAudio.state();
    _modal.querySelectorAll('input[name=auType]').forEach(function(r) { r.checked = r.value === st.type; });
    var box = $('auState');
    box.className = 'au-state ' + (st.warn ? 'au-warn' : st.status === 'active' ? 'au-ok' : '');
    box.innerHTML = icon(st.warn ? 'triangle-exclamation' : st.status === 'active' ? 'circle-check' : 'circle-info') + ' This mixer: <b>' +
        _esc(st.label) + '</b> — ' + _esc(st.text) +
        (st.status === 'unsupported' ? ' — see Guide → Live on another PC' : '') +
        (st.status === 'denied' ? ' — allow the microphone from the padlock in the address bar' : '');
}

// Cosa può fare l'utente per una Live con problemi: il mixer non apre dispositivi su quel PC (RF11)
function _todo(l) {
    return l.status === 'waiting' || l.status === 'stopped' ? 'click on the Live page'
        : l.status === 'disconnected' || l.status === 'notfound' ? 'reconnect the device or choose another source'
        : l.status === 'denied' ? 'allow the microphone on the Live page (padlock icon)'
        : l.status === 'unsupported' ? 'open the Live over HTTPS (Guide → Live on another PC)' : '';
}

function _renderLives() {
    var box = $('auLives');
    if (!_lives.length) { box.innerHTML = '<p class="mm-empty">No Live window connected.</p>'; return; }
    box.innerHTML = '<table class="mm-table"><tbody>' + _lives.map(function(l, i) {
        return '<tr class="' + (l.warn ? 'au-warn' : '') + '"><td>' + icon(l.warn ? 'triangle-exclamation' : 'display') + ' Live ' + (i + 1) +
            '</td><td>' + _esc(l.label) + '</td><td>' + _esc(l.text) + (_todo(l) ? ' — ' + _todo(l) : '') + '</td></tr>';
    }).join('') + '</tbody></table>';
}

// RF7: una barra per bin con a.fft[i] e valore, linea del cutoff; a frame, solo a pannello aperto
function _meter() {
    var cv = $('auMeter');
    if (!cv) return;
    var w = cv.clientWidth;
    if (cv.width !== w) cv.width = w;
    var h = cv.height, ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, w, h);
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    var st = DVMAudio.state();
    if (!window.a || !a.bins || st.status !== 'active') {
        // Niente barre ferme sull'ultimo valore quando non entra audio (RF10)
        ctx.fillStyle = '#777';
        ctx.fillText('No input', w / 2, h / 2);
    } else {
        var n = a.bins.length, sw = w / n, top = 1;
        // Scala comune: il massimo tra soglie (cutoff + scale = fft 1) e livelli correnti
        for (var i = 0; i < n; i++) top = Math.max(top, a.bins[i], a.settings[i].cutoff + a.settings[i].scale);
        var y = function(v) { return (h - 34) * (1 - v / (top * 1.1)) + 18; };
        for (var j = 0; j < n; j++) {
            var x = j * sw, f = a.fft[j] || 0;
            ctx.fillStyle = f > 0 ? '#00e676' : '#4a9eff';
            ctx.fillRect(x + 4, y(a.bins[j]), sw - 8, h - 16 - y(a.bins[j]));
            ctx.strokeStyle = '#ff9800';
            ctx.setLineDash([4, 3]);
            ctx.beginPath(); ctx.moveTo(x + 2, y(a.settings[j].cutoff)); ctx.lineTo(x + sw - 2, y(a.settings[j].cutoff)); ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = '#ddd';
            ctx.fillText(f.toFixed(2), x + sw / 2, 13);
            ctx.fillStyle = '#999';
            ctx.fillText('a.fft[' + j + ']', x + sw / 2, h - 3);
        }
    }
    _raf = requestAnimationFrame(_meter);
}
