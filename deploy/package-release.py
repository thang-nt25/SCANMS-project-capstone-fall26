"""Build an allow-listed source archive; excludes env files, keys and user data."""
import hashlib
import json
from pathlib import Path
import tarfile

root = Path(__file__).resolve().parent.parent
files = set()
for directory in ['backend/src', 'frontend/src', 'frontend/public']:
    files.update(path for path in (root / directory).rglob('*') if path.is_file())
for directory, names in {
    'backend': ['package.json', 'package-lock.json', '.npmrc', '.dockerignore',
                'Dockerfile.production', 'prisma.config.ts', 'tsconfig.json',
                'tsconfig.build.json', 'nest-cli.json', 'prisma/schema.prisma'],
    'frontend': ['package.json', 'package-lock.json', '.dockerignore',
                 'Dockerfile.production', 'Dockerfile.prebuilt', 'nginx.production.conf', 'index.html',
                 'vite.config.ts', 'tsconfig.json', 'tsconfig.app.json', 'tsconfig.node.json'],
    'deploy': ['compose.production.yml', 'compose.prebuilt.yml', 'Caddyfile',
               'bootstrap-ubuntu.sh', 'build-prebuilt-vps.sh', 'smoke-vps.py'],
}.items():
    for name in names:
        files.add(root / directory / name)

output = root / 'deploy' / 'scanms-release.tar.gz'
manifest = {}
for path in files:
    if path.is_symlink() or not path.is_file():
        raise RuntimeError('Missing or unexpected file: ' + str(path.relative_to(root)))
    if path.name.startswith('.env') or path.suffix.lower() in ['.key', '.pem', '.pfx', '.p12']:
        raise RuntimeError('Private file rejected: ' + str(path.relative_to(root)))
    manifest[path.relative_to(root).as_posix()] = hashlib.sha256(path.read_bytes()).hexdigest()
with tarfile.open(output, 'w:gz') as archive:
    for relative in sorted(manifest):
        archive.add(root / relative, arcname=relative, recursive=False)
digest = hashlib.sha256(output.read_bytes()).hexdigest()
print(json.dumps({'archive': str(output.relative_to(root)), 'files': len(manifest),
                  'bytes': output.stat().st_size, 'sha256': digest}))
