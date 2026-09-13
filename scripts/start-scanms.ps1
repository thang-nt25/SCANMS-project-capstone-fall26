$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$runtimeDirectory = Join-Path $projectRoot '.dev-runtime'
New-Item -ItemType Directory -Path $runtimeDirectory -Force | Out-Null

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
  $arguments = @(
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-File', "`"$watcherScript`"",
    '-ServiceName', $service.Name,
    '-ServiceDirectory', "`"$($service.Directory)`"",
    '-Port', [string]$service.Port,
    '-LogPath', "`"$($service.Log)`""
  )
  Start-Process -FilePath 'powershell.exe' -ArgumentList $arguments -WindowStyle Hidden
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
  Write-Host 'Backend health: http://localhost:3000/api/health'
  exit 0
}

Write-Warning "Startup is taking longer than expected. Check logs in $runtimeDirectory"
exit 1
