import test from 'node:test';
import assert from 'node:assert/strict';
import {STORY,createTrack,sampleTrack,checkpoint} from '../dist/story.js';
import {idlePose} from '../dist/motion.js';
import {jumpPose,combatPose,swordAngle} from '../dist/story-motion.js';
import {EDGE_TIME,JUMP_WINDOW,checkJump,sampleEdge,sampleLeap,leapDuration,visibleWords} from '../dist/leap.js';
const track=createTrack(word=>word.length*17);
const near=(a,b)=>assert.ok(Math.abs(a-b)<.001,`${a} differs from ${b}`);
test('one complete authored story has six reachable scenes and three numbered ascents',()=>{
  assert.equal(track.chapters.length,6);assert.ok(track.total>120);
  assert.equal(track.tokens.map(t=>t.word).join(' '),STORY.chapters.map(c=>c.text).join(' '));
  const numbers=track.tokens.filter(t=>t.number);assert.deepEqual(numbers.map(t=>t.word),['1','2','3']);
  assert.deepEqual(numbers.map(t=>t.y),[-82,-164,-246]);
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
    const edge=sampleEdge(track,i,origin,EDGE_TIME);near(edge.x,prev.endX);near(edge.y,prev.y);
    const start=sampleLeap(track,i,edge,0),mid=sampleLeap(track,i,edge,duration/2),end=sampleLeap(track,i,edge,duration);
    near(start.x,prev.endX);near(start.y,prev.y);near(end.x,t.x);near(end.y,t.y);
    near(end.x,sampleTrack(track,i).x);near(end.y,sampleTrack(track,i).y);
    assert.ok(mid.y<Math.min(start.y,end.y)-30);assert.ok(t.x-prev.endX>=60);
    const quiet=sampleLeap(track,i,edge,duration/2,true);near(quiet.y,(start.y+end.y)/2);
    assert.deepEqual(sampleLeap(track,i,edge,duration+5),end);
  }
});
test('jump requires the exact lowercase command before the deadline',()=>{
  for(const value of ['','j','ju','jum'])assert.equal(checkJump(value,.5),'waiting');
  assert.equal(checkJump('jump',JUMP_WINDOW-.001),'jump');
  for(const value of ['JUMP','Jump','jmp','jup','jump ','jumx'])assert.equal(checkJump(value,.2),'fall');
  for(const value of ['','j','jum','jump'])assert.equal(checkJump(value,JUMP_WINDOW),'fall');
  const edge=sampleEdge(track,26,{x:track.tokens[25].endX,y:0},JUMP_WINDOW-.001);
  assert.ok(edge.x>track.tokens[25].endX&&edge.y>35,'a slow entry keeps moving down between the words');
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
