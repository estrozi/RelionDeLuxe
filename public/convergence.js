export const classColor=id=>['#d83dcc','#168bd2','#bb9100','#ee5544','#20a57b','#8c6ddb'][(id-1)%6];
const ns='http://www.w3.org/2000/svg';
function node(tag,attrs={},text){const e=document.createElementNS(ns,tag);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,v);if(text!==undefined)e.textContent=text;return e;}
export function nearestIteration(iterations,value){
 return iterations.reduce((best,p)=>best===null||Math.abs(p.iteration-value)<Math.abs(best-value)?p.iteration:best,null);
}
export function drawConvergence(container,data,options={}){
 if(['2d','refine3d'].includes(data.mode))return drawAccuracy(container,data);
 container.replaceChildren();const intro=document.createElement('p');intro.textContent='Class population vs iteration · point labels show estimated resolution (Å). Hover for exact values.';container.append(intro);
 if(options.onIteration){
  intro.append(document.createTextNode(' Click an iteration to preview its maps. '));
  const status=document.createElement('span');status.textContent=options.iteration===null?'Preview: latest. ':'Preview: iteration '+options.iteration+'. ';intro.append(status);
  const latest=document.createElement('button');latest.type='button';latest.textContent='Latest';latest.onclick=()=>options.onIteration(null);intro.append(latest);
 }
 if(!data.iterations.length){intro.textContent='Waiting for readable intermediate model STAR files…';}
 else{
 const series=[...new Set(data.iterations.flatMap(i=>i.classes.map(c=>c.id)))].sort((a,b)=>a-b),colors=['#d83dcc','#168bd2','#bb9100','#ee5544','#20a57b','#8c6ddb'];
 const w=Math.max(900,data.iterations.length*42),h=370,left=58,right=25,top=35,bottom=45,min=data.iterations[0].iteration,max=data.iterations.at(-1).iteration;
 const x=i=>left+(i-min)/Math.max(1,max-min)*(w-left-right),y=v=>h-bottom-v*(h-top-bottom);
 const svg=node('svg',{viewBox:`0 0 ${w} ${h}`,width:w,height:h,style:`--plot-width:${w}px;--plot-height:${h}px`,role:'img','aria-label':'3D classification populations and estimated resolutions by iteration'});
 for(let i=0;i<=5;i++){const v=i/5;svg.append(node('line',{x1:left,y1:y(v),x2:w-right,y2:y(v),stroke:'currentColor',opacity:'.18'}),node('text',{x:left-8,y:y(v)+4,'text-anchor':'end',fill:'currentColor'},v.toFixed(1)));}
 const stride=Math.max(1,Math.ceil(data.iterations.length/20));data.iterations.forEach((p,i)=>{if(i%stride===0||i===data.iterations.length-1)svg.append(node('text',{x:x(p.iteration),y:h-23,'text-anchor':'middle',fill:'currentColor'},p.iteration));});
 svg.append(node('text',{x:w/2,y:h-3,'text-anchor':'middle',fill:'currentColor'},'Iteration'),node('text',{x:5,y:15,fill:'currentColor'},'Population'));
 const legends=document.createElement('div');legends.className='convergence-legend';container.append(legends);
 series.forEach((id,i)=>{const color=classColor(id),pts=data.iterations.map(p=>({iteration:p.iteration,c:p.classes.find(c=>c.id===id)})).filter(p=>p.c&&Number.isFinite(p.c.population)&&p.c.population!==999);svg.append(node('polyline',{points:pts.map(p=>`${x(p.iteration)},${y(p.c.population)}`).join(' '),fill:'none',stroke:color,'stroke-width':2}));for(const p of pts){const dot=node('circle',{cx:x(p.iteration),cy:y(p.c.population),r:4,fill:color});dot.append(node('title',{},`Class ${id} · iteration ${p.iteration} · population ${p.c.population} · resolution ${p.c.resolution??'unavailable'} Å`));svg.append(dot,node('text',{x:x(p.iteration),y:y(p.c.population)-7-(i%2)*10,'text-anchor':'middle',fill:color,'font-size':10},p.c.resolution>0&&p.c.resolution!==999?p.c.resolution.toFixed(2):'—'));}
 const legend=document.createElement('span');legend.textContent='● Class '+id+'  ';legend.style.color=color;legends.append(legend);});
 if(options.onIteration){
  svg.style.cursor='crosshair';
  svg.addEventListener('click',event=>{
   const matrix=svg.getScreenCTM();if(!matrix)return;
   const point=svg.createSVGPoint();point.x=event.clientX;point.y=event.clientY;
   const p=point.matrixTransform(matrix.inverse());
   if(p.x<left||p.x>w-right||p.y<top||p.y>h-bottom)return;
   options.onIteration(nearestIteration(data.iterations,min+(p.x-left)/(w-left-right)*Math.max(1,max-min)));
  });
  if(options.iteration!==null&&Number.isFinite(options.iteration))svg.append(node('line',{x1:x(options.iteration),x2:x(options.iteration),y1:top,y2:h-bottom,stroke:'currentColor','stroke-dasharray':'4 3','pointer-events':'none'}));
 }
 appendPlot(container,svg,w);
 }
 syncConvergenceScroll(container);
 if(data.warnings.length){const warning=document.createElement('p');warning.textContent='Some files are not ready or could not be read: '+data.warnings.join('; ');container.append(warning);}
}

function appendPlot(container,svg,width){
 const top=document.createElement('div');top.className='convergence-scroll-top';top.setAttribute('aria-label','Scroll convergence plot horizontally');top.tabIndex=0;
 const spacer=document.createElement('div');spacer.style.width=width+'px';top.append(spacer);
 const scroller=document.createElement('div');scroller.className='convergence-plot';scroller.append(svg);container.append(top,scroller);
}

export function syncConvergenceScroll(container){
 const plots=[...container.querySelectorAll('.convergence-plot,.convergence-scroll-top')];
 for(const plot of plots)plot.addEventListener('scroll',()=>{for(const other of plots)if(other!==plot&&other.scrollLeft!==plot.scrollLeft)other.scrollLeft=plot.scrollLeft;},{passive:true});
}
function drawAccuracy(container,data){
 container.replaceChildren();
 const refinement=data.mode==='refine3d';
 const intro=document.createElement('p');intro.textContent=refinement?'Auto-refine resolution and changes vs iteration · values from stdout.':'Accuracy vs iteration · one curve per class. Values of 0 or 999 are omitted. Hover over points for class and value.';container.append(intro);
 if(!data.iterations.length)intro.textContent=refinement?'Waiting for Auto-refine iteration statistics in stdout…':'Waiting for readable intermediate model STAR files…';
 const ids=[...new Set(data.iterations.flatMap(p=>p.classes.map(c=>c.id)))].sort((a,b)=>a-b);
 for(const [key,label,unit] of (refinement?[['resolution','Resolution','Å'],['rotation','Changes in angles','°'],['translation','Changes in offsets','Å']]:[['rotation','Rotational accuracy','°'],['translation','Translational accuracy','Å']])){
  if(!data.iterations.length)break;
  const heading=document.createElement('h4');heading.textContent=label+' ('+unit+')';container.append(heading);
  const values=data.iterations.flatMap(p=>p.classes.map(c=>c[key])).filter(v=>v!==null&&v!==999&&Number.isFinite(v));
  if(!values.length){const message=document.createElement('p');message.textContent='No valid values yet.';container.append(message);continue;}
  const w=Math.max(900,data.iterations.length*42),h=300,left=65,right=25,top=20,bottom=45;
  const min=data.iterations[0].iteration,max=data.iterations.at(-1).iteration,limit=Math.max(1e-12,...values)*1.08;
  const x=i=>left+(i-min)/Math.max(1,max-min)*(w-left-right),y=v=>h-bottom-v/limit*(h-top-bottom);
  const svg=node('svg',{viewBox:`0 0 ${w} ${h}`,width:w,height:h,style:`--plot-width:${w}px;--plot-height:${h}px`,role:'img','aria-label':label+' by iteration'});
  for(let i=0;i<=5;i++){const v=limit*i/5;svg.append(node('line',{x1:left,y1:y(v),x2:w-right,y2:y(v),stroke:'currentColor',opacity:'.18'}),node('text',{x:left-8,y:y(v)+4,'text-anchor':'end',fill:'currentColor'},Number(v.toPrecision(3))));}
  const stride=Math.max(1,Math.ceil(data.iterations.length/20));data.iterations.forEach((p,i)=>{if(i%stride===0||i===data.iterations.length-1)svg.append(node('text',{x:x(p.iteration),y:h-23,'text-anchor':'middle',fill:'currentColor'},p.iteration));});
  svg.append(node('text',{x:w/2,y:h-3,'text-anchor':'middle',fill:'currentColor'},'Iteration'));
  for(const id of ids){
   const color=`hsl(${id*137.508%360} 70% 48%)`;let segment=[];
   const flush=()=>{if(segment.length>1)svg.append(node('polyline',{points:segment.join(' '),fill:'none',stroke:color,'stroke-width':1.5}));segment=[];};
   for(const p of data.iterations){const v=p.classes.find(c=>c.id===id)?.[key];if(v==null||v===999||!Number.isFinite(v)){flush();continue;}
    segment.push(x(p.iteration)+','+y(v));
    const dot=node('circle',{cx:x(p.iteration),cy:y(v),r:3,fill:color});dot.append(node('title',{},`${refinement?'':'Class '+id+' · '}Iteration ${p.iteration} · ${label}: ${v} ${unit}`));svg.append(dot);
   }flush();
  }
  appendPlot(container,svg,w);
 }
 syncConvergenceScroll(container);
 if(data.warnings.length){const warning=document.createElement('p');warning.textContent='Some files are not ready or could not be read: '+data.warnings.join('; ');container.append(warning);}
}
