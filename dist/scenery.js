const TAU=Math.PI*2;
export function stroke(ctx,points,color='#c3cec3',weight=1.6){ctx.strokeStyle=color;ctx.lineWidth=weight;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();}
export {paintScene} from './landscape.js';
// The grip is the origin, so the handle stays attached during every pose and swing.
export function drawLantern(ctx,x,y,time,lit=0,angle=0){
  const warmth=Number(lit),pulse=.88+Math.sin(time*3)*.08;
  ctx.save();ctx.translate(x,y);ctx.rotate(angle);
  if(warmth>0){const glow=ctx.createRadialGradient(0,19,2,0,19,56);glow.addColorStop(0,'rgba(248,183,70,'+warmth*pulse*.29+')');glow.addColorStop(1,'rgba(248,183,70,0)');ctx.fillStyle=glow;ctx.fillRect(-56,-37,112,112);}
  ctx.lineWidth=1.8;ctx.strokeStyle='#67725d';ctx.beginPath();ctx.ellipse(0,4,4.5,4,0,0,TAU);ctx.stroke();
  ctx.fillStyle='#bbc5ad';ctx.beginPath();ctx.moveTo(-9,12);ctx.lineTo(-6,8);ctx.lineTo(6,8);ctx.lineTo(9,12);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle=warmth>0?'rgba(246,190,83,'+(.12+warmth*.22)+')':'rgba(244,248,238,.58)';ctx.beginPath();ctx.roundRect(-7,12,14,14,2);ctx.fill();ctx.stroke();
  stroke(ctx,[[-7,13],[-6,24]],'#96a58c',1);stroke(ctx,[[7,13],[6,24]],'#96a58c',1);
  stroke(ctx,[[-3,14],[-3,20]],'rgba(255,255,244,.65)',1.2);stroke(ctx,[[-9,27],[9,27]],'#647059',2.2);
  stroke(ctx,[[-2,23],[2,23]],'#8b805e',1.2);
  if(warmth>0){ctx.globalAlpha*=warmth;ctx.fillStyle='#eaaa44';ctx.beginPath();ctx.moveTo(0,15-Math.sin(time*8));ctx.bezierCurveTo(5,19,4,23,0,23);ctx.bezierCurveTo(-4,23,-4,20,0,15);ctx.fill();ctx.fillStyle='#fff0b1';ctx.beginPath();ctx.ellipse(0,21,1.5,2.1,0,0,TAU);ctx.fill();}
  ctx.restore();
}
export function drawCampfire(ctx,x,y,time,reduced=false){
  ctx.save();ctx.translate(x,y);
  const glow=ctx.createRadialGradient(0,-17,3,0,-17,104);glow.addColorStop(0,'rgba(234,169,81,.27)');glow.addColorStop(1,'rgba(234,169,81,0)');ctx.fillStyle=glow;ctx.fillRect(-104,-121,208,208);
  for(let i=0;i<7;i++){const a=i*Math.PI*2/7;ctx.fillStyle=i%2?'#a7afa0':'#b8beae';ctx.strokeStyle='#87957f';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(Math.cos(a)*19,Math.sin(a)*5+3,6,3.5,a*.25,0,TAU);ctx.fill();ctx.stroke();}
  stroke(ctx,[[-14,5],[13,-3]],'#88745b',4);stroke(ctx,[[-12,-3],[13,5]],'#746d57',3.5);
  for(let i=0;i<3;i++){const sway=reduced?0:Math.sin(time*5+i)*2,bx=(i-1)*6,h=27+(i===1?12:0);ctx.fillStyle=i===1?'#edb250':'#dc9854';ctx.beginPath();ctx.moveTo(bx-7,0);ctx.bezierCurveTo(bx-10,-h*.55,bx+sway+3,-h*.52,bx+sway,-h);ctx.bezierCurveTo(bx+10,-h*.5,bx+11,-4,bx+5,0);ctx.closePath();ctx.fill();}
  ctx.fillStyle='#f9d788';ctx.beginPath();ctx.moveTo(-5,0);ctx.quadraticCurveTo(-7,-13,1,-23);ctx.quadraticCurveTo(8,-9,5,0);ctx.fill();
  if(!reduced)for(let i=0;i<5;i++){const p=(time*.28+i*.21)%1;ctx.globalAlpha=1-p;ctx.fillStyle='#d7a15c';ctx.beginPath();ctx.arc(Math.sin(i*3+time)*7,-12-p*57,1,0,TAU);ctx.fill();}
  ctx.restore();
}
