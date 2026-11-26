import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {parseStar} from './gallery.mjs';
import {starValue} from './settings.mjs';
import {readablePath} from './paths.mjs';

// Preserve numeric text exactly; quote only tokens that need STAR quoting.
const cell=value=>{const text=String(value);return text&&!/[\s'"#;]/.test(text)&&!/^(_|data_|loop_|stop_|save_|global_)/i.test(text)?text:starValue(text);};
const serialize=blocks=>blocks.filter(b=>b.name||b.tables.length||Object.keys(b.values).length).map(b=>'data_'+b.name+'\n'+Object.entries(b.values).map(([k,v])=>'_'+k+' '+cell(v)+'\n').join('')+b.tables.map(t=>'\nloop_\n'+t.labels.map((k,i)=>'_'+k+' #'+(i+1)).join('\n')+'\n'+t.rows.map(r=>t.labels.map(k=>cell(r[k])).join('\t')).join('\n')+'\n').join('')).join('\n');
function seriesFilenames(series){
 const seen=new Set();return series.map(s=>{
  const name=s.name;
  if(typeof name!=='string'||!name||name==='.'||name==='..'||/[\/\\\x00-\x1f]/.test(name))throw Error('Invalid tilt-series name for output filename: '+name);
  const file=name+'.star';if(seen.has(file))throw Error('Duplicate tilt-series output filename: '+file);seen.add(file);return file;
 });
}
export async function tiltManifest(project,roots,file){
 const hash=createHash('sha256');
 const read=async f=>{const text=await fs.readFile(await readablePath(project,roots,f),'utf8');hash.update(f+'\0'+text);return parseStar(text);};
 const blocks=await read(file),global=blocks.flatMap(b=>b.tables).find(t=>t.labels.includes('rlnTomoTiltSeriesStarFile')&&t.labels.includes('rlnTomoName'));
 if(!global?.rows.length)throw Error('No tilt-series table found. Choose a global tilt_series.star file.');
 const series=[];
 for(const [index,row]of global.rows.entries()){
  const data=await read(row.rlnTomoTiltSeriesStarFile),table=data.flatMap(b=>b.tables).find(t=>t.labels.includes('rlnMicrographName'));
  if(!table)throw Error('No rlnMicrographName column in '+row.rlnTomoTiltSeriesStarFile);
  const images=table.rows.map((r,id)=>({id,file:r.rlnMicrographName,angle:Number.isFinite(Number(r.rlnTomoNominalStageTiltAngle))?Number(r.rlnTomoNominalStageTiltAngle):null}));
  images.sort((a,b)=>(a.angle??0)-(b.angle??0)||a.id-b.id);
  series.push({index,name:row.rlnTomoName,images,data,table});
 }
 return {file,revision:hash.digest('hex'),blocks,global,series};
}
export async function exclusionView(manifest,jobFile,writable=false){
 let saved=null;
 if(jobFile)try{saved=JSON.parse(await fs.readFile(await jobFile('browser-exclusion.json'),'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
 if(saved&&saved.revision!==manifest.revision)throw Error('Tilt-series input changed since selection was saved. Create a new exclusion job.');
 return {file:manifest.file,revision:manifest.revision,version:saved?.version||'',writable,series:manifest.series.map(s=>({name:s.name,images:s.images,selected:saved?.selected[s.index]??s.images.map(i=>i.id)}))};
}
export async function saveExclusion(manifest,jobFile,job,body,finish=false){
 const view=await exclusionView(manifest,jobFile,true);
 if(body.revision!==view.revision||body.version!==view.version)throw Error('Inputs or saved selection changed. Reopen the helper before saving.');
 if(!Array.isArray(body.selected)||body.selected.length!==manifest.series.length)throw Error('Invalid tilt-series selection');
 const selected=body.selected.map((ids,i)=>{if(!Array.isArray(ids)||new Set(ids).size!==ids.length||ids.some(id=>!Number.isInteger(id)||id<0||id>=manifest.series[i].images.length))throw Error('Invalid tilt image selection');return ids;});
 const count=selected.reduce((n,a)=>n+a.length,0);if(finish&&!count)throw Error('Keep at least one tilt image before finishing.');
 const version=randomUUID();
 if(finish){
  const names=seriesFilenames(manifest.series),folder='tilt_series',dir=await jobFile(folder);
  // Stage all STAR files before publishing. The fixed native names are replaced
  // atomically per file, with the global index published last.
  const stage=await fs.mkdtemp(await jobFile('browser-exclusion-stage-'));
  try{
   const output=structuredClone(manifest.blocks),global=output.flatMap(b=>b.tables).find(t=>t.labels.includes('rlnTomoTiltSeriesStarFile'));
   global.labels=[...global.labels.filter(k=>k!=='rlnTomoTiltSeriesStarFile'),'rlnTomoTiltSeriesStarFile'];
   const files=[];
   for(const s of manifest.series){
    if(!selected[s.index].length)continue;
    const data=structuredClone(s.data),table=data.flatMap(b=>b.tables).find(t=>t.labels.includes('rlnMicrographName')),keep=new Set(selected[s.index]);
    table.rows=s.images.filter(i=>keep.has(i.id)).map(i=>table.rows[i.id]);
    const name=names[s.index];
    await fs.writeFile(path.join(stage,name),serialize(data),{flag:'wx'});files.push(name);
    global.rows[s.index].rlnTomoTiltSeriesStarFile=job+folder+'/'+name;
   }
   global.rows=global.rows.filter((_,i)=>selected[i].length);
   const index=path.join(stage,'selected_tilt_series.index');await fs.writeFile(index,serialize(output),{flag:'wx'});
   await fs.mkdir(dir).catch(e=>{if(e.code!=='EEXIST')throw e;});
   const stat=await fs.lstat(dir);if(stat.isSymbolicLink()||!stat.isDirectory())throw Error('Tilt-series output folder must be a real directory');
   // Validate all destinations before replacing any file.
   const destinations=await Promise.all(files.map(name=>jobFile(folder+'/'+name)));
   const globalFile=await jobFile('selected_tilt_series.star');
   for(let i=0;i<files.length;i++)await fs.rename(path.join(stage,files[i]),destinations[i]);
   await fs.rename(index,globalFile);
  }finally{await fs.rm(stage,{recursive:true,force:true});}

 }
 const temp=await jobFile('browser-exclusion.'+version+'.tmp');await fs.writeFile(temp,JSON.stringify({revision:manifest.revision,version,selected}),{flag:'wx'});await fs.rename(temp,await jobFile('browser-exclusion.json'));
 return {version,count,series:selected.filter(a=>a.length).length};
}
