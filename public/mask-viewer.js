// NGL is loaded locally; map bytes are fetched through the authenticated API.
export function mountMaskViewer({container,input,threshold,token,readonly,onChange}){
 const panel=document.createElement('section');panel.className='mask-preview';
 const status=document.createElement('p');status.setAttribute('role','status');
 const label=document.createElement('label');label.textContent='Binarisation threshold (absolute density): ';
 const slider=document.createElement('input');slider.type='range';slider.disabled=true;slider.setAttribute('aria-label','Binarisation threshold');
 // Keep the original field and its handlers, but place it beside the slider.
 const row=threshold.closest?.('.field');
 const help=row?.querySelector('.help');
 threshold.type='number';threshold.step='any';threshold.disabled=readonly;
 threshold.setAttribute('aria-label','Binarisation threshold (absolute density)');
 panel.classList.add('field');panel.dataset.key='inimask_threshold';
 label.append(slider,threshold);if(help)label.append(help);row?.remove();
 const viewport=document.createElement('div');viewport.className='mask-viewport';viewport.setAttribute('aria-label','Interactive input-map isosurface');
 const reset=document.createElement('button');reset.type='button';reset.textContent='Centre map';reset.disabled=true;
 const note=document.createElement('small');note.textContent='Drag to rotate; scroll to zoom. Input-map preview only: low-pass filtering, mask extension and soft edges are applied by RELION when the job runs.';
 panel.append(label,status,viewport,reset,note);container.append(panel);
 let stage,representation,disposed=false,timer,resize,themeObserver,centerRevision=0;const abort=new AbortController();
 const background=()=>document.documentElement.dataset.theme==='dark'?'#18232f':document.documentElement.dataset.theme==='brazil'?'#fff7c2':document.documentElement.dataset.theme==='france'?'#eef3fc':'#f6f8fa';
 const centreAfterBuild=()=>{const revision=++centerRevision;stage.tasks.onZeroOnce(()=>{if(!disposed&&revision===centerRevision)stage.autoView(0);});};
 const update=()=>{const value=Number(threshold.value);if(threshold.value.trim()===''||!Number.isFinite(value))return;if(value<Number(slider.min))slider.min=String(value);if(value>Number(slider.max))slider.max=String(value);slider.value=String(value);clearTimeout(timer);timer=setTimeout(()=>{if(!disposed&&representation){representation.setParameters({isolevel:value});centreAfterBuild();}},100);};
 threshold.addEventListener('input',update);
 slider.oninput=()=>{threshold.value=slider.value;onChange();update();};
 reset.onclick=()=>stage?.autoView();
 (async()=>{
  if(!input){status.textContent='Choose an Input 3D map in the I/O tab.';return;}
  try{
   status.textContent='Loading '+input+'…';
   const response=await fetch('/api/map-preview?file='+encodeURIComponent(input),{headers:{'X-Relion-Token':token},signal:abort.signal});
   if(!response.ok){const error=await response.json();throw Error(error.error||'Could not load map');}
   const blob=await response.blob();if(disposed)return;
   if(!globalThis.NGL)throw Error('NGL viewer could not be loaded.');
   stage=new NGL.Stage(viewport,{backgroundColor:background(),cameraType:'orthographic'});
   themeObserver=new MutationObserver(()=>{if(!disposed)stage.setParameters({backgroundColor:background()});});
   themeObserver.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
   resize=new ResizeObserver(()=>stage?.handleResize());resize.observe(viewport);
   const component=await stage.loadFile(blob,{ext:'mrc',defaultRepresentation:false});if(disposed){component.dispose();return;}
   const data=component.volume.data;let min=Infinity,max=-Infinity;
   for(let i=0;i<data.length;i++)if(Number.isFinite(data[i])){min=Math.min(min,data[i]);max=Math.max(max,data[i]);}
   if(!Number.isFinite(min)||!(max>min))throw Error('The map has no varying finite density to display.');
   slider.min=String(min);slider.max=String(max);slider.step=String((max-min)/2000);slider.disabled=readonly;
   const value=Number(threshold.value);
   representation=component.addRepresentation('surface',{isolevelType:'value',isolevel:Number.isFinite(value)?value:min,boxSize:0,useWorker:true,smooth:0,color:'#65b9de',opaqueBack:true});
   update();centreAfterBuild();reset.disabled=false;
   status.textContent=input+' · density range '+min.toPrecision(5)+' to '+max.toPrecision(5);
  }catch(e){if(!disposed&&e.name!=='AbortError'){status.textContent='Preview unavailable: '+e.message;slider.disabled=true;}}
 })();
 return ()=>{disposed=true;abort.abort();clearTimeout(timer);threshold.removeEventListener('input',update);resize?.disconnect();themeObserver?.disconnect();stage?.dispose();panel.remove();};
}
