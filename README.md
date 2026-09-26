<p align="center">
  <img src="media/gsexplorer_logo.png" alt="Grundschutz++ Explorer" width="120" />
</p>

# Grundschutz++ Explorer

[![Version](https://img.shields.io/github/v/release/fwdotcom/grundschutz-explorer?label=Version)](https://github.com/fwdotcom/grundschutz-explorer/releases/latest)
[![Lizenz](https://img.shields.io/github/license/fwdotcom/grundschutz-explorer?label=Lizenz)](LICENSE)

Der Grundschutz++ Explorer macht den Anwenderkatalog Grundschutz++ des BSI im
Browser durchsuchbar: Anforderungen finden, nach Modalverb, Schutzbedarf,
Aufwand, Schutzzielen und Gefährdungen filtern, eigene Listen mit Notizen führen,
Definitionen nachschlagen und Katalogversionen miteinander vergleichen – ohne Server, ohne Anmeldung, alle Daten bleiben lokal.

**→ [www.grundschutz-explorer.de](https://www.grundschutz-explorer.de)**

**→ [Benutzerhandbuch (PDF)](https://www.grundschutz-explorer.de/docs/manual/grundschutz-explorer-handbuch-v1.1.0.pdf)**, auch in der App über die Fußzeile erreichbar.

## Funktionen

- **Navigieren** in Praktiken, Teilbereichen, Anforderungen und Unteranforderungen, als Baumansicht oder flache Trefferliste, mit Übersichten je Praktik und Teilbereich.
- **Volltextsuche** über Kennungen, Titel, Anforderungstexte, Hilfestellungen und Gefährdungen.
- **Filter** nach Modalverb, Schutzbedarf, Aufwand, Handlungswort, Dokumentationsvorgabe, Schutzzielen, Praktiken, elementaren Gefährdungen und Tags – jeweils einschließend oder ausschließend.
- **Listen mit Notizen**, etwa für Audits oder Besprechungen: Anforderungen per Stern sammeln, Notizen je Liste erfassen, nach Listen filtern, Listen als JSON exportieren und importieren.
- **Definitionen des BSI** direkt an der Anforderung: Aufwandsstufen, Handlungswörter, Dokumentationsvorgaben, Schutzziele, Gefährdungen und Tags.
- **Versionsvergleich** zweier Katalogstände mit neuen, geänderten und gelöschten Anforderungen und Wort-für-Wort-Unterschieden.
- **Barrierearm:** drei Schriftgrößen, helles und dunkles Design, hoher Kontrast, vollständig per Tastatur bedienbar.
- **Datenschutz:** Die App läuft vollständig im Browser; geladene Kataloge, Listen mit Notizen und Einstellungen werden nur lokal gespeichert.

## Bezug zum Bundesamt für Sicherheit in der Informationstechnik (BSI)

Der Grundschutz++ Explorer ist ein unabhängiges Projekt und steht in keiner Verbindung zum Bundesamt für Sicherheit in der Informationstechnik (BSI). Der offizielle Grundschutz++-Anwenderkatalog und die Begriffsdefinitionen stammen aus der öffentlich zugänglichen Stand-der-Technik-Bibliothek des BSI und stehen unter der Lizenz [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/deed.de). Sie werden unverändert angezeigt. Die Rechte an diesen Inhalten liegen beim BSI.

## Mitwirken

Fehlermeldungen und Vorschläge sind als Issue willkommen, Pull Requests werden derzeit nicht angenommen. Details in [CONTRIBUTING.md](CONTRIBUTING.md).

## Lizenz

© 2026 Frank Winter – [MIT-Lizenz](LICENSE).

Verwendete Komponenten:

- **Vue.js** – MIT-Lizenz ([LICENSE-vue.txt](src/vendor/LICENSE-vue.txt))
- **Schrift Open Sans** – SIL Open Font License 1.1 ([OFL.txt](src/css/fonts/OFL.txt))
- **Symbole** – teilweise nach [Lucide](https://lucide.dev) (ISC-Lizenz) und [Feather Icons](https://feathericons.com) (MIT-Lizenz) ([LICENSE-lucide.txt](src/vendor/LICENSE-lucide.txt))
