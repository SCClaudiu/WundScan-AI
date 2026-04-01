@echo off
title WundScan-AI - Server stoppen
echo.
echo  WundScan-AI Server wird beendet...
echo.
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":8082"') do (
    taskkill /PID %%a /F >nul 2>&1
)
echo  Server gestoppt.
echo.
timeout /t 3 /nobreak >nul
