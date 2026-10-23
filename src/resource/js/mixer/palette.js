/**
 * palette.js — Command palette Ctrl+K (UX_GUIDA E4)
 *
 * Un campo di ricerca su tutte le azioni: utile in live, nessun menu da aprire.
 * Le voci si ricalcolano a ogni apertura (canali, preset, variabili cambiano nel tempo).
 * Overlay leggero invece di una modale Bootstrap: si apre/chiude istantaneamente.
 */

import { channelMixer, runChannel, selectChannelClick } from './mixerManager.js';
import { getPresetList, applyPresetById } from './presetManager.js';
import { hydraCategories } from './menuFunctionManager.js';
import { insertText } from './rollupBundle/codeMirrorManager.js';
import { openGuide } from './guideManager.js';
import { togglePerform } from './performManager.js';
import { icon, sc, hideTip } from './uiHelp.js';

var _el = null, _list = [], _shown = [], _idx = 0;

function _act(a) { return function() { window.selectActionExec(a); }; }

function _items() {
    var items = [
        { label: 'Preview', icon: 'play', hint: sc('prev'), run: _act('prev') },
        { label: 'Save', icon: 'floppy-disk', hint: sc('save'), run: _act('save') },
        { label: 'Save and Run', icon: 'tower-broadcast', run: _act('saverun') },
        { label: 'Send to live', icon: 'tower-broadcast', hint: sc('run'), run: _act('run') },
        { label: 'Next channel live', icon: 'arrow-right', hint: sc('nextLive'), run: _act('nextRunLive') },
        { label: 'Previous channel live', icon: 'arrow-left', hint: sc('prevLive'), run: _act('prevRunLive') },
        { label: 'Toggle Autosave', icon: 'rotate', run: function() { window.autosave(); } },
        { label: 'Open Live window', icon: 'up-right-from-square', run: function() { window.openLiveWindow(); } },
        { label: 'Perform / Edit view', icon: 'circle-play', hint: sc('perform'), run: function() { togglePerform(); } },
        { label: 'Mappings manager', icon: 'sliders', run: _act('openMacroManager') },
        { label: 'New channel', icon: 'plus', run: _act('addChannel') },
        { label: 'Save preset', icon: 'bookmark', run: _act('addPreset') },
        { label: 'Guide', icon: 'circle-question', hint: sc('guide'), run: function() { openGuide(); } }
    ];
    channelMixer.forEach(function(c) {
        var n = c.name || String(c.id);
        items.push({ label: 'Edit channel: ' + n, icon: 'pen', run: function() { selectChannelClick(c.id); } });
        items.push({ label: 'Go live: ' + n, icon: 'tower-broadcast', run: function() { runChannel(c.id); } });
    });
    getPresetList().forEach(function(p) {
        items.push({ label: 'Apply preset: ' + (p.name || p.id), icon: 'bookmark', run: function() { applyPresetById(p.id); } });
    });
    hydraCategories().forEach(function(cat) {
        cat.data.forEach(function(fn) {
            items.push({ label: 'Insert ' + cat.title + ': ' + fn.title, icon: cat.icon, hint: fn.snippet, run: function() { insertText(fn.snippet); } });
        });
    });
    return items;
}

export function initPalette() {
    window.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); _el ? closePalette() : openPalette(); }
    }, true);
}

export function openPalette() {
    hideTip();
    _list = _items();
    _el = document.createElement('div');
    _el.className = 'cmd-palette';
    _el.innerHTML = '<div class="cmd-box" role="dialog" aria-label="Command palette">' +
        '<div class="cmd-input-row">' + icon('magnifying-glass') +
        '<input type="text" class="cmd-input" placeholder="Type an action, channel, preset or function…" aria-label="Search actions" ' +
        'role="combobox" aria-expanded="true" aria-controls="cmdList"></div>' +
        '<ul class="cmd-list" id="cmdList" role="listbox"></ul></div>';
    document.body.appendChild(_el);
    var input = _el.querySelector('.cmd-input');
    input.addEventListener('input', function() { _idx = 0; _render(this.value); });
    input.addEventListener('keydown', function(e) {
        if (e.key === 'ArrowDown') { _idx = Math.min(_idx + 1, _shown.length - 1); _render(input.value); }
        else if (e.key === 'ArrowUp') { _idx = Math.max(_idx - 1, 0); _render(input.value); }
        else if (e.key === 'Enter') _run(_shown[_idx]);
        else if (e.key === 'Escape') closePalette();
        else return;
        e.preventDefault();
        e.stopPropagation(); // Ctrl+frecce, F2 e mappature tastiera non devono scattare
    });
    _el.addEventListener('mousedown', function(e) { if (e.target === _el) closePalette(); });
    _el.querySelector('.cmd-list').addEventListener('click', function(e) {
        var li = e.target.closest('li');
        if (li) _run(_shown[+li.dataset.i]);
    });
    _idx = 0;
    _render('');
    input.focus();
}

export function closePalette() {
    if (_el) _el.remove();
    _el = null;
}

function _run(it) {
    if (!it) return;
    closePalette();
    it.run();
}

// Tutte le parole digitate devono comparire nell'etichetta (ordine libero); max 50 righe
function _render(q) {
    var words = q.toLowerCase().split(/\s+/).filter(Boolean);
    _shown = _list.filter(function(it) {
        var t = it.label.toLowerCase();
        return words.every(function(w) { return t.includes(w); });
    }).slice(0, 50);
    var ul = _el.querySelector('.cmd-list');
    ul.innerHTML = '';
    _shown.forEach(function(it, i) {
        var li = document.createElement('li');
        li.dataset.i = i;
        li.setAttribute('role', 'option');
        li.className = i === _idx ? 'active' : '';
        li.setAttribute('aria-selected', i === _idx);
        li.innerHTML = '<span class="ctx-ico">' + icon(it.icon) + '</span><span class="ctx-label"></span><span class="ctx-hint"></span>';
        li.querySelector('.ctx-label').textContent = it.label;
        li.querySelector('.ctx-hint').textContent = it.hint || '';
        ul.appendChild(li);
    });
    if (!_shown.length) ul.innerHTML = '<li class="mm-empty">No match</li>';
    var act = ul.querySelector('.active');
    if (act) act.scrollIntoView({ block: 'nearest' });
}
