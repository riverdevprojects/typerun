import {idlePose,blendPose,smooth} from './motion.js';
export function dragPose(pose){
  return {...pose,backShoulder:[2,pose.neck[1]+3],backElbow:[-10,-41],backHand:[-17,-27]};
}
const TUCK={...idlePose(),head:[11,-74],neck:[7,-60],hip:[-3,-37],
  backShoulder:[5,-57],backElbow:[-9,-45],backHand:[-19,-38],
  frontShoulder:[4,-57],frontElbow:[18,-63],frontHand:[26,-70],
  backKnee:[-15,-32],backFoot:[-27,-25],frontKnee:[16,-38],frontFoot:[7,-24]};
export function jumpPose(base,p){return blendPose(base,TUCK,Math.sin(Math.PI*p)**.65);}
// The boost reads as a second impulse: kick down, pull the knees up, then reach for ground.
const AIR_KICK={...TUCK,head:[15,-78],neck:[9,-64],hip:[-2,-38],
  backShoulder:[7,-61],backElbow:[-10,-54],backHand:[-25,-46],
  frontShoulder:[8,-61],frontElbow:[20,-64],frontHand:[29,-77],
  backKnee:[-17,-22],backFoot:[-29,-5],frontKnee:[20,-40],frontFoot:[8,-24]};
const AIR_TUCK={...AIR_KICK,head:[15,-75],neck:[9,-61],hip:[-5,-37],
  backElbow:[-12,-49],backHand:[-27,-40],frontElbow:[23,-56],frontHand:[29,-67],
  backKnee:[-24,-32],backFoot:[-32,-20],frontKnee:[21,-45],frontFoot:[5,-31]};
const AIR_REACH={...TUCK,head:[9,-74],neck:[4,-60],hip:[-3,-36],
  backElbow:[-10,-43],backHand:[-19,-28],frontElbow:[17,-46],frontHand:[25,-38],
  backKnee:[-13,-22],backFoot:[-19,-9],frontKnee:[14,-21],frontFoot:[21,-5]};
export function jumpLandingPose(base,weight=1){
  const compressed={...base};
  for(const key of Object.keys(base)){
    const [x,y]=base[key];
    compressed[key]=key.endsWith('Foot')?[x,y]:key.endsWith('Knee')?[x+(key.startsWith('front')?3:-3),y+2]:[x+3,y+7];
  }
  return blendPose(base,compressed,weight);
}
export function doubleJumpPose(entry,p,rest=dragPose(idlePose())){
  if(p<.16)return blendPose(entry,AIR_KICK,smooth(p/.16));
  if(p<.42)return blendPose(AIR_KICK,AIR_TUCK,smooth((p-.16)/.26));
  if(p<.82)return blendPose(AIR_TUCK,AIR_REACH,smooth((p-.42)/.4));
  return blendPose(AIR_REACH,jumpLandingPose(rest),smooth((p-.82)/.18));
}
const GUARD={...idlePose(),head:[4,-70],neck:[2,-56],hip:[-3,-32],
  frontShoulder:[3,-54],frontElbow:[14,-43],frontHand:[21,-51],
  backShoulder:[0,-54],backElbow:[-13,-43],backHand:[-5,-35],
  frontKnee:[12,-17],frontFoot:[20,-3],backKnee:[-14,-17],backFoot:[-23,-3]};
const WIND={...GUARD,head:[-2,-71],neck:[-4,-57],frontElbow:[-17,-62],frontHand:[-15,-78],backHand:[-13,-33]};
const SLASH={...GUARD,head:[19,-66],neck:[12,-52],hip:[-1,-31],frontElbow:[27,-47],frontHand:[39,-45],backElbow:[-11,-55],backHand:[-22,-64]};
const FINISH={...SLASH,head:[32,-62],neck:[24,-48],hip:[10,-31],frontElbow:[39,-44],frontHand:[51,-42],frontKnee:[28,-20],frontFoot:[39,-3],backKnee:[-4,-17],backFoot:[-16,-3]};
const PARRY={...GUARD,head:[-3,-66],neck:[-5,-52],frontElbow:[11,-60],frontHand:[20,-73],backElbow:[-16,-48],backHand:[-22,-55]};
const DUCK={...GUARD,head:[10,-47],neck:[4,-33],hip:[-8,-20],frontElbow:[17,-28],frontHand:[27,-36],backElbow:[-18,-25],backHand:[-25,-19],frontKnee:[12,-16],backKnee:[-22,-12]};
export function combatPose(p,action='slash'){
  const hit=action==='duck'?DUCK:action==='parry'?PARRY:action==='finish'?FINISH:SLASH;
  if(p<.28)return blendPose(GUARD,action==='parry'?GUARD:WIND,smooth(p/.28));
  if(p<.58)return blendPose(action==='parry'?GUARD:WIND,hit,smooth((p-.28)/.3));
  return blendPose(hit,GUARD,smooth((p-.58)/.42));
}
export function swordAngle(p,action){
  const start=-1.1,wind=-2.2,hit=action==='parry'?-1.5:action==='duck'?-.6:.35;
  if(p<.28)return start+(wind-start)*smooth(p/.28);
  if(p<.58)return wind+(hit-wind)*smooth((p-.28)/.3);
  return hit+(start-hit)*smooth((p-.58)/.42);
}
export function drawSword(ctx,hand,angle,length=57,color='#6c8277'){
  ctx.save();ctx.translate(...hand);ctx.rotate(angle);ctx.strokeStyle=color;ctx.lineWidth=2;ctx.lineJoin='round';ctx.lineCap='round';
  ctx.fillStyle='#fcfdf9';ctx.beginPath();ctx.moveTo(5,-3);ctx.lineTo(length-9,-3);ctx.lineTo(length,0);ctx.lineTo(length-9,3);ctx.lineTo(5,3);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.beginPath();ctx.moveTo(6,-8);ctx.lineTo(6,8);ctx.moveTo(-7,0);ctx.lineTo(6,0);ctx.stroke();ctx.restore();
}
export function victoryPose(time){
  const pose=idlePose(time);return {...pose,frontElbow:[10,-52],frontHand:[19,-63],backElbow:[-10,-43],backHand:[-11,-30]};
}
