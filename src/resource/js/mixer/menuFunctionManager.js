
import { insertText, modalMirror, getDocModalMirror, setHoverInfo } from "./rollupBundle/codeMirrorManager.js";
import { icon } from "./uiHelp.js";
import { elementHydraJson } from "./code.js"
import { prev } from "./mixerManager.js";
import { ModalPanel } from "./modalManager.js";

function hydraPrew(code) {

  const myPromise = new Promise((resolve, reject) => {
    var ifrm = document.getElementById('myIframe');
    ifrm = ifrm.contentWindow || ifrm.contentDocument.document || ifrm.contentDocument;

    ifrm.document.open();
    ifrm.document.write('<canvas width="300" height="200" class="bg-black" id="HydraModal"></canvas>');
    ifrm.document.close();


    var hydraLibrary = ifrm.document.createElement('script');
    hydraLibrary.setAttribute("src", "/dist/hydra-synth.js");
    ifrm.document.getElementsByTagName('head')[0].appendChild(hydraLibrary);
    setTimeout(() => {
      resolve("foo");
    }, 200);
  });

  const myPromise2 = new Promise((resolve, reject) => {
    myPromise.then(() => {
      var ifrm = document.getElementById('myIframe');
      ifrm = ifrm.contentWindow || ifrm.contentDocument.document || ifrm.contentDocument;

      if (ifrm.document.getElementById('chalfunction')) {
        ifrm.document.getElementById('chalfunction').remove();
      }
      setTimeout(() => {
        resolve("foo");
      }, 200);
    });
  });

  myPromise2.then(() => {
    var ifrm = document.getElementById('myIframe');
    ifrm = ifrm.contentWindow || ifrm.contentDocument.document || ifrm.contentDocument;

    var s = ifrm.document.createElement('script');
    s.setAttribute("id", "chalfunction");
    s.textContent = 'var hydraModal = new Hydra({ detectAudio: false , canvas: document.getElementById("HydraModal"), }).synth    ; hydraModal.setResolution(300, 200);' +
      " hydraModal." + code;//inne
    ifrm.document.body.appendChild(s);
  })



}
function getCodeModal() {
  prev();
  return getDocModalMirror();
}
function sourcefunction(id) {
  var value = findInJsonById(id); 
  var description= "";
  if(value.description)
    description= value.description;
  var html =
    `<div class="overflow-y-auto w-50-ns w-100 w-100-m h-100 db">
  <div class="pa2">
    <div class="w-100 flex justify-center">
      <div class="pa4">
        <div>
        <iframe width="320" height="220" id="myIframe">
        </iframe>
        </div>
      </div>
    </div>
    <div class="w-100">
      <div class="w-100">
        <div class="fn-signature">`+_esc(description)+`
        </div>
      </div>
    </div>
    <div class="w-100">
      <div class="w-100">
        <div class="editor" id="ModalMirror">
        </div>
      </div>
    </div>
  </div>
</div>
`;
  new ModalPanel(html, value.title, "Close", function () { return insertText(getCodeModal()) }, "Insert code");
  hydraPrew(value.code);
  modalMirror(value.code, function () { return hydraPrew(getCodeModal()) });
}
function findInJsonById(id) {
  var returnState;
  functionJson.forEach(element => {
    if (element) {
      element.data.forEach(element => {
        if (element.id == id) {
           returnState = element;
        }
      });
    }
  });
  return returnState;
}

var elementHydra = elementHydraJson();
var functionJson = [{
  "id": "source", "title":"Source", "data":
    [
      { "id": "noise", "title": "Noise", "code":  elementHydra.noise.example[0].code, description: elementHydra.noise.description },
      { "id": "voronoi", "title": "Voronoi", "code":  elementHydra.voronoi.example[0].code, description: elementHydra.voronoi.description },
      { "id": "osc", "title": "Osc", "code":  elementHydra.osc.example[0].code },
      { "id": "shape", "title": "Shape", "code":  elementHydra.shape.example[0].code },
      { "id": "gradient", "title": "Gradient", "code":  elementHydra.gradient.example[0].code },
      { "id": "src", "title": "Src", "code":  elementHydra.src.example[0].code },
      { "id": "solid", "title": "Solid", "code":  elementHydra.solid.example[0].code }
    ]
},{
  "id": "geometry", "title":"Geometry", "data":
    [
      { "id": "rotate", "title": "Rotate", "code": elementHydra.rotate.example[0].code },
      { "id": "scale", "title": "Scale", "code": elementHydra.scale.example[0].code },
      { "id": "pixelate", "title": "Pixelate", "code": elementHydra.pixelate.example[0].code },
      { "id": "repeat", "title": "Repeat", "code": elementHydra.repeat.example[0].code },
      { "id": "repeatX", "title": "RepeatX", "code": elementHydra.repeatX.example[0].code },
      { "id": "repeatY", "title": "RepeatY", "code": elementHydra.repeatY.example[0].code },
      { "id": "kaleid", "title": "Kaleid", "code": elementHydra.kaleid.example[0].code },
      { "id": "scroll", "title": "Scroll", "code": elementHydra.scroll.example[0].code },
      { "id": "scrollX", "title": "ScrollX", "code": elementHydra.scrollX.example[0].code },
      { "id": "scrollY", "title": "ScrollY", "code": elementHydra.scrollY.example[0].code }
    ]
},{
  "id": "Color", "title":"Color", "data":
    [
      { "id": "Posterize", "title": "Posterize", "code":  elementHydra.posterize.example[0].code },
      { "id": "Shift", "title": "Shift", "code":  elementHydra.shift.example[0].code },
      { "id": "Invert", "title": "Invert", "code":  elementHydra.invert.example[0].code },
      { "id": "Contrast", "title": "Contrast", "code":  elementHydra.contrast.example[0].code },
      { "id": "Brightness", "title": "Brightness", "code":  elementHydra.brightness.example[0].code },
      { "id": "Luma", "title": "Luma", "code":  elementHydra.luma.example[0].code },
      { "id": "Thresh", "title": "Thresh", "code":  elementHydra.thresh.example[0].code },
      { "id": "Color", "title": "Color", "code":  elementHydra.color.example[0].code },
      { "id": "Saturate", "title": "Saturate", "code":  elementHydra.saturate.example[0].code },
      { "id": "Hue", "title": "Hue", "code":  elementHydra.hue.example[0].code},
      { "id": "Colorama", "title": "Colorama", "code":  elementHydra.colorama.example[0].code }
    ]
},{
  "id": "Blend", "title":"Blend", "data":
    [
      { "id": "Add", "title": "Add", "code": elementHydra.add.example[0].code },
      { "id": "Sub", "title": "sub", "code": elementHydra.sub.example[0].code },
      { "id": "Layer", "title": "Layer", "code": elementHydra.layer.example[0].code },
      { "id": "Blend", "title": "Blend", "code": elementHydra.blend.example[0].code },
      { "id": "Mult", "title": "Mult", "code": elementHydra.mult.example[0].code },
      { "id": "Diff", "title": "Diff", "code": elementHydra.diff.example[0].code },
      { "id": "Mask", "title": "Mask", "code": elementHydra.mask.example[0].code }
    ]
},{
  "id": "Modulate", "title":"Modulate", "data":
    [ 
      { "id": "modulateRepeat", "title": "modulateRepeat", "code": elementHydra.modulateRepeat.example[0].code },
      { "id": "modulateKaleid", "title": "modulateKaleid", "code": elementHydra.modulateKaleid.example[0].code },
      { "id": "modulateScrollX", "title": "modulateScrollX", "code": elementHydra.modulateScrollX.example[0].code },
      { "id": "modulate", "title": "modulate", "code": elementHydra.modulate.example[0].code },
      { "id": "modulateScale", "title": "modulateScale", "code": elementHydra.modulateScale.example[0].code },
      { "id": "modulateHue", "title": "modulateHue", "code": elementHydra.modulateHue.example[0].code }
    ]
},{
  "id": "External", "title":"External", "data":
    [
      { "id": "initCam", "title": "initCam", "code": elementHydra.initCam.example[0].code },
      { "id": "initImage", "title": "initImage", "code": elementHydra.initImage.example[0].code },
      { "id": "initVideo", "title": "initVideo", "code": elementHydra.initVideo.example[0].code },
      { "id": "init", "title": "init", "code": elementHydra.init.example[0].code },
      { "id": "initScreen", "title": "initScreen", "code": elementHydra.initScreen.example[0].code }
    ]
},{
  "id": "Synth", "title":"Synth", "data":
    [
      { "id": "render", "title": "render", "code": elementHydra.render.example[0].code },
      { "id": "update", "title": "update", "code": elementHydra.update.example[0].code },
      { "id": "hush", "title": "hush", "code": elementHydra.hush.example[0].code },
      { "id": "setFunction", "title": "setFunction", "code": elementHydra.setFunction.example[0].code },
      { "id": "speed", "title": "speed", "code": elementHydra.speed.example[0].code },
      { "id": "bpm", "title": "bpm", "code": elementHydra.bpm.example[0].code },
      { "id": "width", "title": "width", "code": elementHydra.width.example[0].code },
      { "id": "height", "title": "height", "code": elementHydra.height.example[0].code },
      { "id": "time", "title": "time", "code": elementHydra.time.example[0].code },
      { "id": "mouse", "title": "mouse", "code": elementHydra.mouse.example[0].code }
    ]
},{
  "id": "Array", "title":"Array", "data":
    [
      { "id": "fast", "title": "fast", "code": elementHydra.fast.example[0].code },
      { "id": "smooth", "title": "smooth", "code": elementHydra.smooth.example[0].code },
      { "id": "ease", "title": "ease", "code": elementHydra.ease.example[0].code },
      { "id": "offset", "title": "offset", "code": elementHydra.offset.example[0].code },
      { "id": "fit", "title": "fit", "code": elementHydra.fit.example[0].code }
    ]
}/**/,{
  "id": "Audio", "title":"Audio", "data":
    [
      { "id": "fft", "title": "fft", "code": elementHydra.fft.example[0].code },
      { "id": "setSmooth", "title": "setSmooth", "code": elementHydra.setSmooth.example[0].code },
      { "id": "setCutoff", "title": "setCutoff", "code": elementHydra.setCutoff.example[0].code },
      { "id": "setBins", "title": "setBins", "code": elementHydra.setBins.example[0].code },
      { "id": "setScale", "title": "setScale", "code": elementHydra.setScale.example[0].code }
    ]
}

]; 

// UX_GUIDA: icona per categoria (RF-A1) e forma dello snippet inserito dal menu contestuale (RF-C5):
// source → `noise(10, 0.1)`, chain → `.rotate(10, 0)` col punto davanti, global → snippet esplicito
var CATEGORY = {
  source:   { icon: 'wave-square', kind: 'source' },
  geometry: { icon: 'shapes',      kind: 'chain' },
  Color:    { icon: 'palette',     kind: 'chain' },
  Blend:    { icon: 'layer-group', kind: 'chain' },
  Modulate: { icon: 'water',       kind: 'chain' },
  External: { icon: 'camera',      kind: 'global' },
  Synth:    { icon: 'gear',        kind: 'global' },
  Array:    { icon: 'list-ol',     kind: 'global' },
  Audio:    { icon: 'volume-high', kind: 'global' }
};
// Funzioni globali: la firma in code.js non basta (metodi di s0/a, variabili, metodi degli array)
var GLOBAL_SNIPPET = {
  initCam: 's0.initCam(0)', initImage: 's0.initImage("url")', initVideo: 's0.initVideo("url")',
  init: 's0.init({ src: canvas })', initScreen: 's0.initScreen()',
  render: 'render(o0)', update: 'update = () => {}', hush: 'hush()',
  setFunction: "setFunction({ name: 'fx', type: 'color', inputs: [], glsl: 'return _c0;' })",
  speed: 'speed = 1', bpm: 'bpm = 30', width: 'width', height: 'height', time: 'time', mouse: 'mouse.x',
  fast: '.fast(1)', smooth: '.smooth(1)', ease: ".ease('linear')", offset: '.offset(0.5)', fit: '.fit(0, 1)',
  fft: 'a.fft[0]', setSmooth: 'a.setSmooth(0.4)', setCutoff: 'a.setCutoff(2)', setBins: 'a.setBins(4)', setScale: 'a.setScale(10)'
};

/**
 * Firma in coda alla description di code.js, es. "Kaleidoscope… kaleid( nSides = 4 )" →
 * { name, params: [{name, def}] }. null se la description non ha una firma.
 */
function parseSignature(description) {
  var m = (description || '').trim().match(/(\w+)\(([^()]*)\)$/);
  if (!m) return null;
  return {
    text: m[0],
    name: m[1],
    params: m[2].split(',').map(function (p) { return p.trim(); }).filter(Boolean).map(function (p) {
      var kv = p.split('=');
      return { name: kv[0].trim(), def: kv[1] !== undefined ? kv[1].trim() : undefined };
    })
  };
}

/** Chiamata con i default della firma: default mancante → 0, texture → o0 (AF RF-C5) */
function callFromSignature(sig) {
  return sig.name + '(' + sig.params.map(function (p) {
    return p.def !== undefined ? p.def : /^tex/.test(p.name) ? 'o0' : '0';
  }).join(', ') + ')';
}

// Arricchisce ogni voce con firma, snippet e categoria. La key in code.js è camelCase,
// alcune voci del menu hanno l'id con l'iniziale maiuscola ("Posterize")
functionJson.forEach(function (cat) {
  cat.icon = CATEGORY[cat.id].icon;
  cat.data.forEach(function (fn) {
    fn.key = fn.id.charAt(0).toLowerCase() + fn.id.slice(1);
    var h = elementHydra[fn.key] || {};
    fn.description = h.description || '';
    var sig = parseSignature(fn.description);
    fn.signature = sig ? sig.text : (fn.description.match(/^\w+ = .+$/) ? fn.description : '');
    var kind = CATEGORY[cat.id].kind;
    fn.snippet = kind === 'global' || !sig ? (GLOBAL_SNIPPET[fn.key] || fn.key)
      : (kind === 'chain' ? '.' : '') + callFromSignature(sig);
  });
});

/** Categorie con le funzioni arricchite: menu contestuale, Guida, command palette */
export function hydraCategories() {
  return functionJson;
}

// Firme di tutte le funzioni documentate in code.js (anche quelle non nel menu): hover E5
var _signatures = {};
Object.keys(elementHydra).forEach(function (k) {
  var sig = parseSignature(elementHydra[k].description);
  if (sig) _signatures[k] = sig.text;
});
export function hydraSignature(word) {
  return _signatures[word] || null;
}

function _esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function initFunction() {
  var html = ``;
  document.getElementById("functionManager").innerHTML = "";
  functionJson.forEach(element => {
    if (element) {

      // TODO-5.1: aggiunto role="menuitem" e tabindex="0" per accessibilità tastiera
      html += `<li>
        <a class="dropdown-item" href="#" role="menuitem" tabindex="0">
        ` + icon(element.icon, 'fa-fw') + ' ' + element.title + ` &raquo;
        </a>
        <ul class="dropdown-menu dropdown-submenu">`;
      element.data.forEach(element => {
        if (element) {
          // RF-B2: tooltip con la firma (parametri e default) di code.js
          html += `
            <li>
              <a class="dropdown-item" role="menuitem" tabindex="0" onclick="sourcefunction('`+element.id+`')"
                data-tip="` + _esc('Preview and insert — ' + (element.signature || element.snippet)) + `">`+element.title+`</a>
            </li>`;
        }
      });

      html += ` </ul> </li>`;
    }
  });
  document.getElementById("functionManager").innerHTML += html
  window.sourcefunction = sourcefunction;
  setHoverInfo(hydraSignature);
}
export { initFunction, sourcefunction }
