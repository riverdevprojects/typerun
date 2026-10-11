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
  stroke(ctx,[[-10,-32],[10,-32],[8,-9],[-8,-9],[-10,-32]],'#b7a27c',1.7);
  stroke(ctx,[[-7,-32],[-7,-40],[0,-44],[7,-40],[7,-32]],'#b7a27c',1.7);
  circle(ctx,0,-21,3.5,lit?'#efaf51':'#d8d9cc',true);ctx.restore();
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
