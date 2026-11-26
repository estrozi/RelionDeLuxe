export const environmentHelp=`
Environment variables (set before starting the server)

RelionDeLuxe overrides:
  RELIONDELUXE_RELION     Absolute RELION installation root (containing bin/).
                         After SBGrid setup, prepends its bin directory to PATH
                         for the server, native bridge and launched jobs. Example:
                         /programs/x86_64-linux/relion/5.1.1_cu12.2
                         Includes relion_python_*; missing programs still fall
                         back to the remaining PATH. Does not fix that install's
                         Python dependencies or alter absolute job paths.
                         Explicit per-tool overrides still take precedence.
  RELIONDELUXE_NODE       Node executable used by scripts/start.sh (absolute path).
                         Otherwise npm_node_execpath, then node on PATH is used.
  RELION_DELUXE_BRIDGE    Native adapter executable; --bridge takes precedence.
                         Otherwise searches PATH, then build/relion_deluxe_bridge.
  RELIONDELUXE_CLASS_RANKER  Absolute working relion_class_ranker executable.
                         Overrides PATH/SBGrid for direct and scheduled jobs.
  RELIONDELUXE_TOPAZ      Working relion_python_topaz executable for browser-picker
                         denoising; use a version-specific path with SBGrid.
                         Auto-picking's executable field remains a job setting.
  RELIONDELUXE_MPIRUN     Absolute MPI launcher path, mapped to RELION_MPIRUN.
                         With SBGrid detected, startup selects mpirun.relion from
                         PATH and replaces this value automatically.
  --cluster discovers mpirun.relion/mpirun/mpiexec and relion_python_topaz in
  PATH when overrides are absent. Existing RELION_MPIRUN is preserved.
  Missing tools produce guidance rather than blocking startup; Topaz is optional.
  Explicit overrides must be valid. Generic SBGrid dispatchers are not selected.
  Detection checks executable availability, not MPI binary compatibility.

Executable discovery, desktop and hardware:
  PATH                   Searches RELION, MPI, queue commands, whiptail, browser
                         launchers and other external programs.
  SHELL                  Chooses bash/zsh or csh/tcsh when auto-loading SBGrid.
  SB_BASE, SBGRID         Help identify SBGrid; SB_BASE also identifies its root
                         for the tomography denoising restriction.
  CUDA_VISIBLE_DEVICES   Restricts visible GPUs and influences local GPU counting.
  DISPLAY, WAYLAND_DISPLAY
                         Identify a local graphical session; DISPLAY also affects
                         native viewers through their inherited environment.
  SSH_CONNECTION, SSH_CLIENT, SSH_TTY, CI
                         Any nonempty value prevents automatic browser opening.
  TERM                   TERM=dumb disables whiptail dialogs (text prompts remain).
  TMPDIR, TMP, TEMP       Node temporary-directory selection, in that order;
                         also affects startup warning-details temporary files.
  NODE_OPTIONS           Standard Node runtime options (handled by Node itself).
  npm_node_execpath      Runtime supplied by npm; normally do not set manually.

Inherited RELION defaults (depend on the linked RELION version):
  RELION_MPIRUN          Native MPI command, unless overridden as described above.
  RELION_QSUB_NRMPI, RELION_QSUB_NRTHREADS
                         Initial MPI process and thread counts.
  RELION_MPI_MAX, RELION_THREAD_MAX
                         Native slider limits, not allocated resource counts.
  RELION_ERROR_LOCAL_MPI Native limit/check for large local MPI launches.
  RELION_QUEUE_USE, RELION_QUEUE_NAME
                         Native queue submission defaults.
  RELION_QSUB_COMMAND, RELION_QSUB_TEMPLATE
                         Queue command and submission-script defaults.
  RELION_MINIMUM_DEDICATED
                         Native minimum dedicated cores default.
  RELION_QSUB_EXTRA_COUNT, RELION_QSUB_EXTRA<N>,
  RELION_QSUB_EXTRA<N>_DEFAULT, RELION_QSUB_EXTRA<N>_HELP
                         Additional queue fields (N starts at 1).
  RELION_SCRATCH_DIR     Native scratch-directory default.
  RELION_MOTIONCOR2_EXECUTABLE, RELION_CTFFIND_EXECUTABLE,
  RELION_RESMAP_EXECUTABLE, RELION_BATCHTOMO_EXECUTABLE,
  RELION_ARETOMO_EXECUTABLE
                         Native external-program defaults.
  Project/workstation defaults, job settings and RelionDeLuxe mode rules can
  supersede native defaults. Environment changes do not rewrite saved jobs.
  RELIONDELUXE_MODE is internal: the server sets it from --tomo; do not use it
  instead of --tomo.

Conda / modern cryoCARE setup (build_bridge.py --replace_cryocare):
  CONDA_EXECUTABLE, CONDA_EXE, CONDA_INSTALL
                         Conda lookup: --conda-executable, CONDA_EXECUTABLE,
                         CONDA_EXE, CONDA_INSTALL/bin/conda, then conda on PATH.
  LD_LIBRARY_PATH, TF_CUDA_CLANG, TF_XLA_FLAGS, XLA_FLAGS
                         Modified by the installed modern-cryoCARE activation
                         hooks and restored on deactivation. Their private
                         RELIONDELUXE_SAVED_* variables are not user settings.

Child programs inherit the server environment. Variables such as PYTHONPATH,
CONDA_PREFIX, LD_LIBRARY_PATH, OMP_NUM_THREADS and scheduler/MPI variables may
also affect those external programs; their supported variables depend on the
installed software. This list is not an exhaustive external-software reference.
No current environment values or credentials are printed by --help.

Examples:
  bash: export RELIONDELUXE_TOPAZ=/path/to/relion/bin/relion_python_topaz
  tcsh: setenv RELIONDELUXE_TOPAZ /path/to/relion/bin/relion_python_topaz
  npm start -- --help
  sh scripts/start.sh --help
`;
