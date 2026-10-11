import {stroke} from './scenery.js';
import {landmarkX} from './journey.js';
const TAU=Math.PI*2,fract=n=>n-Math.floor(n),seed=n=>fract(Math.sin(n*127.1+311.7)*43758.5453);
const mixColor=(a,b,t)=>'#'+[1,3,5].map(i=>Math.round(parseInt(a.slice(i,i+2),16)*(1-t)+parseInt(b.slice(i,i+2),16)*t).toString(16).padStart(2,'0')).join('');
function poly(ctx,points,fill,line='#bac7bc',weight=1){
  ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();
  ctx.fillStyle=fill;ctx.fill();if(line){ctx.strokeStyle=line;ctx.lineWidth=weight;ctx.lineJoin='round';ctx.stroke();}
}
function circle(ctx,x,y,r,color){ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fillStyle=color;ctx.fill();}
function curve(ctx,p,color,w=1){ctx.beginPath();ctx.moveTo(...p[0]);ctx.bezierCurveTo(...p.slice(1).flat());ctx.strokeStyle=color;ctx.lineWidth=w;ctx.lineCap='round';ctx.stroke();}
function cells(width,cameraX,factor,spacing,paint){
  const offset=cameraX*factor,first=Math.floor(offset/spacing)-1;
  for(let i=first;i<=(offset+width)/spacing+1;i++)paint(i*spacing-offset,i);
}
function haze(ctx,width,y,spread,color='#f4f7ef'){
  const g=ctx.createLinearGradient(0,y-spread,0,y+spread);g.addColorStop(0,color+'00');g.addColorStop(.5,color+'bb');g.addColorStop(1,color+'00');
  ctx.fillStyle=g;ctx.fillRect(0,y-spread,width,spread*2);
}
function ridge(ctx,{width,height,cameraX,cameraY},depth,dawn){
  const baseline=height*(.7+depth*.12)-cameraY*.025,points=[[-220,height+30]];
  cells(width,cameraX,depth*.2,170,(x,i)=>points.push([x,baseline],[x+37,baseline-48-seed(i+depth)*58],[x+68,baseline-38-seed(i+depth)*48],[x+108,baseline-90-seed(i+32)*64]));
  points.push([width+220,height+30]);poly(ctx,points,dawn?'#dfe4c9':depth<.5?'#e0e7db':'#d4dfd0',null);
  ctx.save();ctx.globalAlpha*=.5;stroke(ctx,points.slice(1,-1),'#b3c3b4',.8);ctx.restore();
}
function pine(ctx,x,y,h,color){
  stroke(ctx,[[x,y],[x-2,y-h]],color,1.6);
  for(let k=0;k<7;k++){const p=k/7,w=h*(.03+p*.21),by=y-h+h*p*.83;poly(ctx,[[x-1,by-16],[x-w,by+11],[x-6,by+8],[x-w*.8,by+17],[x+w,by+15]],color,null);}
}
function ashTree(ctx,x,y,h,i){
  const lean=(seed(i+8)-.5)*21;
  poly(ctx,[[x-5,y],[x-2,y-h*.57],[x+lean-3,y-h],[x+lean+2,y-h],[x+5,y-h*.48],[x+7,y]],'#c4cec0','#aabbab',1.2);
  for(let k=0;k<5;k++){
    const sign=k%2?1:-1,by=y-h*(.28+k*.12),tip=x+sign*(24+seed(i*7+k)*38),ty=by-h*.18;
    stroke(ctx,[[x,by],[x+sign*18,by-16],[tip,ty],[tip+sign*13,ty-3]],'#acbeae',1.3);
    stroke(ctx,[[tip,ty],[tip-sign*4,ty-18],[tip+sign*5,ty-28]],'#bac8b8',.9);
    if(k%2)stroke(ctx,[[x+sign*18,by-16],[x+sign*12,by-34]],'#acbeae',.9);
  }
  stroke(ctx,[[x+2,y-12],[x+1,y-h*.24]],'#99ae99',.8);stroke(ctx,[[x-16,y+2],[x-5,y-3],[x+6,y],[x+19,y+4]],'#b8c6b3',1.1);
}
function rock(ctx,x,y,w,h){
  poly(ctx,[[x,y],[x+5,y-h*.72],[x+w*.22,y-h*.96],[x+w*.45,y-h],[x+w*.7,y-h*.79],[x+w,y-h*.73],[x+w*.92,y]],'#d2ddcf','#b7c7b6',1.1);
  poly(ctx,[[x+w*.45,y-h],[x+w*.7,y-h*.79],[x+w*.58,y-h*.68],[x+w*.57,y]],'#c7d4c3',null);
  for(let j=0;j<5;j++){const by=y-h*.17*j;stroke(ctx,[[x+8,by],[x+w*.35,by-9],[x+w*.52,by-5]],'#b7c8b5',.9);stroke(ctx,[[x+w*.65,by-7],[x+w*.76,by-12],[x+w*.91,by-9]],'#bacab8',.7);}
  stroke(ctx,[[x+w*.22,y-h*.9],[x+w*.26,y-h*.6],[x+w*.16,y-h*.47]],'#9eb39e',.8);
}
function ground(ctx,{width,height,cameraX},dawn=false){
  cells(width,cameraX,.72,83,(x,i)=>{
    const y=height*(.9+seed(i+14)*.08);
    if(seed(i)<.48)rock(ctx,x+20,y,13,5+seed(i+2)*6);
    else for(let k=0;k<4;k++)stroke(ctx,[[x+k*4,y],[x+k*5-3,y-5-seed(i+k)*7]],dawn?'#acbe94':'#bcc9b3',.8);
    stroke(ctx,[[x+37,y+6],[x+51,y+3],[x+63,y+5]],'#cbd5c0',.6);
  });
}
function forest(ctx,a){
  const {width,height,cameraX,cameraY,time,reduced}=a;
  cells(width,cameraX,.19,74,(x,i)=>pine(ctx,x,height*.76-cameraY*.025,65+seed(i)*89,'#d6dfce'));
  haze(ctx,width,height*.63,45);
  cells(width,cameraX,.36,153,(x,i)=>ashTree(ctx,x+22,height*.87-cameraY*.045,145+seed(i)*125,i));
  haze(ctx,width,height*.74,30);
  cells(width,cameraX,.58,450,(x,i)=>{
    ctx.save();ctx.globalAlpha*=.4;ashTree(ctx,x+71,height+22,height*.91,i+76);ctx.restore();
    poly(ctx,[[x+133,height*.94],[x+198,height*.91],[x+200,height*.94],[x+139,height*.97]],'#d1d9c8','#b5c4ad');
    stroke(ctx,[[x+143,height*.947],[x+190,height*.925]],'#aebeaa',.8);
  });ground(ctx,a);
  for(let i=0;i<10;i++){const x=((seed(i+66)*width-cameraX*.27)%width+width)%width,y=height*(.29+seed(i+8)*.48)+(reduced?0:Math.sin(time*.7+i)*7);circle(ctx,x,y,1.1,'#cbab76');}
}
function bridge(ctx,a){
  const {width,height,cameraX,time,reduced}=a;
  cells(width,cameraX,.25,490,(x,i)=>{
    rock(ctx,x-35,height*.98,145,160+seed(i)*55);rock(ctx,x+350,height*.96,95,110+seed(i+4)*55);
    curve(ctx,[[x+91,height*.62],[x+180,height*.87],[x+268,height*.89],[x+329,height*.7]],'#bbcbbb',1.2);
    curve(ctx,[[x+91,height*.65],[x+158,height*.84],[x+194,height*.88],[x+219,height*.87]],'#aebfac',.8);
    for(let j=0;j<6;j++){const bx=x+116+j*23,by=height*(.76+j*.014);stroke(ctx,[[bx,by-10],[bx+12,by+3]],'#b7c5b2',2.1);}
  });
  const water=ctx.createLinearGradient(0,height*.81,0,height);water.addColorStop(0,'#e7eeea80');water.addColorStop(1,'#d2e1dd');ctx.fillStyle=water;ctx.fillRect(0,height*.81,width,height*.19);
  for(let row=0;row<7;row++){const y=height*.83+row*11,points=[];for(let x=-20;x<width+20;x+=14)points.push([x,y+Math.sin((x+cameraX*.12+(reduced?0:time*10))/55+row)*2]);stroke(ctx,points,row%2?'#f6faf390':'#b8cdc080',.7);}
  cells(width,cameraX,.47,245,(x,i)=>{
    const y=height*.84;rock(ctx,x+20,y,60,18);stroke(ctx,[[x+9,y+11],[x+45,y+14],[x+85,y+9]],'#b3cabc',.8);
    if(i%2===0)stroke(ctx,[[x+130,y-8],[x+138,y-40],[x+161,y-43],[x+159,y-8]],'#b0c2ab',1.7);
  });haze(ctx,width,height*.79,25);
}
function turret(ctx,x,base,w,h){
  const top=base-h;
  poly(ctx,[[x,base],[x,top+20],[x+8,top+20],[x+8,top],[x+24,top],[x+24,top+15],[x+w*.44,top+15],[x+w*.44,top-7],[x+w*.61,top-7],[x+w*.61,top+17],[x+w*.82,top+17],[x+w*.87,top+3],[x+w,top+12],[x+w,base]],'#dce3d9','#afbeb0',1.3);
  poly(ctx,[[x+w*.73,base],[x+w*.73,top+23],[x+w,top+12],[x+w,base]],'#cbd7cb',null);
  for(let row=0;row<h/22;row++){const y=top+30+row*22;stroke(ctx,[[x+2,y],[x+w-2,y]],'#c2cec0',.6);for(let col=0;col<4;col++){const bx=x+(col+(row%2)*.5)*w/4;if(bx<x+w-4)stroke(ctx,[[bx,y],[bx,y+21]],'#c2cec0',.6);}}
  for(let j=0;j<2;j++){const ax=x+w*.24+j*w*.41,ay=top+65;poly(ctx,[[ax-7,ay+43],[ax-7,ay+7],[ax,ay],[ax+7,ay+7],[ax+7,ay+43]],'#bccabd','#97ad9e',.8);stroke(ctx,[[ax,ay+3],[ax,ay+42]],'#e5eadf',.7);}
  stroke(ctx,[[x+w*.62,top+27],[x+w*.54,top+68],[x+w*.59,top+79],[x+w*.48,top+110]],'#9eaf9e');
  poly(ctx,[[x+w*.32,base],[x+w*.32,base-61],[x+w*.49,base-79],[x+w*.66,base-61],[x+w*.66,base]],'#c3d0c2','#a5b8a6');
}
function watchtower(ctx,a){
  const {width,height,cameraX,cameraY}=a;
  cells(width,cameraX,.12,360,(x,i)=>{ctx.save();ctx.globalAlpha*=.4;turret(ctx,x+15,height*.91,45+seed(i)*30,130+seed(i+8)*70);ctx.restore();});
  haze(ctx,width,height*.69,36);
  const tx=landmarkX(width,a.towerX||0,cameraX),base=height*1.07-cameraY*.015;
  turret(ctx,tx-48,base,106,height*.79);
  cells(width,cameraX,.25,220,(x,i)=>rock(ctx,x+15,height*.87,70,65+seed(i)*60));
  haze(ctx,width,height*.9,52,'#f6f9f1');
}
function cave(ctx,a){
  const {width,height,cameraX}=a,g=ctx.createLinearGradient(0,0,0,height);
  g.addColorStop(0,mixColor('#c2cbbe','#d8c8af',a.lit||0));g.addColorStop(.6,mixColor('#e1e7db','#f1e5c9',a.lit||0));g.addColorStop(1,mixColor('#d9e0d2','#e4d6b6',a.lit||0));ctx.fillStyle=g;ctx.fillRect(0,0,width,height);
  for(let i=0;i<3;i++)curve(ctx,[[width*.03-i*20,height*.64],[width*.06,25+i*21],[width*.85,10+i*18],[width*.98+i*22,height*.68]],'#acbea340',2);
  cells(width,cameraX,.23,165,(x,i)=>{
    const h=40+seed(i)*95;poly(ctx,[[x,0],[x+64,0],[x+35,h],[x+21,h*.5]],'#c4d0bf','#acbfa9');
    poly(ctx,[[x+20,height],[x+69,height],[x+48,height-29-seed(i+7)*41]],'#c3d1bd','#acbfa8');
    stroke(ctx,[[x+28,12],[x+34,h*.7]],'#e5ecdc',.8);
  });
  cells(width,cameraX,.38,110,(x,i)=>{const y=height*(.25+seed(i)*.42);stroke(ctx,[[x,y],[x+32,y-4],[x+44,y+5]],'#becdb6',.8);});
  haze(ctx,width,height*.65,65,'#f0f4e8');ground(ctx,a);
}
export function paintScene(ctx,kind,a){
  const {width,height,cameraX}=a;ctx.save();
  if(kind==='cave'||kind==='hearth')cave(ctx,a);
  else{
    const g=ctx.createLinearGradient(0,0,0,height);g.addColorStop(0,kind==='tower'?'#e5ecee':'#e7ece2');g.addColorStop(.72,'#f6f8f2');g.addColorStop(1,'#edf2e9');ctx.fillStyle=g;ctx.fillRect(0,0,width,height);
    const mx=width*.79-cameraX*.008,my=height*.22;
    circle(ctx,mx,my,24,'#f7f9ef');ctx.lineWidth=.9;ctx.strokeStyle='#c4cfbe';ctx.stroke();circle(ctx,mx+7,my-5,4,'#e9eedf');circle(ctx,mx-9,my+9,6,'#e9eedf');
    cells(width,cameraX,.035,185,(x,i)=>{const y=height*(.12+seed(i+19)*.35);curve(ctx,[[x,y],[x+45,y-8],[x+96,y+11],[x+155,y-1]],'#ffffff85',9);});
    const peak=width*.7+((a.towerX||0)-cameraX)*.018,py=height*.19;
    poly(ctx,[[peak-220,height*.86],[peak-70,py+81],[peak-43,py+91],[peak,py],[peak+38,py+65],[peak+65,py+50],[peak+195,height*.83]],'#dce5d7','#c3d0bf',.8);
    stroke(ctx,[[peak,py],[peak-20,py+82],[peak+4,py+109],[peak-22,py+162]],'#c5d3c1',.9);
    poly(ctx,[[peak,py],[peak-15,py+32],[peak-6,py+24],[peak+4,py+37],[peak+17,py+29]],'#f4f7ed',null);
    ridge(ctx,a,.35,false);ridge(ctx,a,.8,false);
    if(kind==='forest')forest(ctx,a);else if(kind==='bridge')bridge(ctx,a);else watchtower(ctx,a);
  }
  const wash=ctx.createLinearGradient(0,height*.58,0,height*.83);wash.addColorStop(0,'#f8faf300');wash.addColorStop(.55,'#f8faf350');wash.addColorStop(1,'#f8faf300');ctx.fillStyle=wash;ctx.fillRect(0,height*.58,width,height*.25);ctx.restore();
}
