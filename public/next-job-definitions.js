// Declarative conditions only: JSON never executes JavaScript.
export function nextCondition(rule,context,depth=0){
 if(rule===undefined)return true;
 if(!rule||typeof rule!=='object'||Array.isArray(rule)||depth>12)return false;
 if(rule.all)return Array.isArray(rule.all)&&rule.all.every(r=>nextCondition(r,context,depth+1));
 if(rule.any)return Array.isArray(rule.any)&&rule.any.some(r=>nextCondition(r,context,depth+1));
 if(rule.not)return !nextCondition(rule.not,context,depth+1);
 const parts=String(rule.field||'').split('.');
 if(parts.some(p=>['__proto__','constructor','prototype'].includes(p)))return false;
 let value=context;for(const part of parts)value=value?.[part];
 if(Object.hasOwn(rule,'atMost'))return typeof value==='number'&&Number.isFinite(value)&&value>0&&value<=rule.atMost;
 if(Object.hasOwn(rule,'equals'))return value===rule.equals;
 if(rule.in)return Array.isArray(rule.in)&&rule.in.includes(value);
 if(Object.hasOwn(rule,'contains'))return String(value??'').includes(rule.contains);
 if(Object.hasOwn(rule,'empty'))return (!String(value??'').trim())===rule.empty;
 return false;
}
export function nextContext(job,values,jobs=[]){
 return {job,values,context:{
  refinementMask:job.refinementMask??values.fn_mask??'',
  importMovies:job.importMovies??values.is_multiframe,
  topazTraining:!!job.topazTraining||(values.do_topaz==='Yes'&&values.do_topaz_train==='Yes'),
  subset3D:String(values.fn_model||'').includes('Class3D/'),
  nearNyquist:job.resolutionNyquist?.near===true,
  hasCompleted3DJob:jobs.some(j=>[9,10,18].includes(Number(j.type))&&j.status==='Succeeded')
 }};
}

// Definitions here have already passed the same conditions as the next-job buttons.
export function nextJobTypeIds(definitions,layout){
 const ids=new Set();
 for(const d of definitions){
  if(d.target!==undefined)ids.add(d.target);
  // Includes template/pipeline steps and continuation actions, which lack target.
  for(const name of d.iconNames||[]){const type=layout.find(l=>l.name===name);if(type)ids.add(type.id);}
 }
 return [...ids].filter(id=>layout.some(l=>l.id===id));
}
