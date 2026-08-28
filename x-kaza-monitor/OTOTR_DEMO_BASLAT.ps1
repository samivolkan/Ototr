[CmdletBinding()]
param(
    [switch]$NoBrowser,
    [switch]$ExitAfterHealth,
    [switch]$SkipInstall,
    [int]$HealthTimeoutSeconds = 60,
    [int]$PreferredPort = 8787
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)

$script:ServerProcess = $null
$script:LauncherLog = $null
$script:ServerOutputLog = $null
$script:ServerErrorLog = $null

function Write-Info {
    param([string]$Message)
    Write-Host "[BİLGİ] $Message" -ForegroundColor Cyan
    Write-LauncherLog "BİLGİ: $Message"
}

function Write-Success {
    param([string]$Message)
    Write-Host "[TAMAM] $Message" -ForegroundColor Green
    Write-LauncherLog "TAMAM: $Message"
}

function Write-WarningMessage {
    param([string]$Message)
    Write-Host "[UYARI] $Message" -ForegroundColor Yellow
    Write-LauncherLog "UYARI: $Message"
}

function Write-LauncherLog {
    param([string]$Message)
    if (-not $script:LauncherLog) { return }
    $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss.fff'
    Add-Content -LiteralPath $script:LauncherLog -Value "[$timestamp] $Message" -Encoding UTF8
}

function Get-Health {
    param(
        [int]$Port,
        [int]$TimeoutSeconds = 2
    )

    $baseUrl = "http://127.0.0.1:$Port"
    try {
        $response = Invoke-WebRequest -Uri "$baseUrl/api/health" -UseBasicParsing -TimeoutSec $TimeoutSeconds -Headers @{ Accept = 'application/json' }
        $payload = $response.Content | ConvertFrom-Json
        $healthy = $response.StatusCode -eq 200 `
            -and $payload.ok -eq $true `
            -and $payload.data.status -eq 'ok' `
            -and $payload.data.service -eq 'ototr-x-kaza-monitor'
        return [PSCustomObject]@{
            Healthy = $healthy
            BaseUrl = $baseUrl
            StatusCode = $response.StatusCode
            Mode = $payload.data.mode
        }
    }
    catch {
        return [PSCustomObject]@{
            Healthy = $false
            BaseUrl = $baseUrl
            StatusCode = $null
            Mode = $null
        }
    }
}

function Test-LoopbackPortFree {
    param([int]$Port)

    $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
    try {
        $listener.Start()
        return $true
    }
    catch {
        return $false
    }
    finally {
        try { $listener.Stop() } catch { }
    }
}

function Get-PortOwner {
    param([int]$Port)

    try {
        if (Get-Command Get-NetTCPConnection -ErrorAction SilentlyContinue) {
            $connection = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
                Select-Object -First 1
            if ($connection) {
                $processName = 'bilinmiyor'
                try {
                    $processName = (Get-Process -Id $connection.OwningProcess -ErrorAction Stop).ProcessName
                }
                catch { }
                return [PSCustomObject]@{
                    Pid = [int]$connection.OwningProcess
                    ProcessName = $processName
                }
            }
        }
    }
    catch { }

    try {
        $pattern = '^\s*TCP\s+\S+:' + [Regex]::Escape([string]$Port) + '\s+\S+\s+LISTENING\s+(\d+)\s*$'
        foreach ($line in (& netstat.exe -ano -p tcp 2>$null)) {
            if ($line -match $pattern) {
                $ownerPid = [int]$Matches[1]
                $processName = 'bilinmiyor'
                try {
                    $processName = (Get-Process -Id $ownerPid -ErrorAction Stop).ProcessName
                }
                catch { }
                return [PSCustomObject]@{
                    Pid = $ownerPid
                    ProcessName = $processName
                }
            }
        }
    }
    catch { }

    return $null
}

function Open-DemoBrowser {
    param([string]$Url)
    if ($NoBrowser) {
        Write-Info "Tarayıcı açma kapalı; doğrulanan adres: $Url"
        return
    }
    Start-Process $Url
    Write-Success "Varsayılan tarayıcı açıldı: $Url"
}

function Stop-LocalServer {
    if ($script:ServerProcess -and -not $script:ServerProcess.HasExited) {
        try {
            Stop-Process -Id $script:ServerProcess.Id -Force -ErrorAction SilentlyContinue
            $script:ServerProcess.WaitForExit(5000)
        }
        catch { }
    }
}

function Show-LogTail {
    param(
        [string]$Path,
        [string]$Title
    )
    if (-not $Path -or -not (Test-Path -LiteralPath $Path)) { return }
    $tail = Get-Content -LiteralPath $Path -Tail 20 -ErrorAction SilentlyContinue
    if (-not $tail) { return }
    Write-Host ""
    Write-Host "$Title (son satırlar):" -ForegroundColor DarkYellow
    $tail | ForEach-Object { Write-Host "  $_" }
}

try {
    $moduleRoot = (Resolve-Path -LiteralPath $PSScriptRoot).Path
    $serverRoot = Join-Path $moduleRoot 'server'
    $envExamplePath = Join-Path $serverRoot '.env.example'
    $envPath = Join-Path $serverRoot '.env'
    $logsRoot = Join-Path $serverRoot 'logs'

    if (-not (Test-Path -LiteralPath $serverRoot -PathType Container)) {
        throw "Sunucu klasörü bulunamadı: $serverRoot"
    }

    New-Item -ItemType Directory -Path $logsRoot -Force | Out-Null
    $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    $script:LauncherLog = Join-Path $logsRoot "ototr-demo-$stamp-launcher.log"
    $script:ServerOutputLog = Join-Path $logsRoot "ototr-demo-$stamp-server-out.log"
    $script:ServerErrorLog = Join-Path $logsRoot "ototr-demo-$stamp-server-error.log"
    New-Item -ItemType File -Path $script:LauncherLog -Force | Out-Null

    Write-Host ""
    Write-Host 'OtoTR X Kaza Monitor — Windows Yerel Demo' -ForegroundColor White
    Write-Host '================================================' -ForegroundColor DarkGray
    Write-Info "Modül klasörü: $moduleRoot"

    $nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
    if (-not $nodeCommand) {
        throw 'Node.js bulunamadı. Node.js 20 veya üzerini kurun, ardından bu dosyayı yeniden çift tıklayın.'
    }

    $nodeVersionText = (& $nodeCommand.Source --version).Trim().TrimStart('v')
    $nodeMajor = [int]($nodeVersionText.Split('.')[0])
    if ($nodeMajor -lt 20) {
        throw "Node.js sürümü yetersiz: v$nodeVersionText. Node.js 20 veya üzerini kurun."
    }
    Write-Success "Node.js v$nodeVersionText bulundu."

    $npmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue
    if (-not $npmCommand) {
        $npmCommand = Get-Command npm -ErrorAction SilentlyContinue
    }
    if (-not $npmCommand) {
        throw 'npm bulunamadı. Node.js 20+ kurulumunu onarın veya yeniden kurun.'
    }
    $npmVersionText = (& $npmCommand.Source --version).Trim()
    Write-Success "npm v$npmVersionText bulundu."

    if (-not (Test-Path -LiteralPath $envPath -PathType Leaf)) {
        if (-not (Test-Path -LiteralPath $envExamplePath -PathType Leaf)) {
            throw ".env oluşturulamadı; örnek dosya bulunamadı: $envExamplePath"
        }
        Copy-Item -LiteralPath $envExamplePath -Destination $envPath
        Write-Success 'server/.env dosyası .env.example üzerinden oluşturuldu.'
    }
    else {
        Write-Info 'Mevcut server/.env korundu; gizli değerler okunmadı veya ekrana yazılmadı.'
    }

    $selectedPort = $null
    $existingInstance = $null
    $maximumPort = [Math]::Min(65535, $PreferredPort + 20)
    foreach ($candidatePort in $PreferredPort..$maximumPort) {
        $candidateHealth = Get-Health -Port $candidatePort -TimeoutSeconds 1
        if ($candidateHealth.Healthy) {
            $existingInstance = $candidateHealth
            $selectedPort = $candidatePort
            break
        }
        if (Test-LoopbackPortFree -Port $candidatePort) {
            $selectedPort = $candidatePort
            break
        }
        if ($candidatePort -eq $PreferredPort) {
            $owner = Get-PortOwner -Port $candidatePort
            if ($owner) {
                Write-WarningMessage "Tercih edilen $candidatePort portu dolu: PID=$($owner.Pid), proses=$($owner.ProcessName). Güvenli alternatif aranıyor."
            }
            else {
                Write-WarningMessage "Tercih edilen $candidatePort portu dolu; proses bilgisi alınamadı. Güvenli alternatif aranıyor."
            }
        }
    }

    if (-not $selectedPort) {
        throw "$PreferredPort-$maximumPort aralığında kullanılabilir yerel port bulunamadı. Açık uygulamaları kapatıp yeniden deneyin."
    }

    if ($existingInstance) {
        $owner = Get-PortOwner -Port $selectedPort
        if ($owner) {
            Write-Success "OtoTR demo zaten çalışıyor: PID=$($owner.Pid), proses=$($owner.ProcessName), port=$selectedPort."
        }
        else {
            Write-Success "OtoTR demo zaten çalışıyor: port=$selectedPort."
        }
        Open-DemoBrowser -Url $existingInstance.BaseUrl
        Write-Info "Log: $script:LauncherLog"
        exit 0
    }

    if ($selectedPort -ne $PreferredPort) {
        Write-WarningMessage "Demo $PreferredPort yerine $selectedPort portunda başlatılacak."
    }

    $tesseractPackage = Join-Path $serverRoot 'node_modules\tesseract.js\package.json'
    if (-not (Test-Path -LiteralPath $tesseractPackage -PathType Leaf)) {
        if ($SkipInstall) {
            throw 'node_modules/tesseract.js bulunamadı ve -SkipInstall kullanıldı. Önce npm install çalıştırın.'
        }
        Write-Info 'İlk kurulum için npm install çalıştırılıyor...'
        Push-Location $serverRoot
        try {
            & $npmCommand.Source install --no-audit --no-fund 2>&1 |
                Tee-Object -FilePath $script:LauncherLog -Append
            $installExitCode = $LASTEXITCODE
        }
        finally {
            Pop-Location
        }
        if ($installExitCode -ne 0) {
            throw "npm install başarısız oldu (çıkış kodu: $installExitCode). İnternet bağlantısını ve logu kontrol edin."
        }
        Write-Success 'npm bağımlılıkları hazır.'
    }
    else {
        Write-Info 'npm bağımlılıkları zaten mevcut.'
    }

    # Bu değerler yalnız başlatılan çocuk sürece uygulanır. Mevcut .env içindeki
    # X/OpenAI/API anahtarları değiştirilmez, kaynak koda veya loga yazılmaz.
    $env:OTOTR_LOCAL_DEMO = '1'
    $env:HOST = '127.0.0.1'
    $env:PORT = [string]$selectedPort
    $env:PUBLIC_BASE_URL = "http://127.0.0.1:$selectedPort"
    $env:DEMO_MODE = 'true'

    Write-Info "Sunucu başlatılıyor: http://127.0.0.1:$selectedPort"
    $serverProcessArguments = @{
        FilePath = $nodeCommand.Source
        ArgumentList = @('src/server.mjs')
        WorkingDirectory = $serverRoot
        NoNewWindow = $true
        PassThru = $true
        RedirectStandardOutput = $script:ServerOutputLog
        RedirectStandardError = $script:ServerErrorLog
    }
    $script:ServerProcess = Start-Process @serverProcessArguments

    $deadline = (Get-Date).AddSeconds($HealthTimeoutSeconds)
    $health = $null
    while ((Get-Date) -lt $deadline) {
        if ($script:ServerProcess.HasExited) {
            throw "Sunucu sağlık kontrolünden önce kapandı (çıkış kodu: $($script:ServerProcess.ExitCode))."
        }
        $health = Get-Health -Port $selectedPort -TimeoutSeconds 2
        if ($health.Healthy) { break }
        Start-Sleep -Milliseconds 750
    }

    if (-not $health -or -not $health.Healthy) {
        throw "Sunucu $HealthTimeoutSeconds saniye içinde /api/health 200 yanıtı vermedi."
    }

    $mainResponse = Invoke-WebRequest -Uri "$($health.BaseUrl)/" -UseBasicParsing -TimeoutSec 5 -Headers @{ Accept = 'text/html' }
    if ($mainResponse.StatusCode -ne 200) {
        throw "Ana HTML beklenen 200 yanıtını vermedi (HTTP $($mainResponse.StatusCode))."
    }

    Write-Success "/api/health ve ana HTML HTTP 200 döndü; çalışma modu: $($health.Mode)."
    Open-DemoBrowser -Url $health.BaseUrl
    Write-Host ""
    Write-Host "Uygulama adresi: $($health.BaseUrl)" -ForegroundColor Green
    Write-Host "Başlatıcı logu: $script:LauncherLog" -ForegroundColor DarkGray
    Write-Host "Sunucu çıktısı: $script:ServerOutputLog" -ForegroundColor DarkGray
    Write-Host "Sunucu hataları: $script:ServerErrorLog" -ForegroundColor DarkGray

    if ($ExitAfterHealth) {
        Write-Info 'Doğrulama modu tamamlandı; test sunucusu kapatılıyor.'
        Stop-LocalServer
        exit 0
    }

    Write-Host ""
    Write-Host 'Bu pencere açık kaldığı sürece yerel sunucu çalışır.' -ForegroundColor Yellow
    Write-Host 'Kapatmak için Ctrl+C tuşlarına basın veya bu pencereyi kapatın.' -ForegroundColor Yellow

    try {
        while (-not $script:ServerProcess.HasExited) {
            Start-Sleep -Seconds 1
        }
    }
    finally {
        Stop-LocalServer
    }

    if ($script:ServerProcess.ExitCode -ne 0) {
        throw "Sunucu beklenmedik biçimde kapandı (çıkış kodu: $($script:ServerProcess.ExitCode))."
    }
    exit 0
}
catch {
    Stop-LocalServer
    $message = $_.Exception.Message
    Write-Host ""
    Write-Host "[HATA] OtoTR demo başlatılamadı: $message" -ForegroundColor Red
    Write-LauncherLog "HATA: $message"
    Show-LogTail -Path $script:ServerErrorLog -Title 'Sunucu hata logu'
    Show-LogTail -Path $script:ServerOutputLog -Title 'Sunucu çıktı logu'
    Write-Host ""
    if ($script:LauncherLog) {
        Write-Host "Başlatıcı logu: $script:LauncherLog" -ForegroundColor Yellow
    }
    if ($script:ServerErrorLog) {
        Write-Host "Sunucu hata logu: $script:ServerErrorLog" -ForegroundColor Yellow
    }
    Write-Host 'Tanı için server klasöründe npm run doctor komutunu çalıştırabilirsiniz.' -ForegroundColor Yellow
    exit 1
}
