#!/usr/bin/env python3
import re,json,sys
from pathlib import Path
# Read balanced function bodies using the already-shipped extractor's lexer.
root=Path(__file__).resolve().parents[1]
src=Path(sys.argv[1])
script=(root/'scripts/extract_catalog.py').read_text()
ns={'re':re};exec(script[script.index('def function('):script.index('initial = function(')],ns)
g=(src/'src/gui_jobwindow.cpp').read_text();p=(src/'src/pipeline_jobs.cpp').read_text();h=(src/'src/pipeline_jobs.h').read_text()
initial=ns['function'](p,'void RelionJob::initialise(int')
methods=dict(re.findall(r'(?:if|else if) \(type == (PROC_\w+)\)\s*\{[\s\S]*?(initialise\w+Job)\(\);',initial))
for mode in ['spa','tomo']:
 result={};layouts=json.loads(Path(root/'public'/('layout'+('-tomo' if mode=='tomo' else '')+'.json')).read_text())
 for l in layouts:
  proc=next((k for k in methods if re.search(r'^#define '+k+r'\s+'+str(l['id'])+r'(?:\s|/|$)',h,re.M)),None)
  if not proc:continue
  win=(methods[proc][:-3]+'Window').replace('Localres','Locres').replace('AlignTiltSeries','AlignTiltseries').replace('ReconPart','ReconPar')
  body=ns['mode_branches'](ns['function'](g,'void JobWindow::'+win+'()'),mode=='tomo' and l['id'] in [1,2,18,9,10,15])
  rules={};controls={};stack=[]
  for e in re.finditer(r'(\w+)->(begin|end)\(\);|place(?:2|3)?\s*\(([^;]+)\);',body):
   if e[1]:
    group,action=e[1],e[2]
    if action=='begin' and group in controls:stack.append(group)
    elif action=='end' and group in stack:stack=stack[:stack.index(group)]
    continue
   n=3 if e[0].startswith('place3') else 2 if e[0].startswith('place2') else 1
   keys=re.findall(r'"([^"]+)"',e[3])[:n]
   for key in keys:rules[key]=[controls[x] for x in stack]
   group=re.search(r',\s*(group\w*|queue_group)(?:\s*,\s*(true|false))?\s*$',e[3])
   if n==1 and keys and group:controls[group[1]]={'key':keys[0],'value':'No' if group[2]=='true' else 'Yes'}
  tabs={};tab='Other options' 
  for m in re.finditer(r'tab\d+->label\("([^"]+)"\)|place(?:2|3)?\s*\(([^;]+)\);',body):
   if m[1]:tab=m[1]
   else:
    n=3 if m[0].startswith('place3') else 2 if m[0].startswith('place2') else 1
    toggle=re.search(r'TOGGLE_\w+',m[2])
    for key in re.findall(r'"([^"]+)"',m[2])[:n]:tabs.setdefault(tab,[]).append({'key':key,'toggle':toggle[0] if toggle else 'TOGGLE_LEAVE_ACTIVE','when':rules.get(key,[])})
  result[l['id']]=tabs
 (root/'public'/('placements-5.1-'+mode+'.json')).write_text(json.dumps(result,indent=2)+'\n')
