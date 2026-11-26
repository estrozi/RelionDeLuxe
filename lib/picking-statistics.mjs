import {recordPickingHistory} from './picking-history.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {setImmediate} from 'node:timers/promises';
import {galleryImage} from './gallery.mjs';
import {pickerRawImage,pickerCoordinates,coordinateText,coordinateName} from './browser-picker.mjs';
import {readablePath,jobPath} from './paths.mjs';
import {localPath} from './screening.mjs';
export function thresholds(input={}){
 const result={};
 for(const key of ['powerMin','powerMax','stdMin','stdMax']){
  const v=input[key];result[key]=v===''||v===undefined||v===null?null:Number(v);
  if(result[key]!==null&&(!Number.isFinite(result[key])||result[key]<0))throw Error('Thresholds must be non-negative numbers or empty.');
 }
 if(result.powerMin!==null&&result.powerMax!==null&&result.powerMin>result.powerMax||result.stdMin!==null&&result.stdMax!==null&&result.stdMin>result.stdMax)throw Error('Minimum threshold exceeds maximum.');
 return result;
}
export function rejected(row,t){return !row.valid||(t.powerMin!==null&&row.power<t.powerMin)||(t.powerMax!==null&&row.power>t.powerMax)||(t.stdMin!==null&&row.stddev<t.stdMin)||(t.stdMax!==null&&row.stddev>t.stdMax);}
export function diskStats(buffer,nx,ny,p,radius,powerOnly=false){
 // Reject incomplete circles rather than biasing statistics at the image edge.
 if(p.x-radius<0||p.y-radius<0||p.x+radius>nx-1||p.y+radius>ny-1)return {valid:false,reason:'Circle crosses image boundary'};
 let n=0,mean=0,m2=0,power=0;
 for(let y=Math.ceil(p.y-radius);y<=Math.floor(p.y+radius);y++){
  const dx=Math.sqrt(Math.max(0,radius*radius-(y-p.y)**2));
  for(let x=Math.ceil(p.x-dx);x<=Math.floor(p.x+dx);x++){
   const v=buffer.readFloatLE(8+4*(y*nx+x));
   if(!Number.isFinite(v))return {valid:false,reason:'Non-finite pixel'};
   n++;if(!powerOnly){const d=v-mean;mean+=d/n;m2+=d*(v-mean);}power+=v*v;
  }
 }
 return n?{valid:true,power:power/n,...(powerOnly?{}:{stddev:Math.sqrt(m2/n)}),pixels:n}:{valid:false,reason:'No pixels in circle'};
}
async function atomic(file,value){const temp=file+'.'+randomUUID()+'.tmp';try{await fs.writeFile(temp,JSON.stringify(value),{flag:'wx',mode:0o600});await fs.rename(temp,file);}finally{await fs.rm(temp,{force:true});}}
export async function particleStatistics(project,roots,job,context,index,diameter){
 jobPath(project,job);if(context.values.do_startend==='Yes')throw Error('Particle screening is available for ordinary picking only.');
 const mic=context.mics[index];diameter=Number(diameter);
 if(!Number.isInteger(index)||!mic||!Number.isFinite(diameter)||diameter<=0)throw Error('Invalid micrograph or particle diameter.');
 const coords=await pickerCoordinates(project,roots,job,mic),source=await readablePath(project,roots,mic.file),stat=await fs.stat(source);
 const signature=JSON.stringify([2,source,stat.size,stat.mtimeMs,coords.revision,diameter,mic.pixel]);
 const key=createHash('sha256').update(signature).digest('hex');
 const dir=await localPath(project,job+'particle-statistics',true),file=await localPath(project,job+'particle-statistics/'+index+'.json');
 try{const old=JSON.parse(await fs.readFile(file,'utf8'));if(old.key===key)return {...old,powerSummary:powerSummary(old.rows),cached:true};}catch(e){if(e.code!=='ENOENT')throw e;}
 const rows=[];
 if(coords.points.length){
  const image=await pickerRawImage(project,roots,mic);
  const radius=diameter/(2*mic.pixel);
  for(let i=0;i<coords.points.length;i++){if(i%32===0)await setImmediate();rows.push({index:i,x:coords.points[i].x,y:coords.points[i].y,...diskStats(image.output,image.nx,image.ny,coords.points[i],radius,true)});}
 }
 const after=await fs.stat(source),latest=await pickerCoordinates(project,roots,job,mic);
 if(after.size!==stat.size||after.mtimeMs!==stat.mtimeMs||latest.revision!==coords.revision)throw Error('Micrograph or coordinates changed during statistics; rescan.');
 const result={key,index,file:mic.file,diameter,revision:coords.revision,rows,powerSummary:powerSummary(rows)};await atomic(file,result);return result;
}
async function publish(project,adapter,job,index,mic,points){
 const name=coordinateName(mic.file,mic.mapping==='autopick.star');await localPath(project,path.posix.dirname(job+name),true);await localPath(project,job+name);await localPath(project,job+name+'.tmp');
 const temp=await localPath(project,job+'quality-'+randomUUID()+'.star');
 await fs.writeFile(temp,coordinateText(points),{flag:'wx'});
 try{await adapter.call(['browser-pick-save',job,String(index),temp]);}finally{await fs.rm(temp,{force:true});}
}
export async function filterParticles(project,roots,adapter,job,context,body){
 const stats=await particleStatistics(project,roots,job,context,body.index,body.diameter);
 if(stats.key!==body.key)throw Error('Statistics are stale; scan again before removing particles.');
 const summary=powerSummary(stats.rows,body.powerMultiplier??2);
 if(body.powerMode!==undefined&&!['low','high','both'].includes(body.powerMode))throw Error('Invalid power deletion mode');
 const upperMultiplier=body.upperPowerMultiplier===undefined?null:Number(body.upperPowerMultiplier);
 if(upperMultiplier!==null&&(!Number.isFinite(upperMultiplier)||upperMultiplier<0))throw Error('Upper power multiplier must be non-negative.');
 const upperCutoff=upperMultiplier===null?Infinity:summary.average+upperMultiplier*summary.stddev;
 const t=body.automaticPower?{automaticPower:true,mode:body.powerMode||'both',multiplier:body.powerMultiplier??2,upperMultiplier,upperCutoff:upperMultiplier===null?null:upperCutoff,...summary}:thresholds(body.thresholds),remove=new Set(stats.rows.filter(r=>body.automaticPower?(body.powerMode==='high'?(r.valid&&r.power>upperCutoff):body.powerMode==='low'?(!r.valid||!(r.power>summary.cutoff)):(!r.valid||!(r.power>summary.cutoff)||r.power>upperCutoff)):rejected(r,t)).map(r=>r.index));
 if(!remove.size)return {removed:0};
 const mic=context.mics[body.index],before=await pickerCoordinates(project,roots,job,mic);
 if(before.revision!==stats.revision)throw Error('Coordinates changed; rescan.');
 const remaining=before.points.filter((p,i)=>!remove.has(i)),id=randomUUID();
 await localPath(project,job+'particle-backups',true);
 const file=await localPath(project,job+'particle-backups/'+id+'.json');
 const record={version:1,id,batch:/^[a-f0-9-]{36}$/.test(body.batch||'')?body.batch:id,micrograph:mic.file,index:body.index,diameter:stats.diameter,pixelSize:mic.pixel,statisticsKey:stats.key,coordinateRevision:before.revision,algorithm:"mean-square-raw-pixels-in-disk-v2",before:before.points,remaining,thresholds:t,created:new Date().toISOString()};
 await atomic(file,record); // Durable undo snapshot exists before any coordinate mutation.
 await publish(project,adapter,job,body.index,mic,remaining);
 if(context.powerScreening)await recordPickingHistory(project,job,'power-filter',{batch:record.batch,micrograph:mic.file,diameter:stats.diameter,pixelSize:mic.pixel,algorithm:record.algorithm,thresholds:t,beforeCount:before.points.length,afterCount:remaining.length,removed:remove.size,backup:'particle-backups/'+id+'.json',statisticsKey:stats.key});
 return {removed:remove.size,backup:id};
}
export async function undoParticleFilter(project,roots,adapter,job,context,id){
 if(!/^[a-f0-9-]{36}$/.test(id||''))throw Error('Invalid backup identifier');
 const file=await localPath(project,job+'particle-backups/'+id+'.json'),record=JSON.parse(await fs.readFile(file,'utf8'));
 const index=context.mics.findIndex(m=>m.file===record.micrograph);if(index<0)throw Error('Backup micrograph is no longer in the input.');
 const current=await pickerCoordinates(project,roots,job,context.mics[index]);
 // Native STAR output rounds decimal coordinates; compare its canonical serialization.
 const same=(a,b)=>a.length===b.length&&a.every((p,i)=>['x','y','psi','fom','selectionType'].every(k=>Math.abs((p[k]??(k==='selectionType'?2:k==='psi'?-999:0))-(b[i][k]??(k==='selectionType'?2:k==='psi'?-999:0)))<1e-4));
 if(!same(current.points,record.remaining)&&!same(current.points,record.before))throw Error('Picks changed after filtering; refusing to overwrite later edits.');
 if(!same(current.points,record.before))await publish(project,adapter,job,index,context.mics[index],record.before);
 record.undone=true;await atomic(file,record);
 if(context.powerScreening)await recordPickingHistory(project,job,'undo-power-filter',{micrograph:record.micrograph,backup:'particle-backups/'+id+'.json',restored:record.before.length-record.remaining.length});
 return {restored:record.before.length-record.remaining.length};
}

export async function particleBackups(project,job){
 jobPath(project,job);const dir=await localPath(project,job+'particle-backups');
 const names=await fs.readdir(dir).catch(e=>{if(e.code==='ENOENT')return [];throw e;});
 const records=[];
 for(const name of names.filter(n=>/^[a-f0-9-]{36}\.json$/.test(n))){
  const r=JSON.parse(await fs.readFile(await localPath(project,job+'particle-backups/'+name),'utf8'));
  if(!r.undone)records.push(r);
 }
 records.sort((a,b)=>a.created.localeCompare(b.created));
 const batch=records.at(-1)?.batch;
 return {backups:records.filter(r=>r.batch===batch).map(r=>r.id)};
}

const micrographCache=new Map();
export async function micrographStatistics(project,roots,mic){
 const source=await readablePath(project,roots,mic.file),before=await fs.stat(source);
 const key=JSON.stringify([source,before.size,before.mtimeMs]);
 if(micrographCache.has(key))return micrographCache.get(key);
 const image=await pickerRawImage(project,roots,mic);
 let count=0,mean=0,m2=0,min=Infinity,max=-Infinity,invalid=0;
 for(let i=0;i<image.nx*image.ny;i++){
  if(i%262144===0)await setImmediate();
  const v=image.output.readFloatLE(8+4*i);if(!Number.isFinite(v)){invalid++;continue;}
  count++;const delta=v-mean;mean+=delta/count;m2+=delta*(v-mean);min=Math.min(min,v);max=Math.max(max,v);
 }
 const after=await fs.stat(source);if(before.size!==after.size||before.mtimeMs!==after.mtimeMs)throw Error('Micrograph changed during statistics; reload it.');
 const result={mean:count?mean:null,stddev:count?Math.sqrt(m2/count):null,min:count?min:null,max:count?max:null,count,invalid};
 if(micrographCache.size>=128)micrographCache.delete(micrographCache.keys().next().value);
 micrographCache.set(key,result);return result;
}

export function powerSummary(rows,multiplier=2){
 multiplier=Number(multiplier);if(!Number.isFinite(multiplier)||multiplier<0)throw Error('Power multiplier must be a non-negative number.');
 let count=0,average=0,m2=0;
 for(const r of rows)if(r.valid&&Number.isFinite(r.power)){count++;const delta=r.power-average;average+=delta/count;m2+=delta*(r.power-average);}
 const stddev=count?Math.sqrt(Math.max(0,m2/count)):0;
 return {count,average,stddev,cutoff:average-multiplier*stddev};
}
