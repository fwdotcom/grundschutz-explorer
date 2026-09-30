# Release-Schritte

Bereitet ein Release vor: Version eintragen, Changelog abschließen, `security.txt` erneuern, prüfen und testen,
Screenshots aufnehmen, Handbuch bauen. Committet, getaggt und veröffentlicht wird nicht; das bleibt Handarbeit.

Der Ordner ist so gebaut, dass er sich in andere Projekte übernehmen lässt: Die Schritte sind allgemein gehalten,
alles Projektspezifische steht in `release.toml` und `project/`.

```
release.py        Runner: führt die Schritte aus steps/ der Reihe nach aus
release.toml      Projektkonfiguration, ein Abschnitt je Schritt
requirements.txt  Python-Abhängigkeiten aller Schritte
steps/            die Schritte, je eine Datei NN-name.py
lib/              gemeinsame Bausteine (Konfiguration, Dateien, Browser)
project/          Projektspezifisches: Testdaten und Screenshot-Szenen
```

## Einrichten

```sh
pip install -r scripts/release/requirements.txt   # markpublish, Playwright, Pillow
python -m playwright install chromium
```

Voraussetzung ist Python ab 3.11. Für die Prüfungen und Tests dieses Projekts (Schritt `commands`) braucht es
außerdem Node.js ab 22.

## Aufruf

```sh
python scripts/release/release.py 1.2.0                          # alle Schritte
python scripts/release/release.py 1.2.0 --skip "*screenshots"    # ohne Screenshots
python scripts/release/release.py --only screenshots              # nur einzelne Schritte
python scripts/release/release.py --list                         # Schritte anzeigen
```

`--skip` und `--only` nehmen Namen ohne Nummer oder Muster (`*`, `?`) und lassen sich mehrfach angeben. Jeder
Schritt lässt sich auch direkt aufrufen, z. B. `python scripts/release/steps/70-markpublish.py`; Schritte, die die
Version brauchen, bekommen sie als Argument.

Danach die Änderungen prüfen (`git status`, `git diff`), committen und das Release `v<VERSION>` auf GitHub
veröffentlichen.

## Wie die Schritte laufen

Wie `run-parts` unter Linux:

- Ein Schritt ist eine Datei `steps/NN-name.py` (Zahl, Bindestrich, Name aus Kleinbuchstaben, Ziffern und
  Bindestrichen). Die Reihenfolge ergibt sich aus der Zahl; andere Dateien werden übergangen.
- Abschalten: umbenennen, z. B. in `50-screenshots.py.off`, oder löschen. Hinzufügen: neue Datei mit
  passender Nummer.
- Jeder Schritt läuft als eigener Prozess im Projektordner. Endet einer mit einem Fehler, bricht das Release ab.
- Der Runner übergibt die Version als Argument und setzt `RELEASE_VERSION`, `RELEASE_ROOT` und `RELEASE_CONFIG`.
- Seine Parameter liest jeder Schritt aus dem Abschnitt von `release.toml`, der seinem Dateinamen ohne Nummer
  entspricht (`30-security-txt.py` → `[security_txt]`). Einzelne Werte lassen sich per Umgebung überschreiben:
  `RELEASE_<ABSCHNITT>_<SCHLÜSSEL>`, z. B. `RELEASE_SCREENSHOTS_ONLY=website`.

Ein neuer Schritt beginnt so:

```python
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from lib.common import info, load_step  # noqa: E402

step = load_step(__file__, "Was der Schritt tut.")
# step.root, step.config (eigener Abschnitt), step.version, step.path("…"), step.require("schlüssel")
```

## Die Schritte

| Schritt           | Zweck                                                        |
| ----------------- | ------------------------------------------------------------ |
| `10-version`      | Version prüfen und an allen konfigurierten Stellen eintragen |
| `20-changelog`    | Abschnitt „Unveröffentlicht“/„Unreleased“ abschließen        |
| `30-security-txt` | `Expires` in `security.txt` auf heute + 1 Jahr setzen        |
| `40-commands`     | Befehle ausführen (hier `npm run check`, `npm test`)         |
| `50-screenshots`  | Screenshots nach Manifesten aufnehmen (Szenen aus `project/`) |
| `70-markpublish`  | Handbuch mit markpublish als PDF bauen                       |
| `80-redirect`     | Weiterleitung auf die aktuelle Handbuch-PDF anlegen          |

Alle Schritte sind allgemein gehalten. Die Einzelheiten stehen jeweils am Anfang der Datei.

### version

Quelle ist allein die übergebene Version. Der Schritt prüft ihr Format (Standard: SemVer wie `1.2.0` oder
`1.2.0-rc.1`, einstellbar mit `format` als regulärem Ausdruck) und trägt sie an allen Stellen aus `files` ein, hier
`APP_VERSION` in `src/js/app.js`, `package.json` und `docs/handbuch/markpublish.yaml`. Jede Stelle ist ein
regulärer Ausdruck, dessen erste Klammergruppe die Version ist. Eine ältere Version als eine der bisherigen wird
abgelehnt (abschaltbar mit `allow_downgrade = true`). Andere Schritte, z. B. `markpublish`, lesen die aktuelle
Version aus dem ersten Eintrag. Ist `files` leer (z. B. wenn die Version nur im Changelog steht), prüft der
Schritt nur das Format.

### changelog

Findet eine Überschrift „Unveröffentlicht“ oder „Unreleased“ (mit oder ohne Klammern, beliebige Ebene) und macht
daraus `## [<VERSION>] – <Datum>`. Überschrift, Datumsformat und die gesuchten Namen sind einstellbar; mit
`keep_unreleased = true` bleibt eine leere Überschrift für die nächsten Änderungen stehen. Vergleichslinks wie bei
Keep a Changelog (`[Unreleased]: …/compare/v1.1.0...HEAD`) werden nachgezogen. Eine Version, die älter ist als
die höchste im Changelog, wird abgelehnt (abschaltbar mit `allow_downgrade = true`).

Die Projektwebsite nutzt dieselben Schritte `version`, `changelog` und `security-txt` (Kopien in ihrem
`scripts/release/`); `lib/` und diese Schritte sollen in beiden Repos gleich bleiben.

### screenshots

Ein Auftrag verbindet ein Manifest (was aufgenommen wird) mit einem Zielordner (wohin):

```toml
jobs = [
  { name = "handbuch", out_dir = "docs/handbuch/bilder", manifest = "docs/handbuch/bilder/manifest.json" },
  { name = "website", out_dir = "src/media/website", manifest = "https://www.grundschutz-explorer.de/media/screens/manifest.json" },
]
```

```json
{
  "schema": 1,
  "shots": [{ "file": "oberflaeche.webp", "scene": "website-oberflaeche", "width": 1920, "height": 1200 }]
}
```

- `file`: Dateiname im Zielordner; die Endung `.png` oder `.webp` bestimmt das Format.
- `scene`: eine Szene aus `project/scenes.py`. Jede Szene beginnt in einem frischen Browserkontext, schreibt ihre
  Testdaten in die IndexedDB der App, lädt neu und stellt den Zustand her. Szenen ohne Präfix sind für das
  Handbuch (1440 × 900, doppelte Pixeldichte), Szenen mit `website-` für die Website.
- `width`, `height`: optional; weicht ein Bild ab, bricht der Schritt ab, ohne etwas zu schreiben.
- Das Manifest wird streng geprüft: nur bekannte Felder und Szenen, sichere Dateinamen.
- Neben die Bilder kommt eine Kopie des Manifests (`manifest.json`). Bilder aus der vorigen Kopie, die im neuen
  Manifest fehlen, werden entfernt; andere Dateien bleiben unberührt. Liegt das Manifest selbst als
  `manifest.json` im Zielordner, entfällt die Kopie; Bilder ohne Eintrag werden dann nur gemeldet.

Das Handbuch-Manifest liegt direkt bei den Bildern (`docs/handbuch/bilder/manifest.json`). Welche Bilder die Projektwebsite braucht, legt sie selbst fest, im
Manifest `www/media/screens/manifest.json` ihres Repos. Die Website bindet die Bilder von
`https://app.grundschutz-explorer.de/media/website/` ein und muss für neue Bilder nicht neu deployt werden.

Einzelne Aufträge und andere Quellen per Umgebung:

```sh
RELEASE_SCREENSHOTS_ONLY=website RELEASE_SCREENSHOTS_WEBSITE_MANIFEST=../grundschutz-explorer-website/www/media/screens/manifest.json   python scripts/release/release.py --only screenshots
RELEASE_SCREENSHOTS_HANDBUCH_OUT_DIR=/tmp/bilder python scripts/release/steps/50-screenshots.py   # zum Vergleich
```

### Testdaten der Screenshots

Grundlage ist `testdaten/Grundschutz++-resolved_catalog.json`, der Anwenderkatalog aus der
[Stand-der-Technik-Bibliothek](https://github.com/BSI-Bund/Stand-der-Technik-Bibliothek) des BSI (Stand
10.09.2026). Er liegt bewusst fest im Repository, damit die Screenshots unabhängig von neuen Katalogständen gleich
bleiben. Die Vergleichsversion für Vergleichsmodus und Reiter „Änderungen“ erzeugt `project/testdata.py` daraus: je
zwei neue und gelöschte Anforderungen sowie geänderte Texte, Modalverben und Kenngrößen (u. a. DEV.4.3).

### markpublish

Baut `docs/handbuch` als `src/manual/grundschutz-explorer-handbuch-v<VERSION>.pdf`. Die Version kommt aus dem
ersten Eintrag von `[version].files`; `markpublish.yaml` bleibt unverändert. Die CI baut das Handbuch mit
demselben Schritt.

### redirect

Legt `src/manual/index.html` als Weiterleitung auf die aktuelle PDF an, damit `/manual/` immer auf das aktuelle
Handbuch zeigt. Das Ziel steht in `target`, `{version}` wird durch die aktuelle Version ersetzt; die Zieldatei muss
existieren. Der Release-Workflow führt den Schritt nach `markpublish` aus, weil die Weiterleitung nicht im Repo
liegt.

## Hinweise

- Die Szenen nutzen Speicherstruktur und Einstellungsschlüssel (`js/storage.js`), Funktionen
  der Wurzelkomponente und CSS-Selektoren der App. Ändern sich diese, müssen sie angepasst werden.
- Neue Bilder vor dem Commit mit den bisherigen vergleichen, z. B. über
  `RELEASE_SCREENSHOTS_HANDBUCH_OUT_DIR=<Ordner>`.
- `HEADED=1` startet den Browser sichtbar, zum Nachvollziehen.
