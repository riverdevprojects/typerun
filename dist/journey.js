import {clamp} from './story.js';
import {smooth,blendPose} from './motion.js';
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
