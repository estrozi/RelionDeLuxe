import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {preflight,starRules} from '../lib/preflight.mjs';
import {parseStar} from '../lib/gallery.mjs';
test('extraction reads coordinate_files after general, supports unnamed legacy, rejects missing labels',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'coords-block-'));
 try{
  const file='autopick.star',labels=['rlnMicrographName','rlnMicrographCoordinates'];
  assert.equal(starRules('Particle extraction','coords_suffix','MicrographCoordsGroup',{} )[0].block,'coordinate_files');
  for(const [block,missing] of [['coordinate_files',false],['',false],['coordinate_files',true]]){
   await fs.writeFile(path.join(root,file),(block?'data_general\n_rlnMicrographPickType particles\n':'')+'data_'+block+'\nloop_\n_rlnMicrographName\n'+(missing?'':'_rlnMicrographCoordinates\n')+'mic.mrc'+(missing?'':' picks.star')+'\n');
   const adapter={submit:async()=>({jobName:'Extract/job005/',inputs:[{name:file,type:'MicrographCoordsGroup'}]}),call:async args=>{
    if(args[0]==='state')return {counter:5,jobs:[]};
    const blocks=parseStar(await fs.readFile(args[1],'utf8'));
    const b=args[2]?blocks.find(b=>b.name===args[2]):blocks.find(b=>b.tables.length||Object.keys(b.values).length),t=b?.tables[0];
    return {rows:t?.rows.length||0,labels:t?.labels||[]};
   }};
   const result=await preflight({project:root,adapter,layout:{name:'Particle extraction'},schema:{options:[]},values:{}});
   assert.equal(result.report.some(r=>r.severity==='warning'),missing,JSON.stringify(result.report));
  }
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
