# Changelog

Alle nennenswerten Änderungen am Grundschutz++ Explorer.

## [1.0.1] – 2026-09-24

### Behoben

- Unteranforderungen werden in jeder Tiefe angezeigt. Bisher fehlten in der Baumansicht Unteranforderungen ab der dritten Ebene (etwa GC.9.1.1.1.1); betroffen waren 21 Anforderungen in GC, STM, ASST, BES, ARCH, DET und REA. Zähler, Pfeiltasten-Navigation, automatisches Aufklappen und „Alle aufklappen“ berücksichtigen nun alle Ebenen.
- Der Breadcrumb zeigt alle übergeordneten Anforderungen, nicht nur die direkte.

### Geändert

- Neu gestaltete Startseite mit einem Button **Katalog laden** und Kurzinformationen zu Datenquellen, Datenschutz und Betrieb im Browser.
- Kataloge verwalten und laden: Der Dialog **Kataloge** listet die gespeicherten Versionen; neue Kataloge lädt der eigene Dialog **Katalog laden** (offizieller Katalog, URL oder Datei).
- Doppelt geladene Kataloge werden erkannt und nicht erneut gespeichert; der Dialog **Katalog laden** weist darauf hin.
- Einzelne Kataloge löschen Sie über den Papierkorb in **Kataloge**, alle Daten auf einmal in der Datenschutzerklärung.
- Der offizielle Katalog wird ausschließlich direkt vom BSI geladen; die bisher mitgelieferte Kopie ist entfallen.
- Die Browser-Datenbank heißt jetzt `grundschutz_explorer`.
- Benutzerhandbuch überarbeitet, mit aktuellen Screenshots in handlicher Größe.

## [1.0.0] – 2026-09-24

Erste veröffentlichte Version.

### Funktionen

- Anzeige des Grundschutz++-Anwenderkatalogs (OSCAL) mit Praktiken, Teilbereichen, Anforderungen und Unteranforderungen – als Baumansicht oder flache Trefferliste.
- Übersichten je Praktik und Teilbereich; Navigation über den Breadcrumb.
- Volltextsuche sowie Filter nach Modalverb, Schutzbedarf, Aufwand, Handlungswort, Dokumentationsvorgabe, Schutzzielen, Praktiken, elementaren Gefährdungen, Tags und Änderungsstatus (einschließend und ausschließend).
- Detailansicht mit Anforderungstext, Schutzzielen, Handlung, Dokumentation, gefordertem Ergebnis, Aufwand, Tags, Gefährdungen, Hilfestellung und OSCAL-Rohdaten.
- Begriffsdefinitionen aus den BSI-Namespaces direkt an der Anforderung (Info-Buttons und Tooltips).
- Laden des offiziellen Katalogs aus der Stand-der-Technik-Bibliothek des BSI oder eines eigenen Katalogs per Datei oder URL; Startseite, solange kein Katalog geladen ist.
- Versionsverwaltung im Browser und Vergleich zweier Katalogstände mit Wort-für-Wort-Unterschieden.
- Drei Schriftgrößen, helles und dunkles Design, hoher Kontrast, Bedienung per Tastatur.
- Benutzerhandbuch als PDF, Impressum, Datenschutzerklärung und Lizenzangaben in der App.
