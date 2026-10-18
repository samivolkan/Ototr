@echo off
cd /d "%~dp0"
if not exist ".venv\Scripts\pythonw.exe" (
  echo Python ortami bulunamadi. Once Kurulum.ps1 dosyasini calistirin.
  pause
  exit /b 1
)
start "" ".venv\Scripts\pythonw.exe" "launcher.py"
