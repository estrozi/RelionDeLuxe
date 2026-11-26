import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createWorkspaceFeed} from '../public/workspace-feed.js';

test('submission retains the draft workspace until its real identity is adopted',()=>{
 class Element{
  children=[];dataset={};style={setProperty(){}};classList={add(){},toggle(){}};
  offsetTop=0;offsetHeight=500;scrollHeight=500;scrollTop=0;isConnected=true;
  setAttribute(){} before(){} after(){} getBoundingClientRect(){return {top:0,height:20};}
  append(...items){for(const item of items){item.parent=this;this.children.push(item);}}
  replaceChildren(...items){this.children=[];this.append(...items);}
  remove(){if(this.parent)this.parent.children=this.parent.children.filter(x=>x!==this);this.isConnected=false;}
  insertBefore(item,before){if(item.parent)item.parent.children=item.parent.children.filter(x=>x!==item);item.parent=this;const i=this.children.indexOf(before);this.children.splice(i<0?this.children.length:i,0,item);}
  scrollTo({top}){this.scrollTop=top;}
 }
 const previous={};
 const globals={document:{createElement:()=>new Element(),documentElement:{dataset:{}},querySelector:()=>new Element()},
 window:{addEventListener(){}},IntersectionObserver:class{observe(){}unobserve(){}},ResizeObserver:class{observe(){}},
 requestAnimationFrame(){},matchMedia:()=>({matches:true})};
 for(const [key,value] of Object.entries(globals)){previous[key]=globalThis[key];globalThis[key]=value;}
 try{
  const feed=createWorkspaceFeed({root:new Element(),footer:new Element(),onActivate(){},onNew(){},onBusy(){},onChanged(){}});
  const draft=feed.open({type:1,selected:null,title:'Import',values:{}});
  const frame=draft.frame;
  window.relionFeedBusy(draft.id,true);
  feed.sync([{name:'Import/job001/',type:1}]);
  assert.equal(draft.element.parent.children.length,1,'poll must not insert a second workspace during submission');
  window.relionFeedChanged(draft.id,{type:1,selected:'Import/job001/',title:'Import',values:{}});
  assert.equal(feed.draft(),null);
  window.relionFeedBusy(draft.id,false);
  assert.equal(draft.element.parent.children.length,1);
  assert.equal(draft.frame,frame,'original editor remains mounted');
  assert.equal(window.relionFeedSeed(draft.id).selected,'Import/job001/');
  assert.equal(feed.findJob('Import/job001/'),true);
 }finally{for(const [key,value] of Object.entries(previous)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}}
});

test('accepted submission adopts identity before fallible state and job reads',async()=>{
 const source=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
 assert.match(source,/if\(result.name\)\{selected=result.name;copiedDraft=false;workspaceChanged\(\);\}notify\(result.warning\|\|[^\n]+await update\(\);if\(result.name\)await selectJobAfterTask/);
});
