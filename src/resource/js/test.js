var hydra = new Hydra({ detectAudio: true});
s0.initCam() ; //loads a camera 
    
    osc(5, 0.9, 0.001)
    .kaleid([3,4,5,7,8,9,10].fast(0.1))
    .color(0.5, 0.3)
    .colorama(0.6).modulate(src(s0))
    .rotate(0.009,()=>Math.sin(time)* -0.02 )
    .modulateRotate(o0,()=>Math.sin(time) * 0.003)
    .modulate(o0, 0.9).modulate(src(s0))
    .scale(0.9).modulate(src(s0))
    .out(o0);
    
render(o0)