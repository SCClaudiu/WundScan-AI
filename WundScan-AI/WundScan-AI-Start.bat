@echo off
chcp 65001 >nul 2>&1
title WundScan-AI v5.0.0 - Server

echo.
echo  WundScan-AI v5.0.0
echo  ===================
echo.

REM --- Python finden ---
set PYCMD=
where python >nul 2>&1 && set PYCMD=python
if "%PYCMD%"=="" (
    where python3 >nul 2>&1 && set PYCMD=python3
)
if "%PYCMD%"=="" (
    where py >nul 2>&1 && set PYCMD=py
)
if "%PYCMD%"=="" (
    echo  FEHLER: Python nicht gefunden!
    echo  Bitte Python 3 installieren: https://www.python.org
    pause
    exit /b 1
)

echo  Python: %PYCMD%

REM --- In Projektordner wechseln ---
cd /d "%~dp0"

REM --- Port 8082 freigeben falls belegt ---
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr "LISTENING" ^| findstr ":8082 "') do (
    echo  Port 8082 belegt - beende alten Prozess...
    taskkill /PID %%a /F >nul 2>&1
    timeout /t 1 /nobreak >nul
)

REM --- Server starten (Hintergrund) ---
echo  Starte Server auf Port 8082...
start "" /b %PYCMD% -m http.server 8082 --bind 0.0.0.0

REM --- Warten bis Server antwortet ---
echo  Warte auf Server...
set RETRIES=0
:waitloop
timeout /t 1 /nobreak >nul
set /a RETRIES+=1
if %RETRIES% geq 8 (
    echo  WARNUNG: Server antwortet nicht nach 8 Sekunden.
    echo  Oeffne Browser trotzdem...
    goto :openbrowser
)
%PYCMD% -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8082')" >nul 2>&1
if %errorlevel% neq 0 goto :waitloop

:openbrowser
echo  Server laeuft!
echo.

REM --- Browser oeffnen ---
echo  Oeffne http://localhost:8082 ...
start "" "http://localhost:8082/index.html"

echo.
echo  ========================================
echo  Server aktiv: http://localhost:8082
echo  Dieses Fenster NICHT schliessen!
echo  Beenden: Strg+C oder Fenster schliessen
echo  ========================================
echo.

REM --- Server im Vordergrund halten ---
:keepalive
timeout /t 3600 /nobreak >nul
goto :keepalive
