import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as engine from '../dist/engine.js';
import * as motion from '../dist/motion.js';

const source=readFileSync(new URL('../dist/game.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'');
const markup=readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
const tags=[...markup.matchAll(/<(button|input)\b[^>]*>/g)].map(m=>m[0]);
const noop=()=>{};

function start(game='story'){
  const elements=new Map();
  const document={listeners:{},fonts:{ready:{then:noop}},addEventListener(name,fn){this.listeners[name]=fn;}};
  const drawing=new Proxy({measureText:word=>({width:word.length*14})},{get:(obj,key)=>obj[key]??noop});
  function element(id){
    if(!elements.has(id)){
      const tag=tags.find(tag=>tag.includes(`id="${id}"`))??'';
      elements.set(id,{id,type:tag.match(/type="([^"]+)"/)?.[1],name:tag.match(/name="([^"]+)"/)?.[1],open:false,listeners:{},
        getContext:()=>drawing,getBoundingClientRect:()=>({width:356,height:124}),setAttribute:noop,
        addEventListener(name,fn){this.listeners[name]=fn;},
        focus(){assert.ok(!this.disabled);document.activeElement=this;},showModal(){this.open=true;},
        querySelectorAll(){
          const html=markup.split(`id="${id}"`)[1].split(/id="(?:help|confirm)-view"|<\/dialog>/)[0];
          return [...html.matchAll(/<(?:button|input)\b[^>]*\bid="([^"]+)"/g)].map(m=>element(m[1]));
        }});
    }
    return elements.get(id);
  }
  document.getElementById=element;
  const saved={'typerun-game-mode':game,'typerun-consecutive-mistakes':'true','typerun-best-v2':'42'};
  const context=vm.createContext({...engine,...motion,document,devicePixelRatio:1,matchMedia:()=>({matches:false}),
    performance:{now:()=>0},localStorage:{getItem:key=>saved[key]??null,setItem:noop},ResizeObserver:class{observe(){}},requestAnimationFrame:noop});
  const run=code=>vm.runInContext(code,context);run(source);
  const key=(key,options={})=>{
    let prevented=false;document.listeners.keydown({key,...options,preventDefault(){prevented=true;}});return prevented;
  };
  const input=element('typing');
  const type=value=>{input.value=value;input.listeners.input();};
  return {run,key,input,type,element,active:()=>document.activeElement};
}

for(const game of ['words','story'])test(`Tab immediately restarts a ${game} session`,()=>{
  const g=start(game),line=g.run('current()');
  g.type(g.input.placeholder+' ');g.type('x');assert.equal(g.run('wordsTraveled'),1);
  assert.equal(g.key('Tab'),true);assert.equal(g.element('menu').open,false);
  assert.equal(g.run('mode'),'ready');assert.equal(g.run('wordsTraveled'),0);
  assert.equal(g.input.value,'');assert.equal(g.active(),g.input);
  assert.equal(g.run('gameMode'),game);assert.equal(g.run('streakMode'),true);assert.equal(g.run('best'),42);
  assert.notEqual(g.run('current()'),line);assert.equal(g.run('wordIndex'),0);
  if(game==='story')assert.equal(g.run('current().story'),engine.STORIES[0]);
  else assert.equal(g.run('current().words.length'),50);
});

test('Tab in Settings moves focus without restarting',()=>{
  const g=start();g.type(g.input.placeholder+' ');g.type('x');g.key('Escape');
  assert.equal(g.key('Tab'),true);assert.equal(g.active().id,'story-mode');assert.equal(g.element('menu').open,true);
  assert.equal(g.run('wordsTraveled'),1);assert.equal(g.input.value,'x');
});

test('Shift, modified, composing and repeated Tab do not restart',()=>{
  const g=start();g.type('x');
  for(const flag of ['shiftKey','ctrlKey','altKey','metaKey','isComposing','repeat']){
    const prevented=g.key('Tab',{[flag]:true});if(flag!=='repeat')assert.equal(prevented,false,flag);
    assert.equal(g.input.value,'x',flag);assert.equal(g.run('mode'),'playing',flag);
  }
});
