import test from 'node:test';
import assert from 'node:assert/strict';
import {createTrack} from '../dist/story.js';
import {idlePose} from '../dist/motion.js';
import {carryPose,kneelPose} from '../dist/story-motion.js';
import {hearthState,hearthPose,landmarkX} from '../dist/journey.js';
const track=createTrack(w=>w.length*17),hearth=track.chapters.at(-1);
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
