import {browserSelectionNote} from './browser-selection-note.mjs';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {checkCommands,mpiEnvironment,checkMpiLauncher} from './executables.mjs';
import {settingsStar} from './settings.mjs';
export class NativeAdapter {
  constructor(project, bridge, env=process.env) { this.project=project; this.bridge=bridge; this.env=mpiEnvironment(env); this.pending=Promise.resolve(); }
  call(args) {
    const work = async () => {
      // Background RELION descendants may inherit bridge stdout/stderr.
      // Pipe "close" then waits for the calculation, blocking every queued API
      // call. Capture in files and await the bridge's own exit instead.
      const base=path.join(this.project,'.reliondeluxe');
      await fs.mkdir(base,{recursive:true,mode:0o700});
      const dir=await fs.mkdtemp(path.join(base,'bridge-'));
      let out,err;
      try {
        out=await fs.open(path.join(dir,'stdout'),'wx',0o600);
        err=await fs.open(path.join(dir,'stderr'),'wx',0o600);
        const code=await new Promise((resolve,reject)=>{
          const proc=spawn(this.bridge,args,{cwd:this.project,env:this.env,shell:false,detached:true,stdio:['ignore',out.fd,err.fd]});
          proc.once('error',reject);
          // No timeout: never kill a bridge while it may own a pipeline lock.
          proc.once('exit',resolve);
        });
        const readTail=async(handle,limit)=>{
          const {size}=await handle.stat();
          if(!size)return '';
          const buffer=Buffer.alloc(Math.min(size,limit));
          const {bytesRead}=await handle.read(buffer,0,buffer.length,Math.max(0,size-limit));
          return buffer.subarray(0,bytesRead).toString('utf8');
        };
        // Reopen for reading; inherited write descriptors remain independent.
        const read=async(file,limit)=>{
          const handle=await fs.open(path.join(dir,file),'r');
          try{return await readTail(handle,limit);}finally{await handle.close();}
        };
        const stdout=await read('stdout',8e6),stderr=await read('stderr',100000);
        if(code!==0)throw new Error(stderr || stdout || `Native bridge exited ${code}`);
        try {
          const marker='@@RELIONDELUXE@@',i=stdout.lastIndexOf(marker);
          return JSON.parse(i<0?stdout:stdout.slice(i+marker.length));
        } catch {
          throw new Error(`Unrecognized bridge output: ${stdout.slice(-2000)}\n${stderr}`);
        }
      } finally {
        await Promise.all([out?.close(),err?.close()]);
        await fs.rm(dir,{recursive:true,force:true});
      }
    };
    const result=this.pending.then(work,work);this.pending=result.catch(()=>{});return result;
  }
  async submit(action,layout,schema,values,existing,alias,planning={}) {
    if(['Pick tomograms','Exclude tilt-images'].includes(layout.name)&&action==='schedule')throw Error('This browser job is interactive. Use Run to open its editor; schedule downstream jobs after saving the selection.');
    if(action==='browser-tomo'&&!(await this.call(['capabilities'])).browserTomoPicking)throw Error('Rebuild the native bridge to enable browser tomography picking.');
    if(action==='browser-exclude'&&!(await this.call(['capabilities'])).browserTiltExclusion)throw Error('Rebuild the native bridge to enable browser tilt exclusion.');
    const browserTomo=layout.name==='Pick tomograms'&&!values.in_star_file?.trim()&&['preview','browser-tomo'].includes(action);
    if(browserTomo&&!(await this.call(['capabilities'])).browserTomoRegistration)throw Error('Rebuild the native bridge from this release to enable version-independent browser tomography picking.');
    if(!browserTomo)await checkMpiLauncher({...Object.fromEntries(schema.options.map(f=>[f.key,f.default])),...values},{cwd:this.project,env:this.env});
    const dir=path.join(this.project,'.reliondeluxe');await fs.mkdir(dir,{recursive:true,mode:0o700});
    const file=path.join(dir,`${randomUUID()}.star`);
    await fs.writeFile(file,settingsStar(layout,schema,values),{mode:0o600,flag:'wx'});
    try{
      const clone=planning.continuation;
      const preview=await this.call(clone?['clone-preview',file,clone.source,clone.target]:[browserTomo?'browser-tomo-preview':'preview',file,existing||'',alias||'']).catch(e=>{if(clone&&/Unsupported action/.test(e.message))throw Error('Rebuild the native adapter for clone continuations (see README), then restart the server.');throw e;});
      const defaults=Object.fromEntries(schema.options.map(f=>[f.key,f.default]));
      const binaries=browserTomo?{checks:[],missing:[]}:await checkCommands(preview,{...defaults,...values},{cwd:this.project,env:this.env});
      if(action==='preview')return {...preview,...binaries};
      if(action!=='schedule'&&action!=='browser-select'&&action!=='browser-pick'&&action!=='browser-tomo'&&action!=='browser-exclude'&&binaries.missing.length)throw new Error('Cannot launch: executable(s) not found in server PATH: '+binaries.missing.join(', ')+'. Activate the RELION environment before starting the server.');
      if(clone&&action!=='schedule')throw Error('New clone continuations must be scheduled.');
      const result=await this.call(clone?['clone-schedule',file,clone.source,clone.target]:[action,file,existing||'',alias||'']).catch(e=>{if(['browser-select','browser-pick'].includes(action)&&/Unsupported action|Unknown job|Expected manual picking job/.test(e.message))throw Error('Rebuild the native adapter for browser interactive jobs (see README), then restart the server.');throw e;});
      if(['browser-select','browser-exclude'].includes(action)&&result.name)try{await browserSelectionNote(this.project,result.name,preview,action==='browser-exclude'?'excluder.html':'gallery.html');}catch(e){result.warning=[result.warning,'Browser selection started, but note.txt could not be written: '+e.message].filter(Boolean).join('\n');}
      return {...result,binaries:binaries.checks};
    }finally{await fs.unlink(file);}
  }
}
