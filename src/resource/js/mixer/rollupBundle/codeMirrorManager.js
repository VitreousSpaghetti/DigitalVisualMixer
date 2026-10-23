import { basicSetup, EditorView } from "codemirror"
import { keymap } from "@codemirror/view"
import { showTooltip } from "@codemirror/view"
import { StateField } from "@codemirror/state"
import { indentWithTab } from "@codemirror/commands"
import { javascript } from "@codemirror/lang-javascript"
var prevRange = 0;

const cursorTooltipField = StateField.define({
  create: getCursorTooltips,

  update(tooltips, tr) {
    if (!tr.docChanged && !tr.selection) return tooltips
    return getCursorTooltips(tr.state)
  },

  provide: f => showTooltip.computeN([f], state => state.field(f))
});

function getCursorTooltips(state) {
  return state.selection.ranges
    .map(range => {
      prevRange = range;
    })
}

function cursorTooltip() {
  return [cursorTooltipField]
}

var modalEditor = "";
var view = new EditorView({
  doc: "console.log('hello')\n",
  extensions: [
    basicSetup,
    keymap.of([indentWithTab]),
    cursorTooltip(),
    javascript()
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

function insertText(text) {
  if( prevRange.from==prevRange.to)
  view.dispatch({
    changes: {
      from: prevRange.from,
      to: prevRange.to,
      insert: text
    },
    selection: { anchor: prevRange.from + 1 }
  })
  else{
    var match = getDoc();
    var taxt2=  match.substring(0, prevRange.from) +text+match.substring( prevRange.to) ;
    view.dispatch({
      changes: {
        from: 0,
        to: match.length,
        insert: taxt2
      },
      selection: { anchor: 0 + 1 }
    })
  }

}

function initMirror() {
  window.insertText = insertText;
}

export { initMirror, reinit, getDoc, insertText, modalMirror, getDocModalMirror };