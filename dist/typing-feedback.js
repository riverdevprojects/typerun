export const ERROR_COLOR='#ca4754',EXTRA_COLOR='#7e2a33',MIN_ACCURACY=85;
export function letterFeedback(expected,typed=''){
  return Array.from({length:Math.max(expected.length,typed.length)},(_,i)=>({
    char:expected[i]??typed[i],state:i>=expected.length?'extra':i>=typed.length?'untyped':expected[i]===typed[i]?'correct':'incorrect'
  }));
}
export function insertedKeys(previous,next,expected){
  let start=0;while(start<previous.length&&start<next.length&&previous[start]===next[start])start++;
  if(next===previous.slice(0,next.length))return [];
  return [...next.slice(start)].map((char,i)=>char===expected[start+i]);
}
export function accuracy(correct,total){return total?correct/total*100:100;}
export function belowMinimum(correct,total){return total>0&&correct*100<MIN_ACCURACY*total;}
export function completedPunctuation(previous,next,expected){
  return next.length===expected.length&&previous.length<next.length&&next.at(-1)===expected.at(-1)&&/[.,!?;:]/.test(next.at(-1)||'');
}
// Extra letters expand the word and the following terrain, as they expand Monkeytype's text layout.
export function updateExtraLayout(track,index,typed,measure){
  const token=track.tokens[index];if(!token||token.stationary)return;
  const width=measure(typed.slice(token.word.length)),delta=width-(token.extraWidth||0);
  if(!delta)return;token.extraWidth=width;token.endX+=delta;
  for(let i=index+1;i<track.total;i++){
    const t=track.tokens[i];t.x+=delta;t.endX+=delta;if(Number.isFinite(t.fromX))t.fromX+=delta;
  }
  for(const chapter of track.chapters){
    chapter.anchor=track.tokens[chapter.start].x;
    if(chapter.kind==='hearth')chapter.fireX=track.tokens[chapter.stop].endX+62;
    if(chapter.kind==='sky')chapter.skyX=track.tokens[chapter.stop].endX+8;
  }
}
