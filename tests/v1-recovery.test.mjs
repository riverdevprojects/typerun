import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as engine from '../dist/engine.js';
import * as motion from '../dist/motion.js';

// Run the actual game with a deterministic clock and lightweight DOM/canvas.
function game(reduced=false){
  const elements=new Map();
  const ctx=new Proxy({measureText:w=>({width:w.length*17.4}),createLinearGradient:()=>({addColorStop(){}})},
    {get:(object,key)=>object[key]??(()=>{})});
  const element=id=>{
    if(!elements.has(id))elements.set(id,{value:'',disabled:false,style:{},open:false,
      getContext:()=>ctx,getBoundingClientRect:()=>({width:1000,height:326}),
      addEventListener(){},append(){},focus(){this.focused=true;},setAttribute(){}});
    return elements.get(id);
  };
  let now=1000;
  const context=vm.createContext({...engine,...motion,console,Math,
    document:{getElementById:element,createTextNode:t=>t,addEventListener(){},fonts:{ready:Promise.resolve()}},
    matchMedia:()=>({matches:reduced}),devicePixelRatio:1,
    localStorage:{getItem:()=>null,setItem(){}},performance:{now:()=>now},
    ResizeObserver:class{observe(){}},requestAnimationFrame(){}});
  const source=readFileSync(new URL('../dist/game.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'');
  vm.runInContext(source,context);
  const run=code=>vm.runInContext(code,context);
  const step=()=>{now+=10;run(`frame(${now})`);};
  const until=condition=>{for(let i=0;i<1000&&!run(condition);i++)step();assert.ok(run(condition),condition);};
  const type=value=>{element('typing').value=value;run('onInput()');};
  const fall=()=>{type('wrong');run('commit()');until("mode==='splat'");};
  return {run,step,until,type,fall,input:element('typing'),element};
}

test('v1 enables and focuses the fresh story at impact, before recovery ends',()=>{
  const g=game();g.fall();
  assert.equal(g.input.disabled,false);
  assert.equal(g.input.focused,true);
  assert.equal(g.run('level'),1);
  assert.equal(g.input.placeholder,'the');
  g.type('the');g.run('commit()');g.type('fi');
  assert.equal(g.run('wordIndex'),1);
  assert.equal(g.run('typed'),'fi');
  g.until("mode==='playing'");
  assert.equal(g.run('wordIndex'),1);
  assert.equal(g.input.value,'fi');
  assert.equal(g.run('targetX'),g.run('wordX()+2*charWidth'));
});

test('typing springs back up sooner than waiting, including reduced motion',()=>{
  for(const reduced of [false,true]){
    const idle=game(reduced),active=game(reduced);idle.fall();active.fall();
    active.type('t');active.type('th');active.type('the');active.run('commit()');
    for(let i=0;i<25;i++){idle.step();active.step();}
    assert.equal(active.run('mode'),'playing');
    assert.notEqual(idle.run('mode'),'playing');
  }
});

test('pause freezes recovery and resume preserves entered letters',()=>{
  const g=game();g.fall();g.type('t');g.run('setPause(true)');
  const time=g.run('animationTime');for(let i=0;i<30;i++)g.step();
  assert.equal(g.run('animationTime'),time);assert.equal(g.input.disabled,true);
  g.run('setPause(false)');assert.equal(g.input.disabled,false);assert.equal(g.input.value,'t');
});

test('a fresh story gets new accuracy and grace, including typing during recovery',()=>{
  const g=game();g.fall();g.type('wrong');g.run('commit()');
  assert.notEqual(g.run('mode'),'falling');assert.equal(g.input.disabled,false);
  assert.equal(g.run('storyElapsed'),0);assert.equal(g.run('storyAccuracy()'),0);
  g.until("mode==='falling'");
  g.until("mode==='splat'");assert.equal(g.run('level'),2);assert.equal(g.input.disabled,false);
  assert.equal(g.run('storyAccuracy()'),100);assert.equal(g.run('storyStarted'),false);
});

test('story completion also accepts and preserves input during landing',()=>{
  const g=game();g.run('wordIndex=current().words.length-1');
  g.type(g.run('expected()'));g.run('commit()');g.until("mode==='splat'");
  g.type('the');g.run('commit()');g.type('first');g.run('commit()');
  g.until("mode==='playing'");assert.equal(g.run('wordIndex'),2);assert.equal(g.run('wordsTraveled'),3);
});

test('WPM stays frozen throughout a fall and resumes when input unlocks at impact',()=>{
  for(const reduced of [false,true]){
    const g=game(reduced);g.step();g.type('the');g.run('commit()');
    for(let i=0;i<100;i++)g.step();
    g.type('wrong');g.run('commit()');
    g.until("mode==='falling'");
    const elapsed=g.run('elapsed'),wpm=g.element('wpm').textContent;
    assert.ok(wpm>0);
    while(g.run("mode==='falling'")){
      g.step();g.run('stats()');
      assert.equal(g.run('elapsed'),elapsed);
      assert.equal(g.element('wpm').textContent,wpm);
    }
    assert.equal(g.input.disabled,false);
    for(let i=0;i<20;i++)g.step();
    g.run('stats()');
    assert.ok(g.run('elapsed')>elapsed);
    assert.ok(g.element('wpm').textContent<wpm);
    g.run('setPause(true)');const pausedElapsed=g.run('elapsed');
    for(let i=0;i<20;i++)g.step();
    assert.equal(g.run('elapsed'),pausedElapsed);
  }
});

test('the first wrong word advances without falling until five active seconds',()=>{
  const g=game();g.step();
  for(let i=0;i<600;i++)g.step();
  assert.equal(g.run('storyElapsed'),0);
  g.type('xxx');g.run('commit()');
  assert.equal(g.run('wordIndex'),1);assert.equal(g.run('falls'),0);
  for(let i=0;i<499;i++)g.step();
  assert.notEqual(g.run('mode'),'falling');
  g.step();assert.equal(g.run('mode'),'falling');assert.equal(g.run('falls'),1);
});

test('recovering accuracy before grace ends prevents a fall',()=>{
  const g=game();g.step();g.element('minimum-accuracy').value=50;g.run('setMinimumAccuracy()');
  g.type('xxx');g.run('commit()');
  for(let i=0;i<490;i++)g.step();
  g.type('door');g.run('commit()');
  for(let i=0;i<30;i++)g.step();
  assert.ok(g.run('storyAccuracy()')>=50);assert.equal(g.run('falls'),0);
});

test('the exact minimum is safe, and live input below it falls after grace',()=>{
  const g=game();g.step();g.element('minimum-accuracy').value=50;g.run('setMinimumAccuracy()');
  g.type('tx');
  for(let i=0;i<510;i++)g.step();
  assert.equal(g.run('storyAccuracy()'),50);assert.equal(g.run('falls'),0);
  g.type('txx');assert.equal(g.run('mode'),'falling');assert.equal(g.run('falls'),1);
});

test('grace and accuracy enforcement stop during pause',()=>{
  const g=game();g.step();g.type('xxx');g.run('commit()');
  for(let i=0;i<400;i++)g.step();
  g.run('setPause(true)');const time=g.run('storyElapsed');
  for(let i=0;i<600;i++)g.step();
  assert.equal(g.run('storyElapsed'),time);assert.equal(g.run('falls'),0);
  g.run('setPause(false)');g.until("mode==='falling'");assert.equal(g.run('falls'),1);
});

test('slider updates the minimum live, enforces strict 100 percent, and allows zero percent',()=>{
  const g=game();g.step();g.element('minimum-accuracy').value=0;g.run('setMinimumAccuracy()');
  g.type('xxx');g.run('commit()');
  for(let i=0;i<510;i++)g.step();
  assert.equal(g.run('falls'),0);
  assert.equal(g.element('minimum-accuracy-value').textContent,'0%');
  g.element('minimum-accuracy').value=100;g.run('setMinimumAccuracy()');
  assert.equal(g.run('mode'),'falling');
  g.until("mode==='splat'");g.type('xxx');g.run('commit()');
  assert.equal(g.run('falls'),2);assert.equal(g.run('minimumAccuracy'),100);
  g.run('reset()');assert.equal(g.run('minimumAccuracy'),100);assert.equal(g.run('storyElapsed'),0);
});

test('100 percent accepts correct early input but the first wrong letter falls immediately',()=>{
  const g=game();g.element('minimum-accuracy').value=100;g.run('setMinimumAccuracy()');
  assert.equal(g.element('accuracy-grace').textContent,'100% accuracy · no grace period');
  g.type('t');g.type('th');assert.equal(g.run('falls'),0);
  g.type('thx');assert.equal(g.run('storyElapsed'),0);
  assert.equal(g.run('mode'),'falling');assert.equal(g.run('falls'),1);
});

test('100 percent also falls on an incomplete submitted word during the first five seconds',()=>{
  const g=game();g.element('minimum-accuracy').value=100;g.run('setMinimumAccuracy()');
  g.type('t');g.run('commit()');
  assert.equal(g.run('mode'),'falling');assert.equal(g.run('falls'),1);
});

test('99 percent still gives the full grace period',()=>{
  const g=game();g.step();g.element('minimum-accuracy').value=99;g.run('setMinimumAccuracy()');
  g.type('xxx');g.run('commit()');
  for(let i=0;i<499;i++)g.step();
  assert.equal(g.run('falls'),0);g.step();assert.equal(g.run('falls'),1);
});
