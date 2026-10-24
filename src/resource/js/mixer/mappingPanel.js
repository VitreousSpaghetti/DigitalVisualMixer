/**
 * mappingPanel.js — Macro Manager "Mappature" (PERFORM RF9)
 *
 * Una sola tabella Sorgente | Destinazione | Modalità | Range | Valore live al posto dei
 * tab Variabili/Azioni, con un editor unico sopra la tabella. Learn = "muovi il controllo"
 * (mappingManager.startLearn). Il tab Preset resta separato perché un preset non è una mappatura.
 *
 * La modal resta aperta dopo salva/elimina: le risposte del server passano da mixerEmitter.js
 * che chiama refreshMappingPanel(). I valori live si aggiornano da soli via [data-var-val].
 */

import { emit } from './mixerEmitter.js';
import { getMacroList, getVarDef, MODES } from './macroVarManager.js';
import { getPresetList, presetRowHtml, onPresetClick } from './presetManager.js';
import { channelMixer } from './mixerManager.js';
import { startLearn, cancelLearn } from './mappingManager.js';
import { parseJSON, isPress, sourceLabel, sourceFamily, sourceId, sourceIcon } from './sourceUtil.js';
import { showToast } from './toastManager.js';
import { icon } from './uiHelp.js';

var _modal = null;
var _filter = 'all';
var _ed = null; // riga in modifica: { id: number|null, type: 'variable'|'action', src, srcDec }

var ACTION_TYPES = [
    { value: 'run',          label: 'Send to live',                      param: null },
    { value: 'prev',         label: 'Local preview',                     param: null },
    { value: 'save',         label: 'Save',                              param: null },
    { value: 'saverun',      label: 'Save and Run',                      param: null },
    { value: 'nextRunLive',  label: 'Next channel live',                 param: null },
    { value: 'prevRunLive',  label: 'Previous channel live',             param: null },
    { value: 'setChannel',   label: 'Edit channel',                      param: 'channelId' },
    { value: 'applyPreset',  label: 'Apply preset',                      param: 'presetId' },
    { value: 'rangeChannel', label: 'Note range → channels (live)',      param: null }
];

// Etichetta della sorgente con l'icona della famiglia (UX_GUIDA RF-A3)
function _srcHtml(src) {
    return (src ? icon(sourceIcon(src)) + ' ' : '') + _esc(sourceLabel(src));
}

function $(id) { return document.getElementById(id); }

function _esc(str) {
    return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Apre il Macro Manager.
 * @param {object} [opts] - { type: 'variable'|'action', src? }: apre subito l'editor di una
 *   nuova mappatura (bottoni + della sidebar, click sul monitor su una sorgente non mappata)
 */
export function openMappingPanel(opts) {
    if (_modal) _modal.remove();
    document.body.insertAdjacentHTML('beforeend',
        '<div class="modal fade mm" id="macroManagerModal" tabindex="-1">' +
        '<div class="modal-dialog modal-xl"><div class="modal-content">' +
        '<div class="modal-header"><h5 class="modal-title">' + icon('sliders') + ' Mappings</h5>' +
            '<button type="button" class="help-btn ms-2" data-help="concepts-mappings" data-tip="Help: Mappings" aria-label="Help: Mappings">' + icon('circle-question') + '</button>' +
            '<button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button></div>' +
        '<div class="modal-body">' +
            '<div class="mm-tabs">' +
                '<button data-tab="map" class="mm-tab active">' + icon('sliders') + ' Mappings <span id="mmCountMap"></span></button>' +
                '<button data-tab="pre" class="mm-tab">' + icon('bookmark') + ' Presets <span id="mmCountPre"></span></button>' +
            '</div>' +
            '<div id="mmTabMap">' +
                '<div class="mm-toolbar">' +
                    '<button id="mmLearnNew" class="mm-btn mm-primary" data-tip="Click, then move a knob, a stick, a note or a key: it becomes a new variable">' + icon('wand-magic-sparkles') + ' Learn → new variable</button>' +
                    '<button id="mmAddVar" class="mm-btn mm-add" data-tip="New macro variable, without a source yet">' + icon('plus') + ' Variable</button>' +
                    '<button id="mmAddAct" class="mm-btn mm-add" data-tip="New action: a sequence of steps (go live, next channel, apply preset…) fired by a source">' + icon('plus') + ' Action</button>' +
                    '<select id="mmFilter" class="mm-input ms-auto" data-tip="Filter by source type">' +
                        '<option value="all">All</option><option value="midi">MIDI</option>' +
                        '<option value="gamepad">Gamepad</option><option value="key">Keyboard</option>' +
                        '<option value="none">No source</option></select>' +
                '</div>' +
                '<div id="mmEditor" class="mm-editor" style="display:none"></div>' +
                '<table class="mm-table"><thead><tr><th>Source</th><th>Destination</th><th>Mode</th>' +
                    '<th>Range</th><th>Live value</th><th></th></tr></thead><tbody id="mmBody"></tbody></table>' +
            '</div>' +
            '<div id="mmTabPre" style="display:none">' +
                '<div class="mm-toolbar"><button id="mmPreAdd" class="mm-btn mm-add" data-tip="Save the current state (channel, variables, transition) as a preset">' + icon('plus') + ' Save preset</button></div>' +
                '<table class="mm-table"><thead><tr><th>Name</th><th>Channel</th><th>Transition</th><th></th></tr></thead>' +
                '<tbody id="mmPreBody"></tbody></table>' +
            '</div>' +
        '</div></div></div></div>');

    _modal = $('macroManagerModal');
    _modal.addEventListener('click', _onClick);
    _modal.addEventListener('change', function(e) {
        if (e.target.id === 'mmFilter') { _filter = e.target.value; _renderTable(); }
        if (e.target.id === 'mmType') _openEditor(null, e.target.value, _ed && _ed.src);
        if (e.target.id === 'mmMode') _syncFields();
        if (e.target.classList.contains('mm-step-type')) _stepParam(e.target.closest('.mm-step'), null);
    });
    _modal.addEventListener('hidden.bs.modal', function() {
        cancelLearn();
        _modal.remove();
        _modal = null;
        _ed = null;
    });
    $('mmFilter').value = _filter;
    new bootstrap.Modal(_modal).show();
    _renderTable();
    if (opts && opts.type) _openEditor(null, opts.type, opts.src || null);
}

/** Ri-renderizza tabelle e contatori se la modal è aperta (lista macro/preset cambiata) */
export function refreshMappingPanel() {
    if (!_modal) return;
    _renderTable();
    // PRESET E1: preset creato/eliminato da un'altra finestra con l'editor aperto → le select
    // "Apply preset" si ricostruiscono tenendo la scelta (che diventa "#id (missing)" se sparita)
    _modal.querySelectorAll('#mmSteps .mm-step').forEach(function(div) {
        if (div.querySelector('.mm-step-type').value !== 'applyPreset') return;
        var sel = div.querySelector('.mm-step-param select'), v = sel ? parseInt(sel.value) : NaN;
        _stepParam(div, isNaN(v) ? null : { type: 'applyPreset', presetId: v });
    });
}

function _onClick(e) {
    var t = e.target.closest('button') || e.target, id = parseInt(t.dataset.id); // click su <span> dentro un bottone
    if (t.dataset.tab) {
        _modal.querySelectorAll('.mm-tab').forEach(function(b) { b.classList.toggle('active', b === t); });
        $('mmTabMap').style.display = t.dataset.tab === 'map' ? '' : 'none';
        $('mmTabPre').style.display = t.dataset.tab === 'pre' ? '' : 'none';
    }
    if (t.id === 'mmLearnNew') {
        _learnButton(t, function(src) { _openEditor(null, 'variable', src); $('mmKey').focus(); });
    }
    if (t.id === 'mmAddVar') _openEditor(null, 'variable', null);
    if (t.id === 'mmAddAct') _openEditor(null, 'action', null);
    if (t.classList.contains('mm-edit')) {
        var m = getMacroList().find(function(x) { return x.id === id; });
        if (m) _openEditor(m, m.type, null);
    }
    if (t.classList.contains('mm-del')) {
        var md = getMacroList().find(function(x) { return x.id === id; });
        if (md && confirm('Delete the mapping "' + (md.name || id) + '"?')) emit('delete_macro', id);
    }
    if (t.id === 'mmLearn')       _learnButton(t, function(src) { _ed.src = src; _proposeMode(); _syncFields(); });
    if (t.id === 'mmLearnDec')    _learnButton(t, function(src) { _ed.srcDec = src; _syncFields(); });
    if (t.id === 'mmSrcClear')    { _ed.src = null; _syncFields(); }
    if (t.id === 'mmSrcDecClear') { _ed.srcDec = null; _syncFields(); }
    if (t.id === 'mmAddStep')     _addStep(null);
    if (t.classList.contains('mm-step-del')) t.closest('.mm-step').remove();
    if (t.id === 'mmSave')        _save();
    if (t.id === 'mmCancel')      _closeEditor();

    if (t.id === 'mmPreAdd' && window.selectActionExec) window.selectActionExec('addPreset');
    // Azioni preset: stesso handler della sidebar (PRESET RF4)
    onPresetClick(e);
}

/** Bottone Learn: in ascolto finché non arriva una sorgente (o Esc) */
function _learnButton(btn, onSrc) {
    var html = btn.innerHTML;
    btn.innerHTML = icon('circle', 'learn-dot') + ' Move a control… (Esc cancels)';
    startLearn(function(src) {
        btn.innerHTML = html;
        if (src) onSrc(src);
    });
}

// Riepilogo HTML degli step. Il preset si mostra per nome (legato all'id, segue i rename);
// se è stato eliminato lo step resta, marcato "missing" (PRESET RF2)
function _summary(actions) {
    var presets = getPresetList();
    return (actions || []).map(function(a) {
        var t = ACTION_TYPES.find(function(x) { return x.value === a.type; });
        var label = _esc(t ? t.label : a.type);
        if (a.channelId !== undefined) label += ' ' + _esc(a.channelId);
        if (a.type === 'applyPreset') {
            var pr = presets.find(function(x) { return x.id === a.presetId; });
            label += pr ? ' "' + _esc(pr.name || '#' + pr.id) + '"'
                : ' <span class="mm-missing" data-tip="The preset used by this action was deleted: edit the action to choose another one">#' +
                  _esc(a.presetId ?? '?') + ' — missing</span>';
        }
        return label;
    }).join(' → ');
}

function _renderTable() {
    var list = getMacroList(), counts = {};
    list.forEach(function(m) {
        var sid = sourceId(parseJSON(m.trigger, null));
        if (sid) counts[sid] = (counts[sid] || 0) + 1;
    });
    var rows = list.filter(function(m) {
        return _filter === 'all' || sourceFamily(parseJSON(m.trigger, null)) === _filter;
    }).map(function(m) {
        var src = parseJSON(m.trigger, null), p = parseJSON(m.params, {});
        // Conflitto non bloccante: stessa sorgente su più righe (RF9, edge case variabile+azione)
        var conflict = src && counts[sourceId(src)] > 1;
        var attrs = ' data-macro-id="' + m.id + '"', cells;
        if (m.type === 'variable') {
            var key = p.key || m.name || String(m.id), d = getVarDef(key) || {};
            attrs += ' data-var-row="' + _esc(key) + '"';
            cells = '<td>' + _srcHtml(src) + (d.mode === 'inc' && d.srcDec ? '  /  − ' + _srcHtml(d.srcDec) : '') + '</td>' +
                '<td class="mm-key">{{' + _esc(key) + '}}</td>' +
                '<td>' + _esc(MODES[d.mode] || '') + '</td>' +
                '<td>' + _esc(d.min + ' – ' + d.max) + '</td>' +
                '<td><span class="var-val" data-var-val="' + _esc(key) + '">' + _esc(+(+window.M[key]).toFixed(3)) + '</span> ' +
                    '<span class="var-ctrl" data-var-ctrl="' + _esc(key) + '"></span></td>';
        } else {
            cells = '<td>' + _srcHtml(src) + '</td>' +
                '<td>' + _esc(m.name || '') + ': ' + _summary(p.actions) + '</td>' +
                '<td>Action</td><td></td><td></td>';
        }
        return '<tr' + attrs + (conflict ? ' class="mm-conflict" data-tip="The same source is used by more than one row"' : '') + '>' +
            cells +
            '<td class="mm-actions"><button class="mm-btn mm-edit" data-id="' + m.id + '" data-tip="Edit" aria-label="Edit">' + icon('pen') + '</button>' +
            '<button class="mm-btn mm-del" data-id="' + m.id + '" data-tip="Delete" aria-label="Delete">' + icon('trash') + '</button></td></tr>';
    });
    $('mmBody').innerHTML = rows.join('') ||
        '<tr><td colspan="6" class="mm-empty">No mappings: press "Learn → new variable" and move a control</td></tr>';
    $('mmCountMap').textContent = '(' + list.length + ')';

    var presets = getPresetList();
    $('mmCountPre').textContent = '(' + presets.length + ')';
    $('mmPreBody').innerHTML = presets.map(function(pr) { return presetRowHtml(pr, true); }).join('') ||
        '<tr><td colspan="4" class="mm-empty">No presets yet: press Save preset to save the current channel, variables and transition</td></tr>';
}

function _num(label, id, cls, title) {
    return '<label class="' + (cls || '') + '"' + (title ? ' data-tip="' + title + '"' : '') + '>' + label +
        ' <input id="' + id + '" type="number" step="any" class="mm-input mm-num"></label>';
}

/**
 * Editor di una mappatura (nuova se m è null).
 * @param {object|null} m     - macro dal DB
 * @param {string} type       - 'variable' | 'action'
 * @param {object|null} src   - sorgente iniziale per una nuova mappatura
 */
function _openEditor(m, type, src) {
    var p = m ? parseJSON(m.params, {}) : {};
    var isVar = type === 'variable';
    _ed = { id: m ? m.id : null, type: type, src: m ? parseJSON(m.trigger, null) : (src || null), srcDec: p.srcDec || null, sortOrder: m ? m.sortOrder : 0 };

    var html = '<div class="mm-ed-title">' + (m ? 'Edit ' : 'New ') + (isVar ? 'variable' : 'action') + '</div>' +
        '<div class="mm-row">' +
            (m ? '' : '<label>Type <select id="mmType" class="mm-input"><option value="variable">Variable</option><option value="action">Action</option></select></label>') +
            '<label>Source</label><span id="mmSrc" class="mm-src"></span>' +
            '<button id="mmLearn" class="mm-btn" data-tip="Click, then move the control to use as source">' + icon('wand-magic-sparkles') + ' Learn</button>' +
            '<button id="mmSrcClear" class="mm-btn" data-tip="Remove the source" aria-label="Remove the source">' + icon('xmark') + '</button>' +
            '<label class="mm-f-note" data-tip="Several notes → one mapping (e.g. an octave as a launchpad)">up to note ' +
                '<input id="mmNoteTo" type="number" min="0" max="127" class="mm-input mm-num"></label>' +
        '</div>';
    if (isVar) {
        html += '<div class="mm-row">' +
                '<label>Key {{<input id="mmKey" class="mm-input" placeholder="freq">}}</label>' +
                '<label>Mode <select id="mmMode" class="mm-input">' +
                    Object.keys(MODES).map(function(k) { return '<option value="' + k + '">' + MODES[k] + '</option>'; }).join('') +
                '</select></label>' +
                '<label><input type="checkbox" id="mmInvert"> Invert</label>' +
            '</div><div class="mm-row">' +
                _num('Min', 'mmMin') + _num('Max', 'mmMax') +
                _num('Rest', 'mmValue', '', 'Initial and rest value (gate released, end of impulse)') +
                _num('ON / peak', 'mmOn', 'mm-f-on') +
                _num('Step', 'mmStep', '', 'Step of the slider and of Increment (empty = 1% of the range)') +
                _num('Glide ms', 'mmGlide', '', 'Smoothing (empty = 40 for Absolute/Increment, 0 for the others)') +
                _num('Decay ms', 'mmDecay', 'mm-f-imp') +
                '<label class="mm-f-imp">Curve <select id="mmCurve" class="mm-input"><option value="lin">Linear</option><option value="exp">Exponential</option></select></label>' +
                _num('Deadzone', 'mmDz', 'mm-f-axis', 'Stick dead zone (0..1)') +
            '</div>' +
            '<div class="mm-row mm-f-inc">' +
                '<label>Source − (optional, e.g. a button that decreases)</label><span id="mmSrcDec" class="mm-src"></span>' +
                '<button id="mmLearnDec" class="mm-btn" data-tip="Click, then move the control that decreases">' + icon('wand-magic-sparkles') + ' Learn −</button>' +
                '<button id="mmSrcDecClear" class="mm-btn" data-tip="Remove the − source" aria-label="Remove the − source">' + icon('xmark') + '</button>' +
            '</div>' +
            '<div class="mm-hint mm-f-inccc">Knob with end stops: at the end it no longer increments, turn it back and turn again. Sticks and +/− buttons have no such limit.</div>';
    } else {
        html += '<div class="mm-row"><label>Name <input id="mmName" class="mm-input" placeholder="e.g. Intro"></label></div>' +
            '<div id="mmSteps"></div>' +
            '<div class="mm-row"><button id="mmAddStep" class="mm-btn mm-add" data-tip="Add a step to the sequence">' + icon('plus') + ' Step</button></div>';
    }
    html += '<div class="mm-row"><button id="mmSave" class="mm-btn mm-primary">' + icon('check') + ' Save</button>' +
        '<button id="mmCancel" class="mm-btn">Cancel</button></div>';

    var ed = $('mmEditor');
    ed.innerHTML = html;
    ed.style.display = '';
    if (!m) $('mmType').value = type;
    $('mmNoteTo').value = _ed.src && _ed.src.nTo !== undefined ? _ed.src.nTo : '';

    if (isVar) {
        // Campi "auto" lasciati vuoti: il default dipende dalla modalità (vedi macroVarManager._def)
        var val = function(id, v) { $(id).value = v === undefined || v === null ? '' : v; };
        $('mmKey').value = p.key || (m ? m.name : '');
        val('mmMin', p.min ?? 0); val('mmMax', p.max ?? 1); val('mmValue', p.value ?? p.min ?? 0);
        val('mmOn', p.on); val('mmStep', p.step); val('mmGlide', p.glide); val('mmDecay', p.decay ?? 300);
        val('mmDz', p.deadzone ?? 0.1);
        $('mmCurve').value = p.curve === 'exp' ? 'exp' : 'lin';
        $('mmInvert').checked = !!p.invert;
        $('mmMode').value = MODES[p.mode] ? p.mode : (isPress(_ed.src) ? 'gate' : 'abs');
        if (!m) _proposeMode();
    } else {
        $('mmName').value = m ? m.name || '' : '';
        var actions = p.actions && p.actions.length ? p.actions : [null];
        actions.forEach(_addStep);
    }
    _syncFields();
    ed.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/** Proposta del Learn (RF9): sorgente continua → Assoluta, a pressione → Gate. Solo per righe nuove */
function _proposeMode() {
    if (_ed.id === null && _ed.src && $('mmMode')) $('mmMode').value = isPress(_ed.src) ? 'gate' : 'abs';
}

/** Mostra solo i campi che hanno senso per modalità e sorgente correnti */
function _syncFields() {
    var mode = $('mmMode') ? $('mmMode').value : null, t = _ed.src && _ed.src.type;
    var show = function(sel, on) { _modal.querySelectorAll(sel).forEach(function(el) { el.style.display = on ? '' : 'none'; }); };
    show('.mm-f-on', mode === 'gate' || mode === 'toggle' || mode === 'impulse');
    show('.mm-f-imp', mode === 'impulse');
    show('.mm-f-axis', t === 'axis');
    show('.mm-f-inc', mode === 'inc');
    show('.mm-f-inccc', mode === 'inc' && t === 'cc');
    show('.mm-f-note', t === 'note');
    $('mmSrc').innerHTML = _srcHtml(_ed.src);
    if ($('mmSrcDec')) $('mmSrcDec').innerHTML = _srcHtml(_ed.srcDec);
}

function _closeEditor() {
    cancelLearn();
    _ed = null;
    $('mmEditor').style.display = 'none';
    $('mmEditor').innerHTML = '';
}

function _addStep(action) {
    var div = document.createElement('div');
    div.className = 'mm-step mm-row';
    div.innerHTML = '<select class="mm-step-type mm-input">' +
        ACTION_TYPES.map(function(t) { return '<option value="' + t.value + '">' + t.label + '</option>'; }).join('') +
        '</select><span class="mm-step-param"></span>' +
        '<button type="button" class="mm-btn mm-step-del" data-tip="Remove step" aria-label="Remove step">' + icon('trash') + '</button>';
    $('mmSteps').appendChild(div);
    if (action) div.querySelector('.mm-step-type').value = action.type;
    _stepParam(div, action);
}

/** Select canale/preset per gli step che ne hanno bisogno */
function _stepParam(div, action) {
    var t = ACTION_TYPES.find(function(x) { return x.value === div.querySelector('.mm-step-type').value; });
    var wrap = div.querySelector('.mm-step-param');
    wrap.innerHTML = '';
    if (!t || !t.param) return;
    var cur = action ? action[t.param] : undefined, items;
    if (t.param === 'channelId') {
        items = channelMixer.map(function(c) { return { id: c.id, label: (c.name || c.id) + ' [' + c.id + ']' }; });
    } else {
        items = getPresetList().map(function(pr) { return { id: pr.id, label: pr.name || 'Preset #' + pr.id }; });
        // RF9: preset eliminato → resta selezionato come "missing" invece di passare in silenzio a un altro
        if (cur != null && !items.some(function(i) { return i.id === cur; })) items.unshift({ id: cur, label: '#' + cur + ' (missing)' });
        // RF8: nessun preset → niente select vuota che salverebbe presetId: NaN
        if (!items.length) {
            wrap.innerHTML = '<select class="mm-input" disabled><option value="">No presets: save one first</option></select>';
            return;
        }
    }
    wrap.innerHTML = '<select class="mm-input">' + items.map(function(i) {
        return '<option value="' + i.id + '">' + _esc(i.label) + '</option>';
    }).join('') + '</select>';
    if (cur !== undefined) wrap.querySelector('select').value = cur;
}

function _readSteps() {
    return Array.from(document.querySelectorAll('#mmSteps .mm-step')).map(function(div) {
        var a = { type: div.querySelector('.mm-step-type').value };
        var t = ACTION_TYPES.find(function(x) { return x.value === a.type; });
        var sel = div.querySelector('.mm-step-param select');
        if (t && t.param && sel) a[t.param] = parseInt(sel.value);
        return a;
    });
}

function _n(id, def) {
    var v = parseFloat($(id).value);
    return isNaN(v) ? def : v;
}

function _save() {
    var src = _ed.src ? Object.assign({}, _ed.src) : null;
    if (src && src.type === 'note') {
        var to = parseInt($('mmNoteTo').value);
        if (to > src.n) src.nTo = to; else delete src.nTo;
    }
    var payload;
    if (_ed.type === 'variable') {
        var key = $('mmKey').value.trim();
        // {{key}} riconosce solo \w+: altri caratteri non verrebbero mai sostituiti
        if (!/^\w+$/.test(key)) { showToast('Key: letters, numbers and _ only', 'error'); return; }
        var dup = getMacroList().some(function(m) {
            return m.type === 'variable' && m.id !== _ed.id && (parseJSON(m.params, {}).key || m.name) === key;
        });
        if (dup) { showToast('{{' + key + '}} already exists', 'error'); return; }
        var params = {
            key: key, min: _n('mmMin', 0), max: _n('mmMax', 1), value: _n('mmValue', 0),
            on: _n('mmOn'), step: _n('mmStep'), mode: $('mmMode').value, glide: _n('mmGlide'),
            decay: _n('mmDecay'), curve: $('mmCurve').value, invert: $('mmInvert').checked, deadzone: _n('mmDz')
        };
        if (params.mode === 'inc' && _ed.srcDec) params.srcDec = _ed.srcDec;
        payload = { name: key, type: 'variable', params: JSON.stringify(params) }; // undefined = default automatico
    } else {
        var name = $('mmName').value.trim();
        if (!name) { showToast('Name is required', 'error'); return; }
        // RF8: uno step "Apply preset" senza preset scelto non si salva; messaggio accanto allo step
        var noPreset = Array.from(document.querySelectorAll('#mmSteps .mm-step')).filter(function(div) {
            var sel = div.querySelector('.mm-step-param select');
            return div.querySelector('.mm-step-type').value === 'applyPreset' && !(sel && sel.value);
        });
        if (noPreset.length) {
            noPreset.forEach(function(div) {
                var wrap = div.querySelector('.mm-step-param');
                if (!wrap.querySelector('.mm-step-err')) wrap.insertAdjacentHTML('beforeend', '<span class="mm-step-err">Save a preset first, or remove this step</span>');
            });
            return;
        }
        var actions = _readSteps();
        if (actions.some(function(a) { return a.type === 'rangeChannel'; }) && !(src && src.type === 'note' && src.nTo > src.n)) {
            showToast('Note range → channels needs a note with "up to note"', 'error');
            return;
        }
        payload = { name: name, type: 'action', params: JSON.stringify({ actions: actions }) };
    }
    payload.trigger = src ? JSON.stringify(src) : null;
    payload.sortOrder = _ed.sortOrder ?? 0;
    if (_ed.id === null) emit('create_macro', payload);
    else emit('save_macro', Object.assign({ id: _ed.id }, payload));
    _closeEditor();
}
