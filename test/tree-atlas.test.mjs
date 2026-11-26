
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import vm from 'node:vm';
const source=await fs.readFile(new URL('../public/tree-atlas.js',import.meta.url),'utf8');
test('Atlas layout preserves branches and multiple parents and rejects cycles',()=>{
 const code=source.slice(0,source.indexOf("$('pureVertical').onchange"));
 const context={document:{getElementById(){return {checked:false}}}};vm.createContext(context);vm.runInContext(code,context);
 const parse=data=>vm.runInContext('parsePipeline('+JSON.stringify(data)+')',context);
 const graph=parse({steps:[{id:'a'},{id:'b',dependencies:['a']},{id:'c',dependencies:['a']},{id:'d',dependencies:['b','c']}]});
 assert.equal(graph.nodes.length,4);assert.equal(graph.edges.length,4);assert.equal(graph.nodes[3].parents.length,2);
 assert.throws(()=>parse({steps:[{id:'a',dependencies:['b']},{id:'b',dependencies:['a']}]}),/Cyclic/);
});
test('children follow their parent columns rather than job-number order in both layouts',()=>{
 const code=source.slice(0,source.indexOf("$('pureVertical').onchange"));
 const context={document:{getElementById(){return {checked:false}}}};vm.createContext(context);vm.runInContext(code,context);
 const steps=[{id:'root'},...[5,7,12,13].map(n=>({id:'align'+n,dependencies:['root']})),...[ [9,7],[10,5],[15,13],[16,12] ].map(([n,p])=>({id:'tomo'+n,dependencies:['align'+p]}))];
 context.data={steps};
 for(const vertical of [false,true,false]){
  vm.runInContext('var graph=parsePipeline(data);layoutGraph(graph.nodes,graph.edges,'+vertical+')',context);
  const byId=new Map(context.graph.nodes.map(n=>[n.id,n]));
  for(const [n,p] of [[9,7],[10,5],[15,13],[16,12]]){
   assert.equal(byId.get('tomo'+n).x,byId.get('align'+p).x);
   assert(byId.get('tomo'+n).y>byId.get('align'+p).y);
  }
  const rows=new Map();for(const n of context.graph.nodes){if(!rows.has(n.row))rows.set(n.row,[]);rows.get(n.row).push(n.x);}
  for(const xs of rows.values()){xs.sort((a,b)=>a-b);for(let i=1;i<xs.length;i++)assert(xs[i]-xs[i-1]>=340);}
 }
});

test('tree node details separate status from secondary information without duplicate resolution',()=>{
 const context={document:{getElementById(){return {checked:false}}}};vm.createContext(context);
 vm.runInContext(source.slice(0,source.indexOf("$('pureVertical').onchange")),context);
 const lines=vm.runInContext("nodeDetailLines({status:'Succeeded',keyInfo:'400 movies',keyInfoDetail:'4096×4096',resolutionInfo:''})",context);
 assert.equal(lines[0],'Succeeded · 400 movies');assert.equal(lines[1],'4096×4096');
 assert.equal(vm.runInContext("nodeDetailLines({status:'Succeeded',keyInfo:'200 particles',keyInfoDetail:'3 Å',resolutionInfo:'3 Å'})[1]",context),'3 Å');
});
test('retrospective mask arrows remain separate and do not affect either hierarchy layout',()=>{
 const context={document:{getElementById(){return {checked:false}}}};vm.createContext(context);
 vm.runInContext(source.slice(0,source.indexOf("$('pureVertical').onchange")),context);
 context.data={steps:[{id:'refine'},{id:'mask',dependencies:['refine']}],retrospective:[{source:'mask',target:'refine'}]};
 vm.runInContext('var graph=parsePipeline(data)',context);
 assert.equal(context.graph.edges.length,2);
 for(const mode of [true,false]){
  vm.runInContext('layoutGraph(graph.nodes,graph.edges,'+mode+')',context);
  assert(context.graph.nodes[1].y>context.graph.nodes[0].y);
  const [a,b]=context.graph.edges;
  assert.notDeepEqual(a.points,b.points);if(a.from.row===a.to.row){assert.equal(a.points.length,2);assert.equal(b.points.length,2);assert.notEqual(a.points[0][1],b.points[0][1]);}
  assert.equal(a.from.id,b.to.id);assert.equal(a.to.id,b.from.id);
 }
});
