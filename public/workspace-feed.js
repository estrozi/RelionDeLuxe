export function switchedTab(previous,next){return previous&&previous.type===next.type?previous.tab:null;}
// Repeated highlight/refresh messages must not repeat connector navigation.
export function connectionNavigation(){
 let consumed;
 return (edge,selected)=>{
  if(!edge?.navigationId||![edge.source,edge.target].includes(selected)||edge.navigationId===consumed)return false;
  consumed=edge.navigationId;return true;
 };
}
// Same ordering is shared by the pipeline list and the complete-workspace feed.
export function comparePipelineJobs(a,b){return Number(a.name.match(/job(\d+)/)?.[1]||0)-Number(b.name.match(/job(\d+)/)?.[1]||0)||a.name.localeCompare(b.name);}
// Center inside the pipeline's own scroller without moving the page or feed.
export function centerPipelineRow(row){
 const list=row?.closest('.job-section-list');if(!list)return null;
 const top=Math.max(0,Math.min(Math.max(0,list.scrollHeight-list.clientHeight),list.scrollTop+row.getBoundingClientRect().top-list.getBoundingClientRect().top-list.clientTop+(row.getBoundingClientRect().height-list.clientHeight)/2));
 list.scrollTo({top,behavior:'instant'});return {list,top};
}
export function createWorkspaceFeed({root,footer,onActivate,onNew,onBusy,onChanged}) {
 const feed=document.createElement('div');feed.className='workspace-feed';feed.setAttribute('aria-label','Job workspaces');root.before(feed);root.classList.add('feed-controller');feed.after(footer);
 const entries=new Map();let lastFocused=null;let active,sequence=0,fresh=false,paused=false,latestDefaults=null,latestConnection=null,order=[];
 let startupReveal=null;
 const cancelStartupReveal=()=>{startupReveal=null;};
 for(const event of ['pointerdown','wheel','keydown'])window.addEventListener(event,cancelStartupReveal,{capture:true,passive:true});
 const submissionPositions=new Map();
 const busyEntries=new Set();let pendingJobs=null;
 const api=e=>e.frame?.contentWindow?.relionWorkspace;
 const theme=()=>document.documentElement.dataset.theme||'light';
 const observer=new IntersectionObserver(changes=>{for(const change of changes){const e=entries.get(change.target.dataset.entry);if(e){e.visible=change.isIntersecting;if(e.visible)mount(e);api(e)?.visibility(e.visible&&!paused);}}},{root:feed,rootMargin:'100px'});
 const size=()=>{
  const tree=document.querySelector('.tree-workspace');
  const surface=tree&&!tree.hidden?tree:feed,rect=surface.getBoundingClientRect();
  footer.style.left=rect.left+'px';footer.style.width=rect.width+'px';
  const footerHeight=footer.getBoundingClientRect().height;
  const prompt=document.querySelector('.next-job-prompt');
  if(prompt){prompt.style.left=rect.left+'px';prompt.style.width=rect.width+'px';prompt.style.bottom=footerHeight+'px';}
  const h=Math.max(0,innerHeight-rect.top-footerHeight-(document.querySelector('.next-job-prompt')?.getBoundingClientRect().height||0));
  feed.style.height=h+'px';feed.style.setProperty('--entry-height',Math.max(480,h-12)+'px');
  if(tree)tree.style.height=Math.max(0,innerHeight-rect.top-footerHeight)+'px';
 };

 window.addEventListener('resize',size);window.addEventListener('relion-next-job-layout',size);new ResizeObserver(size).observe(document.querySelector('.projectbar'));new ResizeObserver(size).observe(document.querySelector('.topbar'));new ResizeObserver(size).observe(footer);new ResizeObserver(size).observe(document.querySelector('main.shell'));requestAnimationFrame(size);
 function remove(e){observer.unobserve(e.element);entries.delete(e.id);if(active===e){lastFocused=api(e)?.snapshot()||e.seed;active=null;}e.element.remove();}
 function discardDrafts(except){for(const e of entries.values())if(e!==except&&!e.seed.selected)remove(e);}
 function arrange(){
  if(busyEntries.size)return;
  const rank=new Map(order.map((name,i)=>[name,i]));
  const sorted=[...entries.values()].sort((a,b)=>{if(!a.seed.selected)return b.seed.selected?1:0;if(!b.seed.selected)return -1;return (rank.get(a.seed.selected)??order.length)-(rank.get(b.seed.selected)??order.length)||comparePipelineJobs({name:a.seed.selected},{name:b.seed.selected});});
  // Never reinsert an unchanged iframe: moving it can reload its document.
  sorted.forEach((e,i)=>{if(feed.children[i]!==e.element)feed.insertBefore(e.element,feed.children[i]||null);});
 }
 function mount(e){if(e.frame)return;const frame=document.createElement('iframe');frame.title=(e.seed.selected||e.seed.title+' · new job')+' workspace';frame.src='/?workspace='+e.id;frame.name=e.id;frame.className='job-workspace';e.frame=frame;e.element.replaceChildren(frame);}
 function create(seed){const id='workspace-'+(++sequence),element=document.createElement('section');element.className='workspace-entry';element.dataset.entry=id;const e={id,element,frame:null,seed:structuredClone(seed),visible:false};entries.set(id,e);const heading=document.createElement('h2');heading.textContent=seed.selected||seed.title;const button=document.createElement('button');button.textContent='Open workspace';button.onclick=()=>{discardDrafts();focus(e,true,true);};element.append(heading,button);feed.append(element);observer.observe(element);return e;}
 function focus(e,scroll=true,centerRow=false){if(e!==active){const previous=active?(api(active)?.snapshot()||active.seed):lastFocused;if(previous){e.seed.tab=switchedTab(previous,e.seed);if(api(e)?.selectTab)api(e).selectTab(e.seed.tab);else e.pendingTab=true;}}active=e;mount(e);lastFocused=api(e)?.snapshot()||e.seed;for(const p of entries.values()){p.element.classList.toggle('active-workspace',p===e);api(p)?.active?.(p===e);}onActivate(api(e)?.snapshot()||e.seed,!scroll,centerRow);if(scroll)feed.scrollTo({top:e.element.offsetTop,behavior:!e.seed.selected||matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}
 function open(seed){let e=seed.selected?[...entries.values()].find(x=>x.seed.selected===seed.selected):(!fresh&&active&&!active.seed.selected?active:null);fresh=false;
  if(seed.selected)discardDrafts();else discardDrafts(e);
  if(!e)e=create(seed);else if(!e.frame&&!seed.needsLoad)e.seed=structuredClone(seed);
  arrange();if(e!==active)focus(e);return e;
 }
 function sync(jobs){
  if(busyEntries.size){pendingJobs=jobs;return;}
  const top=feed.scrollTop||0,anchor=[...feed.children].find(el=>el.offsetTop+el.offsetHeight>top),offset=anchor?anchor.offsetTop-top:0;
  order=jobs.map(j=>j.name);const names=new Set(order);
  for(const e of entries.values())if(e.seed.selected){if(names.has(e.seed.selected))e.awaitingRegistration=false;else if(!e.awaitingRegistration)remove(e);}
  const present=new Set([...entries.values()].map(e=>e.seed.selected));
  for(const job of jobs)if(!present.has(job.name))create({type:job.type,selected:job.name,title:job.title||job.name,values:{},needsLoad:true});
  arrange();if(anchor?.isConnected){const target=anchor.offsetTop-offset;if(Math.abs(feed.scrollTop-target)>.5)feed.scrollTop=target;}
 }
 window.relionFeedSeed=id=>entries.has(id)?structuredClone(entries.get(id).seed):null;
 window.relionFeedReady=id=>{const e=entries.get(id);if(!e)return;e.maskReady?.();if(e.pendingTab){api(e)?.selectTab?.(e.seed.tab);e.pendingTab=false;}api(e)?.theme(theme());if(latestDefaults)api(e)?.defaults(...latestDefaults);api(e)?.visibility(e.visible&&!paused);api(e)?.active?.(e===active);if(e===active){onActivate(api(e).snapshot());api(e)?.connection(latestConnection);}if(startupReveal===e)revealStartup(e,true);};
 window.relionFeedActivate=(id,reason)=>{if(reason==='pointerdown'||reason==='input')startupReveal=null;const e=entries.get(id);if(e){if(e.seed.selected)discardDrafts();focus(e,false,reason!=='input');}};
 window.relionFeedChanged=(id,snapshot)=>{const e=entries.get(id);if(!e)return;if(!e.seed.selected&&snapshot.selected)e.awaitingRegistration=true;e.seed=structuredClone(snapshot);if(snapshot.selected)for(const other of entries.values())if(other!==e&&other.seed.selected===snapshot.selected)remove(other);e.frame.title=(snapshot.selected||snapshot.title+' · new job')+' workspace';arrange();if(e===active)onActivate(snapshot);onChanged();};
 window.relionFeedNew=(id,snapshot)=>{const e=entries.get(id);if(!e)return;focus(e,false);fresh=true;onNew(snapshot);};
 window.relionFeedBusy=(id,value)=>{if(!entries.has(id))return;if(value){const e=entries.get(id);submissionPositions.set(id,{entry:e,offset:feed.scrollTop-e.element.offsetTop});busyEntries.add(id);}else busyEntries.delete(id);for(const e of entries.values())e.element.inert=busyEntries.size>0&&!busyEntries.has(e.id);onBusy(busyEntries.size>0);if(!busyEntries.size){if(pendingJobs){const jobs=pendingJobs;pendingJobs=null;sync(jobs);}else arrange();}
 if(!value){const position=submissionPositions.get(id);submissionPositions.delete(id);if(position)requestAnimationFrame(()=>requestAnimationFrame(()=>{
 if(active===position.entry&&position.entry.element.isConnected)feed.scrollTo({top:position.entry.element.offsetTop+position.offset,behavior:'instant'});
 }));}
 };
 function revealStartup(e,complete=false){
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
   if(startupReveal!==e||active!==e||!e.element.isConnected)return;
   size();feed.scrollTo({top:e.element.offsetTop,behavior:'instant'});
   onActivate(api(e)?.snapshot()||e.seed,false,true);
   if(complete)startupReveal=null;
  }));
 }
 return {open,sync,revealInitialSelection(name){
 const e=[...entries.values()].find(e=>e.seed.selected===name);if(!e)return;
 startupReveal=e;active=e;mount(e);revealStartup(e,!!api(e));
 },async continueWithMask(name,maskJob){
 const entry=[...entries.values()].find(e=>e.seed.selected===name);if(!entry)throw Error('Refinement job is no longer in the pipeline.');
 focus(entry,true,true);
 if(!api(entry)?.continueWithMask)await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{entry.maskReady=null;reject(Error('Refinement editor did not become ready. Please try again.'));},20000);entry.maskReady=()=>{clearTimeout(timer);entry.maskReady=null;resolve();};});
 return api(entry).continueWithMask(maskJob);
 },continueManually(name){const entry=[...entries.values()].find(e=>e.seed.selected===name);const editor=entry&&api(entry);if(!editor?.continueManually)throw Error('The job editor is still loading. Please try again when it is ready.');focus(entry);return editor.continueManually(name);},state(next){for(const e of entries.values())if(e.visible)api(e)?.state?.(next)?.catch(error=>console.warn('Workspace state refresh failed:',error));},discardDraft(){discardDrafts();arrange();},draft(){const e=[...entries.values()].find(e=>!e.seed.selected);return e?(api(e)?.snapshot()||e.seed):null;},focusDraft(){const e=[...entries.values()].find(e=>!e.seed.selected);if(e)focus(e);},newDraft(){fresh=true;},findJob(name){discardDrafts();const e=[...entries.values()].find(x=>x.seed.selected===name);if(!e)return false;focus(e);return true;},theme(){for(const e of entries.values())api(e)?.theme(theme());},lock(value){for(const e of entries.values())e.element.inert=value;},defaults(values,revision){latestDefaults=[values,revision];for(const e of entries.values())api(e)?.defaults(values,revision);},pause(value){paused=value;for(const e of entries.values())api(e)?.visibility(e.visible&&!paused);},connection(edge){latestConnection=edge;if(active)api(active)?.connection(edge);},selection(names){if(active)api(active)?.selection(names);},refresh(){return Promise.all([...entries.values()].filter(e=>e.visible).map(e=>api(e)?.refresh()));}};
}

// A scheduled step can seed a follow-up even when later jobs already exist.
export function nextJobSource(jobs,selected){
 const job=jobs.find(j=>j.name===selected);
 if(!job)return null;
 return job.status==='Scheduled'||[...jobs].sort(comparePipelineJobs).at(-1)?.name===selected?job:null;
}

export function suggestedNextJob(job,values,layout,mode='spa'){
 const name=layout.find(l=>l.id===job?.type)?.name;
 let next=({'Screening':'Import','Motion correction':'CTF estimation','Manual picking':'Particle extraction','Auto-picking':'Particle extraction','Particle extraction':'2D classification','2D classification':'Subset selection','3D initial reference':'3D classification','3D initial helical reference':'3D classification','3D classification':'Subset selection','3D auto-refine':'Mask creation','Mask creation':'Post-processing','Mask re-scaling':'Post-processing','CTF refinement':'3D auto-refine','Bayesian polishing':'3D auto-refine','Post-processing':'Local resolution'})[name];
 if(mode==='tomo')next=({'Import tilt series':values.images_are_motion_corrected==='Yes'?'CTF estimation':'Motion correction','CTF estimation':'Exclude tilt-images','Exclude tilt-images':'Align tilt-series','Align tilt-series':'Reconstruct tomograms','Reconstruct tomograms':'Pick tomograms','Denoise tomograms':'Pick tomograms','Pick tomograms':'Extract subtomos','Extract subtomos':'3D initial reference','Reconstruct particle':'3D auto-refine','Subset selection':'3D auto-refine'})[name]||next;
 else{if(name==='Import')next=values.do_other==='Yes'?null:(job.importMovies==='No'||values.is_multiframe==='No'?'CTF estimation':'Motion correction');if(name==='CTF estimation')next='Auto-picking';if(name==='Auto-picking'&&(job.topazTraining||(values.do_topaz==='Yes'&&values.do_topaz_train==='Yes')))next='Auto-picking';if(name==='Subset selection')next=(values.fn_model||'').includes('Class3D/')?'3D auto-refine':values.fn_model?'3D initial reference':null;}
 if(mode==='tomo'&&name==='Denoise tomograms'&&values.do_cryocare_train==='Yes')next='Denoise tomograms';
 if(name==='3D auto-refine')next=String(job.refinementMask??values.fn_mask??'').trim()?'Post-processing':'Mask creation';
 if(name==='Bayesian polishing'&&values.do_param_optim==='Yes')next='Bayesian polishing';
 return layout.find(l=>l.name===next)||null;
}

// The explicit next-step action takes its class input from that job, not a
// previous Subset selection draft or an asynchronously refreshed node index.
export function nextJobInputs(source,target,jobs=[],layout=[],sourceValues={}){
 if(target?.name==='Reconstruct tomograms'&&source){
  const sourceType=layout.find(l=>l.id===source.type)?.name;
  if(sourceType==='Align tilt-series'||Number(source.type)===55){
   const outputs=[...new Set((source.outputs||[]).map(file=>{
    const alias=source.alias&&source.alias!=='None'?source.alias.replace(/\/$/,'')+'/':null;
    return alias&&file.startsWith(alias)?source.name.replace(/\/$/,'')+'/'+file.slice(alias.length):file;
   }))];
   const aligned=outputs.filter(file=>/(?:^|\/)aligned_tilt_series\.star$/i.test(file));
   if(aligned.length===1)return {in_tiltseries:aligned[0]};
  }
 }

 if(target?.name==='Exclude tilt-images'){
  if(![50,1,2,55,57].includes(Number(source?.type)))return {};
  const file=(source.outputs||[]).find(f=>/(?:^|[/_])tilt_series(?:_[^/]*)?\.star$/i.test(f));
  return file?{in_tiltseries:file}:{};
 }

 if(source&&target?.name==='Post-processing'&&layout.find(l=>l.id===source.type)?.name==='Mask re-scaling'){
  const mask=(source.outputs||[]).find(f=>/\/rescaled_mask\.mrc$/i.test(f));
  return mask?{fn_mask:mask}:{};
 }
 if(source&&layout.find(l=>l.id===source.type)?.name==='Reconstruct particle'
  &&['3D auto-refine','3D classification'].includes(target?.name)
  &&Object.values(target.tabs||{}).some(keys=>keys.includes('in_optimisation'))){
  const result={},outputs=source.outputs||[];
  const optimisation=sourceValues.use_direct_entries!=='Yes'?sourceValues.in_optimisation:'';
  if(optimisation)Object.assign(result,{in_optimisation:optimisation,use_direct_entries:'No',in_particles:'',in_tomograms:'',in_trajectories:''});
  else if(sourceValues.use_direct_entries==='Yes'){
   Object.assign(result,{in_optimisation:'',use_direct_entries:'Yes'});
   for(const key of ['in_particles','in_tomograms','in_trajectories'])result[key]=sourceValues[key]||'';
  }
  const map=nextJobInputs(source,{name:'Mask creation'}).fn_in;
  if(map)result.fn_ref=map;
  if(sourceValues.sym_name)result.sym_name=sourceValues.sym_name;
  return result;
 }
 if(source&&layout.find(l=>l.id===source.type)?.name==='Extract subtomos'
  &&['3D initial reference','Reconstruct particle'].includes(target?.name)
  &&Object.values(target.tabs||{}).some(keys=>keys.includes('in_optimisation'))){
  const outputs=source.outputs||[],result={};
  const optimisation=outputs.find(f=>/(?:^|\/)optimisation_set\.star$/i.test(f));
  if(optimisation)Object.assign(result,{in_optimisation:optimisation,use_direct_entries:'No',in_particles:'',in_tomograms:'',in_trajectories:''});
  else{
   const particles=outputs.find(f=>/(?:^|\/)particles\.star$/i.test(f));
   if(particles)Object.assign(result,{in_optimisation:'',use_direct_entries:'Yes',in_particles:particles,in_tomograms:sourceValues.in_tomograms||'',in_trajectories:sourceValues.in_trajectories||''});
  }
  const keys=Object.values(target.tabs||{}).flat();
  for(const key of ['binning','box_size','crop_size'])if(keys.includes(key)&&sourceValues[key]!==undefined)result[key]=sourceValues[key];
  return result;
 }
 if(source&&target?.name==='Denoise tomograms'){
  const model=(source.outputs||[]).find(f=>/denoising_model\.tar\.gz$/i.test(f));
  return {do_cryocare_train:'No',do_cryocare_predict:'Yes',...(model?{care_denoising_model:model}:{})};
 }

 if(source?.topazTraining&&target?.name==='Auto-picking'){
  return {do_topaz:'Yes',do_topaz_train:'No',do_topaz_pick:'Yes',do_refs:'No',do_log:'No',continue_manual:'No',topaz_model:source.topazModel||'',...(source.topazInput?{fn_input_autopick:source.topazInput}:{})};
 }

 if(source&&target?.name==='Bayesian polishing'){
  const params=(source.outputs||[]).find(f=>/(?:^|\/)opt_params[^/]*\.txt$/i.test(f));
  return {do_param_optim:'No',do_polish:'Yes',...(params?{opt_params:params}:{})};
 }

 if(['3D auto-refine','3D classification'].includes(target?.name)){
  const outputs=source?.outputs||[];
  const particles=outputs.find(f=>/(?:^|\/)particles_ctf_refine\.star$/i.test(f))
   ||outputs.find(f=>/(?:^|\/)shiny\.star$/i.test(f))
   ||outputs.find(f=>/(?:^|\/)particles\.star$/i.test(f));
  const tomo=target.mode==='tomo'||Object.values(target.tabs||{}).some(keys=>keys.includes('in_particles'));
  const result=particles?(tomo?{in_particles:particles,use_direct_entries:'Yes',in_optimisation:''}:{fn_img:particles}):{};
  const refinements=jobs.filter(j=>['Succeeded','Running','Scheduled'].includes(j.status)&&layout.find(l=>l.id===j.type)?.name==='3D auto-refine')
   .sort((a,b)=>comparePipelineJobs(b,a));
  for(const job of refinements){
   const map=nextJobInputs(job,{name:'Mask creation'}).fn_in;
   if(map){result.fn_ref=map;break;}
  }
  return result;
 }

 if(target?.name==='Mask creation'){
  const outputs=source?.outputs||[];
  // Prefer the combined final reconstruction; otherwise use the first
  // unfiltered half map. Only select declared outputs, never invent a path.
  const map=outputs.find(f=>/(?:^|\/)run_class001\.mrc$/i.test(f))
   ||outputs.find(f=>/_half1_class001_unfil\.mrc$/i.test(f))
   ||outputs.find(f=>/_half1_class001\.mrc$/i.test(f))
   ||outputs.find(f=>/_class001\.mrc$/i.test(f))
   ||outputs.find(f=>/(?:^|\/)merged\.mrc$/i.test(f))
   ||outputs.find(f=>/(?:^|\/)half1\.mrc$/i.test(f));
  return map?{fn_in:map}:{};
 }
 if(target?.name!=='Subset selection')return {};
 const optimisers=(source?.outputs||[]).filter(file=>/_optimiser\.star$/i.test(file))
  .sort((a,b)=>Number(b.match(/_it(\d+)_/)?.[1]||0)-Number(a.match(/_it(\d+)_/)?.[1]||0));
 if(optimisers.length)return {fn_model:optimisers[0],fn_mic:'',fn_data:''};
 const tiltSeries=(source?.outputs||[]).find(f=>/(?:^|\/)corrected_tilt_series\.star$/i.test(f));
 if(tiltSeries)return {fn_model:'',fn_mic:tiltSeries,fn_data:''};
 const mics=(source?.outputs||[]).find(f=>/(?:^|\/)(?:corrected_)?micrographs(?:_selected|_ctf)?\.star$/i.test(f));
 return mics?{fn_model:'',fn_mic:mics,fn_data:''}:{};
}

export function motionSplitDefault(layout,values){return layout?.mode==='tomo'&&layout.name==='Motion correction'&&['Yes','No'].includes(values.do_even_odd_split)?(values.do_even_odd_split==='Yes'?'No':'Yes'):null;}

export function canContinueAutopick(job,values,layout){
 return job?.status==='Succeeded'&&layout?.name==='Auto-picking'&&values.continue_manual!==undefined&&!job.topazTraining&&!(values.do_topaz==='Yes'&&values.do_topaz_train==='Yes');
}
