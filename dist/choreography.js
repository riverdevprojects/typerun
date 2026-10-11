import {idlePose,blendPose,smooth} from './motion.js';
import {dragPose,combatPose} from './story-motion.js';
import {clamp} from './story.js';
const GUARD=combatPose(0);
const BLOCK={...GUARD,head:[-2,-70],neck:[-3,-56],hip:[-9,-32],
  frontShoulder:[0,-53],frontElbow:[24,-53],frontHand:[31,-75],
  backShoulder:[-5,-53],backElbow:[-20,-42],backHand:[-29,-36],
  backKnee:[-22,-16],backFoot:[-28,-3],frontKnee:[11,-17],frontFoot:[20,-3]};
const WIND={...GUARD,head:[-1,-64],neck:[-4,-50],hip:[-10,-29],
  backShoulder:[-6,-48],backElbow:[-27,-56],backHand:[-24,-75],
  frontShoulder:[-2,-48],frontElbow:[18,-47],frontHand:[27,-55]};
const SWEEP={...GUARD,head:[29,-61],neck:[20,-47],hip:[2,-29],
  backShoulder:[18,-45],backElbow:[37,-43],backHand:[54,-48],
  frontShoulder:[17,-45],frontElbow:[3,-56],frontHand:[-9,-64],
  backKnee:[-13,-16],backFoot:[-25,-3],frontKnee:[26,-17],frontFoot:[39,-3]};
export function fightPhase(token,progress){return clamp((progress-token.beatStart)/Math.max(1,token.beatEnd-token.beatStart));}
export function battlePose(action,p,time=0){
  if(action==='fire'){
    const pose=blendPose(GUARD,BLOCK,smooth(p/.16));
    const brace=Math.sin(time*15)*.6*smooth(p/.16);pose.frontHand[0]+=brace;pose.frontElbow[0]+=brace;return pose;
  }
  if(action==='spin'){
    if(p<.2)return blendPose(BLOCK,WIND,smooth(p/.2));
    if(p<.6)return WIND;
    if(p<.8)return blendPose(WIND,SWEEP,smooth((p-.6)/.2));
    return blendPose(SWEEP,dragPose(idlePose(time)),smooth((p-.8)/.2));
  }
  if(action==='bow')return dragPose(idlePose(time));
  if(action==='wing')return combatPose(p,'duck');
  if(action==='lunge')return combatPose(p,'parry');
  return GUARD;
}
export function battleRotation(action,p){return action==='spin'?Math.PI*2*smooth((p-.2)/.4):0;}
export function battleSword(action,p){
  if(action==='fire')return -2.9;
  if(action==='spin')return -2.9+.8*smooth(p/.2)+2.45*smooth((p-.56)/.24);
  if(action==='bow')return 2.6;
  if(action==='wing')return -.6;
  return -1.4+.4*Math.sin(p*Math.PI);
}
export function fireStrength(p){return smooth(p/.12)*(1-smooth((p-.91)/.09));}
