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

function start(){
  let now=0;
  const elements=new Map();
  const document={listeners:{},fonts:{ready:{then:noop}},addEventListener(name,fn){this.listeners[name]=fn;}};
  const drawing=new Proxy({measureText:word=>({width:word.length*14})},{get:(obj,key)=>obj[key]??noop});
  function element(id){
    if(!elements.has(id)){
      const tag=tags.find(tag=>tag.includes(`id="${id}"`))??'';
      elements.set(id,{id,type:tag.match(/type="([^"]+)"/)?.[1],name:tag.match(/name="([^"]+)"/)?.[1],open:false,listeners:{},
        getContext:()=>drawing,getBoundingClientRect:()=>({width:356,height:124}),setAttribute:noop,
        addEventListener(name,fn){this.listeners[name]=fn;},
        focus(options){assert.ok(!this.disabled,`cannot focus disabled ${id}`);this.focusOptions=options;document.activeElement=this;},
        showModal(){this.open=true;},close(){this.open=false;},
        querySelectorAll(){
          const html=markup.split(`id="${id}"`)[1].split(/id="(?:help|confirm)-view"|<\/dialog>/)[0];
          return [...html.matchAll(/<(?:button|input)\b[^>]*\bid="([^"]+)"/g)].map(m=>element(m[1]));
        }});
    }
    return elements.get(id);
  }
  document.getElementById=element;
  const context=vm.createContext({...engine,...motion,document,devicePixelRatio:1,matchMedia:()=>({matches:false}),
    performance:{now:()=>now},localStorage:{getItem:()=>null,setItem:noop},ResizeObserver:class{observe(){}},requestAnimationFrame:noop});
  const run=code=>vm.runInContext(code,context);run(source);
  const key=(key,shiftKey=false)=>document.listeners.keydown({key,shiftKey,preventDefault:noop});
  const click=id=>element(id).listeners.click();
  const input=element('typing');
  const type=value=>{input.value=value;input.listeners.input();};
  const step=ms=>{now+=ms;run(`frame(${now})`);};
  return {run,key,click,input,type,step,element,active:()=>document.activeElement};
}

test('Words targets match the supplied English 200 sequence, with lowercase i',()=>{
  const supplied=`the be of and a to in he have it that for they I with as not on she at by this we you do but from or which one would all will there say who make when can more if no man out other so what time up go about than into could state only new year some take come these know see use get like then first any work now may such give over think most even find day also after way many must look before great back through long where much should well people down own just because good each those feel seem how high too place little world very still nation hand old life tell write become here show house both between need mean call develop under last right move thing general school never same another begin while number part turn real leave might want point form off child few small since against ask late home interest large person end open public follow during present without again hold govern around possible head consider word program problem however lead system set order eye plan run keep face fact group play stand increase early course change help line`;
  assert.deepEqual(engine.WORDS_200,supplied.toLowerCase().split(' '));
});

test('Tab moves through the Settings groups and continues from a cancelled radio',()=>{
  const g=start();g.type('th');g.key('Escape');
  for(const id of ['story-mode','floor-mode','minimum-accuracy','sound','help','restart','resume']){
    g.key('Tab');assert.equal(g.active().id,id);
  }
  g.click('streak-mode');assert.equal(g.active().id,'cancel');g.key('Escape');
  assert.equal(g.active().id,'streak-mode');assert.equal(g.active().focusOptions?.preventScroll,undefined);
  g.key('Tab');assert.equal(g.active().id,'minimum-accuracy');
  g.click('restart');g.key('Escape');assert.equal(g.active().id,'restart');assert.equal(g.active().focusOptions?.preventScroll,undefined);
  g.key('Escape');assert.equal(g.active().id,'typing');assert.equal(g.active().focusOptions.preventScroll,true);
  assert.equal(g.input.value,'th');
});

test('pausing a trip restores its status; airborne resume does not focus typing before impact',()=>{
  const g=start();g.type('teh ');assert.equal(g.element('state-label').textContent,'Tripped');
  g.key('Escape');g.click('resume');assert.equal(g.element('state-label').textContent,'Tripped');
  g.key('Escape');g.element('minimum-accuracy').value=100;g.element('minimum-accuracy').listeners.input();g.click('resume');
  assert.equal(g.run('mode'),'falling');g.step(16);g.step(16);
  const animationTime=g.run('animationTime'),elapsed=g.run('elapsed');
  g.click('settings');g.step(5000);assert.equal(g.run('animationTime'),animationTime);assert.equal(g.run('elapsed'),elapsed);
  g.click('resume');assert.equal(g.input.disabled,true);assert.notEqual(g.active().id,'typing');
  for(let i=0;i<100&&g.input.disabled;i++)g.step(16);
  assert.equal(g.input.disabled,false);assert.equal(g.active().id,'typing');assert.equal(g.run('elapsed'),elapsed);
});

test('the active word stays in frame even when input gets ahead of runner travel',()=>{
  const g=start();for(let i=0;i<12;i++)g.type(g.run('expected()')+' ');
  g.step(0);
  assert.equal(g.run('runnerX'),95);
  assert.ok(g.run('wordX()-cameraX>=12'));
  assert.ok(g.run('wordX()-cameraX+current().words[wordIndex].width<=width-12'));
});
