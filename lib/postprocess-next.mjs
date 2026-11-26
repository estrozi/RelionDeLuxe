import fs from 'node:fs/promises';
export async function postprocessNext(adapter,layout,jobName,templateFile){
 const state=await adapter.call(['state']),job=state.jobs.find(j=>j.name===jobName);
 const name=j=>layout.find(l=>l.id===j?.type)?.name;
 if(name(job)!=='Post-processing'||job.status!=='Succeeded')throw Error('Select a finished Post-processing job.');
 const post=(await adapter.call(['job',job.name])).values;
 const producer=file=>state.jobs.find(j=>(j.outputs||[]).includes(file)||[j.name,j.alias&&j.alias!=='None'?j.alias:null].filter(Boolean).some(p=>(file||'').startsWith(p)));
 const refine=producer(post.fn_in);
 if(name(refine)!=='3D auto-refine')throw Error('The post-processing half maps must come from a 3D auto-refine job.');
 const ref=(await adapter.call(['job',refine.name])).values;
 const t=JSON.parse(await fs.readFile(templateFile,'utf8'));
 t.name='High-resolution refinement after '+job.name;
 t.inputs={input1:(refine.outputs||[]).find(f=>/\/run_data\.star$/.test(f))||'',input2:(job.outputs||[]).find(f=>/\/postprocess\.star$/.test(f))||'',input3:(refine.outputs||[]).find(f=>/\/run_class001\.mrc$/.test(f))||post.fn_in||'',input4:post.fn_mask||'',input5:post.fn_mtf||'',input6:''};
 // Follow only the particle lineage, not unrelated reference/mask branches.
 let queue=[producer(ref.fn_img)],seen=new Set();
 while(queue.length&&!t.inputs.input6){
  const j=queue.shift();if(!j||seen.has(j.name))continue;seen.add(j.name);
  if(name(j)==='Motion correction'){t.inputs.input6=(j.outputs||[]).find(f=>/\/corrected_micrographs\.star$/.test(f))||'';break;}
  queue.push(...(j.inputs||[]).map(producer));
 }
 for(const step of t.steps){
  if(step.title==='3D auto-refine')for(const k of ['sym_name','particle_diameter'])if(ref[k]!==undefined)step.values[k]=ref[k];
  if(step.title==='Post-processing')for(const k of ['angpix','mtf_angpix'])if(post[k]!==undefined)step.values[k]=post[k];
 }
 return {template:t};
}
