import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as engine from '../dist/engine.js';
import * as motion from '../dist/motion.js';

const source=readFileSync(new URL('../dist/game.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'');
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} differs from ${b}`);

function game(){
  let now=0,rect={width:1000,height:326};
  const elements=new Map(),noop=()=>{};
  const canvas=new Proxy({measureText:w=>({width:w.length*17.4}),createLinearGradient:()=>({addColorStop:noop})},{get:(o,k)=>o[k]??noop});
  function element(id){
    if(!elements.has(id))elements.set(id,{value:'',disabled:false,style:{},listeners:{},getContext:()=>canvas,getBoundingClientRect:()=>rect,append:noop,focus:noop,setAttribute:noop,addEventListener(name,fn){this.listeners[name]=fn;}});
    return elements.get(id);
  }
  const context=vm.createContext({...engine,...motion,devicePixelRatio:1,performance:{now:()=>now},matchMedia:()=>({matches:false}),
    document:{getElementById:element,createTextNode:String,addEventListener:noop,fonts:{ready:{then:noop}}},localStorage:{getItem:()=>null,setItem:noop},ResizeObserver:class{observe(){}},requestAnimationFrame:noop});
  const run=code=>vm.runInContext(code,context);
  run(source);
  const input=element('typing');
  return {run,input,element,edit(value){input.value=value;input.listeners.input();},at(ms){now=ms;},frame(raf=now){run(`frame(${raf})`);},resize(width,height){rect={width,height};run('size()');},enter(){input.listeners.keydown({key:'Enter',preventDefault:noop});}};
}

test('multiword edits preserve the partial word and a single delimited edit submits once',()=>{
  const g=game();
  g.edit('th');g.edit('the door');
  assert.equal(g.input.value,'th');
  assert.equal(g.run('typed'), 'th');
  assert.equal(g.run('wordIndex'),0);
  g.at(100);g.edit('the ');
  assert.equal(g.input.value,'');
  assert.equal(g.input.placeholder,'door');
  assert.equal(g.run('correctWords'),1);
  g.enter();
  assert.equal(g.run('wordIndex'),1);
});

test('a delimited input is subject to the same input length limit',()=>{
  const g=game();
  g.element('streak-mode').listeners.click();
  g.edit('x'.repeat(100)+' ');
  assert.equal(g.run('attemptedChars'),25);
  assert.equal(g.run('wrongStreak'),1);
});

test('a grace-expiry frame starts the fall without spending pre-fall animation time',()=>{
  const g=game();
  g.frame();g.edit('x');
  g.at(5000);g.frame(4998);
  assert.equal(g.run('mode'),'falling');
  assert.equal(g.run('animationTime'),0);
  near(g.run('elapsed'),5);
  g.at(5020);g.frame();
  near(g.run('animationTime'),.02);
  near(g.run('elapsed'),5);
});

test('an input-triggered fall only uses post-entry frame time and survives resize',()=>{
  const g=game();
  g.element('minimum-accuracy').value='100';
  g.element('minimum-accuracy').listeners.input();
  g.frame();g.at(30);g.edit('x');
  g.at(40);g.frame();
  near(g.run('animationTime'),.01);
  for(let ms=80;ms<=360;ms+=40){g.at(ms);g.frame();}
  const y=g.run('runnerY-floorY'),x=g.run('runnerX'),camera=g.run('cameraY');
  assert.ok(y>0&&camera>0);
  g.resize(390,280);
  near(g.run('runnerY-floorY'),y);
  near(g.run('runnerX'),x);
  near(g.run('cameraY'),camera);
  near(g.run('fallFrom'),g.run('floorY'));
  assert.equal(g.input.disabled,true);
  for(let ms=400;ms<=880;ms+=40){g.at(ms);g.frame();}
  assert.equal(g.input.placeholder,'the');
  assert.equal(g.run('level'),1);
  assert.equal(g.input.disabled,false);
  g.edit('the ');
  assert.equal(g.input.placeholder,'first');
});
