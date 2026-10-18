$ErrorActionPreference = 'Stop'
$pidFile = Join-Path $PSScriptRoot 'runtime\server.pid'
if (Test-Path -LiteralPath $pidFile) {
    $serverProcessId = [int](Get-Content -LiteralPath $pidFile)
    $serverProcess = Get-CimInstance Win32_Process -Filter "ProcessId = $serverProcessId"
    $expectedExe = Join-Path $PSScriptRoot '.venv\Scripts\python.exe'
    if ($serverProcess -and $serverProcess.ExecutablePath -eq $expectedExe -and $serverProcess.CommandLine -like '*uvicorn app:app*' -and $serverProcess.CommandLine -like '*--port 8765*') {
        # Windows venv Python starts a child interpreter. Validate the parent
        # first, then stop only its matching server children.
        Get-CimInstance Win32_Process -Filter "ParentProcessId = $serverProcessId" | Where-Object {
            $_.Name -eq 'python.exe' -and $_.CommandLine -like '*uvicorn app:app*' -and $_.CommandLine -like '*--port 8765*'
        } | ForEach-Object { Stop-Process -Id $_.ProcessId }
        Stop-Process -Id $serverProcessId
        Write-Host 'OTOTR Ruhsat Lab durduruldu.'
    } else {
        Write-Host 'Bu projeye ait calisan sunucu bulunamadi. Baska isleme dokunulmadi.'
    }
}
