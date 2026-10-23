
var elementHydra = {
   resetAudioAndSpeed : {
      description: "reset audio, speed and bpm",
   },
  noise: {
     description: "noise( scale = 10, offset = 0.1 )",
     example: [
        {
           code: "noise(10, 0.1).out(o0)",
           comments: {
              en: "default",
              es: "default",
              ja: "デフォルト",
           }
        },
        {
           code: "noise( ()=> Math.sin(time/10)*50 , ()=> Math.sin(time/2)/500 ).out(o0)",
           comments: {
              en: "noise interpolating between different scales and offsets",
              es: "ruido (noise);cambiando entre varias escalas y offsets",
              ja: "noise の異なるスケールやオフセットを補間",
           }
        }
     ]
  },
  voronoi: {
     description: "voronoi( scale = 5, speed = 0.3, blending = 0.3 )",
     example: [
        {
           code: "voronoi(5,0.3,0.3).out(o0)",
           comments: {
              en: "default",
              es: "default",
              ja: "デフォルト",
           }
        },
        {
           code: "voronoi(25,2,10).color(1,1,0).brightness(0.15).out(o0)",
           comments: {
              en: "fireflies",
              es: "luciérnagas",
              ja: "蛍",
           }
        }
     ]
  },
  osc: { description:"osc( frequency = 60, sync = 0.1, offset )", example: [
        {
           code: "osc( [1,10,50,100,250,500].fast(2)).out(o0)",
           comments: {
              en: "frequency",
              es: "frecuencia",
              ja: "周波数",
           }
        },
        {
           code: "osc( ()=> Math.sin(time/10)* 100 ).out(o0)",
           comments: {
              en: "frequency 2",
              es: "frecuencia 2",
              ja: "周波数 2",
           }
        },
        {
           code: "osc( 10, [-10,-1,-0.1,0,0.1,1,10], 0 ).out(o0)",
           comments: {
              en: "sync",
              es: "sincronización",
              ja: "シンク（同期）",
           }
        },
        {
           code: "osc(10,0.1, ({time})=> Math.sin(time/10)* 100 ).out(o0)",
           comments: {
              en: "offset",
              es: "offset",
              ja: "オフセット",
           }
        },
     ]
  },
  shape: { description:"shape( sides = 3, radius = 0.3, smoothing = 0.01 )", example: [
        {
           code: "shape(3,0.5,0.001).out(o0)",
           comments: {
              en: "triangle",
              es: "triángulo",
              ja: "三角形",
           }
        },
        {
           code: "shape(100,0.5,0.001).out(o0)",
           comments: {
              en: "ellipse",
              es: "elipse",
              ja: "楕円",
           }
        },
        {
           code: "shape(100,0.01,1).invert(()=>Math.sin(time)*2).out(o0)",
           comments: {
              en: "inverting blurry circle",
              es: "círculo difuminado que se invierte",
              ja: "反転するぼかした円",
           }
        },
        {
           code: "shape(5,0.5,0.1).repeat(19,19).mult(osc(10,1,2)).rotate( ({time})=> time%360 ).scrollX(1,-0.25).mult(shape(15,0.3,0.01).rotate( ({time})=> time%360 ).scrollX(1,-0.25)).out(o0)",
           comments: {
              en: "a... rainbow ball?",
              es: "una... ¿bola de arcoíris?",
              ja: "虹色のボール…？",
           }
        },
     ]
  },
  gradient: { description:"gradient( speed )", example: [
        {
           code: "gradient([1,2,4]).out(o0)",
           comments: {
              en: "gradient sequence at speeds of 1, 2 & 4",
              es: "secuencia de degradés con velocidades de 1, 2 y 4",
              ja: "グラデーションのスピードを 1, 2, 4 の順に変える",
           }
        },
        {
           code: "gradient(0).r().repeat(16,1).scrollX(0,0.1).out(o0)",
           comments: {
              en: "saw oscillator",
              es: "oscilador de cierra",
              ja: "のこぎり波",
           }
        },
     ]
  },
  src: {
     description: "src( tex )",
     example: [
        {
           code: "src(o0).modulate(noise(3),0.005).blend(shape(4),0.01).out(o0)",
           comments: {
              en: "feedback",
              es: "retroalimentación (feedback)",
              ja: "フィードバック",
           }
        },
     ]
  },
  solid: { description:"solid( r, g, b, a = 1 )", example: [
        {
           code: "solid([1,0,0],[0,1,0],[0,0,1],1).out(o0)",
           comments: {
              en: "cycling through red, green and blue",
              es: "cambiando entre rojo, verde y azul",
              ja: "赤、緑、青を行き来する",
           }
        },
     ]
  },
  rotate: {
     description: "rotate( angle = 10, speed )",
     example: [
        {
           code: "osc(50).rotate( ()=> time%360 ).out(o0)",
           comments: {
              en: "constant rotation",
              es: "rotación constante",
              ja: "一定速度で回転",
           }
        },
        {
           code: "osc(10,1,1).rotate( ()=> time%360, ()=> Math.sin(time*0.1)*0.05 ).out(o0)",
           comments: {
              en: "modulate rotation speed",
              es: "modulando la velocidad de rotación",
              ja: "回転速度を変化させる",
           }
        },
     ]
  },
  scale: {
     description: "Scale texture. scale( amount = 1.5, xMult = 1, yMult = 1, offsetX = 0.5, offsetY = 0.5 )",
     example: [
        {
           code: "shape().scale(1.5,1,1).out(o0)",
           comments: {
              en: "default",
              es: "default",
              ja: "デフォルト",
           }
        },
        {
           code: "shape().scale(1.5,[0.25,0.5,0.75,1].fast(0.25),[3,2,1]).invert([0,1].fast(0.25)).kaleid(5).kaleid(12).scale( ()=>Math.sin(time/5)*0.5 ).rotate(1,1).out(o0)",
           comments: {
              en: "flower",
              es: "flor",
              ja: "花",
           }
        },
     ],
  },
  pixelate: {
     description: "Pixelate texture with `pixelX` segments and `pixelY` segments. pixelate( pixelX = 20, pixelY = 20 )",
     example: [
        {
           code: "noise().pixelate(20,20).out(o0)",
           comments: {
              en: "default",
              es: "default",
              ja: "デフォルト",
           }
        },
        {
           code: "noise().pixelate(2000,1).out(o0)",
           comments: {
              en: "",
              es: "",
              ja: "",
           }
        },
        {
           code: "noise().mult(osc(10,0.25,1)).scrollY(1,0.25).pixelate([100,40,20,70].fast(0.25)).modulateRotate(src(o0).scale(0.5),0.125).diff(src(o0).rotate([-0.05,0.05].fast(0.125))).out(o0)",
           comments: {
              en: "",
              es: "",
              ja: "",
           }
        },
     ],
  },
  posterize: { description:"posterize( bins = 3, gamma = 0.6 )", example: [
        {
           code: "gradient(0).posterize( [1, 5, 15, 30] , 0.5 ).out(o0)",
           comments: {
              en: "static gradient posterized, varying bins",
              es: "gradiente estático, con una posterización cuya cantidad de tonos varía en el tiempo",
              ja: "",
           }
        },
        {
           code: "gradient(0).posterize( 3, [0.1, 0.5, 1.0, 2.0] ).out(o0)",
           comments: {
              en: "static gradient posterized, varying gamma",
              es: "gradiente estático, con una posterización cuyo gamma varía en el tiempo",
              ja: "",
           }
        },
        {
           code: "osc().posterize(3,1).layer(osc().pixelate(16,1).mask(shape(2,0.5,0.001).scrollY(-0.25))).out(o0)",
           comments: {
              en: "posterize (top); compare with pixelate (bottom)",
              es: "posteriación (arriba); comparar con la pixelización (abajo)",
              ja: "",
           }
        },
     ],
  },
  shift: { description:"shift( r = 0.5, g, b, a )", example: [
        {
           code: "osc().shift(0.1,0.9,0.3).out()",
           comments: {
              en: "default",
              es: "default",
              ja: "デフォルト",
           }
        },
     ]
  },
  repeat: { description:"repeat( repeatX = 3, repeatY = 3, offsetX, offsetY )", example: [
        {
           code: "shape().repeat(3.0, 3.0, 0.0, 0.0).out()",
           comments: {
              en: "default",
              es: "default",
              ja: "デフォルト",
           }
        },
        {
           code: "shape(1.25,0.5,0.25).repeat(3, 3).scale(2).repeat(5, 5, ()=> Math.sin(time), ()=> Math.sin(time/2)).out(o0)",
           comments: {
              en: "dogtooth factory",
              es: "pata de gallo",
              ja: "",
           }
        },
     ],
  },
  modulateRepeat: {
     description: "\nThe `texture` parameter can be any kind of [source](#sources), for\nexample a [`color`](#color), [`src`](#src), or [`shape`](#shape). modulateRepeat( texture, repeatX = 3, repeatY = 3, offsetX = 0.5, offsetY = 0.5 )",
     example: [
        {
           code: "shape(4,0.9).mult(osc(3,0.5,1)).modulateRepeat(osc(10), 3.0, 3.0, 0.5, 0.5).out(o0)",
           comments: {
              en: "default",
              es: "default",
              ja: "デフォルト",
           }
        },
     ],
  },
  repeatX: { description:"repeatX( reps = 3, offset )", example: [
        {
           code: "shape().repeatX(3.0, 0.0).out()",
           comments: {
              en: "default",
              es: "default",
              ja: "デフォルト",
           }
        },
        {
           code: "osc(5,0,1).rotate(1.57).repeatX([1,2,5,10], ({time})=> Math.sin(time)).out()",
           comments: {
              en: "",
              es: "",
              ja: "",
           }
        },
     ],
  },
  modulateRepeatX: {
     description: "\nThe `texture` parameter can be any kind of [source](#sources), for\nexample a [`color`](#color), [`src`](#src), or [`shape`](#shape) modulateRepeatX( texture, reps = 3, offset = 0.5 )",
     example: [
        {
           code: "shape(4,0.9).mult(osc(4,0.25,1)).modulateRepeatX(osc(10), 5.0, ({time})=> Math.sin(time)* 5).scale(1,0.5,0.05).out(o0)",
           comments: {
              en: "straight lines illusion",
              es: "ilusión de líneas rectas",
              ja: "",
           }
        },
     ],
  },
  repeatY: { description:"repeatY( reps = 3, offset )", example: [
        {
           code: "shape().repeatY(3.0, 0.0).out()",
           comments: {
              en: "default",
              es: "default",
              ja: "デフォルト",
           }
        },
        {
           code: "osc(5,0,1).repeatY([1,2,5,10], ({time})=> Math.sin(time)).out()",
           comments: {
              en: "",
              es: "",
              ja: "",
           }
        },
     ],
  },
  modulateRepeatY: {
     description: "\nThe `texture` parameter can be any kind of [source](#sources), for\nexample a [`color`](#color), [`src`](#src), or [`shape`](#shape). modulateRepeatY( texture, reps = 3, offset = 0.5 )",
     example: [
        {
           code: "shape(4,0.9).mult(osc(4,0.25,1)).modulateRepeatY(osc(10), 5.0, ({time})=> Math.sin(time)* 5).scale(1,0.5,0.05).out(o0)",
           comments: {
              en: "morphing grid",
              es: "cuadrícula cambiante",
              ja: "",
           }
        },
     ],
  },
  kaleid: {
     description: "Kaleidoscope effect with `nSides` repetition. kaleid( nSides = 4 )",
     example: [
        {
           code: "osc(25,-0.1,0.5).kaleid(50).out(o0)",
           comments: {
              en: "default",
              es: "default",
              ja: "デフォルト",
           }
        },
        {
           code: "osc(25,-0.1,0.5).kaleid(4).kaleid(4).out(o0)",
           comments: {
              en: "",
              es: "",
              ja: "",
           }
        },
     ],
  },
  modulateKaleid: {
     description: "\nThe `texture` parameter can be any kind of [source](#sources), for\nexample a [`color`](#color), [`src`](#src), or [`shape`](#shape).\nSee also: [`kaleid`](#kaleid). modulateKaleid( texture, nSides = 4 )",
     example: [
        {
           code: "osc(9,-0.1,0.1).modulateKaleid(osc(11,0.5,0),50).scale(0.1,0.3).modulate(noise(5,0.1)).mult(solid(1,1,0.3)).out(o0)",
           comments: {
              en: "default",
              es: "default",
              ja: "デフォルト",
           }
        },
        {
           code: "osc(10,0.1,2).modulateKaleid(osc(16).kaleid(999),1).out(o0)",
           comments: {
              en: "",
              es: "",
              ja: "",
           }
        },
     ],
  },
  scroll: { description:"scroll( scrollX = 0.5, scrollY = 0.5, speedX, speedY )", example: [
        {
           code: "shape(3).scroll(0.1,-0.3).out(o0)",
           comments: {
              en: "default",
              es: "default",
              ja: "デフォルト",
           }
        },
     ],
  },
  scrollX: { description:"scrollX( scrollX = 0.5, speed )", example: [
        {
           code: "osc(10,0,1).scrollX(0.5,0).out(o0)",
           comments: {
              en: "default",
              es: "default",
              ja: "デフォルト",
           }
        },
        {
           code: "osc(10,0,1).scrollX([0,0.25,0.5,0.75,1].fast(4),0).out(o0)",
           comments: {
              en: "x position",
              es: "posición x (horizontal)",
              ja: "",
           }
        },
        {
           code: "gradient(1).scrollX(0, ()=> Math.sin(time*0.05)*0.05 ).out(o0)",
           comments: {
              en: "scroll speed",
              es: "velocidad de desplazamiento (scroll)",
              ja: "",
           }
        },
        {
           code: "gradient(0.125).scrollX(0, ({time})=> Math.sin(time*0.05)*0.05 ).scrollY(0, ({time})=> Math.sin(time*0.01)*-0.07 ).pixelate([5,2,10],[15,8]).scale(0.15).modulate(noise(1,0.25)).out()",
           comments: {
              en: "",
              es: "",
              ja: "",
           }
        },
     ],
  },
  modulateScrollX: {
     description: "\nThe `texture` parameter can be any kind of [source](#sources), for\nexample a [`color`](#color), [`src`](#src), or [`shape`](#shape).\nSee also: [`scrollX`](#scrollX) modulateScrollX( texture, scrollX = 0.5, speed )",
     example: [
        {
           code: "voronoi(25,0,0).modulateScrollX(osc(10),0.5,0).out(o0)",
           comments: {
              en: "default",
              es: "default",
              ja: "デフォルト",
           }
        },
        {
           code: "voronoi(25,0,0).modulateScrollX(osc(10),0.5,0.25).out(o0)",
           comments: {
              en: "different scroll and speed",
              es: "distinto desplazamiento y velocidad",
              ja: "",
           }
        },
     ],
  },
  scrollY: { description:"scrollY( scrollY = 0.5, speed )", example: [
        {
           code: "osc(10,0,1).scrollY(0.5,0).out(o0)",
           comments: {
              en: "default",
              es: "default",
              ja: "デフォルト",
           }
        },
        {
           code: "osc(10,0,1).scrollY([0,0.25,0.5,0.75,1].fast(4),0).out(o0)",
           comments: {
              en: "y position",
              es: "posición y (vertical)",
              ja: "",
           }
        },
        {
           code: "gradient(1).scrollY(0, ({time})=> Math.sin(time*0.05)*0.05 ).out()",
           comments: {
              en: "scroll speed",
              es: "velocidad de desplazamiento (scroll)",
              ja: "",
           }
        },
        {
           code: "gradient(0.125).scrollX(0, ()=> Math.sin(time*0.05)*0.05 ).scrollY(0, ()=> Math.sin(time*0.01)*-0.07 ).pixelate([5,2,10],[15,8]).scale(0.15).modulate(noise(1,0.25)).out()",
           comments: {
              en: "",
              ja: "",
           }
        },
     ],
  },
  modulateScrollY: {
     description: "\nThe `texture` parameter can be any kind of [source](#sources), for\nexample a [`color`](#color), [`src`](#src), or [`shape`](#shape).\nSee also: [`scrollY`](#scrollY). modulateScrollY( texture, scrollY = 0.5, speed )",
     example: [
        {
           code: "voronoi(25,0,0).modulateScrollY(osc(10),0.5,0).out(o0)",
           comments: {
              en: "default",
              es: "default",
              ja: "デフォルト",
           }
        },
        {
           code: "voronoi(25,0,0).modulateScrollY(osc(10),0.5,0.25).out(o0)",
           comments: {
              en: "different scroll and speed",
              es: "distinto desplazamiento y velocidad",
              ja: "",
           }
        },
     ],
  },
  add: {
     description: "\nAdd textures.\nThe `texture` parameter can be any kind of [source](#sources), for\nexample a [`color`](#color), [`src`](#src), or [`shape`](#shape). add( texture, amount = 1 )",
     example: [
        {
           code: "shape().scale(0.5).add(shape(4),[0,0.25,0.5,0.75,1]).out(o0)",
           comments: {
              en: "default",
              es: "default",
              ja: "デフォルト",
           }
        },
        {
           code: "osc(9,0.1,1).add(osc(13,0.5,5)).out(o0)",
           comments: {
              en: "",
              es: "",
              ja: "",
           }
        },
     ],
  },
  sub: { description:"sub( texture, amount = 1 )", example: [
        {
           code: "osc().sub(osc(6)).out(o0)",
           comments: {
              en: "default",
              es: "default",
              ja: "デフォルト",
           }
        },
        {
           code: "osc(6,0,1.5).modulate(noise(3).sub(gradient()),1).out(o0)",
           comments: {
              en: "color remapping",
              es: "reasignación de colores",
              ja: "",
           }
        },
     ],
  },
  layer: {
     description: "Overlay texture based on alpha value.\nThe `texture` parameter can be any kind of [source](#sources), for\nexample a [`color`](#color), [`src`](#src), or [`shape`](#shape). layer( texture )",
     example: [
        {
           code: "solid(1,0,0,1).layer(shape(4).color(0,1,0,()=>Math.sin(time*2))).out(o0)",
           comments: {
              en: "default",
              es: "default",
              ja: "デフォルト",
           }
        },
        {
           code: "osc(30).layer(osc(15).rotate(1).luma()).out(o0)",
           comments: {
              en: "",
              es: "",
              ja: "",
           }
        },
     ],
  },
  blend: {
     description: "\nBlend textures.\nThe `texture` parameter can be any kind of [source](#sources), for\nexample a [`color`](#color), [`src`](#src), or [`shape`](#shape). blend( texture, amount = 0.5 )",
     example: [
        {
           code: "shape().scale(0.5).blend(shape(4),[0,0.25,0.5,0.75,1]).out(o0)",
           comments: {
              en: "default",
              es: "default",
              ja: "デフォルト",
           }
        },
        {
           code: "osc(9,0.1,1).blend(osc(13,0.5,5)).out()",
           comments: {
              en: "",
              es: "",
              ja: "",
           }
        },
        {
           code: "osc().thresh().blend(o0,0.9).out(o0)",
           comments: {
              en: "motion-blur like feedback",
              es: "feedback con apariencia difuminada",
              ja: "",
           }
        },
     ],
  },
  mult: {
     description: "\nMultiply images and blend with the texture by `amount`.\nThe `texture` parameter can be any kind of [source](#sources), for\nexample a [`color`](#color), [`src`](#src), or [`shape`](#shape). mult( texture, amount = 1 )",
     example: [
        {
           code: "osc(9,0.1,2).mult(osc(13,0.5,5)).out()",
           comments: {
              en: "default",
              es: "default",
              ja: "デフォルト",
           }
        },
        {
           code: "osc().layer(osc(30,0.1,2).mult(shape(4))).out(o0)",
           comments: {
              en: "mult is *not* transparent; compare with mask",
              es: "mult *no* es transparente; compárese con mask",
              ja: "",
           }
        },
     ],
  },
  diff: {
     description: "\nReturn difference of textures.\nThe `texture` parameter can be any kind of [source](#sources), for\nexample a [`color`](#color), [`src`](#src), or [`shape`](#shape). diff( texture )",
     example: [
        {
           code: "osc(9,0.1,1).diff(osc(13,0.5,5)).out(o0)",
           comments: {
              en: "default",
              es: "default",
              ja: "デフォルト",
           }
        },
        {
           code: "osc(1,1,2).diff(shape(6,1.1,0.01).scale(()=>Math.sin(time)*0.05 + 0.9).kaleid(15).rotate(()=>time%360)).out()",
           comments: {
              en: "",
              es: "",
              ja: "",
           }
        },
     ],
  },
  modulate: {
     description: "\nModulate texture.\nMore about modulation at: <https://lumen-app.com/guide/modulation/>\nThe `texture` parameter can be any kind of [source](#sources), for\nexample a [`color`](#color), [`src`](#src), or [`shape`](#shape). modulate( texture, amount = 0.1 )",
     example: [
        {
           code: "voronoi().color(0.9,0.25,0.15).rotate(({time})=>(time%360)/2).modulate(osc(25,0.1,0.5).kaleid(50).scale(({time})=>Math.sin(time*1)*0.5+1).modulate(noise(0.6,0.5)), 0.5).out(o0)",
           comments: {
              en: "chocolate whirlpool",
              es: "remolino de chocolate",
              ja: "",
           }
        },
        {
           code: "osc(3,0,2).modulate(noise().add(gradient(),-1),1).out(o0)",
           comments: {
              en: "color remapping",
              es: "reasignación de colores",
              ja: "",
           }
        },
     ],
  },
  modulateScale: {
     description: "\nThe `texture` parameter can be any kind of [source](#sources), for\nexample a [`color`](#color), [`src`](#src), or [`shape`](#shape).\nSee also: [`scale`](#scale). modulateScale( texture, multiple = 1, offset = 1 )",
     example: [
        {
           code: "gradient(5).repeat(50,50).kaleid([3,5,7,9].fast(0.5)).modulateScale(osc(4,-0.5,0).kaleid(50).scale(0.5),15,0).out(o0)",
           comments: {
              en: "cosmic radiation",
              es: "radiación cósmica",
              ja: "",
           }
        },
        {
           code: "shape(4).modulateScale(gradient().g(),2,0.5).out(o0)",
           comments: {
              en: "perspective",
              es: "perspectiva",
              ja: "",
           }
        },
     ],
  },
  modulatePixelate: {
     description: "\nThe `texture` parameter can be any kind of [source](#sources), for\nexample a [`color`](#color), [`src`](#src), or [`shape`](#shape).\nSee also: [`pixelate`](#pixelate). modulatePixelate( texture, multiple = 10, offset = 3 )",
     example: [
        {
           code: "voronoi(10,1,5).brightness(()=>Math.random()*0.15).modulatePixelate(noise(25,0.5),100).out(o0)",
           comments: {
              en: "what lies beneath",
              es: "lo que se encuentra por debajo",
              ja: "",
           }
        },
        {
           code: "noise(3).modulatePixelate(noise(3).pixelate(8,8),1024,8).out(o0)",
           comments: {
              en: "",
              es: "",
              ja: "",
           }
        },
     ],
  },
  modulateRotate: {
     description: "\nThe `texture` parameter can be any kind of [source](#sources), for\nexample a [`color`](#color), [`src`](#src), or [`shape`](#shape).\nSee also: [`rotate`](#rotate). modulateRotate( texture, multiple = 1, offset )",
     example: [
        {
           code: "voronoi(100,3,5).modulateRotate(osc(1,0.5,0).kaleid(50).scale(0.5),15,0).mult(osc(50,-0.1,8).kaleid(9)).out(o0)",
           comments: {
              en: "wormhole",
              es: "agujero de gusano",
              ja: "",
           }
        },
        {
           code: "osc().modulateRotate(shape(999,0.3,0.5),1.57).out(o0)",
           comments: {
              en: "",
              es: "",
              ja: "",
           }
        },
     ],
  },
  modulateHue: {
     description: "\nChanges coordinates based on hue of second input. Based on: https://www.shadertoy.com/view/XtcSWM\nThe `texture` parameter can be any kind of [source](#sources), for\nexample a [`color`](#color), [`src`](#src), or [`shape`](#shape). modulateHue( texture, amount = 1 )",
     example: [
        {
           code: "src(o0).modulateHue(src(o0).scale(1.01),1).layer(osc(4,0.5,2).mask(shape(4,0.5,0.001))).out(o0)",
           comments: {
              en: "",
              es: "",
              ja: "",
           }
        },
     ],
  },
  invert: {
     description: "Invert color. invert( amount = 1 )",
     example: [
        {
           code: "solid(1,1,1).invert([0,1]).out(o0)",
           comments: {
              en: "default",
              es: "default",
              ja: "デフォルト",
           }
        },
        {
           code: "osc(4,0.1,2).invert().luma().invert().layer(osc(4,0.1,2).luma().mask(shape(2,0.5).scrollY(-0.25))).out(o0)",
           comments: {
              en: "",
              es: "",
              ja: "",
           }
        },
     ],
  },
  contrast: {
     description: "Larger amount value makes higher contrast. contrast( amount = 1.6 )",
     example: [
        {
           code: "osc(20).contrast( ()=> Math.sin(time)* 5 ).out(o0)",
           comments: {
              en: "20Hz oscillator with contrast interpolating between 0.0-5.0",
              es: "oscilador a 20Hz con un contraste que cambia entre 0.0-5.0",
              ja: "",
           }
        },
     ],
  },
  brightness: { description:"brightness( amount = 0.4 )", example: [
        {
           code: "osc(20,0,2).brightness( ()=> Math.sin(time)).out(o0)",
           comments: {
              en: "default",
              es: "default",
              ja: "デフォルト",
           }
        },
        {
           code: "noise().brightness(1).color(0.5,0.5,0.5).out(o0)",
           comments: {
              en: "scaling noise value to 0-1",
              es: "escalando el valor de noise a un rango de 0-1",
              ja: "",
           }
        },
     ],
  },
  mask: { description:"mask( texture )", example: [
        {
           code: "gradient(5).mask(voronoi(),3,0.5).invert([0,1]).out(o0)",
           comments: {
              en: "default",
              es: "default",
              ja: "デフォルト",
           }
        },
        {
           code: "osc().layer(osc(30,0.1,2).mask(shape(4))).out(o0)",
           comments: {
              en: "mask is transparent; compare with mult",
              es: "mask es transparente; compárese con mult",
              ja: "",
           }
        },
        {
           code: "osc(10,-0.25,1).color(0,0,1).saturate(2).kaleid(50).mask(noise(25,2).modulateScale(noise(0.25,0.05))).modulateScale(osc(6,-0.5,2).kaleid(50)).mult(osc(3,-0.25,2).kaleid(50)).scale(0.5,0.5,0.75).out(o0)",
           comments: {
              en: "algae pulse",
              es: "pulso de algas",
              ja: "",
           }
        },
     ],
  },
  luma: { description:"luma( threshold = 0.5, tolerance = 0.1 )", example: [
        {
           code: "osc(10,0,1).luma(0.5,0.1).out(o0)",
           comments: {
              en: "default",
              es: "default",
              ja: "デフォルト",
           }
        },
        {
           code: "osc(10,0,[0,0.5,1,2]).luma([0.1,0.25,0.75,1].fast(0.25),0.1).out(o0)",
           comments: {
              en: "",
              es: "",
              ja: "",
           }
        },
        {
           code: "osc(30).layer(osc(15).rotate(1).luma()).out(o0)",
           comments: {
              en: "luma is transparent; compare with thresh",
              es: "luma es transparente; compárese con thresh",
              ja: "",
           }
        },
     ],
  },
  thresh: { description:"thresh( threshold = 0.5, tolerance = 0.04 )", example: [
        {
           code: "noise(3,0.1).thresh(0.5,0.04).out(o0)",
           comments: {
              en: "default",
              es: "default",
              ja: "デフォルト",
           }
        },
        {
           code: "noise(3,0.1).thresh( ()=>Math.sin(time/2), [0.04,0.25,0.75,1].fast(0.25)).out(o0)",
           comments: {
              en: "",
              es: "",
              ja: "",
           }
        },
        {
           code: "osc(30).layer(osc(15).rotate(1).thresh()).out(o0)",
           comments: {
              en: "thresh is *not* transparent; compare with luma",
              es: "thresh *no* es transparente; compárese con luma",
              ja: "",
           }
        },
     ],
  },
  color: { description:"color( r = 1, g = 1, b = 1, a = 1 )", example: [
        {
           code: "osc().color(1,0,3).out(o0)",
           comments: {
              en: "default",
              es: "default",
              ja: "デフォルト",
           }
        },
     ],
  },
  saturate: { description:"saturate( amount = 2 )", example: [
        {
           code: "osc(10,0,1).saturate( ()=> Math.sin(time)* 10 ).out(o0)",
           comments: {
              en: "default",
              es: "default",
              ja: "デフォルト",
           }
        },
     ],
  },
  hue: { description:"hue( hue = 0.4 )", example: [
        {
           code: "osc(30,0.1,1).hue(()=> Math.sin(time)).out(o0)",
           comments: {
              en: "default",
              es: "default",
              ja: "デフォルト",
           }
        },
     ],
  },
  colorama: {
     description: "Shift HSV values. colorama( amount = 0.005 )",
     example: [
        {
           code: "osc(20).color([1,0,0,1,0],[0,1,0,1,0],[0,0,1,1,0]).colorama([0.005,0.33,0.66,1.0].fast(0.125)).out(o0)",
           comments: {
              en: "// 20Hz oscillator source ",
              es: "// oscilador de 20Hz ",
              ja: "デフォルト",
           }
        },
        {
           code: "osc(30,0.1,1).colorama(-0.1).out(o0)",
           comments: {
              en: "negative value is less harsh",
              es: "los valores negativos son más suaves",
              ja: "",
           }
        },
     ],
  },
  r: { description:"", example: [
        {
           code: "osc(60,0.1,1.5).layer(gradient().r()).out(o0)",
           comments: {
              en: "default",
              es: "default",
              ja: "デフォルト",
           }
        },
     ],
  },
  g: { description:"", example: [
        {
           code: "osc(60,0.1,1.5).layer(gradient().g()).out(o0)",
           comments: {
              en: "default",
              es: "default",
              ja: "デフォルト",
           }
        },
     ],
  },
  b: { description:"", example: [
        {
           code: "osc(60,0.1,1.5).layer(gradient().colorama(1).b()).out(o0)",
           comments: {
              en: "default",
              es: "default",
              ja: "デフォルト",
           }
        },
     ],
  },
  initCam: { description:"initCam( index )", example: [
        {
           code: "s0.initCam(); src(s0).invert().out(o0)",
           comments: {
              en: "default",
              es: "default",
              ja: "デフォルト",
           }
        },
     ],
  },
  initImage: { description:"initImage( url )", example: [
        {
           code: "s0.initImage(\"https://upload.wikimedia.org/wikipedia/commons/2/25/Hydra-Foto.jpg\");osc(6).modulate(src(s0),1).out(o0)",
           comments: {
              en: "default",
              es: "default",
              ja: "デフォルト",
           }
        },
     ],
  },
  initVideo: { description:"initVideo( url )", example: [
        {
           code: "s0.initVideo(\"https://media.giphy.com/media/AS9LIFttYzkc0/giphy.mp4\");src(s0).modulate(noise(3)).out(o0)",
           comments: {
              en: "default",
              es: "default",
              ja: "デフォルト",
           }
        },
     ],
  },
  init: { description:"init( options )", example: [
        {
           code: "canvas = document.createElement(\"canvas\");canvas.width = 200  canvas.height = 200  ctx = canvas.getContext(\"2d\");ctx.fillStyle = \"crimson\" ctx.fillRect(100,50,100,100);s0.init({src:canvas});src(s0).modulate(osc().kaleid(999)).out(o0)",
           comments: {
              en: "load canvas",
              es: "cargar canvas",
              ja: "canvas をロード",
           }
        },
     ],
  },
  initScreen: { description:"initScreen(  )", example: [
        {
           code: "s0.initScreen();src(s0).colorama(0.5).out(o0)",
           comments: {
              en: "select a window",
              es: "selecciona una ventana",
              ja: "画面を選択",
           }
        },
     ],
  },
  render: { description:"render( texture = all )", example: [
        {
           code: "osc(30,0.1,1.5).out(o0);noise().out(o1);solid(1).out(o2);gradient().out(o3);render()",
           comments: {
              en: "default",
              es: "default",
              ja: "デフォルト",
           }
        },
        {
           code: "voronoi().out(o1);render(o1)",
           comments: {
              en: "specify display buffer",
              es: "especifica salida a renderizar",
              ja: "",
           }
        },
     ],
  },
  update: { description:"update(  )", example: [
        {
           code: "b = 0 update = ()=> b += 0.01 * Math.sin(time);shape().scrollX(()=>b).out(o0)",
           comments: {
              en: "update is called every frame",
              es: "update es llamada cada fotograma",
              ja: "",
           }
        },
     ],
  },
  setResolution: { description:"setResolution( width, height )", example: [
        {
           code: "setResolution(100,100);osc().out(o0)",
           comments: {
              en: "make the canvas small (100 pixel x 100 pixel)",
              es: "hace al canvas muy pequeño (100 pixeles x 100 pixeles)",
              ja: "",
           }
        },
     ],
  },
  hush: { description:"", example: [
        {
           code: "osc().out(o0);hush()",
           comments: {
              en: "clear the buffers",
              es: "limpia los buffers",
              ja: "",
           }
        },
     ],
  },
  setFunction: { description:"setFunction( options )", example: [
        {
           code: "setFunction({ name: 'chroma', type: 'color', inputs: [ ], glsl: \"  float maxrb = max( _c0.r, _c0.b );  float k = clamp( (_c0.g-maxrb)*5.0, 0.0, 1.0 ); float dg = _c0.g; _c0.g = min( _c0.g, maxrb*0.8 ); _c0 += vec4(dg - _c0.g); return vec4(_c0.rgb, 1.0 - k); \`});osc(60,0.1,1.5).chroma().out(o0)",
           comments: {
              en: "from https://www.shadertoy.com/view/XsfGzn",
              es: "sacado de https://www.shadertoy.com/view/XsfGzn",
              ja: "",
           }
        },
     ],
  },
  speed: { description:"speed = 1", example: [
        {
           code: "speed = 3 osc(60,0.1,[0,1.5]).out(o0)",
           comments: {
              en: "change overall speed",
              es: "cambia la velocidad global",
              ja: "",
           }
        },
        {
           code: "speed = 0.1 osc(60,0.1,[0,1.5]).out(o0)",
           comments: {
              en: "change overall speed",
              es: "cambia la velocidad global",
              ja: "",
           }
        },
     ],
  },
  bpm: { description:"bpm = 30", example: [
        {
           code: "bpm = 60 osc(60,0.1,[0,1.5]).out(o0)",
           comments: {
              en: "change array speed",
              es: "cambia la velocidad de los arrays",
              ja: "",
           }
        },
        {
           code: "bpm = 15 osc(60,0.1,[0,1.5]).out(o0)",
           comments: {
              en: "change array speed",
              es: "cambia la velocidad de los arrays",
              ja: "",
           }
        },
     ],
  },
  width: { description:"", example: [
        {
           code: "shape(99).scrollX(()=> -mouse.x / width).out(o0)",
           comments: {
              en: "",
              es: "",
              ja: "",
           }
        },
     ],
  },
  height: { description:"", example: [
        {
           code: "shape(99).scrollY(()=> -mouse.y / height).out(o0)",
           comments: {
              en: "",
              es: "",
              ja: "",
           }
        },
     ],
  },
  time: { description:"", example: [
        {
           code: "shape(2,0.8).kaleid(()=>6+Math.sin(time)*4).out(o0)",
           comments: {
              en: "default",
              es: "default",
              ja: "デフォルト",
           }
        },
     ],
  },
  mouse: { description:"", example: [
        {
           code: "shape(99).scroll(  ()=> -mouse.x / width, ()=> -mouse.y / height).out(o0)",
           comments: {
              en: "",
              es: "",
              ja: "",
           }
        },
     ],
  },
  fast: { description:"", example: [
        {
           code: "osc([10,30,60].fast(2),0.1,1.5).out(o0)",
           comments: {
              en: "default",
              es: "default",
              ja: "デフォルト",
           }
        },
        {
           code: "osc([10,30,60].fast(0.5),0.1,1.5).out(o0)",
           comments: {
              en: "argument less than 1 makes transition slower",
              es: "un argumento menor a 1 hace a las transiciones más lentas",
              ja: "",
           }
        },
     ],
  },
  smooth: { description:"", example: [
        {
           code: "shape(999).scrollX([-0.2,0.2].smooth()).out(o0)",
           comments: {
              en: "default",
              es: "default",
              ja: "デフォルト",
           }
        },
     ],
  },
  ease: { description:"", example: [
        {
           code: "shape(4).rotate([-3.14,3.14].ease('easeInOutCubic')).out(o0)",
           comments: {
              en: "default",
              es: "default",
              ja: "デフォルト",
           }
        },
     ],
  },
  offset: { description:"", example: [
        {
           code: "shape(999).scrollY(.2).scrollX([-0.2,0.2]).add( shape(4).scrollY(-.2).scrollX([-0.2,0.2].offset(0.5))).out(o0)",
           comments: {
              en: "default",
              es: "default",
              ja: "デフォルト",
           }
        },
     ],
  },
  fit: { description:"", example: [
        {
           code: "shape().scrollX([0,1,2,3,4].fit(-0.2,0.2)).out(o0)",
           comments: {
              en: "default",
              es: "default",
              ja: "デフォルト",
           }
        },
     ],
  },
  fft: { description:"", example: [
        {
           code: "osc().modulate(noise(3),()=>a.fft[0]).out(o0)",
           comments: {
              en: "default",
              es: "default",
              ja: "デフォルト",
           }
        },
     ],
  },
  setSmooth: { description:"setSmooth( smooth = 0.4 )", example: [
        {
           code: "a.setSmooth(0.8);osc().modulate(noise(3),()=>a.fft[0]).out(o0)",
           comments: {
              en: "default",
              es: "default",
              ja: "デフォルト",
           }
        },
     ],
  },
  setCutoff: { description:"setCutoff( cutoff = 2 )", example: [
        {
           code: "a.setCutoff(4);osc().modulate(noise(3),()=>a.fft[0]).out(o0)",
           comments: {
              en: "threshold",
              es: "umbral (threshold)",
              ja: "",
           }
        },
     ],
  },
  setBins: { description:"setBins( numBins = 4 )", example: [
        {
           code: "a.setBins(8);osc(60,0.1,()=>a.fft[7]*3).modulate(noise(3),()=>a.fft[0]).out(o0)",
           comments: {
              en: "change color with hissing noise",
              es: "cambiando el color con ruido",
              ja: "",
           }
        },
     ],
  },
  setScale: { description:"setScale( scale = 10 )", example: [
        {
           code: "a.setScale(5);osc().modulate(noise(3),()=>a.fft[0]).out(o0)",
           comments: {
              en: "the smaller the scale is, the bigger the output is",
              es: "cuanto menor la escala, mayor es la salida",
              ja: "",
           }
        },
     ],
  },
}
;

export function elementHydraJson(){
   return elementHydra;
}