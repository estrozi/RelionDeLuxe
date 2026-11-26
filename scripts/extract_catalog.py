#!/usr/bin/env python3
"""Evaluate RELION's actual C++ initialisers in a metadata-only harness.
No command builders or scientific code are reimplemented. Requires g++.
Also extracts tab/field ordering; unplaced options remain available in Other.
"""
import pathlib, re, sys, subprocess, tempfile, json
tomo='--tomo' in sys.argv
src = pathlib.Path(sys.argv[1]).resolve()
suffix='-tomo' if tomo else ''
out = pathlib.Path(__file__).resolve().parents[1]
p = (src/'src/pipeline_jobs.cpp').read_text()
h = (src/'src/pipeline_jobs.h').read_text()
g = (src/'src/gui_jobwindow.cpp').read_text()
def function(text, signature):
    text=text.replace('\\\n', '')
    start=text.index(signature); body=text.index('{', start)
    # C++ lexical tokens: braces in comments and strings must not count.
    depth=0
    for m in re.finditer(r'//[^\n]*|/\*[\s\S]*?\*/|"(?:\\.|[^"\\])*"|\'(?:\\.|[^\'\\])*\'|[{}]', text[body:]):
        if m[0]=='{': depth+=1
        elif m[0]=='}':
            depth-=1
            if depth==0: return text[start:body+m.end()]
    raise ValueError(signature)
def mode_branches(text, enabled):
    # Evaluate only the GUI's explicit mode branches, retaining other conditions.
    text=re.sub(r'//[^\n]*|/\*[\s\S]*?\*/', '', text)
    def statement(pos):
        while text[pos].isspace(): pos+=1
        if text[pos]!='{':
            end=text.index(';',pos)+1
            return text[pos:end],end
        start=pos+1; depth=1
        for m in re.finditer(r'"(?:\\.|[^"\\])*"|[{}]',text[start:]):
            if m[0]=='{': depth+=1
            elif m[0]=='}':
                depth-=1
                if depth==0:return text[start:start+m.start()],start+m.end()
        raise ValueError('Unclosed mode branch')
    while (m:=re.search(r'if\s*\(\s*(!?)is_tomo\s*\)',text)):
        yes,end=statement(m.end()); no=''
        otherwise=re.match(r'\s*else\b',text[end:])
        if otherwise:no,end=statement(end+otherwise.end())
        text=text[:m.start()]+(yes if enabled != bool(m[1]) else no)+text[end:]
    return text
initial = function(p, 'void RelionJob::initialise(int')
methods = re.findall(r'void RelionJob::(initialise\w+Job)\(', p)
# Keep the definitions verbatim, including SPA/tomography conditionals.
defines='\n'.join(re.findall(r'^#define (?:DEFAULT|LABEL_|PROC_|JOBOPTION_|RELION_)[^\n]+',h,re.M))
vectors='\n'.join(re.findall(r'static const std::vector<std::string> [\s\S]*?\};',h))
class_code=r'''
#include <string>
#include <vector>
#include <map>
#include <iostream>
#include <sstream>
#include <iomanip>
#include <cstdlib>
#include <stdexcept>
using FileName=std::string;
#define REPORT_ERROR(x) throw std::runtime_error(x)
int textToInteger(const std::string &s){return std::stoi(s);}
bool textToBool(const std::string &s){return s=="Yes" || s=="true" || s=="1";}
std::string integerToString(int n){return std::to_string(n);}
std::string floatToString(float x){std::ostringstream o;o<<x;return o.str();}
struct JobOption {
 std::string label,value,default_value,helptext,variable,node_type,pattern="undefined";
 int joboption_type=1,node_type_depth=1; float min_value=0,max_value=0,step_value=0;
 std::vector<std::string> radio_options={"undefined"};
 JobOption()=default;
 JobOption(std::string l,std::string v,std::string h):label(l),value(v),default_value(v),helptext(h){}
 JobOption(std::string l,bool b,std::string h):JobOption(l,std::string(b?"Yes":"No"),h){joboption_type=5;}
 JobOption(std::string l,float v,float mn,float mx,float st,std::string h):JobOption(l,floatToString(v),h){joboption_type=6;min_value=mn;max_value=mx;step_value=st;}
 JobOption(std::string l,std::vector<std::string> r,int i,std::string h):JobOption(l,r.at(i),h){joboption_type=4;radio_options=r;}
 JobOption(std::string l,std::string v,std::string p,std::string d,std::string h):JobOption(l,v,h){joboption_type=2;pattern=p;}
 JobOption(std::string l,std::string n,int dep,std::string v,std::string p,std::string h):JobOption(l,v,p,"",h){joboption_type=3;node_type=n;node_type_depth=dep;}
 void setString(std::string s){value=s;}
};
'''
struct='struct RelionJob { int type=0; bool is_tomo=false,is_continue=false; std::string hidden_name,label; std::map<std::string,JobOption> joboptions; void addTomoInputOptions(bool,bool,bool,bool); void initialise(int);'+''.join('void '+m+'();' for m in methods)+'};\n'
# Catalog order and names come directly from main GUI SPA section.
main=(src/'src/gui_mainwindow.cpp').read_text()[ (src/'src/gui_mainwindow.cpp').read_text().index('browser->add("Import");', (src/'src/gui_mainwindow.cpp').read_text().index('browser->add("Import");')+1):]
pairs=re.findall(r'browser->add\("([^"]+)"\);[\s\S]*?->initialise\((PROC_\w+)', main)
pairs=[(name,proc) for name,proc in pairs if not proc.startswith('PROC_TOMO')]
pairs=list(dict.fromkeys(pairs))
if tomo:
    pairs=[('Import tilt series','PROC_TOMO_IMPORT'),('Motion correction','PROC_MOTIONCORR'),('CTF estimation','PROC_CTFFIND'),('Exclude tilt-images','PROC_TOMO_EXCLUDE_TILT_IMAGES'),('Align tilt-series','PROC_TOMO_ALIGN_TILTSERIES'),('Reconstruct tomograms','PROC_TOMO_RECONSTRUCT_TOMOGRAM'),('Denoise tomograms','PROC_TOMO_DENOISE_TOMOGRAM'),('Pick tomograms','PROC_TOMO_PICK_TOMOGRAM'),('Extract subtomos','PROC_TOMO_SUBTOMO'),('3D initial reference','PROC_INIMODEL'),('3D classification','PROC_3DCLASS'),('3D auto-refine','PROC_3DAUTO'),('3D multi-body','PROC_MULTIBODY'),('Subset selection','PROC_CLASSSELECT'),('Reconstruct particle','PROC_TOMO_RECONSTRUCT'),('CTF refinement','PROC_TOMO_CTFREFINE'),('Bayesian polishing','PROC_TOMO_ALIGN'),('Mask creation','PROC_MASKCREATE'),('Join star files','PROC_JOINSTAR'),('Particle subtraction','PROC_SUBTRACT'),('Post-processing','PROC_POST'),('Local resolution','PROC_RESMAP'),('ModelAngelo building','PROC_MODELANGELO'),('External','PROC_EXTERNAL')]
mapmethods=dict(re.findall(r'(?:if|else if) \(type == (PROC_\w+)\)\s*\{[\s\S]*?(initialise\w+Job)\(\);',initial))
layout=[]
for name,proc in pairs:
    meth=mapmethods[proc]; win=(meth[:-3]+'Window').replace('Localres','Locres').replace('AlignTiltSeries','AlignTiltseries').replace('ReconPart','ReconPar')
    body=function(g, 'void JobWindow::'+win+'()')
    if tomo:
        body=mode_branches(body,proc in ['PROC_MOTIONCORR','PROC_CTFFIND','PROC_INIMODEL','PROC_3DCLASS','PROC_3DAUTO','PROC_POST'])
        body=body.replace('placeTomoInput(true, true, true, false);',function(g,'void JobWindow::placeTomoInput(bool').split('{',1)[1].rsplit('}',1)[0].replace('if (has_manifolds) place("in_manifolds", TOGGLE_DEACTIVATE);',''))
    tabs={}; tab='Other'
    # Sequential scan preserves each placement, including multi-field rows.
    for m in re.finditer(r'tab\d+->label\("([^"]+)"\)|place(?:2|3)?\(([^;]+)\);',body):
        if m[1]: tab=m[1];tabs.setdefault(tab,[])
        else:
            args=re.findall(r'"([^"]+)"',m[2]); keys=args[:(3 if m[0].startswith('place3') else 2 if m[0].startswith('place2') else 1)]
            tabs.setdefault(tab,[]).extend(keys)
    numeric=int(re.search(r'#define '+proc+r'\s+(\d+)',h)[1])
    labelproc=proc.replace('PROC_TOMO_DENOISE_TOMOGRAM','PROC_TOMO_DENOISE').replace('PROC_TOMO_PICK_TOMOGRAM','PROC_TOMO_PICK')
    label=re.search(r'#define '+labelproc+r'_LABELNEW\s+"([^"]+)"',h)[1]
    # Extract FLTK boolean-group and new/continue activation rules.
    fields={}; controls={}; stack=[]
    clean=re.sub(r'//[^\n]*|/\*[\s\S]*?\*/', '', body)
    tokens=r'(\w+)->(begin|end)\(\);|place(?:2|3)?\(([^;]+)\);'
    for event in re.finditer(tokens,clean):
        if event[1]:
            group,action=event[1],event[2]
            if action=='begin' and group in controls: stack.append(group)
            elif action=='end' and group in stack: stack=stack[:stack.index(group)]
            continue
        args=re.findall(r'"([^"]+)"',event[3])
        count=3 if event[0].startswith('place3') else 2 if event[0].startswith('place2') else 1
        keys=args[:count]
        toggle=re.search(r'TOGGLE_\w+',event[3])
        for key in keys:
            fields[key]={'toggle':toggle[0] if toggle else 'TOGGLE_LEAVE_ACTIVE','when':[controls[x] for x in stack]}
        if count==1:
            group=re.search(r',\s*(group\w*|queue_group)(?:\s*,\s*(true|false))?\s*$',event[3])
            if group:controls[group[1]]={'key':keys[0],'value':'No' if group[2]=='true' else 'Yes'}
    overrides=dict(re.findall(r'myjob.joboptions\["([^"]+)"\].setString\("([^"]*)"\)',body))
    for key in re.findall(r'guientries\["([^"]+)"\].deactivate_option = TOGGLE_ALWAYS_DEACTIVATE',body):
        fields[key]={'toggle':'TOGGLE_ALWAYS_DEACTIVATE','when':[]}
    layout.append(dict(id=numeric,label=label,name=name,tabs=tabs,fields=fields,overrides=overrides,**({'mode':'tomo','isTomo':numeric in [1,2,18,9,10,15]} if tomo else {})))
(out/('public/layout'+suffix+'.json')).write_text(json.dumps(layout,indent=2)+'\n')
(out/('native/job_types'+suffix+'.inc')).write_text(','.join(str(x['id']) for x in layout)+'\n')
# Shared serializer compiles both with actual RELION and this extraction harness.
code=class_code+'\n'+defines+'\n'+vectors+'\n'+struct+'\n'+function(p,'void RelionJob::addTomoInputOptions(bool')+'\n'+initial+'\n'+'\n'.join(function(p,'void RelionJob::'+m+'()') for m in methods)
code+='\n#include "'+str(out/'native/json.hpp')+'"\nint main(){std::cout<<"[";bool first=true;for(int t:std::vector<int>{'+','.join(str(x['id']) for x in layout)+'}){if(!first)std::cout<<",";first=false;RelionJob j;j.is_tomo='+('(t==1||t==2||t==18||t==9||t==10||t==15)' if tomo else 'false')+';j.initialise(t);writeSchema(j);}std::cout<<"]";}\n'
with tempfile.TemporaryDirectory() as d:
    cpp=pathlib.Path(d)/'catalog.cpp';cpp.write_text(code)
    subprocess.run(['g++','-std=c++17','-O0',str(cpp),'-o',d+'/catalog'],check=True)
    catalog=json.loads(subprocess.check_output([d+'/catalog']))
(out/('public/catalog'+suffix+'.json')).write_text(json.dumps(catalog,indent=2)+'\n')
commit=subprocess.check_output(['git','-C',str(src),'rev-parse','HEAD'],text=True).strip()
(out/('public/provenance'+suffix+'.json')).write_text(json.dumps({'repository':'https://github.com/3dem/relion','branch':'ver5.0','commit':commit,'mode':'STA' if tomo else 'SPA','jobs':len(catalog),'fields':sum(len(j['options']) for j in catalog)},indent=2)+'\n')
print('Extracted',len(catalog),('STA types;' if tomo else 'SPA types;'),sum(len(j['options']) for j in catalog),'options; commit',commit)
