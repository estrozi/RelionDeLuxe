import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
const source=await fs.readFile(new URL('../public/app.js',import.meta.url),'utf8');
test('initial loading blocks editing until dependent requests settle, including failures',async()=>{
 const main={setAttribute(){},removeAttribute(){}},notice={setAttribute(){},remove(){this.removed=true;}};
 let release,started=false;
 const context={embeddedWorkspace:true,document:{createElement:()=>notice,body:{append(){}},querySelector:()=>main},setTimeout,fetch:()=>new Promise(r=>{release=r;started=true;}),token:'test',requestId:()=>''};
 vm.createContext(context);
 vm.runInContext(source.slice(source.indexOf('let initialLoading='),source.indexOf('function workspaceSnapshot')),context);
 vm.runInContext(source.slice(source.indexOf('async function api(route,data){'),source.indexOf('\n',source.indexOf('async function api(route,data){'))),context);
 assert.equal(main.inert,true);assert.equal(notice.textContent,'Loading...');
 const request=vm.runInContext("api('first').then(()=>api('dependent')).catch(()=>{})",context);
 const finish=vm.runInContext('finishInitialLoading()',context);
 release({ok:true,json:async()=>({})});
 await new Promise(r=>setTimeout(r,10));assert.equal(main.inert,true);assert(!notice.removed);
 release({ok:false,json:async()=>({error:'test failure'})});
 await request;await finish;assert.equal(main.inert,false);assert.equal(notice.removed,true);
});
test('pipeline copies preserve button content and dispatch the original action',()=>{
 let clicked=0;const clone={},original={cloneNode:()=>clone,click(){clicked++;}},holder={replaceChildren(){},append(item){this.item=item;}};
 const context={document:{querySelector:()=>holder},nextJobPrompt:{hidden:false,querySelectorAll:()=>[original]}};
 vm.createContext(context);vm.runInContext(source.slice(source.indexOf('function syncPipelineNextJobs(){'),source.indexOf('function updateNextJobPrompt(){')),context);
 vm.runInContext('syncPipelineNextJobs()',context);
 assert.equal(holder.hidden,false);holder.item.onclick();assert.equal(clicked,1);
 context.nextJobPrompt.hidden=true;vm.runInContext('syncPipelineNextJobs()',context);assert.equal(holder.hidden,true);
});
