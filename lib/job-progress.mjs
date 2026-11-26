import {createReadStream} from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import {jobPath,readablePath} from './paths.mjs';
import {parseStar} from './gallery.mjs';
export function jobProgress(type,text){
 const unknown={fraction:null,label:'Running — completion time unknown'};
 if(type==='Denoise tomograms'){
  const epochs=[...text.matchAll(/\bEpoch\s+(\d+)\s*\/\s*(\d+)\b/gi)].map(m=>({current:Number(m[1]),total:Number(m[2])})).filter(x=>x.total>0&&x.current>=0&&x.current<=x.total),epoch=epochs.at(-1);
  if(epoch)return {fraction:epoch.current/epoch.total,label:`Epoch ${epoch.current} of ${epoch.total} — training progress`};
  const bars=[...text.replace(/\x1b\[[0-9;]*[A-Za-z]/g,'').matchAll(/(\d+(?:\.\d+)?)%\s*\|[^\r\n|]*\|\s*(\d+)\s*\/\s*(\d+)/g)];
  const bar=bars.at(-1),current=Number(bar?.[2]),total=Number(bar?.[3]);
  return bar&&total>0&&current>=0&&current<=total?{fraction:current/total,label:`Denoising current tomogram: ${current} of ${total} (${Math.round(100*current/total)}%) — per-tomogram progress`}:unknown;
 }
 if(/dynamight flexibility/i.test(type||'')){
  const clean=text.replace(/\x1b\[[0-9;]*[A-Za-z]/g,'');
  const records=[...clean.matchAll(/Epoch\s+(\d+)\s+of\s+(\d+)\s+epochs([^\r\n]*)/gi)].map(m=>({index:m.index,current:Number(m[1]),total:Number(m[2]),epoch:true,suffix:m[3].trim()}));
  for(const m of clean.matchAll(/(\d+(?:\.\d+)?)%\s*\|[^\r\n|]*\|\s*(\d+)\s*\/\s*(\d+)/g))records.push({index:m.index,current:Number(m[2]),total:Number(m[3]),epoch:false});
  const r=records.filter(r=>r.total>0&&r.current>=0&&r.current<=r.total).sort((a,b)=>a.index-b.index).at(-1);
  if(!r)return unknown;
  return {fraction:r.current/r.total,label:r.epoch?
   `Epoch ${r.current} of ${r.total}${r.suffix?' '+r.suffix:''} — current phase progress`:
   `DynaMight: ${r.current} of ${r.total} (${Math.round(100*r.current/r.total)}%) — current phase progress`};
 }
 if(['2D classification','3D classification','3D initial reference'].includes(type)){
  const matches=[...text.matchAll(/(?:Expectation iteration|Gradient optimisation iteration)\s+(\d+)\s+of\s+(\d+)/g)],m=matches.at(-1);
  if(m&&Number(m[2])>0){const i=Number(m[1]),total=Number(m[2]);return {fraction:Math.min(1,Math.max(0,(i-1)/total)),label:`Iteration ${i} of ${total} — iteration-based progress, not elapsed-time estimate`};}
  return unknown;
 }
 if(type==='Bayesian polishing'){
  const stages=['Performing loop over micrographs','Combining frames for micrographs'];
  const stage=stages.map((marker,index)=>({index,position:text.lastIndexOf(marker)})).filter(s=>s.position>=0).sort((a,b)=>a.position-b.position).at(-1);
  if(stage){
   const segment=text.slice(stage.position);
   const bars=[...segment.matchAll(/(?:^|[\r\n])\s*[\d.]+\/\s*(?:[\d.]+|\?+)\s+(?:sec|min|hrs) (\.*)~~\(,_,">([^\r\n]*)/g)];
   const bar=bars.at(-1);
   const fraction=bar?(bar[2].includes('yum!')?1:Math.min(1,bar[1].length/60)):0;
   return {fraction:(stage.index+fraction)/2,label:`Polishing stage ${stage.index+1} of 2: ${Math.round(fraction*100)}% — ${stage.index?'combining frames':'micrograph processing'} (equally weighted stages)`};
  }

  const headers=[...text.matchAll(/it:\s+s_vel:\s+s_div:\s+s_acc:\s+fsc:/g)],header=headers.at(-1);if(!header)return unknown;
  const rows=[...text.slice(header.index+header[0].length).matchAll(/(?:^|[\r\n])\s*(\d+)\s*[:\t ]+\s*[-+\d.eE]+\s+[-+\d.eE]+\s+[-+\d.eE]+\s+[-+\d.eE]+/g)],row=rows.at(-1);if(!row)return unknown;
  const iteration=Number(row[1]);return {fraction:Math.min(1,iteration/100),label:`Training iteration ${iteration} of up to 100 — may converge earlier`};
 }
 if(['Extract subtomos','Reconstruct particle'].includes(type)){
  const header=[...text.matchAll(/(?:^|[\r\n])\s*\+?\s*Tomogram\s+(\d+)\s*\/\s*(\d+)\s*:/g)].at(-1);
  if(!header)return unknown;
  const current=Number(header[1]),total=Number(header[2]);
  if(total<1||current<1||current>total)return unknown;
  const segment=text.slice(header.index+header[0].length);
  const start=segment.lastIndexOf(type==='Reconstruct particle'?'Backprojecting:':'Extracting particles:');
  const bar=start<0?null:[...segment.slice(start).matchAll(/(?:^|[\r\n])\s*[\d.]+\/\s*(?:[\d.]+|\?+)\s+(?:sec|min|hrs) (\.*)~~\(,_,">([^\r\n]*)/g)].at(-1);
  const part=bar?(bar[2].includes('yum!')?1:Math.min(1,bar[1].length/60)):0;
  return {fraction:(current-1+part)/total,label:`Tomogram ${current} of ${total}: ${Math.round(part*100)}% — equally weighted tomograms${current===total&&part===1?' — finalizing job':''}`};
 }
 if(type==='ModelAngelo building'){
  const matches=[...text.replace(/\x1b\[[0-9;]*[A-Za-z]/g,'').matchAll(/(?:^|[\r\n])[^\r\n%]*?\b(100|[1-9]?\d)(?:\.\d+)?%\s*\|/g)];
  if(!matches.length)return unknown;let stage=0,previous=null;
  for(const m of matches){const percent=Number(m[1]);if(previous!==null&&percent<previous){if(previous<99)return unknown;stage++;}previous=percent;}
  if(stage>3)return unknown;
  return {fraction:(stage+previous/100)/4,label:`ModelAngelo stage ${stage+1} of 4: ${previous}% — equally weighted stages, not a time estimate`};
 }
 const marker=type==='Reconstruct tomograms'?'Reconstructing':type==='Align tilt-series'?'Aligning tilt series':type==='Motion correction'?'Correcting beam-induced motions using':type==='CTF estimation'?'Estimating CTF parameters using':type==='CTF refinement'?'Performing loop over all micrographs':type==='Local resolution'?'Calculating local resolution in':type==='Auto-picking'?'Autopicking':type==='Particle extraction'?'Extracting particles from the micrographs':null;
 if(!marker||!text.includes(marker))return unknown;
 const stage=text.slice(text.lastIndexOf(marker));
 // RELION time.cpp prints one dot per 1/60 of items processed. Its time ratio
 // is an estimate, not a count. Preserve carriage-return updates for parsing.
 const bars=[...stage.matchAll(/(?:^|[\r\n])\s*[\d.]+\/\s*(?:[\d.]+|\?+)\s+(?:sec|min|hrs) (\.*)~~\(,_,">([^\r\n]*)/g)];
 const b=bars.at(-1);if(!b)return unknown;
 const fraction=b[2].includes('yum!')?1:Math.min(1,b[1].length/60);
 return {fraction,label:`${Math.round(fraction*100)}% of processing stage${fraction===1?' — finalizing job':''}`};
}
export function jobProgressEnricher(project,layout){
 const cache=new Map();
 return async state=>{const running=new Set(state.jobs.filter(j=>j.status==='Running').map(j=>j.name));for(const name of cache.keys())if(!running.has(name))cache.delete(name);
 await Promise.all(state.jobs.filter(j=>j.status==='Running').map(async job=>{
  job.progress={fraction:null,label:'Running — completion time unknown'};
  if(/dynamight flexibility/i.test(layout.find(l=>l.id===job.type)?.name||'')){
   const logs=[];
   for(const name of ['run.out','run.err'])try{
    const file=await readablePath(project,[],path.join(jobPath(project,job.name),name)),stat=await fs.stat(file);
    logs.push({file,stat});
   }catch{}
   const stamp=logs.map(x=>`${x.file}:${x.stat.size}:${x.stat.mtimeMs}:${x.stat.ctimeMs}`).join('|');
   let entry=cache.get(job.name);
   if(entry?.stamp!==stamp){
    const candidates=[];
    for(const {file,stat} of logs)try{
     const h=await fs.open(file,'r');let text;
     try{const size=Math.min(stat.size,262144),b=Buffer.alloc(size);await h.read(b,0,size,stat.size-size);text=b.toString();}finally{await h.close();}
     const progress=jobProgress('DynaMight flexibility',text);
     if(progress.fraction!==null)candidates.push({progress,mtime:stat.mtimeMs});
    }catch{}
    entry={stamp,progress:candidates.sort((a,b)=>a.mtime-b.mtime).at(-1)?.progress||job.progress};cache.set(job.name,entry);
   }
   job.progress=entry.progress;return;
  }
  try{const file=await readablePath(project,[],path.join(jobPath(project,job.name),'run.out'));const stat=await fs.stat(file),stamp=`${stat.size}:${stat.mtimeMs}:${stat.ctimeMs}`;let entry=cache.get(job.name);
   if(entry?.stamp!==stamp){const h=await fs.open(file,'r');let text;try{const size=Math.min(stat.size,262144),tail=Buffer.alloc(size);await h.read(tail,0,size,stat.size-size);text=tail.toString();if(stat.size>size){const head=Buffer.alloc(Math.min(65536,stat.size-size));await h.read(head,0,head.length,0);text=head.toString()+'\n'+text;}}finally{await h.close();}if(['ModelAngelo building','Extract subtomos','Reconstruct particle'].includes(layout.find(l=>l.id===job.type)?.name)){const extraction=['Extract subtomos','Reconstruct particle'].includes(layout.find(l=>l.id===job.type)?.name);let pending='',records=[];const collect=line=>{if(extraction){if(/Tomogram\s+\d+\s*\/\s*\d+\s*:/.test(line))records=[line];else if(/(?:Extracting particles|Backprojecting):/.test(line))records.push(line);else if(/~~\(,_,">/.test(line)){if(records.length>2)records.pop();records.push(line);}}else if(/%\s*\|/.test(line))records.push(line);};for await(const chunk of createReadStream(file,{encoding:'utf8'})){const lines=(pending+chunk).split(/[\r\n]/);pending=lines.pop();for(const line of lines)collect(line);}collect(pending);text=records.join('\n');}entry={stamp,progress:jobProgress(layout.find(l=>l.id===job.type)?.name,text)};cache.set(job.name,entry);}job.progress=entry.progress;
  }catch{/* Missing/inaccessible logs retain indeterminate progress. */}
 }));return state;};
}
