"""Run on the VPS only after the old backend has been suspended."""
import os
from pathlib import Path

target = Path('/opt/scanms/deploy/backend.env')
rows = target.read_text().splitlines()
assert sum(row.startswith('DISABLE_SCHEDULED_JOBS=') for row in rows) == 1
rows = ['DISABLE_SCHEDULED_JOBS="false"' if row.startswith('DISABLE_SCHEDULED_JOBS=') else row for row in rows]
temporary = target.with_suffix('.env.next')
temporary.write_text('\n'.join(rows) + '\n')
temporary.chmod(0o600)
os.replace(temporary, target)
print('VPS scheduled jobs enabled in configuration; other settings preserved.')
