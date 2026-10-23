/**
 * performManager.js — Vista Perform e sidebar comprimibile (PERFORM RF8, RF10)
 *
 * Perform è una modalità della stessa pagina (classe body.perform-mode), non una pagina
 * nuova: stato MIDI/gamepad e socket vivono nel mixer e non vanno ricreati.
 * In Perform l'editor sparisce; restano preview grande, variabili come barre verticali,
 * pad Canali (→ live) e pad Preset. Nessuna azione distruttiva è raggiungibile da qui.
 */

import { getVarKeys, buildVarControl } from './macroVarManager.js';
import { channelMixer, runChannel } from './mixerManager.js';
import { getPresetList, applyPresetById } from './presetManager.js';

// localStorage può lanciare (modalità privata, storage bloccato): la UI funziona comunque
function _get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function _set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

/** Toggle Edit/Perform (bottone navbar + F2) e sezioni comprimibili; ripristina lo stato salvato */
export function initPerform() {
    var btn = document.getElementById('performToggle');
    if (btn) btn.addEventListener('click', function() { togglePerform(); });
    window.addEventListener('keydown', function(e) {
        if (e.key === 'F2') { e.preventDefault(); togglePerform(); }
    });
    _initCollapsibles();
    if (_get('performMode') === '1') togglePerform(true);
}

/**
 * @param {boolean} [force] - true/false per forzare la modalità, omesso per alternare
 */
export function togglePerform(force) {
    var on = typeof force === 'boolean' ? force : !document.body.classList.contains('perform-mode');
    document.body.classList.toggle('perform-mode', on);
    _set('performMode', on ? '1' : '0');
    var btn = document.getElementById('performToggle');
    if (btn) btn.textContent = on ? '✎ Edit (F2)' : '▶ Perform (F2)';
    renderPerform();
}

/**
 * Ricostruisce barre e pad. Chiamato all'ingresso in Perform e quando cambiano
 * macro / canali / preset (mixerEmitter.js); no-op in modalità Edit.
 */
export function renderPerform() {
    if (!document.body.classList.contains('perform-mode')) return;
    var vars = document.getElementById('performVars');
    vars.innerHTML = '';
    getVarKeys().forEach(function(k) { vars.appendChild(buildVarControl(k, true)); });

    // Il canale live si legge dalla griglia della sidebar, che mixerManager tiene aggiornata
    var liveEl = document.querySelector('#multychannel .liveChannel');
    _pads('performChannels', channelMixer.map(function(c) {
        return { label: c.name || String(c.id), live: liveEl && liveEl.id === String(c.id), ch: c.id, run: function() { runChannel(c.id); } };
    }));
    _pads('performPresets', getPresetList().map(function(p) {
        return { label: p.name || 'Preset #' + p.id, run: function() { applyPresetById(p.id); } };
    }));
}

function _pads(id, items) {
    var box = document.getElementById(id);
    box.innerHTML = '';
    items.forEach(function(it) {
        var b = document.createElement('button');
        b.className = 'pad' + (it.live ? ' pad-live' : '');
        if (it.ch !== undefined) b.dataset.padCh = it.ch; // showChannelLive sposta pad-live
        b.textContent = it.label;
        b.addEventListener('click', it.run);
        box.appendChild(b);
    });
    box.parentElement.style.display = items.length ? '' : 'none';
}

/** Header [data-collapse="idTarget"] → click comprime/espande la sezione, stato ricordato */
function _initCollapsibles() {
    document.querySelectorAll('[data-collapse]').forEach(function(h) {
        var target = document.getElementById(h.dataset.collapse);
        var key = 'collapsed:' + h.dataset.collapse;
        var apply = function(c) {
            target.classList.toggle('collapsed', c);
            h.classList.toggle('is-collapsed', c);
        };
        apply(_get(key) === '1');
        h.addEventListener('click', function(e) {
            if (e.target.closest('button')) return; // i bottoni + nell'header restano bottoni
            var c = !target.classList.contains('collapsed');
            apply(c);
            _set(key, c ? '1' : '0');
        });
    });
}
