import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
import {NativeAdapter} from '../lib/native.mjs';import {browserSelection,selectionSnapshot} from '../lib/browser-selection.mjs';import {parseStar} from '../lib/gallery.mjs';
test('Only simple interactive selection uses the browser',()=>{assert(browserSelection({fn_model:'x'}));for(const key of ['do_remove_duplicates','do_filaments','do_dominant_3d','do_class_ranker','do_select_values','do_discard','do_split','do_recenter','do_regroup','do_queue'])assert(!browserSelection({fn_model:'x',[key]:'Yes'}));assert(!browserSelection({fn_model:'x',other_args:'--regroup 2'}));});
test('Native browser selection registers job, saves correct classes/particles and finishes',{skip:!process.env.RELION_DELUXE_BRIDGE},async()=>{
 const project=await fs.mkdtemp(path.join(os.tmpdir(),'browser-select-'));try{
 const native=new NativeAdapter(project,path.resolve(process.env.RELION_DELUXE_BRIDGE));await native.call(['init']);
 await fs.mkdir(path.join(project,'Class2D/job001'),{recursive:true});const source='Class2D/job001/';
 await fs.writeFile(path.join(project,source+'run_optimiser.star'),'data_optimiser_general\n_rlnModelStarFile '+source+'run_model.star\n_rlnExperimentalDataStarFile '+source+'run_data.star\n');
 await fs.writeFile(path.join(project,source+'run_model.star'),'data_model_classes\nloop_\n_rlnReferenceImage\n_rlnClassDistribution\n_rlnClassNumber\n1@classes.mrcs 0.4 2\n2@classes.mrcs 0.6 1\n');
 await fs.writeFile(path.join(project,source+'run_data.star'),'data_optics\nloop_\n_rlnOpticsGroup\n_rlnImagePixelSize\n1 1.5\n\ndata_particles\nloop_\n_rlnImageName\n_rlnOpticsGroup\n_rlnClassNumber\n1@particles.mrcs 1 1\n2@particles.mrcs 1 2\n3@particles.mrcs 1 2\n');
 const schema=(await native.call(['schema'])).find(s=>s.id===7),layout={id:7,label:'relion.select',name:'Subset selection'},values={fn_model:source+'run_optimiser.star',do_recenter:'No',do_regroup:'No',do_class_ranker:'No',do_queue:'No'};
 const snapshot=await selectionSnapshot(project,[],values);assert.equal(snapshot.mode,'classes');
 const result=await native.submit('browser-select',layout,schema,values,'','');assert.equal((await native.call(['state'])).jobs.find(j=>j.name===result.name).status,'Running');
 await assert.rejects(native.call(['browser-select-save',result.name,'999']),/no longer matches/);
 const saved=await native.call(['browser-select-save',result.name,'0']);assert.equal(saved.count,2);
 const output=parseStar(await fs.readFile(path.join(project,result.name,'particles.star'),'utf8'));const particles=output.find(b=>b.name==='particles').tables[0].rows;assert.deepEqual(particles.map(r=>r.rlnImageName),['2@particles.mrcs','3@particles.mrcs']);assert.equal(Number(output.find(b=>b.name==='optics').tables[0].rows[0].rlnImagePixelSize),1.5);
 assert.equal((await native.call(['state'])).jobs.find(j=>j.name===result.name).status,'Succeeded');const classText=await fs.readFile(path.join(project,result.name,'class_averages.star'),'utf8');assert.match(classText,/^data_\s*$/m);assert.doesNotMatch(classText,/data_model_classes/);assert.equal(parseStar(classText).find(b=>b.name===''&&b.tables.length).tables[0].rows.length,1);
 await assert.rejects(native.call(['browser-select-save',result.name,'0']),/not running/);
 await fs.writeFile(path.join(project,'mics.star'),'data_optics\nloop_\n_rlnOpticsGroup\n_rlnMicrographPixelSize\n1 1.5\n\ndata_micrographs\nloop_\n_rlnMicrographName\n_rlnOpticsGroup\nfirst.mrc 1\nsecond.mrc 1\n');
 const micValues={fn_mic:'mics.star',do_recenter:'No',do_regroup:'No',do_class_ranker:'No',do_queue:'No'};
 const mic=await native.submit('browser-select',layout,schema,micValues,'','');
 await native.call(['browser-select-save',mic.name,'1']);
 const micRows=parseStar(await fs.readFile(path.join(project,mic.name,'micrographs.star'),'utf8')).find(b=>b.name==='micrographs').tables[0].rows;assert.equal(micRows.length,1);assert.equal(micRows[0].rlnMicrographName,'second.mrc');
 const pending=await native.submit('browser-select',layout,schema,micValues,'','');await native.call(['refresh']);assert.equal((await native.call(['state'])).jobs.find(j=>j.name===pending.name).status,'Running');
 await native.call(['abort',pending.name]);assert.equal((await native.call(['state'])).jobs.find(j=>j.name===pending.name).status,'Aborted');
 await assert.rejects(native.call(['browser-select-save',pending.name,'0']),/not running/);

 }finally{await fs.rm(project,{recursive:true,force:true});}
});
