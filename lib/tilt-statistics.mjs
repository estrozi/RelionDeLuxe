import fs from 'node:fs/promises';
import {readablePath} from './paths.mjs';
import {parseStar} from './gallery.mjs';

// Cache parsed summaries, but stat every linked STAR so changing per-series
// outputs invalidate the summary even when the global index is unchanged.
export function tiltStatisticsReader(project,roots=[]){
 const cache=new Map();
 return async function read(file){
  const seen=new Set();
  async function visit(input){
   const resolved=await readablePath(project,roots,input);
   if(seen.has(resolved))return {count:0,min:Infinity,max:-Infinity};
   seen.add(resolved);
   const stat=await fs.stat(resolved),signature=[stat.size,stat.mtimeMs,stat.ctimeMs].join(':');
   let data=cache.get(resolved);
   if(data?.signature!==signature){
    data={signature,count:0,min:Infinity,max:-Infinity,links:[]};
    for(const block of parseStar(await fs.readFile(resolved,'utf8')))for(const table of block.tables){
     if(table.labels.includes('rlnMicrographName'))data.count+=table.rows.length;
     for(const row of table.rows){
      if(row.rlnTomoTiltSeriesStarFile)data.links.push(row.rlnTomoTiltSeriesStarFile);
      const value=Number(row.rlnDefocusU);
      if(row.rlnDefocusU?.trim()&&Number.isFinite(value)){data.min=Math.min(data.min,value);data.max=Math.max(data.max,value);}
     }
    }
    cache.set(resolved,data);
   }
   const result={count:data.count,min:data.min,max:data.max};
   for(const link of data.links){const child=await visit(link);result.count+=child.count;result.min=Math.min(result.min,child.min);result.max=Math.max(result.max,child.max);}
   return result;
  }
  return visit(file);
 };
}
