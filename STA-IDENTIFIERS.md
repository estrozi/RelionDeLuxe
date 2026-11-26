# STA particle identifiers after joining branches

Classification branches can retain the same particle names while refining different
positions. Joining them can produce repeated `_rlnTomoParticleName` values.
`--remove_duplicates` removes close positions (its threshold is in Angstroms);
it does not renumber the remaining particles. Re-extraction can consequently
write different particles to the same stack filename.

RelionDeLuxe warns about repeated names when inspecting STA particle inputs for
Subset selection, Extract subtomos, Reconstruct particle and refinement jobs,
including particle files reached through an optimisation set. It reports counts
and a few row examples. This is an input-verification warning, not an automatic
repair. The existing metadata-size inspection limit still applies. Pending files
are checked when they become available through the usual preflight workflow.

## Reproducible recovery with native RELION commands

Keep the existing classification, selection, join and distance-based duplicate
removal results. Prepare a new input copy AFTER the final duplicate removal and
BEFORE re-extraction. From the project directory, using a new folder name:

```sh
mkdir RenamedForExtraction
relion_star_handler --i Select/job108/particles.star --o RenamedForExtraction/no_image.star --remove_column rlnImageName
relion_star_handler --i RenamedForExtraction/no_image.star --o RenamedForExtraction/particles.star --remove_column rlnTomoParticleName
```

These commands do not change the original selection. They remove columns, not
particle rows. RELION's ParticleSet reader generates unique tomogram/sequence
names when the particle-name column is absent.

Create a NEW Extract subtomos job with direct entries:

- Particles: `RenamedForExtraction/particles.star`
- Tomograms: the same tomogram set used for the original extraction
- Other scientific extraction settings: as intended for this stage

Use the NEW extraction's optimisation set for subsequent jobs. Do not continue
the old extraction into the same output folder, and do not rename columns in its
already-extracted output as a substitute for re-extracting.

This procedure applies to the supplied case, whose trajectory input is empty.
If using polishing/motion trajectories, particle names may link to those records;
renaming requires consistent trajectory handling too. Do not use this recipe
unchanged for such a dataset.

The two support-structure columns need not be removed. SPA can also contain
repeated particle references, but this particular tomogram-name/stack-output
collision check is specific to STA.
