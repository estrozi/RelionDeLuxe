let receiving=false;
'use strict';
const $=id=>document.getElementById(id), NS='http://www.w3.org/2000/svg';
let nodes=[],edges=[],selected=null,scale=.85,tx=0,ty=0;
function parsePipeline(data){
 if(!data||!Array.isArray(data.steps)||!data.steps.length)throw Error('Expected a non-empty steps array.');
 const map=new Map(), list=data.steps.map((s,i)=>{if(typeof s.id!=='string'||!s.id)throw Error('Every job needs a string id.');if(map.has(s.id))throw Error('Duplicate job: '+s.id);const n={id:s.id,title:String(s.title||s.name||s.directory||s.id),status:String(s.status||''),keyInfo:String(s.keyInfo||''),keyInfoDetail:String(s.keyInfoDetail||''),resolutionInfo:String(s.resolutionInfo||''),alias:String(s.alias||''),icon:s.icon||'',deps:s.dependencies??[],parents:[],children:[],rank:0,index:i};if(!Array.isArray(n.deps)||n.deps.some(d=>typeof d!=='string'))throw Error('Dependencies must be arrays of job IDs.');map.set(n.id,n);return n;});
 const links=[];list.forEach(n=>[...new Set(n.deps)].forEach(id=>{const p=map.get(id);if(!p)throw Error('Unknown dependency '+id+' in '+n.id);p.children.push(n);n.parents.push(p);links.push({from:p,to:n});}));
 const pending=new Map(list.map(n=>[n,n.parents.length])),queue=list.filter(n=>!n.parents.length);let count=0;for(let i=0;i<queue.length;i++){const n=queue[i];count++;n.children.forEach(c=>{c.rank=Math.max(c.rank,n.rank+1);pending.set(c,pending.get(c)-1);if(!pending.get(c))queue.push(c);});}if(count!==list.length)throw Error('Cyclic dependencies: a hierarchical graph requires an acyclic pipeline.');
 for(const edge of data.retrospective||[]){
  const from=map.get(edge.source),to=map.get(edge.target);if(!from||!to)continue;
  const forward=links.find(e=>e.from===to&&e.to===from);
  if(forward)forward.maskPair=true;else links.push({from:to,to:from,retrospective:true,maskPair:true});
  links.push({from,to,retrospective:true,maskPair:true});
 }
 layoutGraph(list,links,true);return {nodes:list,edges:links};
}
// Build disjoint producer groups. Reject merges that would introduce a cycle
// between groups, keeping shared/remote inputs connected without duplicating jobs.
function groupedRows(list,links){
 let groups=list.map(n=>[n]);
 function quotient(candidate){
  const owner=new Map();candidate.forEach((g,i)=>g.forEach(n=>owner.set(n,i)));
  const children=candidate.map(()=>new Set()),incoming=candidate.map(()=>0),rank=candidate.map(()=>0);
  links.forEach(e=>{const a=owner.get(e.from),b=owner.get(e.to);if(a!==b&&!children[a].has(b)){children[a].add(b);incoming[b]++;}});
  const queue=incoming.flatMap((n,i)=>n===0?[i]:[]);
  for(let i=0;i<queue.length;i++)for(const b of children[queue[i]]){rank[b]=Math.max(rank[b],rank[queue[i]]+1);if(--incoming[b]===0)queue.push(b);}
  return queue.length===candidate.length?rank:null;
 }
 const joins=[...list].sort((a,b)=>b.rank-a.rank||b.index-a.index);
 for(const consumer of joins){
  if(consumer.parents.length<2)continue;
  // Try nearby inputs first. A remote input must not prevent a compatible
  // subset of local producers from sharing a row.
  const available=consumer.parents.filter(n=>groups.some(g=>g.length===1&&g[0]===n))
   .sort((a,b)=>b.rank-a.rank||a.index-b.index);
  if(available.length<2)continue;
  const members=new Set([available[0]]);
  for(const parent of available.slice(1)){
   const trial=new Set([...members,parent]);
   const merged=[...trial].sort((a,b)=>a.rank-b.rank||a.index-b.index);
   const candidate=groups.filter(g=>!trial.has(g[0])).concat([merged]);
   if(quotient(candidate)){members.add(parent);groups=candidate;}
  }
 }
 const ranks=quotient(groups),rows=[];
 groups.forEach((g,i)=>(rows[ranks[i]]??=[]).push(g));
 positionRows(rows,180,680);
}
function positionRows(rows,height,gap){
 rows.forEach((row,r)=>{
  const anchored=row.map(group=>{
   group.sort((a,b)=>a.rank-b.rank||a.index-b.index);
   const members=new Set(group);
   const parents=group.flatMap(n=>n.parents).filter(n=>!members.has(n)&&n.row<r);
   const nearestRow=Math.max(-1,...parents.map(n=>n.row));
   const nearest=parents.filter(n=>n.row===nearestRow);
   const anchor=nearest.length?(Math.min(...nearest.map(n=>n.x))+Math.max(...nearest.map(n=>n.x)))/2:0;
   return {group,anchor};
  }).sort((a,b)=>a.anchor-b.anchor||a.group[0].index-b.group[0].index);
  let nextLeft=-Infinity;
  for(const {group,anchor} of anchored){
   const left=Math.max(nextLeft,anchor);
   group.forEach((n,j)=>{n.x=left+j*340;n.y=r*height;n.row=r;});
   nextLeft=left+(group.length-1)*340+gap;
  }
 });
}

function routeEdges(list,links,pureVertical){

 links.forEach(e=>{
  const a=e.from,b=e.to;
  if(e.maskPair){
   if(a.row===b.row){
    const direction=Math.sign(b.x-a.x),offset=direction>0?-12:12;
    e.points=[[a.x+direction*145,a.y+offset],[b.x-direction*145,b.y+offset]];return;
   }
   const right=Math.max(a.x,b.x)+190+(a.y>b.y?18:0);
   const offset=a.y>b.y?12:-12;
   e.points=[[a.x+145,a.y+offset],[right,a.y+offset],[right,b.y+offset],[b.x+145,b.y+offset]];return;
  }
  if(a.row===b.row){
   const direction=Math.sign(b.x-a.x);
   if(Math.abs(b.x-a.x)===340)e.points=[[a.x+direction*145,a.y],[b.x-direction*145,b.y]];
   else{const y=a.y-78;e.points=[[a.x,a.y-54],[a.x,y],[b.x,y],[b.x,b.y-54]];}
  }else if(b.row===a.row+1){
   const mid=(a.y+b.y)/2;e.points=[[a.x,a.y+54],[a.x,mid],[b.x,mid],[b.x,b.y-54]];
  }else{
   // Only nodes between these endpoints can block the vertical lane.
   // Candidate lanes hug those obstacles, rather than the whole graph.
   const blockers=list.filter(n=>n.y>a.y&&n.y<b.y);
   const candidates=[...new Set([a.x,b.x,...blockers.flatMap(n=>[n.x-169,n.x+169])])];
   const clear=candidates.filter(x=>blockers.every(n=>Math.abs(n.x-x)>=157));
   // Minimize horizontal travel, then prefer the lane closest to the source.
   // Multiple outputs may share a local trunk; highlighting identifies each edge.
   clear.sort((x,y)=>(Math.abs(x-a.x)+Math.abs(x-b.x))-(Math.abs(y-a.x)+Math.abs(y-b.x))||Math.abs(x-a.x)-Math.abs(y-a.x)||x-y);
   const x=clear[0];
   e.points=[[a.x,a.y+54],[a.x,a.y+72],[x,a.y+72],[x,b.y-72],[b.x,b.y-72],[b.x,b.y-54]];
  }
 });
}
function layoutGraph(list,links,pureVertical){
 list.forEach(n=>{n.row=-1;});
 if(pureVertical){
  const rows=[];list.forEach(n=>(rows[n.rank]??=[]).push([n]));
  positionRows(rows,150,340);
 }else groupedRows(list,links.filter(e=>!e.retrospective));
 routeEdges(list,links,pureVertical);
}
function edgePath(e){return e.points.map((p,i)=>(i?'L':'M')+p.join(' ')).join(' ');}
function changeLayout(){
 layoutGraph(nodes,edges,$('pureVertical').checked);
 nodes.forEach(n=>n.el.setAttribute('transform',`translate(${n.x},${n.y})`));
 edges.forEach(e=>{const d=edgePath(e);e.el.setAttribute('d',d);e.hit.setAttribute('d',d);});
 center();
}

function svg(tag,attrs,parent){const el=document.createElementNS(NS,tag);Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,v));parent.append(el);return el;}
function nodeTooltip(n){
 const connections=jobs=>jobs.length?jobs.map(job=>job.id+' · '+job.title).join('\n'):'None';
 return [n.id,n.alias,n.title,...nodeDetailLines(n)].filter(Boolean).join('\n')+'\n\nINPUT JOBS\n'+connections(n.parents)+'\n\nOUTPUT TO\n'+connections(n.children);
}
function edgeTooltip(e){
 return (e.maskPair?'Retrospective mask relationship\n\n':'')+'FROM (output)\n'+e.from.id+' · '+e.from.title+'\n\nTO (input)\n'+e.to.id+' · '+e.to.title;
}
function nodeDetailLines(n){
 const detail=[n.keyInfoDetail,n.resolutionInfo&&!(n.keyInfo+' '+n.keyInfoDetail).includes(n.resolutionInfo)?n.resolutionInfo:''].filter(Boolean).join(' · ');
 return [[n.status,n.keyInfo].filter(Boolean).join(' · '),detail];
}
function treeText(parent,text,x,y,className,limit){
 const node=svg('text',{x,y,class:className},parent);
 node.textContent=text.length>limit?text.slice(0,limit-1)+'…':text;
}
function load(data){const parsed=parsePipeline(data);nodes=parsed.nodes;edges=parsed.edges;layoutGraph(nodes,edges,$('pureVertical').checked);$('stats').textContent=`${nodes.length} jobs  /  ${edges.length} dependencies`;$('world').replaceChildren();edges.forEach(e=>{const tooltip=edgeTooltip(e);
 e.group=svg('g',{class:'connection',role:'img','aria-label':tooltip},$('world'));
 svg('title',{},e.group).textContent=tooltip;
 e.el=svg('path',{class:'edge',d:edgePath(e),'marker-end':'url(#arrow)'},e.group);
 e.hit=svg('path',{class:'edge-hit',d:edgePath(e),'aria-hidden':'true'},e.group);});nodes.forEach(n=>{n.el=svg('g',{class:'node',transform:`translate(${n.x},${n.y})`,tabindex:0,role:'button','aria-label':n.id+': '+n.title},$('world'));svg('rect',{x:-145,y:-54,width:290,height:108,rx:9},n.el);
 if(n.icon){
  const parsed=new DOMParser().parseFromString(n.icon,'text/html').querySelector('svg');
  if(parsed?.namespaceURI===NS){const icon=document.importNode(parsed,true);for(const [key,value] of Object.entries({x:-130,y:-43,width:18,height:18,class:'tree-job-icon'}))icon.setAttribute(key,value);n.el.append(icon);}
 }
 treeText(n.el,n.title,-105,-30,'job-title',28);
 treeText(n.el,n.id,-128,-7,'id',35);
 const lines=nodeDetailLines(n);treeText(n.el,lines[0],-128,16,'job-status',39);
 treeText(n.el,lines[1],-128,37,'job-info',39);
const tooltip=nodeTooltip(n);svg('title',{},n.el).textContent=tooltip;n.el.setAttribute('aria-label',tooltip);n.el.onclick=()=>choose(n);n.el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose(n);}};});scale=.85;choose(nodes[0]);}
function choose(n){selected=n;nodes.forEach(a=>{a.el.classList.toggle('selected',a===n);a.el.classList.toggle('related',n.parents.includes(a)||n.children.includes(a));});edges.forEach(e=>{const hot=e.from===n||e.to===n;e.el.classList.toggle('hot',hot);e.el.setAttribute('marker-end',hot?'url(#hotArrow)':'url(#arrow)');if(hot)$('world').insertBefore(e.group,nodes[0].el);});center();if(!receiving)window.parent.relionTreeSelect?.(n.id);}
function paint(){$('world').setAttribute('transform',`translate(${tx} ${ty}) scale(${scale})`);$('zoom').textContent=Math.round(scale*100)+'%';}
function center(){if(!selected)return;tx=$('graph').clientWidth/2-selected.x*scale;ty=$('graph').clientHeight*.5-selected.y*scale;paint();}
function zoom(factor){if(!selected)return;const sx=selected.x*scale+tx,sy=selected.y*scale+ty;scale=Math.max(.025,Math.min(3,scale*factor));tx=sx-selected.x*scale;ty=sy-selected.y*scale;paint();}
function fit(){const pts=edges.flatMap(e=>e.points),xs=[...nodes.flatMap(n=>[n.x-165,n.x+165]),...pts.map(p=>p[0])],ys=nodes.flatMap(n=>[n.y-80,n.y+80]);const x=Math.min(...xs),y=Math.min(...ys),w=Math.max(...xs)-x,h=Math.max(...ys)-y;scale=Math.min(1,($('graph').clientWidth-60)/w,($('graph').clientHeight-100)/h);tx=($('graph').clientWidth-w*scale)/2-x*scale;ty=70-y*scale;paint();}
function navigate(key){let candidates=[];if(key==='ArrowUp')candidates=selected.parents;else if(key==='ArrowDown')candidates=selected.children;else{const sign=key==='ArrowRight'?1:-1;candidates=nodes.filter(n=>n.row===selected.row&&(n.x-selected.x)*sign>0);if(!candidates.length)candidates=[...selected.parents,...selected.children].filter(n=>(n.x-selected.x)*sign>0);}if(candidates.length)choose([...candidates].sort((a,b)=>Math.abs(a.y-selected.y)+Math.abs(a.x-selected.x)-Math.abs(b.y-selected.y)-Math.abs(b.x-selected.x))[0]);}
// Partially visible cards count; ties favor the current column, then source order.
function jumpToBoundary(key){
 const visibleOnly=key==='PageUp'||key==='PageDown';
 const bottom=key==='End'||key==='PageDown';
 const graph=$('graph');
 const candidates=visibleOnly?nodes.filter(n=>{
  const x=n.x*scale+tx,y=n.y*scale+ty;
  return x+145*scale>0&&x-145*scale<graph.clientWidth&&y+54*scale>0&&y-54*scale<graph.clientHeight;
 }):nodes;
 const target=[...candidates].sort((a,b)=>(bottom?b.y-a.y:a.y-b.y)||Math.abs(a.x-selected.x)-Math.abs(b.x-selected.x)||a.index-b.index)[0];
 if(target)choose(target);
}
$('pureVertical').onchange=changeLayout;
$('plus').onclick=()=>zoom(1.25);$('minus').onclick=()=>zoom(.8);$('center').onclick=center;$('fit').onclick=fit;$('fitOne').onclick=()=>{scale=1;center();};
window.addEventListener('keydown',e=>{if((e.target.matches('input:not([type=checkbox]),textarea,select')||e.target.isContentEditable)||!selected)return;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();navigate(e.key);}if(['Home','End','PageUp','PageDown'].includes(e.key)){e.preventDefault();jumpToBoundary(e.key);}if(e.key==='+'||e.key==='=')zoom(1.25);if(e.key==='-')zoom(.8);});
$('graph').addEventListener('wheel',e=>{e.preventDefault();zoom(Math.exp(-e.deltaY*.0015));},{passive:false});
let drag=null;$('graph').onpointerdown=e=>{if(e.target.closest('.node'))return;drag={x:e.clientX,y:e.clientY,tx,ty};$('graph').setPointerCapture(e.pointerId);$('world').style.transition='none';};$('graph').onpointermove=e=>{if(drag){tx=drag.tx+e.clientX-drag.x;ty=drag.ty+e.clientY-drag.y;paint();}};function endDrag(){drag=null;$('world').style.transition='';}$('graph').onpointerup=endDrag;$('graph').onpointercancel=endDrag;
new ResizeObserver(center).observe($('graph'));

let signature='';
window.relionTree={
 theme(values,scheme,font){
  for(const [key,value] of Object.entries(values))document.documentElement.style.setProperty(key,value);
  document.documentElement.style.colorScheme=scheme;
  document.documentElement.style.setProperty('--tree-font',font);
 },

 update(data,id){
  receiving=true;
  try{
   const key=JSON.stringify(data);
   if(key!==signature){
    if(!data.steps.length){nodes=[];edges=[];selected=null;$('world').replaceChildren();$('stats').textContent='No jobs yet';signature=key;return;}
    load(data);signature=key;
   }
   const node=nodes.find(n=>n.id===id);
   if(node&&node!==selected)choose(node);
  }catch(error){$('stats').textContent=error.message;}finally{receiving=false;}
 },
 center
};
window.parent.relionTreeReady?.();
