import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {commandBlocks,normalizedCommands,duplicateJobs,duplicateApproval} from '../lib/duplicates.mjs';
const command=(out,input='Extract/job001/particles.star')=>`relion_refine --i ${input} --o ${out}run --j 8 --pipeline_control ${out}`;
const notes=c=>`User note\n ++++ Executing new job on date\n ++++ with the following command(s): \n${c}\n ++++ \nmore notes\n`;
test('Recorded commands normalize only their own output directory and retain quoted whitespace',()=>{
 assert.deepEqual(commandBlocks(notes('first\nsecond')), [['first','second']]);
 assert.equal(normalizedCommands([command('Class2D/job002/')],'Class2D/job002/'),normalizedCommands([command('Class2D/job003/')],'Class2D/job003/'));
 assert.notEqual(normalizedCommands([command('Class2D/job003/','Extract/job004/particles.star')],'Class2D/job003/'),normalizedCommands([command('Class2D/job002/')],'Class2D/job002/'));
 assert.notEqual(normalizedCommands(['x --label "a  b"']),normalizedCommands(['x --label "a b"']));
});
test('Duplicate search requires execution history, same saved parameters and commands, excluding the current job',async()=>{
 const project=await fs.mkdtemp(path.join(os.tmpdir(),'duplicates-'));
 try{
  const jobs=[{name:'Class2D/job002/',type:8,status:'Succeeded',alias:'None'},{name:'Class2D/job003/',type:8,status:'Scheduled',alias:'None'}];
  for(const j of jobs)await fs.mkdir(path.join(project,j.name),{recursive:true});
  await fs.writeFile(path.join(project,jobs[0].name,'note.txt'),notes(command(jobs[0].name)));
  const values={fn_img:'Extract/job001/particles.star',nr_threads:'8',nr_mpi:'1'};
  const schema={options:Object.keys(values).map(key=>({key,default:values[key]}))};
  const adapter={call:async args=>args[0]==='state'?{jobs,counter:4}:{values},submit:async()=>({commands:[command('Class2D/job004/')]})};
  const options={project,adapter,layout:{id:8},schema,values};
  assert.deepEqual((await duplicateJobs(options)).map(m=>m.name),[jobs[0].name]);
  assert.deepEqual(await duplicateJobs({...options,values:{...values,nr_mpi:'2'}}),[]);
  assert.deepEqual(await duplicateJobs({...options,existing:jobs[0].name}),[]);
  await fs.rename(path.join(project,jobs[0].name,'note.txt'),path.join(project,jobs[0].name,'notes.txt'));
  assert.equal((await duplicateJobs(options)).length,1);
  adapter.submit=async()=>({commands:[command('Class2D/job004/','Extract/job099/particles.star')]});assert.deepEqual(await duplicateJobs(options),[]);
  assert.notEqual(duplicateApproval(values,jobs),duplicateApproval({...values,nr_threads:'9'},jobs));
 }finally{await fs.rm(project,{recursive:true,force:true});}
});
