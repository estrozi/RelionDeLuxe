#!/usr/bin/env python3
"""Build the RELION adapter against unchanged official metadata/pipeline sources.
Linux + g++ + Python 3. No FLTK, CUDA, FFTW or engine rebuild required.
"""
import pathlib,subprocess,sys,json,argparse,os,re
from relion_source_version import choose_release
p=argparse.ArgumentParser();p.add_argument('relion_source');p.add_argument('--output',default='build');p.add_argument('--relion-version',choices=['5.0.1','5.1.1'],help='Override automatic runtime-version detection when cloning a missing source directory');p.add_argument('--allow-other-revision',action='store_true');p.add_argument('--replace_cryocare',action='store_true',help='Install modern cryoCARE, wrappers and RELION Conda hooks');p.add_argument('--conda-executable');p.add_argument('--relion-conda-env',default='relion-5.1');a=p.parse_args()
root=pathlib.Path(__file__).resolve().parents[1];src=pathlib.Path(a.relion_source).resolve();out=pathlib.Path(a.output).resolve();out.mkdir(parents=True,exist_ok=True)
expected=json.loads((root/'public/provenance.json').read_text())['commit']
if not src.exists():
    requested_ref=choose_release(a.relion_version,interactive=sys.stdin.isatty())
    message='RELION source directory does not exist: '+str(src)+'\nClone https://github.com/3dem/relion.git and check out '+requested_ref+'? [y/N] '
    if not sys.stdin.isatty():
        raise SystemExit('RELION source directory does not exist: '+str(src)+'. Run in an interactive terminal to approve cloning, or clone it manually first.')
    try: approved=input(message).strip().lower() in ('y','yes')
    except (EOFError, KeyboardInterrupt): approved=False
    if not approved: raise SystemExit('Build cancelled; RELION source was not cloned.')
    try:
        subprocess.run(['git','clone','--no-checkout','https://github.com/3dem/relion.git',str(src)],check=True)
        subprocess.run(['git','-C',str(src),'checkout','--detach',requested_ref],check=True)
    except (OSError, subprocess.CalledProcessError) as error:
        raise SystemExit('Could not prepare RELION source: '+str(error)+'. Any partially cloned directory is left in place for inspection.')
if not src.is_dir(): raise SystemExit('RELION source path is not a directory: '+str(src))
try:
    actual=subprocess.check_output(['git','-C',str(src),'rev-parse','HEAD'],text=True,stderr=subprocess.DEVNULL).strip()
    tag=subprocess.run(['git','-C',str(src),'describe','--tags','--exact-match'],text=True,capture_output=True).stdout.strip()
except subprocess.CalledProcessError:
    actual='source-archive';tag=''
version=re.search(r'#define RELION_SHORT_VERSION\s+"([^"]+)"',(src/'src/macros.h').read_text())[1]
if tag in ('5.0.1','5.1.1'):version=tag
if a.relion_version and version.split('.')[:2]!=a.relion_version.split('.')[:2]:raise SystemExit('Requested RELION release does not match the supplied source tree.')

if actual!=expected and tag not in ('5.0.1','5.1.1') and not a.allow_other_revision:raise SystemExit('Source revision mismatch. Expected '+expected+'. Check out that commit, or explicitly use --allow-other-revision for an unverified build.')
# These source files provide the SAME pipeline and command builders used by FLTK.
units=['pipeliner','pipeline_jobs','metadata_table','metadata_label','metadata_container','filename','strings','error']
flags=['g++','-std=c++11','-O1','-ffunction-sections','-fdata-sections','-I',str(src),'-DRELIONDELUXE_SOURCE_VERSION='+json.dumps(version)]
objects=[]
for unit in units:
    obj=out/(unit+'.o');print('Compiling '+unit,flush=True)
    subprocess.run(flags+['-c',str(src/'src'/f'{unit}.cpp'),'-o',str(obj)],check=True);objects.append(str(obj))
exe=out/'relion_deluxe_bridge'
subprocess.run(flags+[str(root/'native/deluxe_bridge.cpp'),*objects,'-Wl,--gc-sections','-o',str(exe)],check=True)
for mode,count in [('spa',22),('tomo',24)]:
    schema=subprocess.check_output([str(exe),'schema'],text=True,env={**os.environ,'RELIONDELUXE_MODE':mode}).split('@@RELIONDELUXE@@')[-1]
    assert len(json.loads(schema))==count, mode+' schema mismatch'
print('Built '+str(exe));print('Metadata/pipeline adapter only. Your installed RELION executables still perform all calculations.')

if a.replace_cryocare:
    from setup_cryocare import install
    try: install(root,a.conda_executable,a.relion_conda_env)
    except (RuntimeError, subprocess.CalledProcessError, OSError) as error: raise SystemExit("Modern cryoCARE setup failed: "+str(error))
