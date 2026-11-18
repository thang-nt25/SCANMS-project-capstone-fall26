"""Check running container artifacts against the uploaded manifest; print no private data."""
import hashlib
import json
from pathlib import Path
import subprocess

root = Path('/opt/scanms')
manifest = json.loads((root / 'deploy/release-manifest.json').read_text())
for app, prefix in [('backend', '/app/dist/'), ('frontend', '/usr/share/nginx/html/')]:
    marker = f'{app}/deploy-dist/'
    wanted = {prefix + name[len(marker):]: digest for name, digest in manifest.items() if name.startswith(marker)}
    result = subprocess.run(['docker','exec',f'scanms-{app}-1','sha256sum',*wanted], capture_output=True,text=True,check=True)
    actual = {line.split(None,1)[1].strip(): line.split(None,1)[0] for line in result.stdout.splitlines()}
    different = [name for name,digest in wanted.items() if actual.get(name) != digest]
    print(json.dumps({'container':app,'checkedFiles':len(wanted),'mismatches':different}))
    if different:
        raise SystemExit(1)
