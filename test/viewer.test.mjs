import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {launchViewer,viewerCommand} from '../lib/viewer.mjs';
test('STAR viewer uses GUI mode and passes file paths as single arguments',async()=>{
 const project=await fs.mkdtemp(path.join(os.tmpdir(),'relion-viewer-'));
 try{
  const executable=path.join(project,'relion_display');
  await fs.writeFile(executable,'#!/bin/sh\nprintf "%s\\n" "$PWD" "$@"\n',{mode:0o700});
  const env={...process.env,PATH:project,DISPLAY:':fixture'},file=path.join(project,'CtfFind/job003/micrographs ctf.star');
  const result=await launchViewer(project,file,{env});
  assert.equal(await fs.readFile(result.log,'utf8'),[project,'--gui','--i',file,''].join('\n'));
  assert.deepEqual(viewerCommand('map.mrc').args,['--i','map.mrc']);
  assert.equal(viewerCommand('logfile.pdf').executable,'xdg-open');
  await fs.writeFile(executable,'#!/bin/sh\necho "Cannot open display" >&2\nexit 7\n',{mode:0o700});
  await assert.rejects(launchViewer(project,file,{env}),/exit code 7[\s\S]*Cannot open display[\s\S]*Log:/);
  await assert.rejects(launchViewer(project,file,{env:{...env,DISPLAY:'',WAYLAND_DISPLAY:''}}),/No desktop display/);
 }finally{await fs.rm(project,{recursive:true,force:true});}
});
test('STA reconstructed output uses relion_display; tilt-series input retains native tilt viewer',()=>{
 const output='Tomograms/job006/tomograms.star';
 for(const kind of ['reconstruct','denoise'])assert.deepEqual(viewerCommand(output,'TomogramGroupMetadata.star.relion.tomo.'+kind),{executable:'relion_display',args:['--gui','--i',output]});
 const input='AlignTiltSeries/job005/tilt_series.star';assert.deepEqual(viewerCommand(input,'TomogramGroupMetadata.star.relion.tomo.align'),{executable:'relion_python_tomo_view',args:['tilt-series','--tilt-series-star-file',input]});
});
