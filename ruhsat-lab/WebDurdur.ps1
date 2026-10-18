$ErrorActionPreference = 'Stop'
$statePath = Join-Path $PSScriptRoot 'runtime\web-preview.json'
if (!(Test-Path -LiteralPath $statePath)) { Write-Host 'Kayitli web onizlemesi yok.'; return }
$state = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
$expectedTunnel = Join-Path $PSScriptRoot 'runtime\tools\cloudflared.exe'
$expectedPython = Join-Path $PSScriptRoot '.venv\Scripts\python.exe'
if ($state.tunnel_pid) {
    $tunnelProcess = Get-CimInstance Win32_Process -Filter "ProcessId = $([int]$state.tunnel_pid)"
    if ($tunnelProcess -and $tunnelProcess.ExecutablePath -eq $expectedTunnel -and $tunnelProcess.CommandLine -like '*--url http://127.0.0.1:8766*' -and $tunnelProcess.CommandLine -like '*--allowed-mail*') {
        Stop-Process -Id $tunnelProcess.ProcessId
    } elseif ($tunnelProcess) { throw 'Tunel islem kimligi dogrulanamadi; baska isleme dokunulmadi.' }
}
if ($state.server_pid) {
    $serverProcess = Get-CimInstance Win32_Process -Filter "ProcessId = $([int]$state.server_pid)"
    if ($serverProcess -and $serverProcess.ExecutablePath -eq $expectedPython -and $serverProcess.CommandLine -like '*uvicorn app:app*' -and $serverProcess.CommandLine -like '*--port 8766*') {
        Get-CimInstance Win32_Process -Filter "ParentProcessId = $([int]$state.server_pid)" | Where-Object {
            $_.Name -eq 'python.exe' -and $_.CommandLine -like '*uvicorn app:app*' -and $_.CommandLine -like '*--port 8766*'
        } | ForEach-Object { Stop-Process -Id $_.ProcessId }
        Stop-Process -Id $serverProcess.ProcessId -ErrorAction SilentlyContinue
    } elseif ($serverProcess) { throw 'Sunucu islem kimligi dogrulanamadi; baska isleme dokunulmadi.' }
}
Remove-Item -LiteralPath $statePath
Write-Host 'Web onizlemesi durduruldu. Yerel 8765 uygulamasi etkilenmedi.'
