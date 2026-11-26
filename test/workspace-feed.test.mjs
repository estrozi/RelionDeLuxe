import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorkspaceFeed,comparePipelineJobs,centerPipelineRow} from '../public/workspace-feed.js';
class Element {
 constructor(tag){this.tag=tag;this.children=[];this.dataset={};this.style={setProperty(){}};this.classList={add(){},toggle(){}};this.offsetTop=0;this.scrollHeight=4200;this.offsetHeight=700;this.contentWindow={};}
 remove(){if(this.parent)this.parent.children=this.parent.children.filter(c=>c!==this);this.parent=null;}
 get isConnected(){return !!this.parent;}
 setAttribute(){} getBoundingClientRect(){return {top:100,height:20};}
 append(...items){for(const x of items){x.remove();x.parent=this;this.children.push(x);}}
 replaceChildren(...items){for(const x of [...this.children])x.remove();this.append(...items);}
 insertBefore(x,before){x.remove();const i=before?this.children.indexOf(before):this.children.length;this.children.splice(i,0,x);x.parent=this;}
 before(x){this.parent.insertBefore(x,this);}
 after(x){const p=this.parent;x.remove();p.children.splice(p.children.indexOf(this)+1,0,x);x.parent=p;}
 scrollTo(o){this.scrollTop=o.top;this.scrolls=(this.scrolls||0)+1;}
}
function setup(){
 const shell=new Element('main'),root=new Element('section'),footer=new Element('footer');shell.append(root);root.append(footer);
 globalThis.document={createElement:t=>new Element(t),documentElement:{dataset:{theme:'dark'}},querySelector:()=>new Element('bar')};
 globalThis.window={addEventListener(){}};globalThis.innerHeight=900;globalThis.requestAnimationFrame=f=>f();globalThis.matchMedia=()=>({matches:true});globalThis.ResizeObserver=class{observe(){}};let observe;
 globalThis.IntersectionObserver=class{constructor(cb){observe=cb;}observe(){}unobserve(){}};
 const events=[];const feed=createWorkspaceFeed({root,footer,onActivate:d=>events.push(d),onNew:d=>feed.open({...d,selected:null}),onBusy:v=>events.push(v),onChanged:()=>{}});
 const container=shell.children[0],names=()=>container.children.map(e=>window.relionFeedSeed(e.dataset.entry)?.selected||'draft');
 return {feed,container,names,observe:changes=>observe(changes),events};
}
const draft={type:1,title:'Import',selected:null,values:{input:'a'}};
const jobs=[{type:2,name:'Class2D/job010/'},{type:1,name:'Import/job001/'},{type:3,name:'Extract/job002/'}].sort(comparePipelineJobs);
test('all pipeline jobs in numerical order, one trailing draft, navigation discards it',()=>{
 const {feed,container,names}=setup();feed.sync(jobs);assert.deepEqual(names(),jobs.map(j=>j.name));assert.ok(container.children.every(e=>e.children[0].tag==='h2'),'unvisited editors are lazy');
 const a=feed.open(draft);assert.equal(container.scrollTop,a.element.offsetTop,'draft navigation targets its entry, before pinned entries');assert.equal(a.frame.tag,'iframe');assert.deepEqual(names(),[...jobs.map(j=>j.name),'draft']);
 feed.newDraft();const b=feed.open({...draft,type:2});assert.equal(a.element.parent,null);assert.equal(names().length,4);
 assert.equal(feed.findJob(jobs[1].name),true);assert.equal(b.element.parent,null);assert.deepEqual(names(),jobs.map(j=>j.name));
 feed.findJob(jobs[2].name);feed.findJob(jobs[0].name);assert.deepEqual(names(),jobs.map(j=>j.name));
 const scrolls=container.scrolls;feed.sync(jobs);assert.equal(container.scrolls,scrolls,'background sync does not navigate');
 feed.newDraft();const c=feed.open(draft);assert.equal(names().at(-1),'draft');feed.sync([...jobs,{type:4,name:'Other/job011/'}]);assert.equal(names().at(-1),'draft');assert.equal(names().at(-2),'Other/job011/');
 feed.sync(jobs.filter(j=>j!==jobs[1]));assert.deepEqual(names(),[jobs[0].name,jobs[2].name,'draft']);assert.ok(c.element.parent);
});
test('submission promotes the draft once even across delayed pipeline refresh',()=>{
 const {feed,names}=setup();feed.sync(jobs);const d=feed.open(draft);const submitted={...draft,selected:'Import/job011/'};
 window.relionFeedChanged(d.id,submitted);feed.sync(jobs);assert.ok(d.element.parent,'stale state must not remove just-submitted draft');
 feed.sync([...jobs,{type:1,name:submitted.selected}]);assert.equal(names().filter(n=>n===submitted.selected).length,1);assert.equal(names().at(-1),submitted.selected);
 feed.newDraft();const second=feed.open(draft);feed.sync([...jobs,{type:1,name:submitted.selected},{type:1,name:'Import/job012/'}]);
 window.relionFeedChanged(second.id,{...draft,selected:'Import/job012/'});assert.equal(names().filter(n=>n==='Import/job012/').length,1);assert.ok(second.element.parent,'promotion retains the live editor');
});
test('visibility, theme and defaults reach only mounted editors',()=>{
 const {feed,observe}=setup();feed.sync(jobs);const e=feed.open(draft);let visible,settings,theme;
 e.frame.contentWindow.relionWorkspace={snapshot:()=>draft,visibility:v=>visible=v,defaults:(v,r)=>settings=[v,r],theme:v=>theme=v,connection(){}};
 observe([{target:e.element,isIntersecting:true}]);feed.defaults({globalNcpus:'8'},2);window.relionFeedReady(e.id);assert.deepEqual(settings,[{globalNcpus:'8'},2]);assert.equal(theme,'dark');assert.equal(visible,true);
 feed.pause(true);assert.equal(visible,false);feed.pause(false);assert.equal(visible,true);observe([{target:e.element,isIntersecting:false}]);assert.equal(visible,false);
});

test('pipeline centering is bounded by its scrollable range',()=>{
 const list={scrollHeight:2000,clientHeight:400,clientTop:1,scrollTop:300,getBoundingClientRect:()=>({top:100}),scrollTo(o){this.scrollTop=o.top;}};
 let y=501;const row={closest:()=>list,getBoundingClientRect:()=>({top:y,height:40})};
 assert.equal(centerPipelineRow(row).top,520);
 list.scrollTop=0;y=101;assert.equal(centerPipelineRow(row).top,0);
 list.scrollTop=1600;y=461;assert.equal(centerPipelineRow(row).top,1600);
 assert.equal(centerPipelineRow(null),null);
});

test('fresh pipeline snapshots reach visible workspaces without remounting them',()=>{
 const {feed,observe}=setup();feed.sync(jobs);const e=feed.open(draft);let received;
 e.frame.contentWindow.relionWorkspace={visibility(){},state:s=>{received=s;return Promise.resolve();}};
 observe([{target:e.element,isIntersecting:true}]);const frame=e.frame,snapshot={jobs:[{name:'MaskCreate/job001/',status:'Succeeded'}]};
 feed.state(snapshot);assert.equal(received,snapshot);assert.equal(e.frame,frame);
 observe([{target:e.element,isIntersecting:false}]);received=null;feed.state(snapshot);assert.equal(received,null);
});

test('manual continuation shortcut dispatches to the existing workspace without creating a draft',async()=>{
 const {feed,names}=setup();const seed={...draft,selected:'AutoPick/job004/'};const entry=feed.open(seed);let continued;
 entry.frame.contentWindow.relionWorkspace={snapshot:()=>seed,continueManually:async name=>{continued=name;}};
 await feed.continueManually(seed.selected);assert.equal(continued,seed.selected);assert.deepEqual(names(),[seed.selected]);
});
test('manual shortcut is offered only for completed picking results, never Topaz training',async()=>{
 const {canContinueAutopick}=await import('../public/workspace-feed.js');const layout={name:'Auto-picking'},values={continue_manual:'No',do_log:'Yes'},job={status:'Succeeded'};
 assert.equal(canContinueAutopick(job,values,layout),true);
 for(const status of ['Running','Scheduled','Failed'])assert.equal(canContinueAutopick({status},values,layout),false);
 assert.equal(canContinueAutopick(job,{...values,do_topaz:'Yes',do_topaz_train:'Yes'},layout),false);
 assert.equal(canContinueAutopick({...job,topazTraining:true},values,layout),false);
 assert.equal(canContinueAutopick(job,values,{name:'Manual picking'}),false);
});

test('mask shortcut navigates to an existing refinement and waits for a lazy editor',async()=>{
 const {feed,names}=setup();const seed={...draft,selected:'Refine3D/job002/'};const entry=feed.open(seed);let mask;
 const pending=feed.continueWithMask(seed.selected,'MaskCreate/job003/');
 entry.frame.contentWindow.relionWorkspace={snapshot:()=>seed,theme(){},visibility(){},connection(){},continueWithMask:async value=>mask=value};
 window.relionFeedReady(entry.id);await pending;assert.equal(mask,'MaskCreate/job003/');assert.deepEqual(names(),[seed.selected]);
});
