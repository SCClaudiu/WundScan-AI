# WundScan AI — Lokaler HTTP-Server (PowerShell)
# Doppelklick oder Rechtsklick > "Mit PowerShell ausführen"

$Host.UI.RawUI.WindowTitle = "WundScan AI - Lokaler Server"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host ""
Write-Host "  ╔══════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "  ║       WundScan AI — Lokaler Server           ║" -ForegroundColor Cyan
Write-Host "  ╚══════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Prüfe ob Python verfügbar ist
$pythonCmd = $null
foreach ($cmd in @("python", "python3", "py")) {
    try {
        $null = & $cmd --version 2>&1
        if ($LASTEXITCODE -eq 0) {
            $pythonCmd = $cmd
            break
        }
    } catch { }
}

if (-not $pythonCmd) {
    Write-Host "  [FEHLER] Python wurde nicht gefunden!" -ForegroundColor Red
    Write-Host "  Bitte installiere Python von https://www.python.org" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "  Drücke Enter zum Schließen"
    exit 1
}

Write-Host "  Python gefunden: $pythonCmd" -ForegroundColor Green

# Wechsle in den Ordner des Skripts
Set-Location $PSScriptRoot

# Finde einen freien Port (8080, 8081, 8082)
$port = $null
foreach ($p in @(8080, 8081, 8082)) {
    $inUse = Get-NetTCPConnection -LocalPort $p -ErrorAction SilentlyContinue
    if (-not $inUse) {
        $port = $p
        break
    } else {
        Write-Host "  Port $p ist belegt, versuche nächsten..." -ForegroundColor Yellow
    }
}

if (-not $port) {
    Write-Host "  [FEHLER] Ports 8080-8082 sind alle belegt!" -ForegroundColor Red
    Write-Host "  Bitte schließe andere Server und versuche es erneut." -ForegroundColor Yellow
    Write-Host ""
    Read-Host "  Drücke Enter zum Schließen"
    exit 1
}

Write-Host ""
Write-Host "  ✓ WundScan AI läuft auf http://localhost:$port" -ForegroundColor Green
Write-Host "  ✓ Browser wird geöffnet..." -ForegroundColor Green
Write-Host ""
Write-Host "  ══════════════════════════════════════════════" -ForegroundColor DarkGray
Write-Host "   Dieses Fenster OFFEN LASSEN!" -ForegroundColor Yellow
Write-Host "   Schließen beendet den Server." -ForegroundColor Yellow
Write-Host "   Zum Stoppen: Strg+C drücken oder Fenster schließen" -ForegroundColor DarkGray
Write-Host "  ══════════════════════════════════════════════" -ForegroundColor DarkGray
Write-Host ""

# Öffne Browser
Start-Process "http://localhost:$port/index.html"

# Starte Python HTTP-Server (blockiert — hält Fenster offen)
try {
    & $pythonCmd -m http.server $port
} catch {
    Write-Host ""
    Write-Host "  [FEHLER] Server konnte nicht gestartet werden: $_" -ForegroundColor Red
    Read-Host "  Drücke Enter zum Schließen"
}
