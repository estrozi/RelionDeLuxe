import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {prepareCtfPreview,ctfPreviewArgs,ctfPreview,ctfDiagnosticMetadata} from '../lib/ctf-preview.mjs';
import {parseStar} from '../lib/gallery.mjs';
import {ctfPreviewTabs,ctfCircleLimits,ctfSliderLimits} from '../public/ctf-preview.js';
const serialize=(name,labels,rows)=>'data_'+name+'\nloop_\n'+labels.map(k=>'_'+k).join('\n')+'\n'+rows.map(r=>r.join(' ')).join('\n')+'\n';
async function fixture(t){const root=await fs.mkdtemp(path.join(os.tmpdir(),'ctf-test-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));for(const f of ['a.mrc','b.mrc','a_ps.mrc','b_ps.mrc'])await fs.writeFile(path.join(root,f),'data');return root;}
const optics=serialize('optics',['rlnOpticsGroup','rlnMicrographPixelSize','rlnVoltage','rlnSphericalAberration','rlnAmplitudeContrast'],[[1,1.5,300,2.7,0.1]]);
const mics=serialize('micrographs',['rlnMicrographName','rlnOpticsGroup','rlnCtfPowerSpectrum'],[['a.mrc',1,'a_ps.mrc'],['b.mrc',1,'b_ps.mrc']]);
test('given power spectra fix the box at 512; fresh spectra use the selected box and an absolute CTFFIND path',()=>{const executable='/opt/ctffind/bin/ctffind';const given=ctfPreviewArgs({box:'2048',use_given_ps:'Yes'},false,executable);assert.equal(given[given.indexOf('--Box')+1],'512');assert.equal(given[given.indexOf('--ctffind_exe')+1],executable);const fresh=ctfPreviewArgs({box:'1024',use_given_ps:'No'},false,executable);assert.equal(fresh[fresh.indexOf('--Box')+1],'1024');assert.ok(!fresh.includes('--use_given_ps'));});
test('preview clamps the command resolution to the selected micrograph Nyquist limit',async t=>{const root=await fixture(t);const input=serialize('optics',['rlnOpticsGroup','rlnMicrographPixelSize'],[[1,3.14]])+mics;await fs.writeFile(path.join(root,'input.star'),input);const execute=async(_runner,args,{cwd})=>{assert.equal(args[args.indexOf('--ResMax')+1],'6.5');const mrc=Buffer.alloc(1040);mrc.writeInt32LE(2,0);mrc.writeInt32LE(2,4);mrc.writeInt32LE(1,8);mrc.writeInt32LE(2,12);await fs.writeFile(path.join(cwd,'output','test.ctf'),mrc);};const result=await ctfPreview(root,[],{values:{input_star_mics:'input.star',resmax:'5'},seed:'draft'},{resolve:async()=>'/bin/true',execute});assert.equal(result.resmax,6.5);});
test('tomography preview reports the dose-adjusted CTFFIND search limit',async t=>{const root=await fixture(t);await fs.writeFile(path.join(root,'tilts.star'),serialize('global',['rlnTomoName','rlnTomoTiltSeriesStarFile','rlnTomoTiltSeriesPixelSize'],[['A','a.star',3.14]]));await fs.writeFile(path.join(root,'a.star'),serialize('tilts',['rlnMicrographName','rlnMicrographPreExposure'],[['a.mrc',23.94]]));const execute=async(_runner,args,{cwd})=>{assert.equal(args[args.indexOf('--ResMax')+1],'6.5');const mrc=Buffer.alloc(1040);mrc.writeInt32LE(2,0);mrc.writeInt32LE(2,4);mrc.writeInt32LE(1,8);mrc.writeInt32LE(2,12);await fs.writeFile(path.join(cwd,'output','test.ctf'),mrc);};const result=await ctfPreview(root,[],{values:{input_star_mics:'tilts.star',resmax:'5',resmin:'30',exp_factor_dose:'100'},seed:'draft'},{resolve:async()=>'/bin/true',execute});assert.ok(Math.abs(result.actualResmax-6.5*Math.exp(.2394))<1e-9);});
test('preview tab is between I/O and CTFFIND only for unscheduled drafts',()=>{const tabs={'I/O':['input_star_mics'],'CTFFIND-4.1':['box'],Running:['nr_mpi']};assert.deepEqual(Object.keys(ctfPreviewTabs(tabs,'CTF estimation',false)),['I/O','Preview','CTFFIND-4.1','Running']);assert.equal(ctfPreviewTabs(tabs,'CTF estimation',true),tabs);assert.equal(ctfPreviewTabs(tabs,'Motion correction',false),tabs);});
test('runner flags mirror native search settings without MPI, queue or arbitrary shell arguments',()=>{const args=ctfPreviewArgs({box:'256',do_phaseshift:'Yes',phase_min:'10',phase_max:'90',phase_step:'5',use_given_ps:'Yes',slow_search:'Yes',use_noDW:'Yes',nr_mpi:'32'},true);assert.ok(args.includes('--use_given_ps'));assert.ok(args.includes('--phase_step'));assert.ok(args.includes('--exp_factor_dose'));assert.ok(!args.includes('--fast_search'));assert.ok(!args.includes('--use_noDW'));assert.ok(!args.includes('32'));assert.throws(()=>ctfPreviewArgs({other_args:'--o elsewhere'}),/Additional arguments/);assert.throws(()=>ctfPreviewArgs({dfstep:'0'}),/search settings/);});
test('one stable random SPA micrograph, original optics retained, source unchanged',async t=>{const root=await fixture(t),input=optics+mics;await fs.writeFile(path.join(root,'input.star'),input);let selected;for(const name of ['first','second']){const dir=path.join(root,name);await fs.mkdir(dir);const r=await prepareCtfPreview(root,[],{input_star_mics:'input.star',use_given_ps:'Yes'},'draft-id',dir);if(selected)assert.equal(r.micrograph,selected);selected=r.micrograph;assert.equal(r.angpix,1.5);const blocks=parseStar(await fs.readFile(path.join(dir,'input.star'),'utf8'));assert.equal(blocks.find(b=>b.name==='micrographs').tables[0].rows.length,1);assert.equal(blocks.find(b=>b.name==='optics').tables[0].rows[0].rlnVoltage,'300');assert.equal(await fs.realpath(path.join(dir,'rlnMicrographName.mrc')),path.join(root,selected));}assert.equal(await fs.readFile(path.join(root,'input.star'),'utf8'),input);});
test('STA preview keeps one global series and one tilt with nominal defocus and exposure',async t=>{const root=await fixture(t);await fs.writeFile(path.join(root,'tilts.star'),serialize('global',['rlnTomoName','rlnTomoTiltSeriesStarFile'],[['A','a.star'],['B','b.star']]));for(const n of ['a','b'])await fs.writeFile(path.join(root,n+'.star'),serialize(n,['rlnMicrographName','rlnTomoNominalDefocus','rlnMicrographPreExposure'],[[n+'.mrc',-3,12]]));const dir=path.join(root,'temp');await fs.mkdir(dir);const r=await prepareCtfPreview(root,[],{input_star_mics:'tilts.star'},'draft',dir);assert.equal(r.tomo,true);const global=parseStar(await fs.readFile(path.join(dir,'input.star'),'utf8')).flatMap(b=>b.tables)[0];assert.equal(global.rows.length,1);assert.equal(global.rows[0].rlnTomoTiltSeriesStarFile,'series.star');const mic=parseStar(await fs.readFile(path.join(dir,'series.star'),'utf8')).flatMap(b=>b.tables)[0].rows[0];assert.equal(mic.rlnMicrographPreExposure,'12');assert.equal(mic.rlnTomoNominalDefocus,'-3');});
test('preview returns gallery pixels, pixel size, removes scratch on success and failure, creates no job',async t=>{const root=await fixture(t);await fs.writeFile(path.join(root,'input.star'),optics+mics);const b={values:{input_star_mics:'input.star'},seed:'draft'};const resolve=async()=>'/bin/true';const execute=async(exe,args,options)=>{assert.equal(exe,'/bin/true');assert.equal(args[args.indexOf('--i')+1],'input.star');const mrc=Buffer.alloc(1024+16);mrc.writeInt32LE(2,0);mrc.writeInt32LE(2,4);mrc.writeInt32LE(1,8);mrc.writeInt32LE(2,12);for(let i=0;i<4;i++)mrc.writeFloatLE(i,1024+4*i);await fs.writeFile(path.join(options.cwd,'output','test.ctf'),mrc);};const result=await ctfPreview(root,[],b,{resolve,execute});assert.equal(Buffer.from(result.image,'base64').readUInt32LE(0),2);assert.equal(result.angpix,1.5);assert.deepEqual(await fs.readdir(path.join(root,'.reliondeluxe')),[]);await assert.rejects(ctfPreview(root,[],b,{resolve,execute:async()=>{throw Error('Test failure');}}),/Test failure/);assert.deepEqual(await fs.readdir(path.join(root,'.reliondeluxe')),[]);assert.ok(!(await fs.readdir(root)).includes('CtfFind'));});

test('CTFFIND diagnostic metadata distinguishes input sampling, fitting sampling and effective limits',()=>{
 const script='ctffind << EOF\na.mrc\na.ctf\n0.885\n300\n2.7\n0.1\n512\n30\n7.97866\nEOF\n';
 const d=ctfDiagnosticMetadata('Pixel size for fitting          : 1.400 Angstroms',script);
 assert.deepEqual(d,{fittingAngpix:1.4,inputAngpix:.885,actualResmin:30,actualResmax:7.97866});
 assert.equal(ctfDiagnosticMetadata('Pixel size for fitting : NaN').fittingAngpix,null);
});
test('circles use the diagnostic sampling, independent of display size and STA dose correction',()=>{
 const spa={angpix:.885,fittingAngpix:1.4,resmin:30,resmax:5,actualResmax:5,tomo:false,preExposure:40,doseFactor:100};
 const limits=ctfCircleLimits(spa,{resmin:30,resmax:5},512);
 assert.equal(limits.radii[0],512*1.4/30);assert.equal(limits.radii[1],512*1.4/5);
 assert.equal(ctfCircleLimits(spa,{resmin:30,resmax:6},1024).radii[1],1024*1.4/6);
 assert.equal(ctfCircleLimits({...spa,fittingAngpix:3.14},{resmin:30,resmax:6.28},512).radii[1],256);
 const sta={...spa,tomo:true,resmax:6.5,actualResmax:8.2};
 assert.equal(ctfCircleLimits(sta,{resmin:30,resmax:6.5},512).resmax,8.2);
 assert.equal(ctfCircleLimits(sta,{resmin:30,resmax:7},512).resmax,7*Math.exp(.4));
});
test('preview reads the matching CTFFIND log and generated command before cleaning up',async t=>{
 const root=await fixture(t);await fs.writeFile(path.join(root,'input.star'),optics+mics);
 const execute=async(_runner,_args,{cwd})=>{
  const mrc=Buffer.alloc(1040);[2,2,1,2].forEach((v,i)=>mrc.writeInt32LE(v,4*i));
  await fs.writeFile(path.join(cwd,'output','test.ctf'),mrc);
  await fs.writeFile(path.join(cwd,'output','test_ctffind4.log'),'Pixel size for fitting : 2.000 Angstroms');
  await fs.writeFile(path.join(cwd,'output','test_ctffind4.com'),'ctffind << EOF\na.mrc\ntest.ctf\n1.5\n300\n2.7\n0.1\n512\n30\n5.12345\nEOF\n');
 };
 const result=await ctfPreview(root,[],{values:{input_star_mics:'input.star'},seed:'draft'},{resolve:async()=>'/bin/true',execute});
 assert.equal(result.angpix,1.5);assert.equal(result.fittingAngpix,2);assert.equal(result.scaleSource,'CTFFIND log');assert.equal(result.actualResmax,5.12345);
 assert.deepEqual(await fs.readdir(path.join(root,'.reliondeluxe')),[]);
});

test('SPA and STA sliders stay on a half-Å grid, within Nyquist and ordered',()=>{
 for(const pixel of [.885,1.57,3.14]){
  const limits=ctfSliderLimits({resmin:49.98,resmax:1},pixel);
  assert.equal(limits.resmin,50);assert.ok(limits.resmax>=2*pixel);
  assert.equal(limits.resmax*2,Math.round(limits.resmax*2));
  for(const resmax of [limits.resmax,limits.resmax+.5,30,60]){
   const next=ctfSliderLimits({resmin:30,resmax},pixel);
   assert.ok(next.resmax<next.resmin);assert.equal(next.resmax*2,Math.round(next.resmax*2));
  }
 }
 assert.equal(ctfSliderLimits({resmin:30,resmax:5},3.14).resmax,6.5);
});

for(const tomo of [false,true])test(`preview refresh excludes previous image (${tomo?'STA':'SPA'}) and handles single inputs`,async t=>{
 const root=await fixture(t);
 if(tomo){await fs.writeFile(path.join(root,'input.star'),serialize('global',['rlnTomoName','rlnTomoTiltSeriesStarFile'],[['A','series.star']]));await fs.writeFile(path.join(root,'series.star'),mics);}
 else await fs.writeFile(path.join(root,'input.star'),optics+mics);
 const run=async(n,exclude)=>{const dir=path.join(root,'preview'+n);await fs.mkdir(dir);return prepareCtfPreview(root,[],{input_star_mics:'input.star'},'same-seed',dir,exclude);};
 const first=await run(1,null),second=await run(2,first.micrograph);assert.notEqual(first.micrograph,second.micrograph);
 const single=serialize('micrographs',['rlnMicrographName'],[['a.mrc']]);await fs.writeFile(path.join(root,tomo?'series.star':'input.star'),single);
 assert.equal((await run(3,'a.mrc')).micrograph,'a.mrc');
});
