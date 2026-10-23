
var hydra = new Hydra({ detectAudio: true, canvas: document.getElementById("hydra-canvas") });
hydra.setResolution(1920, 1080);

s1.initImage("./src/resource/img/alpha.png")
a.setCutoff(4)
a.setSmooth(0.8)
src(s1).invert(1)  
  .rotate( () => time%360, () => Math.sin(time*0.1)*0.05 )
  .scroll([-0.2,0.2].smooth(),[-0.2,0.2,0.1,-0.15].smooth())
.scale(()=>1+a.fft[0])
  .out(o1)


src(o1)
	.add(
  		src(o0).scale(0.95) 
  		.brightness(.15)
  		,.7)
	.out()

 