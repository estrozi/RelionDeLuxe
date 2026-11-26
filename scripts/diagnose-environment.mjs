import {resolveExecutable} from '../lib/executables.mjs';
console.log('RelionDeLuxe environment diagnostics (no scientific commands executed)');
console.log('Node runtime:',process.execPath,process.version);
console.log('Working directory:',process.cwd());
for(const name of ['node','npm','relion','relion_pipeliner','relion_image_handler','relion_display','relion_python_tomo_denoise','mpirun','sbatch','sbgrid-info'])console.log(name+':',await resolveExecutable(name)||'NOT FOUND / inaccessible');
console.log('PATH entries (search order):');for(const p of (process.env.PATH||'').split(':'))console.log('  '+(p||'(current directory)'));
console.log('Resolution checks executable permissions only. A resolved wrapper may still fail internally or on an unavailable NFS mount. No wrapper targets are substituted.');
console.log('Run command -v node and command -v relion_image_handler in the terminal used to start the server. If a wrapper reports a missing node__ccp4 file, provide that error to your SBGrid administrator.');
