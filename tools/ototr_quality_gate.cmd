@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0ototr_quality_gate.ps1" %*
