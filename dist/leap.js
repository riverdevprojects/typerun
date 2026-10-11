import {clamp,lerp} from './story.js';

export const EDGE_TIME=.16;
export const JUMP_WINDOW=.9;
export function checkJump(key,elapsed){
  if(elapsed>=JUMP_WINDOW)return 'fall';
  return key==='Space'?'jump':key===null?'waiting':'fall';
}
// The first Space starts a hop; a fresh Space press boosts it before the drop.
export function sampleEdge(track,index,origin,elapsed){
  const previous=track.tokens[index-1],token=track.tokens[index];
  const runup=clamp(elapsed/EDGE_TIME),drop=clamp((elapsed-EDGE_TIME)/(JUMP_WINDOW-EDGE_TIME));
  return {x:lerp(origin.x,previous.endX,runup)+drop*18,
    y:lerp(origin.y,previous.y,runup)-Math.sin(clamp(elapsed/JUMP_WINDOW)*Math.PI)*42+drop*drop*42,
    p:clamp(elapsed/JUMP_WINDOW),index,token,air:Math.sin(clamp(elapsed/JUMP_WINDOW)*Math.PI)};
}
export function leapDuration(token){return token.superJump?1.3:token.number?.68:.58;}
export function typingFlightRate(prefix,length){return 1+3*clamp(prefix/Math.max(1,length));}
export function sampleLeap(track,index,origin,elapsed,reduced=false,landingFraction=0){
  const token=track.tokens[index],p=clamp(elapsed/leapDuration(token));
  const landingX=lerp(token.x,token.endX,clamp(landingFraction));
  return {x:lerp(origin.x,landingX,p),y:lerp(origin.y,token.y,p)-(reduced?0:Math.sin(p*Math.PI)*token.arc),
    p,index,token,air:reduced?0:Math.sin(p*Math.PI)};
}
// Visible words follow the typing cursor, even while the camera/runner catches up.
export function visibleWords(track,index){
  const cursor=Math.min(index,track.total-1),active=track.tokens[cursor];
  return track.tokens.map((token,i)=>({token,index:i})).filter(({token,index:i})=>
    active.kind==='fight'||active.stationary?i===cursor:token.kind!=='fight'&&!token.stationary&&token.chapter<=active.chapter);
}
