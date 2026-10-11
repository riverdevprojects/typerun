import {classifyWord,matchingPrefix} from './engine.js';
import {idlePose,walkPose,runPose,runningBlend,strideLength,blendPose,tripPose,fallPose,landPose,risePose,drawFigure,advanceTravel,smooth} from './motion.js';
import {STORY,createTrack,sampleTrack,checkpoint,clamp,lerp} from './story.js';
import {dragPose,jumpPose,combatPose,swordAngle,drawSword,victoryPose} from './story-motion.js';
import {paintScene,stroke,drawDragon,drawLantern} from './scenery.js';
import {EDGE_TIME,checkJump,sampleEdge,sampleLeap,leapDuration,visibleWords} from './leap.js';
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
try{best=Number(localStorage.getItem('typerun-v2-best')||0)||0;}catch{}
function expected(){return track.tokens[index]?.word||'';}
function available(){return !paused&&['ready','playing','stumble','gap'].includes(mode);}
function currentSample(){
  if(mode==='gap')return sampleEdge(track,index,edgeOrigin,timer);
  if(mode==='leaping')return sampleLeap(track,index,leapOrigin,timer,reduced);
  if(mode==='falling')return {...fallOrigin,y:fallOrigin.y+(reduced?150:340)*(timer/.8)**2};
  return sampleTrack(track,progress,reduced,index);
}
function fall(message){
  fallOrigin=currentSample();falls++;checkpointIndex=checkpoint(track,index);entryPose=renderedPose;
  mode='falling';timer=0;input.disabled=true;typed='';input.value='';
  burst(fallOrigin.x,fallOrigin.y+12,'',9);feedback(message,'error');status('A slip into the margins');tone(100,.3,.045);stats();
}
function launch(){
  leapOrigin=currentSample();entryPose=renderedPose;mode='leaping';timer=0;jumps++;
  progress=index;target=index;progressVelocity=0;typed='';input.value='';input.disabled=true;
  tone(track.tokens[index].number?440+Number(expected())*90:420,.09);stats();
  if(track.tokens[index].superJump){burst(leapOrigin.x,leapOrigin.y-8,'',12);status('SUPER JUMP');feedback('Across the great divide!');tone(740,.2,.035);}
}
function boost(key){
  if(paused||mode!=='gap'||jumpReady)return;
  const result=checkJump(key,timer+Math.max(0,(performance.now()-lastTime)/1000));
  if(result==='fall')fall('You missed the second jump. Back to this scene’s checkpoint.');
  else if(result==='jump'){jumpReady=true;input.disabled=true;if(timer>=EDGE_TIME)launch();}
}
function status(text){if($('state-label').textContent.trim()===text)return;$('state-label').replaceChildren();const dot=document.createElement('span');dot.className='status-dot';$('state-label').append(dot,document.createTextNode(text));}
function feedback(text,kind=''){$('feedback').textContent=text;$('feedback').className=kind;}
function metadata(){
  const chapter=track.tokens[Math.min(index,track.total-1)].chapter,scene=track.chapters[chapter];
  $('story-number').textContent=String(chapter+1).padStart(2,'0');$('story-title').textContent=scene.title;
  $('scene-caption').textContent=scene.tag;$('story-text').textContent=STORY.title+'. '+scene.text;
  $('chapter-copy').textContent=scene.text;input.placeholder=expected();
  for(const [i,node] of [...document.querySelectorAll('.chapter')].entries()){
    node.classList.toggle('active',i===chapter);node.classList.toggle('finished',i<chapter||mode==='complete');
    if(i===chapter)node.setAttribute('aria-current','step');else node.removeAttribute('aria-current');
  }
  $('progress-fill').style.width=`${index/track.total*100}%`;
  $('progress-label').textContent=`${Math.round(index/track.total*100)}% of the journey`;
}
function stats(){
  const wpm=elapsed?Math.round(accepted*60/elapsed):0,accuracy=attempted?Math.round(correct*100/attempted):100;
  $('wpm').textContent=wpm;$('accuracy').innerHTML=`${accuracy}<span class="unit">%</span>`;$('distance').textContent=accepted;
  if(accepted>=10&&wpm>best){best=wpm;try{localStorage.setItem('typerun-v2-best',String(best));}catch{}}
  $('session-note').textContent=`${jumps} jumps · ${falls} falls · best ${best} wpm`;
  $('ending-stats').textContent=`${wpm} WPM · ${accuracy}% accuracy · ${jumps} jumps · ${falls} falls`;
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
  if(mode==='gap'){
    boost(value===' '?'Space':'Letter');input.value='';
    return;
  }
  if(/\s/.test(value)){
    const trimmed=value.trim();if(/\s/.test(trimmed)){input.value=typed;feedback('One word at a time. Your typing tells the story.','warn');return;}
    typed=trimmed;input.value=typed;commit();return;
  }
  typed=value.slice(0,expected().length+12);input.value=typed;if(typed)start();
  const prefix=matchingPrefix(typed,expected());target=index+prefix/Math.max(1,expected().length);
  if(prefix<typed.length)feedback('A wrong turn. Backspace to fix it before pressing space.','warn');
  else feedback(track.tokens[index].kind==='fight'?'Finish the word to finish the move.':'Keep going. Space finishes the word.');
}
function commit(){
  if(mode==='gap')return;
  if(!available()||!typed)return;start();const word=expected(),result=classifyWord(typed,word);
  attempted+=Math.max(typed.length,word.length);for(let i=0;i<Math.min(typed.length,word.length);i++)if(typed[i].toLowerCase()===word[i].toLowerCase())correct++;
  if(result==='fall'){
    fall('The word gives way. Back to this scene’s checkpoint.');return;
  }
  if(track.tokens[index].kind==='fight'){const t=track.tokens[index];burst(t.endX+65,t.y-52,'',6);tone(t.action==='parry'?640:240,.1,.035);}
  const origin=currentSample();
  accepted++;index++;target=index;typed='';input.value='';
  if(index===track.total){mode='finishing';input.disabled=true;feedback('The last word. The first morning.');status('Let there be light');}
  else{
    if(track.tokens[index].jump){edgeOrigin=origin;entryPose=renderedPose;mode='gap';timer=0;jumpReady=track.tokens[index].superJump;input.disabled=jumpReady;feedback('');}
    else if(result==='stumble'){entryPose=renderedPose;mode='stumble';timer=0;feedback('A familiar typo. A little stumble, then onward.','warn');tone(170,.12);}
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
  input.value='';input.disabled=false;$('start-hint').hidden=false;$('pause-overlay').hidden=true;$('ending-overlay').hidden=true;
  $('pause').innerHTML='<kbd>esc</kbd> pause';metadata();stats();status('A story waiting to wake');feedback('Start with “the”. Space finishes each word.');input.focus({preventScroll:true});
}
function pause(value){
  if(paused===value)return;paused=value;$('pause-overlay').hidden=!value;$('ending-overlay').hidden=value||mode!=='complete';
  input.disabled=value||!['ready','playing','stumble','gap'].includes(mode);$('pause').innerHTML=`<kbd>esc</kbd> ${value?'resume':'pause'}`;
  status(value?'Paused':mode==='complete'?'A promise kept':'Your story continues');if(!input.disabled)input.focus({preventScroll:true});
}
function resize(){
  const r=canvas.getBoundingClientRect();width=r.width;height=r.height;floor=height*.65;fontSize=width<550?23:28;
  const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.font=`${fontSize}px "Space Mono",Consolas,monospace`;charWidth=ctx.measureText('m').width;track=createTrack(word=>ctx.measureText(word).width);
  metadata();
}
function drawWords(sample){
  ctx.font=`${fontSize}px "Space Mono",Consolas,monospace`;ctx.textBaseline='alphabetic';
  for(const {index:i,token:t} of visibleWords(track,index)){
    const x=t.x-cameraX,y=t.y-cameraY+floor;
    if(x+t.width<-100||x>width+80||y<-60||y>height+55)continue;
    const active=i===index&&index<track.total;
    ctx.fillStyle=t.word==='jumped'?orange:i<index?'#839c7f':active?'#34423b':'#aebcab';ctx.fillText(t.word,x,y+fontSize*.8);
    if(active){
      const prefix=['gap','leaping'].includes(mode)?0:matchingPrefix(typed,t.word);if(prefix){ctx.fillStyle=orange;ctx.fillText(t.word.slice(0,prefix),x,y+fontSize*.8);}
      stroke(ctx,[[x+prefix*charWidth,y+fontSize+7],[x+t.width,y+fontSize+7]],prefix<typed.length?'#c97655':orange,2);
    }
    if(t.kind==='bridge'&&t.jump)stroke(ctx,[[x+8,y+fontSize+48],[x+t.width*.5,y+fontSize+55],[x+t.width-7,y+fontSize+46]],'#c3d4c9',1.4);
  }
}
function poseFor(sample){
  const idleTime=reduced?0:time;
  const travel=blendPose(walkPose(gait),runPose(gait,pace/150),gaitMix);
  let pose=dragPose(blendPose(idlePose(idleTime),travel,moveMix));
  if(mode==='gap'&&!reduced)pose=jumpPose(pose,Math.min(.5,sample.p));
  if(mode==='leaping'&&!reduced)pose=blendPose(jumpPose(entryPose,sample.p),dragPose(idlePose(idleTime)),smooth((sample.p-.75)/.25));
  if(sample.token.kind==='fight')pose=blendPose(pose,combatPose(sample.p,sample.token.action),smooth(sample.token.local===0?sample.p*4:1));
  if(sample.token.kind==='dawn')pose={...pose,frontElbow:[10,-51],frontHand:[19,-63]};
  if(mode==='stumble')pose=tripPose(entryPose,pose,timer/.82);
  if(mode==='falling')pose=fallPose(entryPose,timer/.8,reduced);
  if(mode==='recover')pose=timer<.35?landPose(entryPose,timer/.35):risePose((timer-.35)/.72,idleTime);
  if(mode==='ending'||mode==='complete')pose=blendPose(pose,victoryPose(idleTime),smooth(timer/1.2));
  return pose;
}
function drawCharacter(sample){
  const x=sample.x-cameraX,y=sample.y-cameraY+floor;
  let pose=poseFor(sample);if(!paused)renderedPose=pose;else pose=renderedPose;
  ctx.save();ctx.translate(x,y);const scale=width<550?.92:1.1;ctx.scale(scale,scale);
  if(mode==='leaping'&&sample.token.superJump&&!reduced){
    ctx.globalAlpha=Math.sin(sample.p*Math.PI)*.55;
    for(let i=0;i<3;i++)stroke(ctx,[[-40-i*7,-58+i*17],[-80-i*13,-58+i*17]],orange,1.7);
    ctx.globalAlpha=1;
  }
  if(mode==='ending'||mode==='complete'){
    drawSword(ctx,[35,-54],Math.PI/2,51);drawLantern(ctx,pose.frontHand[0]+3,pose.frontHand[1]+28,time,true);
  }else if(sample.token.kind==='fight'){
    drawSword(ctx,pose.frontHand,swordAngle(sample.p,sample.token.action),63);
    if(!reduced&&sample.p>.3&&sample.p<.65&&sample.token.action!=='duck'){
      ctx.globalAlpha=Math.sin((sample.p-.3)/.35*Math.PI)*.25;ctx.strokeStyle=orange;ctx.lineWidth=2;
      ctx.beginPath();ctx.arc(10,-49,48,-2.3,.45);ctx.stroke();ctx.globalAlpha=1;
    }
  }else{
    const hand=pose.backHand,angle=mode==='falling'?2.6+timer:Math.atan2(-4-hand[1],-65-hand[0]);
    drawSword(ctx,hand,angle,54);
    if(sample.token.kind==='dawn')drawLantern(ctx,pose.frontHand[0]+3,pose.frontHand[1]+28,time,true);
    if(!reduced&&moveMix>.4&&sample.air<.08&&Math.sin(time*25)>.4){ctx.globalAlpha=.35;stroke(ctx,[[-68,-5],[-74,-10]],'#dfa269',1);ctx.globalAlpha=1;}
  }
  drawFigure(ctx,pose,orange);ctx.restore();
}
function frame(now){
  const realDt=Math.max(0,(now-(lastTime||now))/1000),dt=Math.min(realDt,.035);lastTime=now;
  if(!paused){
    time+=dt;if(started&&['playing','stumble','gap','leaping'].includes(mode))elapsed+=realDt;
    if(mode==='gap'){
      const before=currentSample();
      timer+=realDt;
      const after=currentSample();
      if(!reduced)gait+=Math.abs(after.x-before.x)/strideLength(gaitMix)*Math.PI*2;
      if(jumpReady&&timer>=EDGE_TIME)launch();
      else if(checkJump(null,timer)==='fall')fall('Too late for the second jump. Back to this scene’s checkpoint.');
    }else if(mode==='leaping'){
      timer+=realDt;
      if(timer>=leapDuration(track.tokens[index])){
        mode='playing';timer=0;moveMix=0;pace=0;gaitMix=0;
        input.disabled=false;feedback('Keep going. Space finishes the word.');input.focus({preventScroll:true});
      }
    }else if(mode==='falling'){
      timer+=dt;
      if(timer>=.8){entryPose=fallPose(entryPose,1,reduced);index=checkpointIndex;progress=index;target=index;progressVelocity=0;typed='';input.value='';mode='recover';timer=0;metadata();}
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
    const anchor=sample.token.kind==='fight'?width*.35:width*.3;
    cameraX=lerp(cameraX,Math.max(0,sample.x-anchor),ease(7,dt));
    const next=track.tokens[Math.min(index,track.total-1)];
    if(!next.superJump||!['gap','leaping'].includes(mode))cameraX=clamp(cameraX,Math.max(0,next.x+next.width-width+28),Math.max(0,next.x-28));
    cameraY=lerp(cameraY,sample.y,ease(reduced?25:3.6,dt));
    if(sceneKind!==sample.token.kind){previousKind=sceneKind;sceneKind=sample.token.kind;sceneFade=0;}
    sceneFade=Math.min(1,sceneFade+dt*2.8);
  }
  const sceneArgs={width,height,cameraX,cameraY,floor,time:reduced?0:time,reduced};
  ctx.clearRect(0,0,width,height);paintScene(ctx,previousKind,sceneArgs);ctx.save();ctx.globalAlpha=smooth(sceneFade);paintScene(ctx,sceneKind,sceneArgs);ctx.restore();
  if(['approach','fight','dawn'].includes(sample.token.kind)){
    const fight=track.chapters.find(c=>c.kind==='fight'),anchor=track.tokens[fight.start].endX;
    const x=anchor-cameraX+Math.min(150,width*.32),y=fight.y-cameraY+floor;
    const resolve=sample.token.kind==='dawn'?1:sample.token.kind==='fight'?clamp((progress-fight.start)/(fight.end-fight.start)):0;
    drawDragon(ctx,x,y,{time,p:sample.p,action:sample.token.action,resolve,reduced});
    drawLantern(ctx,x+20,y-80,time,true);
    if(sample.token.kind==='fight'){
      ctx.font='9px "DM Sans",sans-serif';ctx.fillStyle='#84988a';ctx.fillText('THE KEEPER OF NIGHT',x-58,y-188);
      stroke(ctx,[[x-58,y-178],[x+70,y-178]],'#dce4dc',2);stroke(ctx,[[x-58,y-178],[x-58+128*(1-resolve),y-178]],'#859e8e',2);
    }
  }
  drawWords(sample);drawCharacter(sample);
  for(const p of particles){ctx.globalAlpha=1-p.age/.75;ctx.fillStyle='#dca56c';if(p.letter){ctx.font='17px "Space Mono",monospace';ctx.fillText(p.letter,p.x-cameraX,p.y-cameraY+floor);}else stroke(ctx,[[p.x-cameraX,p.y-cameraY+floor],[p.x-cameraX-p.vx*.04,p.y-cameraY+floor-p.vy*.04]],'#dda569',1.5);}ctx.globalAlpha=1;
  if(!paused&&mode==='playing')status(sample.token.kind==='fight'?'Steel and sparks':sample.token.number?'Up into the clouds':sample.token.jump?'Across the silence':'Following the light');
  if(now-lastStats>500){if(mode!=='complete')stats();lastStats=now;}
  requestAnimationFrame(frame);
}
input.addEventListener('input',onInput);input.addEventListener('keydown',e=>{
  if((e.key===' '||e.key==='Enter')&&!e.isComposing){
    e.preventDefault();if(e.repeat)return;
    if(mode==='gap'){boost(e.key===' '?'Space':'Enter');return;}commit();
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
