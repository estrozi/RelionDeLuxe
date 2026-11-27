import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

const source=await fs.readFile(new URL('../public/app.js',import.meta.url),'utf8');
const inspector=source.slice(source.indexOf('function renderInspector(){'),source.indexOf('\nconst convergenceScaled='));
function render({file='AutoPick/job003/autopick.star',status='Succeeded',kind='Output',id=4,nodeType='MicrographCoordinatesGroup.star.relion'}={}){
 const nodes=[];
 const element=(tag,text)=>({tag,text,children:[],append(...children){this.children.push(...children);},replaceChildren(){nodes.length=0;},setAttribute(key,value){this[key]=value;}});
 const document={documentElement:{dataset:{theme:'dark'}},createTextNode:text=>({text})};
 const job={name:'AutoPick/job003/',status,inputs:kind==='Input'?[file]:[],outputs:kind==='Output'?[file]:[]};
 const context={current:()=>job,currentLayout:()=>({id,name:id===4?'Auto-picking':'Other'}),$:()=>element('div'),el:element,document,config:{mode:'spa'},values:{},state:{nodes:[{name:file,type:nodeType}]},inspectedSavedModes:new Map(),isMapNode:()=>false,appendConnectionNode:node=>nodes.push(node),highlightConnection(){},loadLog(){},URLSearchParams,token:'test token & value',task:fn=>fn(),api:()=>{throw Error('Native display must not be called');}};
 vm.runInNewContext(inspector+'\nrenderInspector();',context);
 return {nodes,document};
}
test('Auto-picking output opens the read-only picker with job, token and current theme',()=>{
 for(const nodeType of ['MicrographCoordinatesGroup.star.relion',''])for(const file of ['AutoPick/job003/autopick.star','AutoPick/my picks/autopick.star']){
  const {nodes,document}=render({file,nodeType});const link=nodes[0];
  assert.equal(link.tag,'a');assert.equal(link.target,'_blank');assert.equal(link.rel,'noopener noreferrer');
  const url=new URL(link.href,'http://localhost');assert.equal(url.pathname,'/picker.html');
  const params=new URLSearchParams(url.hash.slice(1));assert.equal(params.get('readonly'),'1');assert.equal(params.get('job'),'AutoPick/job003/');assert.equal(params.get('token'),'test token & value');assert.equal(params.get('theme'),'dark');
  document.documentElement.dataset.theme='light';link.onclick();assert.equal(new URLSearchParams(link.href.split('#')[1]).get('theme'),'light');
 }
});
test('pending Auto-picking outputs stay disabled and unrelated native nodes retain their routing',()=>{
 for(const status of ['Scheduled','Running']){const node=render({status}).nodes[0];assert.equal(node.tag,'div');assert.equal(node['aria-disabled'],'true');assert.equal(node.href,undefined);}
 for(const options of [{file:'AutoPick/job003/other.star'},{kind:'Input'},{id:3}])assert.equal(render(options).nodes[0].tag,'button');
 assert.equal(render({file:'AutoPick/job003/logfile.pdf'}).nodes[0].href.split('#')[0],'/pdf-viewer.html');
 assert.equal(render({file:'CtfFind/job002/micrographs.star',kind:'Input',nodeType:'MicrographGroupMetadata.star.relion'}).nodes[0].href.split('#')[0],'/gallery.html');
});
