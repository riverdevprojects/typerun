import test from 'node:test';
import assert from 'node:assert/strict';
import {STORY,createTrack,sampleTrack,checkpoint,punctuationJump} from '../dist/story.js';
import {idlePose} from '../dist/motion.js';
import {jumpPose,jumpLandingPose,carryPose} from '../dist/story-motion.js';
import {jumpLift,sampleLeap,leapDuration,typingFlightRate,visibleWords} from '../dist/leap.js';
const track=createTrack(word=>word.length*17);
const near=(a,b)=>assert.ok(Math.abs(a-b)<.001,`${a} differs from ${b}`);
test('the five-scene story ends with lighting a lantern in a cave, with no dragon or numbered steps',()=>{
  assert.equal(track.chapters.length,5);assert.ok(track.total>100);
  assert.equal(track.tokens.map(t=>t.word).join(' '),STORY.chapters.map(c=>c.text).join(' '));
  assert.deepEqual(track.chapters.map(c=>c.kind),['forest','bridge','tower','cave','hearth']);
  assert.ok(!track.tokens.some(t=>/^[123]$/.test(t.word)||/dragon|sword/.test(t.word)));
  for(let i=1;i<track.total;i++)assert.ok(track.tokens[i].y<=track.tokens[i-1].y+.001);
});
test('only punctuation creates compact jump gaps; numbers and plain words stay connected',()=>{
  assert.equal(punctuationJump('word.'),'single');assert.equal(punctuationJump('word,'),'single');
  for(const word of ['jumped','1','2','3','plain'])assert.equal(punctuationJump(word),null);
  for(let i=1;i<track.total;i++){
    const t=track.tokens[i],previous=track.tokens[i-1];assert.equal(t.jumpType,punctuationJump(previous.word));
    if(t.stationary)continue;
    assert.equal(t.x-previous.endX,t.jumpType?40:22);
    if(!t.jump){const before=sampleTrack(track,i-1e-7),after=sampleTrack(track,i+1e-7);near(before.x,after.x);near(before.y,after.y);}
  }
});
test('single punctuation jumps finish on a clock at continuous landing positions',()=>{
  for(const [i,t] of track.tokens.entries())if(t.jump){
    const previous=track.tokens[i-1],origin={x:previous.endX,y:previous.y},duration=leapDuration(t);
    const start=sampleLeap(track,i,origin,0),mid=sampleLeap(track,i,origin,duration/2),end=sampleLeap(track,i,origin,duration);
    near(start.x,origin.x);near(start.y,origin.y);near(end.x,sampleTrack(track,i).x);near(end.y,sampleTrack(track,i).y);
    assert.ok(mid.y<Math.min(start.y,end.y)-25);
    const quiet=sampleLeap(track,i,origin,duration/2,true);near(quiet.y,(start.y+end.y)/2);
    assert.deepEqual(sampleLeap(track,i,origin,duration+5),end);
  }
});
test('every punctuation mark follows a single arc with one peak',()=>{
  for(const mark of ['.',',','!','?',';',':'])assert.equal(punctuationJump('word'+mark),'single');
  near(jumpLift(0),0);near(jumpLift(1),0);near(jumpLift(.5),1);
  assert.ok(jumpLift(.25)<jumpLift(.5));assert.ok(jumpLift(.75)<jumpLift(.5));
  assert.equal(leapDuration({jumpType:'single'}),.48);
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
test('the active word is rendered at scene changes and at the fire, independent of animation lag',()=>{
  for(const chapter of track.chapters){
    for(const i of [chapter.start,chapter.end-1]){
      const visible=visibleWords(track,i);
      assert.ok(visible.some(v=>v.index===i));
      if(track.tokens[i].stationary)assert.deepEqual(visible.map(v=>v.index),[i]);
    }
  }
  assert.deepEqual(visibleWords(track,track.total).map(v=>v.index),[track.total-1]);
});
test('the fire scene stays on one spot, with a checkpoint at each chapter',()=>{
  const scene=track.chapters.at(-1),positions=track.tokens.slice(scene.stop,scene.end).map(t=>t.endX);
  assert.equal(new Set(positions).size,1);
  for(let i=0;i<track.total;i++)assert.equal(checkpoint(track,i),track.chapters[track.tokens[i].chapter].start);
});
test('single jump poses and landings have continuous endpoints and planted feet',()=>{
  const rest=carryPose(idlePose());assert.deepEqual(jumpPose(rest,0),rest);
  const end=jumpPose(rest,1);for(const k of Object.keys(rest)){near(end[k][0],rest[k][0]);near(end[k][1],rest[k][1]);}
  for(let p=0;p<=1;p+=.01)assert.ok(Object.values(jumpPose(rest,p)).flat().every(Number.isFinite));
  const landing=jumpLandingPose(rest);assert.deepEqual(landing.frontFoot,rest.frontFoot);assert.deepEqual(landing.backFoot,rest.backFoot);assert.deepEqual(jumpLandingPose(rest,0),rest);
});
