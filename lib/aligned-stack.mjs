import fs from 'node:fs/promises';
import {parseStar} from './gallery.mjs';
import {readablePath,jobPath} from './paths.mjs';
export async function alignedStackManifest(project,roots,job,values){
 jobPath(project,job);
 const file=job+'aligned_tilt_series.star';
 const blocks=parseStar(await fs.readFile(await readablePath(project,roots,file),'utf8'));
 const table=blocks.flatMap(b=>b.tables).find(t=>t.labels.includes('rlnTomoName')&&t.labels.includes('rlnTomoTiltSeriesStarFile'));
 if(!table?.rows.length)throw Error('No tilt series in aligned_tilt_series.star');
 const suffix=values.do_aretomo2==='Yes'?'_aligned.mrc':'_preali.mrc';
 const rows=[];
 for(const row of table.rows){
  const name=row.rlnTomoName;
  if(!name||name==='.'||name==='..'||/[\/\\\x00-\x1f]/.test(name))throw Error('Invalid tilt-series name');
  const stack=job+'external/'+name+'/'+name+suffix;
  rows.push({rlnTomoName:name,rlnDeluxeAlignedStack:stack});
 }
 return {file,rows,imageColumns:['rlnDeluxeAlignedStack'],alignedStack:true};
}
