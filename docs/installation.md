# Installation

## Requirements

| Component | When needed |
|---|---|
| Linux workstation or server | Supported native bridge build and scientific execution environment |
| Node.js 22+ | Web server; older runtimes may start with a warning but are not the supported baseline |
| Modern browser | GUI; WebGL-capable browser/GPU for 3D viewing |
| Python 3, g++, Git | Building the lightweight native adapter; Git also retrieves source |
| Installed RELION 5.0.1 or 5.1.1 | Real processing; source used for the adapter must match the installed release family |
| RELION source checkout | Adapter compilation, separate from installed RELION binaries |
| MPI and CUDA/GPU environment | Only as required by the selected RELION calculation and installation |
| Job-specific scientific tools | CTFFIND, MotionCor2, Topaz, AreTomo, IMOD, ResMap, ModelAngelo, DynaMight or cryoCARE as required by the chosen job |

The Node application has no npm dependencies. The adapter compiles metadata/pipeline code; it does not build RELION reconstruction engines and does not require FLTK, CUDA or FFTW for that adapter build. Scientific executables retain their own requirements. Demo mode needs only Node and a browser.

## Install and build

Download a source ZIP or clone this repository, then enter its root directory. Activate the shell environment you normally use for RELION. Check `node --version`, `python3 --version`, `g++ --version`, and `relion_refine --version`.

For an existing official source checkout:

```sh
python3 scripts/build_bridge.py /path/to/relion-source --output build
```

For a missing source directory, the builder can propose a matching release and ask before cloning:

```sh
python3 scripts/build_bridge.py relion-source --relion-version 5.1.1 --output build
```

Use `5.0.1` for a 5.0 installation. Existing source directories are never switched automatically. Official tags 5.0.1 and 5.1.1 are recognized. An official source archive without Git metadata needs `--allow-other-revision`; verify its release yourself.

## Start

```sh
sh scripts/start.sh --project /absolute/path/to/project
sh scripts/start.sh --project /absolute/path/to/sta-project --tomo
sh scripts/start.sh --project /absolute/path/to/project --readonly
```

The project directory must exist. Use the startup initialization dialog for a new project. Bridge lookup is `--bridge`, `RELION_DELUXE_BRIDGE`, PATH, then the application's `build/relion_deluxe_bridge`. Open the printed token URL. The default address is 127.0.0.1:4310. `--port`, `--no-browser`, `--debug`, and `--read-root /external/data` are available; run `sh scripts/start.sh --help` for the exact current options.

For a remote server, keep loopback binding and use an SSH tunnel, for example `ssh -L 4310:127.0.0.1:4310 user@server`, then open the token URL locally. `--host 0.0.0.0` exposes the server on network interfaces; this is a job-control service, not a public website. Do not publish token URLs.

## SBGrid and other installations

With bash, activate your site environment, commonly `source /programs/sbgrid.shrc`; tcsh commonly uses `/programs/sbgrid.cshrc`. Startup also attempts SBGrid loading when appropriate. See [configuration](configuration.md) for executable overrides and the SBGrid tomography-denoising restriction.

If npm or the default Node wrapper fails, select a working Node explicitly and use the direct launcher:

```sh
export RELIONDELUXE_NODE=/absolute/path/to/node
sh scripts/start.sh --project /absolute/path/to/project
```

## Optional modern cryoCARE setup

For a compatible local RELION Python installation, the builder supports `--replace_cryocare`, `--conda-executable /path/to/conda`, and `--relion-conda-env relion-5.1`. This installs an environment, wrappers and activation hooks; it is not needed for ordinary SPA use. Review `scripts/setup_cryocare.py` before changing a shared scientific environment. Denoise tomograms is disabled when the application detects SBGrid RELION.

## Upgrading and troubleshooting

Stop the web server, replace application source, rebuild the bridge when required or when changing RELION versions, restart, then reload the browser. Keep your project separate from the application source. Existing project `next-job` folders are preserved and must be updated deliberately.

Use `sh scripts/start.sh --help` and `node scripts/diagnose-environment.mjs` for environment diagnostics. Missing scientific executables need the appropriate installation/environment, not npm install. Version mismatch errors require matching the bridge source and runtime RELION. Read job stderr for processing failures. Keep one active writer per project; do not remove RELION locks without investigating their owner.
