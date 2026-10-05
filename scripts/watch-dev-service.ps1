param(
  [Parameter(Mandatory = $true)][string]$ServiceName,
  [Parameter(Mandatory = $false)][string]$ServiceDirectory,
  [Parameter(Mandatory = $true)][int]$Port,
  [Parameter(Mandatory = $false)][string]$LogPath
)

$ErrorActionPreference = 'Continue'

$projectRoot = Split-Path -Parent $PSScriptRoot
if (-not $ServiceDirectory -or -not (Test-Path -LiteralPath $ServiceDirectory)) {
  $ServiceDirectory = Join-Path $projectRoot $ServiceName
}
if (-not $LogPath) {
  $runtimeDir = Join-Path $projectRoot '.dev-runtime'
  if (-not (Test-Path -LiteralPath $runtimeDir)) {
    New-Item -ItemType Directory -Path $runtimeDir -Force | Out-Null
  }
  $LogPath = Join-Path $runtimeDir "$ServiceName.log"
}

$mutexName = "Local\SCANMS-$ServiceName-dev-watcher"
$mutex = [System.Threading.Mutex]::new($false, $mutexName)

if (-not $mutex.WaitOne(0, $false)) {
  exit 0
}

try {
  while ($true) {
    $listening = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    if (-not $listening) {
      $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
      Add-Content -LiteralPath $LogPath -Value "[$timestamp] Starting $ServiceName on port $Port"
      Push-Location -LiteralPath $ServiceDirectory
      try {
        if ($ServiceName -eq 'backend') {
          & npm.cmd run start:dev *>> $LogPath
        } else {
          & npm.cmd run dev *>> $LogPath
        }
      } finally {
        Pop-Location
      }
      $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
      Add-Content -LiteralPath $LogPath -Value "[$timestamp] $ServiceName stopped; restarting in 2 seconds"
      Start-Sleep -Seconds 2
    } else {
      Start-Sleep -Seconds 3
    }
  }
} finally {
  $mutex.ReleaseMutex()
  $mutex.Dispose()
}
