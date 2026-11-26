# Historical development notes

These notes preserve the original development record, including superseded instructions. Use README.md and the current guides for installation and operation.

## 0.15.245 — draft CTF live preview

CTF estimation drafts (SPA and STA, including pinned drafts) have a Live preview tab immediately after I/O. Opening it runs relion_run_ctffind locally on one randomly chosen input micrograph, with the draft's current CTFFIND search options and preserved optics/tilt metadata. Each draft has its own random selection; tab switches preserve that selection and reuse the result if settings are unchanged. Update preview explicitly reruns it. The diagnostic uses the same MRC reader as the gallery.

The test uses a private temporary directory, serial execution, and no queue or pipeline job registration. Input metadata and images are untouched; temporary files are removed on success or failure. A second concurrent CTF preview is rejected with a wait message. Additional arguments are explicitly rejected for previews rather than silently ignored or allowed to redirect output. Scheduled and executed jobs do not show this tab.

Nine targeted tests pass, covering SPA/STA one-image staging, metadata preservation, command options, tab eligibility and cleanup. Real CTFFIND execution could not be exercised in the development environment because CTFFIND is not installed. Restart the server and reload the GUI; no bridge rebuild is needed from 0.15.244.

## 0.15.244 — tomography completion and summaries

Completion-marker reconciliation now follows RELION's own SUCCESS/FAILURE/ABORTED precedence. A newer job.star timestamp no longer prevents a running job (including Reconstruct tomograms) from appearing finished. Scheduled jobs remain scheduled until launched; RELION clears terminal markers at launch/continuation.

Exclude tilt-images summaries now show excluded/total image counts by comparing the linked input and output tilt-series tables, including completely excluded series. STA CTF estimation now shows the min/max DefocusU range in microns, rounded to one decimal as in SPA. Linked STAR summaries are cached and revalidated when their files change.

Restart the server and reload the GUI. No native bridge rebuild is required from 0.15.243. Fourteen targeted tests pass. The full suite has 477 passing tests, 35 skipped tests and ten failures also reproduced against 0.15.243.

## 0.15.243 — origin-adjusted particle overlays

Tomogram particle overlays now display centered Angstrom coordinates plus their corresponding origin offsets: X = rlnCenteredCoordinateXAngst + rlnOriginXAngst, likewise for Y and Z. The sum is applied before voxel conversion, slice visibility and projection in all viewing directions. Absent origin columns contribute zero; non-finite values are omitted with the existing invalid-row warning. Legacy pixel coordinates are unchanged. This is a display change: input STAR files and saved support annotations are not rewritten.

Eight targeted overlay/view tests pass. Restart the server and reload the viewer. No native bridge rebuild is needed from 0.15.242.

## 0.15.242 — sphere probe colors and minimize/restore

The cylindrical projection now draws particle crosses using the selected support's color, matching the main tomogram canvas and support menu. A small corner button minimizes the inset to its draggable title bar and restores its previous dimensions. Cached projection data is retained; minimizing does not request a new projection or invalidate it just because the content is hidden.

Restart the server and reload tomo_pick.html. No native bridge rebuild is needed when upgrading from 0.15.241.

## 0.15.241 — reconstruction preview and tomography picking controls

STA Reconstruct particle jobs now have the same 64×64 map preview, slice slider and XYZ controls as refinement jobs. The preview prefers `merged.mrc`, then readable `half1.mrc` or `half2.mrc`; incomplete maps are skipped until ready.

During Fit sphere, middle-click and drag removes red fit points in the rectangle within the displayed slice/depth window, without changing support particles or fit points on other slices. The fit-point count and Fit sphere end availability update immediately. Clicking the tomogram canvas gives it keyboard focus: Left/Right moves one slice, without hijacking keyboard editing in inputs or selects.

Restart the server and reload the pages. No bridge rebuild is needed when upgrading from 0.15.240. Sixteen targeted tests pass, including map selection/slicing and fit-point rectangle geometry; interactive browser behavior has not been manually tested here.

## 0.15.240 — continue browser tomography picking with RELION 5.1

RELION 5.1's native Napari command builder requires `_rlnTomoReconstructedTomogram`. The browser editor also supports denoised and half-map columns. Browser picking now uses a dedicated preview/registration route through RELION's pipeline API, avoiding that Napari-only check. Native command validation is unchanged for native actions. The server still validates the STAR input, tomogram names, supported volume paths, headers and bounds before starting browser picking.

**Rebuild the bridge from this release against your installed RELION source**, then restart the server:

```sh
python3 scripts/build_bridge.py relion-source --output build
```

Continue the existing browser Pick job normally. Its job number, input STAR file, `browser-tomo-supports.json`, `particles.star` and `optimisation_set.star` are preserved. No re-picking, resampling or STAR-column edits are needed. Old bridges produce an explicit rebuild instruction. A running job still cannot be resubmitted and existing native-only picks remain read-only.

Validation includes native bridge builds and registration/continuation integration tests against official RELION 5.0.1 and 5.1.1 sources, using denoised-only input. Tests check stable job numbering, input/output graph edges, saved-file preservation and rejection of missing volumes. No interactive browser or production dataset test was performed.

## 0.15.239 — automatic source-release selection

When `scripts/build_bridge.py` needs to clone a missing source directory, it now probes the installed `relion_refine --version` (falling back to `relion_pipeliner --version`). It respects `RELIONDELUXE_RELION` when selecting programs. Detected 5.0 and 5.1 installations propose the supported release tags `5.0.1` and `5.1.1`, respectively, including version strings with commit suffixes. The clone confirmation displays the proposed tag.

An explicit `--relion-version` overrides detection. If detection is unavailable, an interactive build asks which release to use, with no default; noninteractive builds require the explicit option. Unsupported version families are not silently downgraded. Existing source directories are never automatically switched or overwritten: check out the matching tag manually when necessary. The normal clone approval is still required.

Seven tests cover version parsing, executable probing, overrides, failed detection, unsupported versions, timeout fallback and the actual build script's selected Git checkout.

## 0.15.238 — RELION 5.0 / 5.1 compatibility

Native job definitions, defaults, dropdown choices and command generation come from the compiled bridge, built against your chosen RELION source. New 5.1 options are placed in their native tabs while retaining RelionDeLuxe custom tab merges. Extract subtomos uses the 5.1 **Extract** tab with Angstrom box sizes, pixel output size and the three native formats, or the original 5.0 **Reconstruct** tab when using a 5.0 bridge. Related AreTomo, Wiener-filter, Blush, helical and amyloid additions are included when present in the schema.

**Rebuild the bridge against the same RELION release as the installed executables.** Changing the runtime PATH alone cannot change the bridge's command builders. For an existing official 5.1.1 Git checkout:

```sh
python3 scripts/build_bridge.py /path/to/relion-5.1.1 --output build
```

Official Git tags `5.0.1` and `5.1.1` are accepted. To clone into a missing source directory, use `--relion-version 5.1.1` (or `5.0.1`); the build script asks before cloning. For an unpacked official source archive without Git metadata, add `--allow-other-revision`. Keep using your cryoCARE replacement options if required by your installation.

Startup prints the bridge version and queries `relion_refine --version` with a timeout. A known 5.0/5.1 mismatch stops startup with instructions. Old bridges are identified by schema capabilities when possible. If wrappers prevent runtime detection, a warning asks you to verify the installation; runtime version detection cannot prove all programs or cluster nodes use the same release. Some official 5.1.1 source headers identify themselves as 5.1.0; compatibility checks compare the 5.1 family.

Do not interpret old extraction box sizes (binned pixels) as the new Angstrom sizes. Review old job/template settings when changing RELION versions. Unsupported extraction parameters now produce an explicit version/units message. Existing projects and user-edited next-job JSON files are not rewritten. Demo mode retains its bundled 5.0 metadata.

Verification: native bridge compilation against official tags 5.0.1 and 5.1.1; native command previews for both old formats and all three new formats; layout and conditional-control regression tests. Scientific reconstruction and interactive browser behavior have not been tested on a microscope dataset in this environment.

Source references: https://github.com/3dem/relion/blob/5.1.1/src/pipeline_jobs.cpp and https://github.com/3dem/relion/blob/5.1.1/src/gui_jobwindow.cpp . The checked-in `placements-5.1-*.json` files can be regenerated with `python3 scripts/extract_version_placements.py /path/to/relion-5.1.1`.

## 0.15.237 — particles stay inside their tomogram

Particle generation now checks actual volume dimensions and voxel sizes before adding samples to active lists. Loading, editing, resampling, saving and optimization enforce these bounds. Out-of-volume samples are excluded permanently until explicit resampling (or Undo); existing manual deletions remain intact. Support geometry may extend outside the volume, but its particles do not. Restart the server and reload the picking tab. No native bridge rebuild is needed.

## 0.15.236 — Exclude out-of-volume particles from export and optimization

Browser tomogram picking filters exported particles against each tomogram's MRC dimensions and voxel spacing. Out-of-volume coordinates are omitted from particles.star; support geometry and explicit deletions remain unchanged in browser-tomo-supports.json. Finish reports and logs the omitted count. Optimization applies its 20,000-particle limit after user exclusions and volume bounds, and scores the same initially valid particles at every trial; moves that push those particles outside are rejected. Non-finite voxels still require cleanup. Continue existing browser picks and Save and finish to regenerate their particles.star. No bridge rebuild is needed.

## 0.15.235 — Crop sphere probe to valid angular coverage

Update crops the sampled cylindrical projection to its finite latitude extent and the shortest periodic longitude interval containing valid samples, joining coverage across the ±180-degree seam. Longitude ticks and latitude bounds identify the displayed range. Particle overlays, rectangle/brush deletion, minima coordinates, slice guides and hover pointers respect the cropped coordinates. Cropped longitude edges are not treated as periodic neighbors by minima detection. Bounds are determined at probe sampling resolution; interior invalid voxels remain magenta. No bridge rebuild is needed.

## 0.15.234 — Fit sphere from picked surface points

The tomogram picking editor adds Fit sphere start/end. Start collects thick red crosses across slices and view directions in the current tomogram. End minimizes squared radial distances in physical Angstrom coordinates and creates a normally sampled sphere support using the current spacing. At least four non-coplanar points are required. Undo removes the last fit point while collecting; Escape cancels. A completed sphere is part of normal undo/save behavior. The tomogram and image-source selectors remain locked during fitting to avoid mixing volumes. Fit points are temporary: finish the fit, then save annotations. No bridge rebuild is needed.

## 0.15.233 — Alignment output stack viewer and next-job plus sign

Next-job icon buttons include a plus sign at left. Align tilt-series output opens tomo_pick.html read-only, choosing external/<series>/<series>_preali.mrc for IMOD or _aligned.mrc for AreTomo. A series selector and Z-slice slider inspect the actual stack rather than the input micrographs. Missing/cleaned stacks report an error without falling back to inputs. IMOD preali is the native prealignment stack; this viewer does not apply subsequent alignment transforms. Restart the server and reload the browser; no native bridge rebuild is needed.

## 0.15.232 — STA alignment and reconstruction key-info

Align tilt-series summaries display IMOD fidu, IMOD patch or AreTomo from the saved job options. Reconstruct tomograms summaries display the count from the latest “Reconstructing N tomograms:” stdout header. Existing finished jobs are included. Restart the server and reload the GUI; no native bridge rebuild is needed.

## 0.15.231 — Require an explicit AreTomo GPU selection

Align tilt-series in AreTomo mode rejects empty or whitespace-only GPU IDs before native command generation, including previews, run/continue and scheduling. The error identifies the IMOD/AreTomo2 tab and suggests an explicit ID such as 0. IMOD and other job types retain their existing behavior. This temporarily guards against RELION consuming --pipeline_control as the missing --gpu value. Restart the server; no additional native bridge rebuild is required.

## 0.15.230 — Next-job destination icons

Next-job prompts use the sidebar job-type icons with a small downward arrow. Composed sequences show distinct job types once in first-occurrence order, joined by arrows. Tooltips and actions are unchanged; icons follow user-customized next-job JSON definitions in SPA and STA. Restart the server and reload the GUI; no native bridge rebuild is needed for this change.

## 0.15.229 — Native-style tilt exclusion output

Exclusion exports now use `tilt_series/<rlnTomoName>.star`, with matching references in `selected_tilt_series.star`. STAR output uses numbered columns and tab-separated rows; the global tilt-series path column comes last, as in the native writer. Metadata values retain their original precision. Existing UUID-named outputs remain readable; continuing and finishing a browser exclusion job writes the new layout without deleting old exports. No additional native bridge rebuild is needed when upgrading from 0.15.228.

## 0.15.228 — Browser tilt-image exclusion

- New `excluder.html` replaces napari for STA Exclude tilt-images jobs: grouped image list, retain checkboxes, contrast/invert, save progress and finish.
- Aligned tilt-series outputs open the same helper read-only. Retained STAR metadata stays compatible with native RELION.
- Requires a native bridge rebuild: `python3 scripts/build_bridge.py relion-source --output build`, retaining your installation-specific build options. Restart the server afterward.
- Interactive exclusion jobs are run directly; use Continue to reopen a running browser exclusion session.

## Version 0.15.227 — SPA/STA gain reference suggestions

Both modes search the project root and first raw Import data folder for gain
references. STA uses movie_files. A single candidate fills an empty draft field;
existing values are preserved and ambiguous candidates are offered by the shared
empty-gain input-verification warning. Filenames alone cannot prove compatibility.

## Version 0.15.226 — Import defaults

SPA Import Cs defaults to 2.7 for new settings. STA Import detects the dominant
MRC/TIF/TIFF suffix in an unambiguous frames, Frames, Movies or Micrographs folder,
ignoring unrelated files. The resulting movie_files pattern feeds the existing
frame detector and images_are_motion_corrected inference. Existing job values
and explicit edits retain their precedence.

## Version 0.15.225 — mask slice preview

Mask creation jobs show a 64x64 mask.mrc slice preview with the existing XYZ
buttons and slice slider. Masks use a fixed 0–1 grayscale range.

## Version 0.15.224 — CTF input defaults

SPA and STA CTF input browsing and sequential defaults exclude outputs of earlier
CTF jobs. Unedited new-job inputs refresh from compatible upstream outputs; explicit
user edits and New from these settings retain their existing precedence.

## Version 0.15.223 — detect repeated STA particle identifiers

STA input verification reports repeated particle names before extraction and
refinement, including optimisation-set references. No metadata is modified.
See STA-IDENTIFIERS.md for recovery with native RELION commands.

## Version 0.15.222 — stable feed scrolling

Reserve the next-job action row even while hidden so selecting the last job does
not resize every workspace and shift the smooth-scroll destination. Routine feed
refreshes no longer assign scrollTop when the anchor position is unchanged.

## Version 0.15.221 — subtomogram extraction binning

Extract subtomos job key-info displays the saved binning factor, for example
`bin: 4`. Fractional binning values are preserved.

## Version 0.15.220 — duplicate-removal particle count

Subset selection in dupli mode displays retained particles (total minus removed)
from the latest stdout summary, including zero retained particles.

## Version 0.15.219 — class colors and STA Nyquist warnings

Class preview numbers share the convergence plot's class colors. STA resolution
warnings now follow optimisation-set particle links or direct particle inputs to
read extracted pixel sizes from STAR optics, using the same 10% Nyquist threshold
as SPA. Updated optics invalidate cached values; missing metadata produces no
invented sampling estimate.

## Version 0.15.218 — select classification preview iterations

Click within the 3D classification convergence plot to preview the nearest plotted
iteration's class maps. Selection survives refreshes and shares the existing slice
slider and XYZ controls. A Latest button resumes automatic updates. Missing or
incomplete selected maps are reported rather than replaced by another iteration.
Click mapping works with scaled and horizontally scrolled plots.

## Version 0.15.217 — editable next-job definitions

Next-job buttons now come from JSON files in `next-job/SPA/<job-directory>/` and
`next-job/STA/<job-directory>/`. The starter set preserves existing suggestions,
conditional continuations and the supplied SPA refinement sequence. It is copied
into each initialized project on first writable opening, without overwriting an
existing project copy. Edit those files and reload the browser. One-step recipes
create drafts; multi-step idealized pipelines create pinned drafts. See
`next-job/README.md` for examples and input-binding details.

# RelionDeLuxe 0.15.217

A local browser-based single-particle and tomography control console for RELION 5.0.1, with Light, Dark, Brazil and France themes. This is an independently developed GUI add-on, **not yet a complete replacement for every FLTK feature**.

The browser edits settings. A local Node.js server calls a small native adapter. That adapter uses the **unchanged official RELION job definitions, command builders and pipeline implementation**. The installed RELION executables do the scientific calculations. There is no second pipeline database.

## 0.15.216 — Shared 3D classification previews
The editor heading now previews all 3D classification maps side by side with small class numbers, one slice slider at left and one XYZ button stack at right. All maps use the same slice and latest complete readable iteration; partial new iterations retain the previous set. The image strip scrolls horizontally if many classes exceed the available space. Auto-refine retains its single-map preview.

## 0.15.215 — Thumbnail slice slider
A vertical slider to the left of the refinement preview spans all slices of the selected axis. Initial view and axis changes start at the central slice; the tooltip shows the current slice and total. Requests are serialized and stale responses cannot override a newer slider choice.

## 0.15.214 — Thumbnail slice directions
Three tiny vertically stacked x/y/z buttons sit immediately right of the refinement thumbnail. Z is the default; changing direction immediately requests that central slice. Caches are axis-specific and stale responses cannot replace a newer axis selection.

## 0.15.213 — Classification alternative and refinement thumbnail
Running/scheduled Subset selection jobs whose primary next step is 3D auto-refine also offer 3D classification, with compatible particle input defaults. The auto-refine editor heading displays a 64×64 grayscale central Z slice from the latest readable run_itXXX_half1_class001.mrc. It polls at most every ten seconds per visible editor; decoded thumbnails are cached by path, size and modification time. Incomplete new maps fall back to earlier readable iterations and absent maps hide the thumbnail. Contrast uses the 2nd–98th percentiles of the displayed slice.

## 0.15.212 — STA reconstruction input compatibility
Reconstruct particle is never treated as an optimisation-set producer in the compatible chooser or automatic input defaults, including stale registered nodes and fallback outputs without .Nodes markers. Its refinement/classification next steps reuse the reconstruction input optimisation set (or direct entries) and its output reference map. Existing saved job settings are not rewritten.

## 0.15.211 — SPA sequence corrections and STA backprojection progress
The SPA triple-circle action now uses the supplied trio_refine.json template exactly before project input binding: three CTF passes, refinement/post-processing, polishing training/polishing, refinement/post-processing (nine jobs). In particular the anisotropy and defocus passes no longer retain unwanted aberration flags; the first refinement uses the mask and solvent FSC; the second uses the combined reference map. The supplied file contains two refinement jobs, not the additional third refinement described in prose.

STA Reconstruct particle progress combines completed tomograms and the current Backprojecting dotted progress line, with equal weight per tomogram. Large logs retain the latest tomogram header; loading starts each segment at zero and the last completed segment reports finalization without changing native job status.

## 0.15.210 — Scheduler input readiness
Missing inputs from earlier running producers (including stacks referenced inside tomography STAR files) are pending and grouped by producer in the scheduler acknowledgement. The initial delay is a minimum: a detached guard waits for producer success and rechecks required inputs before each job. Failed/aborted producers, missing files after success, invalid STAR metadata, or incorrect dependency order stop the scheduler with an error in its status/log. Existing scheduled jobs remain scheduled.

The guard invokes the installed, unmodified relion_pipeliner for each job; RELION still performs submission and completion tracking. Repeats retain incremental continuation semantics and minimum cycle spacing. The guard log is preferred in scheduler status so a native child's successful finish cannot hide a later input error. Closing the browser or server does not cancel the detached guard. Removing its RUNNING_PIPELINER marker stops waiting between jobs; it does not terminate a job already launched. This applies to schedulers started from this release, not already-running or externally launched schedulers.

Checked the official RELION ver5.0 src/pipeliner.cpp runScheduledJobs implementation: native waiting tests direct input-node existence, not recursive STAR references or external producer success. No installed RELION source or bridge rebuild is required. Tests use mocked native executables for guard sequencing; real native integration tests require RELION_DELUXE_BRIDGE.

## 0.15.209 — Reconstruct particle alternatives
Corrected STA Reconstruct particle next steps to 3D auto-refine and 3D classification. Both drafts inherit the reconstruction reference, optimisation set or direct input entries, and symmetry.

## 0.15.208 — Reconstruct particle next step
STA Reconstruct particle now suggests Mask creation for scheduled, running and completed jobs. The mask draft uses the declared merged map or first half-map, even before it exists.

## 0.15.207 — Scheduled next-job suggestions
Selecting a scheduled job offers its next-job suggestions, including when later jobs already exist. Drafts continue to use the selected source outputs. Updated the STA banner to reflect browser tomogram picking.

## 0.15.206 — STA extraction next steps
Extract subtomos offers both 3D initial reference and Reconstruct particle. Both use its output optimisation set; reconstruction also inherits binning and box/crop sizes. Tomogram annotations are saved as compact JSON to avoid unnecessary size-limit failures.

## 0.15.205 — Continue positioning and picking navigation
Preserve the active workspace viewport position after submission/continuation. Home returns to the active sphere center slice outside text/form controls. Tomogram rectangle cleaning is limited to the active support. Initial-reference next-job offers both 3D classification and 3D auto-refine in SPA and STA.

## 0.15.204 — Contrast-aware optimization and cryoCARE next step
Optm X/Y/Z/R now minimize contrast-adjusted density: Invert negates raw values so optimization still seeks darker regions. Probe placement keeps its local-minima label in both modes. STA cryoCARE training proposes prediction next and fills the trained model when declared as output.

## 0.15.203 — Link probe longitude and tomogram slice
With matching main/probe axes, a yellow probe line marks the current slice and hovering longitude draws a white radial arrow in the main sphere cross-section. Guides require a current probe and a slice intersecting the sphere. The pointer follows Elements visibility and disappears on mouse leave.

## 0.15.202 — STA refinement ranks and failed-launch recovery
STA auto-refine now defaults to GPUs + 1 MPI ranks, with CPUs / GPUs threads (integer floor). Explicit Mark as failed writes RELION_JOB_EXIT_FAILURE and refreshes native completion status, avoiding the native mark-finished validation that refuses refinement jobs without initial outputs. This action does not stop processes. Automatic launch-failure inference is not added.

## 0.15.201 — Correct STA next-refinement particle input
The next-job helper now assigns STA selected particles to in_particles and enables direct entries, rather than injecting the SPA-only fn_img option. Obsolete fn_img values are removed from affected draft seeds. SPA behavior is unchanged.

## 0.15.200 — Dominant 3D selection in STA
STA Subset selection now exposes Select dominant 3D class only in Class options and uses the same External-job adapter and 3D optimiser validation as SPA. The native class ranker remains disabled for 3D inputs. Tests cover STA schema/layout exposure and submission routing; native STA execution requires workstation validation.

## 0.15.199 — Unified Undo and cross visibility
Replaced Undo optm and Undo last point with one single-step Undo for the latest support/particle edit, including element deletion, cleaning, placement, movement and optimization. Crosses now controls both main and probe overlays. Movement tooltips explicitly say Move support.

## 0.15.198 — Probe inversion and brush eraser
Invert now switches probe particle placement to raw-density local maxima and reverses probe grayscale without recalculation. The inset starts at 512×512. Erase (10px) enables left-click/drag cleaning of the selected sphere with a screen-space brush; Undo optm restores each completed stroke.

## 0.15.197 — Reveal restored selection at startup
After initial pipeline rendering, the restored job is scrolled into view in the workspace feed and centered in the pipeline list. The feed aligns again when its lazy editor becomes ready. User interaction cancels the pending startup alignment; ordinary refreshes do not repeatedly scroll.

## 0.15.196 — Explicit sphere sampling and local minima
Added Resample sphere and Clean sphere in the main toolbar. Radius and spacing edits preserve sampling and exclusions; spacing applies on explicit resampling. The probe can replace particles with strict local minima from an up-to-date density projection, with confirmation and undo.

## 0.15.195 — Rectangle cleaning in the sphere probe
Middle-drag deletes enclosed sphere particles. Shift+middle-drag keeps only enclosed particles, with keep/delete counts and confirmation, in both probe and density canvases. Density cleaning affects the current slice/depth window; probe cleaning affects the selected sphere.

## 0.15.194 — Adaptive sphere probe sampling
Probe Update now uses the available inset image area to choose the actual sampling resolution, from 128×64 to 1024×512. Resizing marks the preview outdated and reports the requested dimensions; calculation stays manual. Particle crosses retain a readable display size.

## 0.15.193 — Sphere probe particle overlay and rigid rotation
Added Show particles and four rotation arrows with a configurable angular step (default 5°). Rotations preserve particle distances, exclusions and radius; saved geometry and exported particles retain the orientation. Undo optm restores the previous orientation. Density sampling remains manual.

## 0.15.192 — Sphere probe pole directions
Added X/Y/Z radio buttons beneath the probe canvas. Z remains the default; press Update after changing the poles. The rendered axis label identifies the image orientation, and stale results are discarded if the selection changes during sampling.

## 0.15.191 — Fix sphere probe requests
Sphere probe Update now sends the required unique request ID using the existing LAN-compatible generator, fixing “Missing request ID”.

## 0.15.190 — Sphere density probe
Added a floating 256×256 draggable/resizable inset for the selected sphere. Update explicitly samples a 128×64 cylindrical equal-area surface map using raw trilinearly interpolated voxels. Stale previews are labeled; missing voxels appear magenta. No particles or geometry are changed.

## 0.15.189 — Offer cleanup before support optimization
Blocked optimization now offers to delete all out-of-volume particles of the selected support. Confirmation is required; non-finite voxels are reported separately. Undo optm restores the deletions and Save annotations persists them.

## 0.15.188 — Focus selected support centers
Selecting a support jumps to its center slice. Switching X/Y/Z keeps the selected support center visible. Spheres use their center; other supports use the bounding-box center of their control points. Slice navigation remains free after the jump.

## 0.15.187 — Preserve sphere crosses during radius optimization
Optm R now keeps the original angular sample positions and excluded sample identities throughout the search. Accepted results retain this sampling after save/reload and export; only radius changes. Manual radius/spacing edits can resample as before.

## 0.15.186 — Optimize tomogram supports
- Added Optm X/Y/Z and sphere Optm R, minimizing mean raw density at support particles within a configurable search range.
- Only translation axes in the displayed plane are enabled. Translation preserves removed particles; radius changes regenerate sphere samples.
- Undo optm restores the previous support and exclusions. No move is accepted unless it improves the objective.
- Bounded, cached MRC sampling supports float16; out-of-volume candidates are rejected.

## 0.15.185 — Preserve cleaned particles when moving supports

Support translation now preserves excluded particle samples. This applies to arrow movement and clicking to reposition an existing sphere center. Remaining particles translate with the support, including after saving and reloading. Changing a sphere radius still resets its excluded samples. Normal flips and spacing changes retain excluded indices; editing filament/surface control-point topology still regenerates those elements.

Ten targeted tests pass, including translated positions, retained sample identities and JSON round-trip persistence. Restart server and refresh browser; no additional bridge rebuild required.

## 0.15.184 — Independent element visibility

The tomography editor has an Elements checkbox alongside Crosses. Elements controls support outlines, paths and control-point boxes independently of sampled particle crosses. Visibility changes only redraw the overlay; geometry, sampling and exclusions are unchanged. The editor now also honors Crosses independently, and rectangle cleaning requires visible crosses.

Static module and rectangle-action checks pass. Restart server and refresh browser; no additional native bridge rebuild required.

## 0.15.183 — Rectangle cleaning and support movement arrows

Middle-button drag in the tomogram editor draws a rectangle and removes the particles displayed within it, across support elements in the current tomogram and slice/depth window. Excluded sample indices persist in saved annotations and final STAR export. Display changes preserve exclusions; changing a support's geometry or sampling features regenerates that element. A slice change during dragging cancels the deletion.

Move XYZ fields are replaced by Step (Å) and four arrows. Movement follows the current screen plane in X/Y/Z views and leaves the hidden coordinate unchanged.

Ten targeted tests pass for deletion bounds/depth, persistence, generated supports, movement axes, sampling and saving. Restart server and refresh browser. No additional bridge rebuild beyond 0.15.181 is required.

## 0.15.182 — Support element color menu

The support element selector is now a custom dropdown with a swatch matching each element's canvas color. The selected element's swatch remains visible in the closed control. Labels retain theme contrast instead of using potentially unreadable colored text. The popup is positioned outside the scrolling toolbar to avoid clipping, and supports arrow keys, Home/End, Enter/Space, Escape, Tab and outside-click dismissal.

Six targeted checks pass. No additional native bridge rebuild is needed if 0.15.181's bridge was already rebuilt. Otherwise follow the 0.15.181 installation instructions. Restart server and refresh browser for the new static module.

## 0.15.181 — Experimental browser tomography support picking

New interactive Pick tomograms jobs open tomo_pick.html instead of Napari. The editor supports particle clicks, spheres, piecewise-linear filament centerlines, and surfaces connected from parallel closed contours. Different types can coexist. Elements have stable saved IDs, colors, radius/spacing controls, translation, deletion, and saved geometry. Outputs include rlnSupportStructureType and rlnSupportStructureElement, particles.star and optimisation_set.star.

See [the picking guide](docs/tomogram-picking.md) for workflow, orientation handling, sampling differences and limitations. This first implementation does not schedule interactive picks or edit existing native/imported particle files. Those remain read-only. Native pipeline registration and completion require a rebuilt bridge.

**Rebuild required:** python3 scripts/build_bridge.py relion-source --output build

Validation: 27 geometry/viewer/cache/save tests pass, plus 11 existing picker/bridge-response tests. Four native tests are skipped without RELION. Native compilation and real STA extraction/refinement validation remain necessary; treat this as experimental.

## 0.15.180 — Extracted tomography particles in the viewer

STA Extract subtomos particles.star outputs and 3D classification particles.star inputs now open tomo_pick.html. Both use saved upstream provenance to find the tomograms and overlay the requested particle file. SPA galleries and classification optimiser/model displays remain unchanged.

Validation: six targeted tests pass, including resolving an extraction output both from its own job and from its consuming classification job. Restart server and refresh browser; no bridge rebuild required.

## 0.15.179 — Tomography particle subsets in the tomogram viewer

STA Subset selection particles.star links open tomo_pick.html. The viewer finds the source tomogram set through saved job inputs and STAR references (including optimiser experimental data and optimisation-set metadata), then overlays only the coordinates in the requested subset. It does not substitute the upstream full particle set or guess from unrelated project tomograms. Missing provenance produces an explanatory error.

Coordinate tables are selected by column labels rather than block position: centered rlnCenteredCoordinateX/Y/ZAngst and legacy rlnCoordinateX/Y/Z are supported, including multi-block optics/particles files. Existing binning and voxel-size transformations apply. SPA galleries are unchanged.

Validation: 16 targeted tests pass, including subset-to-classification-to-extraction provenance, cyclic/missing provenance, multi-block centered coordinates, legacy coordinates, and gallery regression tests. Real-project visual validation remains to be done. Restart server and refresh browser; no bridge rebuild required.

## 0.15.178 — Dedicated read-only tomogram viewer

Tomogram links now open tomo_pick.html, displaying one tomogram at a time with a selector. Existing gallery links redirect automatically when their metadata describes reconstructed tomograms. Image sources (denoised, reconstructed, half maps), X/Y/Z slices, brightness/contrast, coordinate crosses and depth controls remain available.

The tile-size slider is replaced by 1:1, Fit width and Fit height. Fit modes follow viewport resizing and allow scrolling in the other dimension; 1:1 displays original plane pixels without downsampled enlargement. Full-resolution planes are requested only by this viewer; ordinary gallery previews remain limited to 512 pixels. Nearby slice caching/prefetch is retained with a 64 MiB cache and at most two concurrent requests. Large planes may exceed the cache budget and are then displayed without caching.

This is a read-only foundation for later tomogram picking: no coordinate edits, save operations or replacement of the native job execution are introduced.

Validation: 20 targeted tests pass, including fit dimensions, full-resolution samples, existing slicing/coordinate transforms, cache behavior and browser module routing. Real-project browser visual validation remains to be done. Restart server and refresh browser; no bridge rebuild required.

## 0.15.177 — Smoother slice navigation

Slice changes reuse the existing canvases instead of clearing and rebuilding the gallery. A per-tab 64 MiB LRU preview cache reuses decoded planes, with a 60-second lifetime. Identical pending reads are shared. After a short idle period, the two neighboring slices on each side are prefetched for up to eight visible tiles, one background request at a time. Foreground reads take priority, total concurrency is limited to four, and obsolete queued work is discarded when the slider moves. Slider debounce is reduced from 200 to 60 ms; old responses cannot replace a newer selection.

Only downsampled previews are cached, not complete tomograms. X/Y slice extraction and uncached jumps can still be disk-bound, particularly on network storage. Refresh the gallery to immediately discard cached previews after changing files externally.

Validation: 18 targeted tests pass, covering cache bounds, deduplication, priority, cancellation, expiry and existing gallery/coordinate behavior. Interactive real-project performance has not been measured here. Restart server and refresh browser; no bridge rebuild required.

## 0.15.176 — Tomogram slices and picked-particle overlays

The gallery now provides an X/Y/Z slice-position slider (relative position across each volume), with slice numbers shown on each tile. Pick tomograms input tomograms and output particles links open this gallery with read-only green particle crosses loaded from the job's particles.star. The output particles link uses the saved input tomogram set. Cross visibility and the depth around the selected slice are adjustable; no coordinates are edited. Missing or unsupported coordinate metadata is reported rather than guessed.

Centered Angstrom coordinates use reconstructed voxel spacing and volume dimensions. Legacy unbinned pixel coordinates use the tomogram binning. Tomograms are matched by rlnTomoName. Display keeps denoised volumes as the preferred image source when available. Only requested planes are returned, and slider updates are debounced.

Validation: 13 targeted tests pass, including synthetic volume samples in X/Y/Z, centered/legacy coordinates, slice depth, STAR parsing, and existing gallery behavior. Real-project browser/native validation remains to be performed. Restart server and refresh browser; no bridge rebuild required.

## 0.15.175 — 3D classification continuation iterations

Choosing a different nonempty continuation file for 3D classification adds 10 to its Number of iterations (nr_iter). Reselecting the same file or clearing the input does not increment it. The existing 2D EM/gradient behavior remains unchanged.

## 0.15.174 — Hide unrelated connectors

The selection toolbar includes a hide unrelated checkbox beside the selection count. When enabled, faint edges are omitted before lane layout, reclaiming horizontal space for highlighted connectors. Both direct-link and full-path highlighting are respected. Job rows remain visible; with no single focus all connectors remain visible. The checkbox survives ordinary refreshes and remains manually reversible.

## 0.15.173 — Native duplicate removal and browser-selection notes

Subset selection with do_remove_duplicates, do_filaments or do_dominant_3d no longer qualifies for interactive browser selection. Duplicate removal runs the native command without opening a gallery.

Starting a browser selection appends note.txt with the equivalent native command(s) from RELION's preview, using the actual assigned output directory. The entry explicitly states that gallery.html performed the interaction and the recorded native command was not executed. Existing notes are preserved; failure to write a note is reported as a warning after submission rather than a retryable job failure. Existing older browser jobs are not backfilled.

## 0.15.172 — Class gallery defaults

When NumberOfParticles is available, inspection and selection galleries initially sort by that count in descending order and use it as the tile label. Other galleries retain file order and image-number labels. User choices remain adjustable during the session.

## 0.15.171 — Additional 2D continuation iterations

Changing a 2D classification continuation file through Browse or a committed field edit increases the current EM iteration target by 10, or the gradient target by 50. Only the active, unambiguous mode is modified. Empty paths, unchanged selections, refreshes and tab switches do not add iterations. Invalid iteration targets remain unchanged for manual correction.

## 0.15.170 — Import-folder gain suggestions and numeric gallery sorting

Missing-gain verification searches the project root and the directory part of fn_in_raw from the earliest raw Import job (job-number order). It respects read-root permissions, ignores duplicate physical files and searches non-recursively. Wildcards in directory components are not expanded; normal filename wildcards such as Movies/*.tiff work.

Gallery NumberOfParticles sorting compares the class count numerically, ignoring the denominator, units and approximate-count prefix. Ascending and descending both keep unavailable counts at the end. Applies to inspection and selection galleries.

## 0.15.169 — Pooled particles and missing gain-reference warning

The Workstation / cluster pooled-particles default is 30. Explicitly saved project values remain unchanged.

Motion correction with empty fn_gain_ref now produces an input-verification warning in SPA and STA, also during batch/scheduled verification. The project root is scanned for readable gain-named MRC/MRCS/TIF/TIFF/gain files (case-insensitive), respecting read-root permissions. No recursive remote scan or automatic selection is performed. The normal submission dialog offers Use-file buttons; choosing one fills the field for review and a fresh verification on resubmission. Batch reports list suggestions. Users can acknowledge the warning if the input is already gain-normalised; filenames alone do not prove suitability.

## 0.15.168 — Class-ranker executable override and MTF default

Fresh Post-processing defaults use mtf_angpix=-1 in SPA and STA. Existing saved/inherited values are preserved.

Set RELIONDELUXE_CLASS_RANKER to the absolute path of the working version-specific relion_class_ranker before starting the server. A persistent project-local launcher takes priority over PATH/SBGrid and forwards arguments unchanged to that executable. The bridge and scheduler inherit this selection, including jobs outliving the server. Invalid overrides stop startup. No Conda or PYTHONPATH is changed; the selected program must work in the inherited environment. Existing scripts already submitted before changing the override must be regenerated to use it.

Bash: export RELIONDELUXE_CLASS_RANKER=/path/to/relion/bin/relion_class_ranker

Tcsh: setenv RELIONDELUXE_CLASS_RANKER /path/to/relion/bin/relion_class_ranker

## 0.15.167 — Exact gallery counts, LoG totals and completion display

Class galleries opened through optimisers now count actual rlnClassNumber assignments in the associated experimental data STAR, matching class selection rather than estimating from rlnClassDistribution. Direct model galleries use the corresponding data STAR when available. A distribution-only fallback is explicitly marked approximate (≈). Both normal and selection galleries share this logic.

LoG Auto-picking key-info includes the latest native or manual-cleanup particle count, using the same two stdout formats as TopazPick.

GUI state decoration checks terminal RELION marker files for jobs still reported Running by the pipeline snapshot, before enriching summaries/progress. A single fresh success/failure/aborted marker updates the displayed status; conflicting markers, scheduled jobs, and markers older than job.star do not override native status. Native pipeline files are not rewritten by this display reconciliation.

## 0.15.166 — Shared normal/pinned editor and Topaz counts

Pinned drafts now mount independent lazy-loaded instances of the regular job editor instead of a reduced separate form. Tabs, conditional fields, radio groups, browsing, reference-resolution labels, parameter dependencies and inline path checks use the same implementation. Each pin has independent values and automatic saves. Template inputs are retained rather than replaced by sequential suggestions; TBD computing parameters remain deferred, with provisional values displayed read-only. Symbolic inputs remain symbolic and are checked by pinned validation rather than reported as missing literal paths. Clone-continuation references remain protected.

Run, Schedule and Check from a pinned editor route through the existing consecutive-block preview and validation, including compatibility, ordering, file existence, STAR columns and duplicate checks. Check is review-only. Unproduced inputs cannot be checked for actual STAR content until available; normal scheduling rules apply. Pinned editors have a Reload saved values control for recovering failed edits.

Topaz-pick key-info includes the latest particle total from either “Total number of particles from N micrographs is X” or “Total number of picked particles: X”, including zero and later manual-cleanup totals. Other picking modes retain their existing summaries.

## 0.15.165 — Pinned refinement sampling dependencies

Pinned 3D auto-refine and 3D classification editors now reuse the normal-draft sampling formula when fn_ref, particle_diameter or ini_high is edited (including Browse selections). The recalculated sampling is saved together with the edited values even when its tab is hidden. Manual sampling choices remain until a dependent field changes. Resolved committed pin references are supported; unexecuted references without measured resolution keep the current sampling. Other pinned-editor dependency rules remain unchanged.

## 0.15.164 — High-resolution pinned sequence shortcut

A triple-circle next-job button beside Local resolution after a finished SPA Post-processing job prepares the supplied nine-step high-resolution refinement sequence as pinned drafts. A review dialog binds particles, postprocess STAR, reference, mask, optional MTF and motion-corrected micrographs to the current project. Symmetry and particle diameter follow the source refinement; Post-processing pixel sizes follow the source job. Other settings retain the supplied template values for review in the editable pinned drafts. The existing idealized pipeline is not replaced and no computation is launched. Normal pinned-draft validation, numbering and scheduling apply.

## 0.15.163 — Reliable Nyquist detection from refinement input

The resolution warning first reads the optics of the saved fn_img particle STAR file, which includes the extraction rescaling. It no longer requires a complete registered particle lineage to determine that pixel size. Extraction lineage remains a fallback. The tutorial case (3.54 Å/pixel, 7.30839 Å resolution) is covered by a regression test.

## 0.15.162 — Resolution near Nyquist warning

Resolution summaries, reference labels and reference browse entries turn red when the reported resolution is within 10% of (or beyond) twice the extracted particle pixel size. Particle lineage identifies the nearest extraction and its output STAR optics provide the actual rescaled pixel size. Dominant-class maps inherit the same check. Tooltips explain the limit; unavailable optics are not guessed. With multiple optics groups the warning applies if any group reaches the cutoff.

## 0.15.161 — Mask-aware refinement next step

The next-job button after 3D auto-refine proposes Mask creation when the saved job used no mask, and Post-processing when it used a mask. Saved settings take precedence over unsubmitted editor changes. This applies in SPA and STA modes.

## 0.15.160 — Continue refinement with a newly created mask

Finished Mask creation jobs offer a second circular next-step button, “Continue 3D refinement with this mask”, when their saved input comes directly from a succeeded 3D auto-refine job with an empty saved fn_mask. The shortcut revalidates eligibility and the mask output, opens that existing refinement, fills fn_mask and do_solvent_fsc=Yes, resolves an empty continuation optimiser, and uses the normal Continue workflow. No new job is created. Existing mask edits are not overwritten, and the usual verification/running-job warnings remain in force.

## 0.15.159 — Mask viewer threshold

The standalone map viewer initializes Mask creation outputs and registered Mask3D inputs at absolute density 0.5. Other density maps retain mean + 3σ. Identification uses pipeline metadata, including aliases and absolute project paths, rather than filename guesses. The viewer status identifies the selected rule; the threshold remains manually adjustable.

## 0.15.158 — Hide unavailable manual-continuation shortcut

The circular next-step button styling now explicitly respects the hidden attribute. Previously its display:inline-flex rule could expose the manual-continuation button even when its visibility flag was false. Eligibility also checks the last pipeline job's actual type. The shortcut remains available only for successfully finished Auto-picking results, excluding Topaz training.

## 0.15.157 — Manual-cleaning shortcut after Auto-picking

When the last selected pipeline job is a successfully finished Auto-picking job, a second matching circular next-step button offers “Continue manually” alongside Particle extraction. It sets continue_manual=Yes in that same job's editor and invokes the normal Continue handler, including verification and running-job warnings; no new job or draft is created. Topaz training jobs are excluded. Job status is refreshed before invoking the shortcut.

## 0.15.156 — Map viewer initial threshold at three sigma

The 3D map viewer now starts at mean density + 3 × population standard deviation, replacing mean + 2σ. The status text reflects the new formula. Statistics still use all finite voxels before display downsampling, and the threshold remains manually adjustable.

## 0.15.155 — Toggle full dependency-path highlighting

Clicking the sole selected job row again toggles direct-connection highlighting and the full upstream/downstream path through that job. Directed traversal excludes independent branches, siblings and unrelated co-inputs of downstream joins, and handles cycles safely. The connector legend names the active mode. Selection and scrolling are preserved, including pinned rows; Ctrl/Cmd/Shift clicks retain their selection behavior. Selecting another job or multiple jobs resets path focus. Ordinary refreshes retain the mode for the same single selection.

## 0.15.154 — Low-pass-aware sampling defaults

3D classification and 3D auto-refine sampling choices exclude 30° and 15° in SPA and STA. New drafts select the largest available interval ≤ 360 × max(reference resolution, ini_high) / (π × particle diameter). Nonpositive/disabled initial low-pass values leave the reference resolution in use. Changes to the reference, its reported resolution, diameter or ini_high recalculate the default, including after a previous manual sampling choice; unchanged refreshes and tab switches preserve the choice. Saved jobs and copied settings remain unchanged; obsolete historical values are displayed as disabled saved-value entries.

## 0.15.153 — Dominant-map resolution inheritance

Dominant-class selection inherits the reported resolution of its source 3D classification job through its optimiser input, including aliases and absolute project paths. The summary retains the particle count above “dominant · resolution”. The copied dominantclass.mrc has the same resolution badge in reference-map browsing and beside fn_ref, with a tooltip identifying the original classification job. The unrounded inherited resolution also feeds angular-sampling defaults. Existing selections need no rerun.

## 0.15.152 — Dominant selection particle count

Dominant-class selection summaries count particle rows in the output particles.star, rather than relying on the wording of relion_star_handler stdout. The count is cached by file metadata, excludes optics rows and appears above “dominant”. Existing completed jobs require no rerun; missing/cleaned outputs retain any stdout count that can be parsed.

## 0.15.151 — Dominant-class selection summary

Subset selection summaries recognize the reliondeluxe_dominant_3d marker saved in External-backed jobs, displaying “dominant” instead of the incorrect “manual” fallback. Existing jobs are handled without rewriting their settings or pipeline records; particle counts remain on the first summary line.

## 0.15.150 — Reject float16 MRC micrographs at Import

Import preflight checks all matching MRC/MRCS headers before preview, launch, continuation or scheduling. SPA raw single-frame micrographs and STA already-motion-corrected images in MRC mode 12 (float16) are blocked with filenames and guidance to convert to mode 2 (float32) before importing. Integer16 (mode 1) remains allowed. Raw multi-frame movies and other-node imports are outside this micrograph check. Only 1024-byte headers are read; both byte orders and configured read-root restrictions are respected. Unreadable/invalid MRC headers cannot silently bypass verification. The same check is used by batch and scheduler preflight.

## 0.15.149 — Corrected angular sampling formula

The sampling default now selects the largest dropdown interval ≤ 360 × reference resolution / (π × particle diameter), removing the factor of two from the previous formula. For resolution 7.30839 Å and diameter 212.4 Å, the limit is about 3.94° and the selected interval is 3.7°. The existing protections for manual choices, saved jobs and copied settings remain unchanged.

## 0.15.148 — Reference-based angular sampling defaults

New 3D classification and 3D auto-refine drafts choose the largest available sampling interval ≤ 360 × reference resolution / (2π × particle diameter). The source job's unrounded reported resolution is used. Defaults update after reference/diameter changes, including automatically populated diameters. Explicit sampling edits, saved jobs and New from these settings copies are preserved. If resolution/diameter is unavailable or no dropdown choice satisfies the limit, the existing value is retained.

## 0.15.147 — Resolution summaries and reference-map hints

Finished 3D initial reference and 3D classification jobs show the last valid CurrentResolution from stdout on the second key-info line, retaining symmetry/class count on the first line. Resolution is displayed to up to two decimals; invalid/undefined values are ignored. Reference-map browse candidates and the selected fn_ref field display the source job's reported resolution for these jobs and 3D auto-refine. Tooltips identify the source job and clarify that this is not a separate map measurement. CTF estimation defocus ranges now use one decimal place of precision in microns.

## 0.15.146 — Completion refresh, refinement continuation and mask controls

Fresh pipeline snapshots are propagated to visible embedded editors, and status transitions refresh their controls, including Mask creation. Older outstanding state responses cannot overwrite a newer snapshot. Native RELION completion accounting remains unchanged.

When loading a succeeded 3D auto-refine job with an empty continuation field, the editor defaults to the latest ready run_itXXX_optimiser.star from that same job. New drafts, nonempty fields and edits made while the lookup runs are preserved. This is an editor default, not a modification of saved job files.

The Mask creation Binarisation slider now has the original editable numeric threshold at its right, replacing the read-only output and duplicate parameter row. Slider, numeric control, stored parameter and NGL surface share one value; the help button remains available.

## 0.15.145 — Import microscope defaults

Initial SPA Import defaults: pixel size 0.885 Å, voltage 200 kV, spherical aberration 1.4 mm. Initial STA Import tilt series defaults: pixel size 0.675 Å, voltage 300 kV, spherical aberration 2.7 mm. Existing saved-job values and inherited project settings retain precedence.

## 0.15.144 — Dominant Import file extension

Automatic raw Import defaults now choose the most frequent supported extension (mrc, tif, or tiff, case-insensitive) in the sole Movies/Micrographs folder. Other extensions are ignored, and a minority supported format, such as one MRC gain reference alongside TIFF movies, no longer prevents detection. Tied counts remain ambiguous and do not change the default. Mixed-case spellings of the winning extension use a matching case-insensitive glob.

## 0.15.143 — Tomogram reconstruction and extraction progress

Reconstruct tomograms tracks the RELION dotted progress line following “Reconstructing”. Extract subtomos combines the current tomogram number and its particle-extraction progress into one overall bar: `(i - 1 + fraction) / N`. Tomograms have equal weight, so this is processing progress rather than an elapsed-time estimate. Loading the next tomogram retains the completed fraction; completion still waits for RELION's normal success status.

## 0.15.142 — Motion correction defaults for CTF and STA reconstruction

For new SPA and STA CTF estimation jobs, the selected Motion correction output supplies `use_given_ps` from the producer's `do_save_ps`: Yes → Yes, No → No. The existing unavailable-power-spectra constraint still disables the option when necessary. Explicitly edited defaults and New from these settings copies are preserved.

For STA Motion correction, `do_even_odd_split=Yes` defaults `do_float16` to No, and No defaults it to Yes. Changing the split option updates float16 immediately, including when that field is on another tab; it remains editable.

For new STA Reconstruct tomograms jobs, the selected `in_tiltseries` input is traced through intermediate pipeline jobs to the nearest Motion correction ancestor. Its `do_even_odd_split` supplies both `generate_split_tomograms` and `do_fourier` (Yes → Yes, No → No). An unrelated newer branch is not used. Cycles, absent provenance or conflicting equally-near upstream settings leave existing defaults unchanged. Scheduled upstream jobs are supported. Explicit edits, saved reconstruction jobs and copied settings are preserved.

Validation: 11 targeted tests passed, including both processing modes, alias paths, scheduled producers, branch selection, conflict/cycle handling and editor precedence. Native workstation validation remains necessary. Restart the server and refresh the browser; no bridge rebuild required.

## 0.15.141 — Pinned validation labels, input browsing and selection summaries

Pinned preview errors and review headings use the displayed N+k offset, provisional J number, stable pin ID and job type. Internal batch IDs start at jobN (zero offset), whereas pinned rows start at N+1; the previous messages exposed this internal offset. Both preflight reports and native command-preview errors are translated, including on submission revalidation.

Pinned file inputs now offer **Browse…**, using the same chooser as regular job inputs: compatible pipeline nodes, scheduled outputs, sorting, job highlighting and file navigation where applicable. Choosing a file updates and saves only that pinned draft. Clone continuation checkpoint fields keep their symbolic source references; machine-specific TBD fields remain resolved from project defaults.

Finished Subset selection rows retain their particle-count summary and add a second line: auto, domin, metad, stats, split, dupli, filam, or manual. Multiple enabled operations are listed together. The method detail persists across state refreshes through the existing summary cache.

Validation: 22 targeted tests passed, including N+8 error mapping, pinned browse selection/persistence, all selection modalities and cached summaries. Native workstation/browser validation is still recommended. Restart the server and refresh the browser; no bridge rebuild required.

## 0.15.140 — Pinned-editor isolation and navigation fix

Regular editor synchronization now scans only its own parameter form, excluding pinned-editor fields. Previously, the shared `.field` class made it encounter an undefined key after a pinned conversion/move had already been saved, aborting refresh and row navigation with a `startsWith` error. Pinned-row navigation now scrolls the central feed directly and stays within its scroll bounds. A refused numbering move no longer marks saved parameters as unsaved. If a mutation succeeds but its display refresh fails, the message explicitly states that it was saved and should not be repeated.

Existing pinned drafts are preserved. If a repeated conversion created duplicate blocks, select the unwanted block and use Delete pinned drafts. Regression tests exercise the actual regular-editor synchronization function alongside pinned fields, bounded navigation, failed refresh after successful conversion, and rejected moves followed by preview. Restart and reload; no bridge rebuild required.

## 0.15.139 — Visible pinned-draft entry points

The **Convert to pinned drafts** button is now in the upper toolbar of **Idealized pipeline**, beside **Preview batch scheduling…**, above the scrollable template steps. **Job actions → Add pinned drafts…** opens the same workflow, including from a normal unscheduled draft. Both actions use the loaded idealized template. Without a template, the GUI explains how to Capture or Import one instead of leaving an unexplained disabled control. The project bar shows the running server version to distinguish an older installation still listening on the chosen port.

Restart the server from this installation and reload the browser. No native bridge rebuild required. Focused tests cover both entry points, their empty-template guidance, API persistence and conversion/scheduling. Full browser rendering still requires workstation verification.

## 0.15.138 — Persistent pinned drafts

Use **Convert to pinned drafts** beside **Preview batch scheduling…** to add an idealized pipeline to the project as persistent preparation entries. These have their own editors in the central feed and dashed rows after real jobs and the normal ephemeral draft. They survive browser/server restarts and switching job types. Parameters save when changed; a failed edit must be corrected or reloaded before submission. Existing output paths are offered as file-field suggestions.

Each pinned draft has a stable reference such as `${pin1}particles.star` and a provisional number shown as N+k / J<number>. Moving numbers does not change references. Select one or more rows with Ctrl/Shift, then use **+ / −** to move the selected block. Drafts cannot cross each other or the next available position. Gaps are allowed while editing and are **never compacted automatically**. Delete via **Job actions → Delete pinned drafts**; deletion is rejected if surviving pinned drafts depend on the deleted entries.

**Run pinned drafts** and **Schedule pinned drafts** first preview the selected block. It must start at RELION's next number and contain no gaps. A normal draft must first be run/scheduled or discarded (a button is supplied in the pinned editor). Input families, dependency order, native command generation, available STAR contents, and missing inputs are checked. Expected files from preceding scheduled jobs remain deferred. Unknown future scientific results cannot be fully verified until produced; manual-preparation warnings remain relevant. Independent branches may use any compatible real inputs, rather than being forced to consume the latest real job.

Run schedules the block and then starts the existing RELION scheduler workflow, including its warning checks. Cancellation of scheduler startup leaves the jobs scheduled. Machine resources are resolved using the same rules as idealized batch scheduling. Clone continuations must be submitted together with their pinned source. Partial submissions retain completed native jobs and stable references. An interrupted transaction offers **Reconcile interrupted submission** and checks native settings before accepting an existing job. No native numbers are reserved while editing; another GUI allocating jobs shifts the provisional block forward while preserving its gaps.

Pinned preparation metadata is stored in `.reliondeluxe/pinned-drafts.json`; native RELION still owns all submitted jobs. If a process dies while holding the edit lock, a later server on the same host can recover an expired PID lock. A lock belonging to another host requires checking that server before manual cleanup.

Validation: 15 focused backend, HTTP, editor-DOM, feed, connector and static-module tests passed. The broader suite retains the same 12 failures as 0.15.137 (baseline comparison); native integration tests require an installed bridge. A full browser rendering test is supplied but could not run here because Chromium is unavailable. Native RELION execution and visual workstation verification are still needed. No bridge rebuild required.

## 0.15.137 — Pipeline job-number divider

A horizontal J<number> divider below real jobs and above the provisional draft shows the last allocated number (native pipeline next-job counter minus one). It spans the row and connector area, survives deletion of jobs, and remains absent before the first allocation. Tooltip explains the next number. Connector layout preserves the divider in row order and its vertical spacing.

Validation: three counter/connector tests passed and app syntax checked. No bridge rebuild required.

## 0.15.136 — Unified alignment method controls

IMOD and AreTomo2 become IMOD/AreTomo2 with an exclusive three-way radio group: fiducials, patch tracking, AreTomo2. Fields follow the active method; tilt-angle and phase-shift fields additionally follow their enabling switches. Thickness is one shared field for patch tracking and AreTomo2. Relevant executable fields remain visible. Executable failures disable corresponding radio choices; both failed still disables the job. Existing field continuation/read-only restrictions remain.

Validation: five alignment-control and executable-health tests passed; app syntax checked. No bridge rebuild required.

## 0.15.135 — Tomography next-subset input

The explicit Subset selection next-job action recognizes corrected_tilt_series.star among the source job's declared outputs and seeds fn_mic, clearing the mutually exclusive fn_model and fn_data. The existing seeded-input protection keeps asynchronous defaults from replacing it. SPA micrograph and optimiser mapping is retained.

Validation: six next-input/feed tests passed. No bridge rebuild required.

## 0.15.134 — Failure impact hints and editor tab switching

Failed executable-check tooltips identify disabled job types or alignment tabs, including the combined IMOD/AreTomo failure condition. Switching editor workspaces preserves the current tab only within the same job type; changing type resets to the first available tab. Applies to mounted and loading feed entries and new drafts. Explicit connector navigation retains its one-shot relevant-tab reveal.

Validation: eight tab-policy, tooltip, feed and connector regression tests passed; app syntax checked. No bridge rebuild required.

## 0.15.133 — External executable readiness checks

The workstation/cluster dialog shows an inline green check, red failure or grey inconclusive indicator for CTFFIND, MotionCor2, ResMap and (STA) batchruntomo/AreTomo. Checks run on opening/editing the field; click the indicator to retry. CTFFIND receives an intentionally invalid option; other programs receive --help. Usage responses (including CTFFIND exit 255) are accepted, while launch failures, 126/127, missing-library diagnostics and Python import failures are rejected. Empty output and timeout remain inconclusive. Tooltip includes diagnostics.

Probes use closed stdin, a private temporary directory and a four-second process-group kill limit. Results are cached by executable identity and loader/search paths, so normal GUI polling does not repeatedly execute programs. Retry explicitly after changing dependencies without changing the executable.

Saved-default failures disable CTF estimation, Motion correction and Local resolution respectively, as requested, even where a job could use an alternative implementation. In STA, failures disable the corresponding IMOD/AreTomo2 tab; both failing disables Align tilt-series. Existing jobs remain inspectable, with Run/Schedule disabled for failed checks (including the selected alignment backend). Correct and save defaults to recover. Inconclusive checks do not disable jobs. These are server-host startup probes, not GPU computation or cluster-worker validation; queue nodes may have different environments. A green check does not guarantee a calculation will succeed.

Validation: three automated tests cover classification, actual fake-program execution/cache and job/tab gating. App/server syntax checked. Real external programs and visual browser testing were unavailable. No bridge rebuild required.

## 0.15.132 — Alignment executable field placement

Align tilt-series now places fn_batchtomo_exe first in IMOD and fn_aretomo_exe first in AreTomo2, removing both from I/O. Values, defaults and field conditions are unchanged.

Validation: checked parsed layout for correct first-field positions and removal from I/O. No bridge rebuild required.

## 0.15.131 — Tilt-series alignment refinements

Align tilt-series progress follows the RELION dot bar after Aligning tilt series. Tomogram thickness moves from I/O to IMOD below patch tracking, with a shared-value copy below Use AreTomo2. It is disabled when fiducial alignment is Yes and patch tracking is No, retaining existing continuation/read-only restrictions. SBGrid uses batchruntomo as the initial job and project default; saved explicit paths retain precedence.

Validation: 11 progress/default regression tests passed; server and app syntax checked. No bridge rebuild required.

## 0.15.130 — RELION installation override and connection status

Set RELIONDELUXE_RELION to an absolute installation root containing bin/ to prefer that installation's programs, including relion_python_*, over SBGrid dispatchers. The directory is validated and prepended to PATH after automatic SBGrid loading, before native adapter creation. Children inherit it. Explicit executable settings remain unchanged; programs absent from bin fall back to the remaining PATH. Queue scripts that reset PATH must also select the intended installation. Existing generated scripts are not rewritten. SBGrid denoising restrictions and Python dependency requirements are unchanged.

Example (tcsh):

```tcsh
setenv RELIONDELUXE_RELION /programs/x86_64-linux/relion/5.1.1_cu12.2
npm start -- --project /path/to/project --tomo
```

Connection status is red unless connected, green on successful refresh, and clears stale error tooltips on recovery.

Validation: simulated installation test verifies server and child-shell resolution, repeated setup and invalid paths. Server/app syntax checks passed; actual SBGrid execution was unavailable. No bridge rebuild required.

## 0.15.129 — Environment variable help

Server --help now documents application overrides, executable discovery, SBGrid/MPI precedence, hardware/desktop variables, native RELION defaults and build-time cryoCARE environment variables. Includes bash/tcsh examples and distinguishes inherited external-program settings from direct server controls. No environment values are disclosed.

Validation: node server.mjs --help exits successfully and prints the environment sections without starting the server. No bridge rebuild required.

## 0.15.128 — One-shot connector navigation

Connector clicks reveal the related editor tab once per click. Repeated highlight messages during refresh no longer override subsequent user tab choices in embedded workspaces. Clicking a connector again still toggles the connected job and reveals its relevant tab.

Validation: six navigation/feed regression tests passed and app syntax checked. No bridge rebuild required.

## 0.15.127 — Visible startup warning details

The whiptail startup flow now shows a scrollable details screen before the default-No confirmation. Inaccessible symbolic-link paths, targets/errors and suggested --read-root options are included; missing executable details use the same flow. Without whiptail, details appear directly before the text prompt. Escape at the details screen cancels startup. Link permissions and unattended-startup policy are unchanged.

Validation: three startup regression tests passed, including a simulated whiptail verifying details precede confirmation. Actual terminal rendering was not visually tested. No bridge rebuild required.

## 0.15.126 — Manual cleaning history and micron defocus

Auto-picking manual continuations append timestamped actions to manual-cleaning-history.jsonl and summaries to run.out. Records cover continuation settings, manual coordinate saves (before/after coordinates), power deletions and undo, and finishing. Power backups additionally contain diameter, pixel size, algorithm and statistics identity. Filtering events include batch ID, per-micrograph mean/standard deviation/cutoffs, multiplier settings, mode, counts and backup path. The persistent history survives stdout resets; logging failures are reported in the server terminal. Existing past actions cannot be reconstructed retroactively.

To reproduce cleaning, use the same original micrographs and starting coordinates, follow history events in order, set the recorded diameter and lower/upper multipliers, and repeat the recorded low/high/both deletion modes. Repeated deletion recalculates statistics, so order matters. The before/remaining coordinates in particle-backups preserve exact filtering decisions; manual-coordinate-save events contain the hand edits. Min FOM only affects display. This release provides an audit trail, not an automatic replay command.

Picker defocus labels now show microns (μm), dividing Angstrom values by 10000 and formatting two decimals.

Validation: four tests passed, one native integration test skipped; JS syntax checks passed. No bridge rebuild required.

## 0.15.125 — Topaz training input connectors

Supplement missing native graph edges from the active Topaz training input: topaz_train_parts when training from particles, otherwise topaz_train_picks. Supports producer aliases and cached refreshes, and ignores unused training fields in other picking modes. Existing jobs are included without resubmission; native pipeline files remain unchanged.

Validation: seven dependency and draft regression tests passed. No bridge rebuild required.

## 0.15.124 — Topaz training model outputs and next step

The inspector replaces the training-coordinate intermediate with the highest numeric model_epoch*.sav found in each Topaz training job. The model chooser offers only the latest nonempty checkpoint from each succeeded training job, without relying on .Nodes registration. New Auto-picking defaults can use the latest completed model. The explicit next-job action switches to Topaz picking and seeds that source job's model and micrograph input. Native pipeline files and checkpoint files are not modified; model files are not sent to an image viewer.

Validation: five targeted tests passed, covering numeric epoch order, empty checkpoints, running jobs, next-step modes and feed behavior. No native RELION execution available. No bridge rebuild required.

## 0.15.123 — Topaz training GPU controls

Topaz training automatically enables the GPU flag required by RELION, including native settings generated for batch scheduling. GPU controls appear in the accessible Topaz tab; training locks Use GPU to Yes, while device IDs may remain blank for automatic selection. Explicit device IDs are preserved. Topaz picking remains optional-GPU and LoG remains CPU-only.

Validation: seven targeted regression tests passed; native GPU execution was not available in the development environment. No bridge rebuild required.

## 0.15.122 — extraction coordinate STAR block

Coordinate-list verification requests data_coordinate_files rather than the default/first block, avoiding false missing-column warnings for RELION 5 files beginning with data_general. Legacy unnamed coordinate tables remain supported.

Validation: regression covers named coordinate block, legacy unnamed block and genuinely missing labels. User attachment confirms both required labels in data_coordinate_files.

## 0.15.121 — CTF selection alternative and defocus range

CTF estimation offers a second round next-step button for Subset selection, seeded with micrographs_ctf.star. Its job summary reads finite rlnDefocusU values from that output and displays min–max divided by 10000 in microns (up to two decimal places). File-metadata caching avoids re-parsing unchanged output and invalidates when changed.

Validation: six CTF/summary tests and browser syntax check pass.

## 0.15.120 — matching next-step buttons and import count

Both Motion correction next-step buttons use the same round animated double-ring SVG appearance, distinguished by tooltip/accessibility label. Raw Import summaries show the row count from movies.star or micrographs.star as N mics, retaining the input pattern. Counts are cached by output file metadata and refresh when it changes.

Validation: six count/summary tests and browser/server module syntax checks pass.

## 0.15.119 — import sidecars, SBGrid MPI, alternative next step

Import folder detection ignores unrelated extensions while still requiring one supported image extension. With SBGrid detected, startup resolves mpirun.relion and uses it as RELIONDELUXE_MPIRUN/RELION_MPIRUN for native generated commands; absence gives a clear startup error. Cluster validation accepts this specific dispatcher, while TOPAZ still needs its explicit override. Existing external queue scripts and previously generated scripts are not rewritten.

Motion correction offers a second next-job button for Subset selection, seeded with its micrographs output.

Validation: twelve import/next-step/cluster tests and server/browser syntax checks pass. Actual cluster execution was unavailable.

## 0.15.118 — cluster overrides and submission script choices

Live --cluster startup requires RELIONDELUXE_MPIRUN and RELIONDELUXE_TOPAZ as absolute executable files outside SBGrid dispatcher directories. Use a version-specific MPI launcher compatible with RELION and the working version-specific relion_python_topaz. This checks paths and permissions, not compute-node runtime compatibility.

Bash: export RELIONDELUXE_MPIRUN=/absolute/path/to/mpirun
Tcsh: setenv RELIONDELUXE_MPIRUN /absolute/path/to/mpirun
Set RELIONDELUXE_TOPAZ similarly. Keep the SBGrid environment loaded.

Cluster defaults use /usr/local/slurm/relion_gpu unless a saved project value overrides it. At startup readable regular files matching /usr/local/slurm/relion* are discovered. Project and per-job qsubscript fields offer these as editable datalist suggestions. Custom paths remain accepted with existing validation. Restart to rescan.

Validation: override/discovery regression and server/browser syntax checks pass. Actual SBGrid/SLURM execution was not available.

## 0.15.117 — multiple scheduler status indicators

Pipeline heading shows a separate clickable status indicator for every discovered scheduler. Details include PID, assigned jobs, logs and recorded exit code/signal. New launches persist PID/start identity and exit information; Linux process discovery includes external pipeliners with the same project working directory. Stale RUNNING markers do not imply liveness. PID start identity guards against reuse. Status scans are shared/cached for three seconds across workspaces. Buttons inspect status, not process controls.

Exit codes are recorded only while the launching server is alive. After restart or for external launches, stopped processes show Off rather than an inferred success/failure. Systems without /proc show Unknown.

Validation: multiple-history/stale-marker regression and server/browser syntax checks pass. Live RELION integration was not available.

## 0.15.116 — polishing resources and progress

Training mode enforces nr_mpi=1 and nr_threads=globalNcpus in the editor and server submission path, with disabled resource fields and an explanatory hint. Polish-mode resources are not overridden by this constraint. Polish progress tracks the micrograph loop and frame combination as two equally weighted stages; training progress retains its iteration monitor.

Validation: nine progress tests, direct Training/Polish resource assertions, and server/browser syntax checks pass.

## 0.15.115 — CTF refinement progress

The job-row progress bar reads RELION's growing dot line after Performing loop over all micrographs. Progress represents the current processing phase, handles carriage-return updates, and resets for repeated loops. A completed bar remains finalizing until the job actually finishes.

Validation: all eight progress tests pass.

## 0.15.114 — polishing training dependency

The display graph supplements opt_params inputs for Bayesian polishing in Polish mode using trained parameters. Training-mode and own-parameter settings do not add this unused dependency. Producer output nodes are supplemented for highlighting; native pipeline files are unchanged. Draft connections apply the same mode conditions.

Validation: six dependency/draft regression tests pass.

## 0.15.113 — training to polishing next step

Next-job after Bayesian polishing Training proposes another Bayesian polishing draft with do_polish=Yes and do_param_optim=No. Its opt_params is seeded from the selected training job's declared parameter output when present. Polish mode continues to suggest 3D auto-refine. Scheduled, running and finished training jobs follow the same rule.

Validation: five next-step regression tests pass.

## 0.15.112 — polishing training-parameter default

New Bayesian polishing drafts suggest the latest compatible training parameter output for opt_params. The lookup no longer skips this field because the catalogue defaults to Training mode. Automatic stale values can update while explicit user edits and copied/saved settings retain their precedence.

Validation: latest-training-output regression and browser syntax check pass.

## 0.15.111 — polishing micrograph compatibility

Bayesian polishing fn_mic browsing and sequential suggestions require rlnMicrographMetadata and rlnMicrographName in the same STAR table. Changed files invalidate the cached check. Unverifiable future files are omitted. New automatic drafts replace inherited mic defaults with a verified candidate or empty value; explicit edits, copied settings and saved jobs retain normal precedence and launch validation.

Validation: eight input/default tests pass; two native integration tests skipped. Server/browser syntax checks pass.

## 0.15.110 — latest auto-refine reference default

New auto-refine drafts seed fn_ref from the highest-numbered eligible auto-refine producer with a declared reconstruction, preferring the final combined map and falling back to half1. Failed/aborted producers are excluded. The selected preceding job still supplies fn_img. Seeded fields retain precedence over asynchronous suggestions, without changing New from these settings.

Validation: seven next-input/sequential-default regression tests pass; browser JavaScript syntax check passes.

## 0.15.109 — selected producer for next auto-refine

Next-job to 3D auto-refine explicitly seeds fn_img from the selected producer's declared particles_ctf_refine.star, shiny.star or particles.star output. This overrides stale draft values and uses the existing seeded-input protection against asynchronous suggestions. Scheduled producers are supported without requiring their output to exist yet.

Validation: six next-input/sequential-default tests pass, including three scheduled CTF refinement jobs and selection of job038's output.

## 0.15.108 — continuation chooser scoped to selected job

The fn_cont browser passes the selected job to the server. Only that job's latest ready optimiser is offered, with the job-type restriction retained. Requests with no selected job return no continuation candidates. Other input browsers remain unchanged.

Validation: four input-browser tests pass, two native integration tests skipped; server/browser syntax checks pass.

## 0.15.107 — completed later dependencies

Preflight no longer warns solely about a higher producer job number when that producer has Succeeded. Applies to direct inputs and nested STAR references, including tomography. Unfinished, failed, aborted or unknown producers retain the ordering warning. Missing-file and STAR-content checks still apply even to succeeded producers.

Validation: continuation dependency-order and input-readiness regression tests pass.

## 0.15.106 — clear continuation on all new drafts

The shared editor render path clears fn_cont whenever no existing job is selected, including drafts copied from saved jobs and embedded workspaces. Submission also enforces the empty value for new drafts. Existing-job continuations retain their checkpoint and the current disabled-field behavior is preserved.

Validation: browser JavaScript syntax check passes.

## 0.15.105 — log fills inspector after convergence

Unscaled convergence display rules previously overrode the hidden attribute, consuming space while a log tab was selected. Both graph layouts now apply only to visible panels, with an explicit hidden-panel rule. The log regains the remaining inspector space and its own scrollbar.

Validation: CSS cascade reviewed for scaled/unscaled and hidden states; browser visual verification unavailable.

## 0.15.104 — latest continuation checkpoint per job

Continuation browsing lists only the latest ready optimiser per job of the matching type. A ready final unnumbered optimiser takes precedence over numbered iterations. Incomplete newer checkpoints are skipped. Search filters the reduced list rather than exposing older iterations.

Validation: four input-browser tests pass; two native integration tests skipped.

## 0.15.103 — solvent FSC beside mask input

3D auto-refine includes the same do_solvent_fsc setting below fn_mask in I/O, while retaining it in Optimisation. Both controls use the same stored value. Typing or browsing to a non-empty mask sets it to Yes immediately; users can subsequently change it. Loading an existing job alone does not alter its saved setting.

Validation: browser JavaScript syntax check passes.

## 0.15.102 — next mask input

Next-job to Mask creation seeds fn_in from the selected refinement's declared final reconstruction, falling back to its first half-map. Explicit next-step fields are protected from asynchronous default replacement beyond Subset selection too. No output filename is fabricated.

Validation: five next-input/sequential-default regression tests and browser JavaScript syntax check pass.

## 0.15.101 — preserve explicit next-step inputs

Next-job seeded Subset selection inputs carry their precedence through workspace snapshots into the embedded editor. Delayed sequential-default responses and polling no longer clear the chosen optimiser or replace it with micrographs/particles. Users can still edit these inputs manually. Normal job-type drafts retain automatic suggestions.

Validation: four regression tests pass, including a delayed default response attempting to overwrite the next-step optimiser; browser JavaScript syntax check passes.

## 0.15.100 — classification next-step input

Next-job to Subset selection seeds fn_model directly from the selected producer's declared optimiser output and clears fn_mic/fn_data. New drafts reset stale per-type input-edit tracking. Sequential suggestions include succeeded producers' declared nodes even without .Nodes markers; launch readiness verification remains enforced separately.

Validation: three next-input/sequential-default regression tests and browser JavaScript syntax check pass.

## 0.15.99 — convergence scale toggle

The Convergence toolbar now includes a Scaled checkbox (initially checked). Checked plots fit the visible inspector area and follow resizers; unchecked plots use their original SVG dimensions and horizontal scrollbars, synchronized for multi-plot displays. The browser remembers the preference for subsequently opened workspaces and reloads. Switching does not require a server request.

Validation: browser JavaScript syntax checks pass. Browser visual verification was not available.

## 0.15.98 — fit convergence plots to the inspector

Convergence plots scale their complete SVG viewBox into the visible area, preserving aspect ratio. Multiple plots share the remaining inspector height; CSS responds immediately to horizontal/vertical panel resizing and browser resizing. Class legends occupy one wrapping row rather than separate flex rows.

Validation: JavaScript syntax check and eight convergence data tests pass. Browser visual verification was not available.

## 0.15.97 — future class-input readiness

Compatible/continuation browsing checks non-empty files and optimiser model/data references before labelling an input available. Subset selection explicitly verifies fn_model even if the native preview does not register it as an input node. Immediate execution is blocked for unavailable class input; scheduling permits expected output from an earlier running/scheduled producer. Error messages identify the I/O tab.

Validation: five readiness/input-browser tests pass; two native RELION integration tests skipped because the native bridge is unavailable. JavaScript syntax checks pass.

## 0.15.96 — live classification maps

Running 3D classification jobs expose the newest complete iteration MRC for each class through the inspector output download/viewer links. Refresh updates those links as new maps become available; incomplete maps remain unavailable or retain the preceding complete iteration. Final outputs and native pipeline dependencies are unchanged. Initial 3D reference job summaries show the saved symmetry.

Validation: seven classification-map and job-summary tests pass; server and browser JavaScript syntax checks pass. Live RELION execution was not available in the test environment.

## 0.15.95 — background-job submission response

The server now captures native bridge output in private temporary files and waits for the bridge process to exit, rather than waiting for inherited output pipes to close. Background jobs can keep those pipes open after the bridge exits, previously blocking the submission response and all queued pipeline requests, leaving the GUI busy and the draft uncommitted. Capture files are cleaned after each call. No bridge rebuild is required.

Validation: the inherited-output regression fails against 0.15.94 and passes here; five submission/draft/error-recovery tests pass. Native RELION execution was not available in the test environment.

## 0.15.94 — draft submission transition

Accepted Run and Schedule submissions immediately adopt the native job identity. Feed reconciliation is deferred while a workspace operation is in progress so polling cannot insert/reorder workspaces during submission and reload the submitting editor. The provisional row disappears even if a subsequent state/detail read fails.

Validation: JavaScript syntax checks and three draft/submission regression tests passed.

## 0.15.93 — initial-reference iteration map links

3D initial reference stdout iteration messages now link to available run_itXXX_class001.mrc maps in the 3D viewer. Links update while running, and iterations without a saved map remain plain text.

## 0.15.92 — shared particle-diameter defaults

New job drafts with particle_diameter inherit the latest positive value used by a previously run 2D classification, 3D initial reference, 3D classification or 3D auto-refine job, ordered by job number. Scheduled jobs and invalid diameters are excluded. Explicit edits and exact copied drafts remain preserved. This takes precedence over extraction-box defaults, which remain the fallback when no previous value exists.

## 0.15.91 — coherent class-selection defaults

When a new Subset selection draft has fn_model, inherited Yes/No operations outside Class options (Subsets, Duplicates and Filaments) default to No. This applies when preparing drafts, filling compatible inputs and choosing a model input. Class options and computing settings are preserved. Existing jobs and exact New from these settings copies are not automatically rewritten.

## 0.15.90 — inspector scrollbar ownership

The inspector body and log container no longer scroll around the log viewer. Nodes and the active log/convergence view scroll independently inside constrained grid rows. The log toolbar remains visible and the log reserves its own scrollbar space, including when the inspector is resized or stacked in narrow workspaces.

## 0.15.89 — inspector body fills available height

The inspector panel uses a vertical flex layout at all viewport widths, including narrow embedded workspaces. Its body grows and shrinks with the panel when the inspector divider moves, preserving internal scrolling.

## 0.15.88 — scheduler button

Run scheduled has a bordered button appearance and is enabled when scheduled jobs exist, independent of the currently inspected job. Busy, read-only and uninitialized states still disable it.

## 0.15.87 — inspector spacing

Set the inspector panel top margin to zero.

## 0.15.86 — compact type-colored input candidates

Input candidates have a pale background assigned by producing job type, with subdued dark-theme equivalents. Filename, path and availability share one compact row; narrow viewports wrap the path below. Tooltips retain the full path and job type. Sorting and producer-hover behavior remain available.

## 0.15.85 — input candidate sorting

Input browsing defaults to descending job number. A Sort by menu also offers alphabetical job-type groups with descending job numbers within each group. Scheduled outputs participate normally; availability does not override job ordering. Files without a job number follow pipeline candidates, while directory navigation remains first.

## 0.15.84 — reveal input producers while browsing

Hovering or keyboard-focusing an input candidate centers and highlights its producing job in the pipeline panel, including from embedded feed dialogs. The selected job and draft stay unchanged. Highlighting survives refresh and clears when leaving the candidate or closing the dialog.

## 0.15.83 — responsive embedded editor width

Embedded feed workspaces no longer inherit the main GUI minimum body width. The shell, parameter form and file-input groups shrink with their iframe when side panels are resized. Narrow editors stack labels above their inputs and wrap action buttons.

## 0.15.82 — Local resolution input dependencies

The display graph now supplements Local resolution dependencies from saved fn_in settings when native pipeline nodes omit them. This includes DynaMight backprojection half maps, job aliases and absolute paths within the project, and applies to existing jobs on refresh without rewriting native pipeline files.

## 0.15.81 — Topaz dependencies and navigation refinements

Topaz picking jobs now show the topaz_model dependency from saved job settings, including training-job aliases when native pipeline metadata omits it. The next-job prompt is larger, has two circles and a gentle breathing animation that respects reduced-motion preferences. Subset selection enables Class options only when fn_model is populated.

## 0.15.80 — inactive Auto-picking inputs

Draft connectors exclude reference and Topaz input paths that the selected picking modality does not use. Run, Continue, Schedule and command preview detect retained unused paths and offer to clear them before proceeding. Cancelling preserves the editor values. Compatible defaults and idealized-pipeline capture also respect the modality, including 2D/3D references and Topaz particle/coordinate training alternatives. Existing saved pipeline records are not rewritten.

## 0.15.79 — live draft pipeline row

The current feed draft appears at the bottom of the pipeline list as a dashed Draft row. Its dashed dependencies update from active input fields as the editor changes. Clicking the row or a provisional connector focuses the draft. Drafts are excluded from real-job multi-selection and pipeline actions, and are removed when discarded or submitted. No job number or pipeline entry is reserved.

## 0.15.78 — view particles belonging to a 2D class

2D class cards loaded through an optimiser STAR now offer a members link. It opens a separate gallery tab using the optimiser experimental-data STAR and filters particles by rlnClassNumber. Optics and orientation metadata are retained. Sorting the class gallery does not alter class membership. This is read-only; it creates no pipeline jobs or subset files. Particle data larger than the 256 MiB reader limit or classes exceeding 200000 particles receive an explanatory error.

## 0.15.77 — pending output defaults and exclusive subset inputs

New job defaults include compatible declared outputs of Running and Scheduled jobs, even before their files or .Nodes markers exist. Subset selection defaults choose only the newest compatible source among fn_model, fn_mic and fn_data, clearing the other alternatives. If a job publishes both optimiser and particle outputs, the optimiser takes priority. Explicitly edited input choices and copied job drafts remain preserved.

## 0.15.76 — additional-argument autocomplete

Typing -- in Additional arguments opens installed-executable CLI suggestions for mapped native SPA/STA job modes. Prefix filtering, arrow keys, Enter and Escape are supported; hover reveals the help line. Help is queried without a shell, in a temporary directory, with an eight-second timeout and a five-minute server cache. Unsupported/custom Python or external job modes and missing executables leave free text available with an explanatory message. Suggestions do not validate combinations or override explicitly entered arguments.

## 0.15.75 — display-only picking FOM threshold

Auto-picking continuation now offers Min FOM in the picker toolbar (step 0.01; blank shows all). It hides circles below the threshold without modifying coordinates, counts, power statistics or cleanup. Hidden circles cannot be removed accidentally by right-clicking.

## 0.15.74 — combined particle-power cleanup

The picker now offers Delete reds and magentas, removing both groups in one operation using the same per-micrograph power statistics. Separate deletion buttons remain available.

## 0.15.73 — persistent LoG previews and picking improvements

- LoG Test picking circles and the FOM threshold survive tab switches while the relevant parameters and input STAR revision remain unchanged.
- Manual continuation of Auto-picking saves edited coordinates as *_autopick.star; Manual picking continues to use *_manualpick.star. Existing legacy coordinate mappings remain readable.
- The micrograph list shows current particle counts, updates during picking, and refreshes after batch filtering.

This is a complete installation package. Rebuild the native bridge after upgrading using your usual build_bridge.py command and options, then restart the server and refresh browser tabs.

## 0.15.72 — MPI launcher override, faithful copied drafts and LoG extraction defaults

`RELIONDELUXE_MPIRUN` accepts an absolute path to a working MPI launcher compatible
with your RELION build. It overrides RELION's `RELION_MPIRUN` command for local
runs and the scheduler. Broken SBGrid mpirun wrappers are checked with --version
before MPI submission and produce an actionable diagnostic. No arbitrary system
MPI is substituted. Queue launchers remain controlled by the queue script.

For tcsh:
```
setenv RELIONDELUXE_MPIRUN /absolute/path/to/compatible/mpirun
npm start -- --project /path/to/project
```
For bash:
```
export RELIONDELUXE_MPIRUN=/absolute/path/to/compatible/mpirun
npm start -- --project /path/to/project
```

New from these settings preserves the copied parameters rather than applying
new-draft input, mask or computing defaults. Later explicit project-default
changes retain their existing precedence. New extraction drafts using coordinates
from a LoG Auto-picking job with log_invert=Yes default do_invert to No. Explicit
user edits and copied jobs are protected.

Includes the .68–.71 initialization guard, compact next-job shortcut, fresh-project
Import selection and compatible-output defaults. Automated MPI-wrapper/inversion
checks and feed integration (including copied-value equality after refresh) passed.
Native SBGrid execution still needs validation on the workstation.

## 0.15.67 — Readable disabled choices in light themes

Disabled radio buttons and checkboxes in Light, France and Brazil now have a
stronger gray outline, a pale gray background and a dark selected marker.
The disabled controls remain inactive, while checked and unchecked states are
clearly distinguishable. Dark mode retains its existing appearance; system
forced-color mode retains native control rendering.

## 0.15.66 — Job actions in the editor heading

The Job actions menu is now immediately left of New from these settings.
The redundant Inspector heading and selected-name element have been removed.
Workspace-feed integration and JavaScript syntax checks passed.

## 0.15.65 — Shorter existing-job label

The editor mode now reads `EXISTING JOB` instead of `EXISTING JOB · CONTINUE`.

## 0.15.64 — Compact saved-job controls

The heading order is title, mode, selected job name. Existing jobs without an
alias hide the alias label and footer, placing run controls at the right of
the parameter tabs. Drafts retain the alias editor; saved aliases are displayed
read-only in the footer. Controls wrap on narrow panels.

Validation: workspace-feed integration passed, including draft scheduling and
retention of the same run controls across parameter-tab changes.

## 0.15.63 — Compact editor heading and footer

The editor mode, job title and selected job name share a horizontal row.
The alias label/input and run actions also share a row, including in feed
entries. Reduced padding leaves more room for parameters. Controls wrap when
space is insufficient instead of being clipped.

## 0.15.62 — Inspector input/output icons

Inspector file entries now use the same data-family symbols and colors as the
sidebar. Maps show the symbol beside the open-viewer control; other files show
it at the right of the entry. Tooltips identify the family and input/output role.
Pending outputs retain their disabled controls. Registered node types guide
classification, with filename fallbacks for reports, models and checkpoints.

Validation: data-family mapping checks and workspace-feed integration passed.

## 0.15.61 — Finer FOM threshold adjustment

The LoG preview Min FOM numeric control now increments by 0.01.

## 0.15.60 — LoG preview FOM display threshold

A numeric **Min FOM** control below Brightness hides preview picks whose
`_rlnAutopickFigureOfMerit` is below the threshold, immediately without rerunning
picking. An empty value shows all picks. The count shows visible/total picks.
Picks without a finite FOM remain visible with an explanatory count. This is a
preview display filter; it does not modify job settings or coordinate files.

Validation: FOM extraction, threshold hiding, equality at the cutoff, restoration
and absence of extra picking requests passed automated checks.

## 0.15.59 — Test LoG picking on the preview micrograph

The Laplacian tab now has a **Test picking** button. It runs `relion_autopick`
locally on the full most-defocused micrograph shown in the preview, preserving
its optics metadata and using the current LoG diameters, resolution, inversion,
and thresholds. Green circles show the returned coordinates (mean min/max
 diameter); yellow circles remain the diameter guides. Pan/zoom and brightness/
contrast controls remain available. Changing parameters clears stale picks.

Tests run one at a time, without creating a pipeline job or changing its files.
Temporary inputs/results are removed after success or failure. A ten-minute
limit prevents indefinite preview runs. Additional arguments and reading saved
FOM maps are explicitly unsupported for this isolated test. The serial
`relion_autopick` executable must be available in PATH; no MPI/queue is used.

Validation: mocked executable integration (filtered STAR, optics, coordinates,
errors and cleanup), DOM overlay/action checks, and existing workspace-feed
integration passed. Actual native RELION execution needs workstation testing.

## 0.15.58 — Detect the raw Import folder

New SPA Import drafts in raw mode suggest `Movies/*.tif`, `Micrographs/*.mrc`,
or the equivalent folder/extension when exactly one of these two immediate
project directories exists and contains files with a single supported extension
(mrc, tif, tiff; detected case-insensitively). Empty folders, mixed extensions,
unsupported files and ambiguous folder choices do not trigger this suggestion.
Uniform extension case is preserved; mixed-case suffixes use a matching glob.
Symlinks respect configured read roots. The check reads names/metadata only and
uses the existing cached input-default mechanism, rather than scanning on every
GUI refresh. Saved jobs, other-node Import mode and user-edited paths are not
changed. Existing Screening-derived suggestions remain the fallback.

Validation: folder detection, ambiguous cases, case handling, read-root access
and sequential-default integration tests passed. No native bridge rebuild needed.

## 0.15.57 — Synchronized navigation

Selecting a central workspace by mouse or keyboard focus scrolls its pipeline
row to the center of the right-hand list, or the closest possible position at
its ends. This position survives routine refreshes. Typing in an already active
workspace does not repeatedly recenter the list. Creating a draft scrolls the
central feed all the way to the bottom.

Validation: lifecycle tests, bounded centering calculations, and demo-server DOM
integration checks passed. Full rendered-browser scrolling was not tested here.

## 0.15.56 — Feed mirrors the complete pipeline

The central feed contains all pipeline jobs, including running, scheduled,
succeeded and failed jobs, in exactly the same numeric order as the right-hand
pipeline list. Click order no longer determines feed order. Selecting an existing
job removes the provisional draft without replacing it. A new draft is always
placed after all real jobs. Running/scheduling promotes that draft into its real
job entry; pipeline refreshes reconcile additions and removals without duplicates.

Complete editors load only when their entries approach the viewport or are
explicitly selected. Previously loaded editors retain their state; off-screen
polling remains paused. Placeholders preserve each job's position and height.
Routine refreshes preserve the visible feed anchor and do not navigate the feed.

Validation: three lifecycle tests plus demo-server DOM integration checks passed
for ordering, lazy parameter loading, draft removal, submission promotion and
refresh stability. No native bridge rebuild or runtime dependency is required.

## 0.15.55 — One provisional workspace

Only one unsubmitted draft remains in the feed. Choosing another job type or
“New from these settings” removes the previous provisional workspace before
adding its replacement, including when that draft is off screen. Jobs that have
been run or scheduled retain their complete workspaces. Inspecting a saved job
alone does not discard the draft. Checking a command does not commit a draft.
Removed drafts release their embedded document and polling resources.

Validation: syntax checks and focused lifecycle tests cover draft replacement,
off-screen drafts, refresh reuse, and retention of submitted/scheduled jobs.

## 0.15.54 — Complete workspaces in a scrolling feed

Rebuilt from 0.15.52 (not the summary-card experiment in 0.15.53).
Each central feed entry contains a full editor, parameter tabs, Run/Continue and
Schedule controls, its own editor/inspector divider, and its own inspector with
nodes, logs and convergence plots. Entries remain directly usable when revisited.

- Left-hand job types replace the provisional draft (since 0.15.55). “New from these settings” adds a separate
  complete workspace carrying the current entry's settings.
- Pipeline job selection opens the job once, then scrolls back to its existing
  workspace. Unsaved edits and tab choices survive navigation between entries.
- Running/scheduling a draft associates its workspace with the resulting job.
- Each entry retains its own split ratio and field/log scroll positions during
  the session. Background polling does not navigate the central feed.
- Theme, project computing defaults and pause-refresh controls are shared;
  off-screen workspaces pause polling and resume when brought into view.
- There is one shared footer. Feed history and unsaved drafts reset on page reload.

Internally, same-origin embedded documents isolate each workspace's existing
field IDs, asynchronous validation, viewers and action handlers. Only the shell
owns the side panels. No external framing is allowed. No native bridge rebuild
or additional runtime dependency is needed.

Validation: JavaScript syntax checks, workspace lifecycle regression tests and
DOM integration tests against the demo server passed. Integration covered separate
parameters/tabs, revisiting jobs, preview and schedule payloads, draft promotion,
“New from these settings”, and polling without duplicate entries. Full rendered
browser/drag testing was unavailable in the build environment.

## 0.15.52 — Auto-picking and extraction progress

Auto-picking and Particle extraction now use native growing-dot bars after their processing markers. The parser accepts padded time fields such as 18/  18 sec. Completion is measured from dots, not estimated time, and remains indeterminate when no supported bar exists. Seven progress tests passed. No native rebuild required.

## 0.15.51 — Compact LoG layout and missing-source clone prompt

Brightness/contrast sliders are vertical on opposite sides of the preview, with Scale alongside. Minimum and maximum diameter fields share a row. The bridge builder offers to clone the official RELION repository when the requested source directory is missing, then checks out the provenance commit in detached mode. Default answer is No; noninteractive builds explain how to provide sources instead of invoking git in a nonexistent directory. Existing source trees are never replaced. Syntax/compilation checks and the noninteractive missing-directory branch passed; network cloning and browser layout were not exercised here. No native rebuild needed for the GUI changes.

## 0.15.50 — Compact LoG preview controls

The preview is 256×256 with default scale 0.25 and appears before the minimum-diameter field. Both diameter fields gain synchronized sliders (1–1000 Å, expanding for larger typed values). Brightness and contrast sliders affect the image only; yellow circles stay bright and diameters remain in physical scale. Pan math follows the smaller canvas. Syntax checked; interactive verification remains needed. No native rebuild required.

## 0.15.49 — LoG diameter preview

Auto-picking LoG mode adds a 512×512 canvas below the Laplacian fields. It selects the highest numeric rlnDefocusU in the input STAR, starts at the micrograph center and overlays yellow min/max diameter circles scaled using the optics pixel size. Drag pans the micrograph; a numeric scale control adjusts magnification. Diameter edits redraw immediately. The image is loaded once per tab mount, downsampled to at most 2048 pixels wide, and displayed with mean ±3 SD contrast. TIFF/MRC inputs use the picker raw reader; inaccessible/scheduled inputs show an inline explanation. No job settings or files are modified by previewing. Syntax checked; interactive preview requires workstation verification. No native rebuild required.

## 0.15.48 — Separate red and magenta removal

Upper power multiplier defaults to 3; lower remains 2. Separate Delete all reds and Delete all magentas buttons confirm and remove only their selected group, retaining backups. Server filtering records the chosen mode. Existing statistics tests and syntax checks passed. No native rebuild required.

## 0.15.47 — Upper particle-power cutoff and micrograph-only imports

Auto-picking manual continuation adds an independent upper multiplier (default 2, step 0.1). Power above AVGP + multiplier × STDP is magenta; the lower cutoff remains red. Delete reds and magentas previews the combined count, requires confirmation and retains backups. Server filtering applies both thresholds; legacy clients without an upper multiplier retain low-only filtering. Manual picking remains unaffected.

SPA Motion correction is hidden when at least one successful raw Import exists and all successful raw Imports are single-frame. A successful multi-frame Import restores the button on refresh. Eight existing statistics/summary tests passed, one native test skipped; JS syntax checked. Interactive verification remains needed. No native rebuild required.

## 0.15.46 — Inspector resizing and initialization checks

Desktop split tracks no longer impose fixed minimum heights that create drag dead zones or overflow the viewport. Drag deltas use actual editor plus inspector heights, pointer capture is released, and workspace height follows the viewport/header size. Path validation and wildcard change checks wait until project initialization, suppressing premature missing-pipeline warnings. JavaScript syntax checked; interactive browser verification remains needed. No native rebuild required.

## 0.15.45 — cryoCARE prediction model chooser

The denoising model chooser filters for *.tar.gz archives, with Denoise/job013/denoising_model.tar.gz as a help example. With existing Denoise jobs it starts in Denoise/; an already-entered path still takes precedence. Native schema and demo catalog agree. Syntax and chooser pattern checks passed. No native rebuild required.

## 0.15.44 — Classification class-count defaults

Initial defaults are 25 classes for 2D classification and 3 for 3D classification (including STA 3D classification). Saved job settings and remembered project defaults still take precedence. Layout JSON values verified. No native rebuild required.

## 0.15.43 — Power screening only for Auto-picking continuation

The picker context explicitly indicates manual continuation of Auto-picking. Only those sessions mount particle-power screening and its controls. Manual picking draws green circles without automatic power measurement or Delete all reds controls. Optional quality callbacks handle the inactive mode, including diameter changes. Whole-image statistics and TIFF save fixes remain. Picker/server syntax checks passed; browser appearance needs workstation verification. No native rebuild required.

## 0.15.42 — TIFF picker power and saving

TIFF conversion now also covers raw micrograph statistics, particle-power calculations and save-time coordinate bounds validation. These paths share the display converter instead of calling the MRC-only reader on TIFF sources. This fixes unclassified gray picks caused by failed statistics and the MRC/MRCS-only error on saving. Eleven targeted tests passed; three native integration tests were skipped. No native rebuild required.

## 0.15.41 — TIFF micrographs in the picker

Picker display converts single-frame .tif/.tiff inputs with the existing dependency-free gain TIFF decoder into temporary unscaled float32 MRC files before filtering or denoising. Pixel size is taken from micrograph metadata. Original files and coordinate naming remain unchanged; temporary conversions are cleaned on success or failure. Converter format limits remain (including 512 MiB input limit). Converter tests and picker display/filter mock tests passed; native picker tests were skipped in this run. No native rebuild required.

## 0.15.40 — Disable STA denoising with SBGrid

In native STA mode, Denoise tomograms is disabled when SBGrid was automatically loaded or the resolved RELION/denoise executable comes from SBGrid's standard tree (SB_BASE or /programs). The sidebar and launch controls explain that a local RELION tomography installation is needed. Server submission guards include batch preview/scheduling and launching existing scheduled denoise jobs. Existing jobs remain inspectable. SPA, demo and local installations are unaffected. This is a conservative SBGrid policy, not a probe of individual Python dependencies. Already-running native schedulers are not stopped. Detection regression and syntax checks passed. No native rebuild required.

## 0.15.39 — Voltage, CTF input protection, physical cores

SPA Import voltage is a dropdown: 80, 100, 120, 200, 300 kV. CTF precomputed power spectra are disabled and set to No for inputs that are not registered Motion correction outputs, with the existing explanatory hint. Linux CPU detection counts distinct socket/core pairs within the process CPU affinity; macOS uses hw.physicalcpu. Unavailable topology leaves the default unset instead of substituting hardware threads. Saved CPU budgets are preserved; manually lower any previously saved logical-thread count. Four targeted tests and editor syntax passed. No native rebuild required.

## 0.15.38 — Explicit cluster mode and local resource detection

Pass --cluster to show queue controls in project defaults, job editors and template step editors. Without it, queue controls are hidden and submitted/previewed jobs use do_queue=No, including batch submissions. Saved job files are not rewritten merely by opening them. Local CPU parallelism and positive NVIDIA GPU counts (nvidia-smi, filtered by CUDA_VISIBLE_DEVICES) fill unset global resource defaults. Saved budgets take precedence. Matching detected values show a faint detected label. Detection runs once at startup; unavailable/zero GPU detection leaves the existing manual GPU-count setting unchanged because current resource rules require a positive count.

New local fallback/precedence/queue checks and CPU detection passed; syntax checks passed. Two older project-default tests still assume no built-in executable defaults and fail on those pre-existing defaults. Desktop appearance and live GPU detection need workstation verification. No native rebuild required.

## 0.15.37 — Open the local desktop browser

After successful listening, launch the default browser at the tokenized URL using the actual selected port. Linux uses xdg-open or gio when DISPLAY/WAYLAND_DISPLAY is present; macOS uses open. SSH and CI sessions are skipped. Use --no-browser to disable. Desktop detection is a heuristic and may include VNC desktops; it cannot prove physical presence. Launch is detached and the URL remains printed for manual opening. Desktop detection/opt-out checks and server syntax passed; no live desktop was available to verify rendering. No native rebuild required.

## 0.15.36 — Automatic SBGrid and terminal dialogs

When core RELION commands (relion, relion_pipeliner, relion_image_handler) are missing, startup attempts SBGrid initialization before loading project defaults. SHELL selects bash/zsh or tcsh/csh syntax, with available compatible-shell fallbacks. The exported environment is imported for the server and its child jobs; it does not modify the parent terminal or shell startup files. Working core installations are preserved even if optional tools are absent. Use --no-auto-sbgrid to disable. Source failures retain existing startup warnings. This cannot repair npm failing before the server starts; the direct shell launcher remains available.

Project creation, port conflicts, missing executable and link-access confirmations use whiptail if available in an interactive terminal, defaulting to No. Escape cancels; launch failures fall back to text. Existing unattended rules remain. Mock bash environment loading and core-installation preservation tested, plus startup access/project checks. Live SBGrid/tcsh and whiptail rendering require workstation verification. No native rebuild required.

## 0.15.35 — Startup confirmations

Before listening, native mode asks for confirmation when RELION executables are missing, then scans project directories once for symbolic links outside the project and configured read roots. It reports target paths and suggested --read-root options; broken links and unreadable directories are reported separately. It never follows symlinked directories, so nested links inside linked trees are not audited. No permissions are granted automatically. Prompts default to No. Unattended startup stops when warnings require confirmation; explicitly pass --accept-startup-warnings to accept them for that launch. Demo mode skips these checks. Three targeted checks passed, including internal links, loops, allowed roots, broken links and unattended confirmation. No native rebuild required.

## 0.15.34 — Import node-type input symbol

The Import other Input file symbol follows the selected Node type and refreshes immediately when options change. All seven native choices map to the existing coordinates, particles, class references, micrographs, maps or masks symbols; unknown types use the generic file symbol. All seven mappings and JavaScript syntax checked. Restart and refresh; no native rebuild required.

## 0.15.33 — Compact job and input symbols

Pipeline job names now include the same job-type symbols as the sidebar, at 19px without an extra grid column. File input labels include 17px data-family symbols with explanatory tooltips, based primarily on native nodeType metadata, including SPA and STA families. Unknown file types retain the generic external-data symbol. Symbols guide browsing but do not replace STAR validation. JavaScript syntax and representative field-family mapping checks passed; visual testing on the user's browser remains needed. Restart and refresh; no native rebuild required.

## 0.15.32 — DynaMight progress

Running DynaMight jobs parse Epoch N of M epochs and tqdm percentage/count bars. Progress describes the current phase, not total job completion; resets are allowed when another phase or half-set starts. Both run.out and run.err are checked using bounded tails and stat-based caching; when both contain recognizable progress, the most recently modified log is used. Six progress tests passed. Restart and refresh; no native rebuild required.

## 0.15.31 — Bayesian polishing summaries and connections

Finished Bayesian polishing jobs show Train or Polish from their saved do_param_optim/do_polish settings. The display graph now supplements polishing dependencies with fn_mic as well as fn_post, adding missing Motion correction arrows and producer outputs for inspector highlighting. Alias handling and refresh caching are retained; native pipeline files are not changed. Seven targeted summary/dependency tests passed. Restart the server and refresh; no native rebuild required.

## 0.15.30 — SBGrid Topaz denoiser resolution

The browser picker asks SBGrid wrappers in sbgrid_bin for their actual executable using --sbwhich (five-second timeout). It uses a uniquely reported, executable relion_python_topaz path without changing the inherited environment. If discovery fails it retains normal wrapper execution. Other RELION commands are unaffected. A nonempty RELIONDELUXE_TOPAZ overrides discovery; invalid overrides fail explicitly. No output from a nominally successful denoiser is now reported clearly, and failures include stderr.

For tcsh, after loading SBGrid, use:

    setenv RELIONDELUXE_TOPAZ /programs/x86_64-linux/relion/5.0.1_cu13.0/bin/relion_python_topaz
    npm start -- --project /path/to/project

For bash use export RELIONDELUXE_TOPAZ=/absolute/path/to/relion_python_topaz.
The override is an executable path only, without denoise or other arguments. Restart the server after changing it. No native rebuild required. Eight targeted tests passed using mock wrappers and the native picker bridge; a live SBGrid installation was not available for testing.
SBGrid discovery documentation: https://docs.sbgrid.org/environment/capsules/

## 0.15.29 — Recover running Manual picking sessions

Continue can now reopen a running SPA Manual picking job even when its browser-session marker is absent. Recovery uses saved job settings, validates the micrograph input revision, and creates only missing session metadata. It does not resubmit the job or overwrite coordinates. Unsupported saved native-only options give an actionable explanation instead of assuming a native window exists. Close any existing native picking window before editing the same job in the browser.

Seven picker tests passed, including missing-marker recovery, repeated reopening, changed-input rejection, coordinate saving and completion through the native bridge. Restart the server and refresh the page; no native rebuild is needed.

## 0.15.28 — Resume running manual picking and scheduler status

Continue remains enabled for a running Manual picking job. For browser picking it reopens the existing session without resubmitting or changing its saved parameters. Native-started sessions direct the user to their existing native window. Other running job types remain protected against resubmission.

The Pipeline heading shows the latest meaningful line of an active pipeline_deluxe_*.log, or labels the most recent stopped scheduler as Last scheduler. Hover shows the filename and recent lines. Activity is inferred from RELION's RUNNING_PIPELINER marker (a stale marker is not a process-liveness check). A bounded 16 KiB tail is read on refresh. Scheduler summary tests and syntax checks passed. Restart and refresh; no native rebuild needed.

## 0.15.27 — Dominant-class map output

Automatic dominant 3D class selection now copies the winner's _rlnReferenceImage into its External job directory as run_itNNN_dominantclass.mrc (using the model filename's iteration prefix). For a non-iteration model it uses the model basename prefix. The copy is published by rename after successful copying and registered as DensityMap.mrc.relion alongside particles.star, enabling the usual download and 3D viewer controls. Missing or unsupported indexed map references cause a clear failure instead of a false success marker. Existing finished jobs are not retroactively modified; rerun/continue the automatic job to generate this output. Three targeted tests passed. Restart and refresh; no bridge rebuild needed.

## 0.15.26 — Expose dominant selection in existing templates

Fixed the 3D-input lookup route: the regular editor's GET request now reaches the handler. The idealized step editor adds do_dominant_3d=No when absent from older templates and presents a Yes/No selector in Class options. A symbolic optimiser reference to a 3D classification step disables the 2D ranker; choosing dominant selection also forces that ranker off for batch execution. Existing templates do not need recapturing. Native preview/scheduling tests and a live HTTP lookup regression test passed. Restart and refresh; no bridge rebuild required.

## 0.15.25 — Automatic dominant 3D class selection

SPA Subset selection adds Select dominant 3D class only? below the 2D class-ranker option. For a readable 3D optimiser/model (rlnReferenceDimensionality=3), the GUI disables the 2D ranker and exposes this option. The server also forces the ranker off for recognized 3D input. Reading model metadata does not load map voxels.

The automatic mode is represented as a standard RELION External job in External/jobNNN/, displayed as Subset selection in RelionDeLuxe. This keeps native scheduling, queue submission and pipeline status compatible. The native GUI shows its actual External settings. At execution time the runner follows rlnModelStarFile and rlnExperimentalDataStarFile, chooses the largest finite nonnegative rlnClassDistribution from data_model_classes, and uses relion_star_handler to select matching rlnClassNumber rows into particles.star, preserving the native optics/particle metadata handling. Class IDs use the explicit model column when present, otherwise the 1-based model row. Ties select the lowest class ID and are logged. Output nodes and success/failure markers are published using RELION's External interface.

This mode accepts only the optimiser input; clear the alternative micrograph/particle inputs. Other selection transformations and Additional arguments must be disabled/empty. Use New from these settings when switching an existing native selection job to this mode (or vice versa). Existing job types cannot be changed in place. On cluster workers, the installation path, Node runtime and relion_star_handler must be accessible. The computation survives web server shutdown because RELION launches the External command.

Tests cover dominant/tied classes, native preview/scheduling/settings roundtrip, and existing native browser-selection output behavior. Full execution with a workstation relion_star_handler and browser UI still needs verification. Restart and refresh; no native bridge rebuild required.

## 0.15.24 — Startup executable warnings

Before listening, native-mode startup checks RELION executables in the inherited server PATH, including relion, relion_image_handler, pipeline/scientific programs and mode-specific SPA or STA tools. Missing or non-executable entries are listed together with environment setup guidance. Startup continues, since optional tools or cluster-only programs may be absent locally. Demo mode skips the check. The check accepts executable wrappers without executing them or bypassing SBGrid. It verifies lookup/permissions only, not runtime dependencies. A targeted test covers wrappers, missing tools and mode separation. No bridge rebuild required.

## 0.15.23 — Clear the idealized pipeline panel

A Clean button before Capture clears the loaded template, external bindings and displayed steps, resets template actions, and saves the empty state for this project in the browser. Concrete jobs and exported JSON files are untouched. Restart and refresh; no bridge rebuild needed.

## 0.15.22 — Additional job summaries

Finished Auto-picking rows show LoG, References, TopazTrain or TopazPick from saved settings. 3D classification shows the class count, matching 2D classification. CTF refinement with do_aniso_mag=Yes shows the latest reported anisotropy per optics group rounded to three decimal places (e.g. 0.584%). Multiple optics groups are explicitly labelled rather than silently choosing one. Existing summary caching and refresh behavior are retained. Four summary tests passed. Restart and refresh; no bridge rebuild needed.

## 0.15.21 — Restore dependency-arrow activation

Connector clicks no longer access the removed collapsedJobSections state. Clicking alternates between source and destination, selects the corresponding row, scrolls it into view and retains connected-file highlighting. Regression tests exercise both directions against the actual activation handler with a simulated DOM. Restart and refresh; no native rebuild required.

## 0.15.20 — Additional job progress formats

Local resolution follows the RELION dot bar after Calculating local resolution in. Bayesian polishing training follows the it/s_vel/s_div/s_acc/fsc table against the standard 100-iteration budget (training may converge earlier; custom --par_iters limits are not inferred). ModelAngelo combines four percentage-bar cycles as equally weighted stages; duplicate final 100% updates do not advance stages. Unexpected resets or extra stages fall back to indeterminate.

ModelAngelo progress reads percentage records across the complete log on changes so stage transitions outside the tail are retained, including after server restart. Other types keep the bounded head/tail read. These are progress indicators, not time estimates; native job status remains authoritative. Four parser/cache tests passed; actual workstation log variations may require further adaptation. Restart and refresh; no bridge rebuild required.

## 0.15.19 — Own polishing parameters and concurrent-run confirmation

Bayesian polishing sigma_vel, sigma_div and sigma_acc fields are hidden unless both Polish and Use own parameters are Yes. Values are retained when hidden.

Run/Continue on an existing job refreshes pipeline state and asks for confirmation if another job is running, naming those jobs. Cancel submits nothing. This advisory check does not reserve resources or prevent a job from starting concurrently after the check. New-job submission and scheduling retain their existing behavior. Restart and refresh; no native rebuild required. JavaScript syntax checked; workstation UI verification remains pending.

## 0.15.18 — Bayesian polishing Train/Polish controls

SPA Bayesian polishing combines Train and Polish into one Train/Polish tab with mutually exclusive radio buttons. Only fields for the selected mode are visible; switching retains their values. The existing own-parameters enable/disable conditions remain. Invalid equal mode flags normalize to Polish when opening the editor. STA Bayesian polishing has different parameters and is unchanged. Restart and refresh; no bridge rebuild required.

## 0.15.17 — Unified pipeline list and conditional queue fields

All jobs appear in a single scrollable list sorted by job number. Running/Finished/Scheduled grouping and collapse controls are removed. Status dots, running progress bars, mouse/keyboard selection and dependency arrows remain. Status changes no longer move jobs into separate sections, so arrow endpoints stay in the same list.

For all job types, queuename, qsub, qsubscript and min_dedicated fields hide when do_queue is No and reappear when Yes. Their configured values are preserved. Selection/dependency tests and JavaScript syntax checks passed; browser layout still requires workstation verification. Restart and refresh; no bridge rebuild required.

## 0.15.16 — Running-job progress bars

Running job rows display a slim progress bar. Motion correction and CTF estimation parse the native processing-stage mouse/cheese bar (60 dots), never the estimated time ratio. 2D/3D classification and fixed-iteration initial-reference logs use the latest reported iteration and total, counting the current iteration as unfinished. Auto-picking, auto-refine and other jobs without recognized reliable totals show an indeterminate animation. Missing logs/formats also fall back to indeterminate. Stage completion is not job completion.

Refresh reads at most 256 KiB of log tail plus 64 KiB of header per changed running log and caches unchanged results. No GPU/scientific commands are launched. Reduced-motion preferences disable sweeping animation. Restart and refresh; no bridge rebuild needed. Parser/cache tests passed; graphical workstation verification is pending.

## 0.15.15 — Existing iteration files only; visible central divider

Stdout refreshes now list existing iteration optimiser/map files from the selected job directory. Only those files become links, including during execution. This naturally handles gradient runs that save every tenth iteration and EM runs that save every iteration. Missing/cleaned files remain plain text; files can still disappear after a refresh.

The central resize handle now occupies its own visible grid row outside panel overflow clipping. Parameter fields can shrink and scroll so the editor footer and Run button remain visible. Restart and refresh; no bridge rebuild required.

## 0.15.14 — Live iteration links and central panel resizing

2D classification and 3D auto-refine stdout iteration links are enabled while running. The newest iteration message can precede output creation; reopen the link after files are written. Other scheduled/running output controls retain their existing behavior.

On desktop layouts, drag the horizontal separator between editor and inspector to adjust their heights. Arrow Up/Down adjusts the focused separator; double-click resets it. The split is saved in browser local storage. Narrow layouts retain their stacked layout. Syntax and iteration-link tests passed; visual browser verification remains to be done on the workstation. Restart and refresh; no bridge rebuild required.

## 0.15.13 — 2D classification iteration gallery links

Finished 2D classification stdout now links Expectation iteration and Gradient optimisation iteration messages to run_itNNN_optimiser.star in the browser gallery. Links carry the selected job, theme and authentication token. Like existing 3D auto-refine links, these appear after a job finishes (including failed/aborted jobs); running outputs remain inactive. Cleaned or unwritten iterations may no longer have viewable files. Restart and refresh; no native rebuild required.

## 0.15.12 — Allow existing Node 18 installations to start

The launcher now treats Node versions below the recommended 22 as a compatibility warning, not a startup blocker. A genuine failed runtime probe still stops startup. The package engine recommendation remains >=22; allowing startup does not certify all features on older versions. This fixes the unnecessary rejection of an existing Node 18.19.1 installation. The separate SBGrid awk message emitted before npm's start banner is outside this launcher; an explicit runtime can avoid that path: `RELIONDELUXE_NODE=/usr/bin/node sh scripts/start.sh --project /path/to/project`.

## 0.15.11 — Explain Node startup failures

The launcher now reports an unsupported Node version explicitly instead of the generic probe failure. A failed runtime invocation remains a separate diagnostic. SBGrid initialization via `source /programs/sbgrid.shrc` is supported; modules are not required. If an awk capsule error occurs before npm prints its start banner, the launcher cannot prevent that earlier error: use an explicit Node executable with the direct shell launcher. Check `/usr/bin/node --version` to distinguish an older system Node from wrapper failures.

## 0.15.10 — SBGrid-aware Node startup

`npm start` now reuses npm_node_execpath rather than searching PATH for another `node`. `RELIONDELUXE_NODE` can explicitly choose a Node.js 22+ executable. Scientific PATH entries, library paths and SBGrid capsule variables are inherited unchanged; wrappers remain valid executables and are not replaced by realpath targets. Node startup probes report actionable failures without hiding wrapper stderr.

If npm itself cannot start because an SBGrid node wrapper fails:

```bash
RELIONDELUXE_NODE=/absolute/path/to/working/node \
sh scripts/start.sh --project /path/to/project --tomo
```

Load your site's SBGrid environment before launching. Do not globally strip /programs from PATH: RELION wrappers may require that environment. For queue workers, ensure the submission script loads the appropriate site environment too. The bridge still requires a RELION source revision matching this release; SBGrid packaging does not remove that requirement.

Run `npm run diagnose` (or `/absolute/path/to/node scripts/diagnose-environment.mjs`) to report the running Node executable, executable lookup results and PATH search order. It does not launch scientific commands, scan the SBGrid tree or resolve symlinks to bypass capsules. Lookup success is not proof that the wrapper payload is present or that an NFS mount is healthy. Send persistent missing capsule-file errors to the site's SBGrid administrator.

The reported awk failure for node__ccp4 suggests wrapper dispatch failure, not a JavaScript exception. It is fatal to that awk invocation; whether the overall server stops depends on the wrapper's exit behavior. The launcher now explicitly checks Node viability. Local tests verify npm-runtime preference, explicit override, argument forwarding and unchanged PATH. A real SBGrid/NFS deployment has not been tested here.

References: https://docs.sbgrid.org/environment/software_modulefiles/ and https://docs.sbgrid.org/installation/installing_sbgrid/

## 0.15.9 — Correct training output presentation and half-tomogram galleries

RELION registers tomograms.star for cryoCARE training too. The inspector now substitutes the actual denoising_model.tar.gz output using the saved training mode, not unsaved form edits. The archive is plain text; native pipeline registrations are unchanged.

The gallery now recognizes reconstructed half-1/half-2 volumes and projection columns, including the native half-2 projection label spelling. Reconstruction jobs that output halves for cryoCARE no longer require a combined-volume column. Restart and refresh; no bridge rebuild is required.

## 0.15.8 — Reconstruction gallery and training archives

Reconstruct tomograms outputs now open the same browser gallery with central X/Y/Z slices of reconstructed volumes. Denoise training .tar.gz model outputs remain visible as plain, non-clickable entries, with a hint that they are inputs for Prediction. Scheduled/running output actions remain inactive. Restart and refresh; no native bridge rebuild is required.

## 0.15.7 — Denoised tomogram gallery

Denoise tomograms STAR outputs open the browser gallery with the denoised column selected by default. Both rlnTomoReconstructedTomogramDenoised and rlnTomoDenoisedTomogram are recognized. Central slices can be viewed along X, Y or Z; the image-source selector permits explicit comparison with the original reconstruction. Missing denoised entries never silently fall back to originals. This is a slice gallery, not a full tomogram navigation tool.

Picker filter errors now identify the requested filters and explain that relion_image_handler must be executable in the server's inherited PATH. Activate the RELION environment before starting the server, or explicitly disable both filters in job settings. No filters are silently skipped. Restart the server and refresh the browser; no bridge rebuild is needed.

## 0.15.6 — Unified CryoCare controls and training-name validation

Denoise tomograms has one CryoCare tab with Training/Prediction radio buttons. Exactly one mode is selected; only its fields are visible. Native parameter names and saved values remain compatible with RELION.

Before launching or scheduling training (including batch preview), colon-separated tomogram names are checked as an exact, case-sensitive subset of the first Import job's tilt_series.star names (_rlnTomoName, normally its first column). Warnings identify unknown names and the source file. Missing or scheduled Import output is reported as unverifiable, not as an invalid subset. Prediction skips this check. Restart the server and refresh the browser; no bridge rebuild is required.

## 0.15.5 — Optional modern cryoCARE installation

```bash
CONDA_EXECUTABLE=/path/to/miniforge3/bin/conda \
python3 scripts/build_bridge.py relion-source --output build --replace_cryocare
```

The opt-in step runs after a successful bridge build. It clones the `make_cryocare_great_again` branch into `relion_cryocare_wrappers/cryoCARE_pip`, creates or reuses `cryocare-modern`, installs its GPU requirements, runs pip check and TensorFlow GPU detection, and generates three script wrappers. It installs uniquely named Bash/sh and csh/tcsh activation/deactivation hooks in the existing `relion-5.1` environment. All four modified variables are restored on deactivation; unrelated hooks are preserved. Wrappers also configure their own process environment so a scheduler can invoke them independently of shell activation.

Use `--conda-executable /path/to/conda` and `--relion-conda-env another-name` (or an absolute environment prefix) if needed. CONDA_EXECUTABLE, CONDA_EXE, CONDA_INSTALL/bin/conda, then PATH are supported for discovery. No interactive conda activate is required during installation.

After success, reactivate the RELION environment and restart the server. `cryocare-install.json` records the absolute wrapper path, source commit and environment. That path becomes the cryoCARE default for unsaved settings; existing project defaults and saved job values retain precedence. For an existing project, select the wrapper path in Workstation / cluster defaults and save. Rerun setup if relocating the installation.

This downloads and installs dependencies and modifies the two Conda environments. Existing managed source is reused without an automatic git update; requirements are checked/installed on every run. Unmanaged wrapper directories or colliding hook files are refused rather than deleted. No original cryoCARE installation is removed. A failed setup exits nonzero and does not publish a new default; a created environment or downloaded source may remain for a retry.

GPU detection may report no devices on a build/login host. It does not establish numerical correctness or Blackwell compatibility: this branch currently pins TensorFlow 2.15.1, and its smoke/training tests must be run on the compute host. Installer orchestration and Bash wrappers/hooks are tested with mocked Conda; no full dependency installation, tcsh execution or real GPU training was performed here.

## 0.15.4 — Multi-GPU cryoCARE training

Denoise tomograms accepts comma- or colon-separated GPU IDs (for example `0,1`) for training with a multi-GPU-capable cryoCARE installation. No MPI is used. Training inherits all configured workstation GPU IDs; prediction retains one GPU because the linked cryoCARE fork only distributes training.

For compatibility with the unchanged native command builder and scheduler, saved native settings contain the first GPU in `gpu_ids` and the remaining GPUs as repeated `--gpu` flags at the start of Additional arguments. RelionDeLuxe reconstructs the complete GPU list when loading the job. Enter GPU IDs in the dedicated field, not Additional arguments. IDs refer to GPUs visible to the process, including any CUDA_VISIBLE_DEVICES restriction.

Restart the server and refresh the browser; no native adapter rebuild is required. Command generation, settings round-trip and stock scheduler execution were tested with a stub scientific executable; real multi-GPU training requires workstation verification.

## 0.15.3 — STA CTF resources, native tomogram display and cryoCARE

STA CTF estimation now defaults to nr_mpi=globalNcpus, for both new-job defaults and template batches. Reconstructed and denoised tomogram STAR outputs launch `relion_display --gui --i <file>`; tilt-series inputs retain their native tilt-series viewer.

STA Workstation / cluster defaults includes the cryoCARE executable directory (HTML ID `project-fn_cryocare_path`), defaulting to `/programs/x86_64-linux/cryocare/0.3.0/bin`. It maps to the native `cryocare_path` option and follows existing defaults/individual-job precedence. Nonempty global values must name an existing directory; empty means use PATH. Idealized templates store this machine-specific setting as TBD and resolve it at batch preview.

Restart and refresh; no adapter rebuild is needed after 0.15.0.

## 0.15.2 — MRC import frame detection

MRC/MRCS imports now read NZ (the Z dimension) directly from the 1024-byte file header. NZ=1 means a single-frame input; NZ>1 means a multi-frame input. Both byte orders and float16 mode are supported. Invalid/truncated headers report detection unavailable rather than assuming one frame. Other formats retain their existing detection method. This fixes both SPA is_multiframe and STA images_are_motion_corrected inference.

Restart the server and reload the browser to clear cached frame hints. No adapter rebuild is required.

## 0.15.1 — Startup and STA workflow conveniences

Busy ports now offer the next available port in an interactive terminal. Noninteractive starts print an actionable `--port` suggestion instead of a Node stack trace. The selected port is used in printed URLs and HTTP checks.

SPA Import starts new optics groups with `optics1`. STA Import shows cached inline match counts for movie and MDOC patterns and detects the first matching image's frame count: single-frame → images_are_motion_corrected=Yes, multiple frames → No. A successful detection locks that field; change the image pattern to detect again. Frame count is a file-type heuristic, not proof that motion correction occurred. The completed-job summary shows the last “N tilt-series” output count.

Motion correction has binning choices 1, 2, 4, 8 and 16 in both modes. Previously saved unusual values remain visible but cannot be newly selected. STA Motion correction defaults to globalNcpus MPI processes and one thread, in either implementation; SPA rules are unchanged.

Unexecuted STA job types suggest compatible, unambiguous outputs from the most recent successful producer, including non-adjacent types; existing jobs and edited fields are preserved. Active default input modes are respected. STA workstation defaults now include the requested IMOD batchruntomo and AreTomo3 executable paths with the existing validation and precedence behavior.

Restart the server and refresh the browser. No native adapter rebuild is needed if you already built 0.15.0.

## 0.15.0 — First tomography / STA mode

**Rebuild the native adapter**, then start with:

```bash
python3 scripts/build_bridge.py /path/to/relion-source --output build
npm start -- --tomo --project /path/to/tomography-project
```

This adds the native 24-job STA catalogue, mode-specific forms and command generation, tomography input checks and data-family symbols, compatible input browsing, resource rules and mode-tagged idealized pipelines. The native pipeline remains authoritative. Without `--tomo`, SPA remains the default.

Tilt exclusion, tomogram picking and interactive STA Subset selection initially use native workstation windows. Read [TOMOGRAPHY.md](TOMOGRAPHY.md) for supported workflows, resource choices, validation results and deferred features.

## Update in 0.14.36 — Manual input preparation reminders

Template step editors now include **Manual input preparation reminders**. Each reminder identifies an input option and instructions; the actual filename is taken from that option so renumbering remains correct. Capture flags unregistered upstream outputs for review. Validation also suggests reminders for symbolic `_boxNNN.mrc` references. These are possibilities, not proof of manual work; uncheck an unnecessary reminder and save the step.

Example metadata inside a step:

```json
"manualRequirements": [
  {"field": "fn_ref", "instruction": "Inspect the classes, choose the reference, and rescale it. Write a temporary MRC and rename it to the required filename after success."}
]
```

Batch preview shows the resolved file and instructions. Scheduling saves reminders beside the new job; the pipeline list and inspector show missing/present state using live filesystem checks. The native preview must register the marked input so RELION can wait for it. No extra execution gate or completion confirmation is added. File presence is not verification of image content; use a temporary output and rename on completion. Existing already-scheduled batches do not acquire reminders retroactively.

Resource rules updated: Local resolution uses nr_mpi=globalNcpus; ModelAngelo uses gpu_id=0 (superseding its earlier GPU-list rule).

Restart and refresh; no additional adapter rebuild needed.

## Update in 0.14.35 — Wait for job completion before opening outputs

Inspector output items are noninteractive while a job is Scheduled or Running, including map downloads, map/PDF/gallery tabs and native viewers. Inputs and interactive picking/selection resume controls remain available. A status transition refreshes the inspector automatically. Restart and refresh; no adapter rebuild needed.

## Update in 0.14.34 — Global executable and pooling settings

Global defaults now include CTFFIND, MotionCor2, ResMap executables and pooled particles (positive integer). Nonempty executable settings must resolve to executable files when saved; relative paths resolve against the project and bare commands use server PATH. Empty strings are accepted. Both GPU-ID fields accept empty strings, including template resource resolution. ResMap becomes TBD in portable templates and resolves from workstation defaults. Restart and refresh; no additional adapter rebuild needed.

## Update in 0.14.33 — Portable template computing resources

Captured, validated and exported templates use `TBD` for CPU/GPU, queue, executable, scratch and memory/I/O resource options. Scientific parameters and input dependencies remain concrete or symbolic as before. Old template machine settings are normalized too; unused input bindings are removed. This supersedes 0.14.32's precedence policy for template computing settings; ordinary concrete-job precedence remains unchanged.

Configure **globalNgpus**, **globalNcpus**, and **globalGpu_ids** in Workstation / cluster defaults before batch preview. Counts default conservatively to 1 when unset. GPU IDs accept comma/colon-separated numbers; their distinct count must match globalNgpus for jobs using the GPU selection. ModelAngelo receives comma-separated IDs. Queue options use the current project's defaults; other unspecified machine settings use the installed adapter's schema/environment defaults. In particular, external tools must be available on the destination workstation. An External job whose executable has no destination default needs local configuration before scheduling.

The requested job-specific rules are applied during preview and again when the batch is scheduled. Preview reports the resolved resources. Auto-picking has no native thread option, so none is invented. LoG forces GPU use off; Topaz enables it (RELION requires GPU use for Topaz training). 3D initial reference has no do_grad switch and uses the gradient branch. DynaMight uses the native singular gpu_id=0 and four threads; ModelAngelo also uses singular gpu_id. EM thread division must be integral; invalid CPU/GPU counts are rejected rather than rounded. Native RELION still validates its own process-count requirements (e.g. split-half refinement needs an appropriate MPI count).

Restart and refresh; no additional adapter rebuild is needed beyond 0.14.28 for DynaMight clones.

## Update in 0.14.32 — Template settings take precedence

Batch preview and scheduling apply defaults in this order: job schema defaults, project computing defaults, then explicit template values. No and empty strings in templates remain explicit values. Project defaults fill only omitted template fields. LoG/GPU errors report inherited settings accurately. Restart and refresh; no additional adapter rebuild needed.

## Update in 0.14.31 — Identify batch-preview failures

Batch preview errors name the symbolic step, job type/title and planned output directory. LoG/GPU conflicts identify the fields and tabs, and explain when a global GPU default overrides the template. Restart and refresh; no additional native rebuild required.

## Update in 0.14.30 — Accept optional slash in symbolic job paths

Template validation normalizes an optional slash after ${jobN} or ${jobN+N} before unfolding and checking dependencies. This fixes DynaMight checkpoints captured with an extra separator. Restart and refresh; no additional adapter rebuild needed after 0.14.28.

## Update in 0.14.29 — Fix DynaMight self-checkpoint capture

Capturing an original DynaMight continuation no longer reads the refinement-only fn_cont option. This fixes the undefined path error. Restart and refresh; no additional adapter rebuild needed if already rebuilt for 0.14.28.

## Update in 0.14.28 — DynaMight idealized phases

Template validation expands a DynaMight motion-estimation/self-continuation job into three separately numbered jobs: motion estimation, inverse deformations, and deformed backprojection. Visualization is omitted. The inverse and reconstruction jobs are native DynaMight continuations with CloneContJobNNN aliases; downstream backprojection references follow the final clone. Re-validation and re-capture preserve the expanded phases.

Clone result directories use absolute symlinks: inverse reads forward results from its source, and reconstruction reads forward/inverse results from its source. New results are written in the clone's own output directory. Keep source jobs and their results; moving the project requires updating absolute links. Do not switch a clone to a different computational phase in the concrete GUI: create a new template batch instead. Review checkpoint, epoch and batch-size choices before scheduling. The optional visualization phase is not scheduled.

**Rebuild the native adapter**, then restart and refresh:

```bash
python3 scripts/build_bridge.py /path/to/relion-source --output build
```

Validation, native command generation, scheduling, linked-result access, re-capture and stock scheduler execution were tested with a mock computation executable. Real DynaMight GPU reconstruction has not been tested in this environment.

## Update in 0.14.27 — Contain the mask viewport

The Binarisation parameter area now scrolls instead of letting the mask viewport overflow the editor. The viewport adapts to window height, with a smaller minimum size for shorter windows. The editor footer remains outside the scrolling area. Restart and refresh; no native rebuild needed.

## Update in 0.14.26 — Clear gallery errors after cleanup

Missing gallery images now explain that job cleanup may have removed them. A live filesystem check identifies matching files in project Trash, including cleanup done outside RelionDeLuxe. Gallery links stay available so remaining images can still be viewed. Restart and refresh; no native rebuild needed.

## Update in 0.14.25 — GPU defaults and available disk space

Workstation / cluster defaults now include Use GPU and GPU IDs. GPU IDs are disabled when GPU use is No; settings apply to supported jobs with the existing global-save/per-job precedence. Project size also shows available filesystem space from df, cached and updated alongside du. Restart and refresh; no native rebuild needed.

## Update in 0.14.24 — Bounded angular-distribution draw calls

Angular distributions now render in batches of at most 1,000 cylinders per NGL shape to avoid browser per-draw index limits. All cylinders retain their colors, dimensions and shared visibility control. Restart and refresh; no native rebuild needed.

## Update in 0.14.23 — Angular distributions in the map viewer

Class maps automatically load a matching _angdist.bild as colored NGL cylinders with a visibility checkbox. Coordinates and radii are preserved. Half-map filenames first use their exact companion, then the same iteration/class without the half suffix. Missing distributions leave the map visible. Restart and refresh; no native rebuild needed.

## Update in 0.14.22 — Show cleaned files in Trash

Trash now also lists job folders containing cleaned files without a deleted_pipeline.star manifest. Expand a cleaned-job entry to see its contents. Deleted groups retain their existing undelete action; cleaned jobs remain registered in the pipeline. Restart and refresh; no native rebuild needed.

## Update in 0.14.21 — Project size and cleanup

Project size is measured with du -sh asynchronously at first load, after terminal job-status changes and after global cleanup. Ordinary refreshes reuse the result. The Trash dialog offers gentle/harsh cleanup of successful jobs (honoring NO_HARSH_CLEAN) and confirmed permanent emptying. Restart and refresh; no native adapter rebuild needed.

## Update in 0.14.20 — Selected job in editor heading

The editor shows the selected job directory immediately below the job-type title. It is hidden for new jobs. Restart and refresh; no native rebuild needed.

## Update in 0.14.19 — Debug controls and computing defaults

Use `npm start -- --project /path/to/project --debug` to show Pause auto-refresh. Without --debug, refreshing stays active. Desktop pipeline and idealized pipeline panels share their vertical space equally. Crossover help now explains half-pitch. Threads and MPI processes are per-job settings; older global values are ignored. Restart and refresh; no native rebuild needed.

## Update in 0.14.18 — Fix startup after iteration links

The server now serves iteration-links.js, fixing the browser module-loading failure that left the interface at Connecting. Restart and refresh; no native rebuild needed.

## Update in 0.14.17 — Auto-refine iteration map links

Finished 3D auto-refine stdout iteration labels open run_itNNN_half1_class001.mrc in a new 3D viewer tab, inheriting the current theme. If an intermediate map was cleaned away, the viewer reports that it cannot load it. Restart and refresh; no native rebuild needed.

## Update in 0.14.16 — Preserve job summaries during refresh

Periodic refresh now includes the same finished-job summaries as initial loading. Restart the server and refresh the browser; no native rebuild needed.

## Update in 0.14.15 — Startup and finished-job summaries

Missing project directories prompt for creation in an interactive terminal (default No); unattended startup exits with instructions. Motion correction patch X/Y defaults are 5. Finished-job rows show input paths, binning, class/particle counts or final resolution when available; hover to read long values. The brand tagline is now “More comfort, fewer mistakes.” Restart and refresh; no native rebuild needed.

## Update in 0.14.14 — Manual picking denoising controls

Low-pass, High-pass and Pixel size are disabled when Topaz denoising is Yes and enabled when it is No. Stored values are preserved. Restart the server and refresh the browser; no native adapter rebuild is needed.

## Update in 0.14.13 — Auto-picking radio controls

Picking method and Topaz Train/Pick now use radio-button groups in I/O. The autopicking and Helix tabs are accessible only in References mode. Existing conditional Topaz fields remain active for the selected train/pick mode. Restart the server and refresh the browser; no native adapter rebuild is needed.

## Update in 0.14.12 — Topaz mode and method tabs

Topaz Train/Pick selectors now appear in I/O immediately below Use Topaz, and are hidden unless Topaz is enabled. They are complementary: selecting one disables the other, and switching one off enables its counterpart. Their existing dependent fields remain in the Topaz tab. Invalid equal-valued Topaz modes normalize to picking when Topaz is enabled.

Only the active method's tab (Laplacian, References or Topaz) is accessible. Inactive tabs remain visible but disabled; loading a job with an incompatible active tab returns to I/O. Common tabs remain available. Restart and refresh; no adapter rebuild is required.

## Update in 0.14.11 — required auto-picking method

New Auto-picking jobs default to LoG=Yes, References=No and Topaz=No. Attempting to set the last enabled method to No restores its Yes value; choose another method by setting it to Yes. An all-No configuration loaded into the editor is repaired to LoG. Existing valid method choices remain unchanged. Restart and refresh; no native adapter rebuild is required.

## Update in 0.14.10 — upstream power-spectrum constraint

For CTF estimation, choosing a registered Motion correction output whose producer has do_save_ps=No sets use_given_ps to No and disables it. An inline hint identifies the producer and explains why. The lookup supports pipeline aliases and absolute project paths, and runs when loading jobs, changing inputs, rendering tabs and submitting. Switching to another input removes this specific restriction without automatically enabling power-spectrum use.

The server also applies the correction before job-editor command preview, run, continuation or scheduling. This checks the direct registered producer, not arbitrary upstream ancestry. Existing STAR-column checks remain available for other cases. Restart the server and refresh; no adapter rebuild is required.

## Update in 0.14.9 — idealized pipeline height

On desktop, the idealized pipeline shares exactly the inspector's grid row. Its contents no longer determine row height: the panel stretches with the inspector while its step list scrolls internally. The inspector remains content-responsive and both panels resize together. On narrow, stacked layouts, the template panel uses a viewport-responsive height limit instead. Refresh after updating; no adapter rebuild is required.

## Update in 0.14.8 — flexible parameter height

Removed the parameter form's fixed 480px maximum. The form now fills remaining editor height, with a viewport-responsive minimum and internal scrolling for excess fields. On desktop, spare workspace height is allocated to the editor row. Headers, tabs and the editor footer remain visible within the editor. Refresh after updating; no native rebuild is needed.

## Update in 0.14.7 — pinned Import mode row

The Import radio-button row now stays at the top of the scrolling parameter panel while the input fields scroll beneath it. Its opaque theme-aware background keeps the choices readable. Refresh the browser after updating; no adapter rebuild is required.

## Update in 0.14.6 — Import radio controls

The two Import modes now share one field row as radio buttons. Exactly one is selected; changing it updates the underlying Yes/No job options and shows the relevant fields. Both help buttons remain available. The choices wrap on narrow screens. Refresh the browser after updating; no adapter rebuild is required.

## Update in 0.14.5 — required Import mode and error locations

Import mode controls are complementary: setting one to No enables the other, and setting one to Yes disables the other. Invalid equal-valued settings loaded into the editor normalize to raw import. Conditional fields continue to show only for the enabled mode.

Recognized native empty-field errors from job-editor submissions now include the field's current tab, e.g. `ERROR: empty field for input STAR file (I/O tab)...`. The tab is resolved from the layout and empty active fields; unknown or ambiguous errors retain their original wording. Restart the server and refresh the browser. No adapter rebuild is required.

## Update in 0.14.4 — unified Import controls

Import now has one Movies/Mics/Others tab. Setting either import mode to Yes sets the other to No. Fields below each mode are visible only when that mode is Yes; both mode selectors stay visible. Hidden field values are retained for switching back. Restart the server and refresh the browser; no native adapter rebuild is required.

## Update in 0.14.3 — local resolution editor

New Local resolution jobs default angpix to -1. ResMap and Relion fields now share a ResMap / RELION tab. Setting either method to Yes immediately sets the other to No and updates dependent field states. Saved jobs retain their stored pixel-size settings. Restart the server and refresh the browser; no native adapter rebuild is required.

## Update in 0.14.2 — helical start/end picking

Manual picking with do_startend=Yes now uses the browser picker. Consecutive clicks define filament endpoint pairs, drawn as diameter circles joined by straight lines. The counter shows completed filaments and prompts for an unfinished endpoint. Right-clicking either endpoint removes the entire pair; Undo remains available. A pending start can also be removed or undone.

Saving and switching require complete, nonzero-length pairs. The server repeats this validation before writing and checks existing coordinates before finishing. Endpoint row ordering matches RELION's start/end convention, and the native job definition supplies the helical coordinate node type. No additional adapter rebuild is required when using the 0.14.0 adapter. Restart the server and refresh the picker tab.

## Update in 0.14.1 — picker startup fix

Renamed the picker's undo history variable to avoid shadowing the browser's history API. This fixes the startup ReferenceError before initialization. Replace the application files and reload the picker tab. No adapter rebuild is needed when already using 0.14.0.

## Update in 0.14.0 — browser manual particle picking

Run Manual picking with a modern micrograph STAR input to create a normal running ManualPick job and open its browser picker. The left panel lists micrographs and shows the selected micrograph's CTF diagnostic. Click the main image to add coordinates, right-click a circle to remove it, or use Undo. The job's diameter, micrograph scale, sigma contrast, black/white values and optics pixel sizes initialize the display. Low/high-pass filters are applied through the installed relion_image_handler; image data is never overwritten.

Save picks stores the current coordinates without finishing the job. Switching micrographs first saves any changes and stays on the current image if saving fails. Save and finish job saves the current image and completes the pipeline job. Closing an unfinished picker leaves it recoverable via Resume browser picking in the Inspector; unsaved changes trigger the browser's leave-page warning. Concurrent saves to the same coordinate file are rejected. Source STAR changes require a new job to avoid associating coordinates with the wrong micrographs.

Coordinates use original micrograph pixels, independent of preview/zoom. RELION's metadata writer publishes per-micrograph coordinate files, the data_coordinate_files mapping in manualpick.star, and micrographs_selected.star including optics. All input micrographs are retained; this version does not provide micrograph exclusion. Previously referenced coordinate files are read for continuing work and edited coordinates are saved within this job. Save processing preserves coordinate, class, psi, FOM and particle-selection-type fields; other specialized coordinate fields are outside this basic picker.

Scope: basic particle picking from STAR files with micrographs/optics tables. Helical start/end, Topaz, FOM thresholds, metadata coloring, wildcard inputs, queue submission and custom extra arguments retain native execution. Scheduled jobs still use the native picker. Previews are limited to 2048 pixels wide and source images to 32 million pixels, so zooming does not restore detail beyond that preview resolution. Filtering runs when each micrograph is loaded. Saves support up to 20000 picks per micrograph, subject to the API request-size limit.

**Rebuild the native adapter**, restart the server and refresh the browser:

```bash
python3 scripts/build_bridge.py /path/to/relion-source --output build
```

If using --bridge or RELION_DELUXE_BRIDGE, point it to the rebuilt executable. Native output tests passed; browser interaction and visual filtering still require workstation verification.

## Update in 0.13.1 — class-average STAR block name

Browser Subset selection now writes class_averages.star with the unnamed `data_` block expected by RELION, instead of `data_model_classes`. The source model still uses its named classes block. Particle and optics output blocks are unchanged.

Rebuild the adapter with `python3 scripts/build_bridge.py /path/to/relion-source --output build`, then restart the server. Existing outputs are not modified automatically; in affected class_averages.star files, replace the standalone `data_model_classes` line with `data_`, or save the selection again after continuing the job.

## Update in 0.13.0 — browser Subset selection jobs

Run a simple interactive Subset selection job to register a normal Select/jobNNN/ process and receive an Open selection gallery link. Click images (or use Enter/Space) to toggle red selection borders. Select page and Clear selection are available. Selection identities survive sorting and paging; draft highlights are stored locally in the browser and restored only when the input revision matches. Running selection jobs offer a Resume browser selection link in the Inspector.

Save selected classes writes selected class metadata and the associated particles using RELION's native metadata reader/writer, preserving the optics table. Micrograph and particle selections write their corresponding subset STAR files. The pipeline is marked successful only after saving; an empty selection is rejected. Changed inputs/settings and saves to finished or aborted jobs are rejected. Closing the gallery or stopping the server leaves an unfinished selection recoverable. Abort uses RELION's aborted-job marker. Existing outputs are replaced when deliberately continuing a previous selection job.

Scope: modern STAR files with optics tables, simple manual 2D class/particle/micrograph selection, at most 20000 selected images per save. Class selection requires an optimiser file. Recentring, regrouping, extra command arguments, queue submission, automated selection, and 3D references retain the native workflow. Scheduling and batch schedulers still launch native interactive selection; browser mode is activated by Run/Continue. Legacy STAR conversion is not implemented. Ordinary gallery tabs remain read-only. This is not full relion_display parity.

**Rebuild the native adapter**, then restart the server and refresh the browser:

```bash
python3 scripts/build_bridge.py /path/to/relion-source --output build
```

If using `--bridge` or `RELION_DELUXE_BRIDGE`, point it at the rebuilt executable. Scientific calculation binaries do not need rebuilding. Native integration tests passed; interactive browser verification remains pending.

## Update in 0.12.2 — CTF and micrograph galleries

Micrograph STAR nodes now open in the browser gallery. For tables containing `rlnCtfImage`, CTF diagnostics are the default display. A Display images selector switches between available CTF diagnostics, power spectra and micrographs; all existing contrast/color/sorting controls remain available. Tables without CTF diagnostics show the available micrographs instead. RELION's `.ctf:mrc` and indexed `:mrcs` references are supported, with the same authenticated read-root checks.

The viewer displays existing referenced images; it does not calculate CTF images. Missing files and unsupported formats remain explicit per-image errors, with the native viewer available as fallback. Existing preview limits apply, including a maximum source image size of 32 million pixels. Restart the server and refresh the browser; no native rebuild is required.

## Update in 0.12.1 — browser PDF reports

PDF nodes open in a new browser tab using the browser's built-in PDF viewer, with a download link as fallback. The page inherits the main GUI theme. PDF bytes are fetched with the existing authenticated API and read-root restrictions; the token stays in the URL fragment until removed by the viewer. Missing or incomplete files show an explanatory error. Browsers configured to download PDFs may require the download link instead of inline display. The complete PDF is buffered in the browser before display.

Restart the server and refresh the browser. No native adapter rebuild is required.

## Update in 0.12.0 — interactive 2D image gallery

Optimiser, class-average and particle STAR nodes open an independent browser gallery. Optimiser files resolve their model STAR file and class reference table. Live controls provide metadata sorting, labels, image size, sigma contrast, brightness, grayscale/heat/blue palettes, inversion and 2D orientations. Image metadata appears on hover. The viewer inherits the main GUI theme when opened.

The authenticated backend reads only the requested MRC/MRCS stack slices and returns display previews up to 512 pixels wide. Signed byte, signed/unsigned 16-bit, float32 and float16 modes are supported, with endian detection. Pages contain 64 images; four requests run at a time. File access respects project/read-root boundaries. STAR metadata is limited to 32 MiB and 200,000 image rows. Paths use RELION's project-relative convention.

This is an initial gallery, not complete relion_display parity: selection/export, Fourier filtering, micrograph picking, 3D projections, non-MRC image formats and specialized displays remain native. The Native viewer button opens the original node on the workstation. Three-dimensional references report that they need the 3D viewer. Orientation uses available psi and origin metadata; Angstrom offsets require a known pixel size and disable the orientation control when it is missing. Preview sampling/interpolation is intended for inspection, not quantitative image processing. No scientific data is modified.

Restart the server and refresh the browser after updating. No native adapter rebuild is required. Interactive browser rendering and orientation appearance still require workstation verification.

## Update in 0.11.4 — collapsible job sections

Running, finished and scheduled section headers now have a [−]/[+] button in place of the status dot. Each section can hide or show its job rows independently. Counts remain visible and collapse state survives automatic refreshes within the page session. Keyboard navigation uses visible rows only. Collapsing does not clear existing selections, which remain included in the selection count and bulk actions.

Refresh the browser after replacing the application files. No native adapter rebuild is required.

## Update in 0.11.3 — bounded pipeline job lists

The concrete pipeline panel is capped at one browser viewport in height. Running, finished and scheduled jobs scroll together inside the panel when necessary, keeping the header, selection instructions and footer outside the scrolling list. The limit follows window resizing and applies at all responsive widths.

Refresh the browser after replacing the application files. No native adapter rebuild is required.

## Update in 0.11.2 — balanced inspector layout

On desktop, the inspector stays in the central editor column. The idealized pipeline occupies the right-hand column beneath the concrete pipeline and stretches to the bottom of the workspace, beside the inspector and footer. Its batch action remains at the bottom. Narrow windows retain the stacked layout; intermediate widths stack the inspector's nodes and logs to keep them readable.

Refresh the browser after replacing the application files. No native adapter rebuild is required.

## Update in 0.11.1 — viewer clipping and themes

The map viewer has a shared two-handle slider for NGL's near and far clipping planes, in scene-relative percent (0–100). The handles update the stage live, support keyboard arrows, and cannot cross. Clipping affects both the map and structure overlays.

A theme dropdown offers Light, Dark, Brazil and France. A newly opened viewer inherits the main GUI theme; subsequent viewer changes are independent. Theme selection updates CSS controls and the viewport background; the background picker still allows a custom color afterward. Restart the server and refresh the browser. No native adapter rebuild is required.

## Update in 0.11.0 — standalone 3D viewer

In the Inspector node list, registered density maps and 3D masks now have an underlined download link and an adjacent ↗ link opening an independent NGL viewer tab. Other node types retain their native viewers. Map downloads preserve the original bytes and require the server token and configured read-root permissions.

The viewer provides absolute-density threshold controls, surface color and transparency, background color, orthographic/perspective cameras and centering. Load multiple local PDB files as independent objects with visibility toggles, removal and cartoon, ribbon, licorice, ball-and-stick, space-fill, backbone, line or molecular-surface representations. PDB files stay in the browser. Coordinates are preserved; structures are not automatically fitted to maps.

The existing preview limits apply: little-endian MRC modes 0 and 2, up to 512 MiB and 128 million voxels. Unsupported maps can still be downloaded. Downloads currently buffer the file in the browser before saving. Scheduled outputs become available once their files exist. The viewer does not poll or reload maps automatically.

Restart the server and refresh the browser. No native adapter rebuild is required.

## Update in 0.10.5 — polishing micrograph validation

Preflight now explicitly inspects Bayesian polishing's `fn_mic` input, which RELION consumes without listing it among preview input nodes. Missing `_rlnMicrographMetadata` produces a warning before submission, with guidance to select the micrographs from RELION Motion correction containing movie metadata. This applies to running, scheduling, batch checks and scheduler startup. Missing outputs from earlier scheduled producers retain the existing deferred-check behavior.

Restart the server and refresh the browser. No native adapter rebuild is required.

## Update in 0.10.4 — auto-picking controls

Selecting Yes for reference, LoG or Topaz auto-picking immediately sets the other two methods to No. The Continue manually? field is hidden for new jobs and ordinary scheduled jobs, and appears for existing jobs being continued, including scheduled continuations. Saved parameters are not rewritten merely by viewing a job.

Restart the server and refresh the browser after updating. No native adapter rebuild is required.

## Update in 0.10.3 — offer to repair MotionCor2 settings

Job-editor Run, Continue, Schedule and Check command requests now detect MotionCor2 with float16 enabled before invoking RELION's command builder. The warning offers to set **Write output in float16?** to **No** and resume the requested action. Cancel preserves the current settings. If **Save sum of power spectra?** is also enabled, the dialog explicitly proposes setting it to No as well, because MotionCor2 rejects that setting too.

Accepted changes appear in the editor and run through normal input/executable and duplicate checks again. Restart the server and refresh the browser after updating. No native adapter rebuild is required. This repair dialog applies to job-editor submissions; existing template batch validation is unchanged.

## Update in 0.10.2 — external engine verification

Before running or scheduling CTF estimation, preflight checks `fn_ctffind_exe`. Motion correction checks `fn_motioncor2_exe` when `do_own_motioncor=No`. Empty settings, missing executables, directories and files lacking execute permission produce an actionable warning in the existing verification dialog. Absolute paths, project-relative paths and executable names on the server's PATH are supported. Executables are inspected without running them.

The shared checks also apply to idealized batch previews and scheduler startup. Queue warnings explain that worker environments may differ from the server. Users can review and explicitly accept these warnings through the existing submission flow. Restart the server and refresh the browser after updating; no native adapter rebuild is required.

## Update in 0.10.1 — portable wildcard input checks

Fixed the batch preview error `fs.glob(...) is not a function or its return value is not async iterable`. Pre-launch input verification now uses a dependency-free matcher based on established filesystem APIs instead of `fs.promises.glob`. It supports `*`, `?`, character classes, brace alternatives and recursive `**`, follows linked movie directories and prevents recursive symlink loops. Missing matches remain warnings; inspection errors are reported as warnings rather than crashing the entire preview.

Replace the application files, restart the server and refresh the browser. No additional native adapter rebuild is needed if already using the 0.10.0 adapter. The documented Node.js requirement remains unchanged.

## Update in 0.10.0 — mask feedback and clone continuations

Capture now recognizes a 3D auto-refine/classification job A whose mask comes from Mask creation B, where B uses a map from A. It unfolds this feedback pair into **A (unmasked) → B (mask) → C (masked continuation)**. C is an ordinary native refinement/classification process with a new number and alias `CloneContJobNNN` (NNN identifies A). Later consumers of A's results are redirected to C; B continues to use A.

C reads A's optimiser checkpoint directly and writes under its own `--o C/run`. Large result files need neither copying nor symlinking. A's results are retained and registered as dependencies. The saved continuation flag survives scheduling, computing-default updates, native scheduler execution, and recapture. The editor identifies a Scheduled continuation, and the template step editor has a checkpoint control.

The checkpoint comes from A's saved self-continuation, or from an iteration-specific map selected by B. The unmasked classification stage ends at that iteration, and C's total iterations must exceed it. If the checkpoint cannot be inferred, the capture remains an editable draft with a precise message: supply `captureCheckpoint: "run_itNNN_optimiser.star"` on A in Edit JSON and validate. General cycles are still rejected. Review the first-phase settings and the exact checkpoint for a new dataset, especially for auto-refinement where convergence iteration can change. Saved final settings cannot recover all historical settings automatically.

**Rebuild the native adapter for this release**, then restart the server and reload the browser:

```bash
python3 scripts/build_bridge.py /path/to/relion-source --output build
```

This rebuilds only the small pipeline adapter, not RELION's reconstruction programs. If using `--bridge` or `RELION_DELUXE_BRIDGE`, point it to the rebuilt executable. Details and limitations are in [idealized pipelines](docs/IDEALIZED-PIPELINES.md).

## Update in 0.9.1 — capture only active inputs

Idealized pipeline capture now clears conditionally disabled file inputs before generating bindings or dependency edges. For example, `fn_in_other` is empty when `do_other=No`, and `qsubscript` is empty when `do_queue=No`. Nested field conditions and schema defaults are respected. A binding shared with an enabled field in another step is retained. Continuation edit locks do not discard required scientific inputs.

Re-capture to apply this cleanup to an existing template. Previously exported JSON and concrete job settings are unchanged. No native bridge rebuild is required.

## Update in 0.9.0 — idealized pipelines

The right-hand column now has an **Idealized pipeline** panel beneath the concrete pipeline. It represents a reusable, acyclic recipe rather than execution history.

1. Select successful or scheduled concrete jobs and click **Capture**. With no selection, Capture takes all successful jobs. It reads each saved job's parameters; failed/running/aborted selections are rejected. Inspect the capture warnings before accepting the draft.
2. Review **External inputs** and click a symbolic step to edit its parameters. References such as `${jobN}particles.star` connect steps; `${input:input1}` binds a project-specific input. **Edit JSON…** also lets you remove/add steps and rewire dependencies. Validate to reject cycles or unresolved references. Steps are ordered and renumbered symbolically in dependency order.
3. **Export** saves a self-contained versioned JSON recipe. **Import…** loads that format, including its parameters and editable input defaults. The browser remembers the current draft per project; export for durable sharing or use on another browser/workstation.
4. **Preview batch scheduling…** shows real destinations, native command previews and verification/duplicate warnings. Confirm to register Scheduled jobs through RELION. Start them using the existing **Run scheduled…** action.

Current project workstation/cluster defaults override the recipe's computing fields when instantiated. Scientific parameters remain those of the template. No old concrete jobs are deleted or modified, and no scientific execution starts during capture, preview or batch scheduling. No native bridge rebuild is required for this release.

A concrete `default_pipeline.star` alone does **not** contain the job parameters. To capture a reproducible recipe, open the full project with its per-job `job.star` files. This release imports/exports idealized JSON; it does not import an arbitrary concrete STAR into the current project. See [idealized pipeline details](docs/IDEALIZED-PIPELINES.md) for the attached-file analysis and practical limits.

## Update in 0.8.1 — keyboard selection and France

With focus in the pipeline job list, Up/Down selects the previous/next visible job, and Shift+Up/Down extends or shrinks the range. Home/End jumps to the first/last job; Shift also works with these keys. Ctrl/Cmd+Up/Down moves focus without changing the selection. Keyboard focus survives automatic refreshes without stealing focus from editor fields.

France adds blue, white and red styling. Samba is now named Brazil; existing saved Samba preferences migrate automatically. Both themes update the 3D viewer background.

## Update in 0.8.0 — input verification and Samba

Run, Schedule and Continue now check inputs before registration/launch; Check command includes the report. Starting the GUI batch scheduler also checks its selected jobs. Warnings open an **Input verification** dialog with **Cancel** and **Proceed anyway**. Confirmation is tied to the current parameters/report and composes with the existing duplicate-job warning.

Checks use the native command builder's active input nodes, plus enabled ordinary file options. They warn about missing files, unmatched input patterns, inaccessible paths, and producer jobMMM numbers larger than the consumer jobNNN number, even if the file already exists. A missing output from an earlier Scheduled/Running job is **pending** when scheduling, or when its producer precedes the consumer in the selected scheduler batch. A direct Run with missing inputs warns instead. Failed producers are not considered pending. Paths using pipeline aliases are resolved for these comparisons.

Existing STAR files are inspected using RELION's native metadata reader. Column profiles cover particle/movie/micrograph identity, modern optics metadata, 2D reference alternatives, coordinate-list inputs, continuation checkpoint links, body definitions, postprocess references/FSC, MTF tables, prediction alignments for CTF refinement and polishing, polishing motion metadata, subtraction reversion, and selected conditional CTF fields. Fresh classification does not incorrectly require pre-existing orientations. CTF parameters that RELION can default are warnings rather than hard errors. Missing image stacks and other principal files referenced in inspected STAR blocks are also reported (up to 100 names per block, with a total count).

**Scope:** this is not a complete scientific validator for every option/external package. Unprofiled inputs receive a syntax check and an information notice; legacy conversion, optics-group joins, image geometry, all per-row numeric values and recursive nested STAR contents are not comprehensively validated. Input patterns are checked for at least one match, not for the validity of every matched file. Files that do not yet exist cannot have their columns checked: they remain pending. Verification is repeated on later GUI submission/scheduler startup, but an already-running stock RELION scheduler is not intercepted between jobs; RELION's runtime validation remains responsible for newly produced files at that point. Existing batch repetitions and jobs launched outside this GUI are not intercepted.

**Samba 🇧🇷** joins Light and Dark in the theme selector: yellow header, green accents, pale yellow/green panels, and a matching NGL background. Theme preference is remembered in the browser.

**Rebuild the native adapter**, then restart the server and refresh:

```bash
python3 scripts/build_bridge.py relion-source --output build
```

## Update in 0.7.0 — re-schedule+N

Select one or more **Scheduled** rows, choose **Job actions → re-schedule+N…**, enter a positive integer offset, and preview the changes. Confirming creates new scheduled jobs at exactly the old number plus N. All replacement jobs are registered through RELION before the originals are moved to Trash together. No calculations start. Use the normal scheduler afterward. Trash / Undelete can restore the original group.

Input references within the selected batch move to the corresponding new jobs. An external dependency moves to its +N counterpart only if that counterpart already exists, is the same native job type, and has succeeded. Other shared inputs remain unchanged. A failed/aborted dependency without a successful replacement blocks the operation. The preview lists every changed option so replacement choices can be reviewed. Parameters are copied from the original job settings, without applying newer global computing defaults. Continuation flags are retained. New jobs have canonical names and no aliases; original aliases remain in the Trash metadata.

For the supplied example, select jobs025–033 and enter **10**: jobs035–043 are created, with job035 using `CtfRefine/job034/particles_ctf_refine.star`. Shared references such as `MaskCreate/job020/mask.mrc` stay unchanged. The counter advances to 44.

The operation refuses destination collisions, numbers below the current pipeline counter, an active scheduler marker, changed settings after preview, and unselected running/scheduled dependents. Historical dependencies from finished/failed jobs are retained as pipeline nodes without an active producer when originals move to Trash. This accommodates the supplied failed job024's incorrect reference to job031 without changing job024's history.

Copying is staged, not an all-or-nothing filesystem transaction. If a copy fails, originals remain in place and the error lists replacements already created. Inspect/remove those partial copies before retrying. If the Trash step encounters a filesystem error, inspect both pipeline and Trash before retrying. The action never overwrites an existing job directory.

**Rebuild the native adapter** before using this release:

```bash
python3 scripts/build_bridge.py relion-source --output build
```

Then restart the server and refresh the browser. This builds only the small metadata/pipeline bridge, not RELION's reconstruction programs.

## Update in 0.6.3 — jobs survive backend terminal shutdown

The native bridge now starts in a separate process session. Previously, RELION put its commands in the background but they could remain in the backend terminal's process group. Ctrl+C or closing that terminal could therefore signal running jobs as well as the server. The former startup message overstated the protection. Detaching the bridge prevents that terminal-group signal propagation, while preserving normal bridge result/error handling and RELION's job logs and abort controls.

This protects newly launched native jobs; it does not move already running jobs into a different session. A system shutdown, container removal, or a service manager explicitly killing all descendants can still terminate calculations. Stop jobs deliberately through the normal Abort action when needed.

**New job** and every **Job Types** click clear **Continue from here** (`fn_cont`) in the new form while retaining the other configured parameters. Loading an existing job still restores its saved continuation value.

Restart the server and refresh the browser. No native adapter rebuild is needed.

## Update in 0.6.2 — duplicate job alerts

Before Run, Schedule or Continue, the server previews the commands and checks other same-type pipeline jobs for matching recorded execution commands and saved parameters. RELION 5.0.1 writes execution history to `note.txt`; `notes.txt` is also accepted. Each job's own output directory is normalized so a different job number does not hide an otherwise identical command. Input job numbers, quoted argument whitespace, MPI/thread counts and queue settings are preserved when comparing. No command is executed by the check.

A match displays the existing job names and statuses. Cancel returns to editing; Run/Schedule anyway confirms the repeat. Confirmation is bound to the checked parameters and match list; changes trigger another alert. GUI scheduler startup checks scheduled jobs before launching. The current job is excluded from its own continuation check. Jobs need recorded execution history, so scheduled-only jobs are not reported as previously executed.

The helical add-on records an External wrapper rather than the engine preview: its duplicate check compares all saved input/engine parameters plus presence of execution history. Comparisons use the current saved job settings, not historical snapshots of settings from every previous continuation. Deleted pipeline entries and missing/edited execution records cannot be reliably matched. This is a conservative exact-match check, not a semantic comparison of differently spelled paths, reordered equivalent arguments, or changed file contents. Jobs submitted outside RelionDeLuxe are not intercepted. Demo mode does not simulate command-history matches.

Restart the server and refresh the browser; no native adapter rebuild is needed.

## Update in 0.6.1 — viewport layout and camera

The editor footer sits at the bottom of its worktop column. Binarisation removes the old parameter-panel height cap and lets the viewport expand into available space. NGL now uses an orthographic camera, recenters after the initial isosurface and each threshold rebuild completes, and updates its background immediately when switching Light/Dark themes. The manual Centre map button remains available. Restart and refresh; no native rebuild is needed.

## Update in 0.6.0 — interactive mask binarisation preview

**Mask creation** now has **Binarisation** between **I/O** and **Mask**. Initial binarisation threshold (`inimask_threshold`) moves into this tab. A locally bundled NGL 2.5.0 viewport displays the selected Input 3D map as an isosurface, with rotate, zoom and Centre map controls. The slider and numeric field update the same saved job value. Isosurfaces use absolute map density, not sigma units; updates are debounced by 100 ms while dragging. The slider range comes from the map density and expands if you type a value outside it.

This displays the original input volume, not RELION's low-pass-filtered map or the final extended/soft-edged mask. The Mask tab's filtering, extension and edge settings still apply when RELION runs. No scientific binaries run during preview and no input data are changed. The viewer is disposed when leaving the tab; pending requests are cancelled.

Preview supports uncompressed little-endian MRC/MAP files in modes 0 (signed byte) and 2 (float32), up to 512 MiB and 128 million voxels. Unsupported maps can still be submitted to RELION; preview displays an explanation. WebGL support is required. The full map is loaded into browser memory and large maps may be slow. Files are streamed through the authenticated API and must reside within the project or configured `--read-root` directories. No external CDN or map upload is used. NGL's MIT license is included in `public/vendor/NGL-LICENSE.txt`.

Restart the server and refresh the browser. No native adapter rebuild is needed. Automated map-access and threshold-control tests pass; WebGL rendering could not be verified because Chromium crashes at startup in the development environment.

## Update in 0.5.6 — disabled computing fields

Disabled queue fields in Workstation / cluster defaults now use the same muted labels, faded inputs and background as Running-tab fields. Switching Submit to queue between No and Yes updates this styling automatically. Restart the server and refresh the browser; no native rebuild is needed.

## Update in 0.5.5 — computing settings for runs and continuations

**Workstation / cluster defaults** now uses a Yes/No **Submit to queue?** selector without per-field checkboxes. Yes enables Queue name, Queue submit command, Standard submission script and Minimum dedicated cores per node; No disables them while retaining their values. Threads and MPI processes remain editable.

Saving applies all seven computing settings to the current form and all drafts, including a selected existing job. When reopening an older saved job, the newer project settings replace its supported Running fields. Edits subsequently made in that job's Running tab take precedence when it is submitted; those saved job settings remain effective until a later global save. Other job parameters are preserved. Persistence compares the project settings and job.star modification times, including after restart.

Historical job.star files are not rewritten simply by viewing them. Effective settings are written by RELION when running, continuing or scheduling. Starting scheduled jobs through this GUI applies newer project settings before handing them to the native scheduler. Already running jobs/schedulers, or schedulers started outside this GUI, are not reconfigured. A stale browser submission is rejected with instructions to refresh and review the settings.

Project settings persist in `.reliondeluxe/execution-defaults.json`. Read-only mode allows viewing only; demo settings last for the server session. The helical add-on inherits threads, the computing field it supports. No GPU-specific options are changed by these seven settings.

Restart the server and refresh the browser. No native adapter rebuild is required.

## Update in 0.5.3 — helical Running tab

The helical-reference add-on now has a Running tab containing Number of threads and Additional arguments. Extra arguments are appended to the reconstruction command, shown in Check command, and retained when saving, scheduling and reopening jobs. Use single quotes for arguments containing spaces. Restart the server and refresh the browser; no native adapter rebuild is needed from 0.5.1 or 0.5.2.

## Update in 0.5.2 — optional LAN access

Use `--host 0.0.0.0` to accept connections from your LAN. Startup prints token URLs for the workstation’s IPv4 addresses. Localhost remains the default; token authentication and Host/Origin checks remain enforced. This update needs only a server restart, with no native adapter rebuild from 0.5.1.

## Update in 0.5.1 — reference and mask defaults

New **3D classification** and **3D auto-refine** forms default **Resize reference if needed?** to **No**. Saved job settings remain unchanged.

For a new **2D classification**, **3D classification** or **3D auto-refine** form, choosing or typing Input images STAR file triggers a search through its particle dependencies to the nearest Particle extraction job. RELION's native STAR reader reads `_rlnImagePixelSize` and `_rlnImageSize` from that extraction output's `particles.star` optics table. The default **Mask diameter (A)** is `pixel-size × (box-size − 4)`, e.g. `1.276 × (256 − 4) = 321.552 A`. This uses the actual extracted/rescaled output dimensions. A note beside the diameter identifies the source file.

Selection and classification steps are traversed; a nearer re-extraction takes precedence. Non-particle dependencies such as references and masks are not followed. Equally close extraction jobs and multiple optics groups must agree on the calculated diameter; missing/invalid dimensions or conflicting values leave the current diameter unchanged with an explanation. There is no guessed conversion from extraction job parameters or the current input file.

Manual diameter edits are retained for the current input; choosing a different input enables recalculation. Loading an existing job preserves its saved diameter. Run, Schedule and Check command wait for a pending default calculation before submitting.

**Rebuild the adapter** with `python3 scripts/build_bridge.py relion-source --output build`, then restart the server and refresh the browser. The new adapter action reads optics metadata without running any scientific calculation.

## Update in 0.5.0 — 3D initial helical reference

The unnumbered **3D initial helical reference** entry appears immediately after **3D initial reference**. Its I/O tab contains Input images STAR file, Pixel size (A), Mask diameter (A), and Crossover_distance (A). The Running tab contains Number of threads and Additional arguments. The input picker uses registered 2D class-average STAR nodes, including Subset selection's `class_averages.star`. Positive numeric values and integer thread counts are required.

**Rebuild the native adapter** using `python3 scripts/build_bridge.py relion-source --output build`, then restart and refresh. Keep the application installed at a stable absolute path: saved External jobs refer to its launcher script. Node.js and `relion_helix_inimodel2d` must be available in the execution environment.

The add-on uses RELION's supported **External** job type internally. The normal pipeline counter allocates `InitialModelHelical/jobNNN/`; input dependencies, the 3D output node, statuses, aliases, logs, scheduling, abort and Trash/undelete belong to `default_pipeline.star`. There is no independent job registry or modification of the reconstruction binary. The original GUI will see it as an External job. Saved jobs can be executed by the stock pipeline scheduler.

For the example values, the scientific command is:

```bash
relion_helix_inimodel2d --i Select/job017/class_averages.star \
  --angpix 1.276 --mask_diameter 190 --j 12 --crossover_distance 11.5 \
  --o InitialModelHelical/job018/initial_model --iter 1 --sym 1 \
  --pipeline_control InitialModelHelical/job018/
```

The binary is resolved from PATH. The stray `/ini` in the proposed command is omitted: there is no such option in the upstream parser. The final map is `initial_model_class001_rec3d.mrc`; it is registered as a density-map node for downstream selection. The program also writes intermediate STAR and image files in the same job directory.

`--pipeline_control` is supported by the upstream parser and writes RELION completion markers. The program itself does not poll for abort requests, so the launcher observes the job's abort marker and terminates only its own child process group, then reports Aborted. Startup or executable failures report Failed. Completed jobs offer **Run again**, which reruns with current settings in the same directory; this is not iterative checkpoint continuation. The single-tab job runs locally with CPU threads, without MPI or queue options. It can be scheduled and run through the existing batch scheduler.

The executable expects a suitable STAR table with `rlnImageName` or `rlnReferenceImage` and square 2D input images. Node-category filtering is not full scientific validation. This release verifies orchestration with a fixture executable; it has not computed a real helical reference in this environment.

## Update in 0.4.4

The inspector now loads the entire log file, without the 128 KiB tail restriction or truncation notice. Scrolling upward keeps your scroll position during refresh; the viewer follows new output when you are already at the bottom. Terminal-style progress updates remain supported.

The logs column stretches to the height of the adjacent inputs/outputs column and scrolls internally. It retains a minimum usable height when there are few nodes; on narrow screens the sections stack. No adapter rebuild is needed from 0.4.x.

## Update in 0.4.3

For an existing 2D/3D classification job that has completed successfully, the I/O tab repeats the iteration field directly below **Continue from here**. It edits the same value as Optimisation: `nr_iter_em` for 2D and `nr_iter` for 3D. There is no additional command-line parameter or independent copy of the value.

The Sampling and Helix tabs show small **÷2** buttons inside the applicable `psi_sampling`, `offset_step`, `offset_range`, `sigma_angles`, `range_tilt` and `range_psi` fields. Each click halves the current numeric value; disabled-field rules still apply, including EM/VDAM and helical options. Controls are hidden for new, scheduled and running jobs.

Eligibility uses RELION's Succeeded status, not a new scientific convergence test. Successful jobs observed by this browser are remembered locally per project, so the controls remain available after a later failed/aborted continuation. A historical success never observed by this browser cannot be inferred from a currently failed job. No native adapter rebuild is needed from 0.4.x.

## Update in 0.4.2

Viewer launches no longer open HTML dialogs. Launch messages, immediate failures and the viewer log path are printed to the terminal running `npm start`. Viewer processes and their log files work as before; later failures remain in those logs.

**Continue from here** now lists existing optimiser checkpoints only from active pipeline jobs with the same job type as the form being prepared. Search by filename or alias; earlier iteration checkpoints are included even when absent from the registered output-node list. Unregistered job directories, Trash and symbolic-link shortcuts are excluded. This filters the picker; manually entered paths remain available and file contents are not scientifically validated.

Replace application files, restart the server and refresh the browser. No native adapter rebuild is needed from 0.4.0 or 0.4.1.

## Update in 0.4.1

Multi-job deletion now uses **Job actions → Move to Trash**, replacing the separate Delete selected button. The menu shows the count when multiple rows are highlighted. **Delete with downstream jobs…** also uses the highlighted selection. If no rows are highlighted, these actions use the inspected job. Other menu actions still apply to the inspected job. Every deletion still requires a scope preview and confirmation.

Particle extraction’s **Input coordinates** picker now accepts registered legacy `coords_suffix` descriptors, including `Import/job012/coords_suffix.box`, alongside coordinate-list STAR files. RELION’s extraction command already supports these descriptors, but its original picker pattern hides non-STAR extensions. Only this coordinate-input filter is widened; micrograph inputs retain their own type filter.

From 0.4.0, replace the application files, restart the server and refresh the browser. No adapter rebuild is needed. From 0.3.x, rebuild the adapter as described below.

## Update in 0.4.0

Select jobs with a click, Ctrl-click (Cmd-click on macOS) to toggle individual rows, or Shift-click to select a range in displayed order across sections. Ctrl/Cmd+Shift-click adds a range. Selected rows are highlighted; the outlined row is the job open in the editor. Selections survive automatic refresh; removed jobs drop out of the selection.

Choose **Job actions → Move to Trash**, or **Delete with downstream jobs…** to include downstream jobs, then preview and confirm the complete affected set. Without recursion, selected parents and their selected dependents can be deleted together, but unselected dependents block the operation. Running jobs and existing Trash copies also block it. Overlapping selections are deduplicated. RELION writes one deletion manifest for the whole batch so **Trash / Undelete** restores it as a group. The existing one-writer-per-project and non-atomic filesystem-move limitations still apply.

**Rebuild the native adapter for 0.4.0** using `python3 scripts/build_bridge.py relion-source --output build`, then restart the server and refresh the browser. Batch operations require the updated adapter.

## Update in 0.3.5

Use **Pause auto-refresh** beside Refresh to stop background polling and DOM changes while inspecting the page. Responses from a background request already in flight are ignored after pausing. Manual Refresh and explicit job actions still work. **Resume auto-refresh** restores polling. The preference persists across reloads in the same browser tab; running RELION calculations continue independently. No adapter rebuild is needed from 0.3.x.

## Update in 0.3.4

Clicking a STAR input/output node now launches `relion_display --gui --i <file>` in the project directory, using the installed binary on PATH. Images retain direct display and PDFs use the desktop PDF handler. Viewer startup is observed briefly; immediate failures show captured diagnostics in a persistent dialog, along with the log path. Windows open on the server workstation desktop, using the server’s inherited display environment. Later failures remain in that log. No adapter rebuild is needed from 0.3.x.

## Update in 0.3.3

Stdout and stderr now render carriage-return progress updates in place, including RELION’s mouse-and-cheese progress indicator. Backspace, tabs and common ANSI line-erasure/horizontal-cursor controls are handled; ANSI styling is stripped. Original log files remain untouched. The viewer refresh interval remains five seconds; this is a plain-text log viewer, not a full terminal emulator. Notes and submission scripts remain literal text. Replace application files, restart the server and refresh the browser; no adapter rebuild is needed from 0.3.x.

## Update in 0.3.2

The left-hand job-type buttons now preserve the active tab when that tab exists in the selected type. Otherwise, the first available tab opens. For example, the Running tab stays selected when moving between job types. Replace the application files and restart the server; no adapter rebuild is needed from 0.3.0 or 0.3.1.

## Update in 0.3.1

Switching between existing jobs of the same type preserves the active parameter tab, making comparisons easier. Switching to a different job type opens its first tab. If a tab is unavailable, the editor falls back to the first available tab. This update requires only replacing the web application files and restarting the server; an adapter built for 0.3.0 does not need rebuilding.

## Try the interface

Requires Node.js 22 or newer. No npm dependencies or frontend build are needed.

```bash
cd RelionDeLuxe
npm run demo
```

Open the token URL printed in the terminal. All example jobs, logs and transitions are explicitly simulated; no calculations or project writes occur. Demo state resets when the server restarts. Theme choice persists in the browser.

## Run on a RELION workstation

This release targets the official `ver5.0` source revision `210f68c865b28e6806c6b721f1a6ed3374c788d2` (RELION 5.0.1). Use a compatible installed RELION 5.0.1 distribution and its normal environment. Other versions have not been verified.

You need Node.js 22+, Python 3, Git and a Linux C++ compiler (`g++`). The lightweight bridge build does **not** require FLTK, CUDA or FFTW and does not rebuild the reconstruction engines.

```bash
# Run from the RelionDeLuxe directory.
git clone --branch ver5.0 https://github.com/3dem/relion.git relion-source
git -C relion-source checkout 210f68c865b28e6806c6b721f1a6ed3374c788d2
python3 scripts/build_bridge.py relion-source --output build

# Activate the same shell/conda/module environment you use for RELION.
# Use an existing project, or create an empty directory first.
npm start -- --project /absolute/path/to/project
```

Native startup finds `relion_deluxe_bridge` in this order: `--bridge`, the `RELION_DELUXE_BRIDGE` environment variable, `PATH`, then `build/relion_deluxe_bridge` beside this package. Rebuild the adapter for 0.5.1: this release adds native optics-metadata reading. It is a small pipeline helper, not a replacement for the installed RELION calculation programs.

The original RELION command builders launch `relion_import`, `relion_refine`, MPI variants and other programs using the inherited system `PATH`. You do not need to enter their installation directory in the GUI. The **Executables** button shows resolved paths; **Check command** shows the specific commands and resolution for a selected job. A missing local executable blocks immediate Run/Continue before job registration. Schedule remains possible before dependencies are installed. Queue jobs check the local submission command; worker executables are reported as deferred because the queue environment may differ. External tools such as CTFFIND, MotionCor2 and their wrapper-specific options still use RELION's normal settings/environment variables.

For an empty project directory, the UI offers explicit initialization. For existing projects, it reads `default_pipeline.star`. Start with a copy of the official tutorial project while assessing compatibility.

The server defaults to `127.0.0.1`. For LAN access, run `npm start -- --project /path/to/project --host 0.0.0.0` and open the printed URL containing the workstation’s LAN IP on the other computer. Alternatively, use `--host 192.168.1.50` (replace with your workstation’s IP) to bind only that interface. If required, allow the chosen TCP port through the workstation firewall. Use a trusted LAN: HTTP does not encrypt the token or traffic. Native graphical viewers still open on the workstation running RELION, not on the remote browser. Open the printed token URL; keep it private. The process inherits your PATH, RELION environment variables, MPI configuration, queue settings, display environment and Python environment. Do not expose it as a public or multi-user service. The official RELION command builders intentionally support executable paths, additional arguments and queue commands.

Optional arguments:

| Argument | Purpose |
|---|---|
| `--port 4310` | Change the web port |
| `--host 0.0.0.0` | Accept LAN connections on all IPv4 interfaces; default `127.0.0.1`. A specific local IPv4 address is also accepted. |
| `--readonly` | Inspect a project without job mutations or native viewer launches |
| `--read-root /data/movies` | Permit browsing an external data directory reached through a project symlink; repeat for multiple roots |
| `--pipeliner /path/relion_pipeliner` | Override the binary used for batch scheduling |

Input paths and wildcards can be typed directly. Browser browsing is server-side, not an upload dialog. External movie symlinks should follow RELION's normal project conventions. `--read-root` controls browser file access; it is not an execution sandbox around RELION.

Closing the browser or stopping Node.js does not terminate already launched RELION calculations or schedulers. Abort uses RELION's cooperative abort marker; scheduler cancellation and queue-allocation cancellation are separate operations. In this initial release, use one active writer per project during evaluation rather than editing it concurrently from FLTK and RelionDeLuxe.

## Included

- All 22 official SPA job types, 657 default option definitions, original help, choices and tab ordering, plus the five-field helical-reference add-on.
- Native mode obtains definitions and environment-dependent defaults from the compiled RELION adapter; the bundled snapshot is only for demo mode.
- Source-derived boolean group enablement and new/continue field activation rules. Queue controls are forced off for Import, Manual picking and Subset selection, matching FLTK.
- New jobs, native command preview, direct execution, scheduling, continuation, and running scheduled jobs in place.
- Batch scheduler with repetitions, interval and initial delay, delegated to `relion_pipeliner`.
- Running, finished, failed, aborted and scheduled states; five-second refresh through RELION's completion checks.
- Job aliases, notes, input/output nodes, complete stdout/stderr logs and submission scripts.
- Native abort, force-success/failure, gentle/harsh cleanup, recursive downstream deletion and undelete of job groups.
- Local native display handoff (`relion_display` / `xdg-open`); picking jobs remain the original tools.
- Light and dark themes; responsive layout and keyboard-accessible labeled controls.
- Basic server-side field type validation, origin/token checks, path containment for file browsing and duplicate-request suppression.

## Choosing input files

The browse button beside a pipeline input shows matching registered files for that specific field, with searchable filenames and job aliases. Selecting an entry inserts its canonical job path. Outputs not yet produced by scheduled/running jobs are labeled **Expected output**; they remain selectable for scheduling downstream jobs. Missing outputs from finished jobs and stale registrations are excluded.

Internally, the server uses RELION's `.Nodes` subtree and the option's original node type, subtype depth and filename pattern, then resolves aliases through the active pipeline. The internal index paths never appear in the chooser. Raw movies, gain references, executables and other ordinary file fields use a filesystem picker filtered by their original file patterns. Direct path entry remains available.

This follows RELION's registered input categories; it is **not a complete STAR-column or scientific-validity check**. It does not parse particle rows or invent stricter column requirements. A registered file can still be damaged, and a valid external dataset may need Import before appearing in the project input list. More detailed, job-dependent STAR validation can be added separately.

## Recursive deletion and undelete

Select a job and choose **Job actions → Delete with downstream jobs…**. RELION determines the complete downstream set. The confirmation lists every affected job and status; nothing is deleted until you confirm. **Move to Trash** remains available for a job without downstream dependents.

Use the top-bar **Trash / Undelete** button to select a deletion group. Its `deleted_pipeline.star` describes the jobs restored together, including groups deleted in the original FLTK GUI. The preview lists the complete restore scope. On confirmation, RELION moves directories back, restores pipeline records and aliases, and RelionDeLuxe reattaches preserved input edges through RELION's API. Job settings, notes and output files travel with their directories.

- Running descendants block deletion of the whole set; stop them first.
- Existing Trash copies are never overwritten. Existing restore destinations or aliases also block restoration.
- Missing/symlinked directories and unsupported job paths block the operation. Tomography groups require the --tomo server mode (supported from 0.15.0).
- If an upstream producer was deleted separately, restore that producer first.
- Confirmation expires after two minutes and is rejected if the displayed job scope or statuses change.
- Keep one active writer per project while deleting/restoring; do not mutate the same project concurrently from another GUI or scheduler. Multi-directory moves inherit RELION's filesystem behavior and are not an atomic filesystem transaction. If a native move fails, the UI reports it; inspect the project before retrying.

## Known gaps

Read [docs/ANALYSIS.md](docs/ANALYSIS.md) for the architecture, tutorial mapping and full coverage matrix.

Full FLTK parity is **not claimed**. Overwrite mode, Schemes, concrete pipeline import/export, alphabetical job sorting, custom named pipelines, specialized display option dialogs, browser-native particle picking/class selection and embedded MRC/volume viewing remain unimplemented. Native display handoff is generic and does not reproduce all of FLTK's node-specific display arguments. Related X/Y/Z fields use individual labeled rows rather than compact shared rows.

All numeric text is validated as finite, but the old slider bounds are intentionally not enforced as scientific validity limits. A value containing both kinds of quote, or a newline, is rejected by the initial STAR writer. Expert strings are otherwise passed to RELION. The frontend's inferred activation rules need further comparison against FLTK, especially deeply nested groups. There is no comprehensive new cross-field or cross-job preflight layer yet: RELION's command-generation errors are surfaced as-is.

The compiled bridge uses RELION's own locking and status semantics. A successful submission means RELION accepted the job, not that its executable completed successfully. Missing executables or queue issues can still require reading the raw logs. Do not remove a RELION lock automatically after an error; inspect it using the usual RELION recovery procedure.

## Tests

```bash
npm test
# Also run the native integration test against the bridge:
RELION_DELUXE_BRIDGE="$PWD/build/relion_deluxe_bridge" npm test
```

The native test creates a temporary project and uses a tiny external test executable. It checks RELION's actual pipeline control without doing cryo-EM processing. The thirty test cases cover metadata, STAR serialization, field validation, filesystem boundaries, authenticated HTTP behavior, idempotency and native lifecycle operations, PATH execution, recursive deletion and restoration, and typed input selection.

Optional UI checks require Playwright installed in your development environment:

```bash
node test/browser.mjs
# CHROMIUM_PATH can point to a locally installed Chromium executable.
```

The browser test visits every job type and tab, tests simulated schedule/run, checks theme persistence, migration from gray, and recursive deletion/restore dialogs and captures both themes. See [docs/VALIDATION.md](docs/VALIDATION.md) for the actual verification record and the workstation acceptance checklist.

## Development

- `public/app.js`, `style.css`, `index.html`: schema-driven browser console; no scientific algorithms.
- `server.mjs`: authenticated local HTTP API and job/file/viewer endpoints.
- `lib/native.mjs`: serialized adapter invocation and temporary settings files.
- `native/deluxe_bridge.cpp`: thin calls to official `RelionJob` and `PipeLine`.
- `scripts/build_bridge.py`: compile only the original metadata/pipeline sources needed by the adapter.
- `scripts/extract_catalog.py`: reproducibly evaluate upstream C++ initializers and extract GUI layout metadata. It needs the matching source checkout and `g++`.
- `scripts/install_bridge.py`: optional alternative for adding the adapter to an existing RELION CMake build. The lightweight build above does not alter the source checkout.

A frontend framework can replace the view layer later without changing the native adapter or scientific execution boundary. The first version uses browser ES modules and a schema-driven renderer to keep workstation installation simple.

## License and attribution

GPL-2.0-or-later. See [LICENSE](LICENSE) and [NOTICE](NOTICE). RELION-derived labels, defaults and help retain their original provenance. RelionDeLuxe is an independent add-on and is not endorsed by the RELION developers. Continue citing RELION and the applicable methods as instructed by the official project.

### 0.14.37 — Topaz model reminders

Automatic manual-input reminders now recognize `model_epoch<N>.sav` files from upstream Topaz-training steps, including previously saved generic reminders. Custom instructions and manual resized-map reminders are retained. Import or Validate and save existing templates again. No native adapter rebuild is needed.

### 0.14.38 — Atomic model viewer

CIF/mmCIF nodes now offer download and new-tab 3D viewer actions. The viewer supports atomic models without a map, using the existing structure representation, visibility, theme and camera controls. Local structure loading also accepts mmCIF. Scheduled/running outputs remain inactive. Restart and refresh; no adapter rebuild needed.

### 0.14.39 — Minimal mmCIF compatibility

Fix NGL getField errors when an atomic model lacks optional chem_comp metadata. The parser now skips this absent table. Restart and hard-refresh the viewer tab. No native adapter rebuild needed.

### 0.14.40 — Workstation defaults

Queue fields hide when queue submission is No. One gpu_ids setting serves real jobs and template batches; legacy globalGpu_ids migrates when gpu_ids is absent. If both exist, gpu_ids wins (including an empty value). Requested site-specific executable paths and GPU Yes/automatic defaults apply to unset settings; saved overrides remain. Nonempty executable paths are checked on Save. No adapter rebuild required.

### 0.14.41 — Path warnings and dialog save access

Executable defaults and new-job file inputs check edited paths on change. Missing/inaccessible paths show an inline warning and offer to restore the previous verified path, when available. Empty values, wildcard patterns and pending-job paths defer to existing launch checks. Restore rechecks the old path. A duplicate Save project defaults button appears in the sticky dialog header when scrolling is needed. No adapter rebuild required.

### 0.14.42 — Dialog and warning presentation

Top Save uses the standard primary button styling in every theme. Path warnings float above their fields without occupying grid space and can be dismissed. Initially empty paths can be restored to empty after an invalid edit. Restart and refresh; no adapter rebuild required.

### 0.14.43 — Unclipped path warnings and queue templates

Path warnings use the browser popover top layer, bounded to the viewport, and dismiss on scrolling/resizing. Queue submission templates now receive edit-time path warnings. When queue submission is enabled, saving a nonempty qsubscript requires a readable regular file, not executable permission. No adapter rebuild required.

### 0.14.44 — Import wildcard counts

Import wildcard edits show a floating matching-file count after committing the change. Raw movie/micrograph patterns are supported; other-node patterns are counted only for Particle coordinates. Counts are not polled; focusing a field can redisplay its cached count. Directories are excluded. Broad searches are bounded and respect configured read roots. No adapter rebuild required.

### 0.14.45 — Integrated batch review

Manual-preparation badges are red in the idealized pipeline and batch review. Each job’s reports now appear inside its command details; manual-preparation steps open expanded and explicitly warn that execution may wait for the required file.

### 0.14.46 — Pending manual input highlighting

Scheduled job rows show Manual input pending in red. Corresponding input fields in the selected job are yellow while the saved required file remains absent. Highlights clear after file availability refreshes or the field is edited to a different path. Job numbering is unchanged.

### 0.14.47 — Independent job list scrolling

Running, Finished and Scheduled job sections share the existing pipeline panel height and scroll independently below fixed headers. Collapsed sections release their space. Scroll offsets persist across refreshes and collapse/expand. No adapter rebuild required.

### 0.14.48 — Browser 3D class selection

Simple interactive Subset selection accepts 3D-class optimiser files. Gallery reference tiles display central Z slices from individual MRC volumes; selected class IDs save the corresponding particles through the existing native metadata writer. Advanced recenter/regroup and other unsupported modes still use native RELION. No adapter rebuild required.

### 0.14.49 — 3D gallery slice direction

3D reference galleries offer X/Y/Z central slice directions, defaulting to Z. Changing direction preserves selected classes. X/Y extraction reads one plane or row at a time without loading the whole volume. No adapter rebuild required.

### 0.14.50 — Topaz browser picking

Manual picking with Topaz denoising now uses picker.html. It runs relion_python_topaz denoise on GPU 0 with native RELION patch/normalization flags, bypassing low/high-pass filters. Temporary output is removed after reading; failures are reported in the picker. The executable is checked before starting the job. No adapter rebuild required.

### 0.14.51 — Picker diagnostic layout and progress logs

CTF diagnostic is above the left-panel picking instructions. Successful saves and finish append selected micrograph, picked micrograph and particle totals to run.out; helical mode reports endpoints and filament totals instead. No adapter rebuild required.

### 0.14.52 — Import multi-frame hint

The multi-frame field offers a floating Probably Yes/No hint based on nonempty stdout lines from relion_image_handler --stats on one matching raw input. It runs on a pattern edit or first focus/hover, caches results, and never changes the field value. Errors produce an unavailable hint. No adapter rebuild required.

### 0.14.53 — Apply Import frame detection on changes

Frame detection runs only after committing a changed raw input value (including file-browser choices). Successful results set is_multiframe automatically; failed checks preserve the value. Hover/focus triggers are removed and dismissed hints stay closed until a new check. Stale responses are ignored. No adapter rebuild required.

### 0.14.54 — Lock detected movie mode

Successful frame detection locks the multi-frame dropdown to the detected value. Changing the raw input unlocks it pending a new result. The lock survives editor redraws within the current browser session. No adapter rebuild required.

### 0.14.55 — MotionCor2 field visibility

Motion correction hides the MotionCor2 executable, GPU IDs and additional MotionCor2 arguments when RELION’s own implementation is selected. Switching to No shows them again without discarding their values. No adapter rebuild required.

### 0.14.56 — Import inline hints

Raw Import wildcard counts appear right-aligned inside the input. Single-frame paths containing Movie (case-insensitive) receive red wavy text decoration and a naming suggestion. The empty Motion correction movie-input browser suggests checking whether micrographs were imported. No adapter rebuild required.

### 0.14.57 — Inline frame hint and reciprocal naming warning

Frame detection results appear inside the multi-frame field as gray right-aligned text. Movies with Micrograph in the raw path receive the reciprocal red wavy naming warning and Movies tooltip. Detection timing and automatic locking are unchanged. No adapter rebuild required.

### 0.14.58 — PDF page fit

PDF embedding requests Page fit using browser PDF viewer fragment options. The fallback message is removed, and the status element is removed after successful loading; errors still appear. Native PDF-viewer support for initial zoom depends on the browser. No adapter rebuild required.

### 0.14.59 — Browser manual continuation of Auto-picking

Import raw input defaults to Movies/*.tif. Auto-picking Continue manually uses the browser picker for supported manual settings, loading existing autopick.star coordinates and updating the same job/mapping when saved. Unedited coordinate references are retained. Display settings follow .gui_manualpickjob.star when available, with native-like defaults otherwise. Rebuild the native adapter: python3 scripts/build_bridge.py /path/to/relion-source --output build, then restart.

### 0.14.60 — Block manual continuation of Topaz training

Auto-picking Topaz-training jobs keep Continue manually at No and disable the control with an explanatory tooltip. Submission also checks both current and saved settings to reject invalid manual continuations. No further adapter rebuild needed beyond 0.14.59.

### 0.14.61 — Brighter picking outlines

Picking circles and helical connecting lines use #00FF00 with a 3-pixel canvas stroke (previously 1.5). No adapter rebuild required.

### 0.14.62 — Classification convergence

Main page title includes the project folder name. The new leftmost Convergence inspector tab for 3D classification plots per-class populations against iteration, with estimated-resolution labels in Å and exact hover details. It updates with normal refreshes while visible, respects refresh pause, handles continuation filenames and retries incomplete files. Successful file parses are cached by size/mtime. No adapter rebuild required.

### 0.14.63 — Convergence module delivery

Add convergence.js to the static asset allowlist so the main application loads with the correct JavaScript MIME type. Restart the server and refresh. No adapter rebuild required.

### 0.14.64
2D classification now includes a live Convergence inspector tab with per-class rotational (degrees) and translational (Å) accuracy plots. Zero and 999 values are omitted independently.

### 0.14.65 — Pre-import/Screening and linked convergence scrolling

Both horizontal scrollbars in the 2D classification Convergence tab now move
together, including after refresh.

The new **00 · Pre-import/Screening** job appears before Import. It is recorded
as a standard RELION External job (External/jobNNN), using RELION's normal
counter, status and output accounting. It does not require a new native bridge.

1. Allow the collection directory when starting the server, for example:
   `npm start -- --project /path/to/project --read-root /mnt/collection`.
   These are paths on the server, not the browser computer.
2. Choose Pre-import/Screening. Enter the collection path, data suffix
   (default `_Fractions`), destination folder (default `Movies`) and preview
   folder (default `JPGs`). Extension `auto` matches TIFF/TIF/MRC/MRCS;
   specify an extension if several variants coexist.
3. Run the job and open the screening gallery link. It recursively copies only
   `FoilHole*.jpg` / `.jpeg` previews, preserving the collection-relative tree
   under `JPGs/External/jobNNN/`. Full-size files are not read or copied.
   Collection symlinks are skipped. Output folders must be project-relative
   and must not use symlinks. Progress appears in stdout and the gallery.
4. Click good images, Shift-click ranges (also across pages), or use Select all,
   Select page, Clear selection and Invert selection. Red borders indicate
   selected images. A browser-local draft lets the same browser resume an
   unfinished selection. The inspector contains a resume/view gallery link.
5. Save the selection. This creates `External/jobNNN/copy_selected.sh`, records
   the selected indices, and finishes the job. Download the script from the
   gallery or inspector, review it, then run it **on the server**:
   `sh External/jobNNN/copy_selected.sh`.
6. Use Import with `Movies/*.tiff` (or the chosen directory/extension) after
   the copy completes.

The script uses absolute quoted paths, creates the destination directory, and
copies only selected data files. It refuses pre-existing destination filenames.
Missing/ambiguous data matches and duplicate selected basenames block saving
with an explanation. No copy script is automatically executed. Completion means
the selection/script is ready, not that full-size data have been copied.

Screening is an interactive preparation step: run it separately before an
idealized batch pipeline. Automatic template capture excludes screening jobs.
Use New job for another screening pass; finished selections are read-only.
JPEG preview folders are retained outside the External job directory; remove
them manually when no longer needed. Like other detached RELION jobs, the
screening worker survives server shutdown and waits for selection or abort.

### 0.14.66 — Compact screening toolbar

Screening now uses a compact title/status header and one wrapping toolbar for
display, pagination and selection controls. Longer instructions are tucked
under Help. JPEGs flagged "No matching full-size file" are automatically omitted
from the gallery, counts, Select all, Invert and restored draft selections.
A short count reports how many were excluded. Original manifest indices and
local JPEG files are preserved, so existing jobs remain usable. Ambiguous
multiple matches remain visible for diagnosis and still cannot be saved.

### 0.14.67 — Data-only previews and LAN HTTP saving

New screening scans use FoilHole_*_Data_*.jpg (also accepting .jpeg and
case variants), avoiding overview JPEGs before copying. Existing screening
jobs remain usable and continue to exclude missing full-size matches.

Screening, subset gallery and manual picker request IDs now fall back to
crypto.getRandomValues when crypto.randomUUID is unavailable over LAN HTTP.
Restart the server and reload viewer tabs; no native bridge rebuild is needed.

### 0.14.68
Screening thumbnails no longer display captions. Filenames and diagnostics remain in hover tooltips; inaccessible previews have a red border and an accessible error description.

### 0.14.69 — Screening copies selected data automatically

For newly created screening jobs, Save selection & copy files starts copying
in the detached RELION External worker. It runs relion_image_handler --stats
on the first selected full-size file, counts nonempty stdout lines, and chooses
Micrographs (one line) or Movies (multiple lines). All selected files are assumed
to have the same frame type. The executable must be available in the server PATH.
The output folder field is now automatic. No shell script is generated.

The chosen project folder must not already exist. Copying refuses overwrites,
checks source size/mtime and copied size, and publishes each complete file
atomically. Progress is shown in the gallery and stdout. Success is written
only after every selected file is copied; the directory is registered as the
job output and shown in the inspector. The files are then ready for Import.
Closing the browser or stopping the server does not terminate the worker.
Abort removes the current partial file, retaining completed files; after failure
or abort, move/rename the partial collection folder before starting a new job.
Frame detection has the same 60-second timeout as Import detection.

Existing pre-0.14.69 jobs are not converted: create a new screening job
to use automatic copying. Previously generated scripts remain downloadable.
No native adapter rebuild is required.

### 0.14.70 — Automatic gain-reference preparation

Before a new Pre-import/Screening job finishes, it recursively searches the
collection for filenames containing "gain" (case insensitive). TIFF and MRC
formats are identified by their headers, including files with nonstandard
extensions such as .gain. Non-image matching files are ignored. Symlinks are
not followed. With no gain images found, processing finishes normally and logs
that fact.

All matching gain images are prepared in the main project folder. TIFF gains
are converted to unscaled, little-endian float32 MRC; MRC gains are validated
and copied byte-for-byte. Basenames are retained with .mrc extensions; collisions
get a stable source-path suffix. Identical existing outputs are reused and
different files are never overwritten. The source-to-output mapping and hashes
are saved in External/jobNNN/screening-gains.json. Gain outputs appear in the
inspector with download actions. No gain is automatically chosen for Motion
correction when several candidates exist.

The built-in Node implementation follows the sample-reading / MRC-writing
approach of IMOD mrc/tif2mrc.c and libiimod/iitif.c, including the bottom-up MRC
row order. No IMOD installation, libtiff, npm or Python dependency is added.
Supported: single-page grayscale classic TIFF or BigTIFF, either byte order,
strips or tiles, raw/LZW/Deflate/PackBits compression, 8/16/32-bit integer and
32-bit float samples, and integer horizontal prediction. Calibration values
are not normalized or inverted. 32-bit integers are rounded to float32, as in
IMOD's long-to-float conversion. TIFF resolution units are used when present;
otherwise voxel size defaults to 1 Å.

Unsupported encodings (including floating-point prediction, color, multiple
pages and non-default orientation), non-finite samples and malformed files
cause a clear job error; no success marker is written. Limits: 512 MiB per gain
file and 64 million TIFF pixels. Completed movie/micrograph copies are retained
if gain preparation fails; move/rename that output folder before rerunning.

Restart the server and create a new screening job to use the updated worker;
an already-running worker continues with the code it loaded at launch.
No native adapter rebuild is required.

### 0.14.71 — Browse non-pipeline STAR inputs

The Subset selection fn_mic and fn_data choosers now include
"Browse alien/exotic .star files". This opens a project-folder browser showing
any .star file, independent of pipeline registration or expected node type.
The user can navigate directories, filter filenames, and switch back to
pipeline inputs. Existing launch-time STAR validation remains active.
This browsing mode stays inside the project, including symlink resolution.

### 0.14.72 — Continue Pre-import screening

Finished Pre-import/Screening jobs now offer Continue! on the same job number.
Each continuation rescans the collection, refreshes local JPEG previews, and
opens a fresh selection revision. Previously selected source files are
preselected when still present. Older gallery tabs cannot save an obsolete
revision. Previous manifests/selections/reports are archived under the job's
screening-history directory.

Saving copies newly selected files into the existing Movies/Micrographs
folder. A per-job copy ledger avoids rereading unchanged source/target pairs.
Existing files without a matching ledger entry are compared by SHA-256 before
being reused. Different content with the same destination name blocks copying;
existing data is never overwritten. Deselecting a previously copied file does
not delete it. Every continuation searches, converts/copies and registers gain
references again. The gallery and stdout distinguish newly copied and already
present files. An unexpected change between movie and micrograph frame type
requires a new job.

The Subset selection exotic STAR button is now smaller and placed below the
file list. Restart the server and reload the GUI; no native bridge rebuild.

### 0.14.73 — Faster unchanged Pre-import continuations
Continuation reuses JPEG previews when source and local metadata match, and caches frame detection for an unchanged selected source. Selected data metadata is checked once in bounded parallel batches; unchanged full-size files use the existing copy ledger. Progress updates are batched and abort-file polling is limited to four times per second. Changed or untracked destination files retain content verification.

The collection is still scanned for new acquisitions and gain references are still checked. The first continuation of an older job refreshes previews once to establish their fingerprints; subsequent unchanged continuations reuse them. Network filesystem latency can still affect scan time.

### 0.14.74 — Metadata-only screening checks
Full-size copy reuse now compares sizes and modification times against the copy record, without reading or hashing movie contents and without requiring unchanged inode numbers. Untracked destinations are accepted only if source size and modification time match; mismatches produce an explicit error without overwriting. New copies preserve source modification times. This deliberately does not detect content changes that preserve both size and modification time.

JPEG reuse also uses size/mtime, with fewer repeated directory checks. Destination metadata is read in bounded parallel batches. TIFF/BigTIFF frame counts come from image directory links (both byte orders), without decoding pixel data; cached frame counts remain available. Non-TIFF formats retain the RELION statistics fallback. Directory discovery and gain-reference processing still take place.

### 0.14.75 — Compare source snapshots correctly
Pre-import continuation compares the current source size and modification time with its recorded source snapshot. If unchanged, a regular destination file of the same size is reused regardless of its modification time or inode. No content hashing is performed. Missing destinations are copied normally. Changed sources and differently sized destinations still require intervention; untracked destinations retain the conservative size/mtime adoption check because no prior source snapshot exists.

### 0.14.76 — Adopt manually copied screening files
On continuation, an existing regular destination without a copy record is accepted when its size matches the source, irrespective of modification time. The current source snapshot is recorded for future continuations; no contents are hashed or recopied. Files with a prior source record still require an unchanged source snapshot. Size mismatches and symbolic-link destinations remain rejected.

### 0.14.77 — Non-default TIFF gain orientation tags
Gain TIFF conversion (including TIFF data named .gain) accepts valid orientation tags 1–8. Following the reference IMOD iitif.c stored-row convention, it does not apply display-orientation rotations or reflections; the existing TIFF-to-MRC row reversal remains. Non-default tags are reported in the job log and screening-gains.json warnings. Invalid orientation values are rejected. This removes an overly restrictive check, not a detector-specific gain alignment correction.

### 0.14.78 — Sequential defaults
Pre-import extension dropdown excludes .mrcs. Successful screening supplies the Import wildcard; never-used subsequent job types receive unique compatible primary inputs. Successful job types have a distinct background. Edited inputs and saved jobs are preserved.

### 0.14.79 — Apply project computing defaults consistently
Saving Workstation / cluster defaults refreshes all new-job drafts. Direct computing fields inherit global values; MPI/thread defaults use the existing job-specific CPU/GPU resource rules shared with template scheduling. Completed and running jobs load their recorded parameters and the selected saved job is not changed by saving globals. New job creation applies current computing defaults.

LoG Auto-picking always forces use_gpu=No in the GUI and submission API. Switching to reference picking restores the global use_gpu value; subsequent per-job edits remain possible. References in template batches also honor the global GPU preference. Scientific parameters are not reset by a global save.

### 0.14.80 — Native-style manual picking outputs
Coordinate files follow the micrograph path after the pipeline job prefix, e.g. MotionCorr/job004/Movies/movie.mrc becomes ManualPick/job005/Movies/movie_manualpick.star. Coordinate mappings point to these files; previous index-named files remain readable and new saves use the native-style names. New coordinate tables contain X, Y, selection type (green=2), psi and FOM, without the extra class-number column. Existing selection types are retained. Helical endpoint pairs receive psi=-atan2(dy,dx) in degrees on both rows.

Rebuild the native adapter using python3 scripts/build_bridge.py /path/to/relion-source --output build, then restart the server and refresh the browser. Existing coordinate files are not rewritten until saved again.

### 0.14.81 — Compact picker toolbar and stationary CTF diagnostic
The micrograph list has its own scrollbar, keeping the CTF diagnostic and picking instructions visible. The top action and display controls share a compact wrapping toolbar. The CTF image scales down in short windows and the layout adapts to narrow screens. No adapter rebuild is needed for this layout-only update.

### 0.14.82 — Classification controls
CTF correction is enabled and its switch omitted for 2D/3D classification, 3D initial reference and 3D auto-refine. The remaining CTF options stay visible. 2D EM/gradient methods form a radio pair; fields conditional on the inactive method are hidden. Gradient forces nr_mpi=1 and disables the MPI field; selecting EM restores the existing project-derived MPI rule (globalNgpus+1). Submission also enforces CTF/gradient constraints. No native adapter rebuild required.

### 0.14.83 — Gradient threads and readable Import defaults
Selecting the 2D gradient method sets both MPI=1 and threads=globalNcpus; selecting EM restores its project-derived process/thread defaults. Pre-import retains actual extension spelling, so automatic Import suggestions use Movies/*.tiff (or the detected extension) rather than case-insensitive character classes. Older screening reports inspect local output names to determine extension case. Existing Import jobs retain their saved paths.

### 0.14.84 — Remove deselected Pre-import copies
Saving a screening selection now permanently deletes deselected local data files tracked in that job's copy ledger, including manually copied files previously adopted by the job. Source files and unrelated/untracked local files are preserved. Removal occurs after selected files and gains are prepared. Unsafe paths, symbolic links and changed-size destinations are rejected. Continuations with a known output folder and cached frame information may save an empty selection to clear all tracked copies. Deleted counts appear in progress and the completion report. This does not rewrite downstream jobs that reference those files.

### 0.14.85 — Delete untracked deselected collection copies
Deselection cleanup now includes local files missing from the job's copy ledger when they uniquely match a full-size source basename in the current screening manifest and have the same size. Destination timestamps are irrelevant. Selected basenames are always preserved; unrelated files, ambiguous matches, source files and previews are not deleted. Size mismatches produce an explicit error. Metadata checks run in bounded parallel batches without hashing.

### 0.14.86 — File count progress hint
Wildcard hints show Calculating… immediately while a count request is pending, then show the count or error. Identical concurrent requests share the pending result; a rebuilt input reconnects to it, and responses for old input values are not displayed.

### 0.14.87 — Picker filenames and defocus
Micrograph list rows show the filename without its directory and a compact Defocus U value in Angstroms. Full paths remain in tooltips. Missing/invalid defocus is shown as an em dash. Metadata comes from the input micrographs STAR for both manual picking and manual continuation of autopicking. No adapter rebuild needed.

### 0.14.88 — Picker save/finish feedback
Save and finish immediately displays a busy indicator, phase description, micrograph count and elapsed time. The button reads Finishing… and repeat clicks are blocked. Save picks has the same waiting feedback. Success/failure stops the timer and displays the outcome. Elapsed time is not an estimated completion time; native processing provides no reliable percentage.

### 0.14.89 — Avoid repeated picker-wide save scans
Only dirty coordinate files are written, as before. Ordinary saves no longer recount every micrograph for stdout; they log the changed micrograph count. Once the coordinate mapping is initialized, the native adapter updates the changed entry and retains the others without repeated per-file existence probes. Finish performs the final aggregate log count once, reading the mapping once and counting registered coordinate files in bounded parallel batches. Initial mapping discovery and final counts still require work; metadata STAR tables remain published for RELION compatibility.

Rebuild the adapter with python3 scripts/build_bridge.py /path/to/relion-source --output build, then restart and refresh.

### 0.14.90 — Particle quality screening

Ordinary particle picking now includes a quality panel below the CTF diagnostic. Click **Scan particles** to measure mean-square intensity (power) and population standard deviation inside every picked circle using original, full-resolution micrograph pixels. Display contrast and filters do not affect these measurements. The first scan reads the original MRC images; repeat scans cache results against image size/modification time, coordinates and particle diameter. The existing image reader limits apply (maximum dimension 16384, maximum 32 million pixels). Helical start/end picking is not supported by this feature.

Set minimum/maximum power and standard deviation to preview rejected particles in red in the scatter plot and micrograph. Empty limits are unrestricted. Circles crossing an image boundary or containing non-finite pixels are invalid and counted as rejected. Stop scan takes effect between micrographs.

**Remove rejected particles** explicitly confirms the affected count and updates only affected coordinate files. Per-micrograph backups are retained in the job directory; **Undo last removal** restores the latest batch while the picking job is running, including after reopening the picker. Undo refuses to overwrite subsequent coordinate edits. If a batch stops midway, undo the partial batch or rescan before filtering again.

Restart the server and refresh the picker after upgrading. No native adapter rebuild is needed when upgrading from 0.14.89.

### 0.14.91 — Single-micrograph quality preview

The particle-quality scatter plot scales both axes to the measured minimum and maximum, with padding for constant-valued data. **Update this**, beside Scan particles, saves pending picks and measures only the displayed micrograph. Changing the diameter immediately clears outdated statistics and displays a recalculation hint. Thresholds retain their numerical values; they are never silently rescaled. Use Update this to try diameters on one micrograph, then Scan particles to evaluate all micrographs before batch removal. No native rebuild required.

### 0.14.92 — Whole-micrograph pixel statistics

The picker status line now appends original-pixel avg, population stddev, minval and maxval. Statistics load asynchronously with a calculating indicator and use full-resolution, unfiltered pixels, including MRC float16. Results are cached by file size and modification time. Non-finite pixels are excluded and their count reported explicitly. No native rebuild needed.

### 0.14.93 — Automatic per-micrograph power screening

Replaces the quality panel, scatter plot and manual thresholds with one Delete all reds button. Original-pixel particle mean-square power is measured automatically; per-particle pixel stddev is no longer calculated. For each micrograph, AVGP and population STDP are calculated over valid particle powers. Green requires power strictly greater than AVGP - 3*STDP. Equal powers (including a single particle) therefore all fail the strict rule. Invalid circles are red and excluded from the aggregate. Pending measurements are grey. Changes to picks or diameter trigger recalculation.

Delete all reds checks all micrographs and confirms the total before deleting once; coordinate backups remain in particle-backups within the job. Only affected coordinate files are written. Whole-micrograph status statistics remain available. Restart and refresh; no native rebuild needed.

### 0.14.94 — Corrected power cutoff

The automatic cutoff is now AVGP - 2*STDP. Cached particle powers are reused, but their cutoff is recomputed using the corrected rule. Restart the server and refresh the picker; no native rebuild needed.

### 0.14.95 — Configurable power screening and parallel workers

The picker offers a non-negative power multiplier (default 2, step 0.1). Green requires power > AVGP - multiplier*STDP; changes recolour cached powers immediately. Delete all reds checks all micrographs with two concurrent requests, handled by a shared server-side worker limit of at most two (one on a single-core machine), then confirms and deletes sequentially. This bounds raw-image memory and disk pressure while moving statistics work off the server event loop. Screening is now the displayed name of Pre-import/Screening; its job type identifier and project paths are unchanged. Restart and refresh; no native rebuild required.

### 0.14.96 — CPU defaults and class particle counts

Power checking uses project globalNcpus for client concurrency and the shared server worker limit (reload the picker after changing project defaults). Final coordinate writes remain serialized because native saves update shared job mapping files. Extraction continuation behavior is unchanged.

Class galleries offer NumberOfParticles in the label selector, calculated as round(rlnClassDistribution * input particle count)/input particle count. The source is fn_img from the job owning the model STAR. Counts are cached by source size and mtime. If the source is unavailable, or exceeds the current 256 MiB counting-reader limit, a notice explains why the count is unavailable. Counts are estimates from rounded class distributions. Restart and refresh; no native rebuild needed.

### 0.14.97 — Project-aware editor startup

At startup the editor loads the highest-numbered saved job of each type as the baseline for new-job settings. Thus existing Import calibration settings replace initial schema examples. Workstation defaults retain their precedence for new jobs; continuation filename and manual-continuation flag are cleared. Existing jobs are loaded with their actual saved values. Successful submissions refresh the per-type baseline.

The browser remembers the last selected job/type separately per project. If that job still exists it is reopened; otherwise its type is restored as a new draft. Without a remembered selection, the most recent numbered job type is selected, or Import for an empty project. This browser preference requires local storage. Startup reports any saved job settings it cannot read. Restart and refresh; no native rebuild needed.

### 0.14.98 — Job dependency arrows

Job lists now include passive SVG dependency arrows in a right-side gutter, based on registered pipeline outputs and inputs. Multiple files between the same jobs share an arrow; hover to see both job names and file paths. Green indicates ordinary connections, amber connections into failed/aborted jobs. Dashed labelled stubs identify connections to other independently scrolling sections. Cycles and branches are retained. External files without registered producers do not create arrows. The right column is wider on large screens and dense graphs support horizontal scrolling. Restart and refresh; no native rebuild required.

### 0.14.99 — Clearer dependency tracks

Each dependency now has an exclusive vertical lane with a source dot and destination arrowhead. Removed horizontal connectors and lane reuse that visually merged separate links. Subtle row guides align endpoints with jobs, a compact legend explains the symbols, and file tooltips remain available. Dense graphs scroll horizontally.

### 0.14.100 — Compact dependency gutter

Arrow lanes now use 5–10 px spacing according to available list width. Job summaries use a compact content-sized column (empty summaries reserve no column), with full text available on hover. Both horizontal and vertical list scroll positions survive refreshes; exceptionally dense graphs can still scroll horizontally.

### 0.14.101 — Focus selected job dependencies

Exactly one selected job highlights its direct incoming/outgoing connections and keeps connected job rows at full opacity; unrelated arrows and rows fade. No selection or multiple selections restores the full graph. Faded items remain selectable and file tooltips still work.

### 0.14.102 — Full-height pipeline tabs and required computing setup

Pipeline and Idealized pipeline now share a full-height right column with accessible tabs; the top bar and project/editor area end before that column. Each tab retains its existing controls.

Initialized writable projects without a saved execution-defaults file keep the workspace inert and show a callout at Workstation / cluster defaults. Saving valid defaults unlocks the interface. Launch, continue, scheduling and template scheduling also enforce this requirement on the server. Previously saved defaults satisfy the requirement; demo and read-only sessions are exempt. Restart and refresh; no native rebuild needed.

### 0.14.103 — Required initialization dialog

The Initialize RELION project dialog hides the close button and prevents Escape dismissal. It closes only after successful initialization. Other dialogs retain their close button and Escape behavior.

### 0.14.104 — Initialization Escape guard

Initialization now blocks Escape at the capture phase, sets closedby=none where supported and reopens if an unexpected close occurs before initialization succeeds. Other dialogs remain dismissible.

### 0.14.105 — Extraction job summary

Particle extraction summaries show the last native output particle count and box size, for example 4286 particles 256px(scaled). Uses rescale when do_rescale is Yes, otherwise extract_size. Reads the final Written out STAR file message in run.out and uses the existing summary cache.

### 0.14.106 — Two-line summaries and deselection

Job key information now uses up to two lines, with extraction particle counts and box sizes on separate lines. Ctrl/Cmd-click treats a restored inspected job as selected, clears the inspector when the last selection is removed, and invalidates pending job loads to prevent stale selection restoration. Shift ranges and multiple selection remain supported.

### 0.14.110 — Restore 0.14.106 baseline; collapse empty sections at startup

Restores the complete 0.14.106 baseline, removing the later pointer-down, keyboard-modifier fallback and debug instrumentation changes. Empty Running, Finished and Scheduled sections start collapsed on their first render. Users can expand them; subsequent refreshes preserve their chosen state. Release numbering advances to avoid confusing this build with the withdrawn 107/108/109-debug builds.

### 0.14.111 — Follow dependency arrows

Click a dependency arrow to select its source, or its destination when the source is already selected. Repeated clicks alternate endpoints. Matching editor input fields and inspector input/output nodes receive green highlights, or yellow for failed/aborted jobs. Matching input tabs and collapsed job sections are opened. Arrow tooltips remain and keyboard Enter/Space activation is supported. Ordinary row selection clears connection highlights.

### 0.14.112 — Full-height Job Types panel

The left Job Types panel now occupies the full viewport height with its own scrolling job list. Header, project bar and workspace sit between the two side panels. The required computing-setup gate also disables the relocated sidebar. Header controls wrap when central space is limited. No native rebuild needed.

### 0.14.113 — Sidebar connector families
Job-type buttons show separate input/output symbols with tooltips and a collapsible legend. A mask silhouette identifies masks; a molecule identifies atomic models. Dashed outlines mark possible downstream data-family matches. These are mode-independent hints, not exact STAR-schema compatibility guarantees. Sidebar width accommodates the connectors. No job parameters or pipeline execution behavior changes.

### 0.14.114 — Resizable panels and bounded map surfaces
Both sidebars are wider by default. Drag the inner edge to resize; widths persist in browser storage. The separator also supports arrow keys (Shift for larger steps), Home/End, and double-click to reset. Map viewer starts at an absolute density level of 0.02. At each threshold, a conservative marching-cubes index estimate triggers block-averaged display downsampling when necessary; original files and download data are unchanged. A visible notice identifies reduced previews. Smoothing is not used as a triangle-count remedy. Removed the missing NGL source-map reference.
Validation: syntax checks and surface-budget / connector tests passed. Browser visual validation was unavailable.

### 0.14.115 — Statistical initial map threshold and optional smoothing
The map viewer calculates mean density and population standard deviation from all finite voxels of the original loaded map and starts at mean + 2 sigma. The values are shown in the status text. Smooth surface is unchecked initially; enabling it applies 10 NGL smoothing iterations, retained when adjusting the level. Disabling it restores the unsmoothed surface. Browser triangle-budget protection remains independent of smoothing.

### 0.14.116 — Adjustable symbol columns and postprocess metadata
Job-type names share a column capped by the longest label, shrinking and wrapping when needed. Drag either separator in the IN/OUT heading to resize symbol columns; widths persist, with double-click reset and keyboard arrows. Added initial-model optimiser input and a distinct Postprocess STAR family (Post-processing output, CTF refinement and Bayesian polishing inputs). Removed misleading direct map input for Subset selection and mask/map inputs for CTF refinement and polishing. Pipeline arrows still use real file inputs, with a producer-directory fallback when an output node is absent.
Validation: connector-family and pipeline-edge tests pass; browser visual verification unavailable.

### 0.14.117 — Undeclared postprocess dependencies
The displayed pipeline reads fn_post from CTF refinement and Bayesian polishing job.star files, supplements their input lists and the matching producer output, and shows dependency arrows even when native pipeline nodes omit those links. Settings reads are cached by file metadata and rechecked on refresh. Native pipeline files are not rewritten. Tested missing native edges, aliases, refresh caching and edited settings.

### 0.14.118 — Auto-refine convergence
3D auto-refine inspector now offers three synchronized convergence plots: resolution, angular changes and offset changes, indexed by Auto-refine iteration markers in run.out. Logs are streamed and cached by metadata, with updates on refresh. Non-finite class statistics are omitted per metric/class rather than rejecting an entire 3D classification iteration. Parsing and appended-log refresh tests pass; browser visual verification unavailable.

### 0.14.119 — Undefined convergence values
All convergence metrics omit RELION sentinel value 999, including auto-refine resolution, angle and offset changes and 3D classification resolution labels. Valid zero changes remain visible. Eight convergence tests pass.

### 0.14.120 — Remove Executables button
Removed the project-bar Executables button and its event handler. Job executable validation remains available. Viewer routing remains unchanged.

### 0.14.121 — Legacy optimiser node labels
Inspector links recognize ProcessData.star.relion.optimiser.* as well as OptimiserData.* and open both in the browser gallery. Other ProcessData nodes retain their existing routing. Native pipeline files are unchanged.

### 0.14.122 — Job-type icons
Replace sidebar job numbers with the approved monochrome symbols for all 24 job types, including a larger CTF refinement diamond. Icons are local SVG assets with no network dependency. Input/output symbols and column resizing are preserved. Syntax and complete job-type coverage checks pass.

### Local-resolution visualization

Open `relion_locres_filtered.mrc` from a Local resolution job in the 3D viewer. The viewer automatically loads `relion_locres.mrc` from the same directory and colors the density isosurface by local resolution: blue for smaller Å values (higher resolution), white at the midpoint, and red for larger Å values (lower resolution). The Local resolution controls show the Å legend, let you adjust the blue/red limits, and let you return to a single surface color. Invalid or missing estimates are gray. Coloring follows physical map coordinates even when the display surface is smoothed or reduced. Missing or unsupported companion maps leave the density view available with an explanatory message. Each volume remains subject to the browser preview size limit. This automatic pairing applies to RELION local-resolution output, not standalone ResMap output.

With “Show all” unchecked, the job-type sidebar also includes the types offered by the selected job's next-job suggestions. The same conditions apply to both controls, including custom next-job definitions, continuation actions, and all steps in a suggested pipeline. This adds visibility; normal input validation still applies before execution.

Job types also remain visible while they have a draft being edited, a workspace draft, or a pinned draft. Discarding the draft removes this extra visibility criterion; compatible outputs and next-job suggestions continue to apply. The search filter still applies to all listed types.

### CTF live-preview scale (0.15.286)

The yellow resolution circles use the pixel size reported as “Pixel size for fitting” in the matching CTFFIND log. This can differ from the micrograph optics pixel size because CTFFIND resamples small pixels, or because a supplied power spectrum has different sampling. The matching RELION-generated CTFFIND command supplies the actual fitting limits. STA dose adjustment remains separate and is not applied to SPA. If the fitting scale is unavailable, the viewer explicitly reports that it is falling back to the input STAR pixel size. Debug output includes the input pixel size, diagnostic fitting scale, scale source, and actual resolution limits.

Both resolution sliders use a 0.5 Å grid. The Nyquist lower bound is rounded upwards to the next half Å (for example, 6.28 becomes 6.5 Å), keeping the selected resolution within the physical limit. The minimum-resolution limit remains capped at 50 Å, and the maximum-resolution value stays below it. Editing the limits redraws the circles; Update preview recalculates the diagnostic image.

Background: https://grigoriefflab.umassmed.edu/ctffind4 (automatic resampling); https://github.com/3dem/relion/blob/master/src/ctffind_runner.cpp (STA dose adjustment and supplied-spectrum sampling).

### Import MTF suggestion (0.15.287)

New SPA Import drafts suggest a single `*mtf*.star` file for `fn_mtf`, and new STA Import tilt series drafts suggest it for `mtf_file`. Matching ignores filename case and searches the project root, then the immediate Movies, Micrographs, frames, and mdoc folders (case-insensitively). A unique project-root file takes precedence over subfolder matches; ambiguous matches at the preferred level leave the field empty. The paths respect configured read roots, and manual edits to the field are retained. The CTF estimation draft tab is named Preview; the Job Types header places Show all before the SPA/STA badge.

### Explicit Import pixel size (0.15.288)

New SPA and STA Import drafts start with an empty pixel-size field rather than a numeric example. When available, the latest successfully completed raw Import of the same type supplies its positive, finite angpix value. Scheduled, failed, unreadable, non-raw, and invalid earlier imports do not supply a default. Manual edits in the current draft are retained. The empty field is highlighted yellow with an “Enter pixel size (Å)” prompt; entering a value removes the highlight. Existing numeric validation still applies on submission.

### Motion dose and preview refresh (0.15.289)

Motion correction drafts with a dose_per_frame field start with that field empty and yellow. A valid positive dose from the latest successfully completed Motion correction job can supply its default; manual draft edits are retained. STA schemas that obtain dose elsewhere are not given an extra dose_per_frame field.

CTF Preview places status and Update preview on the same row and removes the explanatory paragraph. Each button click uses a fresh random sample, excluding the previously previewed micrograph when another candidate exists. A sole input is recalculated. Tab changes retain the completed preview, and recalculation preserves inspector scrolling.

### Header and Mask re-scaling symbols (0.15.290)

The normal mode badge reads SPA or STA. The manual Refresh button is shown only with --debug; automatic refresh continues as usual. Mask re-scaling uses the Mask creation icon and shows possible inputs 3D maps and Masks, plus possible output Masks, in both mode sidebars.

### Initial reference preview and command checking (0.15.291)

3D initial reference jobs now use the 64×64 thumbnail with shared XYZ and slice controls. A readable initial_model.mrc is displayed as a single final result regardless of the requested class count. Until it is ready, the latest complete run_itNNN_classNNN.mrc set can be shown.

Check command fills an empty fn_cont when the current job is being continued and the continuation picker returns exactly one available file belonging to that job. Explicit entries are preserved; ambiguous, incomplete, or truncated results still require selection. A new scheduled job is not treated as continuation unless it was scheduled as one.

### Temporary continuation for Check command (0.15.292)

The automatically selected continuation path is used only in the Check command request. The editor field and saved draft retain their original content, including an empty value, whether command checking succeeds or fails.

### Initial reference continuation and classification GPUs (0.15.293)

Selecting a new continuation file for 3D initial reference adds 50 mini-batches to nr_iter. Re-selecting the same file does not increment it again.

3D classification permits GPU use when alignment is enabled. GPU use is forced off only when alignment is skipped, matching RELION's restriction. Re-enabling alignment restores the previous GPU choice. The editor, resource defaults, and submission validation apply the same rule.

### Reference greyscale defaults (0.15.294)

New 3D classification and 3D auto-refine drafts default to reference greyscale correction = Yes when the reference map belongs to a RELION processing job in the current project. Imported, external, and unrecognised maps default to No. This follows automatic reference suggestions and reference changes, including job aliases and absolute project paths. Explicit user choices, copied drafts, pinned templates, and existing jobs are preserved.

### Trash checks, denoising model defaults, and feed icons (0.15.295)

The startup link scan skips the project's Trash folder. Denoising drafts suggest the newest eligible training job's denoising_model.tar.gz, including planned outputs from scheduled or running training jobs; completed training models must still be readable. Explicit model selections remain unchanged. Feed editor titles show their job type's icon.

### Denoising prediction progress and alignment statistics (0.15.296)

Denoising prediction displays the latest tqdm bar as progress for the current tomogram, resetting for the next tomogram rather than claiming whole-job completion. Training retains its epoch progress.

After a successful Align tilt-series job is observed, RelionDeLuxe appends a summary to run.out with the arithmetic mean and population standard deviation of all finite _rlnTomoZRot values pooled across tilt_series/*.star. The line includes degrees, tilt-row and tomogram counts, and any files without readable finite values. Unchanged logs are not appended repeatedly, including after restarting RelionDeLuxe. This also summarizes previously completed alignment jobs when opened; readonly mode does not modify logs.

### Pipeline next-job buttons and loading gate (0.15.297)

The Pipeline list repeats the available next-job buttons, centered immediately after its job-number divider, with the same actions and enabled state as the feed buttons.

Embedded feed editors display Loading... and keep their contents inert while startup checks and default calculations are pending. Dependent requests are included, so motion-correction gain conversion and other input defaults finish before editing is enabled. Failed requests release the loading gate and retain the existing error reporting.

### Pipeline next-job placement fix (0.15.298)

Dependency-diagram layout now moves the next-job buttons together with the job rows and number divider, preserving their position immediately after the divider. Buttons remain centered across the pipeline content width.

### Denoising prerequisite in job types (0.15.299)

Denoise tomograms stays visible but disabled and struck through until a completed, running, or scheduled Motion correction job has do_even_odd_split = Yes. Its tooltip explains the Save images for denoising? prerequisite. State refreshes re-evaluate saved job settings, so scheduling or removing the qualifying job updates availability. Failed jobs and unsubmitted drafts do not qualify.

### Exclude tilt-images input defaults (0.15.300)

Exclude tilt-images now suggests only tilt-series STAR outputs from Import tilt series, Motion correction, CTF estimation, Align tilt-series, or Exclude tilt-images. Reconstructed tomograms.star outputs are excluded, even if they share a broad native metadata node type. The compatible-input chooser and next-job shortcuts use the same restriction. Automatic draft defaults are refreshed while explicit user choices remain unchanged.

### Draft label and alignment-to-reconstruction inputs (0.15.301)

Draft editors display DRAFT instead of NEW JOB. Starting Reconstruct tomograms through an Align tilt-series next-job button now explicitly seeds in_tiltseries from that alignment's declared aligned_tilt_series.star output. Alias output paths are normalized to the canonical job directory. The source overrides stale draft defaults and is preserved against asynchronous automatic-default updates.

### Cards and dependency Tree (0.15.302)

The centered banner switch defaults to Cards. Tree uses the Pipeline Atlas layout and controls, with live RELION jobs and dependencies, alias labels, click/keyboard navigation, zoom, pan, boundary navigation, and pure vertical layout. Selecting a node synchronizes the job selection; Cards returns to that job. Starting a draft switches back to Cards. Empty pipelines and cyclic graphs display explanatory messages. The redundant server-version span is removed; About retains the version.

The tree assets are adapted from the user's Pipeline Atlas source, commit 74dd4d80b42acae5147d2076c8e53dac6a0f3219, and run locally without contacting the hosted Atlas site.

### Tree stylesheet security-policy fix (0.15.303)

The Atlas stylesheet is now an external same-origin CSS asset served with text/css. The server's existing Content Security Policy blocked the previous inline style block, leaving a default 300×150 SVG with black filled paths and unreadable labels. This restores full-panel sizing, card and text colors, and unfilled connectors without relaxing the security policy.

### Restore selected card after Tree (0.15.304)

Returning from Tree to Cards waits for the feed layout to settle before revealing the selected job. The existing startup reveal also retries when a lazily mounted editor becomes ready. Switching back to Tree or selecting another job cancels stale reveal requests.

### Tree theme synchronization (0.15.305)

Tree backgrounds, cards, labels, connectors and arrowheads, controls, focus outlines, and selection highlights follow the main interface's theme colors. Theme changes propagate immediately without rebuilding the graph or resetting zoom and selection.

### Dependency-based tree columns (0.15.306)

Both tree layouts order each row by the nearest parent positions instead of job number. One-to-one branches align vertically when space allows, including out-of-order reconstruction jobs. Multiple-parent groups use the midpoint of their nearest parent span, while collision spacing keeps cards separate.

### Richer tree job cards (0.15.307)

Tree cards show the job icon beside the ID, followed by separate lines for job type, status plus key information, and secondary information/resolution. Empty information is omitted and repeated resolution values are suppressed. Full metadata and aliases remain in tooltips. Taller cards have adjusted connector endpoints and navigation bounds.

### Tree icon SVG namespace fix (0.15.308)

Tree icons are parsed as HTML SVG fragments, giving the SVG and its children the correct namespace. The prior XML parsing of namespace-free snippets created elements that occupied space but did not render. Icons with additional HTML badges also parse correctly.

### Friendlier cluster startup (0.15.309)

Cluster startup discovers mpirun.relion, mpirun, or mpiexec from PATH when MPI overrides are absent, and discovers the optional relion_python_topaz wrapper. Existing RELION_MPIRUN settings are preserved. Detected paths are printed. Missing tools produce guidance without blocking startup; invalid explicit overrides still fail validation. Generic SBGrid dispatchers are not auto-selected.

Start from the terminal environment normally used for RELION on your cluster. MPI launches parallel RELION processes; Topaz is only needed for Topaz-related features. Discovery checks file executability, not MPI build compatibility or availability on compute nodes. Queue submission scripts still need to load the site's appropriate environment and resources.

### Execution mode controls and clearer labels (0.15.310)

The header now offers Workstation / Cluster radio controls and a defaults button. Changing the mode updates the running server and opens Workstation defaults or Cluster defaults; existing running jobs are not restarted. Embedded editors pick up mode changes through state refresh. Workstation mode forces local submission; Cluster mode exposes queue settings and runs executable discovery on first activation. --cluster still chooses the initial mode at each server startup. Mode is shared by clients connected to that server.

The banner labels are Feed and Hierarchy. Startup broken-link warnings display File not found instead of ENOENT.

### Persistent chrome and next-job controls (0.15.311)

Execution mode and defaults controls share one outer border. The top header stays sticky and the workspace footer is fixed within the central column; feed and hierarchy heights reserve its space, including short windows. The Feed/Hierarchy switch appears only with at least five pipeline jobs (drafts excluded), reverting to Feed if the count drops below five. Added SPA Select → 2D classification next-job definition.

### RELION 5.1 Auto-picking controls (0.15.312)

With the new amyloid FOM controls present in the native schema, Auto-picking follows the 5.1 tab layout, including Refs 2 and Amyloid. Amyloid is a fourth mutually exclusive picking radio option; its tab is hidden unless selected. LoG help refers to Refs 2. Older schemas retain the three-method editor and legacy amyloid controls. The capability check avoids interpreting the older do_amyloid option as the new independent method.

Source reviewed: 3dem/relion ver5.1 src/pipeline_jobs.cpp, including the four-method selection check and dedicated amyloid command branch.

### Feed and hierarchy layout refinements (0.15.313)

Next-job actions are anchored above the workspace footer so redraws cannot place them underneath it. Hierarchy nodes show the job title beside the icon on the first line and the job ID on the second. Full-size convergence plots include a top horizontal scrollbar synchronized with the bottom scrollbar and companion plots; scaled plots continue to fit without scrolling.

### Resolution-gated Dynamight suggestion (0.15.314)

The SPA Refine3D → Dynamight next-job button appears after a successful refinement with a measured resolution of 3 Å or better. Next-job conditions now support numeric `atMost`.

### Project-wide 3D next-job condition (0.15.316)

Next-job conditions can check `context.hasCompleted3DJob`, which detects a succeeded 3D initial reference, classification, or auto-refine job anywhere in the project.

### Retrospective masks in the hierarchy (0.15.317)

The hierarchy omits Mask creation inputs into 3D classification or auto-refine only when the receiving job is an ancestor of that Mask creation job. Pipeline data and other dependency views are preserved. Other cycles remain errors. Added the supplied SPA Extract → Refine3D next-job definition, gated by hasCompleted3DJob.

### Mask exception arrows and compact CTF preview controls (0.15.318)

Hierarchy mask exceptions are displayed as two opposite arrows, excluded from ranking. CTF draft Preview now includes defocus limits beside resolution limits, with shorter labels and a compact FFT box selector.

### Compact mask arrows and ordered LoG diameters (0.15.319)

Side-by-side retrospective mask arrows connect facing node edges on separate lanes. Vertical arrows route locally. LoG diameter edits clamp against the paired diameter, and sliders update their bounds together.

### Compact LoG preview (0.15.320)

Test picking and its status messages share the preview stage height. Diameter labels, compact four-character inputs, sliders and help buttons are aligned in inline rows.
