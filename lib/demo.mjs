// Explicitly simulated data. No cryo-EM calculations, files or native jobs.
export class DemoAdapter {
 constructor(catalog,layout) {
  this.catalog=catalog;this.layout=layout;this.counter=5;this.values=new Map();this.trash=new Map();
  if(layout.some(l=>l.mode==='tomo')){this.jobs=[];this.counter=1;return;}
  this.jobs=[
   {name:'Import/job001/',alias:'Import/movies/',type:0,status:'Succeeded',inputs:[],outputs:['Import/job001/movies.star']},
   {name:'MotionCorr/job002/',alias:'MotionCorr/align/',type:1,status:'Succeeded',inputs:['Import/job001/movies.star'],outputs:['MotionCorr/job002/corrected_micrographs.star','MotionCorr/job002/logfile.pdf']},
   {name:'CtfFind/job003/',alias:'None',type:3,status:'Running',inputs:['MotionCorr/job002/corrected_micrographs.star'],outputs:['CtfFind/job003/micrographs_ctf.star']},
   {name:'Class2D/job004/',alias:'None',type:6,status:'Scheduled',inputs:['Extract/job005/particles.star'],outputs:[]}
  ];
  // Resolve demonstration IDs by official job names instead of assuming enum numbering.
  ['Import','Motion correction','CTF estimation','2D classification'].forEach((name,i)=>this.jobs[i].type=layout.find(x=>x.name===name).id);
  const sample=[{fn_in_raw:'Movies/*.tiff',angpix:'0.885',kV:'200',Cs:'1.4'},{input_star_mics:'Import/job001/movies.star',dose_per_frame:'1.277',nr_threads:'12',fn_gain_ref:'Movies/gain.mrc',patch_x:'5',patch_y:'5'},{input_star_mics:'MotionCorr/job002/corrected_micrographs.star'},{fn_img:'Extract/job005/particles.star'}];
  this.jobs.forEach((j,i)=>this.values.set(j.name,{...Object.fromEntries(catalog.find(s=>s.id===j.type).options.map(f=>[f.key,f.default])),...sample[i]}));
 }
 trashEntries(){return [...this.trash].map(([manifest,batch])=>({manifest,modified:batch.modified}));}
 deletePlan(name,recursive){
  const selected=new Set(Array.isArray(name)?name:[name]);let changed=true;
  while(changed){changed=false;for(const job of this.jobs)if(!selected.has(job.name)&&job.inputs.some(input=>this.jobs.some(parent=>selected.has(parent.name)&&parent.outputs.includes(input)))){if(recursive){selected.add(job.name);changed=true;}}}
  const jobs=this.jobs.filter(j=>selected.has(j.name));const blocked=[];
  if(!recursive&&this.jobs.some(j=>!selected.has(j.name)&&j.inputs.some(input=>jobs.some(parent=>parent.outputs.includes(input)))))blocked.push('This job has downstream dependents. Choose recursive deletion.');
  for(const j of jobs){if(j.status==='Running')blocked.push('Running job must stop first: '+j.name);if([...this.trash.values()].some(b=>b.jobs.some(x=>x.name===j.name)))blocked.push('Trash already contains '+j.name);}
  return {jobs:jobs.map(({name,alias,status})=>({name,alias,status})),blocked};
 }
 restorePlan(manifest){
  const batch=this.trash.get(manifest);if(!batch)throw new Error('Unknown Trash group');
  return {jobs:batch.jobs.map(({name,alias,status})=>({name,alias,status})),blocked:batch.jobs.filter(j=>this.jobs.some(x=>x.name===j.name||(j.alias!=='None'&&x.alias===j.alias))).map(j=>'Restore destination or alias exists: '+j.name)};
 }
 async call([action,name,arg,expected]) {
  if(action==='schema')return this.catalog;
  if(['state','refresh'].includes(action))return {counter:this.counter,jobs:this.jobs,nodes:this.jobs.flatMap(j=>j.outputs.map(name=>({name,type:name.endsWith('movies.star')?'MicrographMovieGroupMetadata.star.relion':name.endsWith('.pdf')?'LogFile.pdf':'MicrographGroupMetadata.star.relion'})))};
  if(action==='init')return {};
  if(action==='restore-plan')return this.restorePlan(name);
  if(action==='undelete'){
   const plan=this.restorePlan(name);if(plan.blocked.length||plan.jobs.map(j=>j.name).join(',')!==arg)throw new Error('Restore blocked or scope changed');
   this.jobs.push(...this.trash.get(name).jobs);this.trash.delete(name);return {};
  }
  if(action==='delete-many-plan'||action==='delete-many'){
   const roots=name.split(',');if(roots.some(n=>!this.jobs.some(j=>j.name===n)))throw new Error('Unknown demo job');
   const plan=this.deletePlan(roots,arg==='true');if(action==='delete-many-plan')return plan;
   if(plan.blocked.length||plan.jobs.map(j=>j.name).join(',')!==expected)throw new Error('Deletion blocked or scope changed');
   const names=new Set(plan.jobs.map(j=>j.name)),jobs=this.jobs.filter(j=>names.has(j.name));
   this.trash.set('Trash/'+jobs[0].name+'deleted_pipeline.star',{jobs,modified:new Date().toISOString()});this.jobs=this.jobs.filter(j=>!names.has(j.name));return {};
  }
  const j=this.jobs.find(x=>x.name===name);if(!j)throw new Error('Unknown demo job');
  if(action==='job')return {type:j.type,values:this.values.get(name)||Object.fromEntries(this.catalog.find(s=>s.id===j.type).options.map(f=>[f.key,f.default]))};
  if(action==='delete-plan')return this.deletePlan(name,arg==='true');
  if(action==='delete'){
   const plan=this.deletePlan(name,arg==='true');if(plan.blocked.length||plan.jobs.map(j=>j.name).join(',')!==expected)throw new Error('Deletion blocked or scope changed');
   const names=new Set(plan.jobs.map(j=>j.name));const jobs=this.jobs.filter(j=>names.has(j.name));
   this.trash.set('Trash/'+jobs[0].name+'deleted_pipeline.star',{jobs,modified:new Date().toISOString()});
   this.jobs=this.jobs.filter(j=>!names.has(j.name));return {};
  }
  if(action==='abort'){if(j.status!=='Running')throw new Error('Only running jobs can be aborted');j.status='Aborted';}
  else if(action==='alias')j.alias=arg ? name.split('/')[0]+'/'+arg+'/' : 'None';
  else if(action==='mark-success')j.status='Succeeded';
  else if(action==='mark-failed')j.status='Failed';
  else throw new Error('This action is not simulated.');
  return {};
 }
 async submit(action,layout,schema,values,existing,alias) {
  if(action==='preview')return {command:'DEMO — native command preview requires the RELION bridge. No executable command is generated here.',commands:[]};
  let j=this.jobs.find(x=>x.name===existing);
  if(j?.status==='Running')throw new Error('Already running');
  if(!j){const dir=layout.directory||({'Motion correction':'MotionCorr','CTF estimation':'CtfFind','2D classification':'Class2D'})[layout.name]||layout.name.replace(/[^A-Za-z0-9]/g,'');j={name:`${dir}/job${String(this.counter++).padStart(3,'0')}/`,type:layout.id,alias:'None',inputs:[],outputs:[]};this.jobs.push(j);}
  this.values.set(j.name,{...values});if(alias)j.alias=j.name.split('/')[0]+'/'+alias+'/';
  j.status=action==='schedule'?'Scheduled':'Running';
  if(j.status==='Running'){const timer=setTimeout(()=>{if(j.status==='Running')j.status='Succeeded';},4500);timer.unref();}
  return {name:j.name,warning:'Simulated only. No computation was performed.'};
 }
}
