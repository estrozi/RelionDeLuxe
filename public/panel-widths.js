export function setupPanelWidths(){
 const root=document.documentElement,key='relion-panel-widths';let saved={};try{saved=JSON.parse(localStorage.getItem(key)||'{}');}catch{}
 const definitions=[['.full-height-sidebar','left','--job-types-column',250,520],['.tabbed-pipelines','right','--pipeline-column',310,680]];
 for(const [selector,side,variable,min,max] of definitions){
  const panel=document.querySelector(selector);if(!panel)continue;
  const set=value=>{const width=Math.round(Math.max(min,Math.min(max,value)));root.style.setProperty(variable,width+'px');handle.setAttribute('aria-valuenow',width);saved[side]=width;window.dispatchEvent(new Event('resize'));};
  const persist=()=>{try{localStorage.setItem(key,JSON.stringify(saved));}catch{}};
  const handle=document.createElement('div');handle.className='panel-resizer '+side;handle.tabIndex=0;handle.setAttribute('role','separator');handle.setAttribute('aria-orientation','vertical');handle.setAttribute('aria-label','Resize '+side+' sidebar');handle.setAttribute('aria-valuemin',min);handle.setAttribute('aria-valuemax',max);handle.title='Drag to resize · Arrow keys to adjust · Double-click to reset';panel.append(handle);
  if(Number.isFinite(saved[side]))set(saved[side]);else handle.setAttribute('aria-valuenow',Math.round(panel.getBoundingClientRect().width));
  handle.onpointerdown=e=>{if(e.button!==0)return;e.preventDefault();handle.setPointerCapture(e.pointerId);handle.classList.add('dragging');};
  handle.onpointermove=e=>{if(handle.hasPointerCapture(e.pointerId))set(side==='left'?e.clientX:window.innerWidth-e.clientX);};
  handle.onpointerup=e=>{if(handle.hasPointerCapture(e.pointerId))handle.releasePointerCapture(e.pointerId);handle.classList.remove('dragging');persist();};
  handle.onlostpointercapture=()=>{handle.classList.remove('dragging');persist();};
  handle.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const delta=(e.key==='ArrowRight'?1:-1)*(side==='left'?1:-1)*(e.shiftKey?30:10);set(e.key==='Home'?min:e.key==='End'?max:panel.getBoundingClientRect().width+delta);persist();};
  handle.ondblclick=()=>{root.style.removeProperty(variable);delete saved[side];persist();handle.setAttribute('aria-valuenow',Math.round(panel.getBoundingClientRect().width));window.dispatchEvent(new Event('resize'));};
 }
}
