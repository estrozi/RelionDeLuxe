import fs from 'node:fs/promises';
import path from 'node:path';
import {parseStar} from './gallery.mjs';
import {jobPath,readablePath} from './paths.mjs';
export const denoiseSplitReason='Denoising requires a completed, running or scheduled Motion correction job with “Save images for denoising?” set to Yes (do_even_odd_split). No such job is available in this project.';
export async function denoiseAvailability(project,roots,state,layout){
 for(const job of state.jobs){
  if(layout.find(l=>l.id===job.type)?.name!=='Motion correction'||!['Succeeded','Running','Scheduled'].includes(job.status))continue;
  try{
   const file=await readablePath(project,roots,path.join(jobPath(project,job.name),'job.star'));
   const rows=parseStar(await fs.readFile(file,'utf8')).flatMap(b=>b.tables).flatMap(t=>t.rows);
   if(rows.some(r=>r.rlnJobOptionVariable==='do_even_odd_split'&&r.rlnJobOptionValue==='Yes'))return '';
  }catch{}
 }
 return denoiseSplitReason;
}
