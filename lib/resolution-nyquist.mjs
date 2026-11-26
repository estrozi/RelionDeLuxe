import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createInterface} from 'node:readline';
import {parseStar} from './gallery.mjs';
import {readablePath} from './paths.mjs';
import {nearestExtractions} from './mask-default.mjs';

export function nyquistInfo(resolution,pixels){
 const valid=pixels.filter(p=>Number.isFinite(p)&&p>0);
 if(!valid.length||valid.length!==pixels.length||!Number.isFinite(resolution)||resolution<=0||resolution===999)return null;
 const limits=valid.map(p=>2*p),near=limits.some(n=>resolution<=n*1.1);
 const format=n=>Number(n.toFixed(4));
 return {near,limit:Math.max(...limits),title:`Nyquist limit: ${[...new Set(limits.map(format))].join(', ')} Å (2 × extracted particle pixel size). Red indicates resolution within 10% of, or beyond, this limit.`};
}
export function resolutionNyquistEnricher(project,layout){
 const cache=new Map();
 async function pixels(file,seen=new Set()){
  const real=await readablePath(project,[],file);
  if(seen.has(real)||seen.size>=8)throw Error('Cyclic or excessive particle metadata links');seen.add(real);
  const stat=await fs.stat(real),stamp=`${stat.size}:${stat.mtimeMs}:${stat.ctimeMs}`;
  let entry=cache.get(real);
  if(entry?.stamp!==stamp){
   const stream=createReadStream(real),lines=createInterface({input:stream,crlfDelay:Infinity});let text='';
   try{for await(const line of lines){
    // Particle tables can contain millions of rows; only optics and small
    // optimisation-set headers are needed for the sampling metadata.
    if(/^\s*data_particles\s*$/i.test(line))break;
    text+=line+'\n';if(text.length>1024*1024)throw Error('Sampling metadata too large');
   }}finally{lines.close();stream.destroy();}
   const blocks=parseStar(text),optics=blocks.filter(b=>b.name==='optics');
   const rows=optics.flatMap(b=>b.tables).flatMap(t=>t.rows);
   const sizes=rows.map(r=>Number(r.rlnImagePixelSize));
   const metadata=blocks.flatMap(b=>[b.values,...b.tables.flatMap(t=>t.rows)]);
   const linked=metadata.find(r=>r.rlnTomoParticlesFile)?.rlnTomoParticlesFile;
   entry={stamp,pixels:sizes,linked};cache.set(real,entry);
  }
  // Follow on every call so changed particle optics invalidate independently
  // of an unchanged optimisation-set file. RELION paths are project-relative.
  return entry.linked?pixels(entry.linked,seen):entry.pixels;
 }
 return async state=>{
  const extract=layout.find(l=>['Particle extraction','Extract subtomos'].includes(l.name))?.id;
  for(const job of state.jobs){
   delete job.resolutionNyquist;
   if(!job.resolutionAngstrom)continue;
   const source=state.jobs.find(j=>j.name===job.resolutionSourceJob)||job;
   // Read the actual refinement input first: its optics include extraction
   // rescaling and survive selection/classification links missing from the graph.
   if(source.resolutionParticleInput){
    try{
     const sizes=await pixels(source.resolutionParticleInput);
     const info=nyquistInfo(job.resolutionAngstrom,sizes);
     if(info){job.resolutionNyquist=info;continue;}
    }catch{/* Fall back to the registered extraction lineage. */}
   }
   const sources=new Map();
   for(const input of source.inputs||[])for(const e of nearestExtractions({...state,nodes:state.nodes||[]},input,extract))sources.set(e.name,e);
   if(!sources.size)continue;
   try{
    const sizes=[];
    for(const e of sources.values()){
     const file=e.outputs.find(f=>/(^|\/)particles\.star$/.test(f));
     if(!file)throw Error('No particle optics');
     const p=await pixels(file);if(!p.length)throw Error('No pixel size');sizes.push(...p);
    }
    job.resolutionNyquist=nyquistInfo(job.resolutionAngstrom,sizes);
   }catch{/* Missing/cleaned optics: do not guess the sampling. */}
  }
  return state;
 };
}
