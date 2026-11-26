import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {hasMatchingFile} from '../lib/file-pattern.mjs';
import {preflight} from '../lib/preflight.mjs';
test('Input patterns work without fs.glob: wildcards, alternatives, recursive symlinks and regular files',async()=>{
 const project=await fs.mkdtemp(path.join(os.tmpdir(),'patterns-')),original=fs.glob;fs.glob=undefined;
 try{
  await fs.mkdir(path.join(project,'Movies','nested'),{recursive:true});await fs.mkdir(path.join(project,'Movies','directory.tiff'));
  await fs.writeFile(path.join(project,'Movies','movie1.tiff'),'fixture');await fs.writeFile(path.join(project,'Movies','nested','movie2.eer'),'fixture');await fs.writeFile(path.join(project,'Movies','.hidden.mrc'),'fixture');
  await fs.symlink(path.join(project,'Movies'),path.join(project,'linked'));await fs.symlink(path.join(project,'Movies'),path.join(project,'Movies','nested','loop'));await fs.symlink('/does-not-exist',path.join(project,'Movies','dangling'));
  for(const pattern of ['Movies/*.tiff','Movies/movie?.tiff','Movies/movie[1-3].tiff','Movies/movie[!2].tiff','Movies/*.{mrc,tiff}','linked/**/*.eer','Movies/**','Movies/.*.mrc'])assert.equal(await hasMatchingFile(path.join(project,pattern)),true,pattern);
  for(const pattern of ['Movies/missing*.tiff','Movies/movie[!1].tiff','Movies/*.mrc','Movies/**/missing.eer','Movies/directory*','Movies/dangling'])assert.equal(await hasMatchingFile(path.join(project,pattern)),false,pattern);
  const adapter={call:async()=>({counter:1,jobs:[]}),submit:async()=>({jobName:'Import/job001/',inputs:[]})};
  const args={project,adapter,layout:{name:'Import'},schema:{options:[{key:'fn_in_raw',type:2,default:''}]},values:{fn_in_raw:'linked/**/*.eer'},action:'schedule'};
  let result=await preflight(args);assert(result.report.some(r=>r.severity==='info'&&r.message.includes('has matches')));
  result=await preflight({...args,values:{fn_in_raw:'Movies/missing*.tiff'}});assert(result.report.some(r=>r.severity==='warning'&&r.message.includes('does not match')));
 }finally{fs.glob=original;await fs.rm(project,{recursive:true,force:true});}
});
