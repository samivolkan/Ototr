$ErrorActionPreference = 'Stop'
$testRoot = Join-Path $PSScriptRoot '..\tests\looker'
$testRoot = (Resolve-Path -LiteralPath $testRoot).Path

if (-not (Test-Path -LiteralPath (Join-Path $testRoot 'node_modules'))) {
  Write-Host 'Looker test bağımlılıkları kuruluyor...'
  npm install --prefix $testRoot
}

Write-Host 'OTOTR Looker test ortamı açılıyor:'
Write-Host 'http://127.0.0.1:43821/index.html#looker'
npm run serve --prefix $testRoot
