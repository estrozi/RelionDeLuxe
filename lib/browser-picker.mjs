import {gainTiffToMrc} from './gain-tiff.mjs';
import {validateFilaments} from '../public/picking-geometry.js';
import fs from 'node:fs/promises';import path from 'node:path';import {createHash,randomUUID} from 'node:crypto';import {execFile} from 'node:child_process';import {promisify} from 'node:util';
import {parseStar,galleryImage} from './gallery.mjs';import {readablePath} from './paths.mjs';import {resolveExecutable,resolvePickerTopaz} from './executables.mjs';
const exec=promisify(execFile);
export function supportsPicker(v){return /\.star$/i.test(v.fn_in||'')&&!['do_fom_threshold','do_color','do_queue'].some(k=>v[k]==='Yes')&&!String(v.other_args||'').trim();}
export async function pickerSnapshot(project,roots,v){const file=await readablePath(project,roots,v.fn_in);if((await fs.stat(file)).size>32*1024*1024)throw Error('Micrograph STAR exceeds the browser picker limit.');const text=await fs.readFile(file,'utf8'),blocks=parseStar(text),optics=blocks.find(b=>b.name==='optics')?.tables[0]?.rows,rows=blocks.find(b=>b.name==='micrographs')?.tables[0]?.rows;if(!rows?.length||!optics?.length)throw Error('Browser picking requires micrographs and optics tables.');
 const mics=rows.map((r,index)=>{const o=optics.find(o=>o.rlnOpticsGroup===r.rlnOpticsGroup),pixel=Number(o?.rlnMicrographPixelSize)||Number(v.angpix);if(!r.rlnMicrographName||!(pixel>0))throw Error('Each micrograph needs a filename and positive pixel size.');return {index,file:r.rlnMicrographName,ctf:r.rlnCtfImage||'',defocusU:r.rlnDefocusU!==undefined&&r.rlnDefocusU!==''&&Number.isFinite(Number(r.rlnDefocusU))?Number(r.rlnDefocusU):null,coordinates:r.rlnMicrographCoordinates||'',pixel};});
 return {mics,values:v,revision:createHash('sha256').update(text).digest('hex')};}
export function coordinateName(file,autopick=false){
 if(typeof file==='number')return 'mic_'+String(file+1).padStart(6,'0')+'_manualpick.star'; // Legacy read compatibility.
 if(typeof file!=='string'||!file||file.includes('\0'))throw Error('Invalid micrograph name');
 const relative=file.replace(/^.*?[^/]+\/job\d+\//,'').replace(/^\/+/, '');
 if(relative.split('/').some(p=>p==='..'||p==='.'||!p))throw Error('Unsafe micrograph path');
 return relative.replace(/\.[^/.]+$/,'')+(autopick?'_autopick.star':'_manualpick.star');
}
export function coordinateText(points,helical=false){
 if(!Array.isArray(points)||points.length>20000)throw Error('Too many coordinates');
 if(helical)validateFilaments(points);
 return '# version 50001\n\ndata_\n\nloop_\n_rlnCoordinateX #1\n_rlnCoordinateY #2\n_rlnParticleSelectionType #3\n_rlnAnglePsi #4\n_rlnAutopickFigureOfMerit #5\n'+points.map((p,i)=>{
 let psi=p.psi??-999;
 if(helical){const a=points[i-i%2],b=points[i-i%2+1];psi=-Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI;}
 const row=[p.x,p.y,p.selectionType??2,psi,p.fom??0];
 if(row.some(x=>typeof x!=='number'||!Number.isFinite(x)))throw Error('Invalid coordinate');
 return row.join(' ');
 }).join('\n')+'\n';
}
export async function pickerCoordinates(project,roots,job,mic,mappingIndex=null){if(mic.readOnly){const text=await fs.readFile(await readablePath(project,roots,mic.coordinates),'utf8');return parsedPickerCoordinates(text);} let own=path.join(project,job,coordinateName(mic.file,mic.mapping==='autopick.star'));if(mic.mapping==='autopick.star'){let mapped=mappingIndex?.get(mic.file);if(!mappingIndex)try{const blocks=parseStar(await fs.readFile(await readablePath(project,roots,path.join(job,mic.mapping)),'utf8'));mapped=blocks.flatMap(b=>b.tables).flatMap(t=>t.rows).find(r=>r.rlnMicrographName===mic.file)?.rlnMicrographCoordinates;}catch(e){if(e.code!=='ENOENT')throw e;}if(mapped)own=path.resolve(project,mapped);}let text='';try{text=await fs.readFile(await readablePath(project,roots,own),'utf8');}catch(e){if(e.code!=='ENOENT')throw e;let reference=mic.coordinates;const legacy=path.join(job,coordinateName(mic.index));try{await fs.access(await readablePath(project,roots,legacy));reference=legacy;}catch(e){if(e.code!=='ENOENT')throw e;}if(mappingIndex){reference=mappingIndex.get(mic.file)||reference;}else{try{const mapping=parseStar(await fs.readFile(await readablePath(project,roots,path.join(job,mic.mapping||'manualpick.star')),'utf8'));const old=mapping.flatMap(b=>b.tables).flatMap(t=>t.rows).find(r=>r.rlnMicrographName===mic.file);if(old?.rlnMicrographCoordinates)reference=old.rlnMicrographCoordinates;}catch(e){if(e.code!=='ENOENT')throw e;}}if(reference)text=await fs.readFile(await readablePath(project,roots,reference),'utf8');}
 return parsedPickerCoordinates(text);}
function parsedPickerCoordinates(text){const revision=createHash('sha256').update(text).digest('hex');if(!text)return {points:[],revision};const rows=parseStar(text).flatMap(b=>b.tables).find(t=>t.labels.includes('rlnCoordinateX'))?.rows||[];return {revision,points:rows.map(r=>({x:Number(r.rlnCoordinateX),y:Number(r.rlnCoordinateY),classNumber:Number(r.rlnClassNumber||0),psi:Number(r.rlnAnglePsi??-999),fom:Number(r.rlnAutopickFigureOfMerit||0),selectionType:Number(r.rlnParticleSelectionType??2)}))};}
export async function pickerImage(project,roots,mic,v){return withPickerMrc(project,roots,mic,converted=>pickerMrcImage(project,roots,converted,v));}
export async function pickerRawImage(project,roots,mic,width=16384,preserveNonfinite=true){return withPickerMrc(project,roots,mic,converted=>galleryImage(project,roots,converted.file,width,false,'Z',preserveNonfinite));}
async function withPickerMrc(project,roots,mic,read){
 if(!/\.tiff?$/i.test(mic.file))return read(mic);
 const input=await readablePath(project,roots,mic.file);
 if((await fs.stat(input)).size>512*1024*1024)throw Error('TIFF micrograph exceeds the converter limit of 512 MiB.');
 const parent=path.join(project,'.reliondeluxe');await fs.mkdir(parent,{recursive:true});
 await readablePath(project,[],parent);
 const dir=await fs.mkdtemp(path.join(parent,'picker-tiff-'));
 try{
  let output;
  try{output=gainTiffToMrc(await fs.readFile(input));}catch(e){throw Error('Cannot convert TIFF micrograph: '+e.message);}
  const pixel=Number(mic.pixel);
  if(pixel>0){output.writeFloatLE(output.readInt32LE(0)*pixel,40);output.writeFloatLE(output.readInt32LE(4)*pixel,44);output.writeFloatLE(pixel,48);}
  output.fill(0,224,304);output.write('RelionDeLuxe TIFF micrograph conversion; unscaled float32',224,'ascii');
  const file=path.join(dir,'micrograph.mrc');await fs.writeFile(file,output,{flag:'wx'});
  return await read({...mic,file});
 }finally{await fs.rm(dir,{recursive:true,force:true});}
}
async function pickerMrcImage(project,roots,mic,v){const input=await readablePath(project,roots,mic.file);
 if(v.do_topaz_denoise==='Yes'){
  const executable=await resolvePickerTopaz({cwd:project});
  const parent=path.join(project,'.reliondeluxe');await fs.mkdir(parent,{recursive:true});await readablePath(project,[],parent);
  const dir=await fs.mkdtemp(path.join(parent,'picker-denoise-'));
  try{
   await exec(executable,['denoise',input,'--output',dir,'--device','0','--patch-size','1024','--patch-padding','256','--normalize'],{cwd:project,maxBuffer:8*1024*1024});
   const output=path.join(dir,path.basename(input));
   if(!(await fs.stat(output).catch(()=>null))?.size)throw Error('The command returned without producing a nonempty denoised image.');
   return await galleryImage(project,roots,output,2048);
  }catch(e){throw Error('Topaz denoising failed using '+executable+': '+e.message+'\n'+(e.stderr||'')+'\nIf an SBGrid wrapper is failing, set RELIONDELUXE_TOPAZ to the working absolute relion_python_topaz path before starting the server.');}finally{await fs.rm(dir,{recursive:true,force:true});}
 }
 const low=Number(v.lowpass),high=Number(v.highpass);if(!(low>0||high>0))return galleryImage(project,roots,input,2048);
 const executable=await resolveExecutable('relion_image_handler',{cwd:project});if(!executable)throw Error('Cannot find an executable relion_image_handler in the PATH inherited by the RelionDeLuxe server. Requested filters: '+[low>0?'low-pass '+low+' Å':'',high>0?'high-pass '+high+' Å':''].filter(Boolean).join(', ')+'. Activate the RELION environment (or add its bin directory to PATH), verify command -v relion_image_handler in that same terminal, then restart npm start. Alternatively, disable both filters by setting Lowpass and Highpass to -1 in the picking job. The filters have not been silently skipped.');
 const dir=path.join(project,'.reliondeluxe');await fs.mkdir(dir,{recursive:true});const temp=path.join(dir,'picker-'+randomUUID()+'.mrc');
 try{const args=['--i',input,'--o',temp,'--angpix',String(mic.pixel)];if(low>0)args.push('--lowpass',String(low));if(high>0)args.push('--highpass',String(high));await exec(executable,args,{cwd:project,maxBuffer:1024*1024});return await galleryImage(project,roots,temp,2048);}finally{await fs.rm(temp,{force:true});}}

export async function logPickingProgress(project,roots,job,context,event){
 let picked=0,total=0;
 const mappingIndex=new Map();let mappingLoaded=false;
 try{
  const text=await fs.readFile(await readablePath(project,roots,path.join(job,context.mics[0]?.mapping||'manualpick.star')),'utf8');
  mappingLoaded=true;
  for(const row of parseStar(text).flatMap(b=>b.tables).flatMap(t=>t.rows))if(row.rlnMicrographCoordinates)mappingIndex.set(row.rlnMicrographName,row.rlnMicrographCoordinates);
 }catch(e){if(e.code!=='ENOENT')throw e;}
 const countMics=mappingLoaded?context.mics.filter(m=>mappingIndex.has(m.file)||m.coordinates):context.mics;
 let cursor=0;
 await Promise.all(Array.from({length:Math.min(16,countMics.length)},async()=>{
  while(cursor<countMics.length){const mic=countMics[cursor++],count=(await pickerCoordinates(project,roots,job,mic,mappingIndex)).points.length;if(count)picked++;total+=count;}
 }));
 const helical=context.values.do_startend==='Yes';
 const lines=['Browser manual picking — '+event,'Total number of selected micrographs: '+context.mics.length,'Micrographs with saved picks: '+picked];
 if(helical)lines.push('Total number of saved filament endpoints: '+total,'Total number of picked filaments: '+Math.floor(total/2));
 else lines.push('Total number of picked particles: '+total);
 const directory=await readablePath(project,[],job),log=path.join(directory,'run.out');
 try{await readablePath(project,[],log);}catch(e){if(e.code!=='ENOENT')throw e;}
 await fs.appendFile(log,lines.join('\n')+'\n');
}

export async function autopickManualSettings(project,roots,values,defaults){
 let settings={...defaults,micscale:'0.25',sigma_contrast:'3',lowpass:'20',diameter:'100'};
 try{const file=await readablePath(project,roots,'.gui_manualpickjob.star');const blocks=parseStar(await fs.readFile(file,'utf8'));for(const row of blocks.flatMap(b=>b.tables).flatMap(t=>t.rows))if(Object.hasOwn(settings,row.rlnJobOptionVariable))settings[row.rlnJobOptionVariable]=row.rlnJobOptionValue;}catch(e){if(e.code!=='ENOENT')throw e;}
 return {...settings,fn_in:values.fn_input_autopick,do_queue:'No',other_args:''};
}

// Reopen an existing Manual picking job without submitting it or rewriting settings.
export async function resumeManualPicker(project,roots,values,jobFile){
 if(!supportsPicker(values))throw Error('The saved Manual picking settings require the native picker (queue submission, custom arguments, colouring or FOM filtering). Close any native picker, mark this job finished, then Continue with browser-compatible settings.');
 const snapshot=await pickerSnapshot(project,roots,values);
 const revisionFile=await jobFile('browser-picking-input.txt');
 const previous=await fs.readFile(revisionFile,'utf8').catch(e=>{if(e.code==='ENOENT')return null;throw e;});
 if(previous!==null&&previous!==snapshot.revision)throw Error('Micrograph input changed; start a new picking job to avoid mismatching coordinates.');
 const marker=await jobFile('RELIONDELUXE_BROWSER_PICKING');
 if(previous===null)await fs.writeFile(revisionFile,snapshot.revision,{flag:'wx'});
 await fs.writeFile(marker,'',{flag:'a'});
}

export async function pickerCounts(project,roots,job,context){
 const mapping=new Map();try{const blocks=parseStar(await fs.readFile(await readablePath(project,roots,path.join(job,context.mics[0]?.mapping||'manualpick.star')),'utf8'));for(const r of blocks.flatMap(b=>b.tables).flatMap(t=>t.rows))if(r.rlnMicrographCoordinates)mapping.set(r.rlnMicrographName,r.rlnMicrographCoordinates);}catch(e){if(e.code!=='ENOENT')throw e;}
 const counts=Array(context.mics.length).fill(null);let cursor=0;
 await Promise.all(Array.from({length:4},async()=>{while(cursor<context.mics.length){const i=cursor++;try{counts[i]=(await pickerCoordinates(project,roots,job,context.mics[i],mapping)).points.length;}catch{counts[i]=null;}}}));return counts;
}

// Inspect native Auto-picking results without starting or continuing a picking job.
export async function autopickReadOnlySnapshot(project,roots,job,values){
 const mapping=await readablePath(project,roots,path.join(job,'autopick.star'));
 if((await fs.stat(mapping)).size>32*1024*1024)throw Error('Auto-picking STAR exceeds the browser picker limit.');
 const text=await fs.readFile(mapping,'utf8');
 const table=parseStar(text).flatMap(b=>b.tables).find(t=>t.labels.includes('rlnMicrographName')&&t.labels.includes('rlnMicrographCoordinates'));
 if(!table?.rows.length)throw Error('Auto-picking output has no micrograph coordinate mappings.');
 const diameter=Number(values.particle_diameter)>0?values.particle_diameter:'100';
 const snapshot=await pickerSnapshot(project,roots,{fn_in:values.fn_input_autopick,angpix:values.angpix,diameter,micscale:'0.25',sigma_contrast:'3',black_val:'0',white_val:'0',lowpass:'-1',highpass:'-1',do_topaz_denoise:'No',do_startend:'No'});
 const inputs=new Map(snapshot.mics.map(m=>[m.file,m]));
 snapshot.mics=table.rows.map((row,index)=>{
  const mic=inputs.get(row.rlnMicrographName);
  if(!mic)throw Error('Auto-picking output micrograph is missing from the input: '+row.rlnMicrographName);
  if(!row.rlnMicrographCoordinates)throw Error('Auto-picking output is missing a coordinate filename.');
  return {...mic,index,coordinates:row.rlnMicrographCoordinates,mapping:'autopick.star',readOnly:true};
 });
 return {...snapshot,writable:false,readOnly:true,powerScreening:false};
}
