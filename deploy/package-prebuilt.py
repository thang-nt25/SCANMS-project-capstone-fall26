"""Package compiled artifacts and a checksum manifest without private configuration."""
import hashlib
import json
from pathlib import Path
import tarfile

root = Path(__file__).resolve().parent.parent
manifest = {}
output = root / 'deploy/scanms-prebuilt.tar.gz'
with tarfile.open(output, 'w:gz') as archive:
    for app in ['backend', 'frontend']:
        for path in sorted((root / app / 'dist').rglob('*')):
            if not path.is_file():
                continue
            relative = f'{app}/deploy-dist/{path.relative_to(root / app / "dist").as_posix()}'
            archive.add(path, arcname=relative, recursive=False)
            manifest[relative] = hashlib.sha256(path.read_bytes()).hexdigest()
    for directory in ['backend/src', 'frontend/src', 'frontend/public']:
        for path in (root / directory).rglob('*'):
            if path.is_file():
                manifest[path.relative_to(root).as_posix()] = hashlib.sha256(path.read_bytes()).hexdigest()
(root / 'deploy/release-manifest.json').write_text(json.dumps(manifest, sort_keys=True), encoding='utf-8')
print(json.dumps({'files': len(manifest), 'archiveBytes': output.stat().st_size}))
