# Browser tomography support picking (experimental)

## Installation and starting

Rebuild the native bridge after installing this version:

    python3 scripts/build_bridge.py relion-source --output build

Restart the server in --tomo mode. Prepare a new Pick tomograms job with its tomogram set and an empty input-particles field. Run opens tomo_pick.html in editing mode instead of launching Napari. Existing browser jobs can be resumed from the inspector, including after server restarts. Finish creates particles.star and optimisation_set.star, marks the native job successful, and writes RELION_JOB_EXIT_SUCCESS.

This version does not schedule interactive picking. Finish picking first, then schedule downstream extraction. Existing native/imported particle files remain available in the read-only viewer; converting them into editable supports is not implemented.

## Editing

Choose a tomogram and X/Y/Z slice. Geometry is retained when switching tomograms or slices.

- **Particles:** click particle centers. Each click appends a point to the selected element.
- **Spheres:** click a center and set Radius in Å. Use New element before another vesicle. Clicking again with that sphere selected moves its center.
- **Filaments:** click ordered centerline vertices across slices. This first version samples the piecewise-linear centerline at the selected spacing; it does not fit a smooth spline.
- **Surfaces:** keep one slice direction, draw ordered vertices around a closed contour, change the slice, then draw another contour with the same winding. The contour closes implicitly. Parallel rings are resampled, their starts aligned, and connected by triangles. Ends remain open. This supports single, consistently wound contour rings, not branching/merging contours, holes or arbitrary topology. Use Flip surface normals if needed. Invalid/incomplete contours prevent Finish.

Supports can be mixed. Choose an element from the list to edit its radius or spacing, move it using Step (Å) and screen-relative arrow buttons, or delete it with all associated samples. Undo restores the most recent edit. Color is based on element ID. White control geometry denotes the selected element.

Save annotations periodically. A navigation warning protects unsaved browser changes, but forcibly closing the browser can still lose them. Save and finish job generates final particles. Concurrent browser windows use revision checks; reload rather than overwrite another window's changes.

## Sampling and metadata

Spheres use deterministic Fibonacci sampling, with approximate spacing derived from surface area. Surface triangles use barycentric sampling with a maximum edge subdivision set by spacing. These sampling distributions are not identical to native morphosamplers.

Coordinates are stored as centered Ångström positions, with the displayed volume dimensions and voxel spacing defining the transform. The native-style inverse ZYZ pre-rotation is used for supported poses; filament local axes follow the centerline. Check the exported poses on a known small dataset before using them for scientific refinement.

Every generated particle has:

    _rlnSupportStructureType
    _rlnSupportStructureElement

Types are particles, spheres, filaments and surfaces. IDs are unique within the saved support list. Particle-only outputs omit orientation columns. If support-derived poses are present, all rows share the STAR orientation columns; ordinary particle rows have identity rotations. Mixed oriented/unoriented outputs omit shared directional priors so no support prior is imposed on ordinary particles.

browser-tomo-supports.json is the authoritative editable geometry, tied to a hash of the source tomogram STAR file. Keep it with the job. RELION can read unknown STAR labels, but downstream tools that reconstruct metadata tables are not guaranteed to preserve custom columns. Do not rely on the two extra columns as the only copy of the support geometry.

Maximums: 10,000 elements; 200,000 generated particles; 64 contours per surface; 256 vertices per contour. Increase spacing or split the job for larger sets.

## Validation status

Geometry, Euler convention, serialization, stale-save protection, upstream viewer and existing gallery tests were run. Native bridge compilation and a real RELION STA extraction/refinement were not available in the development environment. This release needs workstation validation, particularly pose conventions, custom-column preservation and native pipeline completion.

Source conventions inspected: RELION ver5.0 get_particle_poses/{particles,spheres,filaments}.py and metadata_table.cpp. The ver5.0 general surface pose sampler is absent; contour meshing here is a RelionDeLuxe implementation.

## Rectangle cleaning

In editing mode, hold the middle mouse button and drag a rectangle. Samples whose crosses lie within the rectangle and current slice/depth window are excluded across all support elements of that tomogram. Other slices/tomograms are unaffected. Exclusions are saved with the geometry and honored by final STAR export. Merely changing slices or display settings preserves them. Translation (arrow buttons or repositioning a sphere center) preserves excluded sample identities. Sphere radius changes preserve its sampling and exclusions. Spacing and normal flips retain excluded indices; adding/removing filament or surface control points still resets those elements because their topology changes. Other elements retain their exclusions.

## Density optimization

Select a support and use Optm X/Y/Z to minimize the mean raw tomogram density at all its remaining crosses, including those outside the displayed slice. The axis perpendicular to the screen is disabled (Z view enables X and Y). Brightness and contrast sliders do not affect this objective; Invert negates raw density so minima correspond to darker values under the selected contrast.

Search ± (Å), initially 20 Å, bounds the displacement. A coarse search and two refinements select an improved position; this is a local positioning aid, not a guaranteed biological fit. Boundary results suggest reviewing the range. Only a lower mean is accepted. Translation retains exclusions and moves the support rigidly.

Optm R is available for spheres and searches radius within the same range, holding the center fixed. Optm R freezes the existing angular sampling and exclusions: only surviving crosses move radially. The fixed sampling persists through save/reload, repeated optimization and final export. Manual radius or spacing edits retain the fixed sampling; manual radius edits preserve exclusions. Undo restores the preceding geometry and exclusions; it remains available until another edit changes that support. Save annotations to persist the accepted result.

Optimization uses trilinear interpolation of the selected volume's raw voxels (MRC modes 0, 1, 2, 6 and 12). Candidates with particles outside the volume or on non-finite voxels are rejected. Searches are limited to 20,000 generated samples, 60 seconds, and a range of at most 1000 Å. Automated tests cover geometry, exclusions, objective improvement and float16 sampling; real-tomogram positioning quality requires user review.

Selecting an element focuses its center slice; changing X/Y/Z focuses that same center in the new direction. Spheres use their center; other supports use the bounding-box center of control points. This changes only the view, not coordinates, exclusions or saved geometry.

If optimization finds existing particles outside the volume, a confirmation dialog offers to exclude all such particles of the selected support. Non-finite voxels are reported separately and not removed by this action. Undo restores the exclusions; Save annotations persists them. Retry optimization after cleanup.

## Sphere probe
Selecting a sphere reveals a 256×256 inset at the bottom right. Drag its header to move it; drag its bottom-right resize handle to resize it. Press Update to sample the currently selected reconstructed/denoised source at the sphere surface. No automatic background recalculation occurs.

The probe is cylindrical equal-area: longitude −180° to +180° runs left to right, and sin(latitude) +1 to −1 runs top to bottom (+Z to −Z). Longitude zero points along +X and positive longitude toward +Y. This samples the surface, not a line-integral projection or thick shell. Raw values are trilinearly interpolated, including float16 inputs; grayscale uses the 2nd–98th percentile for visibility. Invalid or out-of-volume samples are magenta.

The probe samples the entire surface independently of particle spacing and excluded crosses, giving a positioning preview without changing particles or geometry. Resizing scales the existing preview temporarily and marks it outdated. Update resamples at the resolution fitting the available image area, maintaining a 2:1 aspect ratio, from 128×64 to 1024×512. Larger sizes require more time; the status reports the requested and completed sample dimensions. Changing the sphere or source marks the old image outdated until Update. Backend sampling is time-limited to 60 seconds. Automated sampling tests passed; visual positioning quality should be checked on real tomograms.

The X/Y/Z radio buttons below the probe canvas select the pole axis (default Z). Press Update after changing it. The image top/bottom correspond to the positive/negative pole; longitude zero points along Y for X poles, Z for Y poles, and X for Z poles. The annotation describes the rendered image until it is updated. This does not change the main slice direction or support geometry.

## Probe particle rotations
Show particles overlays the selected sphere's surviving crosses on an up-to-date probe image. Left/right rigidly rotate around the selected pole axis. Up/down rotate around the perpendicular equatorial axis, moving particles near the projection center up/down; this is a true 3D rotation, not a uniform planar shift. Distances between particles, radius and excluded identities are preserved. The numeric Step (°) defaults to 5.

Rotations redraw crosses immediately without resampling density. They update the main viewer and saved/exported coordinates and normals. Save annotations persists orientation; Undo restores the preceding rotation. Controls require an up-to-date probe and an editable job. Changing the projection poles still requires Update. Projection distortions mean apparent 2D distances need not remain constant, even though 3D distances do.

## Keep-only rectangles
Middle-drag in the probe removes enclosed particles of the selected sphere. Shift+middle-drag keeps enclosed particles and offers a keep/delete count confirmation before excluding the others. The probe must be current with Show particles enabled; its rectangle is a planar region and does not wrap across the longitude seam. Undo restores probe exclusions.

Shift+middle-drag in the main density canvas keeps enclosed visible particles and removes the others in the current slice/depth window, across supports in that tomogram. Off-slice particles remain untouched. Confirmation states this scope and counts. Save annotations persists either action; geometry and existing deletions are preserved.

## Explicit sphere sampling (0.15.196)
New spheres generate their initial particles once. Subsequent center/radius/spacing changes retain the same particle identities and exclusions. Radius changes move surviving particles radially; spacing changes apply only when Resample sphere is clicked. Resample sphere replaces the pattern using the current radius and spacing; Clean sphere removes all particles while retaining the sphere. Both ask for confirmation.

Put ptcls at local minima is enabled only for a current probe in an editable job. It replaces the sphere's particles after confirmation, using strict 8-neighbor minima of raw projected density, with periodic longitude. Flat plateaus, the first/last polar rows and pixels adjoining invalid values are skipped. Results depend on probe resolution and can include noise minima; no spacing filter is applied. The explicit directions persist through saving, rotation, radius changes and STAR export. Undo restores the previous particles; Save annotations persists changes.

## Inversion and brush (0.15.198)
The main Invert checkbox also reverses probe grayscale and makes minima under the displayed contrast correspond to maxima of raw density. This uses cached values and does not need Update; brightness/contrast clipping does not alter extrema detection. The inset now starts at 512×512.

Enable Erase (10px) with Show particles on and an up-to-date probe. Left-click or drag removes crosses within 10 CSS screen pixels of the pointer path, including between successive mouse events. This affects the selected sphere only. Release commits the stroke; Undo restores it. Cancelled drags do not commit. Save annotations persists deletions. Middle-drag rectangle tools remain available.

## Unified controls (0.15.199)
There is one Undo button. It restores the most recent geometry/particle edit across the editor, including point addition, element deletion, movement, radius/spacing changes, resampling, cleaning and optimization. It is single-step, with no redo, and does not undo a finished job or a view change. Save annotations persists the restored state.

The main Crosses checkbox controls both main-view and probe crosses. The separate probe Show particles checkbox is removed. Both views require Crosses to be visible for particle cleaning.

## Slice and longitude guides
When main view direction and projection pole axis match, an up-to-date probe shows a yellow horizontal line at the current slice's equal-area latitude. It is hidden when the slice does not intersect the selected sphere. Hovering over the probe draws a white arrow from the projected sphere center to that longitude on the visible sphere cross-section. Elements must be enabled for the main arrow; Crosses visibility does not affect the yellow line. Guides update without voxel recalculation and do not change particles.

Optm X/Y/Z/R and probe placement consistently seek minima under the current contrast. Invert reverses the density sign. The placement button always reads Put ptcls at local minima. Changing Invert during optimization discards that in-flight result rather than applying a move under the previous contrast.

Home centers the slice on the active sphere (unless a text/form control has keyboard focus). Main-canvas middle-drag and Shift+middle-drag now affect only the selected support within the current depth window; another support’s particles remain unchanged.
