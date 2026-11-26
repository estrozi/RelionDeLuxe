import path from 'node:path';
export async function extractionInversion(project,adapter,state,input,autopickType){
 if(typeof input!=='string'||!input.trim())return {};
 let file=path.posix.normalize(path.isAbsolute(input)?path.relative(project,input):input);
 for(const j of state.jobs)if(j.alias&&j.alias!=='None'&&file.startsWith(j.alias))file=j.name+file.slice(j.alias.length);
 const producer=state.jobs.find(j=>j.type===autopickType&&j.outputs.includes(file));if(!producer)return {};
 const {values}=await adapter.call(['job',producer.name]);
 return values.do_log==='Yes'&&values.log_invert==='Yes'?{do_invert:'No'}:{};
}
