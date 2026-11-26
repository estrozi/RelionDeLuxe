"""Choose a supported source release from the installed RELION, without a shell."""
import os
import pathlib
import re
import shutil
import subprocess

SUPPORTED_RELEASES = ('5.0.1', '5.1.1')


def detect_runtime(env=None, run=subprocess.run):
    env = dict(os.environ if env is None else env)
    installation = env.get('RELIONDELUXE_RELION', '').strip()
    for name in ('relion_refine', 'relion_pipeliner'):
        if installation:
            executable = str(pathlib.Path(installation) / 'bin' / name)
            if not os.path.isfile(executable) or not os.access(executable, os.X_OK):
                continue
        else:
            executable = shutil.which(name, path=env.get('PATH', ''))
        if not executable:
            continue
        try:
            result = run([executable, '--version'], capture_output=True, text=True,
                         timeout=5, env=env, check=False)
        except (OSError, subprocess.TimeoutExpired):
            continue
        output = (result.stdout or '') + '\n' + (result.stderr or '')
        match = re.search(r'\bRELION\s+version\s*:?\s*(\d+\.\d+(?:\.\d+)?(?:[-_][\w.-]+)?)', output, re.I)
        if not match:
            match = re.search(r'^\s*(\d+\.\d+\.\d+(?:[-_][\w.-]+)?)\s*$', output, re.M)
        if match:
            return match[1], executable
    return None, None


def release_for_runtime(version):
    # Release headers sometimes retain .0 even in a .1 release. Use the
    # supported release of that family; never follow a moving branch.
    family = '.'.join(version.split('.')[:2])
    return next((v for v in SUPPORTED_RELEASES if v.startswith(family + '.')), None)


def choose_release(explicit=None, *, interactive=False, ask=input, emit=print, env=None):
    if explicit:
        return explicit
    version, executable = detect_runtime(env)
    if version:
        release = release_for_runtime(version)
        emit('Detected RELION '+version+' via '+executable)
        if release:
            emit('Proposed source release: '+release+' (matching '+'.'.join(version.split('.')[:2])+' family).')
            return release
        raise SystemExit('Detected RELION '+version+' is outside the supported 5.0 / 5.1 families. Select a matching installation or explicitly specify --relion-version 5.0.1 or 5.1.1. No source was cloned.')
    message = 'Could not detect the installed RELION version. Check PATH or RELIONDELUXE_RELION (SBGrid wrappers may not report a version).'
    if not interactive:
        raise SystemExit(message+' Specify --relion-version 5.0.1 or --relion-version 5.1.1. No source was cloned.')
    emit(message)
    try:
        answer = ask('Source release to clone [5.0.1 / 5.1.1; Enter cancels]: ').strip()
    except (EOFError, KeyboardInterrupt):
        answer = ''
    if answer not in SUPPORTED_RELEASES:
        raise SystemExit('Build cancelled; specify a supported release explicitly. No source was cloned.')
    return answer
