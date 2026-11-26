import fs from 'node:fs/promises';
import path from 'node:path';
import {parseStar} from './gallery.mjs';
import {jobPath,readablePath} from './paths.mjs';
const marker='[RelionDeLuxe] Tilt-series alignment:';
export async function alignmentSummary(project,roots,job){
 const dir=await readablePath(project,roots,path.join(jobPath(project,job),'tilt_series'));
 const names=(await fs.readdir(dir)).filter(n=>/\.star$/i.test(n)).sort();
 let count=0,mean=0,m2=0,files=0,skipped=0;
 for(const name of names){
  let found=false;
  try{
   const file=await readablePath(project,roots,path.join(dir,name));
   for(const block of parseStar(await fs.readFile(file,'utf8')))for(const table of block.tables){
    if(!table.labels.includes('rlnTomoZRot'))continue;
    for(const row of table.rows){
     const raw=row.rlnTomoZRot;if(raw==null||!String(raw).trim())continue;
     const value=Number(raw);if(!Number.isFinite(value))continue;
     found=true;count++;const delta=value-mean;mean+=delta/count;m2+=delta*(value-mean);
    }
   }
  }catch{}
  if(found)files++;else skipped++;
 }
 if(!count)return `${marker} no finite _rlnTomoZRot values found in ${names.length} tomogram STAR files.`;
 return `${marker} _rlnTomoZRot mean = ${mean.toFixed(6)}°, stddev = ${Math.sqrt(Math.max(0,m2/count)).toFixed(6)}° (population; pooled ${count} tilt rows across ${files} tomograms${skipped?'; '+skipped+' files without readable finite values':''}).`;
}
export function alignmentSummaryEnricher(project,roots,layout){
 const cache=new Map();
 return async state=>{
  for(const job of state.jobs){
   if(job.status!=='Succeeded'||layout.find(l=>l.id===job.type)?.name!=='Align tilt-series'){cache.delete(job.name);continue;}
   try{
    const file=await readablePath(project,roots,path.join(jobPath(project,job.name),'run.out'));
    const stat=await fs.stat(file),stamp=`${stat.size}:${stat.mtimeMs}`;
    if(cache.get(job.name)===stamp)continue;
    const summary=await alignmentSummary(project,roots,job.name),text=await fs.readFile(file,'utf8');
    if(text.trimEnd().split('\n').at(-1)!==summary)await fs.appendFile(file,(text.endsWith('\n')?'':'\n')+summary+'\n');
    const after=await fs.stat(file);cache.set(job.name,`${after.size}:${after.mtimeMs}`);
   }catch{/* Output may not yet be visible on a shared filesystem; retry next poll. */}
  }
  return state;
 };
}
