import path from 'node:path';
export async function ctfPowerSpectra(project,adapter,state,input,motionType){
 if(typeof input!=='string'||!input.trim())return {disabled:false};
 const canonical=value=>{let name=path.posix.normalize(path.isAbsolute(value)?path.relative(project,value):value);for(const j of state.jobs)if(j.alias&&j.alias!=='None'&&name.startsWith(j.alias))return j.name+name.slice(j.alias.length);return name;};
 const file=canonical(input.trim());
 const producer=state.jobs.find(j=>j.outputs.some(out=>canonical(out)===file));
 if(!producer||producer.type!==motionType)return {disabled:true,value:'No',reason:'Disabled because this input is not a registered Motion correction output. CTFFIND will use the micrographs instead.'};
 const data=await adapter.call(['job',producer.name]);
 return data.values.do_save_ps==='No'?{disabled:true,value:'No',source:producer.name,reason:'Disabled because '+producer.name+' has “Save sum of power spectra?” set to No. CTFFIND will use the micrographs instead.'}:{disabled:false,source:producer.name,...(['Yes','No'].includes(data.values.do_save_ps)?{value:data.values.do_save_ps}:{})};
}
