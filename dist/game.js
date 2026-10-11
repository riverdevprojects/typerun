import {idlePose,walkPose,runPose,runningBlend,strideLength,blendPose,tripPose,fallPose,landPose,risePose,drawFigure,advanceTravel,smooth} from './motion.js';
import {STORY,createTrack,sampleTrack,checkpoint,clamp,lerp} from './story.js';
import {dragPose,jumpPose,doubleJumpPose,jumpLandingPose,drawSword} from './story-motion.js';
import {paintScene,stroke,drawDragon,drawBreath,drawLantern,drawSignpost} from './scenery.js';
import {fightPhase,battlePose,battleRotation,battleSword,fireStrength} from './choreography.js';
import {letterFeedback,insertedKeys,accuracy,belowMinimum,updateExtraLayout,ERROR_COLOR,EXTRA_COLOR} from './typing-feedback.js';
import {EDGE_TIME,checkJump,sampleEdge,sampleLeap,leapDuration,typingFlightRate,visibleWords} from './leap.js';
const $=id=>document.getElementById(id),canvas=$('stage'),ctx=canvas.getContext('2d'),input=$('typing');
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,orange='#ed722e';
const ease=(rate,dt)=>1-Math.exp(-rate*dt);
let width=1000,height=420,fontSize=28,charWidth=17,floor=265,track;
let index=0,typed='',progress=0,progressVelocity=0,target=0,mode='ready',paused=false;
let cameraX=0,cameraY=0,lastTime=0,time=0,elapsed=0,started=false;
let gait=0,pace=0,gaitMix=0,moveMix=0,renderedPose=idlePose(),entryPose=renderedPose;
let timer=0,fallOrigin=null,checkpointIndex=0,accepted=0,correct=0,attempted=0,falls=0,jumps=0;
let sound=false,audio=null,best=0,particles=[],lastStats=0,sceneKind='forest',previousKind='forest',sceneFade=1;
let edgeOrigin=null,leapOrigin=null,jumpReady=false;
let flightRate=1,landingFraction=0,deferredWord=null,deferredKeys=[],resumeBlend=1,resumePose=renderedPose;
let landingAge=1;
let spinAge=-1;
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
  for(let i=scene.start;i<scene.end;i++){expandWord(i,'');wordHistory.delete(i);}
  chapterCorrect=0;chapterInputs=0;
}
try{best=Number(localStorage.getItem('typerun-v2-best')||0)||0;}catch{}
function expected(){return track.tokens[index]?.word||'';}
function available(){return !paused&&['ready','playing','stumble','gap','leaping','recover'].includes(mode);}
function inFlight(){return mode==='leaping'||mode==='gap'&&jumpReady;}
function interruptRecovery(){
  if(mode!=='recover')return;
  resumePose=renderedPose;resumeBlend=0;mode='playing';timer=0;moveMix=0;pace=0;gaitMix=0;
}
function currentSample(){
  if(mode==='gap')return sampleEdge(track,index,edgeOrigin,timer);
  if(mode==='leaping')return sampleLeap(track,index,leapOrigin,timer,reduced,landingFraction);
  if(mode==='falling')return {...fallOrigin,y:fallOrigin.y+(reduced?150:340)*(timer/.8)**2};
  const sample=sampleTrack(track,progress,reduced,index),battle=battleState(sample);
  if(battle.action==='spin'&&!reduced)sample.y-=Math.sin(clamp((battle.p-.2)/.4)*Math.PI)*38;
  return sample;
}
function battleState(sample){
  if(spinAge>=0&&spinAge<1.25&&['fight','cave'].includes(sample.token.kind))return {action:'spin',p:clamp(spinAge/1.2)};
  if(sample.token.kind!=='fight')return {action:'idle',p:0};
  const p=fightPhase(sample.token,progress),action=sample.token.action;
  return {action,p:action==='spin'?spinAge<0?Math.min(.19,p):1:p};
}
function lanternState(sample){
  const cave=track.chapters.find(c=>c.kind==='cave'),dawn=track.chapters.find(c=>c.kind==='dawn');
  return {carried:progress>=cave.pickup&&progress<dawn.hook,hung:progress>=dawn.hook};
}
function fall(message){
  fallOrigin=currentSample();falls++;checkpointIndex=checkpoint(track,index);entryPose=renderedPose;
  mode='falling';timer=0;input.disabled=true;typed='';input.value='';
  deferredWord=null;deferredKeys=[];resumeBlend=1;
  spinAge=-1;
  burst(fallOrigin.x,fallOrigin.y+12,'',9);feedback(message,'error');status('A slip into the margins');tone(100,.3,.045);stats();
}
function launch(){
  leapOrigin=currentSample();entryPose=renderedPose;mode='leaping';timer=0;jumps++;
  progress=index;progressVelocity=0;input.disabled=false;
  tone(track.tokens[index].number?440+Number(expected())*90:420,.09);stats();
  if(track.tokens[index].superJump){burst(leapOrigin.x,leapOrigin.y-8,'',12);status('SUPER JUMP');feedback('Across the great divide!');tone(740,.2,.035);}
}
function boost(key){
  if(paused||mode!=='gap'||jumpReady)return;
  const result=checkJump(key,timer+Math.max(0,(performance.now()-lastTime)/1000));
  if(result==='fall')fall('You missed the second jump. Back to this scene’s checkpoint.');
  else if(result==='jump'){jumpReady=true;if(timer>=EDGE_TIME)launch();}
}
function pressSpace(key){
  if(!available())return;
  if(deferredWord!==null){deferredKeys.push({key});input.value='';return;}
  if(mode==='gap'&&!jumpReady){boost(key===' '?'Space':'Enter');return;}
  commit();
}
function land(){
  progress=index+landingFraction;progressVelocity=0;mode='playing';timer=0;moveMix=0;pace=0;gaitMix=0;
  landingAge=0;
  input.disabled=false;feedback('Keep going. Space finishes the word.');
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
  if(mode==='gap'&&!jumpReady){
    boost(value===' '?'Space':'Letter');input.value='';
    return;
  }
  interruptRecovery();
  if(/\s/.test(value)){
    const trimmed=value.trim();if(/\s/.test(trimmed)){input.value=typed;feedback('One word at a time. Your typing tells the story.','warn');return;}
    const keys=insertedKeys(typed,trimmed,expected());typed=trimmed;input.value=typed;expandWord(index,typed);if(recordKeys(keys))commit();return;
  }
  const next=value.slice(0,expected().length+12),keys=insertedKeys(typed,next,expected());
  typed=next;input.value=typed;if(typed)start();expandWord(index,typed);
  if(!recordKeys(keys))return;
  const fraction=clamp(typed.length/Math.max(1,expected().length));target=index+fraction;
  if(inFlight())flightRate=Math.max(flightRate,typingFlightRate(typed.length,expected().length));
  feedback('');
}
function commit(spaceScored=false){
  if(!available()||!typed)return;start();const word=expected();
  if(!spaceScored&&!recordKeys([typed===word]))return;
  if(inFlight()){
    deferredWord=typed;input.value='';
    flightRate=Math.max(flightRate,(leapDuration(track.tokens[index])-timer)/.06);
    return;
  }
  if(mode==='gap')return;
  interruptRecovery();
  if(track.tokens[index].kind==='fight'){
    const t=track.tokens[index];
    if(t.action==='spin'&&t.word==='spun'){spinAge=0;burst(t.endX+95,t.y-63,'',18);tone(150,.25,.05);}
    else if(['lunge','wing'].includes(t.action)){burst(t.endX+55,t.y-52,'',4);tone(420,.06,.025);}
  }
  const origin=currentSample();
  wordHistory.set(index,typed);const oldChapter=track.tokens[index].chapter;
  accepted++;index++;target=index;typed='';input.value='';
  if(index<track.total&&track.tokens[index].chapter!==oldChapter){chapterCorrect=0;chapterInputs=0;}
  if(index===track.total){mode='finishing';input.disabled=true;feedback('The last word. The first morning.');status('Let there be light');}
  else{
    if(track.tokens[index].jump){edgeOrigin=origin;entryPose=renderedPose;mode='gap';timer=0;jumpReady=track.tokens[index].superJump;flightRate=1;landingFraction=0;feedback('');}
    else if(mode!=='stumble'){feedback('Keep going. Space finishes the word.');}
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
  edgeOrigin=null;leapOrigin=null;jumpReady=false;
  flightRate=1;landingFraction=0;deferredWord=null;deferredKeys=[];resumeBlend=1;
  landingAge=1;
  spinAge=-1;
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
      ctx.fillStyle=letter.state==='incorrect'?ERROR_COLOR:letter.state==='extra'?EXTRA_COLOR:letter.state==='correct'?'#34423b':t.word==='jumped'?orange:active?'#71816b':'#8d9c86';
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
  let pose=dragPose(blendPose(idlePose(idleTime),travel,moveMix));
  if(mode==='gap'&&!reduced)pose=jumpPose(pose,Math.min(.5,sample.p));
  if(mode==='leaping'&&!reduced)pose=doubleJumpPose(entryPose,sample.p,dragPose(idlePose(idleTime)));
  if(mode==='playing'&&landingAge<.18&&!reduced)pose=jumpLandingPose(pose,1-smooth(landingAge/.18));
  const battle=battleState(sample);
  if(sample.token.kind==='fight'||battle.action==='spin')pose=blendPose(pose,battlePose(battle.action,battle.p,idleTime),smooth(sample.token.local===0?sample.p*4:1));
  if(lanternState(sample).carried)pose={...pose,frontElbow:[10,-51],frontHand:[19,-63]};
  if(sample.token.stationary){
    const dawn=track.chapters[sample.token.chapter],hang=smooth((progress-dawn.hang)/Math.max(1,dawn.hook-dawn.hang));
    pose=blendPose(pose,{...dragPose(idlePose(idleTime)),frontElbow:[12,-61],frontHand:[22,-77]},hang*(1-smooth(progress-dawn.hook)));
  }
  if(mode==='stumble')pose=tripPose(entryPose,pose,timer/.82);
  if(mode==='falling')pose=fallPose(entryPose,timer/.8,reduced);
  if(mode==='recover')pose=timer<.35?landPose(entryPose,timer/.35):risePose((timer-.35)/.72,idleTime);
  if(mode==='ending'||mode==='complete')pose=blendPose(pose,idlePose(idleTime),smooth(timer/1.2));
  if(resumeBlend<1)pose=blendPose(resumePose,pose,smooth(resumeBlend));
  return pose;
}
function drawCharacter(sample){
  const x=sample.x-cameraX,y=sample.y-cameraY+floor;
  let pose=poseFor(sample);if(!paused)renderedPose=pose;else pose=renderedPose;
  if(mode==='leaping'&&!reduced&&sample.p<.42){
    // A broken pressure ring stays where the second jump kicked off, rather than following the feet.
    const p=sample.p/.42,r=12+32*smooth(p),bx=leapOrigin.x-cameraX,by=leapOrigin.y-cameraY+floor-5;
    ctx.save();ctx.globalAlpha=smooth(p/.15)*(1-p)*.8;
    ctx.strokeStyle=orange;ctx.lineWidth=1.8;
    for(const a of [.15,Math.PI+.15]){ctx.beginPath();ctx.ellipse(bx,by,r,r*.32,-.22,a,a+2.35);ctx.stroke();}
    for(let i=0;i<3;i++){
      const a=.7+i*.8,dx=Math.cos(a),dy=Math.sin(a);
      stroke(ctx,[[bx+dx*(r+4),by+dy*(r*.35+4)],[bx+dx*(r+12),by+dy*(r*.35+12)]],orange,1.6);
    }
    ctx.restore();
  }
  ctx.save();ctx.translate(x,y);const scale=width<550?.92:1.1;ctx.scale(scale,scale);
  const battle=battleState(sample),rotation=reduced?0:battleRotation(battle.action,battle.p);
  if(rotation){ctx.translate(0,-35);ctx.rotate(rotation);ctx.translate(0,35);}
  if(mode==='leaping'&&!reduced&&sample.p<.7){
    const strength=Math.sin(Math.PI*clamp(sample.p/.7));
    ctx.globalAlpha=strength*.5;ctx.strokeStyle=orange;ctx.lineWidth=1.6;ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(-44,-15);ctx.quadraticCurveTo(-39,-53,-12,-58);ctx.stroke();
    ctx.globalAlpha=strength*.25;ctx.beginPath();ctx.moveTo(-51,-18);ctx.quadraticCurveTo(-47,-49,-27,-59);ctx.stroke();
    ctx.globalAlpha=1;
  }
  if(mode==='leaping'&&sample.token.superJump&&!reduced){
    ctx.globalAlpha=Math.sin(sample.p*Math.PI)*.55;
    for(let i=0;i<3;i++)stroke(ctx,[[-40-i*7,-58+i*17],[-80-i*13,-58+i*17]],orange,1.7);
    ctx.globalAlpha=1;
  }
  if(mode==='ending'||mode==='complete'){
    drawSword(ctx,[-22,-54],Math.PI/2,51);
  }else if(sample.token.kind==='fight'||battle.action==='spin'){
    const otherHand=['fire','spin','bow'].includes(battle.action);
    drawSword(ctx,otherHand?pose.backHand:pose.frontHand,battleSword(battle.action,battle.p),battle.action==='spin'?94:63);
    if(!reduced&&battle.action==='spin'&&battle.p>.2&&battle.p<.85){
      const alpha=Math.sin(clamp((battle.p-.2)/.65)*Math.PI);
      ctx.globalAlpha=alpha*.2;ctx.strokeStyle='#ec9345';ctx.lineWidth=15;
      ctx.beginPath();ctx.arc(3,-38,114,-2.3,.75);ctx.stroke();
      ctx.globalAlpha=alpha*.8;ctx.strokeStyle='#e3974d';ctx.lineWidth=2;ctx.stroke();
      ctx.globalAlpha=alpha*.5;ctx.lineWidth=1;ctx.beginPath();ctx.arc(3,-38,125,-2.15,.5);ctx.stroke();ctx.globalAlpha=1;
    }
    if(battle.action==='fire'){
      ctx.globalAlpha=fireStrength(battle.p)*.8;ctx.strokeStyle='#e2b06a';ctx.lineWidth=2;
      ctx.beginPath();ctx.arc(pose.frontHand[0]+3,pose.frontHand[1]+11,18,-1.3,1.1);ctx.stroke();ctx.globalAlpha=1;
    }
  }else{
    const hand=pose.backHand,angle=mode==='falling'?2.6+timer:Math.atan2(-4-hand[1],-65-hand[0]);
    drawSword(ctx,hand,angle,54);
    if(lanternState(sample).carried)drawLantern(ctx,pose.frontHand[0]+3,pose.frontHand[1]+44,reduced?0:time,true);
    if(!reduced&&moveMix>.4&&sample.air<.08&&Math.sin(time*25)>.4){ctx.globalAlpha=.35;stroke(ctx,[[-68,-5],[-74,-10]],'#dfa269',1);ctx.globalAlpha=1;}
  }
  drawFigure(ctx,pose,orange);ctx.restore();
}
function frame(now){
  const realDt=Math.max(0,(now-(lastTime||now))/1000),dt=Math.min(realDt,.035);lastTime=now;
  if(!paused){
    time+=dt;landingAge+=dt;
    if(spinAge>=0){const before=spinAge;spinAge+=dt;if(before<.84&&spinAge>=.84){const fight=track.chapters.find(c=>c.kind==='fight');burst(track.tokens[fight.start].endX+165,fight.y-70,'',24);tone(110,.3,.06);}}
    resumeBlend=Math.min(1,resumeBlend+dt/.14);if(started&&['playing','stumble','gap','leaping'].includes(mode))elapsed+=realDt;
    if(mode==='gap'){
      const before=currentSample();
      timer+=realDt;
      const after=currentSample();
      if(!reduced)gait+=Math.abs(after.x-before.x)/strideLength(gaitMix)*Math.PI*2;
      if(jumpReady&&timer>=EDGE_TIME)launch();
      else if(checkJump(null,timer)==='fall')fall('Too late for the second jump. Back to this scene’s checkpoint.');
    }else if(mode==='leaping'){
      timer+=realDt*flightRate;
      landingFraction=lerp(landingFraction,clamp(target-index),ease(20,dt));
      if(timer>=leapDuration(track.tokens[index]))land();
    }else if(mode==='falling'){
      timer+=dt;
      if(timer>=.8){entryPose=fallPose(entryPose,1,reduced);clearChapter();index=checkpointIndex;progress=index;target=index;progressVelocity=0;typed='';input.value='';mode='recover';timer=0;metadata();stats();input.disabled=false;feedback('');input.focus({preventScroll:true});}
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
    const anchor=sample.token.kind==='fight'?width*(width<550?.22:.35):width*.3;
    cameraX=lerp(cameraX,Math.max(0,sample.x-anchor),ease(7,dt));
    const next=track.tokens[Math.min(index,track.total-1)];
    if(!next.superJump||!['gap','leaping'].includes(mode))cameraX=clamp(cameraX,Math.max(0,next.x+next.width-width+28),Math.max(0,next.x-28));
    cameraY=lerp(cameraY,sample.y,ease(reduced?25:3.6,dt));
    if(sceneKind!==sample.token.kind){previousKind=sceneKind;sceneKind=sample.token.kind;sceneFade=0;}
    sceneFade=Math.min(1,sceneFade+dt*2.8);
  }
  const dawn=track.chapters.find(c=>c.kind==='dawn'),sunrise=smooth((progress-dawn.hook)/Math.max(1,track.total-dawn.hook));
  const sceneArgs={width,height,cameraX,cameraY,floor,time:reduced?0:time,reduced,sunrise};
  ctx.clearRect(0,0,width,height);paintScene(ctx,previousKind,sceneArgs);ctx.save();ctx.globalAlpha=smooth(sceneFade);paintScene(ctx,sceneKind,sceneArgs);ctx.restore();
  if(['approach','fight','cave'].includes(sample.token.kind)){
    const fight=track.chapters.find(c=>c.kind==='fight'),anchor=track.tokens[fight.start].endX;
    const scale=width<550?.56:1.03,battle=battleState(sample),player=anchor-cameraX;
    const x=Math.min(player+Math.min(180,width*.34),width-225*scale-12),y=fight.y-cameraY+floor;
    const approach=track.chapters.find(c=>c.kind==='approach');
    const resolve=sample.token.kind==='cave'?1:spinAge>=0?smooth((spinAge-.84)/.4):0;
    drawDragon(ctx,x,y,{time:reduced?0:time,p:battle.p,action:battle.action,resolve,reduced,scale,reveal:clamp((progress-approach.start)/(approach.end-approach.start)*2)});
    if(battle.action==='fire'){
      const s=width<550?.92:1.1,pose=poseFor(sample);
      drawBreath(ctx,[x-102*scale,y-123*scale],[sample.x-cameraX+(pose.frontHand[0]+3)*s,sample.y-cameraY+floor+(pose.frontHand[1]+10)*s],{time:reduced?0:time,strength:fireStrength(battle.p),reduced});
    }
    if(sample.token.kind==='fight'){
      ctx.font='9px "DM Sans",sans-serif';ctx.fillStyle='#758970';ctx.fillText('THE MOUNTAIN KEEPER',x-60,y-215*scale);
      const hp=clamp((progress-fight.start)/(fight.end-fight.start));
      stroke(ctx,[[x-60,y-204*scale],[x+65,y-204*scale]],'#d5decf',2);stroke(ctx,[[x-60,y-204*scale],[x-60+125*(1-hp),y-204*scale]],'#809375',2);
    }
  }
  if(sample.token.kind==='cave'){
    const cave=track.chapters[sample.token.chapter],x=cave.pickupX-cameraX+20,y=cave.y-cameraY+floor;
    stroke(ctx,[[x-21,y+12],[x-19,y-5],[x+18,y-5],[x+20,y+12]],'#9ab095',2);
    stroke(ctx,[[x-16,y-7],[x+16,y-7]],'#c0cdb2',4);
    if(progress<cave.pickup)drawLantern(ctx,x,y-5,reduced?0:time,true);
  }
  if(sample.token.kind==='dawn'){
    const x=track.tokens.at(-1).endX-cameraX,y=dawn.y-cameraY+floor;
    const ledge=[[x-88,y+37],[x+91,y+37],[x+167,y+92],[x+229,height+22],[x-267,height+22],[x-154,y+90]];
    ctx.beginPath();ledge.forEach(([px,py],i)=>i?ctx.lineTo(px,py):ctx.moveTo(px,py));ctx.closePath();ctx.fillStyle='#d3dec2';ctx.fill();
    stroke(ctx,ledge.slice(0,4),'#afc29d',1.4);
    stroke(ctx,[[x-46,y+41],[x-21,y+68],[x-38,y+88],[x-30,height]],'#bccbad',1);
    stroke(ctx,[[x+69,y+40],[x+50,y+73],[x+86,y+101]],'#bccbad',1);
    stroke(ctx,[[x-75,y+36],[x-77,y+29],[x-71,y+34]],'#a1b88d',.8);
    drawSignpost(ctx,x+40,y,reduced?0:time,lanternState(sample).hung);
  }
  drawWords(sample);drawCharacter(sample);
  for(const p of particles){ctx.globalAlpha=1-p.age/.75;ctx.fillStyle='#dca56c';if(p.letter){ctx.font='17px "Space Mono",monospace';ctx.fillText(p.letter,p.x-cameraX,p.y-cameraY+floor);}else stroke(ctx,[[p.x-cameraX,p.y-cameraY+floor],[p.x-cameraX-p.vx*.04,p.y-cameraY+floor-p.vy*.04]],'#dda569',1.5);}ctx.globalAlpha=1;
  if(!paused&&mode==='playing'){
    const action=battleState(sample).action;
    status(sample.token.kind==='fight'?({guard:'Stand your ground',lunge:'Claws against steel',wing:'Beneath the wings',fire:'Hold back the fire',spin:'Turn the tide',bow:'The keeper bows'})[action]:sample.token.kind==='cave'?'A light in the stone':sample.token.kind==='dawn'?'The final ridge':sample.token.number?'Up into the clouds':sample.token.jump?'Across the ravine':'Up the mountain');
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
