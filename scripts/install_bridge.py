#!/usr/bin/env python3
"""Add one adapter source file to an existing, matching RELION source tree.
Does not modify RELION algorithms or existing source files; does not build/install.
"""
import pathlib,sys
root=pathlib.Path(__file__).resolve().parents[1]
source=pathlib.Path(sys.argv[1]).resolve()
assert (source/'src/pipeliner.h').is_file(), 'Expected a RELION source tree'
s=(root/'native/deluxe_bridge.cpp').read_text()
s=s.replace('#include "json.hpp"',(root/'native/json.hpp').read_text().replace('#pragma once',''))
s=s.replace('#include "clone_continuation.hpp"',(root/'native/clone_continuation.hpp').read_text())
s=s.replace('#include "reschedule.hpp"',(root/'native/reschedule.hpp').read_text())
s=s.replace('#include "helical.hpp"',(root/'native/helical.hpp').read_text())
s=s.replace('#include "trash.hpp"',(root/'native/trash.hpp').read_text())
s=s.replace('#include "job_types.inc"',(root/'native/job_types.inc').read_text())
for include in ['browser_tomo.hpp','browser_picker.hpp','browser_selection.hpp','job_types-tomo.inc']:
    s=s.replace('#include \"'+include+'\"',(root/'native'/include).read_text())
target=source/'src/apps/deluxe_bridge.cpp'
if target.exists() and target.read_text()!=s:
    raise SystemExit('Refusing to overwrite a different adapter source; remove it explicitly first.')
target.write_text(s)
print('Added',target)
print('Reconfigure your existing RELION build, then: cmake --build <build-directory> --target deluxe_bridge -j 4')
print('The executable is named relion_deluxe_bridge. Do not rebuild or reinstall unrelated targets.')
