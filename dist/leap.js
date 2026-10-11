import {clamp,lerp} from './story.js';

export const EDGE_TIME=.16;
export const JUMP_WINDOW=.9;
export function checkJump(value,elapsed){
  if(elapsed>=JUMP_WINDOW||!('jump'.startsWith(value)))return 'fall';
  return value==='jump'?'jump':'waiting';
}
// The runner steps off the edge while the command window counts down.
export function sampleEdge(track,index,origin,elapsed){
  const previous=track.tokens[index-1],token=track.tokens[index];
  const runup=clamp(elapsed/EDGE_TIME),drop=clamp((elapsed-EDGE_TIME)/(JUMP_WINDOW-EDGE_TIME));
  return {x:lerp(origin.x,previous.endX,runup)+drop*18,
    y:lerp(origin.y,previous.y,runup)+drop*drop*42,p:0,index,token,air:drop};
}
export function leapDuration(token){return token.number?.68:.58;}
export function sampleLeap(track,index,origin,elapsed,reduced=false){
  const token=track.tokens[index],p=clamp(elapsed/leapDuration(token));
  return {x:lerp(origin.x,token.x,p),y:lerp(origin.y,token.y,p)-(reduced?0:Math.sin(p*Math.PI)*token.arc),
    p,index,token,air:reduced?0:Math.sin(p*Math.PI)};
}
// Visible words follow the typing cursor, even while the camera/runner catches up.
export function visibleWords(track,index){
  const active=track.tokens[Math.min(index,track.total-1)];
  return track.tokens.map((token,i)=>({token,index:i})).filter(({token,index:i})=>
    active.kind==='fight'?i===index:token.kind!=='fight'&&token.chapter<=active.chapter);
}
