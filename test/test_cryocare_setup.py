import importlib.util, pathlib, tempfile, unittest, subprocess, json
from unittest.mock import patch
spec=importlib.util.spec_from_file_location('setup',pathlib.Path(__file__).resolve().parents[1]/'scripts/setup_cryocare.py')
setup=importlib.util.module_from_spec(spec);spec.loader.exec_module(setup)
class SetupTests(unittest.TestCase):
 def test_hooks_restore_environment(self):
  with tempfile.TemporaryDirectory() as tmp:
   p=pathlib.Path(tmp);h=setup.hooks(p/'modern env')
   for name,content in h.items():
    f=p/name;f.parent.mkdir(exist_ok=True);f.write_text(content)
   subprocess.run(['bash','-n',str(p/'activate.d/reliondeluxe_cryocare.sh')],check=True)
   subprocess.run(['bash','-c','export LD_LIBRARY_PATH=original; export TF_CUDA_CLANG=""; unset TF_XLA_FLAGS XLA_FLAGS; source "$1"; source "$2"; [[ "$LD_LIBRARY_PATH" == original && "${TF_CUDA_CLANG+x}" == x && -z "$TF_CUDA_CLANG" && -z "${TF_XLA_FLAGS+x}" && -z "${XLA_FLAGS+x}" ]]','test',str(p/'activate.d/reliondeluxe_cryocare.sh'),str(p/'deactivate.d/reliondeluxe_cryocare.sh')],check=True)
 def test_install_existing_environment_and_wrapper(self):
  with tempfile.TemporaryDirectory() as tmp:
   root=pathlib.Path(tmp);base=root/'miniforge';modern=base/'envs/cryocare-modern';relion=base/'envs/relion-5.1'
   (base/'etc/profile.d').mkdir(parents=True);(base/'etc/profile.d/conda.sh').write_text('conda() { :; }\n')
   (modern/'bin').mkdir(parents=True);relion.mkdir()
   (modern/'bin/python').write_text('#!/bin/bash\nprintf "%s\\n" "$@"\n');(modern/'bin/python').chmod(0o755)
   for name in setup.SCRIPTS:(modern/'bin'/name).touch()
   calls=[]
   def output(args,**kw):
    args=list(map(str,args));calls.append(args)
    if 'list' in args:return json.dumps({'envs':[str(modern),str(relion)]})
    if 'info' in args:return json.dumps({'root_prefix':str(base)})
    if 'rev-parse' in args:return 'abc123\n'
    return setup.URL+'\n'
   def command(args,**kw):
    calls.append(list(map(str,args)))
    if args[0]=='git':pathlib.Path(args[-1]).mkdir()
   with patch.object(setup,'run',output),patch.object(setup.subprocess,'run',command):setup.install(root,str(base/'bin/conda'))
   cfg=json.loads((root/'cryocare-install.json').read_text());self.assertEqual(cfg['cryocare_path'],str(root/'relion_cryocare_wrappers'))
   result=subprocess.check_output([str(root/'relion_cryocare_wrappers/cryoCARE_train.py'),'--conf','a file.json'],text=True)
   self.assertEqual(result.splitlines(),[str(modern/'bin/cryoCARE_train.py'),'--conf','a file.json'])
   self.assertTrue(any('check' in c for c in calls));self.assertFalse(any('create' in c for c in calls))
   self.assertTrue((relion/'etc/conda/activate.d/reliondeluxe_cryocare.csh').is_file())
if __name__=='__main__':unittest.main()
