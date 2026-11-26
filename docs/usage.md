# Usage and features

## Start a project

Launch with `--project` and add `--tomo` for STA. Initialize a new project and set computing defaults. Import raw data or existing RELION-compatible inputs. The first Import requires a deliberate pixel-size value; Motion correction also prompts for dose rather than assuming an initial value. Inspect detected image dimensions, gain/MTF suggestions and, for STA, mdoc metadata. These are suggestions to review, not independent calibration measurements.

## Prepare and run jobs

Select a job type or a next-job button to create a draft. Available job types depend on compatible results, offered next jobs and existing drafts; Show all reveals the complete list. Wait for draft input checks to finish, review parameters and inputs, then use Check command, Run or Schedule. Check command does not execute a calculation. Continuation uses the native continuation settings; temporary continuation-file selection for Check command is restored afterward.

Workstation and Cluster modes have separate defaults. Review MPI, threads, GPUs and executable fields for the chosen calculation. Scheduled/running state is distinct from successful completion. Read stdout and stderr when jobs fail.

## Inspect results

The Feed shows job workspaces. Hierarchy provides dependency navigation and appears once enough pipeline jobs exist. Retrospective masks are drawn with opposite arrows while excluded from hierarchy ranking; unrelated cycles remain errors. Job summaries include available file counts, dimensions, resolution and progress. Nyquist warnings use extracted-particle sampling metadata.

CTF estimation drafts offer local previews with FFT size, resolution and defocus controls. Update preview samples another image when available. Given power spectra fix the FFT box size. Yellow circles use diagnostic sampling; STA dose-dependent search limits can differ from requested limits and appear in debug output.

LoG Auto-picking includes diameter overlays and Test picking. LoG diameter limits remain ordered. Preview selection, display filtering and scientific job settings have distinct roles; review settings before a full run.

Browser tools include particle picking/selection, tilt-image exclusion, map viewing, local-resolution coloring and tomography picking. Some outputs still use native viewers, which require the server's graphical environment. Convergence plots and thumbnails are available for supported iterative jobs.

## STA helpers

Import examines mdoc metadata and frame information. Alignment completion reports tilt-axis rotation statistics. Tomogram denoising supports training defaults, model suggestions and progress reporting. Motion correction must save even/odd images for denoising; reconstruction split options follow upstream availability. See the tomography picking guide for interactive supports and export.

## Masks and downstream jobs

Mask re-scaling is an External job with a map and mask input. It matches sampling/grid and clamps values to [0,1]. Post-processing warns about incompatible sampling. ModelAngelo input defaults use appropriate post-processed masked maps. Review all scientific defaults before submission.

## Custom workflows

Edit the project's next-job JSON files and reload the browser. The installation provides starter definitions, copied only when the project has none. Resolution conditions, near-Nyquist conditions and successful 3D-job history are supported. See `next-job/README.md`. Idealized pipelines provide configurable sequences of drafts.

## Files and cleanup

Use the job actions menu to inspect downstream deletion scope and restore from Trash. Avoid concurrent project edits through multiple writers. Read-only mode is available for inspection. File/symlink checks omit Trash. Input files outside allowed roots may require `--read-root`.

## Scope

RelionDeLuxe is a developing interface, not a claim of full native RELION GUI parity. Local previews and unit tests do not validate a scientific reconstruction. Native integrations and optional tools depend on the installed software. The full test-suite status is recorded in repository-validation.md.
