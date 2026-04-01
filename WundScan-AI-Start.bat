@echo off
chcp 65001 >nul 2>&1
title WundScan-AI v5.0.0

echo.
echo  WundScan-AI v5.0.0 - Wunddokumentation
echo  =========================================
echo.

REM --- Pruefe ob Python verfuegbar ist ---
where python >nul 2>&1
if %errorlevel% neq 0 (
    where python3 >nul 2>&1
    if %errorlevel% neq 0 (
        echo  FEHLER: Python wurde nicht gefunden.
        echo  Bitte installiere Python 3 von https://www.python.org
        echo.
        pause
        exit /b 1
    )
    set PYTHON_CMD=python3
) else (
    set PYTHON_CMD=python
)

echo  Python gefunden: %PYTHON_CMD%

REM --- Pruefe ob Port 8082 bereits belegt ist ---
netstat -ano 2>nul | findstr ":8082" >nul 2>&1
if %errorlevel% equ 0 (
    echo  Port 8082 ist bereits belegt.
    echo  Oeffne Browser direkt...
    goto :open_browser
)

REM --- Wechsle in den Projektordner ---
cd /d "%~dp0"

echo  Starte lokalen Server auf Port 8082...
echo.

REM --- Starte Server im Hintergrund ---
start /b "" %PYTHON_CMD% -m http.server 8082 --bind 127.0.0.1

REM --- Warte kurz bis Server bereit ist ---
timeout /t 2 /nobreak >nul

:open_browser
echo  Oeffne Browser...
start "" "http://localhost:8082/index.html"

echo.
echo  =========================================
echo  Server laeuft auf http://localhost:8082
echo  Dieses Fenster NICHT schliessen!
echo  Zum Beenden: Strg+C druecken
echo  =========================================
echo.

REM --- Halte Fenster offen ---
%PYTHON_CMD% -m http.server 8082 --bind 127.0.0.1
pause
