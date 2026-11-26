export function sortInputCandidates(entries,mode='number',jobs=[],layout=[]){
 const describe=item=>{
  const job=jobs.find(j=>j.name===item.job)||jobs.find(j=>[j.name,j.alias&&j.alias!=='None'?j.alias:null].filter(Boolean).some(prefix=>(item.path||'').startsWith(prefix.endsWith('/')?prefix:prefix+'/')));
  const name=job?.name||item.job||item.path||'';
  const match=name.match(/(?:^|\/)job(\d+)(?:\/|$)/);
  const type=layout.find(l=>l.id===job?.type)?.name||name.match(/(?:^|\/)([^/]+)\/job\d+(?:\/|$)/)?.[1]||'';
  return {item,number:match?Number(match[1]):-1,type};
 };
 return entries.map(describe).sort((a,b)=>{
  if(!!a.item.directory!==!!b.item.directory)return a.item.directory?-1:1;
  if((a.number<0)!==(b.number<0))return a.number<0?1:-1;
  if(mode==='type'){const group=a.type.localeCompare(b.type,undefined,{numeric:true});if(group)return group;}
  return b.number-a.number||(a.item.path||a.item.name||'').localeCompare(b.item.path||b.item.name||'',undefined,{numeric:true});
 }).map(x=>x.item);
}

export function candidateJobType(item,jobs=[],layout=[]){
 const job=jobs.find(j=>j.name===item.job)||jobs.find(j=>[j.name,j.alias&&j.alias!=='None'?j.alias:null].filter(Boolean).some(prefix=>(item.path||'').startsWith(prefix.endsWith('/')?prefix:prefix+'/')));
 const definition=layout.find(l=>l.id===job?.type);
 const fallback=(item.job||item.path||'').match(/(?:^|\/)([^/]+)\/job\d+(?:\/|$)/)?.[1]||'';
 const name=definition?.name||fallback;
 if(!name)return null;
 const index=definition?layout.indexOf(definition):-1;
 let hash=0;for(const c of name)hash=(hash*31+c.charCodeAt(0))>>>0;
 return {name,hue:index>=0?Math.round(index*137.508)%360:hash%360};
}

// This is the source job's reported resolution, not a measurement of this file.
export function referenceResolution(file,jobs=[],project=''){
 if(typeof file!=='string'||!file.trim())return null;
 let value=file.trim().replace(/^\.\//,'');
 if(project&&value.startsWith(project.replace(/\/$/,'')+'/'))value=value.slice(project.replace(/\/$/,'').length+1);
 const job=jobs.find(j=>(j.outputs||[]).includes(value))||jobs.find(j=>[j.name,j.alias&&j.alias!=='None'?j.alias:null].filter(Boolean).some(prefix=>value.startsWith(prefix.endsWith('/')?prefix:prefix+'/')));
 return job?.resolutionInfo?{value:job.resolutionAngstrom??parseFloat(job.resolutionInfo),text:job.resolutionInfo,nearNyquist:!!job.resolutionNyquist?.near,title:`Reported resolution of ${job.resolutionSourceJob||job.name}${job.resolutionSourceJob?' (inherited by '+job.name+')':''} (source job; not a separate measurement of this map)`+(job.resolutionNyquist?' — '+job.resolutionNyquist.title:'')}:null;
}

export function referenceSamplingDefault(resolution,diameter,choices=[],iniHigh=null){
 const r=Number(resolution),d=Number(diameter);
 if(!Number.isFinite(r)||r<=0||r===999||!Number.isFinite(d)||d<=0)return null;
 const high=Number(iniHigh),effective=Number.isFinite(high)&&high>0?Math.max(r,high):r;
 const limit=360/(Math.PI*d/effective);
 const option=choices.map(value=>({value,angle:parseFloat(value)})).filter(o=>Number.isFinite(o.angle)&&o.angle>0&&o.angle<=7.5&&o.angle<=limit).sort((a,b)=>b.angle-a.angle)[0];
 return option?{value:option.value,limit}:null;
}

// Display counts contain a denominator and units, not a plain numeric string.
export function compareGalleryRows(a,b,key,descending=false){
 const count=value=>{const match=String(value??'').match(/^\s*(?:≈\s*)?(\d+)\s*\//);return match?Number(match[1]):null;};
 if(key==='NumberOfParticles'){
  const x=count(a[key]),y=count(b[key]);
  if(x===null||y===null)return x===y?0:x===null?1:-1;
  return (descending?-1:1)*(x-y);
 }
 const x=a[key]??'',y=b[key]??'';
 const result=x!==''&&y!==''&&Number.isFinite(Number(x))&&Number.isFinite(Number(y))?Number(x)-Number(y):String(x).localeCompare(String(y));
 return descending?-result:result;
}

// A filename alone is not evidence that a map was produced by this project.
export function referenceGreyscaleDefault(file,jobs=[],layout=[],project=''){
 const normalize=path=>{
  let value=String(path||'').trim().replace(/\\/g,'/');
  const root=String(project||'').replace(/\/$/,'');
  if(root&&value.startsWith(root+'/'))value=value.slice(root.length+1);
  if(value.startsWith('/'))return null;
  const parts=[];
  for(const part of value.split('/')){
   if(part==='..'){if(!parts.length)return null;parts.pop();}
   else if(part&&part!=='.')parts.push(part);
  }
  return parts.join('/');
 };
 const path=normalize(file);
 if(!path||! /\.(mrc|map)$/i.test(path))return 'No';
 const job=jobs.find(j=>(j.outputs||[]).some(output=>normalize(output)===path))||
  jobs.find(j=>[j.name,j.alias&&j.alias!=='None'?j.alias:null].filter(Boolean).some(prefix=>{
   const name=normalize(prefix);return name&&path.startsWith(name+'/');
  }));
 const definition=layout.find(l=>l.id===job?.type);
 return definition&&!definition.custom&&!/^(Import|External)(?:\b|$)/i.test(definition.name)?'Yes':'No';
}
