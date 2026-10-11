import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyWord,matchingPrefix,layoutWords,STORIES} from '../dist/engine.js';
test('commits exact words and accepts capitalization',()=>{
  assert.equal(classifyWord('the','the'),'correct');assert.equal(classifyWord('Yesterday.','yesterday.'),'correct');
});
test('common typo and adjacent transposition stumble; other errors fall',()=>{
  for(const [a,b] of [['teh','the'],['adn','and'],['littel','little'],['paht','path']])assert.equal(classifyWord(a,b),'stumble');
  for(const [a,b] of [['cat','the'],['','door'],['t','the'],['thet','that']])assert.equal(classifyWord(a,b),'fall');
});
test('punctuation is required even with a spelling exception',()=>{
  assert.equal(classifyWord('teh.','the.'),'stumble');assert.equal(classifyWord('teh','the.'),'fall');assert.equal(classifyWord('door','door,'),'fall');
});
test('progress stops at first mismatch and can be recovered by correcting',()=>{
  assert.equal(matchingPrefix('th','the'),2);assert.equal(matchingPrefix('teh','the'),1);assert.equal(matchingPrefix('THE','the'),3);assert.equal(matchingPrefix('thee','the'),3);
});
test('stories form continuous word platforms with consistent gaps',()=>{
  assert.ok(STORIES.length>=5);
  const words=layoutWords('the little door',w=>w.length*10,19);
  assert.deepEqual(words.map(w=>w.x),[0,49,128]);assert.equal(words[2].width,40);
  assert.ok(STORIES.every(s=>s.text.split(' ').length>30));
});
