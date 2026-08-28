@echo off
setlocal EnableExtensions
chcp 65001 >nul
title OtoTR - TRT Haber Kaza Taramasi
cd /d "%~dp0"

echo ============================================================
echo   OtoTR Acik Kaynak Arac Olay Merkezi
echo   TRT Haber RSS - Kaza Gorseli / Plaka OCR Taramasi
echo ============================================================
echo.

where node.exe >nul 2>&1
if errorlevel 1 (
  echo [HATA] Node.js bulunamadi. Node.js 20 veya uzerini kurun.
  echo https://nodejs.org/
  pause
  exit /b 1
)

where npm.cmd >nul 2>&1
if errorlevel 1 (
  echo [HATA] npm bulunamadi. Node.js kurulumunu kontrol edin.
  pause
  exit /b 1
)

cd /d "%~dp0server"

if not exist ".env" (
  copy /Y ".env.example" ".env" >nul
  if errorlevel 1 (
    echo [HATA] server\.env olusturulamadi.
    pause
    exit /b 1
  )
)

if not exist "node_modules\tesseract.js" (
  echo [BILGI] Ilk kurulum: npm paketleri kuruluyor...
  call npm install --no-audit --no-fund
  if errorlevel 1 (
    echo [HATA] npm install basarisiz oldu. Internet baglantisini ve npm ayarlarini kontrol edin.
    pause
    exit /b 1
  )
)

echo.
echo [BILGI] TRT Haber RSS taramasi baslatiliyor.
echo [BILGI] X Bearer Token gerekli degildir.
echo [BILGI] Haber metninde plaka yazmasi yeterli degildir; aday yalniz gorsel OCR ile olusur.
echo.

call npm run news:trt
set "SCAN_EXIT=%ERRORLEVEL%"

if not "%SCAN_EXIT%"=="0" (
  echo.
  echo [UYARI] TRT Haber taramasi tamamlanamadi.
  echo Ag erisimi, TRT Haber RSS veya OCR indirme kosullarini kontrol edin.
  echo Uygulama yine de sentetik demo kayitlariyla acilabilir.
  echo.
  choice /C EH /N /M "E=Paneli yine de ac, H=Kapat: "
  if errorlevel 2 exit /b %SCAN_EXIT%
)

cd /d "%~dp0"
echo.
echo [BILGI] OtoTR paneli baslatiliyor...
call "%~dp0OTOTR_DEMO_BASLAT.bat"
exit /b %ERRORLEVEL%
