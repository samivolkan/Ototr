$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
if (-not (Test-Path -LiteralPath '.\.venv\Scripts\python.exe')) {
    $bundledPython = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'
    if (Test-Path -LiteralPath $bundledPython) {
        & $bundledPython -m venv .venv
    } else {
        py -3.12 -m venv .venv
    }
    if ($LASTEXITCODE -ne 0) { throw 'Python 3.12 kurulumu gerekiyor.' }
}
& '.\.venv\Scripts\python.exe' -m pip install -r requirements-lock.txt
if ($LASTEXITCODE -ne 0) { throw 'Paket kurulumu tamamlanamadi.' }
& '.\.venv\Scripts\python.exe' setup_models.py
if ($LASTEXITCODE -ne 0) { throw 'Model kurulumu tamamlanamadi.' }
& '.\.venv\Scripts\python.exe' make_sample.py
Write-Host 'Kurulum tamamlandi. Baslat.cmd dosyasini acabilirsiniz.'
