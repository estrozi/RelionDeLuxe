# RelionDeLuxe

A browser-based interface for RELION single-particle analysis (SPA) and subtomogram averaging (STA). Prepare jobs, follow dependencies, inspect results, and use interactive previews from a local web interface.

RelionDeLuxe uses RELION's native pipeline and command builders through a small compiled adapter. Installed scientific programs perform the calculations. This is an independent project, not an official RELION release.

Download the [0.15.320 prerelease](https://github.com/estrozi/RelionDeLuxe/releases/tag/v0.15.320). Known test failures remain; see the [validation report](docs/repository-validation.md).

## Quick start

Use Node.js 22 or newer. No npm packages or frontend build are required for the application.

```sh
git clone https://github.com/estrozi/RelionDeLuxe.git
cd RelionDeLuxe
sh scripts/start.sh --demo
```

Open the token-bearing URL printed in the terminal. Demo mode uses simulated data and does not perform cryo-EM processing.

For real projects, build the adapter against the RELION release installed on your system. Linux, Python 3, Git and g++ are needed; RELION 5.0.1 and 5.1.1 source releases are supported by the builder.

```sh
# Example for an installed RELION 5.1.1 environment:
python3 scripts/build_bridge.py relion-source --relion-version 5.1.1 --output build
sh scripts/start.sh --project /absolute/path/to/project
# For STA, append --tomo.
```

The builder asks before cloning a missing RELION source directory. See the installation guide for existing source trees, environment selection, and upgrades.

## Features

- SPA and STA job editors using native RELION job schemas and command generation.
- Feed and Hierarchy views, job icons, summaries, progress, logs and dependency navigation.
- Drafts, continuation, scheduling, command previews, aliases, and downstream deletion/restore workflows.
- Configurable next-job suggestions, including resolution, Nyquist and project-history conditions.
- Automatic file detection, metadata hints and contextual defaults; required pixel size and dose prompts.
- Local CTF and LoG picking previews with adjustable controls.
- Browser image galleries, particle selection/picking, tilt-image exclusion and tomography picking.
- 3D map previews and local-resolution coloring, convergence plots and result thumbnails.
- Mask re-scaling as an External job, with pixel-size checks before post-processing.
- Workstation/Cluster defaults, executable discovery and SBGrid-aware startup.
- Light/dark themes and a read-only mode.

See [the feature and usage guide](docs/usage.md) for details and limitations.

## Documentation

- [Installation and requirements](docs/installation.md)
- [Configuration and environment variables](docs/configuration.md)
- [Usage and features](docs/usage.md)
- [Cluster execution](docs/cluster.md)
- [Next-job definitions](next-job/README.md)
- [Tomogram picking](docs/tomogram-picking.md)
- [Idealized pipelines](docs/IDEALIZED-PIPELINES.md)
- [Repository publishing](docs/publishing.md)
- [Validation status](docs/repository-validation.md)
- [Historical development notes](CHANGELOG.md)

## Development

```sh
npm test
RELION_DELUXE_BRIDGE="$PWD/build/relion_deluxe_bridge" npm test
```

Native integration tests require the compiled adapter. Optional browser tests require a separately installed Playwright environment. The current full test suite has known failures; see the validation status before treating this distribution as production validated.

## License and attribution

GPL-2.0-or-later. See [LICENSE](LICENSE), [NOTICE](NOTICE), and the preserved upstream notices. RELION and optional scientific tools must be obtained separately under their own distribution terms. Please cite RELION and the scientific methods used in your processing.
