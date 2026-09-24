<p align="center">
  <img src="media/gsexplorer_logo.png" alt="Grundschutz++ Explorer" width="120" />
</p>

# Grundschutz++ Explorer

[![Version](https://img.shields.io/github/v/release/fwdotcom/grundschutz-explorer?label=Version)](https://github.com/fwdotcom/grundschutz-explorer/releases/latest)
[![Lizenz](https://img.shields.io/github/license/fwdotcom/grundschutz-explorer?label=Lizenz)](LICENSE)

Den **Grundschutz++-Anwenderkatalog** des BSI im Browser durchsuchen, filtern und Versionen vergleichen – ohne Server, ohne Anmeldung, alle Daten bleiben lokal.

**→ [www.grundschutz-explorer.de](https://www.grundschutz-explorer.de)**

Das Benutzerhandbuch (PDF) ist in der App über die Fußzeile erreichbar.

> Der Grundschutz++ Explorer ist ein unabhängiges Projekt und steht in keiner Verbindung zum Bundesamt für Sicherheit in der Informationstechnik (BSI).

## Funktionen

- **Navigieren** in Praktiken, Teilbereichen, Anforderungen und Unteranforderungen, als Baumansicht oder flache Trefferliste, mit Übersichten je Praktik und Teilbereich.
- **Volltextsuche** über Kennungen, Titel, Anforderungstexte, Hilfestellungen und Gefährdungen.
- **Filter** nach Modalverb, Schutzbedarf, Aufwand, Handlungswort, Dokumentationsvorgabe, Schutzzielen, Praktiken, elementaren Gefährdungen und Tags – jeweils einschließend oder ausschließend.
- **Definitionen des BSI** direkt an der Anforderung: Aufwandsstufen, Handlungswörter, Dokumentationsvorgaben, Schutzziele, Gefährdungen und Tags.
- **Versionsvergleich** zweier Katalogstände mit neuen, geänderten und gelöschten Anforderungen und Wort-für-Wort-Unterschieden.
- **Barrierearm:** drei Schriftgrößen, helles und dunkles Design, hoher Kontrast, vollständig per Tastatur bedienbar.
- **Datenschutz:** Die App läuft vollständig im Browser; geladene Kataloge und Einstellungen werden nur lokal gespeichert.

## Datenquellen

Katalog und Begriffsdefinitionen stammen aus der [Stand-der-Technik-Bibliothek](https://github.com/BSI-Bund/Stand-der-Technik-Bibliothek) des BSI und werden unverändert angezeigt:

| Inhalt | Quelle | Im Projekt |
| :--- | :--- | :--- |
| Grundschutz++-Anwenderkatalog | `control_layer/Grundschutz++/` | wird zur Laufzeit direkt vom BSI geladen, keine Kopie im Repository |
| Begriffsdefinitionen (Namespaces) | `documentation/namespaces/` | `src/data/namespaces/` (unveränderte Kopie) |

„Offiziellen BSI Grundschutz++ Anwenderkatalog laden“ ruft den aktuellen Stand direkt aus der Bibliothek ab. Die Inhalte des BSI stehen unter der Lizenz [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/deed.de).

## Entwicklung

Die App ist eine statische Single-Page-App ohne Build-Schritt (Vue 3, lokal unter `src/vendor/`). Zum Ausprobieren genügt ein beliebiger statischer Webserver für das Verzeichnis `src/`, zum Beispiel:

```bash
python -m http.server --directory src 8080
```

```text
src/
├── index.html            Einstiegspunkt
├── css/app.css           Stylesheet (Hell/Dunkel, hoher Kontrast, Schriftgrößen)
├── js/
│   ├── app.js            Anwendung (Vue 3); enthält APP_VERSION
│   ├── oscalParser.js    OSCAL-Katalog-Parser
│   ├── namespaces.js     Laden der BSI-Namespaces (CSV)
│   ├── diffEngine.js     Katalog- und Textvergleich
│   └── storage.js        Speicherung im Browser (IndexedDB)
├── data/                 BSI-Namespaces
└── media/                Logo, Vorschaubild
docs/handbuch/            Benutzerhandbuch (markpublish)
scripts/build_manual.py   Baut das Handbuch nach src/docs/manual/
tests/                    Tests (Node-Test-Runner)
```

**Tests** (Node.js 22 oder neuer, ohne Abhängigkeiten):

```bash
npm test
npm run check      # Syntaxprüfung der JS-Module
```

**Handbuch** bauen (Python 3.10 oder neuer):

```bash
pip install -r docs/handbuch/requirements.txt
python scripts/build_manual.py
```

## Release

1. `APP_VERSION` in `src/js/app.js` anpassen und `CHANGELOG.md` ergänzen.
2. Committen und pushen.
3. Auf GitHub ein Release mit dem Tag `v<Version>` veröffentlichen (z. B. `v1.0.0`).

Der Release-Workflow prüft, dass Tag und `APP_VERSION` übereinstimmen, führt die Tests aus, baut das Handbuch und veröffentlicht die Seite auf GitHub Pages.

## Mitwirken

Fehlermeldungen und Vorschläge sind als Issue willkommen, Pull Requests werden derzeit nicht angenommen. Details in [CONTRIBUTING.md](CONTRIBUTING.md).

## Lizenz

© 2026 Frank Winter – [MIT-Lizenz](LICENSE).
Die Inhalte des BSI stehen unter [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/deed.de), die Schrift Open Sans unter der SIL Open Font License 1.1, Vue.js unter der MIT-Lizenz.
