import fs from 'node:fs/promises';
import path from 'node:path';
import {validateTemplate} from './ideal-pipeline.mjs';
export const nextJobDirectories={0:'Import',1:'MotionCorr',2:'CtfFind',3:'ManualPick',4:'AutoPick',5:'Extract',7:'Select',8:'Class2D',9:'Class3D',10:'Refine3D',12:'MaskCreate',13:'JoinStar',14:'Subtract',15:'PostProcess',16:'LocalRes',18:'InitialModel',19:'MultiBody',20:'Polish',21:'CtfRefine',22:'DynaMight',23:'ModelAngelo',99:'External',1001:'InitialModelHelical',1002:'External',1003:'External',50:'Import',51:'Extract',52:'CtfRefine',53:'Polish',54:'Reconstruct',55:'AlignTiltSeries',56:'Tomograms',57:'ExcludeTiltImages',58:'Denoise',59:'Picks'};
export async function nextJobRoot(installation,project,{seed=false}={}){
 const root=path.join(project,'next-job');
 if(seed){
  try{await fs.access(root);}catch(e){
   if(e.code!=='ENOENT')throw e;
   await fs.cp(path.join(installation,'next-job'),root,{recursive:true,force:false,errorOnExist:false});
  }
 }
 return await fs.stat(root).then(s=>s.isDirectory()?root:path.join(installation,'next-job'),()=>path.join(installation,'next-job'));
}
function checkCondition(rule,depth=0){
 if(rule===undefined)return;
 if(!rule||typeof rule!=='object'||Array.isArray(rule)||depth>12)throw Error('Invalid next-job condition');
 for(const key of ['all','any'])if(Object.hasOwn(rule,key)){
  if(!Array.isArray(rule[key])||rule[key].length>100)throw Error('Invalid next-job condition');
  rule[key].forEach(r=>checkCondition(r,depth+1));return;
 }
 if(Object.hasOwn(rule,'not')){checkCondition(rule.not,depth+1);return;}
 if(!/^(job|values|context)\.[A-Za-z][A-Za-z0-9_]*$/.test(rule.field||'')||!['equals','in','contains','empty','atMost'].some(k=>Object.hasOwn(rule,k)))throw Error('Invalid next-job condition');
 if(Object.hasOwn(rule,'atMost')&&(!Number.isFinite(rule.atMost)||rule.atMost<=0))throw Error('Condition atMost must be a positive finite number');
 if(Object.hasOwn(rule,'in')&&!Array.isArray(rule.in))throw Error('Condition in must be an array');
 if(Object.hasOwn(rule,'empty')&&typeof rule.empty!=='boolean')throw Error('Condition empty must be a boolean');
}
export async function readNextDefinition(root,mode,type,file,layout,catalog){
 if(!/^[A-Za-z0-9_.-]+\.json$/i.test(file)||file.startsWith('.'))throw Error('Invalid next-job filename');
 const folder=nextJobDirectories[type];if(!folder)throw Error('Unknown source job type');
 const dir=path.join(root,mode==='tomo'?'STA':'SPA',folder),actual=await fs.realpath(path.join(dir,file));
 const canonical=await fs.realpath(root);if(!actual.startsWith(canonical+path.sep))throw Error('Next-job file escapes its folder tree');
 if((await fs.stat(actual)).size>2*1024*1024)throw Error('Next-job JSON exceeds 2 MiB');
 const data=JSON.parse(await fs.readFile(actual,'utf8')),source=layout.find(l=>l.id===type);
 if(data.format==='RelionDeLuxe.ideal-pipeline'){
  const template=validateTemplate(data,layout,catalog),meta=data.nextJob||{};checkCondition(meta.when);if(meta.binding&&meta.binding!=='postprocess')throw Error('Unknown input binding');
  return {file,source:meta.source||source?.label,label:meta.label||data.name,when:meta.when,action:template.steps.length===1&&!template.steps[0].continuation?'template-draft':'pipeline',binding:meta.binding,template,optionalInputs:meta.optionalInputs||[]};
 }
 if(data.format!=='RelionDeLuxe.next-job'||data.version!==1)throw Error('Expected next-job version 1 or an idealized pipeline');
 checkCondition(data.when);const action=data.action||'draft';
 if(!['draft','continue-manual','continue-with-mask'].includes(action))throw Error('Unsupported next-job action');
 const target=layout.find(l=>l.label===data.target||l.name===data.target);
 if(action==='draft'&&!target)throw Error('Unknown target job type: '+data.target);
 const values=data.values||{};
 if(typeof values!=='object'||Array.isArray(values)||Object.entries(values).some(([k,v])=>typeof v!=='string'||(target&&!catalog.find(s=>s.id===target.id)?.options.some(f=>f.key===k))))throw Error('Invalid next-job parameter values');
 return {file,source:data.source||source?.label,label:data.label||(target?'Add next job: '+target.name:action),action,target:target?.id,values,when:data.when};
}
export async function loadNextDefinitions(root,mode,layout,catalog){
 const definitions={},errors=[];
 for(const l of layout){
  const folder=nextJobDirectories[l.id];if(!folder)continue;
  const dir=path.join(root,mode==='tomo'?'STA':'SPA',folder);
  const files=await fs.readdir(dir).catch(e=>{if(e.code==='ENOENT')return [];throw e;});
  definitions[l.id]=[];
  for(const file of files.filter(f=>f.endsWith('.json')).sort())try{
   const d=await readNextDefinition(root,mode,l.id,file,layout,catalog);
   if(d.source!==l.label)continue;
   const {template,...summary}=d;
   const names=template?template.steps.map(step=>layout.find(item=>item.label===step.type)?.name||step.title||'External'):
    [d.action==='continue-with-mask'?'3D auto-refine':d.action==='continue-manual'?'Auto-picking':layout.find(item=>item.id===d.target)?.name||'External'];
   summary.iconNames=[...new Set(names)];
   definitions[l.id].push(summary);
  }catch(e){errors.push(folder+'/'+file+': '+e.message);}
 }
 return {definitions,errors,root};
}
