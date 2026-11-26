import test from 'node:test';
import assert from 'node:assert/strict';
import {localResolutionFile,resolutionRange,sampleResolution,resolutionColor} from '../public/local-resolution-color.js';
test('only locally filtered RELION maps acquire a companion',()=>{
 assert.equal(localResolutionFile('LocalRes/job007/relion_locres_filtered.mrc'),'LocalRes/job007/relion_locres.mrc');
 assert.equal(localResolutionFile('PostProcess/job003/postprocess.mrc'),null);
});
test('resolution range ignores missing estimates and palette follows Å convention',()=>{
 assert.deepEqual(resolutionRange([0,NaN,-1,3,7,Infinity]),[3,7]);
 assert.throws(()=>resolutionRange([0,NaN]));
 assert.equal(resolutionColor(3,3,7),0x0000ff);
 assert.equal(resolutionColor(5,3,7),0xffffff);
 assert.equal(resolutionColor(7,3,7),0xff0000);
 assert.equal(resolutionColor(0,3,7),0x888888);
});
test('sampling uses world coordinates, interpolates and handles missing/boundary voxels',()=>{
 const v={nx:2,ny:2,nz:2,data:[1,2,3,4,5,6,7,8],inverseMatrix:{elements:[.5,0,0,0,0,.5,0,0,0,0,.5,0,-5,-10,-15,1]}};
 assert.equal(sampleResolution(v,{x:11,y:21,z:31}),4.5);
 assert.equal(sampleResolution(v,{x:12,y:22,z:32}),8);
 assert.ok(Number.isNaN(sampleResolution(v,{x:9,y:20,z:30})));
 v.data[0]=0;
 assert.ok(Number.isNaN(sampleResolution(v,{x:11,y:21,z:31})));
 assert.equal(sampleResolution(v,{x:12,y:22,z:32}),8);
});
test('vendored NGL applies the custom scheme to world-space surface vertices',async()=>{
 const {default:vm}=await import('node:vm');const {readFile}=await import('node:fs/promises');
 const ctx={console,setTimeout,clearTimeout};vm.createContext(ctx);
 vm.runInContext(await readFile(new URL('../public/vendor/ngl.js',import.meta.url),'utf8'),ctx);
 const {NGL}=ctx;
 const volume=new NGL.Volume('resolution','',new Float32Array([3,7,3,7,3,7,3,7]),2,2,2);
 const id=NGL.ColormakerRegistry.addScheme(function(){this.positionColor=p=>resolutionColor(sampleResolution(volume,p),3,7);});
 const scheme=NGL.ColormakerRegistry.getScheme({scheme:id});
 assert.equal(scheme.positionColor({x:0,y:0,z:0}),0x0000ff);
 assert.equal(scheme.positionColor({x:1,y:1,z:1}),0xff0000);
 NGL.ColormakerRegistry.removeScheme(id);
});
