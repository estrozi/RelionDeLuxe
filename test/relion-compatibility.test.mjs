import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
import {adaptRelionLayouts,versionFamily,relionCompatibility} from '../lib/relion-compatibility.mjs';
import {keyInfo} from '../lib/job-key-info.mjs';
const read=async n=>JSON.parse(await fs.readFile(new URL('../public/'+n,import.meta.url),'utf8'));
test('5.0 extraction keeps its native units and controls',async()=>{
 const layout=await read('layout-tomo.json'),catalog=await read('catalog-tomo.json');adaptRelionLayouts(layout,catalog,await read('placements-5.1-tomo.json'));
 const extract=layout.find(l=>l.name==='Extract subtomos');assert.ok(extract.tabs.Reconstruct.includes('binning'));assert.ok(extract.tabs.Reconstruct.includes('do_stack2d'));assert.equal(extract.tabs.Extract,undefined);
});
test('5.1 extraction replaces old controls and preserves continuation rules',async()=>{
 const layout=await read('layout-tomo.json');const l=layout.find(l=>l.name==='Extract subtomos');
 const keys=['box_size_angst','precrop_size_angst','binned_size_pix','max_dose','min_frames','subtomo_format','do_float16'];
 adaptRelionLayouts(layout,[{id:l.id,options:keys.map(key=>({key}))}],await read('placements-5.1-tomo.json'));
 assert.deepEqual(l.tabs.Extract,keys);assert.equal(l.tabs.Reconstruct,undefined);assert.equal(l.fields.box_size_angst.toggle,'TOGGLE_DEACTIVATE');assert.ok(!Object.values(l.tabs).flat().includes('do_stack2d'));
 assert.equal(keyInfo('Extract subtomos',{box_size_angst:'256',binned_size_pix:'64'}),'64px · 4.00 Å/px');
});
test('new AreTomo controls join the custom merged tab and keep their conditions',async()=>{
 const layout=await read('layout-tomo.json'),catalog=await read('catalog-tomo.json'),l=layout.find(l=>l.name==='Align tilt-series'),s=catalog.find(s=>s.id===l.id);
 s.options.push(...['do_aretomo_reconstruct','do_skip_aretomo_align','aretomo_VolZ','aretomo_OutBin'].map(key=>({key})));
 adaptRelionLayouts(layout,catalog,await read('placements-5.1-tomo.json'));
 assert.ok(l.tabs['IMOD/AreTomo2'].includes('aretomo_OutBin'));
 assert.ok(l.fields.aretomo_OutBin.when.some(c=>c.key==='do_aretomo_reconstruct'));
});
test('unknown versions are not guessed from install paths',async()=>{
 assert.equal(versionFamily('5.1.1_cu12.2'),'5.1');assert.equal(versionFamily('5.0.1'),'5.0');assert.equal(versionFamily('unknown'),null);
 const result=await relionCompatibility({call:async()=>({relionVersion:'5.1.1'})},{env:{PATH:''}});assert.equal(result.runtime,null);assert.equal(result.mismatch,false);assert.match(result.message,/Could not detect/);
});
test('runtime mismatch is detected for a legacy bridge without version metadata',async t=>{
 const os=await import('node:os'),path=await import('node:path');const dir=await fs.mkdtemp(path.join(os.tmpdir(),'relion-version-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 await fs.writeFile(path.join(dir,'relion_refine'),'#!/bin/sh\necho "RELION version: 5.1.1"\n',{mode:0o700});
 const result=await relionCompatibility({call:async()=>({})},{env:{PATH:dir},catalog:[{id:9,options:[]}]});
 assert.equal(result.runtime,'5.1.1');assert.equal(result.mismatch,true);assert.match(result.message,/Rebuild/);
});
