export const STORY={title:'The Last Light',chapters:[
  {title:'The ash foothills',label:'Foothills',kind:'forest',climb:50,tag:'An empty lantern. A mountain waiting.',text:'the mountain had forgotten the sun. you carried an empty lantern through the ash woods, following a narrow trail higher between the trees.'},
  {title:'The broken crossing',label:'Crossing',kind:'bridge',climb:25,tag:'A pause in the sentence. A leap in the trail.',text:'the bridge was gone. only scattered stones remained. you took a breath, then jumped across the ravine, climbing higher one word at a time.'},
  {title:'The old watchtower',label:'Watchtower',kind:'tower',climb:100,tag:'Past the old walls. Into the mountain.',text:'above the clouds stood a ruined watchtower. you followed the worn stone path around its walls, toward a hollow in the mountain.'},
  {title:'The sheltered cave',label:'Cave',kind:'cave',climb:20,tag:'The wind falls quiet.',text:'you stepped into the cave, carrying your empty lantern. the wind faded behind you. deep in the stone, a small fire flickered.'},
  {title:'A little fire',label:'Firelight',kind:'hearth',stationaryAfter:'beside',tag:'A little warmth. A little light.',text:'you knelt beside the fire. you lowered the lantern and touched its wick to an ember. a warm flame bloomed behind the glass. you lifted the light and followed a narrow path back into the open air.'},
  {title:'An ember for the sky',label:'Daybreak',kind:'sky',climb:45,stationaryAfter:'lifted',tag:'Hang a little light in the heavens.',text:'above the cave, the ridge opened beneath the stars. you lifted the lantern and hung it in the sky. the ember unfurled into a golden sun, and morning spilled over the mountain.'}
]};
export const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
export const lerp=(a,b,t)=>a+(b-a)*t;
export function punctuationJump(word,stationary=false){return !stationary&&/[.,!?;:]/.test(word.at(-1)||'')?'single':null;}
export function createTrack(measure,gap=22){
  const tokens=[],chapters=[];let x=140,y=0;
  for(const [chapter,scene] of STORY.chapters.entries()){
    const start=tokens.length,words=scene.text.split(' '),stop=scene.stationaryAfter?words.indexOf(scene.stationaryAfter):-1;let stageX=0;
    for(const [local,word] of words.entries()){
      const width=measure(word),prev=tokens.at(-1),jumpType=punctuationJump(prev?.word||'',!!prev?.stationary),jump=!!jumpType;
      if(stop>=0&&local>=stop){
        if(local===stop){stageX=x+35;x=stageX;}
        tokens.push({word,width,x:stageX-width/2,endX:stageX,y,chapter,local,kind:scene.kind,jump:false,jumpType:null,arc:50,stationary:true});continue;
      }
      y-=(scene.climb||0)/(stop>=0?stop:words.length);x+=jump?40:gap;
      tokens.push({word,width,x,endX:x+width,y,chapter,local,kind:scene.kind,jump,jumpType,fromX:prev?.endX??x,fromY:prev?.y??y,arc:Math.max(65,((prev?.y??y)-y)/2+35)});x+=width;
    }
    const at=word=>start+words.indexOf(word)+1;
    chapters.push({...scene,start,end:tokens.length,anchor:tokens[start].x,y:tokens.at(-1).y,
      stop:stop>=0?start+stop:null,kneel:scene.kind==='hearth'?at('knelt'):null,
      lower:scene.kind==='hearth'?at('lowered'):null,ignite:scene.kind==='hearth'?at('ember.'):null,raise:scene.kind==='hearth'?at('lifted'):null,
      fireX:scene.kind==='hearth'?stageX+62:null,
      reach:scene.kind==='sky'?at('lifted'):null,hang:scene.kind==='sky'?at('sky.'):null,skyX:scene.kind==='sky'?stageX+8:null});
  }
  return {tokens,chapters,total:tokens.length};
}
export function sampleTrack(track,progress,reduced=false,cursor=track.total-1){
  const index=clamp(Math.min(Math.floor(progress),cursor),0,track.total-1),p=clamp(progress-index),token=track.tokens[index],prev=track.tokens[index-1],jumping=token.jump&&!token.skipJump;
  const fromX=jumping?(token.stationary?token.endX:token.x):prev?.endX??token.x,fromY=jumping?token.y:prev?.y??token.y;
  return {x:lerp(fromX,token.endX,p),y:lerp(fromY,token.y,p),p,index,token,air:0};
}
export function checkpoint(track,index){return track.chapters[track.tokens[clamp(index,0,track.total-1)].chapter].start;}
