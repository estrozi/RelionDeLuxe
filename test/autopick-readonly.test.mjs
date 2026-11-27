import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {autopickReadOnlySnapshot,pickerCoordinates,pickerCounts,pickerImage,coordinateText} from '../lib/browser-picker.mjs';

test('native Auto-picking inspection reads mapped coordinates and images without browser session files or writes',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'autopick-inspect-')),job='AutoPick/job003/';
 try{
  await fs.mkdir(path.join(root,job),{recursive:true});
  await fs.writeFile(path.join(root,'mics.star'),'data_optics\nloop_\n_rlnOpticsGroup\n_rlnMicrographPixelSize\n1 2\ndata_micrographs\nloop_\n_rlnMicrographName\n_rlnOpticsGroup\na.mrc 1\nb.mrc 1\n');
  await fs.writeFile(path.join(root,job,'autopick.star'),'data_coordinate_files\nloop_\n_rlnMicrographName\n_rlnMicrographCoordinates\nb.mrc AutoPick/job003/custom.star\n');
  const coordinates=coordinateText([{x:1,y:2,fom:0.8}]);await fs.writeFile(path.join(root,job,'custom.star'),coordinates);
  const bytes=Buffer.alloc(1024+16*4);for(const [o,v] of [[0,4],[4,4],[8,1],[12,2]])bytes.writeInt32LE(v,o);await fs.writeFile(path.join(root,'b.mrc'),bytes);
  const context=await autopickReadOnlySnapshot(root,[],job,{fn_input_autopick:'mics.star',particle_diameter:'180',continue_manual:'No'});
  assert.equal(context.writable,false);assert.equal(context.powerScreening,false);assert.equal(context.values.diameter,'180');assert.equal(context.mics.length,1);assert.equal(context.mics[0].file,'b.mrc');assert.equal(context.mics[0].pixel,2);
  const picks=await pickerCoordinates(root,[],job,context.mics[0]);assert.equal(picks.points[0].x,1);assert.equal(picks.points[0].y,2);assert.equal(picks.points[0].fom,0.8);
  assert.deepEqual(await pickerCounts(root,[],job,context),[1]);assert.equal((await pickerImage(root,[],context.mics[0],context.values)).nx,4);
  assert.deepEqual((await fs.readdir(path.join(root,job))).sort(),['autopick.star','custom.star']);assert.equal(await fs.readFile(path.join(root,job,'custom.star'),'utf8'),coordinates);
  await fs.unlink(path.join(root,job,'custom.star'));await assert.rejects(pickerCoordinates(root,[],job,context.mics[0]),/ENOENT/);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});

test('inspection bypasses manual-session prerequisites but never grants write access, including running jobs',async()=>{
 const source=await fs.readFile(new URL('../server.mjs',import.meta.url),'utf8');
 const start=source.indexOf('async function pickingContext('),end=source.indexOf('\n',start);
 let markerReads=0;
 const env={currentJob:async()=>({type:4,status:'Running'}),tomo:false,adapter:{call:async()=>({values:{fn_input_autopick:'mics.star'}})},autopickReadOnlySnapshot:async()=>({writable:false}),project:'project',readRoots:[],fs:{access:async()=>{markerReads++;throw Error('Missing manual session');}},jobFile:async()=>'/marker'};
 vm.runInNewContext(source.slice(start,end),env);
 assert.equal((await env.pickingContext('AutoPick/job003/',true)).writable,false);assert.equal(markerReads,0);
 await assert.rejects(env.pickingContext('AutoPick/job003/'),/Missing manual session/);
 env.currentJob=async()=>({type:3});await assert.rejects(env.pickingContext('ManualPick/job001/',true),/requires an Auto-picking/);
});

test('read-only picker draws saved circles and cannot edit, save, finish, clean up or autosave on navigation',async()=>{
 const source=(await fs.readFile(new URL('../public/picker.js',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'');
 const elements=new Map(),calls=[],circles=[];
 const drawing={drawImage(){},beginPath(){},ellipse(...args){circles.push(args);},stroke(){},createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(){}};
 const element=id=>{if(!elements.has(id))elements.set(id,{value:'',style:{},children:[],classList:{add(){},remove(){},toggle(){}},getContext:()=>drawing,setAttribute(){},removeAttribute(){},addEventListener(){},append(...x){this.children.push(...x);},scrollTo(){},getBoundingClientRect:()=>({left:0,top:0,width:4,height:4})});return elements.get(id);};
 const bytes=new ArrayBuffer(8+16*4);new DataView(bytes).setUint32(0,4,true);new DataView(bytes).setUint32(4,4,true);
 const state={writable:true,readOnly:true,powerScreening:true,values:{diameter:'2',micscale:'1',sigma_contrast:'3',black_val:'0',white_val:'0'},mics:[{file:'a.mrc',pixel:1},{file:'b.mrc',pixel:1}]};
 const env={URLSearchParams,location:{hash:'#job=AutoPick/job003/&readonly=1&token=test',pathname:'/picker.html'},sessionStorage:{setItem(){},getItem(){}},window:{history:{replaceState(){}},addEventListener(){}},document:{querySelector:element,querySelectorAll:()=>[],documentElement:{dataset:{}},createElement:()=>element(Symbol())},visibleAtFom:()=>true,requestId:()=>'',mountParticleQuality:()=>{throw Error('Cleanup must not mount');},fetch:async(url,options)=>{calls.push({url,options});const route=url.split('?')[0];const data=route==='/api/picking'?state:route.endsWith('coordinates')?{points:[{x:1,y:2}],revision:'r'}:route.endsWith('counts')?{counts:[1,1]}:{mean:0,stddev:0,min:0,max:0};return {ok:true,json:async()=>data,arrayBuffer:async()=>bytes,headers:{get:()=>4}};}};
 const controls=await vm.runInNewContext('(async()=>{'+source+'\nreturn {switchMic,save,request,points:()=>points};})()',env);
 assert(circles.length>0);assert.equal(circles[0][0],1);assert.equal(circles[0][1],2);
 for(const id of ['save','finish','undo']){assert.equal(element('#'+id).hidden,true);assert.equal(element('#'+id).disabled,true);await element('#'+id).onclick();}
 element('#image').onclick({clientX:3,clientY:3});element('#image').oncontextmenu({preventDefault(){},clientX:1,clientY:2});assert.equal(controls.points().length,1);
 await controls.save();await controls.switchMic(1);await assert.rejects(controls.request('picking-save',{}),/read-only/);
 assert(calls.every(c=>c.options.method==='GET'));assert(calls.every(c=>new URL(c.url,'http://localhost').searchParams.get('readonly')==='1'));
 assert.match(element('#picking-help').textContent,/Read-only/);
});
