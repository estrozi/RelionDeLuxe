# Cluster execution

Start with `--cluster` or select Cluster in the GUI's execution settings. Configure Cluster defaults for your site's queue command, submission template and resource settings. These settings must match the scheduler and RELION installation on compute nodes.

Startup searches PATH for `mpirun.relion`, `mpirun` or `mpiexec` when MPI overrides are absent, and optionally for `relion_python_topaz`. Existing `RELION_MPIRUN` is preserved by cluster discovery. Missing optional tools produce guidance; invalid explicit overrides are rejected. SBGrid-specific MPI selection may take precedence as documented in configuration.md.

Use `RELIONDELUXE_MPIRUN=/absolute/path/to/launcher` only for a launcher compatible with your RELION build. Do not select a generic SBGrid dispatcher as a version-specific executable. Detection verifies availability, not ABI compatibility.

Native queue defaults include `RELION_QUEUE_USE`, `RELION_QUEUE_NAME`, `RELION_QSUB_COMMAND`, `RELION_QSUB_TEMPLATE`, and the resource/extra-field variables listed in configuration.md. Inspect Check command and the generated submission script before scheduling. Queue templates must load the scientific environment and use paths accessible on compute nodes; the web server's local environment alone cannot configure a remote worker.

CTF and LoG previews execute locally on the server host. Allow appropriate resources there or run previews on a workstation. No universal Slurm/PBS template is supplied as a substitute for site-specific configuration.
