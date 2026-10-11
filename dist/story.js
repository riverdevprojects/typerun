export const STORY={title:'The Last Light',chapters:[
  {title:'The ash woods',kind:'forest',tag:'A blade. A promise.',text:'the forest had forgotten the sun. you dragged an old sword through the ash, following one small light between the trees.'},
  {title:'The broken crossing',kind:'bridge',tag:'A second tap. A second chance.',text:'the bridge was gone. only scattered stones remained. you took a breath, then jumped across the silence, one word at a time.'},
  {title:'The sleeping tower',kind:'tower',tag:'Three steps into the sky.',text:'above the clouds stood a broken tower. three steps hung in the air. 1 2 3 you climbed toward the last lantern.'},
  {title:'The keeper of night',kind:'approach',tag:'Something is waking.',text:'a dragon guarded the flame. its wings unfolded against the moon. you lifted the sword. the night lifted its claws.'},
  {title:'Steel and sparks',kind:'fight',tag:'Stand your ground. Write the fight.',text:'you braced. it struck. you blocked, turned, and slashed. sparks scattered. you ducked beneath its wing, stepped forward, and broke the chain around its heart.'},
  {title:'The first morning',kind:'dawn',tag:'Some things are worth carrying.',text:'the dragon lowered its head. you carried the light to the edge of the world, planted your sword, and watched the first morning bloom.'}
]};
export const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
export const lerp=(a,b,t)=>a+(b-a)*t;
export function createTrack(measure,gap=22){
  const tokens=[],chapters=[];let x=140,y=0;
  for(const [chapter,scene] of STORY.chapters.entries()){
    const start=tokens.length,words=scene.text.split(' ');let fightX=0;
    for(const [local,word] of words.entries()){
      const width=measure(word),prev=tokens.at(-1);
      if(scene.kind==='fight'){
        if(local===0){fightX=x+90;x=fightX;}
        tokens.push({word,width,x:fightX-width/2,endX:fightX,y,chapter,local,kind:scene.kind,jump:false,action:actionFor(word,local)});
        continue;
      }
      const number=/^[123]$/.test(word);
      const superJump=scene.kind==='bridge'&&prev?.word==='jumped';
      const jump=scene.kind==='bridge'&&local>4||number;
      if(number)y-=82;
      x+=(superJump?640:jump?(number?66:80):gap);
      tokens.push({word,width,x,endX:x+width,y,chapter,local,kind:scene.kind,jump,number,superJump,
        fromX:prev?.endX??x,fromY:prev?.y??y,arc:superJump?190:number?(word==='3'?96:80):76});
      x+=width;
    }
    chapters.push({...scene,start,end:tokens.length,anchor:tokens[start].x,y:tokens.at(-1).y});
  }
  return {tokens,chapters,total:tokens.length};
}
function actionFor(word,i){
  if(/blocked|braced|struck/.test(word))return 'parry';
  if(/ducked|beneath|wing/.test(word))return 'duck';
  if(/broke|chain|heart/.test(word))return 'finish';
  return i%3===0?'parry':'slash';
}
// Letters move along a word. Wide gaps are crossed by the separate timed leap.
export function sampleTrack(track,progress,reduced=false,cursor=track.total-1){
  // A fully typed but unsubmitted word still belongs to its current platform.
  const index=clamp(Math.min(Math.floor(progress),cursor),0,track.total-1),p=clamp(progress-index);
  const token=track.tokens[index],prev=track.tokens[index-1];
  const fromX=token.jump?token.x:prev?.endX??token.x,fromY=token.jump?token.y:prev?.y??token.y;
  return {x:lerp(fromX,token.endX,p),y:lerp(fromY,token.y,p),p,index,token,air:0};
}
export function checkpoint(track,index){return track.chapters[track.tokens[clamp(index,0,track.total-1)].chapter].start;}
