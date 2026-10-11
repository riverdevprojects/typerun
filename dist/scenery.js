import {clamp} from './story.js';
const TAU=Math.PI*2;
export function stroke(ctx,points,color='#c3cec3',weight=1.6){
  ctx.strokeStyle=color;ctx.lineWidth=weight;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();
  points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();
}
function circle(ctx,x,y,r,color,fill=false){ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx[fill?'fillStyle':'strokeStyle']=color;fill?ctx.fill():ctx.stroke();}
function tree(ctx,x,y,size){
  const color='#c5cec3';stroke(ctx,[[x,y],[x-4,y-size*.6],[x+3,y-size]],color,2);
  stroke(ctx,[[x-2,y-size*.52],[x-22,y-size*.68],[x-34,y-size*.69]],color);
  stroke(ctx,[[x-3,y-size*.73],[x+21,y-size*.85],[x+30,y-size*.87]],color);
  stroke(ctx,[[x,y-size*.9],[x-14,y-size*1.03]],color);
}
export function paintScene(ctx,kind,{width,height,cameraX,cameraY,floor,time,reduced=false}){
  ctx.save();const bottom=floor-cameraY;
  const backdrop=kind==='dawn'?'#fffdf6':kind==='fight'||kind==='approach'?'#f6f9f8':kind==='tower'?'#f7f9fa':'#f9faf6';
  ctx.fillStyle=backdrop;ctx.fillRect(0,0,width,height);
  // Open paper, distant contour lines, and spare branching strokes keep the world drawn by hand.
  const moonX=width*(kind==='dawn'?(width<550?.17:.58):.79),moonY=height*.2;
  ctx.lineWidth=1.5;circle(ctx,moonX,moonY,kind==='dawn'?29:21,kind==='dawn'?'#efb368':'#d4dcd2');
  if(kind==='dawn'){
    circle(ctx,moonX,moonY,20,'#ffe8b3',true);
    for(let i=0;i<12;i++){const a=i*TAU/12;stroke(ctx,[[moonX+Math.cos(a)*36,moonY+Math.sin(a)*36],[moonX+Math.cos(a)*43,moonY+Math.sin(a)*43]],'#edc48c',1);}
  }
  const offset=(cameraX*.14)%280;
  for(let i=-1;i<width/280+2;i++){
    const x=i*280-offset;
    stroke(ctx,[[x,height*.65],[x+70,height*.35],[x+140,height*.59],[x+208,height*.41],[x+280,height*.65]],'#e1e6df',1.2);
  }
  if(kind==='forest'){
    const scroll=(cameraX*.42)%210;
    for(let i=-1;i<width/210+2;i++){const x=i*210-scroll;tree(ctx,x+35,height*.68,115+(i%3+3)%3*35);tree(ctx,x+140,height*.75,85);}
    for(let i=0;i<22;i++){const x=(i*73-cameraX*.55%73+width)%width,y=height*.8+i%3*10;stroke(ctx,[[x,y],[x+6,y-2]],'#d8cbb8',1);}
    if(!reduced)for(let i=0;i<7;i++)circle(ctx,(i*137-cameraX*.2+width*50)%width,height*.28+i%3*32+Math.sin(time+i)*5,1.6,'#dda875',true);
  }else if(kind==='bridge'){
    ctx.fillStyle='#edf5f3';ctx.fillRect(0,height*.77,width,height*.23);
    for(let row=0;row<4;row++){
      const y=height*.8+row*19,shift=reduced?0:time*12;
      const points=[];for(let x=-20;x<width+20;x+=12)points.push([x,y+Math.sin((x+shift)/47+row)*3]);stroke(ctx,points,'#c7ded7',1);
    }
    stroke(ctx,[[25,height*.76],[51,height*.62],[65,height*.69],[88,height*.6],[99,height*.76]],'#bbc9bf',2);
    stroke(ctx,[[width-99,height*.76],[width-84,height*.61],[width-48,height*.66],[width-28,height*.76]],'#bbc9bf',2);
    for(let i=0;i<3;i++)stroke(ctx,[[width*.2+i*width*.26,height*.73],[width*.21+i*width*.26,height*.83],[width*.23+i*width*.26,height*.83]],'#ccdad0');
  }else if(kind==='tower'||kind==='approach'||kind==='fight'){
    const x=width*.75-(cameraX*.12)%70,base=height*.92-cameraY*.1;
    const color=kind==='tower'?'#cad3d3':'#d5ded7';
    stroke(ctx,[[x-78,base],[x-78,base-235],[x-58,base-235],[x-58,base-255],[x-35,base-255],[x-35,base-235],[x-11,base-235],[x-11,base-255],[x+12,base-255],[x+12,base-235],[x+38,base-235],[x+38,base]],color,2);
    stroke(ctx,[[x-23,base-20],[x-23,base-95],[x-5,base-113],[x+13,base-95],[x+13,base-20]],color);
    for(let i=0;i<7;i++)stroke(ctx,[[x-78+(i%2)*18,base-i*29-15],[x-54+(i%2)*18,base-i*29-15]],'#e0e6e0',1);
    if(kind==='tower')for(let i=0;i<3;i++)stroke(ctx,[[width*.16+i*width*.23,height*.56-i*42],[width*.16+28+i*width*.23,height*.56-i*42]],'#d2d9d7',2);
  }
  // The ground is suggested below the letterforms, never painted over them.
  if(kind==='dawn'){
    stroke(ctx,[[0,height*.86],[width*.18,height*.77],[width*.39,height*.83],[width*.6,height*.71],[width,height*.83]],'#d4ddc7',1.8);
    for(let i=0;i<8;i++)stroke(ctx,[[i*width/8,height*.87],[i*width/8+7,height*.84]],'#c1d0b7',1);
  }
  ctx.restore();
}
export function drawLantern(ctx,x,y,time,lit=true){
  ctx.save();ctx.translate(x,y);const pulse=lit?.6+Math.sin(time*2)*.12:0;
  if(lit){const glow=ctx.createRadialGradient(0,-20,0,0,-20,45);glow.addColorStop(0,`rgba(246,189,88,${pulse*.3})`);glow.addColorStop(1,'rgba(246,189,88,0)');ctx.fillStyle=glow;ctx.fillRect(-45,-65,90,90);}
  stroke(ctx,[[-10,-32],[10,-32],[8,-9],[-8,-9],[-10,-32]],'#b7a27c',1.7);
  stroke(ctx,[[-7,-32],[-7,-40],[0,-44],[7,-40],[7,-32]],'#b7a27c',1.7);
  circle(ctx,0,-21,3.5,lit?'#efaf51':'#d8d9cc',true);ctx.restore();
}
export function drawDragon(ctx,x,y,{time=0,p=0,action='slash',resolve=0,reduced=false}={}){
  ctx.save();ctx.translate(x,y);const breathe=reduced?0:Math.sin(time*1.6)*2;
  const recoil=action==='finish'?Math.sin(p*Math.PI)**3*-12:action==='slash'?Math.sin(p*Math.PI)**3*10:0;
  const calm=clamp(resolve);ctx.translate(recoil,calm*13+breathe);
  const c=calm>.95?'#73917b':'#536f6c',wing=reduced?0:Math.sin(time*.8)*5;
  // A dragon built from the same rounded strokes and hollow shapes as the runner.
  stroke(ctx,[[18,-77],[51,-167+wing],[98,-138+wing],[133,-83],[85,-109],[65,-74],[18,-77]],'#a3b8ab',2.5);
  stroke(ctx,[[51,-167+wing],[65,-74],[98,-138+wing],[85,-109]],'#c0cec1',1.2);
  stroke(ctx,[[9,-63],[30,-36],[54,-39],[92,-15],[120,-28],[132,-51]],c,4.5);
  stroke(ctx,[[32,-37],[46,-21],[39,-3],[60,-3]],c,4.5);
  stroke(ctx,[[4,-50],[12,-27],[-4,-3],[15,-3]],c,4.5);
  const neck=-92+calm*15;
  stroke(ctx,[[18,-56],[-4,-81],[-24,neck],[-37,neck-7]],c,5);
  ctx.strokeStyle=c;ctx.lineWidth=3.5;ctx.fillStyle='#f6f9f8';ctx.beginPath();ctx.moveTo(-37,neck-19);ctx.lineTo(-58,neck-17);ctx.lineTo(-70,neck-4);ctx.lineTo(-43,neck+4);ctx.lineTo(-30,neck-5);ctx.closePath();ctx.fill();ctx.stroke();
  stroke(ctx,[[-37,neck-18],[-26,neck-36],[-27,neck-10]],c,2.7);
  stroke(ctx,[[-48,neck-18],[-44,neck-29]],c,2.7);
  circle(ctx,-49,neck-10,2,calm>.95?'#ecb36b':'#ed722e',true);
  stroke(ctx,[[-13,-70],[-30,-48],[-47,-52]],c,3);
  for(let i=0;i<3;i++)stroke(ctx,[[-47+i*4,-52],[-52+i*4,-46]],c,1.7);
  if(calm<1){
    ctx.globalAlpha=1-calm;for(let i=0;i<5;i++)circle(ctx,9+i*6,-64+i*7,4,'#b2a384');ctx.globalAlpha=1;
  }
  if(action==='parry'&&p>.32&&p<.7&&calm<.9){
    stroke(ctx,[[-27,neck],[-70,-55],[-108,-34]],c,3);
    for(let i=0;i<3;i++)stroke(ctx,[[-107,-35+i*5],[-120,-38+i*5]],c,2);
  }
  ctx.restore();
}
