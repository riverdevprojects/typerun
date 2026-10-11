import test from 'node:test';
import assert from 'node:assert/strict';
import {STORY,createTrack,sampleTrack,checkpoint,punctuationJump} from '../dist/story.js';
import {idlePose} from '../dist/motion.js';
import {jumpPose,doubleJumpPose,jumpLandingPose,dragPose,combatPose,swordAngle} from '../dist/story-motion.js';
import {jumpLift,sampleLeap,leapDuration,typingFlightRate,visibleWords} from '../dist/leap.js';
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
test('only punctuation creates jumps and wide gaps; numbers and plain words stay connected',()=>{
  assert.equal(punctuationJump('word.'),'double');assert.equal(punctuationJump('word,'),'single');
  for(const word of ['jumped','1','2','3','plain'])assert.equal(punctuationJump(word),null);
  for(let i=1;i<track.total;i++){
    const t=track.tokens[i],previous=track.tokens[i-1];assert.equal(t.jumpType,punctuationJump(previous.word));
    if(t.kind==='fight'||t.stationary)continue;
    assert.equal(t.x-previous.endX,t.jumpType==='double'?48:t.jumpType==='single'?75:22);
    if(!t.jump){const before=sampleTrack(track,i-1e-7),after=sampleTrack(track,i+1e-7);near(before.x,after.x);near(before.y,after.y);}
  }
});
test('single and double punctuation jumps finish on a clock at continuous landing positions',()=>{
  for(const [i,t] of track.tokens.entries())if(t.jump){
    const previous=track.tokens[i-1],origin={x:previous.endX,y:previous.y},duration=leapDuration(t);
    const start=sampleLeap(track,i,origin,0),mid=sampleLeap(track,i,origin,duration/2),end=sampleLeap(track,i,origin,duration);
    near(start.x,origin.x);near(start.y,origin.y);near(end.x,sampleTrack(track,i).x);near(end.y,sampleTrack(track,i).y);
    assert.ok(mid.y<Math.min(start.y,end.y)-25);
    const quiet=sampleLeap(track,i,origin,duration/2,true);near(quiet.y,(start.y+end.y)/2);
    assert.deepEqual(sampleLeap(track,i,origin,duration+5),end);
  }
});
test('a period has a second upward impulse without touching the ground between jumps',()=>{
  assert.equal(jumpLift(0,'double'),0);near(jumpLift(1,'double'),0);
  assert.ok(jumpLift(.32,'double')>0);assert.ok(jumpLift(.5,'double')>jumpLift(.32,'double'));
  near(jumpLift(.32-1e-7,'double'),jumpLift(.32+1e-7,'double'));
  assert.equal(leapDuration({jumpType:'double'}),.82);assert.equal(leapDuration({jumpType:'single'}),.48);
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
