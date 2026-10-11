import {idlePose,walkPose,runPose,runningBlend,strideLength,blendPose,tripPose,fallPose,landPose,risePose,drawFigure,advanceTravel,smooth} from './motion.js';
import {STORY,createTrack,sampleTrack,checkpoint,clamp,lerp,punctuationJump} from './story.js';
import {carryPose,jumpPose,jumpLandingPose} from './story-motion.js';
import {paintScene,stroke,drawLantern,drawCampfire} from './scenery.js';
import {hearthState,hearthPose} from './journey.js';
import {letterFeedback,insertedKeys,accuracy,belowMinimum,completedPunctuation,updateExtraLayout,ERROR_COLOR,EXTRA_COLOR} from './typing-feedback.js';
import {sampleLeap,leapDuration,typingFlightRate,visibleWords} from './leap.js';
const $=id=>document.getElementById(id),canvas=$('stage'),ctx=canvas.getContext('2d'),input=$('typing');
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,orange='#ed722e';
const ease=(rate,dt)=>1-Math.exp(-rate*dt);
let width=1000,height=420,fontSize=28,charWidth=17,floor=265,track;
let index=0,typed='',progress=0,progressVelocity=0,target=0,mode='ready',paused=false;
let cameraX=0,cameraY=0,lastTime=0,time=0,elapsed=0,started=false;
let gait=0,pace=0,gaitMix=0,moveMix=0,renderedPose=idlePose(),entryPose=renderedPose;
let timer=0,fallOrigin=null,checkpointIndex=0,accepted=0,correct=0,attempted=0,falls=0,jumps=0;
let sound=false,audio=null,best=0,particles=[],lastStats=0,sceneKind='forest',previousKind='forest',sceneFade=1;
let leapOrigin=null,flightToken=null;
let flightRate=1,landingFraction=0,deferredWord=null,deferredKeys=[],resumeBlend=1,resumePose=renderedPose;
let landingAge=1;
let ignitionAge=-1;
let chapterCorrect=0,chapterInputs=0,wordHistory=new Map();
function expandWord(i,value){ctx.font=`${fontSize}px "Space Mono",Consolas,monospace`;updateExtraLayout(track,i,value,text=>ctx.measureText(text).width);}
function recordKeys(keys){
  for(const good of keys){attempted++;chapterInputs++;if(good){correct++;chapterCorrect++;}}
  stats();
  if(belowMinimum(chapterCorrect,chapterInputs)){fall(`Chapter accuracy fell to ${accuracy(chapterCorrect,chapterInputs).toFixed(1)}%. Back to the chapter's beginning.`);return false;}
  return true;
}
function clearChapter(){
  const scene=track.chapters[track.tokens[Math.min(index,track.total-1)].chapter];
  for(let i=scene.start;i<scene.end;i++){expandWord(i,'');wordHistory.delete(i);delete track.tokens[i].skipJump;}
  chapterCorrect=0;chapterInputs=0;
}
try{best=Number(localStorage.getItem('typerun-v2-best')||0)||0;}catch{}
function expected(){return track.tokens[index]?.word||'';}
function available(){return !paused&&['ready','playing','stumble','leaping','recover'].includes(mode)&&index<track.total;}
function inFlight(){return mode==='leaping';}
function interruptRecovery(){
  if(mode!=='recover')return;
  resumePose=renderedPose;resumeBlend=0;mode='playing';timer=0;moveMix=0;pace=0;gaitMix=0;
}
function currentSample(){
  if(mode==='leaping')return sampleLeap(track,Math.min(index,track.total-1),leapOrigin,timer,reduced,landingFraction,flightToken);
  if(mode==='falling')return {...fallOrigin,y:fallOrigin.y+(reduced?150:340)*(timer/.8)**2};
  return sampleTrack(track,progress,reduced,index);
}
function fall(message){
  fallOrigin=currentSample();falls++;checkpointIndex=checkpoint(track,index);entryPose=renderedPose;
  mode='falling';timer=0;input.disabled=true;typed='';input.value='';
  deferredWord=null;deferredKeys=[];resumeBlend=1;
  ignitionAge=-1;
  burst(fallOrigin.x,fallOrigin.y+12,'',9);feedback(message,'error');status('A slip into the margins');tone(100,.3,.045);stats();
}
function launch(origin,type){
  const token=track.tokens[Math.min(index,track.total-1)];
  flightToken={...token,jumpType:type};
  if(index===track.total)flightToken={...flightToken,x:token.endX};
  leapOrigin=origin;entryPose=renderedPose;mode='leaping';timer=0;jumps++;
  flightRate=1;landingFraction=index===track.total?1:0;
  progress=index;progressVelocity=0;input.disabled=false;
  canvas.dataset.jumpKind=type;
  tone(420,.09);status('A little punctuation. A little leap.');stats();
}
function pressSpace(key){
  if(!available())return;
  if(deferredWord!==null){deferredKeys.push({key});input.value='';return;}
  commit();
}
function land(){
  progress=Math.min(track.total,index+landingFraction);progressVelocity=0;mode=index===track.total?'finishing':'playing';timer=0;moveMix=0;pace=0;gaitMix=0;
  landingAge=0;
  input.disabled=index===track.total;feedback('');flightToken=null;canvas.dataset.jumpKind='';
  if(deferredWord!==null){
    const word=deferredWord,keys=deferredKeys;deferredWord=null;deferredKeys=[];
    typed=word;input.value=word;commit(true);
    for(const event of keys){
      if(event.key)pressSpace(event.key);
      else{input.value=event.value;onInput();}
    }
  }
  if(available())input.focus({preventScroll:true});
}
function status(text){if($('state-label').textContent.trim()===text)return;$('state-label').replaceChildren();const dot=document.createElement('span');dot.className='status-dot';$('state-label').append(dot,document.createTextNode(text));}
function feedback(text,kind=''){$('feedback').textContent=text;$('feedback').className=`scene-toast ${kind}`;}
function metadata(){
  const chapter=track.tokens[Math.min(index,track.total-1)].chapter,scene=track.chapters[chapter];
  $('story-number').textContent=String(chapter+1).padStart(2,'0');$('story-title').textContent=scene.title;
  $('scene-caption').textContent=scene.tag;$('story-text').textContent=STORY.title+'. '+scene.text;
  $('chapter-copy').textContent=scene.text;input.placeholder=expected();
  $('active-word').textContent=expected();
  for(const [i,node] of [...document.querySelectorAll('.chapter')].entries()){
    node.classList.toggle('active',i===chapter);node.classList.toggle('finished',i<chapter||mode==='complete');
    if(i===chapter)node.setAttribute('aria-current','step');else node.removeAttribute('aria-current');
  }
  $('progress-fill').style.width=`${index/track.total*100}%`;
  $('progress-label').textContent=`${Math.round(index/track.total*100)}% of the journey`;
}
function stats(){
  const wpm=elapsed?Math.round(accepted*60/elapsed):0,acc=Math.floor(accuracy(chapterCorrect,chapterInputs));
  $('wpm').textContent=wpm;$('accuracy').innerHTML=`${acc}<span class="unit">%</span>`;$('distance').textContent=accepted;
  canvas.dataset.chapterAccuracy=accuracy(chapterCorrect,chapterInputs).toFixed(2);
  if(accepted>=10&&wpm>best){best=wpm;try{localStorage.setItem('typerun-v2-best',String(best));}catch{}}
  $('session-note').textContent=`${jumps} jumps · ${falls} falls · best ${best} wpm`;
  $('ending-stats').textContent=`${wpm} WPM · ${Math.round(accuracy(correct,attempted))}% accuracy · ${jumps} jumps · ${falls} falls`;
}
function tone(frequency,duration=.07,volume=.025){
  if(!sound)return;try{audio??=new(window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();
    const osc=audio.createOscillator(),gain=audio.createGain();osc.type='triangle';osc.frequency.value=frequency;gain.gain.setValueAtTime(volume,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);osc.connect(gain);gain.connect(audio.destination);osc.start();osc.stop(audio.currentTime+duration);
  }catch{}
}
function start(){started=true;$('start-hint').hidden=true;if(mode==='ready')mode='playing';}
function onInput(){
  if(!available()){input.value=typed;return;}
  const value=input.value;
  if(deferredWord!==null){deferredKeys.push({value});return;}
  interruptRecovery();
  if(/\s/.test(value)){
    const trimmed=value.trim();if(/\s/.test(trimmed)){input.value=typed;feedback('One word at a time. Your typing tells the story.','warn');return;}
    const keys=insertedKeys(typed,trimmed,expected());typed=trimmed;input.value=typed;expandWord(index,typed);if(recordKeys(keys))commit();return;
  }
  const next=value.slice(0,expected().length+12),keys=insertedKeys(typed,next,expected()),punctuated=completedPunctuation(typed,next,expected());
  typed=next;input.value=typed;if(typed)start();expandWord(index,typed);
  if(!recordKeys(keys))return;
  const fraction=clamp(typed.length/Math.max(1,expected().length));target=index+fraction;
  if(inFlight())flightRate=Math.max(flightRate,typingFlightRate(typed.length,expected().length));
  feedback('');
  if(punctuated)commit(true);
}
function commit(spaceScored=false){
  if(!available()||!typed)return;start();const word=expected();
  if(!spaceScored&&!recordKeys([typed===word]))return;
  if(inFlight()){
    deferredWord=typed;input.value='';
    flightRate=Math.max(flightRate,(leapDuration(flightToken)-timer)/.06);
    return;
  }
  interruptRecovery();
  const hearth=track.chapters.at(-1);
  if(index+1===hearth.ignite){ignitionAge=0;burst(hearth.fireX-12,hearth.y-10,'',10);tone(740,.25,.035);}
  const origin=currentSample(),jumpType=punctuationJump(typed);
  wordHistory.set(index,typed);const oldChapter=track.tokens[index].chapter;
  accepted++;index++;target=index;typed='';input.value='';
  if(index<track.total)track.tokens[index].skipJump=!jumpType;
  if(index<track.total&&track.tokens[index].chapter!==oldChapter){chapterCorrect=0;chapterInputs=0;}
  if(jumpType)launch(origin,jumpType);
  else if(index===track.total){mode='finishing';input.disabled=true;feedback('The last word. A little warmth.');status('A little light to keep');}
  else{
    if(mode!=='stumble'){feedback('');}
  }
  metadata();stats();
}
function burst(x,y,word,count){
  for(let i=0;i<count;i++)particles.push({x,y,vx:(Math.random()-.5)*120,vy:-30-Math.random()*90,age:0,letter:word?word[i%word.length]:''});
}
function reset(){
  index=0;typed='';progress=0;progressVelocity=0;target=0;mode='ready';paused=false;cameraX=0;cameraY=0;
  time=0;elapsed=0;started=false;gait=0;pace=0;gaitMix=0;moveMix=0;timer=0;accepted=0;correct=0;attempted=0;falls=0;jumps=0;particles=[];
  renderedPose=idlePose();entryPose=renderedPose;sceneKind='forest';previousKind='forest';sceneFade=1;
  leapOrigin=null;flightToken=null;canvas.dataset.jumpKind='';
  flightRate=1;landingFraction=0;deferredWord=null;deferredKeys=[];resumeBlend=1;
  landingAge=1;
  ignitionAge=-1;
  chapterCorrect=0;chapterInputs=0;wordHistory.clear();
  input.value='';input.disabled=false;$('start-hint').hidden=false;$('pause-overlay').hidden=true;$('ending-overlay').hidden=true;
  $('pause').innerHTML='<kbd>esc</kbd> pause';metadata();stats();status('A story waiting to wake');feedback('Start with “the”. Space finishes each word.');input.focus({preventScroll:true});
}
function pause(value){
  if(paused===value)return;paused=value;$('pause-overlay').hidden=!value;$('ending-overlay').hidden=value||mode!=='complete';
  input.disabled=!available();$('pause').innerHTML=`<kbd>esc</kbd> ${value?'resume':'pause'}`;
  status(value?'Paused':mode==='complete'?'A promise kept':'Your story continues');if(!input.disabled)input.focus({preventScroll:true});
}
function resize(){
  const r=canvas.getBoundingClientRect();width=r.width;height=r.height;floor=height*.65;fontSize=width<550?23:28;
  const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.font=`${fontSize}px "Space Mono",Consolas,monospace`;charWidth=ctx.measureText('m').width;track=createTrack(word=>ctx.measureText(word).width);
  for(const [i,value] of wordHistory)expandWord(i,value);if(typed)expandWord(index,typed);
  metadata();
}
function drawWords(sample){
  ctx.font=`${fontSize}px "Space Mono",Consolas,monospace`;ctx.textBaseline='alphabetic';
  for(const {index:i,token:t} of visibleWords(track,index)){
    const x=t.x-cameraX,y=t.y-cameraY+floor;
    if(x+t.width<-100||x>width+80||y<-60||y>height+55)continue;
    const active=i===index&&index<track.total;
    const value=active?typed:wordHistory.get(i)||'',submitted=wordHistory.has(i),letters=letterFeedback(t.word,value);
    for(const [j,letter] of letters.entries()){
      ctx.fillStyle=letter.state==='incorrect'?ERROR_COLOR:letter.state==='extra'?EXTRA_COLOR:letter.state==='correct'?'#34423b':/[.,!?;:]/.test(letter.char)?orange:active?'#71816b':'#8d9c86';
      ctx.fillText(letter.char,x+j*charWidth,y+fontSize*.8);
    }
    if(submitted&&value!==t.word)stroke(ctx,[[x,y+fontSize+4],[x+Math.max(t.width,value.length*charWidth),y+fontSize+4]],ERROR_COLOR,2);
    if(active&&available()){
      const caretX=x+value.length*charWidth;
      stroke(ctx,[[caretX,y+2],[caretX,y+fontSize+3]],orange,2);
    }
    if(t.kind==='bridge'&&t.jump)stroke(ctx,[[x+8,y+fontSize+48],[x+t.width*.5,y+fontSize+55],[x+t.width-7,y+fontSize+46]],'#c3d4c9',1.4);
  }
}
function poseFor(sample){
  const idleTime=reduced?0:time;
  const travel=blendPose(walkPose(gait),runPose(gait,pace/150),gaitMix);
  let pose=carryPose(blendPose(idlePose(idleTime),travel,moveMix));
  const hearth=track.chapters.at(-1);
  if(sample.token.kind==='hearth')pose=hearthPose(pose,hearth,progress,idleTime,ignitionAge);
  if(mode==='leaping'&&!reduced){
    const rest=sample.token.kind==='hearth'?hearthPose(carryPose(idlePose(idleTime)),hearth,progress,idleTime,ignitionAge):carryPose(idlePose(idleTime)),base=blendPose(entryPose,rest,smooth(sample.p));
    pose=jumpLandingPose(jumpPose(base,sample.p),smooth((sample.p-.8)/.2));
  }
  if(mode==='playing'&&landingAge<.18&&!reduced)pose=jumpLandingPose(pose,1-smooth(landingAge/.18));
  if(mode==='stumble')pose=tripPose(entryPose,pose,timer/.82);
  if(mode==='falling')pose=fallPose(entryPose,timer/.8,reduced);
  if(mode==='recover')pose=timer<.35?landPose(entryPose,timer/.35):risePose((timer-.35)/.72,idleTime);
  if(mode==='ending'||mode==='complete')pose=blendPose(pose,carryPose(idlePose(idleTime)),smooth(timer/1.2));
  if(resumeBlend<1)pose=blendPose(resumePose,pose,smooth(resumeBlend));
  return pose;
}
function drawCharacter(sample){
  const x=sample.x-cameraX,y=sample.y-cameraY+floor;
  let pose=poseFor(sample);if(!paused)renderedPose=pose;else pose=renderedPose;
  ctx.save();ctx.translate(x,y);const scale=width<550?.92:1.1;ctx.scale(scale,scale);
  if(mode==='leaping'&&!reduced&&sample.p<.7){
    const strength=Math.sin(Math.PI*clamp(sample.p/.7));
    ctx.globalAlpha=strength*.5;ctx.strokeStyle=orange;ctx.lineWidth=1.6;ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(-44,-15);ctx.quadraticCurveTo(-39,-53,-12,-58);ctx.stroke();
    ctx.globalAlpha=strength*.25;ctx.beginPath();ctx.moveTo(-51,-18);ctx.quadraticCurveTo(-47,-49,-27,-59);ctx.stroke();
    ctx.globalAlpha=1;
  }
  const hearth=track.chapters.at(-1),lit=hearthState(hearth,progress,ignitionAge).lit;
  const swing=reduced?0:Math.sin(gait)*.09*moveMix+Math.sin(time*1.5)*.025;
  drawLantern(ctx,pose.frontHand[0]+1,pose.frontHand[1],reduced?0:time,lit,swing);
  drawFigure(ctx,pose,orange,{weight:4.1,headWeight:4,headRadius:10.5});ctx.restore();
}
function frame(now){
  const realDt=Math.max(0,(now-(lastTime||now))/1000),dt=Math.min(realDt,.035);lastTime=now;
  if(!paused){
    time+=dt;landingAge+=dt;
    if(ignitionAge>=0)ignitionAge+=dt;
    resumeBlend=Math.min(1,resumeBlend+dt/.14);if(started&&['playing','stumble','leaping'].includes(mode))elapsed+=realDt;
    if(mode==='leaping'){
      timer+=realDt*flightRate;
      landingFraction=lerp(landingFraction,clamp(target-index),ease(20,dt));
      if(timer>=leapDuration(flightToken))land();
    }else if(mode==='falling'){
      timer+=dt;
      if(timer>=.8){entryPose=fallPose(entryPose,1,reduced);clearChapter();index=checkpointIndex;progress=index;target=index;progressVelocity=0;typed='';input.value='';mode='recover';timer=0;flightToken=null;canvas.dataset.jumpKind='';ignitionAge=-1;metadata();stats();input.disabled=false;feedback('');input.focus({preventScroll:true});}
    }else if(mode==='recover'){
      timer+=dt;if(timer>=1.1){mode='playing';moveMix=0;pace=0;gaitMix=0;input.disabled=false;feedback('Back at the checkpoint. The light is still waiting.');input.focus({preventScroll:true});}
    }else if(mode==='ending'){
      timer+=dt;if(timer>2.3){mode='complete';$('ending-overlay').hidden=false;metadata();stats();status('A promise kept');}
    }else if(mode!=='complete'){
      const before=sampleTrack(track,progress,reduced,index),travel=advanceTravel(progress,progressVelocity,target,dt,.13);
      progress=clamp(travel.position,0,track.total);progressVelocity=travel.velocity;
      if(Math.abs(target-progress)<.0001&&Math.abs(progressVelocity)<.01){progress=target;progressVelocity=0;}
      const after=sampleTrack(track,progress,reduced,index),distance=Math.hypot(after.x-before.x,after.y-before.y);
      const speed=distance/Math.max(dt,.001);pace=lerp(pace,speed,ease(3.5,dt));gaitMix=lerp(gaitMix,runningBlend(pace),ease(7,dt));
      if(!reduced)gait+=Math.abs(after.x-before.x)/strideLength(gaitMix)*Math.PI*2;
      const weight=reduced?0:clamp(speed/70);moveMix=lerp(moveMix,weight,ease(weight>moveMix?14:10,dt));
      if(mode==='stumble'){timer+=dt;if(timer>.82){mode='playing';timer=0;}}
      if(mode==='finishing'&&track.total-progress<.015){progress=track.total;mode='ending';timer=0;tone(660,.3,.035);}
    }
    particles.forEach(p=>{p.age+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=300*dt;});particles=particles.filter(p=>p.age<.75);
  }
  const sample=currentSample();canvas.dataset.motion=paused?'paused':mode;
  if(!paused){
    const anchor=width*.3;
    cameraX=lerp(cameraX,Math.max(0,sample.x-anchor),ease(7,dt));
    const next=track.tokens[Math.min(index,track.total-1)];
    cameraX=clamp(cameraX,Math.max(0,next.x+next.width-width+28),Math.max(0,next.x-28));
    cameraY=lerp(cameraY,sample.y,ease(reduced?25:3.6,dt));
    if(sceneKind!==sample.token.kind){previousKind=sceneKind;sceneKind=sample.token.kind;sceneFade=0;}
    sceneFade=Math.min(1,sceneFade+dt*2.8);
  }
  const hearth=track.chapters.at(-1),lit=hearthState(hearth,progress,ignitionAge).lit;
  const sceneArgs={width,height,cameraX,cameraY,floor,time:reduced?0:time,reduced,lit,towerX:track.chapters.find(c=>c.kind==='tower').anchor,fireX:hearth.fireX,fireY:hearth.y+24};
  ctx.clearRect(0,0,width,height);paintScene(ctx,previousKind,sceneArgs);ctx.save();ctx.globalAlpha=smooth(sceneFade);paintScene(ctx,sceneKind,sceneArgs);ctx.restore();
  if(['cave','hearth'].includes(sample.token.kind)){
    const x=hearth.fireX-cameraX,y=hearth.y-cameraY+floor;
    if(sample.token.kind==='hearth'){
      ctx.fillStyle='#d2d5c6';ctx.beginPath();ctx.moveTo(x-190,y+34);ctx.lineTo(x+160,y+34);ctx.lineTo(x+210,height);ctx.lineTo(x-230,height);ctx.closePath();ctx.fill();
      stroke(ctx,[[x-190,y+34],[x+160,y+34]],'#a8b3a0',1.2);
    }
    drawCampfire(ctx,x,y+24,reduced?0:time,reduced);
  }
  canvas.dataset.lanternLit=String(lit>.95);
  drawWords(sample);drawCharacter(sample);
  for(const p of particles){ctx.globalAlpha=1-p.age/.75;ctx.fillStyle='#dca56c';if(p.letter){ctx.font='17px "Space Mono",monospace';ctx.fillText(p.letter,p.x-cameraX,p.y-cameraY+floor);}else stroke(ctx,[[p.x-cameraX,p.y-cameraY+floor],[p.x-cameraX-p.vx*.04,p.y-cameraY+floor-p.vy*.04]],'#dda569',1.5);}ctx.globalAlpha=1;
  if(!paused&&mode==='playing'){
    status(sample.token.kind==='hearth'?(lit>.95?'A little light to keep':'Warmth in the stone'):sample.token.kind==='cave'?'Into the quiet':sample.token.kind==='tower'?'Past the old watchtower':'Up the mountain');
  }
  if(now-lastStats>500){if(mode!=='complete')stats();lastStats=now;}
  requestAnimationFrame(frame);
}
input.addEventListener('input',onInput);input.addEventListener('keydown',e=>{
  if((e.key===' '||e.key==='Enter')&&!e.isComposing){
    e.preventDefault();if(e.repeat)return;
    pressSpace(e.key);
  }
});
input.addEventListener('paste',e=>{e.preventDefault();feedback('One keystroke at a time. This adventure is yours.','warn');});
$('canvas-wrap').addEventListener('click',()=>{if(available())input.focus({preventScroll:true});});
$('restart').addEventListener('click',reset);$('replay').addEventListener('click',reset);$('pause').addEventListener('click',()=>pause(!paused));$('resume').addEventListener('click',()=>pause(false));
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('help-dialog').open){e.preventDefault();pause(!paused);}});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&started)pause(true);});
let wasPaused=false;$('help').addEventListener('click',()=>{wasPaused=paused;pause(true);$('help-dialog').showModal();});
for(const id of ['close-help','lets-go'])$(id).addEventListener('click',()=>$('help-dialog').close());
$('help-dialog').addEventListener('close',()=>{if(!wasPaused)pause(false);});
$('sound').addEventListener('click',()=>{sound=!sound;$('sound').setAttribute('aria-pressed',String(sound));$('sound').textContent=`♪ Sound ${sound?'on':'off'}`;tone(440,.15);});
resize();reset();new ResizeObserver(resize).observe(canvas);document.fonts.ready.then(resize);requestAnimationFrame(frame);
