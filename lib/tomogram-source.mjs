import fs from 'node:fs/promises';
import path from 'node:path';
import {readablePath} from './paths.mjs';
import {parseStar} from './gallery.mjs';
const volumes=['rlnTomoReconstructedTomogramDenoised','rlnTomoDenoisedTomogram','rlnTomoReconstructedTomogram','rlnTomoReconstructedTomogramHalf1','rlnTomoReconstructedTomogramHalf2'];
// Follow saved provenance, never pick an unrelated project-wide tomogram set.
export async function resolveTomogramSource(project,roots,particles,job,adapter){
 const queue=[{file:particles},...(job?[{job}]:[])],seen=new Set();
 const state=await adapter.call(['state']);
 for(let visited=0;queue.length&&visited<128;visited++){
  const item=queue.shift(),key=JSON.stringify(item);if(seen.has(key))continue;seen.add(key);
  if(item.job){
   const data=await adapter.call(['job',item.job]);
   const v=data.values||{};
   for(const k of ['in_tomoset','in_tomograms','in_optimisation','fn_data','fn_model','fn_img','in_particles'])
    if(v[k]&&/\.star$/i.test(v[k]))queue.push({file:v[k]});
   const saved=state.jobs.find(j=>j.name===item.job);
   for(const input of saved?.inputs||[])if(/\.star$/i.test(input))queue.push({file:input});
   continue;
  }
  let actual;
  try{actual=await readablePath(project,roots,item.file);}catch{continue;}
  if((await fs.stat(actual)).size>256*1024*1024)continue;
  const blocks=parseStar(await fs.readFile(actual,'utf8'));
  if(blocks.some(b=>b.tables.some(t=>t.labels.includes('rlnTomoName')&&volumes.some(c=>t.labels.includes(c)))))return item.file;
  for(const b of blocks)for(const row of [b.values,...b.tables.flatMap(t=>t.rows).slice(0,1)])
   for(const k of ['rlnTomoTomogramsFile','rlnTomoParticlesFile','rlnExperimentalDataStarFile'])
    if(row[k]&&/\.star$/i.test(row[k]))queue.push({file:row[k]});
  const relative=path.relative(project,actual).replaceAll(path.sep,'/');
  const owner=state.jobs.find(j=>[j.name,j.alias].some(p=>p&&p!=='None'&&(item.file.startsWith(p.endsWith('/')?p:p+'/')||relative.startsWith(p.endsWith('/')?p:p+'/'))));
  if(owner)queue.push({job:owner.name});
 }
 throw Error('Cannot locate the source tomograms for this particle subset from its saved inputs. The upstream tomogram set must contain reconstructed volume paths.');
}
