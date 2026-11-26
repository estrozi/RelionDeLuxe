import test from 'node:test';import assert from 'node:assert/strict';
import {cropProbe,probePoint,probeLongitude,probeLatitude} from '../public/probe-domain.js';
import {projectionMinima} from '../public/tomo-supports.js';
test('wrapped valid columns form one continuous cropped longitude interval',()=>{
 const width=36,height=18,values=Array(width*height).fill(null);
 for(let y=5;y<=10;y++)for(const x of [34,35,0,1,2,3,4,5,6,7,8])values[y*width+x]=y*100+x;
 const p=cropProbe({width,height,values,poleAxis:'Z'});assert.equal(p.width,11);assert.equal(p.height,6);assert.equal(p.domain.x,34/36);assert.equal(p.values[0],534);assert.equal(p.values[2],500);
 assert.ok(Math.abs(probeLongitude(1,p)-(34+11)/36)<1e-12);assert.equal(probeLatitude(0,p),5/18);
 const xy=probePoint([.5/36,7.5/18],p);assert.ok(Math.abs(xy[0]-2.5/11)<1e-12);assert.ok(Math.abs(xy[1]-2.5/6)<1e-12);
});
test('full and empty probes keep full longitude range',()=>{for(const v of [1,null]){const p=cropProbe({width:8,height:4,values:Array(32).fill(v)});assert.equal(p.width,8);assert.equal(p.height,4);assert.equal(p.domain.width,1);}});
test('cropped minima map back to original sphere directions and do not wrap cropped edges',()=>{
 const p={width:5,height:5,poleAxis:'Z',domain:{x:.9,width:.2,y:.25,height:.5},values:Array(25).fill(5)};p.values[12]=0;p.values[10]=-1;
 const dirs=projectionMinima(p);assert.equal(dirs.length,1);assert.ok(Math.abs(dirs[0][0]+1)<1e-12);assert.ok(Math.abs(dirs[0][2])<1e-12);
});
