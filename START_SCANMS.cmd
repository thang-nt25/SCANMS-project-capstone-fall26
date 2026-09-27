@echo off
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\scripts\start-scanms.ps1" -Wait
if errorlevel 1 pause
