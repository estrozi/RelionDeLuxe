import path from 'node:path';
// Follow the chosen tilt-series branch, not an unrelated latest motion job.
export async function motionOutputDefaults(project,adapter,state,input,motionType){
 if(typeof input!=='string'||!input.trim())return {};
 const canonical=value=>{let file=path.posix.normalize(path.isAbsolute(value)?path.relative(project,value):value);const alias=state.jobs.filter(j=>j.alias&&j.alias!=='None').sort((a,b)=>b.alias.length-a.alias.length).find(j=>file.startsWith(j.alias));return alias?alias.name+file.slice(alias.alias.length):file;};
 const producer=file=>{const f=canonical(file);return state.jobs.find(j=>(j.outputs||[]).some(o=>canonical(o)===f))||state.jobs.find(j=>f.startsWith(j.name));};
 let queue=[producer(input)].filter(Boolean);const visited=new Set();
 while(queue.length){const level=queue;queue=[];const motion=[];
  for(const job of level){if(visited.has(job.name))continue;visited.add(job.name);if(job.type===motionType){motion.push(job);continue;}for(const file of job.inputs||[]){const j=producer(file);if(j&&!visited.has(j.name))queue.push(j);}}
  if(motion.length){const unique=[...new Map(motion.map(j=>[j.name,j])).values()],settings=await Promise.all(unique.map(j=>adapter.call(['job',j.name]))),flags=settings.map(d=>d.values.do_even_odd_split);if(flags.some(v=>!['Yes','No'].includes(v))||new Set(flags).size!==1)return {};return {source:unique.map(j=>j.name).join(', '),values:{generate_split_tomograms:flags[0],do_fourier:flags[0]}};}
 }
 return {};
}
