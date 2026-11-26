import fs from 'node:fs/promises';
import path from 'node:path';
import {readablePath} from './paths.mjs';
import {parseStar} from './gallery.mjs';
const sources=new Set(['2D classification','3D initial reference','3D classification','3D auto-refine']);
export async function previousParticleDiameter(project,roots,state,layout){
 const types=new Set(layout.filter(l=>sources.has(l.name)).map(l=>l.id));
 const jobs=state.jobs.filter(j=>types.has(j.type)&&['Running','Succeeded','Failed','Aborted'].includes(j.status)).sort((a,b)=>Number(b.name.match(/job(\d+)/)?.[1]||0)-Number(a.name.match(/job(\d+)/)?.[1]||0));
 for(const job of jobs){
  try{
   const file=await readablePath(project,roots,path.join(job.name,'job.star'));
   const blocks=parseStar(await fs.readFile(file,'utf8'));
   const value=blocks.flatMap(b=>b.tables).flatMap(t=>t.rows).find(r=>r.rlnJobOptionVariable==='particle_diameter')?.rlnJobOptionValue?.trim();
   if(value&&Number.isFinite(Number(value))&&Number(value)>0)return {diameter:value,sourceJob:job.name};
  }catch{/* Unreadable or incomplete settings should not prevent drafting a job. */}
 }
 return null;
}
