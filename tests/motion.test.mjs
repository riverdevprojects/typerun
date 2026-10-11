import test from 'node:test';
import assert from 'node:assert/strict';
import {idlePose,runPose,tripPose,fallPose,landPose,risePose,advanceTravel} from '../dist/motion.js';
const near=(a,b,tolerance=1e-7)=>assert.ok(Math.abs(a-b)<tolerance,`${a} differs from ${b}`);
const compare=(a,b,tolerance=1e-7)=>Object.keys(a).forEach(joint=>a[joint].forEach((v,i)=>near(v,b[joint][i],tolerance)));

test('idle arms hang outside the torso and feet stay above the words',()=>{
  for(let time=0;time<8;time+=.1){
    const pose=idlePose(time);
    assert.ok(pose.frontHand[0]<pose.hip[0]);assert.ok(pose.backHand[0]>pose.hip[0]);
    assert.ok(pose.frontHand[1]>pose.frontElbow[1]);assert.ok(pose.backHand[1]>pose.backElbow[1]);
    assert.ok(pose.frontFoot[1]<=-3&&pose.backFoot[1]<=-3);
  }
});
test('running cycle wraps smoothly and planted feet do not penetrate text',()=>{
  compare(runPose(0),runPose(Math.PI*2));
  for(let phase=0;phase<Math.PI*2;phase+=.02){
    const pose=runPose(phase);assert.ok(Object.values(pose).flat().every(Number.isFinite));
    assert.ok(pose.frontFoot[1]<=-3&&pose.backFoot[1]<=-3);
  }
  // The seam has the same tangent on both sides, rather than resetting the gait.
  const h=1e-4,left=runPose(-h),center=runPose(0),right=runPose(h);
  Object.keys(center).forEach(k=>center[k].forEach((v,i)=>near((v-left[k][i])/h,(right[k][i]-v)/h,.1)));
});
test('trip and fall begin from the pose that was actually on screen',()=>{
  const entry=runPose(1.7),base=idlePose(.8);
  compare(tripPose(entry,base,0),entry);compare(tripPose(entry,base,1),base);
  compare(fallPose(entry,0),entry);compare(fallPose(entry,0,true),entry);
  compare(landPose(entry,0),entry);
});
test('get-up joins the landing pose and ends in idle without a pop',()=>{
  const entry=runPose(1);
  for(const complete of [false,true]){
    compare(landPose(entry,1,complete),risePose(0,2,complete));
    compare(risePose(1,2,complete),idlePose(2));
  }
  for(const seam of [.34,.68])compare(risePose(seam-1e-6),risePose(seam+1e-6),.0001);
});
test('travel smoothing is independent of frame rate and settles without overshoot',()=>{
  const advance=fps=>{let state={position:0,velocity:0};for(let i=0;i<fps;i++)state=advanceTravel(state.position,state.velocity,100,1/fps);return state;};
  const a=advance(30),b=advance(60),c=advance(120);near(a.position,b.position);near(b.position,c.position);near(a.velocity,c.velocity);
  let state={position:0,velocity:0};for(let i=0;i<120;i++){state=advanceTravel(state.position,state.velocity,100,1/60);assert.ok(state.position<=100&&state.position>=0);}
  near(state.position,100,.001);near(state.velocity,0,.001);
});
