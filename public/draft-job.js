import {unusedPickingInputs} from './auto-picking-controls.js';
// A display-only pipeline node. Never add this to the native pipeline state.
export const DRAFT_JOB='__reliondeluxe_draft__';
export function draftJob(snapshot,layout,catalog){
 if(!snapshot||snapshot.selected)return null;
 const definition=layout.find(l=>l.id===snapshot.type),schema=catalog.find(s=>s.id===snapshot.type);
 if(!definition||!schema)return null;
 const values=snapshot.values||{},inputs=[];const unused=unusedPickingInputs(definition,values);
 for(const field of schema.options){
  if(unused.includes(field.key))continue;
  if(definition.name==='Bayesian polishing'&&field.key==='opt_params'&&(values.do_polish!=='Yes'||values.do_own_params==='Yes'))continue;
  if(![2,3].includes(field.type)||/_exe$/.test(field.key)||['qsubscript','scratch_dir','cryocare_path','fn_resmap'].includes(field.key))continue;
  if(definition.fields?.[field.key]?.when?.some(rule=>values[rule.key]!==rule.value))continue;
  const value=values[field.key];
  if(typeof value==='string'&&value.trim()&&!inputs.includes(value.trim()))inputs.push(value.trim());
 }
 return {name:DRAFT_JOB,type:snapshot.type,status:'Draft',alias:'None',title:definition.name,inputs,outputs:[],provisional:true};
}
