import {clamp} from './story.js';
import {smooth} from './motion.js';
import {stroke} from './scenery.js';
const TAU=Math.PI*2;
function plate(ctx,points,fill='#46544f',line='#34443d',weight=1.7){
  ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fillStyle=fill;ctx.fill();
  ctx.strokeStyle=line;ctx.lineWidth=weight;ctx.lineJoin='round';ctx.stroke();
}
function segment(ctx,a,b,ra,rb,fill){
  const angle=Math.atan2(b[1]-a[1],b[0]-a[0]),nx=-Math.sin(angle),ny=Math.cos(angle);
  plate(ctx,[[a[0]+nx*ra,a[1]+ny*ra],[b[0]+nx*rb,b[1]+ny*rb],[b[0]-nx*rb,b[1]-ny*rb],[a[0]-nx*ra,a[1]-ny*ra]],fill);
  stroke(ctx,[[a[0]+nx*ra*.55,a[1]+ny*ra*.55],[b[0]+nx*rb*.5,b[1]+ny*rb*.5]],'#819085',.8);
}
function wing(ctx,root,open,flap,far=false,sweep=0){
  ctx.save();ctx.translate(...root);ctx.scale(far?.78:1,far?.86:1);
  // Swing the entire articulated wing around its shoulder, preserving membrane anatomy.
  ctx.rotate(-sweep/68*2.3);
  const elbow=[28,-70*open+flap],tip=[116,-145*open+flap],outer=[181,-48*open];
  plate(ctx,[[0,0],elbow,tip,outer,[141,-26],[112,-48*open],[81,-10],[60,-32*open],[28,8]],far?'#b3beb0':'#a0afa0',far?'#8e9f90':'#667e6d',1.4);
  const tips=[outer,[112,-48*open],[60,-32*open],[28,8]];
  for(const end of tips){stroke(ctx,[tip,[end[0]-12,(tip[1]+end[1])*.47],end],far?'#91a48f':'#728973',1.3);}
  stroke(ctx,[[0,0],elbow,tip,outer],far?'#7b8e7d':'#445d4c',3.4);
  plate(ctx,[[tip[0]-4,tip[1]+2],[tip[0]+13,tip[1]-13],[tip[0]+7,tip[1]+6]],'#d2d7bf','#6b7e68',1);
  // Sparse folds in the membrane follow its bones, rather than a solid triangular wing.
  for(let i=0;i<3;i++)stroke(ctx,[[elbow[0]+i*12,elbow[1]+12],[tip[0]-15+i*8,tip[1]+30+i*14]],'#b8c4b0',.7);
  ctx.restore();
}
function claw(ctx,hip,knee,ankle,far=false){
  const color=far?'#65776a':'#4b5f50';segment(ctx,hip,knee,8,6,color);segment(ctx,knee,ankle,6,3,color);
  for(let j=0;j<3;j++)plate(ctx,[[ankle[0]-3+j*5,ankle[1]-3],[ankle[0]-9+j*6,ankle[1]+2],[ankle[0]-4+j*6,ankle[1]+2],[ankle[0]+2+j*5,ankle[1]-1]],'#d1d5bd','#71856f',.8);
}
export function drawDragon(ctx,x,y,{time=0,p=0,action='idle',resolve=0,reduced=false,scale=1,reveal=1}={}){
  const calm=smooth(clamp(resolve)),pulse=reduced?0:Math.sin(time*1.7)*1.6;
  const attack=Math.sin(clamp(p)*Math.PI)**2,recoil=action==='spin'?-smooth(p/.65)*40+smooth((p-.7)/.3)*48:action==='lunge'?-attack*19:0;
  const flap=reduced?0:Math.sin(time*1.15)*4,open=(.55+.45*smooth(reveal))*(1-calm*.57);
  ctx.save();ctx.translate(x+recoil*scale,y);ctx.scale(scale,scale);
  // Long tapering tail, with overlapping armored sections and a small spear-shaped tip.
  const tail=[[85,-66+pulse],[121,-52],[154,-42],[181,-52],[206,-69+(reduced?0:Math.sin(time*.9)*6)]];
  for(let i=0;i<tail.length-1;i++){segment(ctx,tail[i],tail[i+1],10-i*2,8-i*2,'#687b68');if(i<3){const [tx,ty]=tail[i+1];plate(ctx,[[tx-6,ty-6],[tx-3,ty-17],[tx+4,ty-8]],'#a9b59e','#657b63',.8);}}
  const tip=tail.at(-1);plate(ctx,[[tip[0]-5,tip[1]+4],[tip[0]+20,tip[1]-12],[tip[0]+9,tip[1]+8]],'#a9b79f','#526d56',1);
  wing(ctx,[46,-90+pulse],open,flap,true);
  claw(ctx,[70,-69],[99,-38],[88,-3],true);claw(ctx,[24,-72],[4,-39],[5,-3],true);
  const bodyY=pulse+calm*7;
  plate(ctx,[[6,-86+bodyY],[31,-104+bodyY],[69,-95+bodyY],[97,-78+bodyY],[91,-57+bodyY],[59,-49+bodyY],[22,-59+bodyY]],'#4e6253');
  plate(ctx,[[15,-76+bodyY],[46,-73+bodyY],[79,-60+bodyY],[58,-50+bodyY],[25,-59+bodyY]],'#9aaa90','#687f67',1.1);
  for(let i=0;i<5;i++){const bx=26+i*11;stroke(ctx,[[bx,-67+bodyY],[bx+4,-55+bodyY]],'#6e846b',.8);}
  // Facets, shoulder plates, and vertebral spines make the silhouette readable at game scale.
  for(let i=0;i<6;i++){
    const bx=27+i*10,by=-101+i*3+bodyY;
    plate(ctx,[[bx-5,by+5],[bx-2,by-12+i],[bx+6,by+8]],'#a2b297','#60775e',.9);
    stroke(ctx,[[bx-3,by+16],[bx+4,by+12],[bx+9,by+18]],'#849880',.8);
  }
  const neck=[[22,-83+bodyY],[5,-103+bodyY],[-20,-124+calm*23],[-51,-130+calm*47]];
  for(let i=0;i<3;i++){
    segment(ctx,neck[i],neck[i+1],13-i*2,11-i*2,i%2?'#657b65':'#536c55');
    const [nx,ny]=neck[i+1];plate(ctx,[[nx+2,ny-8],[nx+11,ny-23],[nx+15,ny-9]],'#acb99e','#687c60',.8);
  }
  ctx.save();ctx.translate(-58,-133+calm*49+pulse*.4);ctx.rotate(-calm*.24+(action==='fire'?-attack*.06:0));
  const jaw=action==='fire'?6+attack*6:action==='lunge'?attack*7:0;
  plate(ctx,[[-43,6],[-42,14+jaw],[-18,19+jaw],[2,11],[1,4]],'#a3b197','#576f54',1.4);
  plate(ctx,[[-42,2],[-35,-13],[-15,-23],[6,-20],[13,-6],[4,9],[-19,13],[-45,8]],'#445c4a');
  plate(ctx,[[-35,-12],[-15,-23],[6,-20],[-1,-9],[-25,-4]],'#728771','#526e53',1);
  plate(ctx,[[0,-19],[11,-42],[18,-44],[11,-19]],'#ccd1b7','#6e7f63',1.1);
  plate(ctx,[[-14,-21],[-9,-37],[-4,-39],[-6,-20]],'#b9c6a8','#617a5d',.9);
  // Quiet bone-colored eyes; shape and anatomy supply the detail, with no glowing accents.
  plate(ctx,[[-22,-8],[-11,-12],[-7,-8],[-19,-4]],'#d0d5bb','#344d39',.7);
  stroke(ctx,[[-14,-10],[-14,-6]],'#354d3d',1.5);stroke(ctx,[[-38,1],[-33,-1]],'#273e30',1.8);
  stroke(ctx,[[-39,9],[-26,10],[-16,8]],'#d4d9c0',.8);
  for(let i=0;i<3;i++)plate(ctx,[[-32+i*7,10],[-30+i*7,14+jaw*.3],[-27+i*7,9]],'#d2d8bf','#839579',.5);
  stroke(ctx,[[0,-4],[5,-2],[2,3]],'#8a9e83',.8);ctx.restore();
  wing(ctx,[35,-87+bodyY],open,flap,false,action==='wing'?attack*68:0);
  claw(ctx,[72,-67+bodyY],[80,-33],[70,-3]);
  const swipe=action==='lunge'||action==='parry'?attack:0;
  claw(ctx,[20,-65+bodyY],[-3-swipe*27,-39-swipe*10],[-8-swipe*66,-3-swipe*37]);
  // The chain breaks under the finishing sweep; the dragon folds its wings and bows afterward.
  if(calm<1){ctx.globalAlpha=1-calm;for(let i=0;i<6;i++){ctx.beginPath();ctx.ellipse(23+i*5,-73+i*4,4,5,-.7,0,TAU);ctx.strokeStyle='#b5a787';ctx.lineWidth=1.6;ctx.stroke();}ctx.globalAlpha=1;}
  if(action==='spin'&&p>.68){
    const q=clamp((p-.68)/.32);ctx.globalAlpha=(1-q)*.85;
    for(let i=0;i<7;i++){const px=23+(i%3-1)*q*68,py=-76-q*(25+i*9)+q*q*40;plate(ctx,[[px,py],[px+5,py-6],[px+10,py-1],[px+6,py+5]],i%2?'#a6b397':'#627861','#5b7355',.8);}
    ctx.globalAlpha=1;
  }
  ctx.restore();
}
export function drawBreath(ctx,mouth,block,{time=0,strength=1,reduced=false}={}){
  if(strength<=0)return;const dx=block[0]-mouth[0],dy=block[1]-mouth[1],len=Math.hypot(dx,dy),angle=Math.atan2(dy,dx);
  ctx.save();ctx.translate(...mouth);ctx.rotate(angle);ctx.globalAlpha=strength;
  for(let layer=0;layer<3;layer++){
    const spread=22-layer*7,wave=reduced?0:Math.sin(time*17+layer)*4;
    ctx.beginPath();ctx.moveTo(0,-2);ctx.bezierCurveTo(len*.3,-spread*.5+wave,len*.7,-spread-wave,len,-spread*.65);ctx.quadraticCurveTo(len+7,0,len,spread*.65);ctx.bezierCurveTo(len*.7,spread+wave,len*.3,spread*.4-wave,0,2);ctx.closePath();
    ctx.fillStyle=['#df7d4655','#ed9e5280','#f9d483cc'][layer];ctx.fill();
  }
  for(let i=0;i<9;i++){
    const t=(time*(reduced?0:1.6)+i/9)%1,x=t*len,y=Math.sin(t*8+i)*14*t;
    stroke(ctx,[[x-9,y],[x+5,y-2]],i%2?'#ed944e':'#f9d797',1.3);
  }
  ctx.restore();ctx.save();ctx.globalAlpha=strength*.75;
  for(let i=0;i<5;i++){const sign=i%2?1:-1,age=(time*(reduced?0:2)+i*.21)%1;stroke(ctx,[[block[0]+5+age*13,block[1]+sign*age*36],[block[0]+10+age*16,block[1]+sign*(age*36+7)]],'#e1a461',1.3);}
  ctx.restore();
}
