import { STORIES, generateBatch, classifyWord, matchingPrefix, layoutWords } from './engine.js';
import {idlePose,walkPose,runPose,runningBlend,strideLength,blendPose,tripPose,fallPose,landPose,risePose,drawFigure,advanceTravel} from './motion.js';

const $=id=>document.getElementById(id);
const canvas=$('stage'), ctx=canvas.getContext('2d'), input=$('typing'), dialog=$('menu');
const orange='#ed722e',accent='#a64216',ink='#26312b',muted='#56665b',error='#973b2d';
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const phone=matchMedia('(max-width: 650px)');
const keys={best:'typerun-best-v2',rule:'typerun-consecutive-mistakes',minimum:'typerun-minimum-accuracy',game:'typerun-game-mode',sound:'typerun-sound'};
function read(key){try{return localStorage.getItem(keys[key]);}catch{return null;}}
function save(key,value){try{localStorage.setItem(keys[key],String(value));}catch{}}
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const mix=(a,b,t)=>a+(b-a)*t, ease=(rate,dt)=>1-Math.exp(-rate*dt);
const GRACE_SECONDS=5,MISTAKE_LIMIT=3,GAP=19,LEVEL_HEIGHT=365;
const savedBest=Number(read('best')),savedMin=read('minimum');
let best=Number.isFinite(savedBest)?Math.max(savedBest,0):0;
let minimumAccuracy=savedMin!==null&&Number.isFinite(Number(savedMin))?clamp(Math.round(Number(savedMin)),0,100):85;
let gameMode=read('game')==='words'?'words':'story',streakMode=read('rule')==='true',soundEnabled=read('sound')==='true';
let width=1000,height=326,fontSize=29,charWidth=17.4,floorY=163;
let cameraX=0,cameraY=0,gait=0,velocity=0,lastTime=null;
let levels=[],level=0,wordIndex=0,typed='',mode='ready',paused=false;
let runnerX=95,runnerY=floorY,targetX=95,animationTime=0,fallFrom=0,fallStartedAt=0;
let wordsTraveled=0,correctWords=0,falls=0,attemptedChars=0,correctChars=0,elapsed=0;
let started=false,audio=null,particles=[],storyComplete=false,lastStats=0,mismatch=false;
let runWeight=0,motionTime=0,renderedPose=idlePose(0),transitionPose=renderedPose;
let pace=0,gaitMix=0,recoverySpeed=1,storyElapsed=0,storyStarted=false,wrongStreak=0,clockTime=null;
let dirty=true,view='settings',pending=null,alreadyPaused=false,resumeStatus='Ready';
const unit=()=>gameMode==='words'?'batch':'story';
const focusTyping=()=>input.focus({preventScroll:true});
function text(id,value){const el=$(id);if(String(el.textContent)!==String(value))el.textContent=value;}
function status(value){text('state-label',value);}
function feedback(value='',kind=''){text('feedback',value);if($('feedback').className!==kind)$('feedback').className=kind;}
function font(){ctx.font=`${fontSize}px "Space Mono", Consolas, monospace`;}
function keepTargetVisible(){
  const word=current()?.words[wordIndex];
  if(!word||mode==='falling')return;
  const x=wordX(),gutter=12;
  const rightBound=Math.max(0,x-gutter);
  const leftBound=Math.min(rightBound,Math.max(0,x+word.width+gutter-width));
  cameraX=clamp(cameraX,leftBound,rightBound);
}
function size(){
  const rect=canvas.getBoundingClientRect();width=rect.width;height=rect.height;
  const ratio=Math.min(devicePixelRatio||1,2);
  canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);ctx.setTransform(ratio,0,0,ratio,0,0);
  fontSize=phone.matches||width<550?23:29;font();charWidth=ctx.measureText('m').width;
  const shift=Math.max(width<550?82:88,height*.49)-floorY;floorY+=shift;runnerY+=shift;
  levels.forEach(l=>l.words=layoutWords(l.story.text,w=>ctx.measureText(w).width,GAP));
  particles.forEach(p=>p.y+=shift);
  if(mode==='falling')fallFrom+=shift;else targetX=wordX()+matchingPrefix(typed,expected())*charWidth;
  keepTargetVisible();dirty=true;
}
function makeLevel(n,origin=95,previous=''){
  const story=gameMode==='story'?STORIES[n%STORIES.length]:{title:'Words',text:generateBatch(Math.random,previous).join(' ')};
  font();return {story,origin,words:layoutWords(story.text,w=>ctx.measureText(w).width,GAP)};
}
function current(){return levels[level];}
function expected(){return current()?.words[wordIndex]?.word||'';}
function wordX(){return (current()?.origin??95)+(current()?.words[wordIndex]?.x||0);}
function target(){input.placeholder=expected();text('target',`Next word: ${expected()}`);}
function metadata(){
  $('story-number').hidden=gameMode==='words';text('story-number',`Story ${String(level+1).padStart(2,'0')}`);
  text('story-title',current().story.title);text('story-text',current().story.text);
  text('accuracy-label',gameMode==='words'?'Batch accuracy':'Story accuracy');target();
}
function storyAccuracy(){
  let correct=correctChars;const word=expected();
  for(let i=0;i<typed.length;i++)if(typed[i].toLowerCase()===word[i]?.toLowerCase())correct++;
  const attempted=attemptedChars+typed.length;return attempted?correct/attempted*100:100;
}
function unsafe(){return !streakMode&&canType()&&storyStarted&&(minimumAccuracy===100||storyElapsed+1e-9>=GRACE_SECONDS)&&storyAccuracy()+1e-9<minimumAccuracy;}
function controls(){
  $('story-mode').checked=gameMode==='story';$('words-mode').checked=gameMode==='words';
  $('floor-mode').checked=!streakMode;$('streak-mode').checked=streakMode;
  $('sound').checked=soundEnabled;text('sound-value',soundEnabled?'On':'Off');
  $('minimum-accuracy').disabled=streakMode;$('minimum-accuracy').value=minimumAccuracy;
  $('minimum-accuracy').setAttribute('aria-valuetext',`${minimumAccuracy} percent`);
  text('minimum-label',`Minimum ${unit()} accuracy`);text('minimum-accuracy-value',`${minimumAccuracy}%`);
  text('rule-detail',streakMode?`Three wrong submissions in a row cause a fall. A correct word or new ${unit()} clears the count.`:minimumAccuracy===0?'No accuracy-based falls.':minimumAccuracy===100?'No grace period. The first drop below 100% causes a fall.':`You have 5 active seconds from the first keystroke of each ${unit()}. After that, falling below the minimum causes a fall, even mid-word.`);
  text('threshold-warning',paused&&unsafe()?'Your current accuracy will cause a fall on resume.':'');
}
// Events and animation frames charge intervals to their previous owner.
function syncClock(){
  const now=performance.now(),seconds=(now-(clockTime??now))/1000;clockTime=now;
  if(!paused&&canType()){if(started)elapsed+=seconds;if(storyStarted)storyElapsed+=seconds;}
}
function failStory(message){feedback(message,'error');falls++;beginTransition(false);stats();}
function checkAccuracy(){if(paused||!unsafe())return false;failStory(`Accuracy fell below ${minimumAccuracy}%.`);return true;}
function setMinimumAccuracy(){
  syncClock();checkAccuracy();minimumAccuracy=clamp(Math.round(Number($('minimum-accuracy').value)||0),0,100);
  save('minimum',minimumAccuracy);controls();checkAccuracy();stats();
}
function stats(){
  const wpm=elapsed>0?Math.round(correctWords/(elapsed/60)):0;
  text('wpm',wpm);text('accuracy',`${Math.floor(storyAccuracy()*10)/10}%`);text('distance',wordsTraveled);
  if(correctWords>=10&&Number.isFinite(wpm)&&wpm>best){best=wpm;save('best',best);}
  text('session-note',`${falls} ${falls===1?'fall':'falls'} · Local best: ${best} WPM`);
  text('accuracy-grace',streakMode?`Wrong words in a row: ${wrongStreak} of 3`:minimumAccuracy===100?'100% accuracy · no grace period':!minimumAccuracy?'No accuracy-based falls':!storyStarted?'Grace: 5s from the first keystroke':storyElapsed<GRACE_SECONDS?`Grace: ${(GRACE_SECONDS-storyElapsed).toFixed(1)}s left`:`Minimum accuracy: ${minimumAccuracy}%`);
}
function tone(frequency,duration=.08,type='sine',volume=.03){
  if(!soundEnabled)return;
  try{
    audio??=new (window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume().catch(()=>{});
    const osc=audio.createOscillator(),gain=audio.createGain();osc.type=type;osc.frequency.value=frequency;
    gain.gain.setValueAtTime(volume,audio.currentTime);osc.connect(gain);gain.connect(audio.destination);osc.start();osc.stop(audio.currentTime+duration);
  }catch{}
}
function start(){started=true;storyStarted=true;if(mode==='ready'){mode='playing';status('Running');}}
function canType(){return ['ready','playing','stumble','splat','rise'].includes(mode);}
function recovering(){return mode==='splat'||mode==='rise';}
function hurryRecovery(){if(recovering())recoverySpeed=Math.min(5,recoverySpeed+1);}
function onInput(){
  syncClock();checkAccuracy();if(paused||!canType()){input.value=typed;return;}
  let value=input.value;const submitting=/\s/.test(value);
  if(submitting){const parts=value.trim().split(/\s+/);if(parts.length>1){input.value=typed;feedback('Enter one word at a time.','warn');return;}value=parts[0];}
  const growing=value.length>typed.length;typed=value.slice(0,Math.max(expected().length+14,25));input.value=typed;
  if(typed.length)start();const prefix=matchingPrefix(typed,expected());targetX=wordX()+prefix*charWidth;mismatch=prefix<typed.length;
  if(growing){hurryRecovery();if(!mismatch)tone(350+(wordIndex%6)*35,.035,'sine',.012);}
  if(checkAccuracy())return;if(submitting){commit();return;}
  if(mismatch)feedback('Word doesn’t match. Backspace to correct it.','warn');else feedback();stats();
}
function scoreWord(value,word){
  attemptedChars+=Math.max(value.length,word.length);
  for(let i=0;i<Math.min(value.length,word.length);i++)if(value[i].toLowerCase()===word[i].toLowerCase())correctChars++;
}
function commit(){
  syncClock();if(paused||!canType()||checkAccuracy())return;
  if(!typed.length){feedback('Type the next word first.','warn');return;}
  hurryRecovery();start();const word=expected(),result=classifyWord(typed,word);scoreWord(typed,word);
  typed='';input.value='';mismatch=false;
  if(result==='correct'){correctWords++;wrongStreak=0;}
  else if(streakMode&&++wrongStreak>=MISTAKE_LIMIT){failStory('Three wrong words in a row.');return;}
  if(checkAccuracy())return;wordsTraveled++;wordIndex++;
  if(wordIndex>=current().words.length){feedback();beginTransition(true);stats();return;}
  targetX=wordX();target();
  if(result!=='correct'){
    if(!recovering()){transitionPose=renderedPose;mode='stumble';animationTime=0;}
    feedback(`Missed “${word}”.`,'warn');tone(180,.13,'triangle',.04);status('Tripped');
  }else{feedback();if(mode!=='stumble'&&!recovering())status('Running');}
  stats();
}
function beginTransition(complete){
  syncClock();fallStartedAt=clockTime;transitionPose=renderedPose;storyComplete=complete;mode='falling';animationTime=0;fallFrom=floorY+level*LEVEL_HEIGHT;
  const l=current(),w=l.words[Math.min(wordIndex,l.words.length-1)];
  levels.push(makeLevel(level+1,runnerX,w.word));input.disabled=true;velocity=0;
  status(complete?'Line complete':'Falling');
  if(!complete){
    if(!reducedMotion)for(let i=0;i<w.word.length;i++)particles.push({x:l.origin+w.x+i*charWidth,y:fallFrom+22,vx:(Math.random()-.5)*110,vy:-30-Math.random()*100,age:0,letter:w.word[i]});
    tone(95,.4,'triangle',.08);
  }else tone(660,.2,'sine',.04);
}
function landTransition(){
  syncClock();wrongStreak=0;level++;wordIndex=0;typed='';input.value='';mismatch=false;
  correctChars=0;attemptedChars=0;storyElapsed=0;storyStarted=false;targetX=wordX();runnerX=targetX;runnerY=floorY+level*LEVEL_HEIGHT;
  mode='splat';animationTime=0;recoverySpeed=1;metadata();input.disabled=paused;velocity=0;runWeight=0;pace=0;gaitMix=0;
  feedback(`New ${unit()}. Type to get back up.`);status('Landed');stats();if(!paused)focusTyping();
}
function finishRecovery(){mode='playing';animationTime=0;storyComplete=false;recoverySpeed=1;status('Running');}
function reset(){
  syncClock();lastTime=null;correctWords=0;wrongStreak=0;level=0;wordIndex=0;typed='';mode='ready';started=false;
  wordsTraveled=0;falls=0;correctChars=0;attemptedChars=0;elapsed=0;storyElapsed=0;storyStarted=false;
  cameraX=0;cameraY=0;runnerX=95;runnerY=floorY;targetX=95;gait=0;velocity=0;particles=[];animationTime=0;storyComplete=false;mismatch=false;
  runWeight=0;motionTime=0;renderedPose=idlePose(0);transitionPose=renderedPose;pace=0;gaitMix=0;recoverySpeed=1;
  levels=[makeLevel(0)];input.value='';input.disabled=paused;dirty=true;metadata();controls();stats();resumeStatus='Ready';status(paused?'Paused':resumeStatus);feedback();
}
function setPause(value){
  if(paused===value)return;
  syncClock();
  if(value){checkAccuracy();resumeStatus=$('state-label').textContent;}
  paused=value;lastTime=null;dirty=true;
  if(paused)status('Paused');else if(!checkAccuracy())status(resumeStatus);
  input.disabled=paused||mode==='falling';stats();
  if(!input.disabled)focusTyping();
}

function line(points,color,weight){
  ctx.strokeStyle=color;ctx.lineWidth=weight;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();
}
function drawRunner(){
  const traveling=blendPose(walkPose(gait),runPose(gait,pace/150),gaitMix),idleTime=reducedMotion?0:motionTime;
  const base=blendPose(idlePose(idleTime),traveling,runWeight);let pose=base;
  if(mode==='stumble')pose=tripPose(transitionPose,base,animationTime/.82);
  else if(mode==='falling')pose=fallPose(transitionPose,animationTime/(reducedMotion?.4:.8),reducedMotion);
  else if(mode==='splat')pose=landPose(transitionPose,animationTime/.32,storyComplete);
  else if(mode==='rise'){const p=clamp(animationTime/.72,0,1);pose=blendPose(risePose(p,idleTime,storyComplete),base,clamp((p-.68)/.32,0,1));}
  if(!paused)renderedPose=pose;
  ctx.save();ctx.translate(runnerX-cameraX,runnerY-cameraY);const scale=width<550?.87:1;ctx.scale(scale,scale);drawFigure(ctx,renderedPose,orange);
  if(mode==='splat'&&animationTime<.2&&!reducedMotion){const p=animationTime/.2;ctx.globalAlpha=(1-p)*.35;for(const d of [-1,1])line([[d*(26+p*10),-7],[d*(31+p*16),-10-p*3]],orange,1.5);}
  ctx.restore();
}
function draw(){
  ctx.fillStyle='#fff';ctx.fillRect(0,0,width,height);font();ctx.textBaseline='alphabetic';
  for(let n=Math.max(0,level-1);n<levels.length;n++){
    const l=levels[n],y=floorY+n*LEVEL_HEIGHT-cameraY;if(y>height+80||y<-70)continue;
    for(let i=0;i<l.words.length;i++){
      const w=l.words[i],x=l.origin+w.x-cameraX;if(x+w.width<-40||x>width+40)continue;
      const active=n===level&&i===wordIndex&&mode!=='falling';
      if(n===level&&i===wordIndex&&mode==='falling'&&!storyComplete&&!reducedMotion)continue;
      ctx.fillStyle=active?ink:muted;ctx.fillText(w.word,x,y+fontSize*.76);
      if(active){
        const prefix=matchingPrefix(typed,w.word),cursor=x+prefix*charWidth;
        ctx.fillStyle=accent;ctx.fillText(w.word.slice(0,prefix),x,y+fontSize*.76);
        line([[x,y+fontSize+5],[x+w.width,y+fontSize+5]],mismatch?error:accent,2);
        if(mismatch)line([[cursor-3,y+fontSize+10],[cursor,y+fontSize+5],[cursor+3,y+fontSize+10]],error,2);
      }
    }
  }
  particles.forEach(p=>{ctx.globalAlpha=Math.max(0,1-p.age);ctx.fillStyle=muted;ctx.fillText(p.letter,p.x-cameraX,p.y-cameraY);});ctx.globalAlpha=1;drawRunner();
}
function frame(now){
  const dt=Math.min((now-(lastTime??now))/1000,.04);lastTime=now;syncClock();
  if(!paused){
    motionTime+=dt;checkAccuracy();
    if(mode==='stumble'){animationTime+=dt;if(animationTime>.82){mode='playing';animationTime=0;status('Running');}}
    if(mode==='falling'){
      animationTime+=Math.min(dt,Math.max(0,(now-fallStartedAt)/1000));const duration=reducedMotion?.4:.8,p=clamp(animationTime/duration,0,1);
      runnerY=reducedMotion?fallFrom:fallFrom+LEVEL_HEIGHT*p*p-(storyComplete?Math.sin(p*Math.PI)*65:0);
      if(p>=1){transitionPose=fallPose(transitionPose,1,reducedMotion);landTransition();tone(60,.14,'triangle',.07);}
    }else if(mode==='splat'){animationTime+=dt*recoverySpeed;if(animationTime>.32){mode='rise';animationTime=0;}}
    else if(mode==='rise'){animationTime+=dt*recoverySpeed;if(animationTime>.72)finishRecovery();}
    if(mode!=='falling'){
      const previousX=runnerX,travel=advanceTravel(runnerX,velocity,targetX,dt);runnerX=travel.position;velocity=travel.velocity;runnerY=floorY+level*LEVEL_HEIGHT;
      pace=mix(pace,Math.abs(velocity),ease(3.5,dt));gaitMix=mix(gaitMix,runningBlend(pace),ease(7,dt));
      if(!reducedMotion)gait+=Math.abs(runnerX-previousX)/strideLength(gaitMix)*Math.PI*2;
      const weight=reducedMotion?0:clamp(Math.abs(velocity)/70,0,1);runWeight=mix(runWeight,weight,ease(weight>runWeight?14:10,dt));if(runWeight<.001)runWeight=0;
    }
    cameraX=mix(cameraX,Math.max(0,runnerX-width*.29),ease(8,dt));keepTargetVisible();
    cameraY=reducedMotion?level*LEVEL_HEIGHT:mix(cameraY,runnerY-floorY,ease(5.5,dt));
    particles.forEach(p=>{p.age+=dt;p.vy+=650*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;});particles=particles.filter(p=>p.age<1.4);
    if(now-lastStats>500){stats();lastStats=now;}
  }
  if(!paused||dirty){draw();dirty=false;}requestAnimationFrame(frame);
}

function showView(next,title,initial){
  view=next;for(const id of ['settings','help','confirm'])$(id+'-view').hidden=id!==view;
  text('dialog-title',title);dialog.scrollTop=0;
  // Unlike the typing field, a control in a scrollable sheet must scroll into view.
  if(dialog.open)$(initial).focus();
}
function openMenu(){
  if(dialog.open)return;
  alreadyPaused=paused;setPause(true);controls();showView('settings','Settings','resume');
  dialog.showModal();$('page').inert=true;$('resume').focus();
}
function closeMenu(){
  pending=null;$('page').inert=false;dialog.close();setPause(alreadyPaused);if(alreadyPaused)$('settings').focus({preventScroll:true});
}
function apply(kind,value){
  if(kind==='game'){gameMode=value;save('game',value);}else if(kind==='rule'){streakMode=value;save('rule',value);}reset();
}
function requestChange(kind,value,invoker){
  if(kind==='game'&&value===gameMode||kind==='rule'&&value===streakMode)return;
  if(!started&&kind!=='restart'){apply(kind,value);return;}
  controls();pending={kind,value,invoker};
  const title=kind==='rule'?'Change fall rule?':kind==='game'?'Change game?':'Restart session?';
  const destination=(kind==='game'?value:gameMode)==='words'?'a fresh batch':'story 01';
  text('loss',`This restarts your session at ${destination}. Your best WPM is kept.`);
  text('confirm',kind==='rule'?'Change rule and restart':kind==='game'?'Change game and restart':'Restart session');showView('confirm',title,'cancel');
}
function back(){
  if(view==='settings'){closeMenu();return;}const invoker=pending?.invoker||'help';pending=null;showView('settings','Settings',invoker);
}
function menuKey(e){
  if(e.key==='Escape'){if(e.isComposing)return;e.preventDefault();if(!e.repeat){if(dialog.open)back();else openMenu();}return;}
  if(!dialog.open){
    if(e.key==='Tab'&&!e.shiftKey&&!e.ctrlKey&&!e.altKey&&!e.metaKey&&!e.isComposing){
      e.preventDefault();if(!e.repeat){apply('restart');if(!input.disabled)focusTyping();}
    }
    return;
  }
  if(e.repeat&&(e.key==='Enter'||e.key===' ')){e.preventDefault();return;}
  if(e.key!=='Tab')return;
  const items=Array.from($(view+'-view').querySelectorAll('button,input')).filter(el=>!el.disabled&&(el.type!=='radio'||el.checked));
  if(!items.length)return;
  const active=document.activeElement;
  const index=items.findIndex(el=>el===active||(active?.type==='radio'&&el.type==='radio'&&el.name===active.name));
  const next=index<0?(e.shiftKey?items.length-1:0):(index+(e.shiftKey?-1:1)+items.length)%items.length;
  e.preventDefault();items[next].focus();
}
input.addEventListener('input',onInput);
input.addEventListener('keydown',e=>{if((e.key===' '||e.key==='Enter')&&!e.isComposing){e.preventDefault();if(!e.repeat)commit();}});
input.addEventListener('paste',e=>{e.preventDefault();feedback('Type the word instead of pasting it.','warn');});
$('canvas-wrap').addEventListener('click',()=>{if(!input.disabled)focusTyping();});
$('settings').addEventListener('click',openMenu);$('resume').addEventListener('click',closeMenu);
$('help').addEventListener('click',()=>showView('help','How to play','back'));
$('back').addEventListener('click',back);$('cancel').addEventListener('click',back);
$('restart').addEventListener('click',()=>requestChange('restart',null,'restart'));
$('confirm').addEventListener('click',()=>{if(pending){apply(pending.kind,pending.value);alreadyPaused=false;closeMenu();}});
for(const [id,kind,value] of [['story-mode','game','story'],['words-mode','game','words'],['floor-mode','rule',false],['streak-mode','rule',true]]){
  $(id).addEventListener('click',()=>requestChange(kind,value,id));
}
$('minimum-accuracy').addEventListener('input',setMinimumAccuracy);
$('sound').addEventListener('change',()=>{soundEnabled=$('sound').checked;save('sound',soundEnabled);controls();tone(440,.15);});
document.addEventListener('keydown',menuKey);dialog.addEventListener('cancel',e=>{e.preventDefault();back();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&started&&!dialog.open)openMenu();});
const viewport=globalThis.visualViewport;
if(viewport){const fit=()=>document.documentElement.style.setProperty('--viewport',`${viewport.height}px`);fit();viewport.addEventListener('resize',fit);}
size();reset();new ResizeObserver(size).observe(canvas);document.fonts.ready.then(size);requestAnimationFrame(frame);
