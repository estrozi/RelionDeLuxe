import fs from 'node:fs/promises';
import path from 'node:path';
import {matchingFiles} from './file-pattern.mjs';
import {readablePath} from './paths.mjs';
import {mrcHeaderInfo} from './import-frames.mjs';
// Read only headers, never pixel data. Check every match, not just the first file.
export async function verifyImportFormat(project,roots,layout,values){
 const spa=layout.name==='Import'&&values.do_raw==='Yes';
 const sta=layout.name==='Import tilt series'&&values.do_coords!=='Yes'&&values.images_are_motion_corrected==='Yes';
 if(!spa&&!sta)return;
 const field=spa?'fn_in_raw':'movie_files',pattern=values[field];if(!pattern)return;
 const files=await matchingFiles(project,roots,pattern);
 const rejected=[];
 for(const file of files){
  if(!/\.mrcs?$/i.test(file))continue;
  const real=await readablePath(project,roots,file),handle=await fs.open(real,'r');
  let info;
  try{const header=Buffer.alloc(1024),{bytesRead}=await handle.read(header,0,header.length,0);info=mrcHeaderInfo(header.subarray(0,bytesRead));}
  catch(e){throw Error(`Cannot verify Import MRC format for ${path.relative(project,file)} (${field}, ${spa?'Movies/Mics/Others':'General'} tab): ${e.message}`);}
  finally{await handle.close();}
  if(info.mode===12&&(sta||info.frames===1))rejected.push(path.relative(project,file));
 }
 if(rejected.length)throw Error(`Import blocked: ${rejected.length} micrograph file(s) use MRC mode 12 (float16), which CTFFIND cannot read. Convert these files to MRC mode 2 (float32) before importing, then select the converted files in ${field} (${spa?'Movies/Mics/Others':'General'} tab). Files: ${rejected.slice(0,10).join(', ')}${rejected.length>10?' …':''}`);
}
