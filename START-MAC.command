#!/bin/bash
set -e
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo 'Bitte zuerst Node.js LTS von https://nodejs.org/ installieren.'
  read -r -p 'Enter zum Schliessen. '
  exit 1
fi
if [ ! -f node_modules/vite/bin/vite.js ]; then
  npm ci
fi
printf '\nVELOCITY startet im Browser. Dieses Fenster beim Spielen offen lassen.\n'
npm run dev -- --port 5173 --strictPort --open
