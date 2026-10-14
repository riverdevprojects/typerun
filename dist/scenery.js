import {sunState} from './journey.js';
import {clamp,lerp} from './story.js';
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
export function drawSkyLantern(ctx,{origin,target,age,time,width,height,reduced=false}){
  const state=sunState(age,reduced),t=reduced?age*7:age,scale=width<550?.92:1.1;
  const x=reduced?target[0]:lerp(origin[0],target[0],state.rise)-Math.sin(state.rise*Math.PI)*18;
  const y=reduced?target[1]:lerp(origin[1],target[1],state.rise)-Math.sin(state.rise*Math.PI)*12;
  const cy=y+19*scale*(1-state.unfold),radius=3+state.grow*(width<550?29:42);
  ctx.save();
  const glow=ctx.createRadialGradient(x,cy,2,x,cy,65+state.grow*110);
  glow.addColorStop(0,'rgba(255,226,150,'+(.35+state.grow*.15)+')');glow.addColorStop(1,'rgba(255,215,126,0)');
  ctx.fillStyle=glow;ctx.fillRect(x-180,cy-180,360,360);
  if(state.unfold<1){
    ctx.save();ctx.globalAlpha*=1-state.unfold;ctx.translate(x,y);ctx.scale(scale,scale);
    drawLantern(ctx,0,0,time,1);
    stroke(ctx,[[0,0],[0,-14]],'#c4ad72',1);
    ctx.strokeStyle='#c4ad72';ctx.lineWidth=1;ctx.beginPath();ctx.arc(0,-18,4,-2.4,.6);ctx.stroke();ctx.restore();
  }
  if(!reduced&&state.unfold>0&&state.unfold<1){
    const p=state.unfold;
    ctx.save();ctx.globalAlpha*=(1-p)*.65;
    for(const side of [-1,1]){
      stroke(ctx,[[x+side*8,cy-8],[x+side*(11+p*25),cy-13-p*7],[x+side*(12+p*31),cy+8+p*12],[x+side*7,cy+9]],'#bcad81',1.2);
      stroke(ctx,[[x+side*3,cy-21],[x+side*(8+p*19),cy-24-p*18]],'#ceb67b',1);
    }
    ctx.restore();
  }
  if(!reduced&&t>1.1&&t<5){
    ctx.save();ctx.globalAlpha*=Math.sin(clamp((t-1.1)/3.9)*Math.PI)*.8;
    for(let i=0;i<24;i++){
      const angle=i*2.39996+t*1.45,orbit=(18+(i*17%48))*(1-state.grow)+radius*.35;
      const px=x+Math.cos(angle)*orbit,py=cy+Math.sin(angle)*orbit*.72;
      stroke(ctx,[[px,py],[px-Math.cos(angle-.9)*5,py-Math.sin(angle-.9)*5]],i%3?'#edb66b':'#fff3be',i%3?1.3:2);
    }
    ctx.restore();
  }
  if(t<2.1){
    ctx.fillStyle='#f1b24f';ctx.beginPath();ctx.moveTo(x,cy-8);ctx.bezierCurveTo(x+7,cy-2,x+4,cy+5,x,cy+5);ctx.bezierCurveTo(x-5,cy+5,x-5,cy,x,cy-8);ctx.fill();
  }else{
    const core=ctx.createRadialGradient(x-radius*.25,cy-radius*.25,0,x,cy,radius);
    core.addColorStop(0,'#fff4bf');core.addColorStop(.5,'#f9da83');core.addColorStop(1,'#edb35f');
    ctx.fillStyle=core;ctx.strokeStyle='#e0a85a';ctx.lineWidth=1.2;ctx.beginPath();ctx.arc(x,cy,radius,0,TAU);ctx.fill();ctx.stroke();
    ctx.save();ctx.globalAlpha*=state.grow*.38;
    for(let i=0;i<12;i++){const a=i*TAU/12-(reduced?0:time*.015),r=radius+9,length=16+(reduced?0:Math.sin(state.grow*Math.PI)*33);stroke(ctx,[[x+Math.cos(a)*r,cy+Math.sin(a)*r],[x+Math.cos(a)*(r+length),cy+Math.sin(a)*(r+length)]],'#dbb86a',1);}
    ctx.restore();
  }
  if(!reduced){
    for(let i=0;i<3;i++){
      const p=(t-2.2-i*.27)/1.5;if(p<=0||p>=1)continue;
      ctx.save();ctx.globalAlpha*=Math.sin(p*Math.PI)*.22;ctx.strokeStyle='#dfbb78';ctx.lineWidth=1.2;ctx.beginPath();ctx.arc(x,cy,30+p*Math.min(width*.55,320),0,TAU);ctx.stroke();ctx.restore();
    }
  }
  ctx.restore();
}
