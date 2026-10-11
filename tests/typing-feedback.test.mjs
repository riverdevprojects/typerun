import test from 'node:test';
import assert from 'node:assert/strict';
import {letterFeedback,insertedKeys,accuracy,belowMinimum,completedPunctuation,updateExtraLayout} from '../dist/typing-feedback.js';
import {createTrack} from '../dist/story.js';
test('default Monkeytype feedback retains expected letters, marks each mismatch independently, and appends extras',()=>{
  assert.deepEqual(letterFeedback('the','txe!'),[{char:'t',state:'correct'},{char:'h',state:'incorrect'},{char:'e',state:'correct'},{char:'!',state:'extra'}]);
  assert.deepEqual(letterFeedback('the','t').map(l=>l.state),['correct','untyped','untyped']);
  assert.equal(letterFeedback('the','The')[0].state,'incorrect');
});
test('deleted errors stay in the keystroke score and correction adds a new correct key',()=>{
  const keys=[...insertedKeys('','t','the'),...insertedKeys('t','tx','the'),...insertedKeys('tx','t','the'),...insertedKeys('t','th','the')];
  assert.deepEqual(keys,[true,false,true]);assert.equal(accuracy(2,keys.length),2/3*100);
});
test('85 percent is allowed and only a strictly lower chapter score resets',()=>{
  assert.equal(belowMinimum(17,20),false);assert.equal(belowMinimum(16,20),true);assert.equal(belowMinimum(0,0),false);assert.equal(accuracy(0,0),100);
});
test('only entering the expected final punctuation completes a word automatically',()=>{
  assert.equal(completedPunctuation('sun','sun.','sun.'),true);
  assert.equal(completedPunctuation('woods','woods,','woods,'),true);
  assert.equal(completedPunctuation('su','sun','sun.'),false);
  assert.equal(completedPunctuation('sun','sun,','sun.'),false);
  assert.equal(completedPunctuation('sun.','sun','sun.'),false);
  assert.equal(completedPunctuation('sun.','sun.!','sun.'),false);
  assert.equal(completedPunctuation('su','sun','sun'),false);
});
test('extra letters expand the following terrain and backspace restores every affected position',()=>{
  const track=createTrack(w=>w.length*17),before=JSON.stringify(track);
  updateExtraLayout(track,1,'mountain!!',w=>w.length*17);assert.equal(track.tokens[1].extraWidth,34);assert.ok(Number.isFinite(track.tokens.at(-1).x));
  updateExtraLayout(track,1,'mountain',w=>w.length*17);
  delete track.tokens[1].extraWidth;assert.equal(JSON.stringify(track),before);
});
