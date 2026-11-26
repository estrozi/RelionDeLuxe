// RELION stores the next assignable number, not the latest assigned number.
export function pipelineJobNumber(state){
 const next=Number(state.counter);
 if(Number.isSafeInteger(next)&&next>=1)return next-1;
 return Math.max(0,...(state.jobs||[]).filter(j=>!j.provisional).map(j=>Number(j.name.match(/job(\d+)\//)?.[1]||0)));
}
export function jobConnections(jobs){
 const producers=new Map(),aliases=jobs.filter(j=>j.alias&&j.alias!=='None').sort((a,b)=>b.alias.length-a.alias.length);
 const canonical=file=>{const j=aliases.find(j=>file.startsWith(j.alias));return j?j.name+file.slice(j.alias.length):file;};
 for(const j of jobs)for(const f of j.outputs||[]){const key=canonical(f);if(!producers.has(key))producers.set(key,[]);producers.get(key).push(j);}
 // Some pipelines omit an output node even though an input names its producer directory.
 const producersFor=file=>producers.get(canonical(file))||jobs.filter(j=>canonical(file).startsWith(j.name.endsWith('/')?j.name:j.name+'/')).sort((a,b)=>b.name.length-a.name.length).slice(0,1);
 const edges=new Map();for(const target of jobs)for(const file of target.inputs||[])for(const source of producersFor(file)){
  const key=JSON.stringify([source.name,target.name]);if(!edges.has(key))edges.set(key,{source:source.name,target:target.name,status:target.status,provisional:!!target.provisional,files:[]});const e=edges.get(key);if(!e.files.includes(file))e.files.push(file);
 }
 return [...edges.values()];
}
export function nextConnectionFocus(fullJob,selection,name,event={}){
 return !event.ctrlKey&&!event.metaKey&&!event.shiftKey&&selection.size===1&&selection.has(name)?(fullJob===name?null:name):null;
}
// Hierarchy-only exception for masks made from an earlier run of the same job.
export function hierarchyConnections(jobs){
 const edges=jobConnections(jobs),byName=new Map(jobs.map(j=>[j.name,j]));
 return edges.filter(edge=>{
  if(Number(byName.get(edge.source)?.type)!==12||![9,10].includes(Number(byName.get(edge.target)?.type)))return true;
  const seen=new Set([edge.target]),queue=[edge.target];
  for(let i=0;i<queue.length;i++)for(const next of edges){
   if(next===edge||next.source!==queue[i]||seen.has(next.target))continue;
   if(next.target===edge.source)return false;
   seen.add(next.target);queue.push(next.target);
  }
  return true;
 });
}
export function connectionFocus(edges,focused,fullPath=false){
 const related=new Set(focused?[focused]:[]),highlighted=new Set();
 const key=e=>JSON.stringify([e.source,e.target]);
 if(focused){
  if(fullPath){
   // Separate directed walks exclude sibling branches and unrelated parents of
   // downstream joins. Do not walk the whole undirected connected component.
   for(const upstream of [true,false]){
    const adjacency=new Map();for(const e of edges){const from=upstream?e.target:e.source;if(!adjacency.has(from))adjacency.set(from,[]);adjacency.get(from).push(e);}
    const seen=new Set([focused]),queue=[focused];
    for(let i=0;i<queue.length;i++)for(const e of adjacency.get(queue[i])||[]){
     highlighted.add(key(e));const next=upstream?e.source:e.target;related.add(next);
     if(!seen.has(next)){seen.add(next);queue.push(next);}
    }
   }
  }else for(const e of edges)if(e.source===focused||e.target===focused){highlighted.add(key(e));related.add(e.source);related.add(e.target);}
 }
 return {related,connected:e=>!focused||highlighted.has(key(e))};
}
let observers=[];
const ns='http://www.w3.org/2000/svg';
function svgEl(name,attrs={}){const e=document.createElementNS(ns,name);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,String(v));return e;}
export function renderJobConnections(holder,jobs,selection=[],onActivate,fullPath=false,hideUnrelated=false){
 for(const o of observers)o.disconnect();observers=[];holder.querySelectorAll('.connection-legend').forEach(e=>e.remove());
 const edges=jobConnections(jobs);
 const focused=selection.length===1?selection[0]:null;
 fullPath=!!focused&&(fullPath===true||fullPath===focused);
 const focus=connectionFocus(edges,focused,fullPath),related=focus.related;
 for(const row of holder.querySelectorAll('.job-row'))row.classList.toggle('dependency-muted',!!focused&&!related.has(row.dataset.job));
 for(const list of holder.querySelectorAll('.job-section-list')){
  const rows=[...list.querySelectorAll('.job-row')];if(!rows.length)continue;
  const names=new Set(rows.map(r=>r.dataset.job)),local=edges.filter(e=>(!hideUnrelated||focus.connected(e))&&(names.has(e.source)||names.has(e.target)));if(!local.length)continue;
  const content=document.createElement('div');content.className='job-connected-content';
  const rowBox=document.createElement('div');rowBox.className='job-connected-rows';for(const row of [...list.children])if(row.matches('.job-row,.pipeline-number-divider,.pipeline-next-jobs'))rowBox.append(row);content.append(rowBox);list.append(content);
  const svg=svgEl('svg',{'class':'job-connections','aria-label':'Job dependencies'});content.append(svg);svg.setAttribute('aria-label','Dependencies: dot is source; arrowhead is destination. Hover for files.');
  const legend=document.createElement('small');legend.className='connection-legend';legend.textContent='● source → destination · hover for files'+(focused?(fullPath?' · full path':' · direct links'):'');legend.title=focused?'Click the selected job again to toggle direct links / full upstream and downstream path.':'';list.before(legend);
  const paint=()=>{
   svg.replaceChildren();const height=rowBox.getBoundingClientRect().height;svg.setAttribute('height',height);
   const base=rowBox.getBoundingClientRect().top,centers=new Map(rows.map(r=>[r.dataset.job,r.getBoundingClientRect().top-base+r.getBoundingClientRect().height/2]));
   const laid=local.map(e=>{
    const source=centers.get(e.source),target=centers.get(e.target),a=source??Math.max(4,target-18),b=target??Math.min(height-4,source+18);
    return {...e,a,b,external:source===undefined||target===undefined,incoming:source===undefined};
   }).sort((a,b)=>a.a-b.a||a.b-b.b||a.source.localeCompare(b.source));
   const available=Math.max(40,list.clientWidth-205);const spacing=Math.max(5,Math.min(10,(available-12)/Math.max(1,laid.length)));
   const width=Math.max(30,12+laid.length*spacing);svg.setAttribute('width',width);content.style.setProperty('--connection-width',width+'px');
   for(const y of centers.values())svg.append(svgEl('path',{d:`M 0 ${y} H ${width}`,stroke:'var(--line)','stroke-width':1,'stroke-dasharray':'1 4',fill:'none'}));
   for(const [lane,e] of laid.entries()){
    const x=6+lane*spacing,color=['Failed','Aborted'].includes(e.status)?'var(--connection-warning)':'var(--connection-color)';
    const connected=focus.connected(e);
    const group=svgEl('g',{'class':'job-connection'+(e.provisional?' provisional-connection':'')+(focused?(connected?' dependency-highlight':' dependency-muted'):'')}),title=svgEl('title');title.textContent=e.source+' → '+e.target+'\n'+e.files.join('\n')+(e.external?'\nOther endpoint is in another job section.':'');group.append(title);
    // Independent vertical tracks never join or cross other dependencies.
    const self=e.source===e.target,from=self?e.a-9:e.a,to=self?e.b+9:e.b,dir=to>=from?1:-1;
    const d=`M ${x} ${from} V ${to}`;
    group.append(svgEl('path',{d,fill:'none',stroke:color,'stroke-width':2,...((e.external||e.provisional)?{'stroke-dasharray':'3 3'}:{})}));
    group.append(svgEl('circle',{cx:x,cy:from,r:2,fill:color}));
    group.append(svgEl('path',{d:`M ${x-2.5} ${to-dir*5} L ${x} ${to} L ${x+2.5} ${to-dir*5}`,fill:'none',stroke:color,'stroke-width':2}));
    const hit=svgEl('path',{d,fill:'none',stroke:'transparent','stroke-width':5,'class':'connection-hit'});group.append(hit);
    if(e.external){const label=svgEl('text',{x:x+2.5,y:(e.incoming?from:to),fill:color,'font-size':8,transform:`rotate(-90 ${x+2.5} ${e.incoming?from:to})`});label.textContent=(e.incoming?e.source:e.target).match(/job\d+/)?.[0]||'↗';group.append(label);}
    if(onActivate){group.setAttribute('role','button');group.setAttribute('tabindex','0');group.setAttribute('aria-label',title.textContent);group.style.cursor='pointer';group.onclick=event=>{event.stopPropagation();onActivate(e);};group.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();onActivate(e);}};}
    svg.append(group);
   }
  };
  paint();const observer=new ResizeObserver(paint);observer.observe(rowBox);observers.push(observer);
 }
}
