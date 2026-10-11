import {clamp,lerp} from './story.js';

export function leapDuration(token){return token.jumpType==='double'?.82:.48;}
export function jumpLift(p,type){
  if(type!=='double')return Math.sin(p*Math.PI);
  if(p<.32)return .45*Math.sin(p/.32*Math.PI/2);
  const boost=(p-.32)/.68,ease=boost*boost*(3-2*boost);
  return .45*(1-ease)+.75*Math.sin(boost*Math.PI);
}
export function typingFlightRate(prefix,length){return 1+3*clamp(prefix/Math.max(1,length));}
export function sampleLeap(track,index,origin,elapsed,reduced=false,landingFraction=0,override=null){
  const token=override||track.tokens[index],p=clamp(elapsed/leapDuration(token));
  const landingX=token.kind==='fight'||token.stationary?token.endX:lerp(token.x,token.endX,clamp(landingFraction));
  const lift=jumpLift(p,token.jumpType);
  return {x:lerp(origin.x,landingX,p),y:lerp(origin.y,token.y,p)-(reduced?0:lift*token.arc),
    p,index,token,air:reduced?0:lift};
}
// Visible words follow the typing cursor, even while the camera/runner catches up.
export function visibleWords(track,index){
  const cursor=Math.min(index,track.total-1),active=track.tokens[cursor];
  return track.tokens.map((token,i)=>({token,index:i})).filter(({token,index:i})=>
    active.kind==='fight'||active.stationary?i===cursor:token.kind!=='fight'&&!token.stationary&&token.chapter<=active.chapter);
}
