"""Read-only verification of source and artifact checksums on the VPS."""
import hashlib
import json
from pathlib import Path

root = Path('/opt/scanms')
manifest = json.loads((root / 'deploy/release-manifest.json').read_text())
different = [name for name, expected in manifest.items()
             if not (root / name).is_file() or hashlib.sha256((root / name).read_bytes()).hexdigest() != expected]
print(json.dumps({'verifiedFiles': len(manifest), 'mismatches': different}))
raise SystemExit(bool(different))
