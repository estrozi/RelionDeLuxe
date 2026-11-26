import {resolveResources} from './template-resources.js';
// Apply only workstation defaults and derived process/thread counts.
// All scientific parameters and per-job edits survive until the next global save.
export function workstationDefaults(layout,schema,values,global){
 const derived=resolveResources(layout,schema,values,global),result={};
 for(const f of schema.options){
  if(Object.hasOwn(global,f.key))result[f.key]=global[f.key];
  if(['nr_mpi','nr_threads'].includes(f.key))result[f.key]=derived[f.key];
 }
 if(layout.mode==='tomo')for(const k of ['do_queue','gpu_ids','gpu_id','use_gpu'])if(Object.hasOwn(derived,k))result[k]=derived[k];
 if(layout.name==='Auto-picking'&&values.do_log==='Yes')result.use_gpu='No';
 return result;
}
export function pickingGpu(layout,values,global,key=''){
 if(layout.name!=='Auto-picking')return;
 if(topazTrainingGpu(layout,values))return;
 if(values.do_log==='Yes')values.use_gpu='No';
 else if(key==='do_refs'&&values.do_refs==='Yes')values.use_gpu=global.use_gpu??'Yes';
}

export function polishingTrainingResources(layout,values,global={}){
 if(layout.name!=='Bayesian polishing'||values.do_param_optim!=='Yes')return false;
 const cpus=Number(global.globalNcpus??1);
 if(!Number.isInteger(cpus)||cpus<1)throw Error('Number of CPUs must be a positive integer.');
 values.nr_mpi='1';values.nr_threads=String(cpus);return true;
}

// RELION's Topaz trainer requires the GPU flag even with automatic device IDs.
export function topazTrainingGpu(layout,values){
 if(layout.name!=='Auto-picking'||values.do_topaz!=='Yes'||values.do_topaz_train!=='Yes')return false;
 values.use_gpu='Yes';return true;
}
