@echo off
setlocal EnableExtensions
chcp 65001 >nul
title OtoTR X Kaza Monitor - Yerel Demo
cd /d "%~dp0"

where powershell.exe >nul 2>&1
if errorlevel 1 (
  echo [HATA] Windows PowerShell bulunamadi. Windows 10/11 bilesenlerini kontrol edin.
  if /I not "%OTOTR_NO_PAUSE%"=="1" pause
  exit /b 1
)

powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0OTOTR_DEMO_BASLAT.ps1" %*
set "OTOTR_EXIT_CODE=%ERRORLEVEL%"

if not "%OTOTR_EXIT_CODE%"=="0" (
  echo.
  echo [HATA] Yerel demo baslatilamadi. Yukaridaki Turkce hata ve log konumunu kontrol edin.
  if /I not "%OTOTR_NO_PAUSE%"=="1" pause
)

exit /b %OTOTR_EXIT_CODE%
