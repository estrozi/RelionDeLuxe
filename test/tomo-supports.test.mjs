import test from 'node:test';import assert from 'node:assert/strict';
import {sampleSupports,supportEuler} from '../public/tomo-supports.js';
import {tomoParticleStar} from '../lib/tomo-editor.mjs';
import {parseStar} from '../lib/gallery.mjs';
const sphere={id:1,tomogram:'T',type:'spheres',center:[0,0,0],radius:10,spacing:5};
test('sphere samples have radial normals, stable IDs and deterministic coordinates',()=>{
 const a=sampleSupports([sphere]),b=sampleSupports([sphere]);assert.deepEqual(a,b);assert.equal(a.length,51);
 for(const p of a){assert.ok(Math.abs(Math.hypot(...p.position)-10)<1e-8);assert.equal(p.element,1);assert.equal(p.euler.length,3);}
});
test('filament sampling is evenly spaced along its piecewise linear centerline',()=>{
 const a=sampleSupports([{id:2,tomogram:'T',type:'filaments',spacing:5,points:[[0,0,0],[10,0,0],[10,10,0]]}]);
 assert.deepEqual(a.map(p=>p.position),[[0,0,0],[5,0,0],[10,0,0],[10,5,0],[10,10,0]]);
 assert.deepEqual(a.map(p=>p.track),[0,5,10,15,20]);
});
test('parallel closed contours generate surface samples; invalid contours are rejected',()=>{
 const surface={id:3,tomogram:'T',type:'surfaces',axis:'Z',spacing:5,contours:[[[0,0,0],[10,0,0],[10,10,0],[0,10,0]],[[0,0,10],[10,0,10],[10,10,10],[0,10,10]]]};
 const a=sampleSupports([surface]);assert.ok(a.length>0);assert.ok(a.every(p=>p.position[2]>=0&&p.position[2]<=10));
 const flipped=sampleSupports([{...surface,flip:true}]);assert.ok(a.every((p,i)=>p.normal.every((v,j)=>Math.abs(v+flipped[i].normal[j])<1e-8)));
 assert.throws(()=>sampleSupports([{...surface,contours:[surface.contours[0]]}]),/two/);
 assert.throws(()=>sampleSupports([{...surface,contours:[surface.contours[0],[...surface.contours[1]].reverse()]}]),/winding/);
});
test('plain particles omit orientation columns; mixed sets preserve support metadata without shared directional priors',()=>{
 const particle={id:4,tomogram:'T',type:'particles',points:[[1,2,3]]};
 const plain=parseStar(tomoParticleStar(sampleSupports([particle]))).flatMap(b=>b.tables)[0];
 assert.ok(!plain.labels.includes('rlnTomoSubtomogramRot'));
 const mixed=parseStar(tomoParticleStar(sampleSupports([particle,sphere]))).flatMap(b=>b.tables)[0];
 assert.equal(mixed.rows[0].rlnSupportStructureType,'particles');assert.equal(mixed.rows[0].rlnSupportStructureElement,'4');
 assert.ok(mixed.labels.includes('rlnTomoSubtomogramRot'));assert.ok(!mixed.labels.includes('rlnAngleTiltPrior'));
 assert.throws(()=>sampleSupports([sphere,sphere]),/unique/);
 assert.throws(()=>sampleSupports([{...sphere,spacing:.0001}]),/Too many/);
});
test('Euler pre-rotation follows RELION inverse ZYZ convention',()=>{
 const mul=(a,b)=>a.map(r=>b[0].map((_,j)=>r.reduce((s,v,k)=>s+v*b[k][j],0)));
 for(const n of [[0,0,1],[1,0,0],[0,1,0],[.2,.3,.4]]){
  const [a,b,c]=supportEuler(n).map(v=>v*Math.PI/180),rz=t=>[[Math.cos(t),-Math.sin(t),0],[Math.sin(t),Math.cos(t),0],[0,0,1]],ry=t=>[[Math.cos(t),0,Math.sin(t)],[0,1,0],[-Math.sin(t),0,Math.cos(t)]];
  const r=mul(mul(rz(a),ry(b)),rz(c)),u=n.map(v=>v/Math.hypot(...n));
  // First row of the inverse is minus the support normal.
  assert.ok(r[0].every((v,i)=>Math.abs(v+u[i])<1e-7));
 }
});
