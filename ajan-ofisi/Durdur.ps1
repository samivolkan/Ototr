$officePidFile = Join-Path $PSScriptRoot 'runtime/server.pid'
if (Test-Path -LiteralPath $officePidFile) {
  $officeProcessId = [int](Get-Content -LiteralPath $officePidFile)
  $officeProcess = Get-CimInstance Win32_Process -Filter "ProcessId = $officeProcessId"
  $officeScript = Join-Path $PSScriptRoot 'runtime/server.cjs'
  if ($officeProcess -and $officeProcess.CommandLine.Replace('\','/') -like ('*' + $officeScript.Replace('\','/') + '*')) { Stop-Process -Id $officeProcessId }
}
