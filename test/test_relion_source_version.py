import importlib.util
import pathlib
import subprocess
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('source_version', pathlib.Path(__file__).resolve().parents[1] / 'scripts/relion_source_version.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)

class SourceVersionTests(unittest.TestCase):
    def test_versions(self):
        self.assertEqual(m.release_for_runtime('5.1.1-commit-afdd81'), '5.1.1')
        self.assertEqual(m.release_for_runtime('5.0.1'), '5.0.1')
        self.assertEqual(m.release_for_runtime('5.1.0'), '5.1.1')
        self.assertIsNone(m.release_for_runtime('5.2.0'))

    def test_real_version_command_and_installation_override(self):
        with tempfile.TemporaryDirectory() as root:
            binary = pathlib.Path(root) / 'bin' / 'relion_refine'
            binary.parent.mkdir()
            binary.write_text('#!/bin/sh\necho "RELION version: 5.1.1-commit-afdd81"\n')
            binary.chmod(0o755)
            env = {'PATH':'', 'RELIONDELUXE_RELION':root}
            self.assertEqual(m.choose_release(env=env, emit=lambda _:None), '5.1.1')

    def test_explicit_override_does_not_probe(self):
        with patch.object(m, 'detect_runtime', side_effect=AssertionError('must not probe')):
            self.assertEqual(m.choose_release('5.0.1'), '5.0.1')

    def test_failed_detection_requires_choice(self):
        with patch.object(m, 'detect_runtime', return_value=(None,None)):
            with self.assertRaisesRegex(SystemExit, '--relion-version'):
                m.choose_release(interactive=False)
            self.assertEqual(m.choose_release(interactive=True, ask=lambda _: '5.1.1', emit=lambda _:None), '5.1.1')
            with self.assertRaisesRegex(SystemExit, 'cancelled'):
                m.choose_release(interactive=True, ask=lambda _: '', emit=lambda _:None)

    def test_unsupported_family_is_not_silently_downgraded(self):
        with patch.object(m, 'detect_runtime', return_value=('5.2.0','/bin/relion_refine')):
            with self.assertRaisesRegex(SystemExit, 'outside the supported'):
                m.choose_release(emit=lambda _:None)

    def test_wrapper_failure_and_timeout_fall_back(self):
        with patch.object(m.shutil, 'which', side_effect=lambda n,**kw:'/bin/'+n):
            calls=[]
            def run(args,**kwargs):
                calls.append(args)
                if len(calls)==1:raise subprocess.TimeoutExpired(args,5)
                return subprocess.CompletedProcess(args,0,'','RELION version 5.0.1')
            self.assertEqual(m.detect_runtime({'PATH':'/bin'},run=run)[0], '5.0.1')
            self.assertEqual(calls[-1], ['/bin/relion_pipeliner','--version'])

    def test_build_clone_checks_out_detected_release(self):
        import runpy, sys
        script=pathlib.Path(__file__).resolve().parents[1] / 'scripts/build_bridge.py'
        class StopBeforeCompile(Exception): pass
        with tempfile.TemporaryDirectory() as root:
            source=pathlib.Path(root)/'source';calls=[]
            def run(args,**kwargs):
                calls.append(args)
                if args[0]=='g++':raise StopBeforeCompile()
                if args[:2]==['git','clone']:
                    (source/'src').mkdir(parents=True)
                    (source/'src/macros.h').write_text('#define RELION_SHORT_VERSION "5.1.0"')
                return subprocess.CompletedProcess(args,0,'5.1.1\n','')
            with patch.dict(sys.modules, {'relion_source_version':m}), patch.object(sys,'argv',[str(script),str(source),'--output',str(pathlib.Path(root)/'build')]), patch.object(sys.stdin,'isatty',return_value=True), patch('builtins.input',return_value='y'), patch.object(m,'detect_runtime',return_value=('5.1.1-commit-afdd81','/bin/relion_refine')), patch('subprocess.run',side_effect=run), patch('subprocess.check_output',return_value='commit\n'), patch('builtins.print'):
                with self.assertRaises(StopBeforeCompile):runpy.run_path(str(script),run_name='__main__')
            self.assertIn(['git','-C',str(source),'checkout','--detach','5.1.1'],calls)

if __name__ == '__main__': unittest.main()
