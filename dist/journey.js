import {clamp} from './story.js';
import {smooth,blendPose,idlePose} from './motion.js';
import {kneelPose} from './story-motion.js';
export function hearthState(scene,progress,ignitionAge=-1){
  const kneel=smooth((progress-scene.kneel)/3),lower=smooth((progress-scene.lower)/Math.max(1,scene.ignite-scene.lower));
  const raise=smooth((progress-scene.raise)/3);
  return {kneel:kneel*(1-raise),lower,lit:ignitionAge<0?0:smooth(clamp(ignitionAge/.7))};
}
export function hearthPose(base,scene,progress,time,ignitionAge){
  const state=hearthState(scene,progress,ignitionAge);
  return blendPose(base,kneelPose(time,state.lower),state.kneel);
}
// A landmark uses continuous world coordinates, never a modulo offset.
export function landmarkX(width,worldX,cameraX,factor=.16){return width*.78+(worldX-cameraX)*factor;}
export const SUN_DURATION=6.3;
export function sunState(age,reduced=false){
  if(age<0)return {rise:0,unfold:0,grow:0,day:0,phase:'waiting'};
  const t=reduced?age*7:age;
  return {rise:smooth(t/1.1),unfold:smooth((t-1.1)/1.4),grow:smooth((t-2.1)/2.8),day:smooth((t-2)/3.2),
    phase:t<1.1?'lifting':t<2.5?'opening':t<5.2?'igniting':'day'};
}
export function skyPose(base,scene,progress,time,age){
  const reach=smooth((progress-scene.reach)/3),release=age<0?0:smooth((age-1)/1.4);
  const up={...idlePose(time),head:[-1,-74],neck:[0,-60],frontShoulder:[2,-56],frontElbow:[14,-76],frontHand:[20,-94],backShoulder:[-3,-56],backElbow:[-11,-42],backHand:[-14,-29]};
  return blendPose(blendPose(base,up,reach),idlePose(time),release);
}
