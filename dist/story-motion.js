import {idlePose,blendPose,smooth} from './motion.js';
// A relaxed bent carrying arm, with the free arm swinging on the other side.
export function carryPose(pose){
  const [nx,ny]=pose.neck,swing=(pose.backHand[0]-pose.backShoulder[0])*.23;
  return {...pose,frontShoulder:[nx+2,ny+4],frontElbow:[nx+12,ny+18],frontHand:[nx+25,ny+17],
    backShoulder:[nx-3,ny+4],backElbow:[nx-10+swing*.5,ny+18],backHand:[nx-13+swing,ny+31]};
}
const TUCK={...idlePose(),head:[10,-74],neck:[6,-60],hip:[-3,-37],backShoulder:[3,-57],backElbow:[-13,-46],backHand:[-26,-37],frontShoulder:[8,-56],frontElbow:[19,-45],frontHand:[29,-42],backKnee:[-15,-32],backFoot:[-27,-25],frontKnee:[16,-38],frontFoot:[7,-24]};
export function jumpPose(base,p){return blendPose(base,TUCK,Math.sin(Math.PI*p)**.65);}
export function jumpLandingPose(base,weight=1){
  const compressed={...base};for(const key of Object.keys(base)){const [x,y]=base[key];compressed[key]=key.endsWith('Foot')?[x,y]:key.endsWith('Knee')?[x+(key.startsWith('front')?3:-3),y+2]:[x+3,y+7];}
  return blendPose(base,compressed,weight);
}
export function kneelPose(time=0,lower=0){
  const b=Math.sin(time*1.65)*.5;
  const kneel={...carryPose(idlePose(time)),head:[2,-58-b],neck:[1,-44-b],hip:[-5,-25],frontShoulder:[4,-41],frontElbow:[26,-35],frontHand:[37,-30],backShoulder:[-2,-41],backElbow:[3,-29],backHand:[12,-25],backKnee:[-20,-3],backFoot:[-37,-3],frontKnee:[17,-24],frontFoot:[18,-3]};
  return blendPose(kneel,{...kneel,head:[8,-55-b],neck:[6,-41-b],frontShoulder:[9,-38],frontElbow:[33,-29],frontHand:[51,-25]},smooth(lower));
}
