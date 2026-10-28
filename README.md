# VELOCITY / OVERDRIVE

Ein eigenständiger, schneller Browser-Arena-Shooter. Version 02 konzentriert sich auf Bewegung, Waffenfeedback und einen vollständigen Einzelspieler-Run. Alle Modelle und Sounds sind original und werden lokal erzeugt. Keine CoD-Assets, Benutzerkonten, Werbung oder API-Schlüssel.

## Schnellstart unter Windows

1. Die ZIP von GitHub herunterladen und **vollständig entpacken**.
2. [Node.js LTS](https://nodejs.org/) installieren (22.12+ oder neuer).
3. **SPIEL-STARTEN.bat doppelklicken**. Beim ersten Start werden Abhängigkeiten installiert; danach öffnet sich das Spiel im Standardbrowser.
4. Das Terminal beim Spielen geöffnet lassen. Zum Beenden Strg+C drücken.

Alternativ die untenstehenden Befehle selbst im Terminal ausführen. Es sind keine Administratorrechte nötig. Port 5173 muss frei sein; einen bereits laufenden Spielserver zuerst beenden.

## Start per Terminal (Windows / macOS / Linux)

Im Ordner, der `package.json` enthält:

```sh
npm ci
npm run dev -- --open
```

Die im Terminal angezeigte **Local**-Adresse im aktuellen Desktop-Browser öffnen. Unter macOS steht zusätzlich `START-MAC.command` zur Verfügung; nach einem ZIP-Download kann stattdessen der Terminalweg erforderlich sein.

Diese Befehle veröffentlichen keine Website. Vite lauscht für Cloud-Entwicklung auf allen Interfaces; auf einem vertrauenswürdigen lokalen Netzwerk können andere Geräte den Entwicklungsserver erreichen. Für einen nur auf dem eigenen Rechner erreichbaren Server:

```sh
npm run dev -- --host 127.0.0.1 --open
```

Eine Website lässt sich später separat mit `npm run build` erzeugen und als `dist/` auf einem statischen Host bereitstellen. Die Cloud-Einrichtungsansicht unterstützt keine direkte Spielvorschau. Ein bisher heruntergeladener Ordner aktualisiert sich nicht automatisch: Für Version 02 die neue ZIP herunterladen und separat entpacken.

## Der Run

Überlebe **acht Wellen** und besiege **den Aufseher**. Zwischen den Wellen wählst du eines von drei zufälligen Upgrades. Die Auswahl verändert deinen Build nur für diesen Run. Magazine und Granaten werden aufgefüllt; du erhältst 35 Gesundheit zurück.

- **VX-7:** präzises Sturmgewehr. Ein naher Kopftreffer eliminiert gewöhnliche Soldaten; kurze Feuerstöße kontrollieren Rückstoß und Streuung.
- **KITE-9:** schnelle MP, 40 Schuss, schnelles Nachladen, höhere Bewegungsgeschwindigkeit. Stark im Nahkampf, schwächer auf Distanz.
- **BREACH:** neun Pellets pro Schuss. Enormer Schaden aus der Nähe, deutlicher Entfernungsabfall.
- **Dash:** kurzer Impuls in Bewegungsrichtung (ohne Richtung nach vorn), kurze Unverwundbarkeit, 2,6 Sekunden Cooldown. Überbrückt keine Wände.
- **Slide:** im Sprint Strg drücken. Aus dem Slide springen, um Schwung mitzunehmen.
- **Granaten:** begrenzte Ladungen, kurzer Zünder, prallen an Wänden ab. Decken Gruppen ab; verursachen bewusst keinen Selbstschaden.
- **Nahkampf:** trifft Gegner direkt vor dir und unterbricht ihre Bewegung.
- **Flow:** Kills innerhalb von fünf Sekunden erhöhen den Score-Multiplikator bis ×5. Kopftreffer geben zusätzliche Punkte.
- **Gesundheit:** regeneriert vier Sekunden nach dem letzten Schaden. Jeder dritte Kill lässt einen Gesundheits- oder Granaten-Pickup fallen. Zum Einsammeln darüberlaufen; bei voller Ressource bleibt der Pickup liegen.

Gegnergeschosse treffen über echte Kollisionen statt Zufallswürfe. Deckung blockiert Schüsse, Granatenschaden und gegnerische Geschosse. Gegner erscheinen auf markierten Spawnflächen und nutzen Wegfindung um die Container.

### Gegner lesen

- **Orange / Soldat:** kündigt einen gezielten Energieschuss durch Aufleuchten an. Seitwärts ausweichen.
- **Gelb / Jäger:** schnell, flankiert und greift im Nahkampf an. Schrotflinte, Dash und Nahkampf nutzen.
- **Violett / Späher:** lange Vorwarnung mit sichtbarem Zielstrahl. Position wechseln, sobald der Strahl erscheint.
- **Rot / Brecher:** viel Gesundheit und ein Fächer aus drei Geschossen.
- **Aufseher:** Fächersalven, Schockwellen bei jedem zweiten Angriff, beschleunigte zweite Phase unter 50 % Gesundheit. Über die Schockwelle springen oder mit dem kurzen Dash-Schutz durchqueren.

## Steuerung

| Taste                   | Aktion                                  |
| ----------------------- | --------------------------------------- |
| WASD                    | Bewegen                                 |
| Maus                    | Umsehen                                 |
| Linke Maustaste halten  | Feuern                                  |
| Rechte Maustaste halten | Zielen                                  |
| Shift                   | Sprinten                                |
| Strg im Sprint          | Slide                                   |
| Leertaste               | Springen / aus dem Slide springen       |
| E                       | Dash                                    |
| R                       | Nachladen (unbegrenzte Reservemunition) |
| 1 / 2 / 3 oder Mausrad  | Waffe wechseln; unterbricht Nachladen   |
| G                       | Granate                                 |
| V                       | Nahkampf                                |
| M                       | Audio an/aus                            |
| Escape                  | Pause / Maus freigeben                  |

Im Menü und in der Pause gibt es Einstellungen für Mausempfindlichkeit, FOV, Lautstärke, Kamera-Impulse und Grafikqualität. Einstellungen und Bestleistungen pro Schwierigkeit werden nur im Browser auf diesem Gerät gespeichert. Bei blockiertem Browserspeicher funktioniert das Spiel ohne Speicherung weiter.

## Browser & Leistung

Aktueller Desktop-Chrome, Edge oder Firefox mit WebGL und Hardwarebeschleunigung. Mausfang benötigt einen Benutzerklick sowie localhost oder HTTPS. Bei verweigertem Mausfang erscheint ein Hinweis; erneut in die Arena klicken. Escape pausiert die Simulation; Wechsel des Fensters ebenfalls. Auf schwächeren Rechnern Grafikqualität auf **Niedrig** stellen. Kein Touch-Modus, Controller-Support, Multiplayer oder persistenter Account-Fortschritt.

## Entwicklung & Prüfungen

```sh
npm ci
npm test
npm run test:browser
npm run build
```

`npm test` prüft Spielregeln, Schaden, Upgrade-Grenzen, Wegfindung und Swept-Kollisionen mit Node. Die Playwright-Tests prüfen die echte Three.js-Szene, Raycasts, Bewegungen, Waffen, Schadenskollisionen, Wellen, Upgrade-Auswahl, Tod/Sieg sowie nativen Mausfang. Für reproduzierbare Mechaniktests gibt es ausschließlich im Vite-Entwicklungsmodus `?test&manual` einen Testtreiber. Produktions-Builds enthalten diesen nicht.

Die Browser-Tests verwenden `CHROMIUM_PATH`, ein vorhandenes `/usr/bin/chromium` oder Playwright-Chromium. Auf dem eigenen Rechner gegebenenfalls einmalig:

```sh
npx playwright install chromium
```

`npm run preview` dient zur lokalen Prüfung von `dist/`. Die Tests benötigen keine externen Spieldienste.

## Projektstruktur

- `src/game/rules.js`: Balancing, A\*-Navigation, Kollisions- und Schadensregeln
- `src/game/game.js`: Spielzustand, Waffen, Bewegung, Gegner, Wellen und Fähigkeiten
- `src/game/world.js`: Three.js-Arena, Modelle und begrenzte Partikeleffekte
- `src/game/input.js`: Tastatur, Mausfang und Fokus-/Pause-Verhalten
- `src/game/audio.js`: prozedurales Audio mit Kompressor und Lautstärkeregelung
- `src/game/ui.js`: HUD, Einstellungen, Upgrade- und Ergebnisschirme
