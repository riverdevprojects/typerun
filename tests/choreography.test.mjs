import test from 'node:test';
import assert from 'node:assert/strict';
import {createTrack} from '../dist/story.js';
import {battlePose,battleRotation,battleSword,fightPhase,fireStrength} from '../dist/choreography.js';
const track=createTrack(w=>w.length*17);
test('the battle builds through claws, wings, fire, a spin, and a defeated bow',()=>{
  const fight=track.chapters.find(c=>c.kind==='fight'),tokens=track.tokens.slice(fight.start,fight.end);
  assert.deepEqual([...new Set(tokens.map(t=>t.action))],['guard','lunge','wing','fire','spin','bow']);
  for(const t of tokens){assert.equal(fightPhase(t,t.beatStart),0);assert.equal(fightPhase(t,t.beatEnd),1);}
  const fire=battlePose('fire',.5);assert.ok(fire.frontHand[1]<fire.head[1]);assert.ok(fire.backHand[0]<0,'the other hand keeps the sword');
  assert.equal(battleRotation('spin',0),0);assert.equal(battleRotation('spin',1),Math.PI*2);
  assert.equal(fireStrength(0),0);assert.equal(fireStrength(1),0);assert.equal(fireStrength(.5),1);
});
test('fire transitions into the spin continuously and its final pose settles into the bow',()=>{
  assert.deepEqual(battlePose('fire',1),battlePose('spin',0));
  const a=battlePose('spin',1),b=battlePose('bow',0);
  for(const k of Object.keys(a))for(let axis=0;axis<2;axis++)assert.ok(Math.abs(a[k][axis]-b[k][axis])<.001);
  assert.equal(battleSword('fire',1),battleSword('spin',0));
  for(const action of ['guard','lunge','wing','fire','spin','bow'])for(let p=0;p<=1;p+=.01)assert.ok(Object.values(battlePose(action,p)).flat().every(Number.isFinite));
});
test('the dragon breath lights the carried lantern before the cave and summit',()=>{
  const cave=track.chapters.find(c=>c.kind==='cave'),dawn=track.chapters.find(c=>c.kind==='dawn');
  const fight=track.chapters.find(c=>c.kind==='fight');assert.equal(track.tokens[fight.capture-1].word,'breath.');assert.ok(fight.capture<fight.end&&fight.end===cave.start);assert.ok(track.chapters[0].text.includes('empty lantern'));assert.ok(!track.chapters.some(c=>c.text.includes('sword')));
  assert.ok(dawn.hang<dawn.hook&&dawn.hook<dawn.end);
  const ending=track.tokens.slice(dawn.hang,dawn.end);assert.ok(ending.every(t=>t.stationary));assert.equal(new Set(ending.map(t=>t.endX)).size,1);
});
