import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import vm from 'node:vm';
import {canContinueAutopick} from '../public/workspace-feed.js';
test('shortcut updates same job then reuses the normal Continue handler; refuses stale status',async()=>{
 const source=await fs.readFile(new URL('../public/app.js',import.meta.url),'utf8');let status='Succeeded',runs=0;
 const context={busy:false,selected:'AutoPick/job004/',config:{readonly:false},values:{continue_manual:'No'},type:4,drafts:new Map(),update:async()=>{},current:()=>({status}),currentLayout:()=>({name:'Auto-picking'}),canContinueAutopick,renderEditor(){},workspaceChanged(){},$:()=>({onclick:async()=>runs++})};
 vm.createContext(context);vm.runInContext(source.slice(source.indexOf('async function continueAutopickManually('),source.indexOf("$('#run').onclick=async()=>{")),context);
 await context.continueAutopickManually(context.selected);assert.equal(context.values.continue_manual,'Yes');assert.equal(runs,1);assert.equal(context.selected,'AutoPick/job004/');
 status='Running';await assert.rejects(context.continueAutopickManually(context.selected),/only for finished/);assert.equal(runs,1);
});
