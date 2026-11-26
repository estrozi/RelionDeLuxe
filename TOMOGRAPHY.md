# Tomography / STA — implementation (0.15.228)

Start the server in a **separate tomography project**:

```bash
python3 scripts/build_bridge.py /path/to/relion-source --output build
npm start -- --tomo --project /path/to/tomography-project
```

Rebuilding the adapter is required for this release. Use the RELION source revision specified in NOTICE, as with the existing SPA build. Keep your installed RELION 5.0 tools and tomography Python environment available in PATH. `--bridge`, `--host`, `--port`, `--read-root`, `--readonly` and `--debug` work with `--tomo`. For an interface-only demonstration:

```bash
npm start -- --demo --tomo
```

Omit `--tomo` for SPA. Projects with identifiable jobs from the opposite mode are rejected before the server starts. Shared utility jobs alone do not establish a mode. Existing projects are never converted. Do not run SPA and STA servers against the same project.

## Included

The menu contains the 24 types exposed by the native RELION tomography GUI. Forms and conditional field rules are extracted from the pinned source; the installed adapter supplies the live parameter schema, generates commands, writes job settings, and delegates pipeline operations to RELION.

| Area | Jobs |
| --- | --- |
| Tilt-series preparation | Import tilt series, Motion correction, CTF estimation, Exclude tilt-images, Align tilt-series |
| Tomograms and particles | Reconstruct tomograms, Denoise tomograms, Pick tomograms, Extract subtomos |
| Averaging | 3D initial reference, 3D classification, 3D auto-refine, 3D multi-body, Subset selection |
| Tomographic refinement | Reconstruct particle, CTF refinement, Bayesian polishing |
| Utilities | Mask creation, Join star files, Particle subtraction, Post-processing, Local resolution, ModelAngelo building, External |

Shared names do not imply shared inputs: tomography CTF refinement and polishing use their own native job types; initial-model/classification/refinement forms expose an optimisation set or direct particle/tomogram/trajectory inputs. Shared utilities retain the variants used by RELION's own tomography GUI. Availability in the menu is not proof that every SPA operation is scientifically appropriate for tomography.

The existing themes, adjustable panels, job selection, logs, scheduling, continuation, Trash, cleanup, command preview, duplicate warnings and compatible `.Nodes` file browsing remain available. Registered MRC maps and PDFs use the existing browser viewers. Gallery inspection remains available for supported image/model STAR tables. New data-family symbols distinguish tilt-series metadata, tomograms, optimisation sets and trajectories.

## Browser interaction

Exclude tilt-images opens `excluder.html`. Select a tilt series, inspect its images in angle order, and uncheck unwanted images. Save selection stores progress; Save and finish writes `selected_tilt_series.star` and per-series STAR files, preserving retained metadata. Empty series are omitted. The input STAR files and micrographs are never modified. Running browser jobs can be reopened with Continue. Multiple-window stale saves and changed input metadata are rejected. Exclusion is interactive and must be run directly, not by the batch scheduler.

Aligned/corrected/selected tilt-series outputs open the same helper read-only. It displays the `rlnMicrographName` images referenced by the metadata, as the native tilt-series viewer does; it does not resample pixels using alignment transforms. Image display uses the existing MRC image decoder.

Pick tomograms uses `tomo_pick.html`; reconstructed and denoised tomograms also use that browser viewer. Other unsupported native operations retain their existing viewers.

**After updating to 0.15.228, rebuild the native bridge** using `python3 scripts/build_bridge.py relion-source --output build` (retain any additional build options used by your installation), then restart the server. Older bridges cannot register browser exclusion jobs.

## Input checks

Preflight follows modern RELION metadata through:

- Optimisation set → particles, tomograms, optional trajectories/manifolds and reference files.
- Tomogram set → the per-tilt-series STAR files.
- Relevant particle or tilt tables → image/stack files, using existence checks without reading image bytes.

Checks cover required structural columns, complete coordinate triplets, extracted images for refinement, requested CTF power spectra, unknown tomogram references within an optimisation set, missing files and higher-numbered producer jobs. Future files from earlier scheduled jobs remain pending rather than being treated as missing errors. Import movie/image and MDOC patterns are checked for matches.

These are **structural checks**, not a complete scientific validation of every stage. No implicit conversion of pixel coordinates to centered Angstrom coordinates is performed. Legacy embedded tilt tables are reported for review. Inspection is bounded to 64 MiB per metadata file and 10,000 linked metadata files; exceeding a bound produces a warning rather than claiming validation succeeded.

MDOC/movie pairing, coordinate handedness, tilt geometry, reference binning, dose conventions, odd/even reconstruction availability and data-dependent alignment settings still need user review. CryoCARE needs appropriately generated half tomograms. Tomographic CTF refinement/polishing require suitable references, masks and postprocess data; SPA input rules are not substituted for those requirements.

## Resource defaults

Global settings and per-job precedence remain available. STA template resources are portable (`TBD`) and resolved during batch preview. Conservative STA rules are deliberately separate from the SPA formulas:

| Job/mode | Initial allocation |
| --- | --- |
| Motion correction (RELION or external) | global CPU count as MPI processes, 1 thread; configured GPU IDs for the external implementation |
| CTF estimation | global CPU count as MPI processes |
| Tomographic reconstruction, extraction, CTF refinement and polishing | 1 MPI process; global CPU count as threads where supported |
| 3D initial reference | 1 MPI process, global CPU count as threads |
| 3D classification | GPUs + 1 MPI processes; floor(CPUs / GPUs) threads, minimum 1 |
| 3D auto-refine | 2 × GPUs + 1 MPI processes; floor(CPUs / (2 × GPUs)) threads, minimum 1 |
| Denoising | Training: all configured GPU IDs (or 0); prediction: first configured ID (or 0). No MPI |
| Import, tilt exclusion, picking, Subset selection | Local execution |

Only fields present in the native schema are set. Counts are starting values, not hardware detection or a promise against oversubscription; inspect Running settings and queue allocations. Tomogram-count-aware MPI allocation is deferred. AreTomo and IMOD executable paths now have validated global defaults. The cryoCARE executable directory also has a validated global default, with an empty value selecting PATH lookup.

## Idealized pipelines

STA templates carry `"mode": "tomo"`. SPA templates without a mode remain SPA-compatible. Cross-mode imports are rejected. Capture, input bindings, portable resources, batch preview and normal native batch scheduling work for STA.

Refinement rounds should be represented by separate fresh jobs with explicit dependencies on the updated optimisation set. Automatic STA feedback-loop unfolding / clone continuations are deferred; validation rejects explicit STA clone-continuation templates. Native continuation of an individual concrete STA job remains available. Interactive steps can pause an unattended batch awaiting user work. Review data-dependent output names and manual-preparation reminders.

## Validation performed

- Exact comparison of the generated 24-job STA catalogue with the compiled native adapter.
- Native command previews for 15 principal STA stages, without launching scientific calculations.
- Native scheduling, mode rejection, deletion and restoration.
- Capture, preview and scheduling of an Import → Motion correction → CTF estimation template, including pending future inputs and resolved resources.
- Authenticated demo/native HTTP startup, asset MIME types, compatible input browsing and preflight confirmation.
- Nested metadata and resource-rule tests.
- Full existing suite compared against 0.14.122: the same 14 failures and 4 skips were reproduced in the baseline. Those older failures are not resolved by this release. New tomography tests pass.

A complete tutorial reconstruction and graphical Napari/GPU/cluster execution still require testing on the RELION workstation. Browser visual layout has not been independently automated in this environment.

### Multi-GPU cryoCARE training

The [make_cryocare_great_again fork](https://github.com/GavinR1/cryoCARE_pip/tree/make_cryocare_great_again), inspected at commit `4ca416d226fb1240b123c14e542ced4907b57899`, supports multi-GPU training via MirroredStrategy. Its README documents single-GPU prediction. Set Which GPUs to use to `0,1` (colon separators also work) for training and point cryocare_path to that installation. Device IDs are relative to the GPUs visible to the process.

The adapter leaves RELION sources unchanged: it stores the first GPU in gpu_ids and additional IDs as repeated --gpu options in other_args. RELION's Python wrapper accepts those options and writes the GPU list to cryoCARE's configuration. Reading a job through RelionDeLuxe reverses this encoding, including before portable template capture. The native GUI will show the first GPU and the extra arguments separately. Both immediate execution and the stock scheduler use the same representation. No MPI is added. Duplicate/invalid IDs and multi-GPU prediction are rejected with actionable messages.

Modern cryoCARE setup is available through `scripts/build_bridge.py --replace_cryocare`; see README 0.15.5 for options, activation hooks, default precedence and workstation validation. The installation is opt-in and does not modify RELION sources.
