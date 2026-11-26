import test from 'node:test';import assert from 'node:assert/strict';
import {sbgridExecutable,denoiseRestriction} from '../lib/sbgrid-denoise.mjs';
test('SBGrid denoise guard excludes local RELION and SPA/demo',async()=>{
 assert(sbgridExecutable('/programs/x86_64-linux/system/sbgrid_bin/relion'));
 assert(sbgridExecutable('/programs/x86_64-linux/relion/5.0/bin/relion'));
 assert(!sbgridExecutable('/opt/relion/bin/relion'));
 assert(!sbgridExecutable('/programs-other/relion/bin/relion'));
 assert(await denoiseRestriction({tomo:true,demo:false,loaded:true,env:{PATH:''}}));
 assert.equal(await denoiseRestriction({tomo:false,loaded:true}),'');
 assert.equal(await denoiseRestriction({tomo:true,demo:true,loaded:true}),'');
 assert.equal(await denoiseRestriction({tomo:true,demo:false,env:{PATH:'/nonexistent'}}),'');
});
