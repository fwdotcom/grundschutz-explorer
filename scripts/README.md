# Skripte

Hilfsskripte für Release, Handbuch und Screenshots. Alle Aufrufe gehen vom Projektordner aus, sofern nicht
anders angegeben.

| Skript                    | Zweck                                                        | Voraussetzung                 |
| ------------------------- | ------------------------------------------------------------ | ----------------------------- |
| `release.py`              | Release vorbereiten (Version, Prüfungen, Screenshots, Handbuch) | Python 3, Node.js ≥ 22, markpublish |
| `build_manual.py`         | Benutzerhandbuch als PDF bauen                               | Python 3, markpublish         |
| `capture-screenshots.mjs` | Screenshots für das Handbuch aufnehmen                       | Node.js ≥ 22, Playwright      |

Einmalig einrichten:

```sh
pip install -r scripts/markpublish_requirements.txt   # markpublish
cd scripts && npm install                             # Playwright und Chromium
```

## Release vorbereiten

`release.py` führt nacheinander aus:

1. Version eintragen in `src/js/app.js` (`APP_VERSION`, maßgeblich), `package.json`,
   `docs/handbuch/markpublish.yaml` und `CHANGELOG.md` (`## [Unveröffentlicht]` wird zu
   `## [<VERSION>] – <Datum>`).
2. `npm run check` und `npm test`.
3. Screenshots neu aufnehmen (siehe unten); fehlt `scripts/node_modules`, wird vorher `npm install` ausgeführt.
4. Handbuch bauen (wie `build_manual.py`).

```sh
python scripts/release.py 1.2.0
python scripts/release.py 1.2.0 --keine-screenshots
```

Committet, getaggt und veröffentlicht wird nicht. Danach die Änderungen prüfen (`git status`, `git diff`),
committen und das Release `v<VERSION>` auf GitHub veröffentlichen.

## Handbuch bauen

`build_manual.py` baut das Handbuch aus `docs/handbuch` mit markpublish als PDF.

```sh
python scripts/build_manual.py
```

- Ergebnis: `src/manual/grundschutz-explorer-handbuch-v<VERSION>.pdf`
- Dazu entsteht `src/manual/index.html` als Weiterleitung auf diese PDF, damit `/manual/` immer auf das aktuelle
  Handbuch zeigt.
- Die Version kommt aus `APP_VERSION` in `src/js/app.js`; `markpublish.yaml` bleibt unverändert.

## Screenshots für das Handbuch

`capture-screenshots.mjs` erzeugt die Bilder in `docs/handbuch/bilder/` (PNG, doppelte Pixeldichte).

```sh
cd scripts
npm install            # einmalig: Playwright und Chromium
npm run screenshots
```

### Testdaten

Grundlage ist `testdaten/Grundschutz++-resolved_catalog.json`, der Anwenderkatalog aus der
[Stand-der-Technik-Bibliothek](https://github.com/BSI-Bund/Stand-der-Technik-Bibliothek) des BSI (Stand
10.09.2026). Er liegt bewusst fest im Repository, damit die Screenshots unabhängig von neuen Katalogständen
gleich bleiben.

Die Vergleichsversion für Vergleichsmodus und Reiter „Änderungen“ erzeugt das Skript selbst daraus
(`buildComparisonCatalog`): je zwei neue und gelöschte Anforderungen sowie geänderte Texte, Modalverben und
Kenngrößen (u. a. DEV.4.3).

### Ablauf

1. Ein lokaler HTTP-Server liefert die App aus `src/` aus, Playwright startet Chromium (Ansicht 1440 × 900,
   helles Design, `de-DE`, Zeitzone Europe/Berlin).
2. Startseite und Dialog „Katalog laden“ werden ohne Daten aufgenommen.
3. Kataloge, Listen („Audit 2026“, „Entwicklungsteam“), Notizen und Einstellungen werden über `js/storage.js`
   direkt in die IndexedDB der App geschrieben, danach wird die Seite neu geladen.
4. Die weiteren Zustände stellt das Skript über die Funktionen der App her (Wurzelkomponente an `#app`) und
   nimmt jeweils den passenden Ausschnitt auf.

### Umgebungsvariablen

| Variable     | Bedeutung                                                           |
| ------------ | ------------------------------------------------------------------- |
| `BILDER_DIR` | anderer Zielordner, z. B. zum Vergleich mit den bisherigen Bildern  |
| `HEADED`     | `1` startet den Browser sichtbar, zum Nachvollziehen                |

```sh
BILDER_DIR=/tmp/bilder npm run screenshots          # Bash
$env:BILDER_DIR = "$env:TEMP\bilder"; npm run screenshots   # PowerShell
```

### Hinweise

- Das Skript nutzt Speicherstruktur und Einstellungsschlüssel (`js/storage.js`), Funktionen der
  Wurzelkomponente und CSS-Selektoren der App. Ändern sich diese, muss es angepasst werden.
- Neue Bilder vor dem Commit mit den bisherigen vergleichen, z. B. über `BILDER_DIR`.
