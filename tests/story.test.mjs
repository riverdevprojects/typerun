import test from 'node:test';
import assert from 'node:assert/strict';
import {STORY,createTrack,sampleTrack,checkpoint} from '../dist/story.js';
import {idlePose} from '../dist/motion.js';
import {jumpPose,combatPose,swordAngle} from '../dist/story-motion.js';
const track=createTrack(word=>word.length*17);
const near=(a,b)=>assert.ok(Math.abs(a-b)<.001,`${a} differs from ${b}`);
test('one complete authored story has six reachable scenes and three numbered ascents',()=>{
  assert.equal(track.chapters.length,6);assert.ok(track.total>120);
  assert.equal(track.tokens.map(t=>t.word).join(' '),STORY.chapters.map(c=>c.text).join(' '));
  const numbers=track.tokens.filter(t=>t.number);assert.deepEqual(numbers.map(t=>t.word),['1','2','3']);
  assert.deepEqual(numbers.map(t=>t.y),[-82,-164,-246]);
});
test('path joins every word and every scene continuously, with feet landing at the text',()=>{
  for(let i=1;i<track.total;i++){
    const before=sampleTrack(track,i-1e-7),after=sampleTrack(track,i+1e-7);
    near(before.x,after.x);near(before.y,after.y);
    const end=sampleTrack(track,i);near(end.x,track.tokens[i-1].endX);near(end.y,track.tokens[i-1].y);
  }
  const end=sampleTrack(track,track.total);near(end.x,track.tokens.at(-1).endX);near(end.y,track.tokens.at(-1).y);
});
test('wide gaps and numbers are real arcs while reduced motion keeps a direct path',()=>{
  for(const [i,t] of track.tokens.entries())if(t.jump){
    const start=sampleTrack(track,i),mid=sampleTrack(track,i+.5),end=sampleTrack(track,i+1),quiet=sampleTrack(track,i+.5,true);
    assert.ok(mid.y<Math.min(start.y,end.y)-30);near(quiet.y,(start.y+end.y)/2);assert.ok(t.x-track.tokens[i-1].endX>=60);
    assert.deepEqual(sampleTrack(track,i+.5),mid);
  }
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
