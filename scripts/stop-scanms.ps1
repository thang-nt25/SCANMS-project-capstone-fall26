param(
  [switch]$StopRedis
)

$ErrorActionPreference = 'SilentlyContinue'

Write-Host 'Stopping SCANMS services (ports 3000, 5173)...' -ForegroundColor Yellow

$ports = @(3000, 5173)
if ($StopRedis) {
  $ports += 6379
}

foreach ($port in $ports) {
  $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
  foreach ($conn in $conns) {
    if ($conn.OwningProcess -and $conn.OwningProcess -ne 0 -and $conn.OwningProcess -ne $PID) {
      Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
      Write-Host "Killed process $($conn.OwningProcess) listening on port $port"
    }
  }
}

Get-CimInstance Win32_Process -Filter "Name = 'powershell.exe'" -ErrorAction SilentlyContinue |
  Where-Object { $_.CommandLine -like '*watch-dev-service.ps1*' -and $_.ProcessId -ne $PID } |
  ForEach-Object {
    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
    Write-Host "Stopped watcher process $($_.ProcessId)"
  }

Write-Host 'All SCANMS services have been stopped.' -ForegroundColor Green
