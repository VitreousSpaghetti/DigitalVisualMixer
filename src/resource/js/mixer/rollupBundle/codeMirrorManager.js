import { basicSetup, EditorView } from "codemirror"
import { keymap, hoverTooltip } from "@codemirror/view"
import { indentWithTab, isolateHistory } from "@codemirror/commands"
import { javascript } from "@codemirror/lang-javascript"

// Callback iniettate dal mixer: il bundle non conosce code.js né lo stato dei canali
var _hoverInfo = null;   // word → testo firma | null (UX_GUIDA E5)
var _onChange = [];      // listener a ogni modifica del documento (E3 modifiche non salvate, menu contestuale)

// UX_GUIDA E5: passando sul nome di una funzione Hydra compare la firma, come negli IDE
const hydraHover = hoverTooltip(function (view, pos, side) {
  if (!_hoverInfo) return null;
  var line = view.state.doc.lineAt(pos), text = line.text;
  var s = pos - line.from, e = s;
  while (s > 0 && /\w/.test(text[s - 1])) s--;
  while (e < text.length && /\w/.test(text[e])) e++;
  if (s === e || (s === pos - line.from && side < 0) || (e === pos - line.from && side > 0)) return null;
  var info = _hoverInfo(text.slice(s, e));
  if (!info) return null;
  return {
    pos: line.from + s, end: line.from + e, above: true,
    create: function () {
      var dom = document.createElement("div");
      dom.className = "cm-hydra-hover";
      dom.textContent = info;
      return { dom: dom };
    }
  };
});

var modalEditor = "";
var view = new EditorView({
  doc: "console.log('hello')\n",
  extensions: [
    basicSetup,
    keymap.of([indentWithTab]),
    javascript(),
    hydraHover,
    EditorView.updateListener.of(function (u) { if (u.docChanged) _onChange.forEach(function (fn) { fn(); }); })
  ],
  parent: document.getElementById("codejs")
})

function reinit(value) {
  view.dispatch({
    changes: {
      from: 0,
      to: view.state.doc.length,
      insert: value
    }
  })
}
function getDoc() {
  return view.state.doc.toString();
}
function getDocModalMirror() {
  return modalEditor.state.doc.toString();
}
function modalMirror(code, updateListenerFunc) {
  let updateListenerExtension = EditorView.updateListener.of((update) => {
    if (update.docChanged) {
      updateListenerFunc();
    }
  });
  modalEditor = new EditorView({
    doc: code,
    extensions: [
      updateListenerExtension,
      basicSetup,
      keymap.of([indentWithTab]),
      javascript()
    ],
    parent: document.getElementById("ModalMirror")
  })
}

/**
 * Sostituisce from..to con text, cursore dopo il testo, focus all'editor.
 * isolateHistory: Ctrl+Z annulla l'inserimento in un solo passo, senza fonderlo
 * con quanto digitato subito prima (UX_GUIDA RF-C6).
 */
function insertAt(text, from, to) {
  view.dispatch({
    changes: { from: from, to: to, insert: text },
    selection: { anchor: from + text.length },
    annotations: isolateHistory.of("full"),
    scrollIntoView: true,
    userEvent: "input"
  });
  view.focus();
}

// Inserisce alla selezione corrente: resta nello state anche quando il focus è in una modale
// (sostituisce il vecchio tracciamento prevRange)
function insertText(text) {
  var sel = view.state.selection.main;
  insertAt(text, sel.from, sel.to);
}

/**
 * Punto di inserimento per un clic destro (UX_GUIDA RF-C3): dentro una selezione → la
 * selezione; altrove → il punto cliccato (il cursore si sposta lì); fuori dal testo
 * (gutter, righe vuote in fondo) → fine documento.
 * @returns {{from:number, to:number}}
 */
function contextTarget(x, y) {
  var pos = view.posAtCoords({ x: x, y: y });
  if (pos === null) pos = view.state.doc.length;
  var sel = view.state.selection.main;
  if (!sel.empty && pos >= sel.from && pos <= sel.to) return { from: sel.from, to: sel.to };
  view.dispatch({ selection: { anchor: pos } });
  return { from: pos, to: pos };
}

function getSelectionText() {
  var sel = view.state.selection.main;
  return view.state.sliceDoc(sel.from, sel.to);
}
function selectAll() {
  view.dispatch({ selection: { anchor: 0, head: view.state.doc.length } });
  view.focus();
}
// Coordinate a schermo del cursore: dove aprire il menu da tastiera (Shift+F10)
function cursorCoords() {
  return view.coordsAtPos(view.state.selection.main.head) || view.dom.getBoundingClientRect();
}
function focusEditor() { view.focus(); }
function editorDom() { return view.dom; }
function setHoverInfo(fn) { _hoverInfo = fn; }
function onDocChange(fn) { _onChange.push(fn); }

function initMirror() {
  window.insertText = insertText;
}

export {
  initMirror, reinit, getDoc, insertText, modalMirror, getDocModalMirror,
  insertAt, contextTarget, getSelectionText, selectAll, cursorCoords, focusEditor, editorDom,
  setHoverInfo, onDocChange
};
