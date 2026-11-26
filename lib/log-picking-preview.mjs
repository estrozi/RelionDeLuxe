import fs from 'node:fs/promises';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {pickerSnapshot} from './browser-picker.mjs';
import {parseStar} from './gallery.mjs';
import {readablePath} from './paths.mjs';
import {resolveExecutable} from './executables.mjs';
import {starValue} from './settings.mjs';
const exec=promisify(execFile);
export function logPreviewArgs(v){
 if(v.do_log!=='Yes')throw Error('Test picking requires LoG mode.');
 if(String(v.other_args||'').trim())throw Error('Test picking does not support Additional arguments. Clear them before testing.');
 if(v.do_read_fom_maps==='Yes')throw Error('Test picking cannot reuse saved FOM maps. Disable Read FOM maps before testing.');
 const args=['--i','input.star','--odir','output/','--pickname','autopick','--LoG'];
 for(const [key,flag,fallback] of [['log_diam_min','LoG_diam_min',200],['log_diam_max','LoG_diam_max',250],['log_maxres','lowpass',20],['log_adjust_thr','LoG_adjust_threshold',0],['log_upper_thr','LoG_upper_threshold',999]]){
  const n=Number(v[key]??fallback);if(!Number.isFinite(n)||String(v[key]??fallback).trim()==='')throw Error(`Invalid ${key}.`);if(key!=='log_upper_thr'||n<999)args.push('--'+flag,String(n));
 }
 if(!(Number(v.log_diam_min)>0&&Number(v.log_diam_max)>=Number(v.log_diam_min)))throw Error('Choose positive min/max diameters, with maximum at least minimum.');
 args.push('--shrink','0');
 if(v.do_write_fom_maps==='Yes')args.push('--write_fom_maps');
 if(v.log_invert==='Yes')args.push('--Log_invert');
 return args;
}
export async function logPickingPreview(project,roots,b){
 const args=logPreviewArgs(b.values||{}),snapshot=await pickerSnapshot(project,roots,{fn_in:b.values.fn_input_autopick,angpix:b.values.angpix||'-1'});
 const mic=snapshot.mics.filter(m=>Number.isFinite(m.defocusU)).sort((a,b)=>b.defocusU-a.defocusU)[0];
 if(!mic||mic.file!==b.micrograph||(b.revision&&snapshot.revision!==b.revision))throw Error('The preview micrograph changed. Reload the Laplacian tab before testing.');
 const input=await readablePath(project,roots,mic.file),exe=await resolveExecutable('relion_autopick',{cwd:project});
 if(!exe)throw Error('Test picking requires relion_autopick in the server PATH.');
 const base=path.join(project,'.reliondeluxe');await fs.mkdir(base,{recursive:true});await readablePath(project,[],base);
 const dir=await fs.mkdtemp(path.join(base,'log-preview-'));
 try{
  const name='micrograph'+path.extname(input);await fs.symlink(input,path.join(dir,name));await fs.mkdir(path.join(dir,'output'));
  // Keep the selected micrograph and its optics metadata; local name makes output paths unambiguous.
  const blocks=parseStar(await fs.readFile(await readablePath(project,roots,b.values.fn_input_autopick),'utf8'));
  const optics=blocks.find(x=>x.name==='optics'),micrographs=blocks.find(x=>x.name==='micrographs');
  const table=micrographs.tables[0],row={...table.rows[mic.index],rlnMicrographName:name};
  const serialize=(block,tables)=>`data_${block.name}\n`+Object.entries(block.values).map(([k,v])=>'_'+k+' '+starValue(v)+'\n').join('')+tables.map(t=>'\nloop_\n'+t.labels.map(k=>'_'+k).join('\n')+'\n'+t.rows.map(r=>t.labels.map(k=>starValue(r[k])).join(' ')).join('\n')+'\n').join('');
  await fs.writeFile(path.join(dir,'input.star'),serialize(optics,optics.tables)+'\n'+serialize(micrographs,[{...table,rows:[row]}]));
  await exec(exe,args,{cwd:dir,timeout:10*60*1000,maxBuffer:4*1024*1024});
  const output=parseStar(await fs.readFile(path.join(dir,'output','micrograph_autopick.star'),'utf8'));
  const coords=output.flatMap(x=>x.tables).find(t=>t.labels.includes('rlnCoordinateX')&&t.labels.includes('rlnCoordinateY'));
  if(!coords)throw Error('RELION did not produce a coordinate table.');
  const points=coords.rows.map(r=>({x:Number(r.rlnCoordinateX),y:Number(r.rlnCoordinateY),fom:r.rlnAutopickFigureOfMerit!==undefined&&Number.isFinite(Number(r.rlnAutopickFigureOfMerit))?Number(r.rlnAutopickFigureOfMerit):null}));
  if(points.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))throw Error('Invalid coordinates returned by RELION.');
  return {points,micrograph:mic.file,diameter:(Number(b.values.log_diam_min)+Number(b.values.log_diam_max))/2};
 }finally{await fs.rm(dir,{recursive:true,force:true});}
}
