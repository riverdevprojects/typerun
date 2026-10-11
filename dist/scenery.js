const TAU=Math.PI*2;
export function stroke(ctx,points,color='#c3cec3',weight=1.6){
  ctx.strokeStyle=color;ctx.lineWidth=weight;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();
  points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();
}
function circle(ctx,x,y,r,color,fill=false){ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx[fill?'fillStyle':'strokeStyle']=color;fill?ctx.fill():ctx.stroke();}
export {paintScene} from './landscape.js';
export function drawLantern(ctx,x,y,time,lit=true){
  ctx.save();ctx.translate(x,y);const pulse=lit?.6+Math.sin(time*2)*.12:0;
  if(lit){const glow=ctx.createRadialGradient(0,-20,0,0,-20,45);glow.addColorStop(0,`rgba(246,189,88,${pulse*.3})`);glow.addColorStop(1,'rgba(246,189,88,0)');ctx.fillStyle=glow;ctx.fillRect(-45,-65,90,90);}
  ctx.fillStyle=lit?'rgba(249,194,104,.19)':'rgba(243,247,235,.25)';ctx.fillRect(-8,-30,16,19);
  stroke(ctx,[[-10,-32],[10,-32],[8,-9],[-8,-9],[-10,-32]],'#8c856b',2.6);
  stroke(ctx,[[-7,-32],[-7,-40],[0,-44],[7,-40],[7,-32]],'#8c856b',2.3);
  stroke(ctx,[[-11,-8],[11,-8],[-10,-8]],'#8c856b',2.8);
  if(lit){ctx.fillStyle='#efaf51';ctx.beginPath();ctx.moveTo(0,-28-Math.sin(time*8)*1.5);ctx.quadraticCurveTo(8,-18,0,-15);ctx.quadraticCurveTo(-7,-17,0,-28);ctx.fill();circle(ctx,0,-19,2,'#fff0b3',true);}
  ctx.restore();
}
export {drawDragon} from './dragon.js';
export {drawBreath} from './dragon.js';
export function drawSignpost(ctx,x,y,time,hung=false){
  ctx.save();ctx.translate(x,y);
  stroke(ctx,[[0,38],[-2,-101],[2,-104],[4,37]],'#8b9d7b',3);
  stroke(ctx,[[-20,-99],[22,-99],[31,-90],[22,-82],[-20,-82],[-20,-99]],'#a3b18d',2);
  stroke(ctx,[[-13,-90],[12,-90]],'#ced5b8',1);
  stroke(ctx,[[0,-74],[-19,-74],[-21,-70]],'#718674',2);
  stroke(ctx,[[4,-27],[12,-20],[16,-20]],'#bac9a6',1);
  if(hung)drawLantern(ctx,-20,-26,time,true);
  ctx.restore();
}
