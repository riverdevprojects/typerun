import { STORIES, classifyWord, matchingPrefix, layoutWords } from './engine.js';
import {idlePose,walkPose,runPose,runningBlend,strideLength,blendPose,tripPose,fallPose,landPose,risePose,drawFigure,advanceTravel} from './motion.js';

const $ = id => document.getElementById(id);
const canvas=$('stage'), ctx=canvas.getContext('2d'), input=$('typing');
const orange='#ed722e', ink='#3b453e';
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
let width=1000, height=326, fontSize=29, charWidth=17.4, floorY=163;
let cameraX=0, cameraY=0, gait=0, velocity=0, lastTime=0, lastKey=0;
let levels=[], level=0, wordIndex=0, typed='', mode='ready', paused=false;
let runnerX=95, runnerY=floorY, targetX=95, animationTime=0, fallFrom=0;
let wordsTraveled=0, falls=0, attemptedChars=0, correctChars=0, elapsed=0;
let best=0, started=false, soundEnabled=false, audio=null, particles=[];
let storyComplete=false, lastStats=0, feedbackUntil=0, mismatch=false;
let runWeight=0,motionTime=0,renderedPose=idlePose(0),transitionPose=renderedPose;
let pace=0,gaitMix=0;
try { best=Number(localStorage.getItem('typerun-best')||0)||0; } catch {}
const GAP=19, LEVEL_HEIGHT=365;
const mix=(a,b,t)=>a+(b-a)*t;
const ease=(rate,dt)=>1-Math.exp(-rate*dt);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

function size(){
  const rect=canvas.getBoundingClientRect(); width=rect.width; height=rect.height;
  const ratio=Math.min(devicePixelRatio||1,2);
  canvas.width=Math.round(width*ratio); canvas.height=Math.round(height*ratio);
  ctx.setTransform(ratio,0,0,ratio,0,0);
  fontSize=width<550?23:29; ctx.font=`${fontSize}px "Space Mono", Consolas, monospace`;
  charWidth=ctx.measureText('m').width;floorY=height*.49;
  levels.forEach(l=>l.words=layoutWords(l.story.text,w=>ctx.measureText(w).width,GAP));
  runnerY=floorY+level*LEVEL_HEIGHT;
  targetX=wordX()+matchingPrefix(typed,expected())*charWidth;
  runnerX=targetX;cameraY=level*LEVEL_HEIGHT;
}
function makeLevel(n,origin=95){
  const story=STORIES[n%STORIES.length];
  ctx.font=`${fontSize}px "Space Mono", Consolas, monospace`;
  return {story, origin, words:layoutWords(story.text,w=>ctx.measureText(w).width,GAP)};
}
function current(){return levels[level];}
function expected(){return current()?.words[wordIndex]?.word||'';}
function wordX(){return (current()?.origin||95)+(current()?.words[wordIndex]?.x||0);}
function feedback(text,kind='',persist=0){
  $('feedback').textContent=text;$('feedback').className=kind;
  feedbackUntil=persist?performance.now()+persist:0;
}
function status(text){$('state-label').innerHTML='<span class="status-dot"></span>'; $('state-label').append(document.createTextNode(text));}
function metadata(){
  $('story-number').textContent=String(level+1).padStart(2,'0');
  $('story-title').textContent=current().story.title;
  $('story-text').textContent=current().story.text;
  input.placeholder=expected();
}
function stats(){
  const wpm=elapsed>0?Math.round(wordsTraveled/(elapsed/60)):0;
  $('wpm').textContent=wpm;
  $('accuracy').innerHTML=`${attemptedChars?Math.round(correctChars/attemptedChars*100):100}<span class="unit">%</span>`;
  $('distance').textContent=wordsTraveled;
  if(wordsTraveled>=10&&wpm>best){best=wpm;try{localStorage.setItem('typerun-best',String(best));}catch{}}
  $('session-note').innerHTML=`${falls} ${falls===1?'fall':'falls'} <b>·</b> best ${best} wpm`;
}
function tone(frequency,duration=.08,type='sine',volume=.03){
  if(!soundEnabled)return;
  try{
    audio??=new (window.AudioContext||window.webkitAudioContext)();
    if(audio.state==='suspended')audio.resume();
    const osc=audio.createOscillator(), gain=audio.createGain();
    osc.type=type;osc.frequency.value=frequency;gain.gain.setValueAtTime(volume,audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);
    osc.connect(gain);gain.connect(audio.destination);osc.start();osc.stop(audio.currentTime+duration);
  }catch{}
}
function start(){
  if(!started){started=true;$('start-hint').style.opacity='0';}
  if(mode==='ready')mode='playing';
}
function onInput(){
  if(paused||!['ready','playing','stumble'].includes(mode)){input.value=typed;return;}
  const value=input.value;
  if(/\s/.test(value)){
    const parts=value.trim().split(/\s+/);typed=parts[0]||'';input.value=typed;
    if(parts.length>1){feedback('One word at a time. Let your fingers do the running.','warn',2000);return;}
    commit();return;
  }
  const growing=value.length>typed.length;
  typed=value.slice(0,Math.max(expected().length+14,25));input.value=typed;
  if(typed.length)start();
  const prefix=matchingPrefix(typed,expected());
  targetX=wordX()+prefix*charWidth;
  mismatch=prefix<typed.length;
  if(growing){
    lastKey=performance.now();
    if(!mismatch)tone(350+(wordIndex%6)*35,.035,'sine',.012);
  }
  if(mismatch)feedback('Finish the word, or use backspace to fix it.','warn');
  else if(!feedbackUntil)feedback('Keep going. Press space to finish the word.');
}
function scoreWord(value,word){
  attemptedChars+=Math.max(value.length,word.length);
  for(let i=0;i<Math.min(value.length,word.length);i++)if(value[i].toLowerCase()===word[i].toLowerCase())correctChars++;
}
function commit(){
  if(paused||!['ready','playing','stumble'].includes(mode))return;
  if(!typed.length){feedback('Type the next word first.','warn',1400);return;}
  start();const word=expected(), result=classifyWord(typed,word);
  scoreWord(typed,word);
  if(result==='fall'){
    feedback(`“${typed}” missed “${word}”. Down to a new story!`,'error');
    falls++;beginTransition(false);stats();return;
  }
  wordsTraveled++;wordIndex++;typed='';input.value='';mismatch=false;
  if(wordIndex>=current().words.length){
    feedback('Story complete! There is always another adventure.','',2200);
    beginTransition(true);stats();return;
  }
  targetX=wordX();lastKey=performance.now();input.placeholder=expected();
  if(result==='stumble'){
    transitionPose=renderedPose;
    mode='stumble';animationTime=0;feedback('A little typo. A little trip. Keep going!','warn',1600);
    tone(180,.13,'triangle',.04);status('Watch your step');
  }else if(mode!=='stumble'){
    feedback('Keep going. Press space to finish the word.');status('Finding your flow');
  }
  stats();
}
function beginTransition(complete){
  transitionPose=renderedPose;
  storyComplete=complete;mode='falling';animationTime=0;fallFrom=floorY+level*LEVEL_HEIGHT;
  levels.push(makeLevel(level+1,runnerX));input.disabled=true;velocity=0;
  status(complete?'A story well traveled':'A change of scenery');
  if(!complete){
    const l=current(), w=l.words[Math.min(wordIndex,l.words.length-1)];
    for(let i=0;i<w.word.length;i++)particles.push({x:l.origin+w.x+i*charWidth,y:fallFrom+22,vx:(Math.random()-.5)*110,vy:-30-Math.random()*100,age:0,letter:w.word[i]});
    tone(95,.4,'triangle',.08);
  }else{tone(660,.2,'sine',.04);}
}
function finishTransition(){
  level++;wordIndex=0;typed='';input.value='';mismatch=false;
  targetX=wordX();runnerX=targetX;runnerY=floorY+level*LEVEL_HEIGHT;
  mode='playing';animationTime=0;storyComplete=false;metadata();input.disabled=false;
  velocity=0;runWeight=0;pace=0;gaitMix=0;
  feedback('A fresh story. Take your first step.','',2000);status('Back on your feet');
  if(!paused&&!$('help-dialog').open)input.focus({preventScroll:true});
}
function reset(){
  level=0;wordIndex=0;typed='';mode='ready';paused=false;started=false;
  wordsTraveled=0;falls=0;correctChars=0;attemptedChars=0;elapsed=0;
  cameraX=0;cameraY=0;runnerX=95;runnerY=floorY;targetX=95;
  gait=0;velocity=0;lastKey=0;particles=[];animationTime=0;storyComplete=false;mismatch=false;
  runWeight=0;motionTime=0;renderedPose=idlePose(0);transitionPose=renderedPose;
  pace=0;gaitMix=0;
  levels=[makeLevel(0)];input.value='';input.disabled=false;
  $('pause-overlay').hidden=true;$('start-hint').style.opacity='1';
  $('pause').innerHTML='<kbd>esc</kbd> pause';
  metadata();stats();status('Ready when you are');feedback('Type the story above. Press space after each word.');input.focus({preventScroll:true});
}
function setPause(value){
  if(paused===value)return;paused=value;
  $('pause-overlay').hidden=!value;
  $('pause').innerHTML=`<kbd>esc</kbd> ${value?'resume':'pause'}`;
  input.disabled=value||['falling','splat','rise'].includes(mode);
  velocity=0;lastKey=0;
  status(value?'Paused':started?'Your story continues':'Ready when you are');
  if(!value&&!input.disabled)input.focus({preventScroll:true});
}

function line(points,color=orange,weight=4.6){
  ctx.strokeStyle=color;ctx.lineWidth=weight;ctx.lineCap='round';ctx.lineJoin='round';
  ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();
}
function drawRunner(){
  const traveling=blendPose(walkPose(gait),runPose(gait,pace/150),gaitMix);
  const idleTime=reducedMotion?0:motionTime;
  const base=blendPose(idlePose(idleTime),traveling,runWeight);
  let pose=base;
  if(mode==='stumble')pose=tripPose(transitionPose,base,animationTime/.82);
  else if(mode==='falling')pose=fallPose(transitionPose,animationTime/(reducedMotion?.4:.8),reducedMotion);
  else if(mode==='splat')pose=landPose(transitionPose,animationTime/.32,storyComplete);
  else if(mode==='rise')pose=risePose(animationTime/.72,idleTime,storyComplete);
  if(!paused)renderedPose=pose;
  ctx.save();ctx.translate(runnerX-cameraX,runnerY-cameraY);
  const scale=width<550?.87:1;ctx.scale(scale,scale);
  drawFigure(ctx,paused?renderedPose:pose,orange);
  // A short impact burst stays above the type. There is no oval or platform underfoot.
  if(mode==='splat'&&animationTime<.2&&!reducedMotion){
    const p=animationTime/.2;ctx.globalAlpha=(1-p)*.35;
    for(const direction of [-1,1])line([[direction*(26+p*10),-7],[direction*(31+p*16),-10-p*3]],orange,1.5);
    ctx.globalAlpha=1;
  }
  ctx.restore();
}
function drawStories(){
  ctx.font=`${fontSize}px "Space Mono", Consolas, monospace`;
  ctx.textBaseline='alphabetic';
  for(let n=Math.max(0,level-1);n<levels.length;n++){
    const l=levels[n], y=floorY+n*LEVEL_HEIGHT-cameraY;
    if(y>height+80||y<-70)continue;
    for(let i=0;i<l.words.length;i++){
      const w=l.words[i],x=l.origin+w.x-cameraX;
      if(x+w.width<-40||x>width+40)continue;
      const active=n===level && !['falling','splat','rise'].includes(mode);
      const completed=n<level||(n===level&&i<wordIndex);
      if(n===level&&i===wordIndex&&mode==='falling'&&!storyComplete)continue;
      ctx.fillStyle=completed?'#99ad93':active&&i===wordIndex?ink:'#b2bdac';
      ctx.fillText(w.word,x,y+fontSize*.76);
      if(completed){line([[x,y+fontSize+8],[x+w.width,y+fontSize+8]],'#b8cbb0',1.5);}
      if(active&&i===wordIndex){
        const prefix=matchingPrefix(typed,w.word);
        if(prefix){ctx.save();ctx.beginPath();ctx.rect(x,y-3,prefix*charWidth,fontSize+8);ctx.clip();ctx.fillStyle=orange;ctx.fillText(w.word,x,y+fontSize*.76);ctx.restore();}
        const cursor=x+prefix*charWidth;
        ctx.fillStyle=mismatch?'#cb7950':orange;ctx.fillRect(cursor,y+fontSize+6,Math.max(2,w.width-prefix*charWidth),2);
        if(mismatch){ctx.strokeStyle='#cb795044';ctx.lineWidth=1;ctx.strokeRect(cursor-2,y-4,charWidth+4,fontSize+8);}
      }
    }
  }
  // Soft edges let words arrive and leave without a hard crop.
  const fade=ctx.createLinearGradient(0,0,width,0);
  fade.addColorStop(0,'#ffffff');fade.addColorStop(.035,'#ffffff00');fade.addColorStop(.90,'#ffffff00');fade.addColorStop(1,'#ffffff');
  ctx.fillStyle=fade;ctx.fillRect(0,0,width,height);
}
function frame(now){
  const dt=Math.min((now-(lastTime||now))/1000,.04);lastTime=now;
  if(!paused){
    motionTime+=dt;
    if(started&&['playing','stumble'].includes(mode))elapsed+=dt;
    if(mode==='stumble'){
      animationTime+=dt;if(animationTime>.82){mode='playing';animationTime=0;status('Finding your flow');}
    }
    if(mode==='falling'){
      animationTime+=dt;const duration=reducedMotion?.4:.8, p=clamp(animationTime/duration,0,1);
      runnerY=fallFrom+LEVEL_HEIGHT*p*p-(storyComplete&&!reducedMotion?Math.sin(p*Math.PI)*65:0);
      if(p>=1){transitionPose=fallPose(transitionPose,1,reducedMotion);mode='splat';animationTime=0;runWeight=0;tone(60,.14,'triangle',.07);}
    }else if(mode==='splat'){
      animationTime+=dt;if(animationTime>.32){mode='rise';animationTime=0;}
    }else if(mode==='rise'){
      animationTime+=dt;if(animationTime>.72)finishTransition();
    }else{
      const previousX=runnerX,travel=advanceTravel(runnerX,velocity,targetX,dt);
      runnerX=travel.position;velocity=travel.velocity;runnerY=floorY+level*LEVEL_HEIGHT;
      // Average travel over several keystrokes so one tap cannot switch into a sprint.
      pace=mix(pace,Math.abs(velocity),ease(3.5,dt));
      gaitMix=mix(gaitMix,runningBlend(pace),ease(7,dt));
      if(!reducedMotion)gait+=Math.abs(runnerX-previousX)/strideLength(gaitMix)*Math.PI*2;
      const weight=reducedMotion?0:clamp(Math.abs(velocity)/70,0,1);
      runWeight=mix(runWeight,weight,ease(weight>runWeight?14:10,dt));
      if(runWeight<.001)runWeight=0;
    }
    const cx=Math.max(0,runnerX-width*.29);
    cameraX=mix(cameraX,cx,ease(8,dt));
    cameraY=mix(cameraY,runnerY-floorY,ease(reducedMotion?30:5.5,dt));
    particles.forEach(p=>{p.age+=dt;p.vy+=650*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;});
    particles=particles.filter(p=>p.age<1.4);
    if(feedbackUntil&&now>feedbackUntil){feedbackUntil=0;if(['ready','playing','stumble'].includes(mode))feedback('Keep going. Press space to finish the word.');}
  }
  ctx.clearRect(0,0,width,height);ctx.fillStyle='#fff';ctx.fillRect(0,0,width,height);
  // Tiny registration marks echo an animation canvas without adding scenery.
  ctx.fillStyle='#e0e6da';ctx.fillRect(29,height-24,9,1);ctx.fillRect(29,height-24,1,9);ctx.fillRect(width-38,height-24,9,1);ctx.fillRect(width-29,height-24,1,9);
  drawStories();
  ctx.font=`${fontSize}px "Space Mono", Consolas, monospace`;
  particles.forEach(p=>{ctx.globalAlpha=Math.max(0,1-p.age);ctx.fillStyle='#c69e83';ctx.fillText(p.letter,p.x-cameraX,p.y-cameraY);});ctx.globalAlpha=1;
  drawRunner(now);
  if(now-lastStats>500){stats();lastStats=now;}
  requestAnimationFrame(frame);
}
input.addEventListener('input',onInput);
input.addEventListener('keydown',e=>{
  if((e.key===' '||e.key==='Enter')&&!e.isComposing){e.preventDefault();commit();}
});
input.addEventListener('paste',e=>{e.preventDefault();feedback('One keystroke at a time. This adventure is yours to type.','warn',2200);});
input.addEventListener('focus',()=>{if(!started)feedback('Start with “the”. Your runner is ready.');});
$('canvas-wrap').addEventListener('click',()=>{if(!paused&&!input.disabled)input.focus({preventScroll:true});});
$('restart').addEventListener('click',reset);
$('pause').addEventListener('click',()=>setPause(!paused));
$('resume').addEventListener('click',()=>setPause(false));
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('help-dialog').open){e.preventDefault();setPause(!paused);}});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&started)setPause(true);});
let wasPaused=false;
$('help').addEventListener('click',()=>{wasPaused=paused;setPause(true);$('help-dialog').showModal();});
function closeHelp(){ $('help-dialog').close(); }
$('close-help').addEventListener('click',closeHelp);$('lets-go').addEventListener('click',closeHelp);
$('help-dialog').addEventListener('close',()=>{if(!wasPaused)setPause(false);});
$('sound').addEventListener('click',()=>{
  soundEnabled=!soundEnabled;$('sound').setAttribute('aria-pressed',String(soundEnabled));
  $('sound').innerHTML=`<span id="sound-icon">♪</span> Sound ${soundEnabled?'on':'off'}`;tone(440,.15);
});
new ResizeObserver(size).observe(canvas);
size();levels=[makeLevel(0)];metadata();stats();requestAnimationFrame(frame);
document.fonts.ready.then(size);

