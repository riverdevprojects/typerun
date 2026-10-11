import {idlePose,blendPose,smooth} from './motion.js';
export function dragPose(pose){
  return {...pose,backShoulder:[2,pose.neck[1]+3],backElbow:[-10,-41],backHand:[-17,-27]};
}
const TUCK={...idlePose(),head:[11,-74],neck:[7,-60],hip:[-3,-37],
  backShoulder:[5,-57],backElbow:[-9,-45],backHand:[-19,-38],
  frontShoulder:[4,-57],frontElbow:[18,-63],frontHand:[26,-70],
  backKnee:[-15,-32],backFoot:[-27,-25],frontKnee:[16,-38],frontFoot:[7,-24]};
export function jumpPose(base,p){return blendPose(base,TUCK,Math.sin(Math.PI*p)**.65);}
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
