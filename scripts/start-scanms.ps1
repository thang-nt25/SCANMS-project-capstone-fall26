param(
  [switch]$Wait,
  [switch]$Restart
)

$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$runtimeDirectory = Join-Path $projectRoot '.dev-runtime'
New-Item -ItemType Directory -Path $runtimeDirectory -Force | Out-Null

if ($Restart) {
  Write-Host 'Stopping existing SCANMS processes...' -ForegroundColor Yellow
  $ports = @(3000, 5173)
  foreach ($port in $ports) {
    $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    foreach ($conn in $conns) {
      if ($conn.OwningProcess -and $conn.OwningProcess -ne 0 -and $conn.OwningProcess -ne $PID) {
        Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
      }
    }
  }
  Get-CimInstance Win32_Process -Filter "Name = 'powershell.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -like '*watch-dev-service.ps1*' -and $_.ProcessId -ne $PID } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
  Start-Sleep -Seconds 1
}

# Auto-start Redis if not running
$redisPort = 6379
$redisReady = [bool](Get-NetTCPConnection -LocalPort $redisPort -State Listen -ErrorAction SilentlyContinue)
if (-not $redisReady) {
  $redisExe = "C:\Users\tuann\AppData\Local\Microsoft\WinGet\Packages\taizod1024.redis-windows-fork_Microsoft.Winget.Source_8wekyb3d8bbwe\Redis-8.10.1-Windows-x64-msys2\redis-server.exe"
  if (-not (Test-Path $redisExe)) {
    $redisCmd = Get-Command 'redis-server.exe' -ErrorAction SilentlyContinue
    if ($redisCmd) { $redisExe = $redisCmd.Source }
  }
  if ($redisExe -and (Test-Path $redisExe)) {
    $redisDir = Split-Path -Parent $redisExe
    Start-Process -FilePath $redisExe -WorkingDirectory $redisDir -WindowStyle Hidden
    Start-Sleep -Milliseconds 800
  }
}

$watcherScript = Join-Path $PSScriptRoot 'watch-dev-service.ps1'
$services = @(
  @{
    Name = 'backend'
    Directory = Join-Path $projectRoot 'backend'
    Port = 3000
    Log = Join-Path $runtimeDirectory 'backend.log'
  },
  @{
    Name = 'frontend'
    Directory = Join-Path $projectRoot 'frontend'
    Port = 5173
    Log = Join-Path $runtimeDirectory 'frontend.log'
  }
)

foreach ($service in $services) {
  $argStr = "-NoProfile -ExecutionPolicy Bypass -File `"$watcherScript`" -ServiceName $($service.Name) -ServiceDirectory `"$($service.Directory)`" -Port $($service.Port) -LogPath `"$($service.Log)`""
  Start-Process -FilePath 'powershell.exe' -ArgumentList $argStr -WindowStyle Hidden
}

$deadline = (Get-Date).AddSeconds(45)
do {
  $backendReady = [bool](Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue)
  $frontendReady = [bool](Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue)
  if ($backendReady -and $frontendReady) { break }
  Start-Sleep -Milliseconds 500
} while ((Get-Date) -lt $deadline)

if ($backendReady -and $frontendReady) {
  Write-Host 'SCANMS is ready: http://localhost:5173' -ForegroundColor Green
  Write-Host 'Backend health: http://localhost:3000/api/health' -ForegroundColor Cyan
  Write-Host 'Swagger docs:   http://localhost:3000/api/docs' -ForegroundColor Cyan
  if (-not $Wait) {
    exit 0
  }
} else {
  Write-Warning "Startup is taking longer than expected. Check logs in $runtimeDirectory"
  if (-not $Wait) {
    exit 1
  }
}

if ($Wait) {
  Write-Host 'Services are running. Keep this session alive. Press Ctrl+C to stop.' -ForegroundColor Yellow
  while ($true) {
    Start-Sleep -Seconds 2
  }
}
