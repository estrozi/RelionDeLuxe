// Group transient input absence by the producer, not by thousands of stacks.
export function groupPending(report,jobs){
 const groups=new Map(),result=[];
 for(const item of report){
  if(item.severity!=='pending'){result.push(item);continue;}
  const producer=jobs.find(j=>item.file.startsWith(j.name)||j.outputs?.includes(item.file));
  const key=producer?.name||item.file;
  if(!groups.has(key)){
   const group={severity:'pending',file:key,producer:producer?.name,message:'Waiting for '+key+' to finish producing its inputs.'};
   groups.set(key,group);result.push(group);
  }
 }
 return result;
}
export function readinessDecision(check,jobs){
 const waiting=[];
 for(const name of check.dependencies||[]){
  const job=jobs.find(j=>j.name===name);
  if(!job)return {error:'Input producer is no longer in the pipeline: '+name};
  if(['Failed','Aborted'].includes(job.status))return {error:'Input producer '+name+' is '+job.status+'.'};
  if(job.status==='Running')waiting.push(name);
  else if(job.status!=='Succeeded')return {error:'Input producer '+name+' has not succeeded ('+job.status+'). Check scheduler order.'};
 }
 if(waiting.length)return {waiting};
 const issues=check.report.filter(r=>['warning','error','pending'].includes(r.severity));
 if(issues.length)return {error:issues.slice(0,8).map(r=>r.file+' — '+r.message).join('\n')+(issues.length>8?'\nAdditional input issues: '+(issues.length-8):'')};
 return {ready:true};
}
