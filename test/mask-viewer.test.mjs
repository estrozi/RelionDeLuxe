import test from 'node:test';
import assert from 'node:assert/strict';
import {mountMaskViewer} from '../public/mask-viewer.js';
class Element{
 constructor(tag){this.tag=tag;this.children=[];this.listeners={};this.value='';this.min='0';this.max='100';this.dataset={};this.classList={add(){}};}
 append(...nodes){this.children.push(...nodes);}
 setAttribute(){}
 addEventListener(name,fn){this.listeners[name]=fn;}
 removeEventListener(name){delete this.listeners[name];}
 remove(){this.removed=true;}
}
test('Mask slider and numeric field share absolute isolevel; viewer is disposed on tab change',async()=>{
 const original={document:globalThis.document,NGL:globalThis.NGL,ResizeObserver:globalThis.ResizeObserver,fetch:globalThis.fetch,MutationObserver:globalThis.MutationObserver};
 let parameters,updates=[],disposed=false,fetchHeaders,changed=0,stageOptions,themeChange,centred=0,themeDisconnected=false,stageUpdates=[];
 try{
  globalThis.document={createElement:tag=>new Element(tag),documentElement:{dataset:{theme:'light'}}};
  globalThis.MutationObserver=class{constructor(fn){themeChange=fn;}observe(){}disconnect(){themeDisconnected=true;}};
  globalThis.ResizeObserver=class{observe(){}disconnect(){}};
  globalThis.fetch=async(url,options)=>{assert.match(url,/file=map.mrc/);fetchHeaders=options.headers;return {ok:true,blob:async()=>new Blob()};};
  globalThis.NGL={Stage:class{
   constructor(element,options){stageOptions=options;this.tasks={onZeroOnce:fn=>fn()};}
   setParameters(p){stageUpdates.push(p);}
   async loadFile(){return {volume:{data:new Float32Array([-2,0,3,5])},addRepresentation:(type,p)=>{assert.equal(type,'surface');parameters=p;return {setParameters:v=>updates.push(v)};}};}
   autoView(){centred++;}handleResize(){}dispose(){disposed=true;}
  }};
  const container=new Element('div'),threshold=new Element('input');threshold.value='1.5';
  const cleanup=mountMaskViewer({container,input:'map.mrc',threshold,token:'secret',readonly:false,onChange:()=>changed++});
  await new Promise(r=>setTimeout(r,0));
  assert.equal(fetchHeaders['X-Relion-Token'],'secret');assert.equal(parameters.isolevelType,'value');assert.equal(parameters.isolevel,1.5);assert.equal(stageOptions.cameraType,'orthographic');assert.equal(stageOptions.backgroundColor,'#f6f8fa');assert(centred>0);
  document.documentElement.dataset.theme='dark';themeChange();assert.equal(stageUpdates.at(-1).backgroundColor,'#18232f');document.documentElement.dataset.theme='brazil';themeChange();assert.equal(stageUpdates.at(-1).backgroundColor,'#fff7c2');document.documentElement.dataset.theme='france';themeChange();assert.equal(stageUpdates.at(-1).backgroundColor,'#eef3fc');
  const panel=container.children[0],slider=panel.children[0].children[0];assert.equal(panel.children[0].children[1],threshold);assert.equal(threshold.type,'number');assert.equal(panel.dataset.key,'inimask_threshold');assert.equal(slider.min,'-2');assert.equal(slider.max,'5');assert.equal(slider.disabled,false);
  slider.value='2.25';slider.oninput();assert.equal(threshold.value,'2.25');assert.equal(changed,1);
  threshold.value='7';threshold.listeners.input();await new Promise(r=>setTimeout(r,130));assert.equal(slider.max,'7');assert.equal(updates.at(-1).isolevel,7);
  assert(centred>=2);cleanup();assert(disposed);assert(themeDisconnected);assert(panel.removed);assert.equal(threshold.listeners.input,undefined);
 }finally{Object.assign(globalThis,original);}
});
