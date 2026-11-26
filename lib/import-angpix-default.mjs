import fs from 'node:fs/promises';
import path from 'node:path';
import {readablePath} from './paths.mjs';
import {parseStar} from './gallery.mjs';

export async function importAngpixDefault(project,roots,state,type){
 return previousPositiveOption(project,roots,state,type,'angpix',values=>values.do_raw!=='No');
}
export async function motionDoseDefault(project,roots,state,type){
 return previousPositiveOption(project,roots,state,type,'dose_per_frame');
}
async function previousPositiveOption(project,roots,state,type,key,accept=()=>true){
 const jobs=(state.jobs||[]).filter(j=>j.type===type&&j.status==='Succeeded')
  .sort((a,b)=>Number(b.name.match(/job(\d+)/)?.[1]||0)-Number(a.name.match(/job(\d+)/)?.[1]||0));
 for(const job of jobs)try{
  const blocks=parseStar(await fs.readFile(await readablePath(project,roots,path.join(job.name,'job.star')),'utf8'));
  const values=Object.fromEntries(blocks.flatMap(b=>b.tables).flatMap(t=>t.rows).filter(r=>r.rlnJobOptionVariable).map(r=>[r.rlnJobOptionVariable,r.rlnJobOptionValue]));
  if(!accept(values))continue;
  const value=values[key]?.trim();
  if(value&&Number.isFinite(Number(value))&&Number(value)>0)return value;
 }catch{/* An unreadable previous job must not supply an assumed value. */}
 return null;
}
