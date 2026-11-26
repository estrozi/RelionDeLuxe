import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const box={module:{exports:{}},console,setTimeout,clearTimeout,TextDecoder,TextEncoder,Blob};box.exports=box.module.exports;
vm.runInNewContext(fs.readFileSync(new URL('../public/vendor/ngl.js',import.meta.url),'utf8'),box);
const Parser=box.module.exports.ParserRegistry.get('cif');
const atoms=`data_model
loop_
_atom_site.group_PDB
_atom_site.id
_atom_site.type_symbol
_atom_site.label_atom_id
_atom_site.label_alt_id
_atom_site.label_comp_id
_atom_site.label_asym_id
_atom_site.label_entity_id
_atom_site.label_seq_id
_atom_site.Cartn_x
_atom_site.Cartn_y
_atom_site.Cartn_z
_atom_site.occupancy
_atom_site.B_iso_or_equiv
_atom_site.auth_seq_id
_atom_site.auth_comp_id
_atom_site.auth_asym_id
_atom_site.auth_atom_id
_atom_site.pdbx_PDB_model_num
ATOM 1 N N . ALA A 1 1 0 0 0 1 50 1 ALA A N 1
ATOM 2 C CA . ALA A 1 1 1.45 0 0 1 50 1 ALA A CA 1
ATOM 3 C C . ALA A 1 1 2 1.4 0 1 50 1 ALA A C 1
#
`;
for(const metadata of ['', 'loop_\n_chem_comp.id\n_chem_comp.type\nALA "L-peptide linking"\n#\n'])test('CIF atom parsing '+(metadata?'with':'without')+' chem_comp metadata',async()=>{
 const streamer={data:atoms+metadata,name:'model.cif',path:'model.cif',read:async()=>{}};
 const model=await new Parser(streamer,{}).parse();
 assert.equal(model.atomCount,3);assert.equal(model.residueStore.count,1);assert(Math.abs(model.atomStore.x[1]-1.45)<0.00001);
});
