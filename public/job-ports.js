// Data-family overview, not a replacement for field-specific STAR validation.
export const families={
 tiltseries:['Tilt-series metadata','<path d="M3 6h12v14H3Zm5-3h12v14M6 9l6 8m-6 0 6-8"/>'],
 tomograms:['Tomograms','<path d="m3 7 9-5 9 5v10l-9 5-9-5Zm0 5 9 5 9-5M12 2v20"/>'],
 optimisations:['Tomography optimisation set','<path d="M4 2h12l4 4v16H4ZM8 9h8m-8 4h8m-8 4h8"/>'],
 trajectories:['Particle trajectories','<path d="M2 19Q5 2 12 12t10-8"/><circle cx="12" cy="12" r="2"/>'],
 movies:['Movies','<rect x="7" y="7" width="14" height="14" rx="2"/><path d="M3 16V3h13"/>'],
 micrographs:['Micrographs','<rect x="4" y="4" width="16" height="16" rx="2"/>'],
 coordinates:['Coordinates','<circle cx="12" cy="12" r="6"/><path d="M12 2v6m0 8v6M2 12h6m8 0h6"/>'],
 particles:['Particles','<circle cx="6" cy="6" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>'],
 classes:['Class references','<path d="m12 2 10 10-10 10L2 12Z"/>'],
 maps:['3D maps','<path d="m12 2 9 5v10l-9 5-9-5V7Zm0 10 9-5M12 12 3 7m9 5v10"/>'],
 masks:['Masks','<path d="M3 5q9 4 18 0v7c0 5-5 9-9 10-4-1-9-5-9-10Z"/><path d="M6 10q3-2 5 1m2 0q2-3 5-1M9 17q3 2 6 0" fill="none"/>'],
 checkpoints:['Optimiser / checkpoint','<path d="m7 3 10 0 5 9-5 9H7l-5-9Z"/>'],
 models:['Atomic models','<path d="m6 7 11 4m-1 3-6 5M6 9l2 8"/><circle cx="5" cy="6" r="3"/><circle cx="19" cy="12" r="3"/><circle cx="9" cy="20" r="2"/>'],
 postprocess:['Postprocess STAR','<path d="M4 2h12l4 4v16H4Z"/><path d="m12 7 1.5 3 3.5.5-2.5 2.5.5 3.5-3-1.5-3 1.5.5-3.5L7 10.5l3.5-.5Z"/>'],
 reports:['Reports / diagnostics','<path d="M5 2h10l4 4v16H5Zm3 15 3-4 3 2 3-5"/>'],
 external:['External / arbitrary data','<path d="M3 6h7l2 3h9v12H3Z"/>']
};
// Superset of modes. Optional inputs and conditional outputs are included.
export const ports={
 1003:[['maps','masks'],['masks']],
 1002:[['external'],['movies','micrographs']],0:[['external'],['movies','micrographs','particles','coordinates','classes','maps','masks']],
 1:[['movies'],['micrographs']],2:[['micrographs'],['micrographs']],3:[['micrographs'],['coordinates']],
 4:[['micrographs','classes','maps'],['coordinates','models']],5:[['micrographs','coordinates','particles'],['particles']],
 8:[['particles','checkpoints'],['classes','checkpoints']],18:[['particles','checkpoints'],['maps','checkpoints']],
 1001:[['classes'],['maps']],9:[['particles','maps','masks','checkpoints'],['maps','particles','checkpoints']],
 10:[['particles','maps','masks','checkpoints'],['maps','particles','checkpoints']],19:[['particles','masks','checkpoints'],['maps','checkpoints']],
 7:[['micrographs','particles','classes','checkpoints'],['micrographs','particles','classes','maps']],
 21:[['particles','postprocess'],['particles']],20:[['particles','micrographs','postprocess'],['particles']],
 22:[['particles','maps','checkpoints'],['maps','checkpoints']],12:[['maps'],['masks']],
 13:[['micrographs','particles','movies'],['micrographs','particles','movies']],14:[['particles','masks','checkpoints'],['particles']],
 15:[['maps','masks'],['maps','postprocess','reports']],16:[['maps','masks'],['maps','reports']],23:[['maps'],['models']],99:[['external'],['external']]
};
// Learned Topaz weights are checkpoints, not atomic models.
ports[4][1]=['coordinates','checkpoints'];
export const tomoPorts={
 50:[['external'],['tiltseries']],1:[['tiltseries'],['tiltseries']],2:[['tiltseries'],['tiltseries']],
 57:[['tiltseries'],['tiltseries']],55:[['tiltseries'],['tiltseries','reports']],56:[['tiltseries'],['tomograms','tiltseries']],
 58:[['tomograms'],['tomograms']],59:[['tomograms'],['particles','optimisations']],
 51:[['optimisations','particles','tiltseries','trajectories'],['optimisations','particles']],
 18:[['optimisations','particles','tiltseries','trajectories','checkpoints'],['maps','particles','optimisations','checkpoints']],
 9:[['optimisations','particles','tiltseries','trajectories','maps','masks','checkpoints'],['maps','particles','optimisations','checkpoints']],
 10:[['optimisations','particles','tiltseries','trajectories','maps','masks','checkpoints'],['maps','particles','optimisations','checkpoints']],
 54:[['optimisations','particles','tiltseries','trajectories'],['maps']],
 52:[['optimisations','particles','tiltseries','trajectories','maps','masks','postprocess'],['optimisations','tiltseries']],
 53:[['optimisations','particles','tiltseries','trajectories','maps','masks','postprocess'],['optimisations','tiltseries','trajectories']]
};
export function connectionsFor(id,mode='spa'){return (mode==='tomo'?tomoPorts[id]:null)||ports[id]||[[],[]];}
export function potentialConnection(source,target,mode){if(source===target)return false;const [inputs]=connectionsFor(target,mode);return connectionsFor(source,mode)[1].some(k=>k!=='external'&&k!=='reports'&&inputs.includes(k));}
function symbol(key,output){
 const span=document.createElement('span');span.className='job-port port-'+key+(output?' output':'');
 span.title=(output?'Possible output: ':'Possible input: ')+families[key][0];
 span.setAttribute('aria-label',span.title);
 span.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+families[key][1]+'</svg>';
 return span;
}
export function appendPorts(button,id,mode){
 const roles=connectionsFor(id,mode);roles.forEach((keys,index)=>{const group=document.createElement('span');group.className='job-ports';group.setAttribute('aria-label',index?'Possible outputs':'Possible inputs');for(const key of keys)group.append(symbol(key,index===1));button.append(group);});
}
export function portLegend(){
 const details=document.createElement('details');details.className='port-legend';
 const summary=document.createElement('summary');summary.textContent='Input / output symbols';details.append(summary);
 const note=document.createElement('p');note.textContent='Outline: input · Underlined: output. Possible data families across job modes; not a guarantee of file compatibility.';details.append(note);
 for(const key of Object.keys(families)){const row=document.createElement('div');row.append(symbol(key,false),symbol(key,true),document.createTextNode(families[key][0]));details.append(row);}return details;
}

export function setupPortColumns(layout){
 const sidebar=document.querySelector('.full-height-sidebar'),head=document.querySelector('.job-port-head');
 if(!sidebar||!head)return;
 let widths={};try{widths=JSON.parse(localStorage.getItem('relion-port-widths')||'{}');}catch{}
 const probe=document.createElement('span');probe.className='job-name-measure';sidebar.append(probe);
 let longest=0;for(const job of layout){probe.textContent=job.name;longest=Math.max(longest,probe.getBoundingClientRect().width);}probe.remove();
 sidebar.style.setProperty('--job-name-max',Math.ceil(longest)+'px');
 const controls=[];
 const apply=()=>{
  const available=Math.max(90,sidebar.clientWidth-77),preferred=Math.max(38,(available-longest)/2);
  let input=Number.isFinite(widths.input)?widths.input:preferred,output=Number.isFinite(widths.output)?widths.output:preferred;
  const cap=Math.max(19,(available-50)/2);input=Math.max(19,Math.min(cap,input));output=Math.max(19,Math.min(cap,output));
  sidebar.style.setProperty('--port-input-width',input+'px');sidebar.style.setProperty('--port-output-width',output+'px');
  controls.forEach(({handle,role})=>handle.setAttribute('aria-valuenow',Math.round(role==='input'?input:output)));
 };
 const save=()=>{try{localStorage.setItem('relion-port-widths',JSON.stringify(widths));}catch{}};
 for(const [role,index] of [['input',1],['output',2]]){
  const handle=document.createElement('span');handle.className='port-column-resizer';handle.tabIndex=0;handle.setAttribute('role','separator');handle.setAttribute('aria-orientation','vertical');handle.setAttribute('aria-label','Resize '+role+' symbols column');handle.title='Drag left to widen '+role+' symbols · Double-click to reset';head.children[index].prepend(handle);controls.push({handle,role});
  let start=0,width=0;
  handle.onpointerdown=e=>{if(e.button!==0)return;e.preventDefault();start=e.clientX;width=parseFloat(getComputedStyle(sidebar).getPropertyValue('--port-'+role+'-width'));handle.setPointerCapture(e.pointerId);};
  handle.onpointermove=e=>{if(handle.hasPointerCapture(e.pointerId)){widths[role]=Math.max(19,width+start-e.clientX);apply();}};
  handle.onpointerup=e=>{if(handle.hasPointerCapture(e.pointerId))handle.releasePointerCapture(e.pointerId);save();};handle.onlostpointercapture=save;
  handle.onkeydown=e=>{if(!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();widths[role]=Math.max(19,parseFloat(getComputedStyle(sidebar).getPropertyValue('--port-'+role+'-width'))+(e.key==='ArrowLeft'?10:-10));apply();save();};
  handle.ondblclick=()=>{delete widths[role];apply();save();};
 }
 new ResizeObserver(apply).observe(sidebar);apply();
}


// Use field-specific native node metadata, never the job's union of possible inputs.
export function inputFamily(field,values={}){
 if(field.key==='fn_in_other'){
  const node=values.node_type||'';
  if(/^Particle coordinates/.test(node))return 'coordinates';
  if(/^Particles STAR/.test(node))return 'particles';
  if(/^Multiple .*references/.test(node))return 'classes';
  if(/^Micrographs STAR/.test(node))return 'micrographs';
  if(/^3D mask/.test(node))return 'masks';
  if(/^(3D reference|Unfiltered half-map)/.test(node))return 'maps';
  return 'external';
 }
 const node=field.nodeType||'';
 if(node.includes('postprocess'))return 'postprocess';
 const types={DensityMap:'maps',Mask3D:'masks',Image2DGroupMetadata:'classes',MicrographCoordsGroup:'coordinates',MicrographGroupMetadata:'micrographs',MicrographMovieGroupMetadata:'movies',OptimiserData:'checkpoints',ParticleGroupMetadata:'particles',TomoOptimisationSet:'optimisations',TomoTrajectoryData:'trajectories',TomogramGroupMetadata:'tomograms'};
 if(types[node.split('.')[0]])return types[node.split('.')[0]];
 const keys={fn_cont:'checkpoints',fn_checkpoint:'checkpoints',fn_post:'postprocess',coords_suffix:'coordinates',fn_in_raw:'movies',movie_files:'movies',mdoc_files:'tiltseries'};
 return keys[field.key]||([2,3].includes(field.type)?'external':null);
}
export function inputSymbol(field,values={}){
 let key=inputFamily(field,values);
 if(field.key==='fn_in_raw'&&values.is_multiframe==='No')key='micrographs';
 if(!key)return null;
 const icon=symbol(key,false);icon.classList.add('field-input-icon');
 icon.title='Input: '+families[key][0]+'. Check the field help for exact file requirements.';
 icon.setAttribute('aria-label',icon.title);return icon;
}

// Concrete Inspector entries prefer registered node metadata over filename hints.
export function nodeFamily(file,nodeType=''){
 const base=nodeType.split('.')[0];
 if(base==='TomogramGroupMetadata')return /(?:^|\/)tomograms\.star$/i.test(file)||/\.(reconstruct|denoise)(\.|$)/.test(nodeType)?'tomograms':'tiltseries';
 if(/postprocess/.test(nodeType))return 'postprocess';
 if(/^(OptimiserData|ProcessData\.star\.relion\.optimiser)(\.|$)/.test(nodeType))return 'checkpoints';
 const family=inputFamily({nodeType});if(family)return family;
 if(/^(AtomicModel|AtomCoords|Pdb|Model)/i.test(base)||/\.(pdb|cif|mmcif)$/i.test(file))return 'models';
 if(/\.pdf$/i.test(file)||/^(Pdf|PDF|LogFile)/.test(base))return 'reports';
 if(/\.(pth|pt|tar\.gz)$/i.test(file))return 'checkpoints';
 if(/(?:^|\/)postprocess\.star$/i.test(file))return 'postprocess';
 if(/(?:^|\/)tilt_series\.star$/i.test(file))return 'tiltseries';
 if(/(?:^|\/)tomograms\.star$/i.test(file))return 'tomograms';
 if(/_optimiser\.star$/i.test(file))return 'checkpoints';
 if(!nodeType&&/\.(mrc|map)$/i.test(file))return 'maps';
 return 'external';
}
export function nodeSymbol(file,nodeType,kind){
 const family=nodeFamily(file,nodeType),icon=symbol(family,kind==='Output');
 icon.classList.add('inspector-node-icon');icon.title=kind+': '+families[family][0];icon.setAttribute('aria-label',icon.title);return icon;
}
