$ErrorActionPreference = 'Stop'
$taskRoot = $PSScriptRoot
$taskNode = (Get-Command node -ErrorAction Stop).Source
$taskLogDir = Join-Path $taskRoot 'artifacts/local-runtime'
New-Item -ItemType Directory -Path $taskLogDir -Force | Out-Null

function Test-ScanmsPort([int]$Port) {
    foreach ($taskAddress in @([System.Net.IPAddress]::Loopback, [System.Net.IPAddress]::IPv6Loopback)) {
        $taskClient = New-Object System.Net.Sockets.TcpClient($taskAddress.AddressFamily)
        try { $taskClient.Connect($taskAddress, $Port); return $true } catch {} finally { $taskClient.Dispose() }
    }
    return $false
}

if (-not (Test-ScanmsPort 3000)) {
    $taskBackendDir = Join-Path $taskRoot 'backend'
    if (-not (Test-Path -LiteralPath (Join-Path $taskBackendDir 'dist/main.js'))) {
        Push-Location $taskBackendDir
        try { & npm.cmd run build; if ($LASTEXITCODE -ne 0) { throw 'Backend build failed.' } } finally { Pop-Location }
    }
    Start-Process -FilePath $taskNode -ArgumentList 'scripts/run-local-server.cjs' -WorkingDirectory $taskBackendDir -WindowStyle Hidden -RedirectStandardOutput (Join-Path $taskLogDir 'backend.stdout.log') -RedirectStandardError (Join-Path $taskLogDir 'backend.stderr.log') | Out-Null
    Write-Host 'Started backend. Logs: artifacts/local-runtime/backend.*.log'
} else { Write-Host 'Port 3000 already active; no duplicate backend started.' }

if (-not (Test-ScanmsPort 5173)) {
    Start-Process -FilePath $taskNode -ArgumentList 'node_modules/vite/bin/vite.js','--host','localhost','--port','5173','--strictPort' -WorkingDirectory (Join-Path $taskRoot 'frontend') -WindowStyle Hidden -RedirectStandardOutput (Join-Path $taskLogDir 'frontend.stdout.log') -RedirectStandardError (Join-Path $taskLogDir 'frontend.stderr.log') | Out-Null
    Write-Host 'Started frontend: http://localhost:5173'
} else { Write-Host 'Port 5173 already active; no duplicate frontend started.' }
