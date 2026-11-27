import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {listenWithPortPrompt} from '../lib/listen.mjs';
import {keyInfo} from '../lib/job-key-info.mjs';
import {resolveResources} from '../public/template-resources.js';
import {ProjectDefaults,initialDefaults} from '../lib/project-defaults.mjs';
import {sequentialDefaults} from '../lib/sequential-defaults.mjs';
const layout=JSON.parse(await fs.readFile(new URL('../public/layout-tomo.json',import.meta.url))),catalog=JSON.parse(await fs.readFile(new URL('../public/catalog-tomo.json',import.meta.url)));
test('busy port prompts for next available port, supports refusal and binds accepted port',async()=>{
 const occupied=net.createServer(),server=net.createServer(),refused=net.createServer();
 await new Promise(resolve=>occupied.listen(0,'127.0.0.1',resolve));const port=occupied.address().port;
 try{
  let offered;const selected=await listenWithPortPrompt(server,port,'127.0.0.1',{confirm:async choice=>{offered=choice;return true;}});
  assert(selected>port);assert.equal(offered.next,selected);assert.equal(server.address().port,selected);
  await assert.rejects(listenWithPortPrompt(refused,port,'127.0.0.1',{confirm:async()=>false}),/cancelled/);assert.equal(refused.listening,false);
 }finally{await Promise.all([occupied,server].map(s=>new Promise(r=>s.close(r))));}
});
test('STA motion uses CPUs as MPI ranks and one thread in both implementations',()=>{
 const l=layout.find(l=>l.name==='Motion correction'),s=catalog.find(s=>s.id===l.id);
 for(const do_own_motioncor of ['Yes','No']){const v=resolveResources(l,s,{do_own_motioncor},{globalNcpus:'12',globalNgpus:'2',gpu_ids:'0:1'});assert.equal(v.nr_mpi,'12');assert.equal(v.nr_threads,'1');}
 assert.equal(keyInfo('Import tilt series',{},'Wrote STAR files for 1 tilt-series\nOther output\nWrote STAR files for 2 tilt-series\n'),'2 tilt-series');
});
test('STA executable defaults validate nonempty paths and accept empty overrides',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'sta-defaults-'));
 try{const settings=new ProjectDefaults(dir);assert.match(initialDefaults.fn_aretomo_exe,/AreTomo3$/);assert.match(initialDefaults.fn_batchtomo_exe,/batchruntomo$/);
  for(const key of ['fn_batchtomo_exe','fn_aretomo_exe'])await assert.rejects(settings.write({[key]:path.join(dir,'missing')}),/executable not found/);
  await settings.write({fn_batchtomo_exe:'',fn_aretomo_exe:''});assert.equal((await settings.read()).fn_aretomo_exe,'');
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
test('STA draft defaults reach non-adjacent job types even when an earlier job failed',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'sta-suggest-'));
 try{
  const file='Import/job001/tilt_series.star',group='TomogramGroupMetadata.star.relion';
  for(const name of [file,'.Nodes/TomogramGroupMetadata/'+file]){await fs.mkdir(path.dirname(path.join(dir,name)),{recursive:true});await fs.writeFile(path.join(dir,name),'');}
  const state={jobs:[{name:'Import/job001/',type:50,status:'Succeeded',alias:'None',outputs:[file]}],nodes:[{name:file,type:group}]};
  assert.deepEqual(await sequentialDefaults(dir,[],state,layout,catalog,2),{input_star_mics:file});
  state.jobs.push({name:'CtfFind/job002/',type:2,status:'Failed',outputs:[]});assert.deepEqual(await sequentialDefaults(dir,[],state,layout,catalog,2),{input_star_mics:file});
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
test('browser frame inference maps single frames to corrected STA images and caches unchanged inputs',async()=>{
 const vm=await import('node:vm');const source=await fs.readFile(new URL('../public/app.js',import.meta.url),'utf8');
 const chunk=source.slice(source.indexOf('let frameRevision=0;'),source.indexOf('const importCounts='));
 for(const [name,flag,patternKey,frames,expected] of [['Import tilt series','images_are_motion_corrected','movie_files',1,'Yes'],['Import tilt series','images_are_motion_corrected','movie_files',3,'No'],['Import','is_multiframe','fn_in_raw',3,'Yes']]){
  let calls=0;const values={[patternKey]:'input/*.mrc'},input={isConnected:true,oninput(){values[flag]=input.value;}},hint={};
  const context={values,type:50,selected:null,currentLayout:()=>({name}),disabledField:()=>false,$:selector=>selector==='#f-'+flag?input:selector==='#inline-frame-hint'?hint:null,api:async()=>{calls++;return {frames,file:'input/one.mrc'};},syncDisabled(){},URLSearchParams};
  vm.createContext(context);vm.runInContext(chunk,context);await vm.runInContext('showFrameHint()',context);assert.equal(values[flag],expected);await vm.runInContext('showFrameHint()',context);assert.equal(calls,1);
 }
});
test('STA CTF MPI and cryoCARE defaults reach drafts and portable templates',async()=>{
 const {workstationDefaults}=await import('../public/workstation-defaults.js');
 const {portableResources,isMachineOption}=await import('../public/template-resources.js');
 const ctf=layout.find(l=>l.name==='CTF estimation'),cs=catalog.find(s=>s.id===ctf.id);
 assert.equal(resolveResources(ctf,cs,{}, {globalNcpus:'12'}).nr_mpi,'12');
 assert.equal(workstationDefaults(ctf,cs,{}, {globalNcpus:'12'}).nr_mpi,'12');
 const l=layout.find(l=>l.name==='Denoise tomograms'),s=catalog.find(s=>s.id===l.id),globals={...initialDefaults,cryocare_path:'/local/cryoCARE'};
 assert(isMachineOption('cryocare_path'));assert.equal(portableResources({},s).cryocare_path,'TBD');
 assert.equal(resolveResources(l,s,{cryocare_path:'TBD'},globals).cryocare_path,'/local/cryoCARE');
 assert.equal(workstationDefaults(l,s,{},globals).cryocare_path,'/local/cryoCARE');
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'cryocare-default-'));try{const settings=new ProjectDefaults(dir);await settings.write({cryocare_path:dir});assert.equal((await settings.read()).cryocare_path,dir);await assert.rejects(settings.write({cryocare_path:path.join(dir,'missing')}),/directory does not exist/);await settings.write({cryocare_path:''});assert.equal((await settings.read()).cryocare_path,'');}finally{await fs.rm(dir,{recursive:true,force:true});}
});

test('frame hints apply only finite mdoc doses and preserve explicit edits',async()=>{
 const vm=await import('node:vm'),source=await fs.readFile(new URL('../public/app.js',import.meta.url),'utf8');
 const chunk=source.slice(source.indexOf('let frameRevision=0;'),source.indexOf('const importCounts='));
 for(const [metadata,initial,edited,expected] of [[null,'',false,''],[{},'',false,''],[{dose:null},'',false,''],[{error:'unreadable'},'',false,''],[{dose:NaN},'',false,''],[{dose:2.5},'',false,'2.5'],[{dose:0},'',false,'0'],[{dose:2.5},'7',false,'7'],[{dose:2.5},'',true,'']]){
  const values={movie_files:'input/*.mrc',dose_rate:initial,...(metadata?{mdoc_files:'input/*.mdoc'}:{})},input={isConnected:true,oninput(){}},dose={value:initial};
  const context={values,type:50,selected:null,currentLayout:()=>({name:'Import tilt series'}),disabledField:()=>false,$:s=>s==='#f-images_are_motion_corrected'?input:s==='#f-dose_rate'?dose:null,api:async route=>route.startsWith('mdoc-info')?metadata:{frames:1},syncDisabled(){},URLSearchParams,schema:()=>({options:[{key:'dose_rate',default:''}]}),drafts:new Map(),editedInputDefaults:new Map(edited?[[50,new Set(['dose_rate'])]]:[])};
  vm.createContext(context);vm.runInContext(chunk,context);await vm.runInContext('showFrameHint()',context);
  assert.equal(values.dose_rate,expected);assert.equal(dose.value,expected);
 }
});

test('sequential suggestions never overwrite an existing STA job editor',async()=>{
 const vm=await import('node:vm'),source=await fs.readFile(new URL('../public/app.js',import.meta.url),'utf8');
 const chunk=source.slice(source.indexOf('const sequentialRequests='),source.indexOf('let extractionRequest='));
 const values={input_star_mics:'chosen.star'};
 const context={pinnedId:null,copiedDraft:false,workspaceFeed:null,busy:false,selected:'CtfFind/job002/',values,api:()=>assert.fail('existing jobs must not request draft defaults')};
 vm.createContext(context);vm.runInContext(chunk,context);await vm.runInContext('applySequentialDefaults()',context);assert.equal(values.input_star_mics,'chosen.star');
});
