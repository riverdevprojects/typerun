import test from 'node:test';
import assert from 'node:assert/strict';
import {STORY,createTrack,sampleTrack,checkpoint} from '../dist/story.js';
import {idlePose} from '../dist/motion.js';
import {jumpPose,doubleJumpPose,jumpLandingPose,dragPose,combatPose,swordAngle} from '../dist/story-motion.js';
import {EDGE_TIME,JUMP_WINDOW,checkJump,sampleEdge,sampleLeap,leapDuration,typingFlightRate,visibleWords} from '../dist/leap.js';
const track=createTrack(word=>word.length*17);
const near=(a,b)=>assert.ok(Math.abs(a-b)<.001,`${a} differs from ${b}`);
test('one complete mountain story has seven scenes, a cave, and three numbered ascents',()=>{
  assert.equal(track.chapters.length,7);assert.ok(track.total>200);
  assert.equal(track.tokens.map(t=>t.word).join(' '),STORY.chapters.map(c=>c.text).join(' '));
  const numbers=track.tokens.filter(t=>t.number);assert.deepEqual(numbers.map(t=>t.word),['1','2','3']);
  assert.ok(numbers[0].y<-150);
  for(let i=1;i<numbers.length;i++)assert.ok(numbers[i].y<numbers[i-1].y-82);
  assert.deepEqual(track.chapters.map(c=>c.kind),['forest','bridge','tower','approach','fight','cave','dawn']);
  for(let i=1;i<track.total;i++)assert.ok(track.tokens[i].y<=track.tokens[i-1].y+.001);
});
test('solid ground joins continuously; gap words start on their landing platform',()=>{
  for(let i=1;i<track.total;i++){
    if(track.tokens[i].jump){
      const t=track.tokens[i],start=sampleTrack(track,i),half=sampleTrack(track,i+.5);
      near(start.x,t.x);near(start.y,t.y);near(half.y,t.y);continue;
    }
    const before=sampleTrack(track,i-1e-7),after=sampleTrack(track,i+1e-7);
    near(before.x,after.x);near(before.y,after.y);
    const end=sampleTrack(track,i);near(end.x,track.tokens[i-1].endX);near(end.y,track.tokens[i-1].y);
  }
  const end=sampleTrack(track,track.total);near(end.x,track.tokens.at(-1).endX);near(end.y,track.tokens.at(-1).y);
});
test('leaps finish on a clock without another keystroke, including numbered ascents',()=>{
  for(const [i,t] of track.tokens.entries())if(t.jump){
    const prev=track.tokens[i-1],origin={x:prev.endX,y:prev.y},duration=leapDuration(t);
    const edge=sampleEdge(track,i,origin,EDGE_TIME);near(edge.x,prev.endX);assert.ok(edge.y<prev.y,'the first Space has already lifted the runner');
    const start=sampleLeap(track,i,edge,0),mid=sampleLeap(track,i,edge,duration/2),end=sampleLeap(track,i,edge,duration);
    near(start.x,prev.endX);near(start.y,edge.y);near(end.x,t.x);near(end.y,t.y);
    near(end.x,sampleTrack(track,i).x);near(end.y,sampleTrack(track,i).y);
    assert.ok(mid.y<Math.min(start.y,end.y)-30);assert.ok(t.x-prev.endX>=60);
    const quiet=sampleLeap(track,i,edge,duration/2,true);near(quiet.y,(start.y+end.y)/2);
    assert.deepEqual(sampleLeap(track,i,edge,duration+5),end);
  }
});
test('a second Space boosts the first hop; missed or wrong inputs fail',()=>{
  assert.equal(checkJump(null,.5),'waiting');
  assert.equal(checkJump('Space',JUMP_WINDOW-.001),'jump');
  for(const key of ['Enter','jump','Letter'])assert.equal(checkJump(key,.2),'fall');
  for(const key of [null,'Space'])assert.equal(checkJump(key,JUMP_WINDOW),'fall');
  const edge=sampleEdge(track,26,{x:track.tokens[25].endX,y:0},JUMP_WINDOW-.001);
  assert.ok(edge.x>track.tokens[25].endX&&edge.y>track.tokens[25].y+35,'a slow entry keeps moving down between the words');
});
test('jumped launches a super jump over a gap eight times wider than the regular crossing',()=>{
  const i=track.tokens.findIndex(t=>t.superJump),t=track.tokens[i],previous=track.tokens[i-1];
  assert.equal(previous.word,'jumped');assert.equal(t.word,'across');
  assert.equal(t.x-previous.endX,640);assert.ok(t.arc>150);assert.ok(leapDuration(t)>1);
  assert.equal(track.tokens.filter(t=>t.superJump).length,1);
  const origin={x:previous.endX,y:previous.y},mid=sampleLeap(track,i,origin,leapDuration(t)/2);
  assert.ok(mid.x>origin.x+300&&mid.y<origin.y-150);
  const end=sampleLeap(track,i,origin,leapDuration(t));near(end.x,t.x);near(end.y,t.y);
});
test('typing in flight advances the arc faster and lands at the typed part of the word',()=>{
  const i=track.tokens.findIndex(t=>t.jump),token=track.tokens[i],origin={x:token.fromX,y:token.fromY};
  const dt=.06,base=sampleLeap(track,i,origin,dt),fast=sampleLeap(track,i,origin,dt*typingFlightRate(4,8),false,.5);
  assert.ok(fast.p>base.p);assert.ok(fast.x>base.x);
  assert.equal(typingFlightRate(0,8),1);assert.equal(typingFlightRate(8,8),4);assert.equal(typingFlightRate(80,8),4);
  const end=sampleLeap(track,i,origin,leapDuration(token),false,.5);
  near(end.x,token.x+token.width*.5);near(end.y,token.y);
  const ground=sampleTrack(track,i+.5,false,i);near(end.x,ground.x);near(end.y,ground.y);
});
test('finishing a word without submitting it cannot cross a gap or suspend the runner',()=>{
  for(const [i,t] of track.tokens.entries())if(t.jump){
    const previous=track.tokens[i-1],finished=sampleTrack(track,i,false,i-1);
    near(finished.x,previous.endX);near(finished.y,previous.y);assert.equal(finished.token,previous);
    const halfway=sampleTrack(track,i+.5,false,i);near(halfway.y,t.y);assert.equal(halfway.air,0);
  }
});
test('the active word is rendered at scene changes and during the fight, independent of animation lag',()=>{
  for(const chapter of track.chapters){
    for(const i of [chapter.start,chapter.end-1]){
      const visible=visibleWords(track,i);
      assert.ok(visible.some(v=>v.index===i));
      if(chapter.kind==='fight')assert.deepEqual(visible.map(v=>v.index),[i]);
    }
  }
  assert.deepEqual(visibleWords(track,track.total).map(v=>v.index),[track.total-1]);
});
test('combat words replace each other on one spot and errors return to the current scene',()=>{
  const scene=track.chapters.find(c=>c.kind==='fight');
  const positions=track.tokens.slice(scene.start,scene.end).map(t=>t.endX);assert.equal(new Set(positions).size,1);
  assert.ok(new Set(track.tokens.slice(scene.start,scene.end).map(t=>t.action)).size>=3);
  for(let i=0;i<track.total;i++)assert.equal(checkpoint(track,i),track.chapters[track.tokens[i].chapter].start);
});
test('jump and attack poses have continuous starts, recoveries, and planted combat feet',()=>{
  const idle=idlePose();assert.deepEqual(jumpPose(idle,0),idle);
  for(const action of ['slash','parry','duck','finish']){
    assert.deepEqual(combatPose(0,action),combatPose(1,action));near(swordAngle(0,action),swordAngle(1,action));
    for(let p=0;p<=1;p+=.01){const pose=combatPose(p,action);assert.ok(Object.values(pose).flat().every(Number.isFinite));assert.ok(pose.frontFoot[1]<=-3&&pose.backFoot[1]<=-3);}
    for(const seam of [.28,.58]){const a=combatPose(seam-1e-7,action),b=combatPose(seam+1e-7,action);for(const k of Object.keys(a)){near(a[k][0],b[k][0]);near(a[k][1],b[k][1]);}}
  }
});
test('the second jump kicks, tucks, and lands continuously with planted landing feet',()=>{
  const rest=dragPose(idlePose()),entry=jumpPose(rest,.2);
  assert.deepEqual(doubleJumpPose(entry,0,rest),entry);
  const end=doubleJumpPose(entry,1,rest),settled=jumpLandingPose(rest);
  for(const k of Object.keys(end)){near(end[k][0],settled[k][0]);near(end[k][1],settled[k][1]);}
  assert.ok(doubleJumpPose(entry,.42).frontFoot[1]<doubleJumpPose(entry,.16).frontFoot[1]);
  for(const seam of [.16,.42,.82]){
    const a=doubleJumpPose(entry,seam-1e-7),b=doubleJumpPose(entry,seam+1e-7);
    for(const k of Object.keys(a)){near(a[k][0],b[k][0]);near(a[k][1],b[k][1]);}
  }
  for(let p=0;p<=1;p+=.01)assert.ok(Object.values(doubleJumpPose(entry,p)).flat().every(Number.isFinite));
  const landing=jumpLandingPose(rest);assert.deepEqual(landing.frontFoot,rest.frontFoot);assert.deepEqual(landing.backFoot,rest.backFoot);
  assert.deepEqual(jumpLandingPose(rest,0),rest);
});
