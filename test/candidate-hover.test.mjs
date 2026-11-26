import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
test('candidate hover highlights and centers producer without changing selection',async()=>{
 const source=await fs.readFile(new URL('../public/app.js',import.meta.url),'utf8');
 const code=source.slice(source.indexOf('let candidateHoverJob='),source.indexOf('async function browseFiles('));
 const rows=['Import/job001/','Class2D/job006/'].map(name=>({dataset:{job:name},highlight:false,classList:{toggle(_class,value){rows.find(r=>r.dataset.job===name).highlight=value;}}}));
 let scrolls=0,close;
 const context={window:{},embeddedWorkspace:false,config:{project:'/project'},state:{jobs:[{name:'Import/job001/',outputs:['Import/job001/mics.star']},{name:'Class2D/job006/',outputs:['Class2D/job006/run_optimiser.star']}]},selected:'Import/job001/',jobSectionScroll:new Map(),centerPipelineRow:()=>{scrolls++;return {list:{dataset:{section:'all'}},top:80};},canonicalConnectionFile:f=>f.replace('Class2D/classes/','Class2D/job006/'),$:selector=>selector==='#dialog'?{addEventListener:(_event,fn)=>close=fn}:{querySelectorAll:()=>rows}};
 vm.createContext(context);vm.runInContext(code,context);
 context.window.relionCandidateHover('/project/Class2D/job006/run_optimiser.star');assert.equal(rows[1].highlight,true);assert.equal(scrolls,1);assert.equal(context.selected,'Import/job001/');
 vm.runInContext('paintCandidateHover()',context);assert.equal(rows[1].highlight,true);assert.equal(scrolls,1);
 close();assert.equal(rows[1].highlight,false);
 context.window.relionCandidateHover('Class2D/classes/other.star');assert.equal(rows[1].highlight,true);
 context.window.relionCandidateHover('external.star');assert(rows.every(r=>!r.highlight));
});
