export const STORY={title:'The Last Light',chapters:[
  {title:'The ash foothills',kind:'forest',climb:50,tag:'The mountain is waiting.',text:'the mountain had forgotten the sun. you dragged an old sword through the ash woods, following a narrow trail higher between the trees.'},
  {title:'The broken crossing',kind:'bridge',climb:25,tag:'A second tap. A second chance.',text:'the bridge was gone. only scattered stones remained. you took a breath, then jumped across the ravine, climbing higher one word at a time.'},
  {title:'The mountain steps',kind:'tower',climb:55,tag:'Above the clouds. Toward the summit.',text:'above the clouds stood a ruined watchtower. three steps hung along the mountainside. 1 2 3 you climbed into the thin, silent air.'},
  {title:'The keeper of the cave',kind:'approach',climb:60,tag:'The last gate to morning.',text:'near the summit, a dragon guarded a dark cave. its great wings unfolded against the moon. you lifted the sword. the keeper lowered its horns.'},
  {title:'Steel and fire',kind:'fight',tag:'Hold the fire. Turn the tide.',beats:[
    {action:'guard',text:'you planted your feet and raised the sword.'},
    {action:'lunge',text:'the dragon lunged. you caught its claws on steel.'},
    {action:'wing',text:'its wing swept low. you ducked beneath the storm.'},
    {action:'fire',text:'it breathed fire. you raised one arm and held the flames at bay.'},
    {action:'spin',text:'with your other hand, you spun and unleashed a sweeping strike.'},
    {action:'bow',text:'the blade shattered its armor. the dragon bowed and opened the way.'}
  ]},
  {title:'The lantern cave',kind:'cave',tag:'A small light in the stone.',text:'inside the cave, a lantern waited on a stone pedestal. you lowered the sword and lifted the lantern. its small flame showed the path back to the summit.'},
  {title:'The first morning',kind:'dawn',climb:75,stationaryAfter:'hung',tag:'Carry the light a little higher.',text:'you climbed the final ridge. at the highest point stood a weathered signpost. you hung the lantern on its hook, and the sun rose over the mountain.'}
]};
for(const chapter of STORY.chapters)if(chapter.beats)chapter.text=chapter.beats.map(b=>b.text).join(' ');
export const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
export const lerp=(a,b,t)=>a+(b-a)*t;
export function createTrack(measure,gap=22){
  const tokens=[],chapters=[];let x=140,y=0;
  for(const [chapter,scene] of STORY.chapters.entries()){
    const start=tokens.length,words=scene.text.split(' ');let fightX=0;
    const beats=[];let beatOffset=start;
    for(const beat of scene.beats||[]){const end=beatOffset+beat.text.split(' ').length;beats.push({...beat,start:beatOffset,end});beatOffset=end;}
    const stop=scene.stationaryAfter?words.indexOf(scene.stationaryAfter):-1;
    for(const [local,word] of words.entries()){
      const width=measure(word),prev=tokens.at(-1);
      if(scene.kind==='fight'){
        if(local===0){fightX=x+90;x=fightX;}
        const beat=beats.find(b=>tokens.length<b.end);
        tokens.push({word,width,x:fightX-width/2,endX:fightX,y,chapter,local,kind:scene.kind,jump:false,action:beat.action,beatStart:beat.start,beatEnd:beat.end});
        continue;
      }
      if(stop>=0&&local>=stop){
        if(local===stop){fightX=x+35;x=fightX;}
        tokens.push({word,width,x:fightX-width/2,endX:fightX,y,chapter,local,kind:scene.kind,jump:false,stationary:true});continue;
      }
      const number=/^[123]$/.test(word);
      y-=(scene.climb||0)/(stop>=0?stop:words.length);
      const superJump=scene.kind==='bridge'&&prev?.word==='jumped';
      const jump=scene.kind==='bridge'&&local>4||number;
      if(number)y-=82;
      x+=(superJump?640:jump?(number?66:80):gap);
      tokens.push({word,width,x,endX:x+width,y,chapter,local,kind:scene.kind,jump,number,superJump,
        fromX:prev?.endX??x,fromY:prev?.y??y,arc:superJump?190:number?(word==='3'?96:80):76});
      x+=width;
    }
    const pickup=scene.kind==='cave'?start+words.lastIndexOf('lantern.')+1:null;
    chapters.push({...scene,start,end:tokens.length,anchor:tokens[start].x,y:tokens.at(-1).y,pickup,pickupX:pickup?tokens[pickup-1].endX:null,
      hang:stop>=0?start+stop:null,hook:stop>=0?start+words.indexOf('hook,')+1:null});
  }
  return {tokens,chapters,total:tokens.length};
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
