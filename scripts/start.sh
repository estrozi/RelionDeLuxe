#!/bin/sh
# Keep the scientific environment intact; avoid a second PATH lookup for Node
# when npm has already selected a working Node runtime.
set -eu
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
NODE=${RELIONDELUXE_NODE:-${npm_node_execpath:-}}
if [ -z "$NODE" ]; then NODE=$(command -v node || true); fi
if [ -z "$NODE" ] || [ ! -x "$NODE" ]; then
 echo 'RelionDeLuxe: Node.js not found. Set RELIONDELUXE_NODE to an absolute working Node.js executable path.' >&2
 exit 1
fi
probe_status=0
"$NODE" -e 'const v=process.versions.node; if (!v || Number(v.split(".")[0]) < 22) { console.error("RelionDeLuxe: Node.js " + (v || "unknown") + " at " + process.execPath + " is older than the recommended version 22; continuing with compatibility unverified."); process.exit(22); }' || probe_status=$?
if [ "$probe_status" -ne 0 ] && [ "$probe_status" -ne 22 ]; then
 if [ "$probe_status" -ne 22 ]; then
  echo "RelionDeLuxe: Node.js could not complete its runtime check: $NODE (exit $probe_status). See the error above." >&2
 fi
 echo 'Choose a working Node.js executable with RELIONDELUXE_NODE=/absolute/path/to/node, then run sh scripts/start.sh with your usual server arguments.' >&2
 echo 'Keep source /programs/sbgrid.shrc for RELION; modules are not required. The direct launcher avoids npm startup wrappers.' >&2
 exit 1
fi
exec "$NODE" "$ROOT/server.mjs" "$@"
