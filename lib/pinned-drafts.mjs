import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {randomUUID} from 'node:crypto';
import {validateTemplate,inactiveCaptureInputs} from './ideal-pipeline.mjs';
import {connectionsFor,inputFamily} from '../public/job-ports.js';
import {within} from './paths.mjs';
const refs=value=>[...String(value).matchAll(/\$\{(pin\d+)\}/g)].map(m=>m[1]);
const replace=(value,map)=>value.replace(/\$\{([^}]+)\}/g,(whole,id)=>map[id]??whole);
export function positionPins(pins,counter,draft=false){
 const copy=structuredClone(pins).sort((a,b)=>a.number-b.number);
 const shift=copy.length?Math.max(0,counter+Number(draft)-copy[0].number):0;
 for(const p of copy)p.number+=shift;
 return copy;
}
export function requireBlock(pins,ids,counter,draft){
 if(draft)throw Error('Run or schedule the normal draft first, or select an existing job to discard it. It occupies the next job number.');
 if(!Array.isArray(ids)||!ids.length||new Set(ids).size!==ids.length)throw Error('Select a block of pinned drafts.');
 const selected=pins.filter(p=>ids.includes(p.id));
 if(selected.length!==ids.length)throw Error('A selected pinned draft no longer exists. Refresh and retry.');
 selected.forEach((p,i)=>{if(p.number!==counter+i)throw Error(`Close the gap before ${p.id} (J${p.number}): the selected block must start at J${counter} and be consecutive. Expected J${counter+i}. Use the − controls; numbers are not compacted automatically.`);});
 return selected;
}
export function pinnedLabel(pin,counter){return `N+${pin.number-counter+1} · J${pin.number} · ${pin.id} · ${pin.title||pin.type}`;}
export function pinnedMessage(message,block,counter){return String(message).replace(/\bjobN(?:\+(\d+))?\b/g,(token,index)=>{const pin=block[Number(index||0)];return pin?pinnedLabel(pin,counter):token;});}
export class PinnedDrafts{
 constructor(ideal){this.ideal=ideal;this.dir=path.join(ideal.project,'.reliondeluxe');this.file=path.join(this.dir,'pinned-drafts.json');this.plans=new Map();}
 async read(){try{const d=JSON.parse(await fs.readFile(this.file,'utf8'));if(d.version!==1||!Array.isArray(d.pins))throw Error('Invalid pinned draft store');return d;}catch(e){if(e.code==='ENOENT')return {version:1,revision:0,nextId:1,pins:[],committed:{}};throw e;}}
 async write(d){await fs.mkdir(this.dir,{recursive:true});if(!within(await fs.realpath(this.ideal.project),await fs.realpath(this.dir)))throw Error('Pinned draft storage must remain inside the project.');const temp=this.file+'.'+randomUUID();const h=await fs.open(temp,'wx');try{await h.writeFile(JSON.stringify({...d,revision:++d.revision},null,2)+'\n');await h.sync();}finally{await h.close();}await fs.rename(temp,this.file);}
 async state(counter){const d=await this.read();return {...d,pins:positionPins(d.pins,counter)};}
 async change(revision,draft,fn,allowPending=false){
  await fs.mkdir(this.dir,{recursive:true});if(!within(await fs.realpath(this.ideal.project),await fs.realpath(this.dir)))throw Error('Pinned draft storage must remain inside the project.');const lock=path.join(this.dir,'pinned-drafts.lock');let h;
  try{h=await fs.open(lock,'wx');}catch(e){if(e.code==='EEXIST'){const owner=JSON.parse(await fs.readFile(lock,'utf8').catch(()=>'{}'));if(owner.host===os.hostname()&&Number.isInteger(owner.pid)){let alive=true;try{process.kill(owner.pid,0);}catch(error){if(error.code==='ESRCH')alive=false;}if(!alive){await fs.unlink(lock);h=await fs.open(lock,'wx');}}}if(!h&&e.code==='EEXIST')throw Error('Pinned drafts are being edited by another server. If a server crashed, inspect its submission before removing .reliondeluxe/pinned-drafts.lock.');if(!h)throw e;}
  try{await h.writeFile(JSON.stringify({pid:process.pid,host:os.hostname()}));const d=await this.read();if(d.revision!==revision)throw Error('Pinned drafts changed. Refresh and retry.');if(d.pending&&!allowPending)throw Error('A pinned submission was interrupted at '+d.pending.target+'. Use Reconcile interrupted submission before editing or submitting again.');const state=await this.ideal.adapter.call(['state']);d.pins=positionPins(d.pins,state.counter,draft);const result=await fn(d,state);await this.write(d);return result||d;}finally{await h.close();await fs.unlink(lock);}
 }
 check(d){
  const mode=this.ideal.layout.some(l=>l.mode==='tomo')?'tomo':'spa';
  for(const pin of d.pins){const l=this.ideal.layout.find(l=>l.label===pin.type),s=this.ideal.catalog.find(s=>s.id===l?.id);if(!s)throw Error('Unknown pinned job type');const inactive=inactiveCaptureInputs(l,s,pin.values);for(const key of inactive)if(key in pin.values)pin.values[key]='';
   for(const [key,value]of Object.entries(pin.values)){
    if(typeof value!=='string'||value.length>16384||!s.options.some(f=>f.key===key))throw Error(pin.id+': invalid field '+key);
    if(inactive.has(key))continue;
    for(const token of [...value.matchAll(/\$\{([^}]+)\}/g)].map(m=>m[1])){
     if(!/^pin[1-9]\d*$/.test(token))throw Error(pin.id+': invalid reference '+token);const source=d.pins.find(p=>p.id===token);if(!source){if(Object.hasOwn(d.committed,token))continue;throw Error(pin.id+': unknown reference '+token);}
     if(source.number>=pin.number)throw Error(pin.id+': input '+key+' must refer to an earlier pinned draft. Drafts cannot cross or form cycles.');
     const f=s.options.find(f=>f.key===key),family=inputFamily(f,pin.values),sl=this.ideal.layout.find(l=>l.label===source.type),out=[...connectionsFor(sl.id,mode)[1],...([8,18].includes(sl.id)?['particles']:[])];
     if(family&&family!=='external'&&!out.includes('external')&&!out.includes(family))throw Error(pin.id+': '+key+' expects '+family+', incompatible with '+source.id+' ('+sl.name+').');
    }
   }
  }
 }
 async convert(template,revision,draft){return this.change(revision,draft,async(d,state)=>{const t=validateTemplate(template,this.ideal.layout,this.ideal.catalog);if(d.pins.length+t.steps.length>100)throw Error('At most 100 pinned drafts per project.');const map=Object.fromEntries(t.steps.map(s=>[s.id,'${pin'+d.nextId+++'}']));for(const [k,v]of Object.entries(t.inputs))map['input:'+k]=v;let n=Math.max(state.counter+Number(draft),...d.pins.map(p=>p.number+1));for(const step of t.steps){const p={...step,title:step.title||this.ideal.layout.find(l=>l.label===step.type).name,id:map[step.id].slice(2,-1),number:n++,values:Object.fromEntries(Object.entries(step.values).map(([k,v])=>[k,replace(v,map)]))};delete p.dependencies;if(p.continuation)p.continuation={...p.continuation,source:map[p.continuation.source].slice(2,-1)};d.pins.push(p);}this.check(d);});}
 async edit(id,values,revision,draft){return this.change(revision,draft,async d=>{const p=d.pins.find(p=>p.id===id);if(!p)throw Error('Pinned draft not found');p.values=values;this.check(d);});}
 async move(ids,delta,revision,draft){return this.change(revision,draft,async(d,state)=>{if(![1,-1].includes(delta)||!Array.isArray(ids)||!ids.length||ids.some(id=>!d.pins.some(p=>p.id===id)))throw Error('Invalid move');const old=d.pins.map(p=>p.id);for(const p of d.pins)if(ids.includes(p.id))p.number+=delta;if(d.pins.some(p=>!Number.isSafeInteger(p.number)||p.number<state.counter+Number(draft))||new Set(d.pins.map(p=>p.number)).size!==d.pins.length||d.pins.some((p,i)=>i&&p.number<=d.pins[i-1].number))throw Error('This move would cross another draft or the next available position. Select a block to move it together.');this.check(d);});}
 async remove(ids,revision,draft){return this.change(revision,draft,async d=>{if(!Array.isArray(ids)||!ids.length)throw Error('Select pinned drafts to delete');d.pins=d.pins.filter(p=>!ids.includes(p.id));this.check(d);});}
 async preview(ids,revision,draft){
  const d=await this.read(),state=await this.ideal.adapter.call(['state']);if(d.pending)throw Error('Reconcile the interrupted submission first.');if(d.revision!==revision)throw Error('Pinned drafts changed. Refresh and retry.');d.pins=positionPins(d.pins,state.counter,draft);this.check(d);const block=requireBlock(d.pins,ids,state.counter,draft),map={...d.committed,...Object.fromEntries(block.map((p,i)=>[p.id,'${'+(i?'jobN+'+i:'jobN')+'}']))};
  const steps=block.map((p,i)=>{const values=Object.fromEntries(Object.entries(p.values).map(([k,v])=>[k,replace(v,map)]));if(Object.values(values).some(v=>refs(v).length))throw Error(p.id+': depends on an unsubmitted pinned draft outside this block.');if(p.continuation&&!block.some(q=>q.id===p.continuation.source))throw Error('Submit a clone continuation together with its pinned source.');return {...p,id:i?'jobN+'+i:'jobN',values,...(p.continuation?{continuation:{...p.continuation,source:map[p.continuation.source].slice(2,-1)}}:{})};});
  let plan;try{plan=await this.ideal.preview({format:'RelionDeLuxe.ideal-pipeline',version:1,mode:this.ideal.layout.some(l=>l.mode==='tomo')?'tomo':'spa',name:'Pinned drafts',inputs:{},steps});}catch(e){throw Error(pinnedMessage(e.message,block,state.counter));}
  const describe=r=>pinnedMessage(r.step+': '+(r.file?r.file+' — ':'')+r.message,block,state.counter);
  if(plan.report.some(r=>r.severity==='error'))throw Error(plan.report.filter(r=>r.severity==='error').map(describe).join('\n'));
  // Missing external inputs and known incompatible STAR columns cannot be waived.
  const bad=plan.report.filter(r=>r.severity==='warning'&&/does not exist|does not match|missing:|Cannot inspect|not a regular|outside configured|Invalid STAR/i.test(r.message));if(bad.length)throw Error(bad.map(describe).join('\n'));
  plan.items.forEach((item,i)=>{item.displayId=pinnedLabel(block[i],state.counter);const target=block[i].directory+'/job'+String(block[i].number).padStart(3,'0')+'/';if(item.target!==target)throw Error('Dependency order changed; correct the pinned order before scheduling.');});
  for(const [id,p]of this.plans)if(p.expires<Date.now())this.plans.delete(id);if(this.plans.size>=50)this.plans.delete(this.plans.keys().next().value);this.plans.set(plan.id,{revision,ids:block.map(p=>p.id),expires:Date.now()+300000});return plan;
 }
 async execute(planId,revision,draft){const plan=this.plans.get(planId);this.plans.delete(planId);if(!plan||plan.expires<Date.now()||plan.revision!==revision)throw Error('Pinned preview expired. Preview again.');return this.change(revision,draft,async(d,state)=>{const block=requireBlock(d.pins,plan.ids,state.counter,draft);let i=0;try{return await this.ideal.execute(planId,{before:async item=>{d.pending={id:plan.ids[i],target:item.target,type:item.type,values:item.values};await this.write(d);},created:async name=>{const id=plan.ids[i++];d.committed[id]=name;d.pins=d.pins.filter(p=>p.id!==id);d.pending=null;await this.write(d);}});}catch(e){throw Error(pinnedMessage(e.message,block,state.counter));}});}
 async reconcile(revision){return this.change(revision,false,async d=>{if(!d.pending)return d;const p=d.pending,state=await this.ideal.adapter.call(['state']),job=state.jobs.find(j=>j.name===p.target);if(job){const data=await this.ideal.adapter.call(['job',p.target]);if(data.type!==p.type||Object.entries(p.values).some(([k,v])=>data.values[k]!==v))throw Error('Cannot safely reconcile '+p.target+': native parameters differ. Inspect the native job and pinned-drafts.json before proceeding.');d.committed[p.id]=p.target;d.pins=d.pins.filter(x=>x.id!==p.id);}else if(state.counter>Number(p.target.match(/job(\d+)/)[1]))throw Error('Native numbering advanced but the expected job is missing. Inspect the interrupted submission before continuing.');d.pending=null;return d;},true);}
}
