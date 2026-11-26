import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {nextJobTypeIds} from '../public/next-job-definitions.js';
const layout=[{id:0,name:'Import'},{id:1,name:'Motion correction'},{id:22,name:'DynaMight'},{id:15,name:'Post-processing'}];
test('next-job visibility includes drafts, pipelines and continuation types without duplicates',()=>{
 assert.deepEqual(nextJobTypeIds([{target:22},{iconNames:['DynaMight','Post-processing']},{target:999}],layout),[22,15]);
 assert.deepEqual(nextJobTypeIds([],layout),[]);
});
test('sidebar adds offered next jobs and keeps Show all behavior',async()=>{
 const source=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
 const fn=source.slice(source.indexOf('function renderTypes(){'),source.indexOf("$('#job-search').oninput"));
 let offered=[{target:22}],all=false;const buttons=[];
 const controls={'#job-search':{value:''},'#show-all-job-types':{get checked(){return all;}},'#job-types':{replaceChildren(){buttons.length=0;},append(b){buttons.push(b);}}};
 const ctx={config:{layout,mode:'spa'},state:{jobs:[],availableJobTypes:[0]},type:0,selected:null,workspaceFeed:null,pinnedPanel:{jobs:()=>[]},offeredNextJobs:()=>({defs:offered}),nextJobTypeIds,Set,document:{querySelector:()=>({})},$:s=>controls[s],el:()=>({setAttribute(){},append(){},classList:{toggle(){}}}),jobTypeIcon(){},appendPorts(){},healthBlock(){},potentialConnection:()=>false,prepareJobDraft(){}};
 vm.createContext(ctx);vm.runInContext(fn,ctx);
 ctx.renderTypes();assert.equal(buttons.length,2);
 offered=[];ctx.renderTypes();assert.equal(buttons.length,1);
 ctx.type=22;ctx.renderTypes();assert.equal(buttons.length,2,'editing keeps a former next-job draft visible');
 ctx.selected='Import/job001/';ctx.type=0;ctx.workspaceFeed={draft:()=>({type:22})};ctx.renderTypes();assert.equal(buttons.length,2,'workspace draft stays visible');
 ctx.workspaceFeed=null;ctx.pinnedPanel={jobs:()=>[{type:15}]};ctx.renderTypes();assert.equal(buttons.length,2,'pinned drafts stay visible');
 ctx.pinnedPanel={jobs:()=>[]};ctx.renderTypes();assert.equal(buttons.length,1,'discarded drafts no longer add types');
 ctx.selected=null;ctx.type=1;ctx.state.jobs=[{status:'Succeeded',importMovies:'No'}];ctx.renderTypes();assert.equal(buttons.length,2,'draft overrides the motion-correction heuristic');
 all=true;ctx.renderTypes();assert.equal(buttons.length,4);
});
