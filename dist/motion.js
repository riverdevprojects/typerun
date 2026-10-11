const TAU=Math.PI*2;
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
export const smooth=t=>{t=clamp(t);return t*t*(3-2*t);};
export function blendPose(a,b,t){
  const pose={};for(const key of Object.keys(a))pose[key]=a[key].map((v,i)=>lerp(v,b[key][i],clamp(t)));return pose;
}

export function idlePose(time=0){
  const breath=Math.sin(time*1.7)*.45;
  return {head:[2,-72+breath],neck:[1,-58+breath],hip:[-1,-34],
    backShoulder:[3,-55+breath],backElbow:[10,-42+breath],backHand:[12,-29+breath],
    frontShoulder:[-2,-55+breath],frontElbow:[-8,-42+breath],frontHand:[-10,-28+breath],
    backKnee:[-6,-18],backFoot:[-8,-3],frontKnee:[5,-18],frontFoot:[8,-3]};
}

// Contact, compression, passing, toe-off, and a folded swing leg.
// The second leg follows half a cycle later. Cubic interpolation keeps velocity continuous.
const LEG=[
  {knee:[12,-21],foot:[23,-3]},
  {knee:[8,-16],foot:[11,-3]},
  {knee:[-3,-18],foot:[-3,-3]},
  {knee:[-15,-21],foot:[-21,-4]},
  {knee:[-20,-26],foot:[-29,-17]},
  {knee:[-8,-21],foot:[-21,-34]},
  {knee:[13,-25],foot:[0,-30]},
  {knee:[18,-25],foot:[24,-15]}
];
function cubic(a,b,c,d,t){return .5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t);}
const WALK_LEG=[
  {knee:[6,-19],foot:[13,-3]},
  {knee:[3,-18],foot:[7,-3]},
  {knee:[-1,-18],foot:[0,-3]},
  {knee:[-6,-19],foot:[-7,-3]},
  {knee:[-11,-20],foot:[-13,-3]},
  {knee:[-13,-20],foot:[-17,-4]},
  {knee:[-4,-19],foot:[-8,-13]},
  {knee:[6,-19],foot:[9,-10]}
];
function legAt(phase,keys=LEG,stance=.375,lift=31){
  const f=((phase/TAU)%1+1)%1*keys.length,i=Math.floor(f),t=f-i;
  const result={};
  for(const joint of ['knee','foot'])result[joint]=[0,1].map(axis=>cubic(keys[(i+7)%8][joint][axis],keys[i][joint][axis],keys[(i+1)%8][joint][axis],keys[(i+2)%8][joint][axis],t));
  const swing=clamp((f/keys.length-stance)/(1-stance));
  // A flat stance and a squared-sine swing meet with zero vertical velocity.
  // Clipping a cubic at ground height would introduce a visible landing jerk.
  result.foot[1]=-3-Math.sin(Math.PI*swing)**2*lift;return result;
}
function arm(shoulder,angle,bend=1.05){
  const elbow=[shoulder[0]+Math.sin(angle)*15,shoulder[1]+Math.cos(angle)*15];
  // Hands point forward; the bend is authored rather than choosing the wrong IK branch.
  const forearm=angle+bend;
  return {elbow,hand:[elbow[0]+Math.sin(forearm)*15,elbow[1]+Math.cos(forearm)*15]};
}
export function walkPose(phase){
  const bounce=Math.cos(phase*2)*.55;
  // More than half of each step is planted: walking always has a supporting foot.
  const back=legAt(phase+Math.PI,WALK_LEG,.6,11),front=legAt(phase,WALK_LEG,.6,11);
  const backShoulder=[3,-55+bounce],frontShoulder=[-2,-55+bounce];
  const backArm=arm(backShoulder,Math.cos(phase)*.32-.04,.12);
  const frontArm=arm(frontShoulder,-Math.cos(phase)*.32-.04,.12);
  return {head:[2,-72+bounce],neck:[1,-58+bounce],hip:[-1,-34+bounce],
    backShoulder,backElbow:backArm.elbow,backHand:backArm.hand,
    frontShoulder,frontElbow:frontArm.elbow,frontHand:frontArm.hand,
    backKnee:back.knee,backFoot:back.foot,frontKnee:front.knee,frontFoot:front.foot};
}
export function runningBlend(speed){return smooth((Math.abs(speed)-52)/44);}
export function strideLength(runBlend){return lerp(70,104,clamp(runBlend));}
export function runPose(phase,intensity=1){
  const bounce=Math.cos(phase*2)*1.4, lean=clamp(intensity)*2;
  const back=legAt(phase+Math.PI),front=legAt(phase);
  const backShoulder=[5+lean,-56+bounce],frontShoulder=[2+lean,-56+bounce];
  const backArm=arm(backShoulder,Math.cos(phase)*.9-.25);
  const frontArm=arm(frontShoulder,-Math.cos(phase)*.9-.25);
  return {head:[7+lean,-72+bounce],neck:[5+lean,-58+bounce],hip:[-3,-35+bounce],
    backShoulder,backElbow:backArm.elbow,backHand:backArm.hand,
    frontShoulder,frontElbow:frontArm.elbow,frontHand:frontArm.hand,
    backKnee:back.knee,backFoot:back.foot,frontKnee:front.knee,frontFoot:front.foot};
}
const TRIP={head:[26,-57],neck:[17,-44],hip:[-5,-31],
  backShoulder:[15,-43],backElbow:[-1,-52],backHand:[-16,-55],
  frontShoulder:[15,-44],frontElbow:[29,-51],frontHand:[39,-61],
  backKnee:[-20,-24],backFoot:[-31,-16],frontKnee:[14,-20],frontFoot:[26,-3]};
const CATCH={head:[21,-58],neck:[13,-45],hip:[-4,-29],
  backShoulder:[11,-44],backElbow:[0,-34],backHand:[-13,-29],
  frontShoulder:[11,-44],frontElbow:[26,-39],frontHand:[36,-29],
  backKnee:[-9,-15],backFoot:[-15,-3],frontKnee:[18,-17],frontFoot:[28,-3]};
export function tripPose(entry,base,p){
  if(p<.23)return blendPose(entry,TRIP,smooth(p/.23));
  if(p<.55)return blendPose(TRIP,CATCH,smooth((p-.23)/.32));
  return blendPose(CATCH,base,smooth((p-.55)/.45));
}
const FALL={head:[1,-71],neck:[0,-57],hip:[-3,-35],
  backShoulder:[-2,-54],backElbow:[-18,-62],backHand:[-26,-78],
  frontShoulder:[2,-54],frontElbow:[18,-65],frontHand:[24,-79],
  backKnee:[-20,-30],backFoot:[-29,-15],frontKnee:[14,-29],frontFoot:[28,-22]};
export function fallPose(entry,p,reduced=false){
  const pose=blendPose(entry,FALL,smooth(p/.34));
  if(reduced)return pose;
  const settle=smooth(p/.34),angle=(Math.sin(p*7)*.12+p*.65)*settle;
  const cos=Math.cos(angle),sin=Math.sin(angle);
  for(const joint of Object.keys(pose)){
    const [x,y]=pose[joint],dy=y+35;pose[joint]=[x*cos-dy*sin,x*sin+dy*cos-35];
  }
  return pose;
}
const PRONE={head:[29,-14],neck:[14,-8],hip:[-11,-8],
  backShoulder:[12,-8],backElbow:[1,-5],backHand:[-10,-3],
  frontShoulder:[12,-8],frontElbow:[23,-5],frontHand:[35,-3],
  backKnee:[-25,-6],backFoot:[-39,-3],frontKnee:[-18,-13],frontFoot:[-31,-3]};
const PUSHUP={head:[13,-37],neck:[5,-24],hip:[-17,-17],
  backShoulder:[3,-24],backElbow:[-5,-13],backHand:[2,-3],
  frontShoulder:[7,-24],frontElbow:[19,-14],frontHand:[24,-3],
  backKnee:[-24,-4],backFoot:[-39,-3],frontKnee:[-10,-5],frontFoot:[-24,-3]};
const KNEEL={head:[-1,-58],neck:[-3,-44],hip:[-13,-23],
  backShoulder:[-5,-43],backElbow:[-14,-31],backHand:[-8,-19],
  frontShoulder:[-1,-43],frontElbow:[10,-32],frontHand:[13,-19],
  backKnee:[-20,-5],backFoot:[-35,-3],frontKnee:[9,-23],frontFoot:[16,-3]};
const CROUCH={head:[12,-53],neck:[5,-39],hip:[-10,-23],
  backShoulder:[2,-38],backElbow:[-10,-30],backHand:[-19,-22],
  frontShoulder:[6,-38],frontElbow:[17,-29],frontHand:[23,-20],
  backKnee:[-17,-14],backFoot:[-13,-3],frontKnee:[13,-16],frontFoot:[19,-3]};
export function landPose(entry,p,complete=false){return blendPose(entry,complete?CROUCH:PRONE,smooth(p/.42));}
export function risePose(p,time=0,complete=false){
  const idle=idlePose(time);
  if(complete)return blendPose(CROUCH,idle,smooth(p));
  if(p<.34)return blendPose(PRONE,PUSHUP,smooth(p/.34));
  if(p<.68)return blendPose(PUSHUP,KNEEL,smooth((p-.34)/.34));
  return blendPose(KNEEL,idle,smooth((p-.68)/.32));
}
export function drawFigure(ctx,pose,color='#ed722e'){
  ctx.strokeStyle=color;ctx.lineWidth=4.6;ctx.lineCap='round';ctx.lineJoin='round';
  function stroke(joints){ctx.beginPath();joints.forEach((joint,i)=>i?ctx.lineTo(...pose[joint]):ctx.moveTo(...pose[joint]));ctx.stroke();}
  stroke(['backShoulder','backElbow','backHand']);stroke(['hip','backKnee','backFoot']);
  stroke(['neck','hip']);stroke(['hip','frontKnee','frontFoot']);stroke(['frontShoulder','frontElbow','frontHand']);
  ctx.lineWidth=4.4;ctx.beginPath();ctx.arc(...pose.head,10,0,TAU);ctx.stroke();
}

// Critically damped travel, with a continuous velocity across individual key presses.
export function advanceTravel(position,velocity,target,dt,response=.105){
  const omega=2/response,change=position-target,decay=Math.exp(-omega*dt);
  const temp=(velocity+omega*change)*dt;
  return {position:target+(change+temp)*decay,velocity:(velocity-omega*temp)*decay};
}
