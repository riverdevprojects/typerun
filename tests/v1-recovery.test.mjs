import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as engine from '../dist/engine.js';
import * as motion from '../dist/motion.js';

const load=name=>readFileSync(new URL('../dist/'+name,import.meta.url),'utf8');
const source=load('game.js').replace(/^import .*;\r?\n/gm,'');
const markup=load('index.html');
// Resolve controls in document order from the shipped views, not a second menu spec.
const views=Object.fromEntries(['settings','help','confirm'].map(name=>{
  const html=markup.split(`id="${name}-view"`)[1].split(/id="(?:help|confirm)-view"|<\/dialog>/)[0];
  return [name+'-view',[...html.matchAll(/<(?:button|input)\b[^>]*\bid="([^"]+)"[^>]*>/g)].map(m=>m[1])];
}));
function game(reduced=false,storage=new Map()){
  const elements=new Map(),noop=()=>{};let now=0;
  const ctx=new Proxy({measureText:w=>({width:w.length*17.4})},{get:(o,k)=>o[k]??noop});
  const doc={listeners:{},fonts:{ready:Promise.resolve()},addEventListener(name,fn){this.listeners[name]=fn;}};
  function element(id){
    if(!elements.has(id)){
      assert.ok(markup.includes(`id="${id}"`),id);
      elements.set(id,{id,value:'',disabled:false,style:{},open:false,listeners:{},type:id.endsWith('-mode')?'radio':'',
        getContext:()=>ctx,getBoundingClientRect:()=>({width:1000,height:326}),setAttribute:noop,
        addEventListener(name,fn){this.listeners[name]=fn;},focus(){doc.activeElement=this;this.focused=true;},
        showModal(){this.open=true;},close(){this.open=false;},querySelectorAll(){return views[id].map(element);}});
    }return elements.get(id);
  }
  doc.getElementById=element;
  const context=vm.createContext({...engine,...motion,document:doc,matchMedia:()=>({matches:reduced}),devicePixelRatio:1,localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)},performance:{now:()=>now},ResizeObserver:class{observe(){}},requestAnimationFrame:noop});
  const run=code=>vm.runInContext(code,context);run(source);
  const wait=ms=>{now+=ms;},step=(ms=10)=>{wait(ms);run(`frame(${now})`);};
  const until=condition=>{for(let i=0;i<1000&&!run(condition);i++)step();assert.ok(run(condition),condition);};
  const type=value=>{element('typing').value=value;run('onInput()');};
  const submit=value=>{type(value);run('commit()');};
  const fall=()=>{submit('wrong');until("mode==='splat'");};
  const click=id=>element(id).listeners.click();
  const key=(key,shiftKey=false,repeat=false)=>{let prevented=false;doc.listeners.keydown({key,shiftKey,repeat,preventDefault(){prevented=true;}});return prevented;};
  const toggle=()=>{key('Escape');click(run('streakMode')?'floor-mode':'streak-mode');if(run('pending'))click('confirm');else click('resume');};
  const minimum=v=>{element('minimum-accuracy').value=v;element('minimum-accuracy').listeners.input();};
  return {run,step,wait,until,type,submit,fall,toggle,input:element('typing'),element,click,key,doc,minimum};
}

test('v1 enables and focuses the fresh story at impact, before recovery ends',()=>{
  const g=game();g.fall();assert.equal(g.input.disabled,false);assert.equal(g.input.focused,true);assert.equal(g.run('level'),1);assert.equal(g.input.placeholder,'the');
  g.submit('the');g.type('fi');assert.equal(g.run('wordIndex'),1);assert.equal(g.run('typed'),'fi');g.until("mode==='playing'");assert.equal(g.run('wordIndex'),1);assert.equal(g.input.value,'fi');assert.equal(g.run('targetX'),g.run('wordX()+2*charWidth'));
});
test('typing springs back up sooner than waiting, including reduced motion',()=>{
  for(const reduced of [false,true]){const idle=game(reduced),active=game(reduced);idle.fall();active.fall();active.type('t');active.type('th');active.submit('the');for(let i=0;i<25;i++){idle.step();active.step();}assert.equal(active.run('mode'),'playing');assert.notEqual(idle.run('mode'),'playing');}
});
test('pause freezes recovery and resume preserves entered letters',()=>{
  const g=game();g.fall();g.type('t');g.run('setPause(true)');const time=g.run('animationTime');for(let i=0;i<30;i++)g.step();assert.equal(g.run('animationTime'),time);assert.equal(g.input.disabled,true);g.run('setPause(false)');assert.equal(g.input.disabled,false);assert.equal(g.input.value,'t');
});
test('a fresh story gets new accuracy and grace, including typing during recovery',()=>{
  const g=game();g.fall();g.submit('wrong');assert.notEqual(g.run('mode'),'falling');assert.equal(g.input.disabled,false);assert.equal(g.run('storyElapsed'),0);assert.equal(g.run('storyAccuracy()'),0);g.until("mode==='falling'");g.until("mode==='splat'");assert.equal(g.run('level'),2);assert.equal(g.input.disabled,false);assert.equal(g.run('storyAccuracy()'),100);assert.equal(g.run('storyStarted'),false);
});
test('story completion also accepts and preserves input during landing',()=>{
  const g=game();g.run('wordIndex=current().words.length-1');g.submit(g.run('expected()'));g.until("mode==='splat'");g.submit('the');g.submit('first');g.until("mode==='playing'");assert.equal(g.run('wordIndex'),2);assert.equal(g.run('wordsTraveled'),3);
});
test('WPM stays frozen throughout a fall and resumes when input unlocks at impact',()=>{
  for(const reduced of [false,true]){const g=game(reduced);g.step();g.submit('the');for(let i=0;i<100;i++)g.step();g.submit('wrong');g.until("mode==='falling'");const elapsed=g.run('elapsed'),wpm=g.element('wpm').textContent;assert.ok(wpm>0);while(g.run("mode==='falling'")){g.step();g.run('stats()');assert.equal(g.run('elapsed'),elapsed);assert.equal(g.element('wpm').textContent,wpm);}assert.equal(g.input.disabled,false);for(let i=0;i<100;i++)g.step();g.run('stats()');assert.ok(g.run('elapsed')>elapsed);assert.ok(g.element('wpm').textContent<wpm);g.run('setPause(true)');const pausedElapsed=g.run('elapsed');for(let i=0;i<20;i++)g.step();assert.equal(g.run('elapsed'),pausedElapsed);}
});
test('the first wrong word advances without falling until five active seconds',()=>{
  const g=game();g.step();for(let i=0;i<600;i++)g.step();assert.equal(g.run('storyElapsed'),0);g.submit('xxx');assert.equal(g.run('wordIndex'),1);assert.equal(g.run('falls'),0);for(let i=0;i<499;i++)g.step();assert.notEqual(g.run('mode'),'falling');g.step();assert.equal(g.run('mode'),'falling');assert.equal(g.run('falls'),1);
});
test('recovering accuracy before grace ends prevents a fall',()=>{
  const g=game();g.step();g.minimum(50);g.submit('xxx');for(let i=0;i<490;i++)g.step();g.submit('door');for(let i=0;i<30;i++)g.step();assert.ok(g.run('storyAccuracy()')>=50);assert.equal(g.run('falls'),0);
});
test('the exact minimum is safe, and live input below it falls after grace',()=>{
  const g=game();g.step();g.minimum(50);g.type('tx');for(let i=0;i<510;i++)g.step();assert.equal(g.run('storyAccuracy()'),50);assert.equal(g.run('falls'),0);g.type('txx');assert.equal(g.run('mode'),'falling');assert.equal(g.run('falls'),1);
});
test('grace and accuracy enforcement stop during pause',()=>{
  const g=game();g.step();g.submit('xxx');for(let i=0;i<400;i++)g.step();g.run('setPause(true)');const time=g.run('storyElapsed');for(let i=0;i<600;i++)g.step();assert.equal(g.run('storyElapsed'),time);assert.equal(g.run('falls'),0);g.run('setPause(false)');g.until("mode==='falling'");assert.equal(g.run('falls'),1);
});
test('slider updates live, enforces strict 100 percent, and allows zero percent',()=>{
  const g=game();g.step();g.minimum(0);g.submit('xxx');for(let i=0;i<510;i++)g.step();assert.equal(g.run('falls'),0);assert.equal(g.element('minimum-accuracy-value').textContent,'0%');g.minimum(100);assert.equal(g.run('mode'),'falling');g.until("mode==='splat'");g.submit('xxx');assert.equal(g.run('falls'),2);assert.equal(g.run('minimumAccuracy'),100);g.run('reset()');assert.equal(g.run('minimumAccuracy'),100);assert.equal(g.run('storyElapsed'),0);
});
test('100 percent accepts correct early input but the first wrong letter falls immediately',()=>{
  const g=game();g.minimum(100);assert.equal(g.element('accuracy-grace').textContent,'100% accuracy · no grace period');g.type('t');g.type('th');assert.equal(g.run('falls'),0);g.type('thx');assert.equal(g.run('storyElapsed'),0);assert.equal(g.run('mode'),'falling');assert.equal(g.run('falls'),1);
});
test('100 percent also falls on an incomplete submitted word during the first five seconds',()=>{
  const g=game();g.minimum(100);g.submit('t');assert.equal(g.run('mode'),'falling');assert.equal(g.run('falls'),1);
});
test('99 percent still gives the full grace period',()=>{
  const g=game();g.step();g.minimum(99);g.submit('xxx');for(let i=0;i<499;i++)g.step();assert.equal(g.run('falls'),0);g.step();assert.equal(g.run('falls'),1);
});
test('switching restarts and persists the rule without losing the accuracy setting',()=>{
  const storage=new Map(),g=game(false,storage);assert.equal(g.run('streakMode'),false);g.minimum(100);g.submit('the');g.toggle();assert.equal(g.run('wordsTraveled'),0);assert.equal(g.element('minimum-accuracy').disabled,true);g.submit('teh');g.run('reset()');assert.equal(g.run('wrongStreak'),0);const fresh=game(false,storage);assert.equal(fresh.run('streakMode'),true);fresh.toggle();assert.equal(fresh.element('minimum-accuracy').disabled,false);fresh.type('x');assert.equal(fresh.run('falls'),1);
});
test('streak ignores live mismatches and counts every wrong submission, including typos',()=>{
  const g=game();g.toggle();g.type('xxx');g.step(7000);assert.equal(g.run('falls'),0);g.submit('teh');assert.equal(g.run('mode'),'stumble');g.submit('xxx');g.submit('AT');g.submit('teh');g.submit('xxx');assert.equal(g.run('falls'),0);g.submit('fo');assert.equal(g.run('falls'),1);assert.equal(g.run('wordsTraveled'),5);g.until("mode==='splat'");g.submit('teh');assert.equal(g.run('wrongStreak'),1);assert.equal(g.run('wordIndex'),1);
});
test('WPM and versioned best use correct submissions, not distance or character count',()=>{
  const storage=new Map([['typerun-best','99999'],['typerun-best-v2','Infinity']]);const g=game(false,storage);g.toggle();g.submit('teh');g.type('door');g.wait(60000);g.run('commit()');for(let i=1;i<9;i++)g.submit(g.run('expected()'));assert.equal(g.element('distance').textContent,10);assert.equal(g.element('wpm').textContent,9);assert.equal(g.run('best'),0);g.submit(g.run('expected()'));assert.equal(g.element('wpm').textContent,10);assert.equal(storage.get('typerun-best-v2'),'10');assert.equal(game(false,storage).run('best'),10);
});
test('zero timestamp and slow frames: only animation time is capped',()=>{
  const g=game();g.step(0);g.type('x');g.step(4999);assert.equal(g.run('elapsed'),4.999);assert.equal(g.run('motionTime'),.04);assert.equal(g.run('falls'),0);g.step(1);assert.equal(g.run('falls'),1);
});
test('no frames: pause and resume split the interval; late input cannot undo expired grace',()=>{
  const g=game();g.wait(9000);g.type('x');g.wait(3000);g.run('setPause(true)');assert.equal(g.run('elapsed'),3);g.wait(80000);g.run('setPause(false)');g.wait(2000);g.type('the');assert.equal(g.run('elapsed'),5);assert.equal(g.run('storyElapsed'),5);assert.equal(g.run('mode'),'falling');g.wait(20000);g.until("mode==='splat'");assert.equal(g.run('elapsed'),5);assert.equal(g.run('storyElapsed'),0);
});

test('Esc protects partial input, active time and focus across all three dialog views',()=>{
  const g=game();g.type('th');g.wait(1200);g.key('Escape');assert.equal(g.run('paused'),true);assert.equal(g.element('page').inert,true);assert.equal(g.doc.activeElement.id,'resume');
  g.key('Escape',false,true);assert.equal(g.element('menu').open,true);g.key('Tab',true);assert.equal(g.doc.activeElement.id,'restart');g.key('Tab');assert.equal(g.doc.activeElement.id,'resume');
  g.click('help');assert.equal(g.doc.activeElement.id,'back');g.key('Tab');assert.equal(g.doc.activeElement.id,'back');g.key('Escape');assert.equal(g.doc.activeElement.id,'help');
  for(const id of ['words-mode','streak-mode','restart']){g.click(id);assert.equal(g.doc.activeElement.id,'cancel');g.key('Tab',true);assert.equal(g.doc.activeElement.id,'confirm');g.key('Escape');assert.equal(g.doc.activeElement.id,id);assert.equal(g.input.value,'th');}
  g.step(90000);g.key('Escape');assert.equal(g.run('paused'),false);assert.equal(g.doc.activeElement.id,'typing');assert.equal(g.element('page').inert,false);assert.equal(g.input.value,'th');assert.equal(g.run('elapsed'),1.2);assert.equal(g.run('storyElapsed'),1.2);
  g.run('setPause(true)');g.click('settings');g.click('resume');assert.equal(g.run('paused'),true);
});
test('all settings belong to Settings and survive reload',()=>{
  const storage=new Map(),g=game(false,storage);g.click('settings');
  assert.deepEqual(views['settings-view'],['resume','story-mode','words-mode','floor-mode','streak-mode','minimum-accuracy','sound','help','restart']);
  g.click('words-mode');g.minimum(77);g.click('streak-mode');g.element('sound').checked=true;g.element('sound').listeners.change();assert.equal(g.run('paused'),true);g.click('resume');
  const fresh=game(false,storage);fresh.click('settings');for(const id of ['words-mode','streak-mode','sound'])assert.equal(fresh.element(id).checked,true);assert.equal(fresh.element('minimum-accuracy').value,77);assert.equal(fresh.element('minimum-accuracy').disabled,true);assert.equal(fresh.element('story-title').textContent,'Words');
});
test('confirmed game change discards progress once and keeps best; hiding never auto-resumes',()=>{
  const storage=new Map([['typerun-best-v2','48']]),g=game(false,storage);g.submit('the');g.type('d');g.doc.hidden=true;g.doc.listeners.visibilitychange();g.doc.hidden=false;g.doc.listeners.visibilitychange();assert.equal(g.run('paused'),true);g.click('words-mode');assert.equal(g.element('dialog-title').textContent,'Change game?');assert.equal(storage.has('typerun-game-mode'),false);g.run('let resets=0;const originalReset=reset;reset=()=>{resets++;originalReset();}');g.click('confirm');assert.equal(g.run('resets'),1);assert.equal(g.run('gameMode'),'words');assert.equal(g.run('mode'),'ready');assert.equal(g.run('wordsTraveled'),0);assert.equal(g.run('best'),48);assert.equal(g.input.value,'');assert.equal(g.element('menu').open,false);assert.equal(g.run('paused'),false);
});
test('English 200 produces deterministic lowercase batches with no adjacent duplicates',()=>{
  const {WORDS_200,generateBatch}=engine;assert.equal(WORDS_200.length,200);assert.equal(new Set(WORDS_200).size,200);assert.ok(WORDS_200.every(w=>/^[a-z]+$/.test(w)));assert.equal(WORDS_200[13],'i');
  const seeded=seed=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
  const batch=generateBatch(seeded(7));assert.deepEqual(batch,generateBatch(seeded(7)));assert.equal(batch.length,50);assert.ok(batch.every((w,i)=>WORDS_200.includes(w)&&w!==batch[i-1]));assert.notEqual(generateBatch(()=>0,'the')[0],'the');
});
test('Words uses correct submissions for WPM, trips, third-strike falls, recovery and batch completion',()=>{
  const g=game(false,new Map([['typerun-game-mode','words'],['typerun-consecutive-mistakes','true']]));g.type('xxx');g.wait(60000);g.run('commit()');assert.equal(g.run('mode'),'stumble');for(let i=0;i<10;i++)g.submit(g.run('expected()'));assert.equal(g.run('best'),10);assert.equal(g.run('wordsTraveled'),11);assert.equal(g.run('wrongStreak'),0);g.submit('xxx');g.submit('xxx');g.submit('xxx');assert.equal(g.run('falls'),1);assert.equal(g.run('wordsTraveled'),13);const elapsed=g.run('elapsed');g.until("mode==='splat'");assert.equal(g.run('elapsed'),elapsed);assert.equal(g.run('wrongStreak'),0);assert.equal(g.input.disabled,false);
  let last;for(let i=0;i<50;i++){last=g.run('expected()');g.submit(last);}g.until('level===2');assert.equal(g.run('falls'),1);assert.equal(g.run('storyAccuracy()'),100);assert.equal(g.run('storyStarted'),false);assert.notEqual(g.run('expected()'),last);assert.equal(g.run('current().words.length'),50);
});
test('Words grace is per batch and threshold edits while paused take effect on resume',()=>{
  const g=game(false,new Map([['typerun-game-mode','words']]));g.type('zzz');g.step(4999);assert.equal(g.run('falls'),0);g.step(1);assert.equal(g.run('falls'),1);g.until("mode==='splat'");g.type('zzz');assert.equal(g.run('storyElapsed'),0);g.key('Escape');g.minimum(100);assert.match(g.element('threshold-warning').textContent,/fall on resume/);g.step(60000);assert.equal(g.run('falls'),1);g.click('resume');assert.equal(g.run('falls'),2);assert.equal(g.input.disabled,true);g.until("mode==='splat'");assert.equal(g.doc.activeElement.id,'typing');
});
