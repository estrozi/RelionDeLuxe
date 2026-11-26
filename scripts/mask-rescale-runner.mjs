import fs from 'node:fs/promises';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mrcGrid,matchingGrid} from '../lib/mask-rescale.mjs';
import {resolveExecutable} from '../lib/executables.mjs';
import {starValue} from '../lib/settings.mjs';

const args=process.argv.slice(2),arg=name=>args[args.indexOf(name)+1],out=arg('--o');
if(!/^External\/job\d+\/$/.test(out||''))throw Error('Invalid External job output directory.');
try{
 for(const marker of ['SUCCESS','FAILURE','ABORTED'])await fs.rm(out+'RELION_JOB_EXIT_'+marker,{force:true});
 const roots=JSON.parse(Buffer.from(arg('--read_roots'),'base64url').toString());
 const reference=arg('--in_3dref'),mask=arg('--in_mask');
 const [target,source]=await Promise.all([mrcGrid(process.cwd(),roots,reference),mrcGrid(process.cwd(),roots,mask)]);
 const output=out+'rescaled_mask.mrc';
 if(matchingGrid(target,source)){
  console.log('Mask already matches the 3D map grid; copying it to '+output);
  const {readablePath}=await import('../lib/paths.mjs');
  await fs.copyFile(await readablePath(process.cwd(),roots,mask),output);
 }else{
  const executable=await resolveExecutable('relion_image_handler');if(!executable)throw Error('relion_image_handler was not found in PATH.');
  if(target.size.some(n=>n!==target.size[0])||source.size.some(n=>n!==source.size[0]))throw Error('Mask re-scaling requires cubic 3D maps; map='+target.size.join('x')+', mask='+source.size.join('x'));
  console.log('Rescaling mask from '+source.size.join('x')+' at '+source.pixelSize+' Å/pixel to '+target.size.join('x')+' at '+target.pixelSize+' Å/pixel.');
  await promisify(execFile)(executable,['--i',mask,'--o',output,'--angpix',String(source.pixelSize),'--rescale_angpix',String(target.pixelSize),'--new_box',String(target.size[0]),'--force_header_angpix',String(target.pixelSize),'--threshold_above','1','--threshold_below','0'],{maxBuffer:8*1024*1024});
  const converted=await mrcGrid(process.cwd(),roots,output);
  console.log('Produced mask grid: '+converted.size.join('x')+' at '+converted.pixelSize+' Å/pixel.');
  if(!matchingGrid(target,converted))throw Error('Rescaled mask grid does not match the 3D map: target '+target.size.join('x')+' at '+target.pixelSize+' Å/pixel, result '+converted.size.join('x')+' at '+converted.pixelSize+' Å/pixel.');
 }
 await fs.writeFile(out+'RELION_OUTPUT_NODES.star','data_output_nodes\nloop_\n_rlnPipeLineNodeName #1\n_rlnPipeLineNodeTypeLabel #2\n'+starValue(output)+' Mask3D.mrc\n');
 await fs.writeFile(out+'RELION_JOB_EXIT_SUCCESS','');
}catch(error){await fs.writeFile(out+'RELION_JOB_EXIT_FAILURE','').catch(()=>{});console.error('Mask re-scaling failed: '+error.message);process.exitCode=1;}
