import fs from 'node:fs/promises';
import {parseStar} from './gallery.mjs';
import {readablePath} from './paths.mjs';
const counts=new Map();
async function particleStats(project,roots,input,exact){
 const file=await readablePath(project,roots,input),stat=await fs.stat(file),key=JSON.stringify([file,stat.size,stat.mtimeMs,stat.ctimeMs,exact]);
 if(counts.has(key))return counts.get(key);
 if(stat.size>256*1024*1024)throw Error('Particle STAR exceeds the 256 MiB particle-count reader limit');
 const tables=parseStar(await fs.readFile(file,'utf8')).flatMap(b=>b.tables).filter(t=>t.labels.includes('rlnImageName'));
 if(!tables.length||exact&&tables.some(t=>!t.labels.includes('rlnClassNumber')))throw Error('Particle STAR lacks image names or class assignments');
 const byClass=new Map();let total=0;
 for(const t of tables)for(const row of t.rows){total++;if(exact){const c=Number(row.rlnClassNumber);if(!Number.isSafeInteger(c)||c<1)throw Error('Invalid particle class assignment');byClass.set(c,(byClass.get(c)||0)+1);}}
 const result={total,byClass};if(counts.size>=64)counts.delete(counts.keys().next().value);counts.set(key,result);return result;
}
export async function addClassParticleCounts(project,roots,manifest,input){
 const data=manifest.classDataFile;
 if(data){
  const {total,byClass}=await particleStats(project,roots,data,true);
  return {...manifest,particleCountExact:true,labels:[...manifest.labels.filter(x=>x!=='NumberOfParticles'),'NumberOfParticles'],rows:manifest.rows.map((row,i)=>({...row,NumberOfParticles:(byClass.get(Number(row.rlnClassNumber)||((row.index??i)+1))||0)+'/'+total+' particles'}))};
 }
 if(!input)throw Error('The class job has no input images STAR file');
 const {total}=await particleStats(project,roots,input,false);
 return {...manifest,particleCountExact:false,labels:[...manifest.labels.filter(x=>x!=='NumberOfParticles'),'NumberOfParticles'],rows:manifest.rows.map(row=>({...row,NumberOfParticles:Number.isFinite(Number(row.rlnClassDistribution))?'≈ '+Math.round(Number(row.rlnClassDistribution)*total)+'/'+total+' particles':'—'}))};
}
