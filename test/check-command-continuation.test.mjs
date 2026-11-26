import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
test('Check command borrows only a unique available continuation without editing the field for the selected job',async()=>{
 const app=await fs.readFile(new URL('../public/app.js',import.meta.url),'utf8');const code=app.slice(app.indexOf('async function uniqueContinuationForPreview(){'),app.indexOf('async function submit(action,'));
 const job='Class3D/job003/',file=job+'run_it025_optimiser.star',input={value:''};let result={entries:[{path:file,job,available:true}]},calls=0;
 const ctx={selected:job,type:9,values:{fn_cont:''},selectedIsContinuation:false,schema:()=>({options:[{key:'fn_cont'}]}),current:()=>({status:'Succeeded'}),api:async()=>{calls++;return result;},$:()=>input,drafts:new Map(),workspaceChanged(){},URLSearchParams};vm.createContext(ctx);vm.runInContext(code,ctx);
 assert.equal(await ctx.uniqueContinuationForPreview(),file);assert.equal(ctx.values.fn_cont,'');assert.equal(input.value,'');assert.equal(ctx.drafts.size,0);
 ctx.values.fn_cont='manual.star';await ctx.uniqueContinuationForPreview();assert.equal(calls,1);
 ctx.values.fn_cont='';result.entries.push({path:job+'other.star',job,available:true});await ctx.uniqueContinuationForPreview();assert.equal(ctx.values.fn_cont,'');
 result={entries:[{path:file,job,available:true}],truncated:true};await ctx.uniqueContinuationForPreview();assert.equal(ctx.values.fn_cont,'');
 result={entries:[{path:file,job:'Other/job004/',available:true}]};await ctx.uniqueContinuationForPreview();assert.equal(ctx.values.fn_cont,'');
 result={entries:[{path:file,job,available:true}]};ctx.current=()=>({status:'Scheduled'});await ctx.uniqueContinuationForPreview();assert.equal(ctx.values.fn_cont,'');
 ctx.selectedIsContinuation=true;assert.equal(await ctx.uniqueContinuationForPreview(),file);assert.equal(ctx.values.fn_cont,'');
 ctx.values.fn_cont='';ctx.api=async()=>{ctx.values.fn_cont='edited.star';return result;};await ctx.uniqueContinuationForPreview();assert.equal(ctx.values.fn_cont,'edited.star');
 ctx.values.fn_cont='';ctx.api=async()=>{throw Error('Lookup failed');};await assert.rejects(ctx.uniqueContinuationForPreview(),/Lookup failed/);assert.equal(ctx.values.fn_cont,'');
 ctx.api=async()=>{ctx.selected='Other/job004/';return result;};await assert.rejects(ctx.uniqueContinuationForPreview(),/selected job changed/);
});
