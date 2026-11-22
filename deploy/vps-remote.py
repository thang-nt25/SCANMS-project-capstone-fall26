"""Private SSH transport for the user-authorized SCANMS VPS migration."""
import argparse
import json
import os
from pathlib import Path
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
sys.stderr.reconfigure(encoding='utf-8', errors='replace')

sys.path.insert(0, str(Path(os.environ['TEMP']) / 'scanms-ssh-runtime'))
import paramiko

base = Path(__file__).resolve().parent
parser = argparse.ArgumentParser()
parser.add_argument('operation', choices=['exec', 'upload'])
parser.add_argument('source')
parser.add_argument('destination', nargs='?')
parser.add_argument('--timeout', type=int, default=60)
args = parser.parse_args()
config = json.loads((base / 'vps-access.local.json').read_text(encoding='utf-8-sig'))
client = paramiko.SSHClient()
known = base / 'vps-known-hosts.local'
if known.exists():
    client.load_host_keys(str(known))
client.set_missing_host_key_policy(paramiko.RejectPolicy())
try:
    client.connect(config['host'], port=int(config.get('port', 22)),
                   username=config['username'], password=config['password'],
                   look_for_keys=False, allow_agent=False, timeout=15,
                   auth_timeout=15, banner_timeout=15)
    client.save_host_keys(str(known))
    if args.operation == 'upload':
        if not args.destination:
            raise ValueError('Remote destination is required')
        with client.open_sftp() as sftp:
            sftp.put(args.source, args.destination)
        print('Uploaded successfully')
    else:
        _, output, error = client.exec_command(args.source, timeout=args.timeout)
        print(output.read().decode('utf-8', errors='replace'), end='')
        print(error.read().decode('utf-8', errors='replace'), end='', file=sys.stderr)
        sys.exit(output.channel.recv_exit_status())
except Exception as error:
    print('SSH failed: ' + type(error).__name__ + ': ' + str(error).replace(config.get('password') or '\0', '[REDACTED]'), file=sys.stderr)
    sys.exit(1)
finally:
    client.close()
