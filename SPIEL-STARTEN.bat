@echo off
setlocal
cd /d "%~dp0"
title VELOCITY - Overdrive
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo Bitte zuerst Node.js LTS von https://nodejs.org/ installieren.
  echo Danach dieses Fenster schliessen und SPIEL-STARTEN erneut oeffnen.
  pause
  exit /b 1
)
node -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22 || (a===22 && b>=12) ? 0 : 1)"
if errorlevel 1 (
  echo Bitte Node.js auf die aktuelle LTS-Version aktualisieren.
  pause
  exit /b 1
)
if not exist node_modules\vite\bin\vite.js (
  echo Installiere die Spiel-Abhaengigkeiten. Das ist nur beim ersten Start noetig.
  call npm ci
  if errorlevel 1 (
    echo Installation fehlgeschlagen. Bitte die Fehlermeldung oben pruefen.
    pause
    exit /b 1
  )
)
echo.
echo VELOCITY startet im Browser. Dieses Fenster beim Spielen offen lassen.
echo Zum Beenden Strg+C druecken. Das Spiel bleibt lokal auf deinem Computer.
call npm run dev -- --port 5173 --strictPort --open
if errorlevel 1 (
  echo.
  echo Start fehlgeschlagen. Laeuft das Spiel bereits in einem anderen Fenster?
  pause
)
