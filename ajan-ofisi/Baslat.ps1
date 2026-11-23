$ErrorActionPreference = 'Stop'
$officeRoot = $PSScriptRoot
$officeScript = Join-Path $officeRoot 'runtime/server.cjs'
$officePort = Get-NetTCPConnection -LocalPort 8874 -State Listen -ErrorAction SilentlyContinue
if ($officePort) {
  $officeExisting = Get-CimInstance Win32_Process -Filter "ProcessId = $($officePort[0].OwningProcess)"
  if ($officeExisting.CommandLine.Replace('\','/') -notlike ('*' + $officeScript.Replace('\','/') + '*')) { throw '8874 portu baska bir uygulama tarafindan kullaniliyor. Mevcut uygulama kapatilmadi.' }
} else {
  $officeNode = (Get-Command node -ErrorAction Stop).Source
  $officeProcess = Start-Process -FilePath $officeNode -ArgumentList ('"' + $officeScript + '"') -WorkingDirectory $officeRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $officeRoot 'runtime/server.stdout.log') -RedirectStandardError (Join-Path $officeRoot 'runtime/server.stderr.log') -PassThru
  $officeProcess.Id | Set-Content (Join-Path $officeRoot 'runtime/server.pid')
}
Start-Process 'http://127.0.0.1:8874/'
