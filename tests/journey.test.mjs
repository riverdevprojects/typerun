import test from 'node:test';
import assert from 'node:assert/strict';
import {createTrack} from '../dist/story.js';
import {idlePose} from '../dist/motion.js';
import {carryPose,kneelPose} from '../dist/story-motion.js';
import {hearthState,hearthPose,skyPose,sunState,SUN_DURATION,landmarkX} from '../dist/journey.js';
const track=createTrack(w=>w.length*17),hearth=track.chapters.find(c=>c.kind==='hearth');
test('the lantern stays dark until its wick reaches the cave ember',()=>{
  assert.equal(track.tokens[hearth.ignite-1].word,'ember.');
  assert.ok(hearth.kneel<hearth.lower&&hearth.lower<hearth.ignite&&hearth.ignite<hearth.raise);
  assert.equal(hearthState(hearth,hearth.ignite,-1).lit,0);
  assert.equal(hearthState(hearth,hearth.ignite,0).lit,0);
  assert.ok(hearthState(hearth,hearth.ignite,.35).lit>.4);
  assert.equal(hearthState(hearth,hearth.ignite,.7).lit,1);
});
test('the carrying arm stays separate from the free arm and holds the lantern off the ground',()=>{
  for(let time=0;time<4;time+=.05){
    const pose=carryPose(idlePose(time));
    assert.ok(pose.frontHand[0]>pose.backHand[0]+20);
    assert.ok(pose.frontHand[1]+27<-9);
    assert.ok(pose.frontHand[1]>pose.head[1]+25);
  }
  for(let p=0;p<=1;p+=.01){
    const pose=kneelPose(0,p);
    assert.ok(Object.values(pose).flat().every(Number.isFinite));
    assert.ok(pose.frontFoot[1]<=-3&&pose.backFoot[1]<=-3);
  }
  const rest=carryPose(idlePose());
  assert.deepEqual(hearthPose(rest,hearth,hearth.start,0,-1),rest);
  assert.deepEqual(hearthPose(rest,hearth,hearth.end,0,1),rest);
});
test('watchtower motion stays continuous across the old wrap boundaries',()=>{
  for(const camera of [656.25,1312.5,1968.75,4000]){
    const left=landmarkX(1000,3000,camera-.001),right=landmarkX(1000,3000,camera+.001);
    assert.ok(right<left);assert.ok(left-right<.001);
  }
  assert.equal(landmarkX(1000,3000,3000)-landmarkX(1000,3000,3100),16);
});
test('kneeling places the rear knee on the ground and the front shin nearly vertical',()=>{
  const pose=kneelPose(0,1);
  assert.equal(pose.backKnee[1],-3);
  assert.ok(Math.abs(pose.frontKnee[0]-pose.frontFoot[0])<2);
  assert.ok(pose.frontFoot[1]-pose.frontKnee[1]>=20);
  assert.ok(Math.abs(pose.frontKnee[1]-pose.hip[1])<2);
});
test('punctuation never requests a jump while the words cycle in place',()=>{
  for(const token of track.tokens.filter(t=>t.stationary)){
    assert.equal(token.jump,false);assert.equal(token.jumpType,null);
  }
});
test('the sky lantern becomes the sun on a clock and the day settles before the ending',()=>{
  const sky=track.chapters.find(c=>c.kind==='sky');
  assert.equal(track.tokens[sky.hang-1].word,'sky.');assert.ok(sky.reach<sky.hang);
  assert.equal(sunState(-1).phase,'waiting');
  assert.equal(sunState(.5).phase,'lifting');
  assert.equal(sunState(1.5).phase,'opening');
  assert.equal(sunState(3).phase,'igniting');
  assert.equal(sunState(SUN_DURATION).phase,'day');
  let last=0;
  for(let age=0;age<SUN_DURATION;age+=.02){const state=sunState(age);assert.ok(state.day>=last);last=state.day;}
  assert.equal(sunState(SUN_DURATION).day,1);assert.equal(sunState(SUN_DURATION).grow,1);
  assert.equal(sunState(SUN_DURATION/7,true).day,1);
  const rest=carryPose(idlePose());
  const settled=skyPose(rest,sky,sky.end,0,3),idle=idlePose();
  for(const joint of Object.keys(idle))for(let axis=0;axis<2;axis++)assert.ok(Math.abs(settled[joint][axis]-idle[joint][axis])<1e-9);
});
