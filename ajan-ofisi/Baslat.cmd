@echo off
powershell.exe -NoProfile -File "%~dp0Baslat.ps1"
if errorlevel 1 pause
