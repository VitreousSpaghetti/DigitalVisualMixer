
import { insertText, modalMirror, getDocModalMirror } from "./rollupBundle/codeMirrorManager.js";
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
export function showMacro(){
  
  var html =
  `<div class="overflow-y-auto w-50-ns w-100 w-100-m h-100 db">
<div class="pa2">
  <div class="w-100 flex justify-center">
    <div class="pa4">
      <div> Ctrl + Enter = Preview Code
      </div>
    </div>
  </div> 
  <div class="w-100 flex justify-center">
    <div class="pa4">
      <div> Ctrl + Left = Run Previus Channel in Live
      </div>
    </div>
  </div> 
  <div class="w-100 flex justify-center">
    <div class="pa4">
      <div> Ctrl + Right = Run Next Channel in Live
      </div>
    </div>
  </div> 
  <div class="w-100 flex justify-center">
    <div class="pa4">
      <div> Ctrl + Up = Save Code
      </div>
    </div>
  </div> 
  <div class="w-100 flex justify-center">
    <div class="pa4">
      <div>  Ctrl +  Down = Run channel in Live
      </div>
    </div>
  </div> 
</div>
</div>
`;
  new ModalPanel(html, "Deck Macro", "Close", null, "Ok");  
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
        <div class="editor" id="ModalMirror">`+description+`
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
      { "id": "modulateScale", "title": "modulateScale", "code": elementHydra.modulateScale.example[0].code },
      { "id": "initScreen", "title": "initScreen", "code": elementHydra.initScreen.example[0].code }
    ]
},{
  "id": "Synth", "title":"Synth", "data":
    [
      { "id": "render", "title": "render", "code": elementHydra.render.example[0].code },
      { "id": "update", "title": "update", "code": elementHydra.update.example[0].code },
      { "id": "hush", "title": "hush", "code": elementHydra.hush.example[0].code },
      { "id": "setFunction", "title": "init", "code": elementHydra.setFunction.example[0].code },
      { "id": "speed", "title": "modulateScale", "code": elementHydra.speed.example[0].code },
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

functionJson.forEach(element => {
  element.data.forEach(element2 => {
if(elementHydra[element2.id] && elementHydra[element2.id].description){
  element2.description=elementHydra[element2.id].description;
}
  });
});
console.log(elementHydra["resetAudioAndSpeed"]);

function initFunction() {
  var html = ``;
  document.getElementById("functionManager").innerHTML = "";
  functionJson.forEach(element => {
    if (element) {

      // TODO-5.1: aggiunto role="menuitem" e tabindex="0" per accessibilità tastiera
      html += `<li>
        <a class="dropdown-item" href="#" role="menuitem" tabindex="0">
        `+element.title+` &raquo;
        </a>
        <ul class="dropdown-menu dropdown-submenu">`;
      element.data.forEach(element => {
        if (element) {
          html += `
            <li>
              <a class="dropdown-item" role="menuitem" tabindex="0" onclick="sourcefunction('`+element.id+`')">`+element.title+`</a>
            </li>`;
        }
      });

      html += ` </ul> </li>`;
    }
  });
  document.getElementById("functionManager").innerHTML += html
  window.sourcefunction = sourcefunction;
}
export { initFunction }