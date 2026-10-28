# VELOCITY — The Foundry

Ein eigenständiger Browser-Ego-Shooter-Prototyp mit Three.js. Originale prozedurale Geometrie und Web-Audio-Sounds; keine CoD-Assets, Konten oder externen Spieldienste.

## Starten

Node.js 22.12+ oder 24 wird benötigt.

```sh
npm ci
npm run dev
```

Die im Terminal angezeigte Adresse auf dem eigenen Rechner im Desktop-Browser öffnen. In der Cloud ist die Adresse nur für interne Prüfungen gedacht; diese Einrichtungsansicht bietet keine Spielvorschau. Es wird nichts automatisch veröffentlicht.

`npm run build` erstellt `dist/`. `npm run preview` prüft diesen Build. Für eine spätere Veröffentlichung kann `dist/` bei einem statischen Webhost bereitgestellt werden.

## Spielen

- WASD: bewegen; Maus: umsehen; linke Maustaste: automatisch schießen
- Rechte Maustaste halten: zielen; Shift links: sprinten; Leertaste: springen
- R: nachladen (unbegrenzte Reservemunition); M: Audio ein/aus
- Escape: pausieren und Maus freigeben

Bots greifen in wachsenden Wellen an. Kopftreffer eliminieren sofort, Körpertreffer benötigen drei Treffer. Nach vier Sekunden ohne Schaden regeneriert Gesundheit. Bestleistung wird nur lokal im Browser gespeichert. Audio beginnt nach dem Startklick. Mausfang benötigt einen aktuellen Desktop-Browser und localhost oder HTTPS; kein Touch-Modus oder Multiplayer.

## Validierung

```sh
npm run build
npx playwright test
```

Für die Browserprüfung einmalig `npx playwright install chromium` ausführen. Der Test startet einen eigenen Vite-Server und prüft Arena, Spielstart, Bewegung, Schießen, Nachladen, Pause und Neustart.
