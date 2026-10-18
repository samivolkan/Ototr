param([string]$Email, [switch]$PublicTest)
$ErrorActionPreference = 'Stop'
if (!$PublicTest -and $Email -notmatch '^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$') { throw 'E-posta veya acikca -PublicTest secimi gerekli.' }
$runtimeDir = Join-Path $PSScriptRoot 'runtime'
$toolDir = Join-Path $runtimeDir 'tools'
$statePath = Join-Path $runtimeDir 'web-preview.json'
$cloudflared = Join-Path $toolDir 'cloudflared.exe'
$python = Join-Path $PSScriptRoot '.venv\Scripts\python.exe'
$expectedHash = '4d2490e74082c5d48dbfedaf92576fa5bd1702379ab88eb7faa0cfbe8dc891b6'
if (!(Test-Path -LiteralPath $python)) { throw 'Once Kurulum.ps1 ile yerel kurulumu tamamlayin.' }
if (Test-Path -LiteralPath $statePath) { throw 'Once WebDurdur.ps1 ile mevcut web onizlemesini durdurun.' }
if (Get-NetTCPConnection -State Listen -LocalPort 8766 -ErrorAction SilentlyContinue) { throw '8766 portu kullanimda; mevcut isleme dokunulmadi.' }
New-Item -ItemType Directory -Path $toolDir -Force | Out-Null
if (!(Test-Path -LiteralPath $cloudflared)) {
    Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/download/2026.10.1/cloudflared-windows-amd64.exe' -OutFile $cloudflared
}
if ((Get-FileHash -LiteralPath $cloudflared -Algorithm SHA256).Hash.ToLowerInvariant() -ne $expectedHash) { throw 'Cloudflared SHA256 dogrulamasi basarisiz.' }
if ((& $cloudflared tunnel --help | Out-String) -notmatch 'allowed-mail') { throw 'Bu surum e-posta korumasini desteklemiyor; yayin baslatilmadi.' }
$previousOrigin = $env:OTOTR_PREVIEW_ORIGIN
$previousAccess = $env:OTOTR_PREVIEW_ACCESS
try {
    $tunnelArgs = @('tunnel', '--no-autoupdate', '--url', 'http://127.0.0.1:8766')
    if (!$PublicTest) { $tunnelArgs += @('--allowed-mail', $Email) }
    $tunnel = Start-Process -FilePath $cloudflared -ArgumentList $tunnelArgs -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -PassThru -RedirectStandardError (Join-Path $runtimeDir 'web-tunnel.log') -RedirectStandardOutput (Join-Path $runtimeDir 'web-tunnel.stdout.log')
    $state = @{ tunnel_pid=$tunnel.Id; server_pid=$null; url=$null; access_mode=$(if ($PublicTest) {'public_test'} else {'email_protected_preview'}) }
    $state | ConvertTo-Json | Set-Content -LiteralPath $statePath -Encoding UTF8
    for ($attempt=0; $attempt -lt 90; $attempt++) {
        Start-Sleep -Milliseconds 500
        $tunnel.Refresh()
        if ($tunnel.HasExited) { throw 'E-posta korumali tunel baslatilamadi. runtime/web-tunnel.log dosyasini kontrol edin.' }
        $logText = Get-Content -LiteralPath (Join-Path $runtimeDir 'web-tunnel.log') -Raw -ErrorAction SilentlyContinue
        if ([string]::IsNullOrEmpty($logText)) { continue }
        $match = [regex]::Match($logText, 'https://[a-z0-9-]+\.trycloudflare\.com')
        if ($match.Success) { $state.url=$match.Value; break }
    }
    if (!$state.url) { throw 'Tunel adresi alinamadi.' }
    $env:OTOTR_PREVIEW_ORIGIN = $state.url
    $env:OTOTR_PREVIEW_ACCESS = $state.access_mode
    $server = Start-Process -FilePath $python -ArgumentList @('-m', 'uvicorn', 'app:app', '--host', '127.0.0.1', '--port', '8766', '--no-access-log', '--log-level', 'warning') -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -PassThru -RedirectStandardError (Join-Path $runtimeDir 'web-server.log') -RedirectStandardOutput (Join-Path $runtimeDir 'web-server.stdout.log')
    $state.server_pid = $server.Id
    $state | ConvertTo-Json | Set-Content -LiteralPath $statePath -Encoding UTF8
    $ready = $false
    for ($attempt=0; $attempt -lt 90; $attempt++) {
        Start-Sleep -Milliseconds 500
        $server.Refresh()
        if ($server.HasExited) { throw 'Web OCR sunucusu baslatilamadi.' }
        try {
            $health = Invoke-RestMethod -Uri 'http://127.0.0.1:8766/api/health' -TimeoutSec 2
            if ($health.status -eq 'error') { throw 'OCR modelleri baslatilamadi.' }
            if ($health.status -eq 'ready' -and $health.access_mode -eq $state.access_mode) { $ready=$true; break }
        } catch { if ($attempt -eq 89) { throw } }
    }
    if (!$ready) { throw 'Web OCR motoru zamaninda hazir olmadi.' }
    Write-Host ('Web test adresi: ' + $state.url)
    Write-Host ('Erisim modu: ' + $state.access_mode + '. Bilgisayar ve iki arka plan islemi acik kalmali.')
    Write-Host 'Bitirmek icin WebDurdur.ps1 calistirin. Yeniden baslatinca adres degisir.'
} catch {
    & (Join-Path $PSScriptRoot 'WebDurdur.ps1')
    throw
} finally {
    $env:OTOTR_PREVIEW_ORIGIN = $previousOrigin
    $env:OTOTR_PREVIEW_ACCESS = $previousAccess
}
