export const isDyna=type=>type==='dynamight'||type==='relion.dynamight';
export const dynaCheckpoint=p=>/^forward_deformations\/checkpoints\/[A-Za-z0-9_.-]+\.pth$/.test(p||'');
export function unfoldDynaMight(t){const notes=[];for(const a of [...t.steps]){
 if(!isDyna(a.type)||a.continuation||!a.values)continue;
 if(a.dynamightPhase){if(a.dynamightPhase!=='forward'||['do_visualize','do_inverse','do_reconstruct'].some(k=>a.values[k]!=='No')||a.values.fn_checkpoint)throw Error(a.id+': invalid DynaMight forward phase');continue;}
 const cp=a.values.fn_checkpoint||'',self='${'+a.id+'}';
 if(cp&&!cp.startsWith(self))throw Error(a.id+': DynaMight expansion needs a self-checkpoint or an empty checkpoint; capture the original motion-estimation job with its inputs.');
 const checkpoint=cp?cp.slice(self.length):'forward_deformations/checkpoints/checkpoint_final.pth';
 if(!dynaCheckpoint(checkpoint))throw Error(a.id+': unsupported DynaMight forward checkpoint.');
 if(/--(?:checkpoint-file|output-directory)(?:\s|=|$)/.test(a.values.other_args||''))throw Error(a.id+': remove DynaMight checkpoint/output overrides before expansion.');
 const allocate=()=>{let n=1;while(t.steps.some(s=>s.id==='jobN+'+n))n++;return 'jobN+'+n;};
 const b=structuredClone(a);b.id=allocate();t.steps.push(b);const c=structuredClone(a);c.id=allocate();t.steps.push(c);
 for(const [step,phase]of [[a,'forward'],[b,'inverse'],[c,'reconstruct']]){step.dynamightPhase=phase;step.title='DynaMight · '+({forward:'Estimating motions',inverse:'Inverse deformations',reconstruct:'Deformed backprojection'}[phase]);Object.assign(step.values,{do_visualize:'No',do_inverse:phase==='inverse'?'Yes':'No',do_reconstruct:phase==='reconstruct'?'Yes':'No'});delete step.captureCheckpoint;}
 a.values.fn_checkpoint='';b.continuation={source:a.id,checkpoint,kind:'dynamight'};c.continuation={source:b.id,checkpoint,kind:'dynamight'};
 b.values.fn_checkpoint='${'+a.id+'}'+checkpoint;c.values.fn_checkpoint='${'+b.id+'}'+checkpoint;
 for(const step of t.steps){if([a,b,c].includes(step))continue;for(const [key,v]of Object.entries(step.values||{}))if(typeof v==='string')step.values[key]=v.split(self+'backprojection/').join('${'+c.id+'}backprojection/');}
 notes.push('Expanded '+a.id+' into motion estimation → inverse deformations → deformed backprojection. Visualization is omitted. Clones link prior-result directories; retain source jobs. Review phase-specific epochs, batch size and checkpoint.');
 }return notes;}
export function validateDynaContinuation(step,byId){const c=step.continuation,source=byId.get(c.source);if(c.kind!=='dynamight'||!source||source.type!==step.type||source.id===step.id||!dynaCheckpoint(c.checkpoint)||step.values.fn_checkpoint!=='${'+c.source+'}'+c.checkpoint||step.values.do_visualize!=='No')throw Error(step.id+': invalid DynaMight clone continuation.');if(step.dynamightPhase==='inverse'){if(source.dynamightPhase!=='forward'||step.values.do_inverse!=='Yes'||step.values.do_reconstruct!=='No')throw Error('Invalid DynaMight inverse phase');}else if(step.dynamightPhase==='reconstruct'){if(source.dynamightPhase!=='inverse'||step.values.do_inverse!=='No'||step.values.do_reconstruct!=='Yes')throw Error('Invalid DynaMight reconstruction phase');}else throw Error('Invalid DynaMight phase');}
