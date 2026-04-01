@echo off
title WundScan-AI - Server stoppen
echo.
echo  Server wird beendet...
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr "LISTENING" ^| findstr ":8082 "') do (
    taskkill /PID %%a /F >nul 2>&1
)
echo  Fertig.
timeout /t 2 /nobreak >nul
