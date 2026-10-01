# Changelog

Alle nennenswerten Änderungen am Grundschutz++ Explorer.

## [Unveröffentlicht]

### Neu

- Kopfbereich der Detailansicht einklappbar, auch in den Übersichten: Der Pfeil oben rechts blendet Pfadleiste und Hinweise aus, der Schutzbedarf steht dann neben der Kennung.

### Geändert

- Stern der Detailansicht steht jetzt oben rechts neben dem Klapppfeil.
- Schutzbedarf in der Detailansicht mit dem Begriff aus dem BSI-Namensraum, die Bezeichnung steht im Tooltip.
- Reiter „Änderungen“ im Stil der Übersicht: Felder mit Beschriftung und Trennlinien, Textvergleich in einer Karte.
- Reiter „Notizen“ im Stil der Übersicht: Überschrift nennt die aktive Liste, darunter das Notizfeld und bei mehreren Listen ein schneller Listenwechsel.

## [1.1.11] – 2026-09-30

### Geändert

- Reiter „Notizen“: Das Auswahlfeld wählt direkt die aktive Liste, das Notizfeld ist damit immer beschreibbar.
- Reiter „Notizen“: Ein Filterknopf neben dem Auswahlfeld bietet wahlweise alle Listen oder nur die im Filter verfügbaren an.

## [1.1.10] – 2026-09-30

- Umstellung auf modulares Release-Script

## [1.1.9] – 2026-09-30

### Geändert

- Überschriften in der Detailansicht ohne übersprungene Ebene, damit Screenreader die Gliederung korrekt wiedergeben.
- Vue wird verzögert geladen und blockiert den Seitenaufbau nicht mehr.

### Behoben

- Screenreader lesen dekorative Symbole und Trennstriche nicht mehr vor.
- Dateiauswahl für den Listenimport und Bestätigungsdialog korrekt beschriftet.

## [1.1.8] – 2026-09-29

### Neu

- Stern über der Anforderungsliste: alle aktuellen Treffer auf einmal in die aktive Liste aufnehmen oder daraus entfernen.
- Listenmenü: „Leeren“ entfernt alle Einträge einer Liste, die Liste selbst bleibt bestehen.

### Geändert

- Keine Hinweise mehr im Listenbereich der Filterleiste; Fehler bei Listen und Notizen erscheinen als Dialog.
- Rückfragen mit drei Knöpfen sind breiter, auf schmalen Bildschirmen brechen die Knöpfe um.
- Knöpfe über der Anforderungsliste mit einheitlichem Abstand.

## [1.1.7] – 2026-09-29

### Neu

- Detailansicht: Über den Pfeil im Anforderungstext lassen sich Zielobjektkategorie, Modalverb und Handlungswort einblenden; ein Klick filtert danach, das (i) zeigt die Definition.

### Geändert

- Anforderungstext als normale Card mit hervorgehobener Textfläche statt farbigem linken Rand.
- Zielobjektkategorie steht nicht mehr bei den Kenngrößen, sondern im Klappbereich unter dem Anforderungstext.
- Einträge in den Cards (z. B. verknüpfte Anforderungen) beim Überfahren nur noch dezent hinterlegt, damit sie sich von den Zwischenüberschriften unterscheiden.


## [1.1.6] – 2026-09-29

### Geändert

- Hosting-Adresse der Webanwendung auf `app.grundschutz-explorer.de` umgestellt.
- Fußzeile: Link „GitHub-Projektseite“ durch „Projektseite“ (`www.grundschutz-explorer.de`) ersetzt.
- Interne und externe Seitenlinks, Canonical-URLs, Open-Graph-Metadaten sowie Handbuch und Dokumentation an die neue Adresse angepasst.
- Benutzerhandbuch liegt jetzt unter `https://app.grundschutz-explorer.de/manual/`; die bisherigen Adressen unter `/docs/manual/` entfallen ohne Weiterleitung.

### Behoben

- Felder der Detailansicht fließen bei extremen Bildschirmeinstellungen und manuellem Verschieben des Trenners nicht mehr über den rechten Rand.


## [1.1.5] – 2026-09-28

### Neu

- Filter Zielobjektkategorien: „Übergeordnete Kategorien einschließen“ bezieht die Ebenen darüber ein (Führungskräfte auch Mitarbeitende und Nutzende); sie erscheinen blau und im Chip.
- Detailansicht: Neben der Zielobjektkategorie stehen die übergeordneten Kategorien, z. B. Führungskräfte ‹ Mitarbeitende ‹ Nutzende; sie steht nun auch auf dem Reiter „Übersicht“ über den Schutzzielen.
- Erläuterungen erscheinen in einer Infobox am unteren Rand der Detailansicht statt ausgeklappt im Text.

### Geändert

- Detailansicht: UI optimiert
- Aufteilung der Ansicht: Die manuell eingestellte Breite wird nun im Browser gespeichert und bleibt beim Neuladen erhalten; ein Doppelklick auf die Trennlinie (oder Enter bei Tastaturfokus) setzt sie auf den Standard zurück.
- Detailanzeige von ausgefilterten Praktiken, Themen und Anforderungen vereinheitlicht: Die Anzeige bleibt erhalten, ein Hinweis wird eingeblendet


## [1.1.4] – 2026-09-27

### Neu

- Reiter „Hilfestellung“: Abschnitt „Satzaufbau“ zerlegt den Anforderungstext nach der BSI-Satzschablone, jeder Bestandteil ist filterbar.
- Zielobjektkategorie und Quellkatalog einer Anforderung, jeweils mit Definition und eigenem Filterbereich.
- Erläuterungen erscheinen in einer Infobox am unteren Rand der Detailansicht statt ausgeklappt im Text.

### Geändert

- Übersicht einer Anforderung neu gegliedert: Kenngrößen, Unteranforderungen, Gefährdungen, verknüpfte Anforderungen, Einordnung (Quellkatalog, Tags).
- Kopf der Detailansicht: Zahl der Unteranforderungen und Gefährdungen statt Modalverb-Badge.
- Neue Reihenfolge der Filterleiste.
- Kataloge mit Gruppen unterhalb der Themen werden beim Laden mit Fehlermeldung abgewiesen, statt dass Anforderungen fehlen.


## [1.1.3] – 2026-09-26

### Geändert

- Vereinheitlichung der Anzeige der Detailbereiche
- Ebenenbezeichnung gemäß BSI-Namespaces verbessert

### Behoben

- Beim Tippen im Notizfeld verschoben die Pfeiltasten sowie `j` und `k` die Auswahl im Explorer.
- Bei Anforderungen war der Abstand zwischen Titel und Tags durch den Merk-Stern größer als bei den anderen Ebenen.

## [1.1.2] – 2026-09-26

### Neu

- Feste Adresse für das Benutzerhandbuch: `https://www.grundschutz-explorer.de/docs/manual/` leitet immer auf die aktuelle Fassung weiter. Links auf ältere Handbuch-Versionen (`…-handbuch-v<Version>.pdf`) führen ebenfalls dorthin, statt ins Leere zu laufen; andere nicht vorhandene Adressen zeigen eine eigene Fehlerseite mit Link zur App.

## [1.1.1] – 2026-09-26

### Geändert

- Sobald Listen bestehen, ist immer genau eine aktiv. Die aktive Liste lässt sich nicht mehr abwählen, nur durch Wahl einer anderen wechseln; wird sie gelöscht oder mit ✕ ausgeschlossen, wird eine andere Liste aktiv. Bisher blieb nach dem Abwählen der Merkliste deren Stern gelb, obwohl keine Liste aktiv war.
- Lizenz-Dialog, README und Handbuch nennen die Herkunft der Symbole (teilweise nach Lucide und Feather Icons); der Lizenztext liegt unter `vendor/LICENSE-lucide.txt`. Auch der Lizenztext von Vue.js wird jetzt mitgeliefert (`vendor/LICENSE-vue.txt`) und ist im Lizenz-Dialog und im README verlinkt.

## [1.1.0] – 2026-09-26

### Neu

- **Listen mit Notizen**, etwa für Besprechungen: Listen legen Sie in der Filterleiste unter **Listen** an. Eine Liste ist aktiv (grüner Punkt, Klick auf den Punkt oder den Namen); der Stern am Titel nimmt die Anforderung in die aktive Liste auf. Ist keine Liste aktiv, landen Stern und Notizen in der **Merkliste**, die dabei bei Bedarf angelegt wird. Leer = in keiner Liste, grau = in einer anderen Liste, gelb = in der aktiven Liste.
- Reiter **Notizen** in der Detailansicht: Notizen schreiben Sie nur in die aktive Liste; Notizen anderer Listen sind über die Auswahl nur lesbar. Der Punkt am Reiter zeigt, ob es eine Notiz gibt (grün: aktive Liste, grau: andere Liste).
- Listen filtern wie Tags mit ✓ und ✕, auch mehrere zugleich. Eine ausgeschlossene Liste ist nicht mehr aktiv.
- Listen exportieren und importieren (JSON), einzeln oder alle auf einmal; beim Import lassen sich gleichnamige Listen zusammenführen, ohne dass Notizen verloren gehen.

### Geändert

- Eine Regel für alle Filterbereiche: Mehrere ✓ im selben Bereich verknüpfen mit „oder“, verschiedene Bereiche mit „und“, ✕ schließt immer aus. Damit sind jetzt auch „MUSS oder SOLLTE“, mehrere Aufwandsstufen oder Praktiken und bei den Schutzzielen mehrere Stufen zugleich möglich; ein neues ✓ ersetzt das bisherige nicht mehr. Bei Gefährdungen, Tags und Listen mussten bisher alle ✓ zutreffen.
- Aktive Filter erscheinen als ein Chip je Bereich („NUR Handlung: aktivieren oder analysieren“); der Papierkorb am Chip hebt alle Werte darin auf. Die Umschaltung zwischen NUR und NICHT am Chip entfällt, ebenso die Zeile „Alle Praktiken“ und „Weitere Gefährdung auswählen“. Gesetzte Werte bleiben in der Filterleiste sichtbar und stehen in den langen Listen oben.
- Kopf der Filterleiste: „Werte ohne Treffer ausblenden“ (Trichter) gilt jetzt für alle Bereiche außer Schutzzielen und Listen und ersetzt „Nur mit Treffern“ bei den Gefährdungen. „Zurücksetzen“ ist dort ein Symbol und immer an derselben Stelle.
- Buttons heben sich im hellen und dunklen Design mit einem dezenten Verlauf vom Hintergrund ab.
- Fußzeile neu geordnet: links App-Name, Version und GitHub-Projektseite, rechts Handbuch, Lizenz, Impressum und Datenschutz. Wird es eng, entfallen links nacheinander App-Name, Version und Projektlink; die Schriftgröße bleibt in jeder Breite gleich.
- „Alle lokal gespeicherten Daten löschen“ löscht auch die Listen und weist vorher darauf hin.
- Datenschutzerklärung und Startseite nennen Listen und Notizen; die Datenschutzerklärung beschreibt zusätzlich Export und Import von Listen.
- Neue `security.txt` unter `/.well-known/`.
- Die Registerkarte **OSCAL** in der Detailansicht entfällt. Ihre Rohdaten zeigt die Übersicht bereits lesbar, Parameter sind in den Anforderungstext eingesetzt; die UUID steht jetzt klein am Ende der Übersicht.
- Handbuch grundlegend überarbeitet für Version 1.1.0: Neues Kapitel 6 zu Listen und Notizen, vollständige Überarbeitung aller Kapitel und Anhänge an die neuen Oberflächen- und Filterfunktionen. Anhang C nennt zusätzlich die verwendeten Komponenten (Vue.js, Open Sans) mit Lizenz und Quelle.
- Die Hinweise zum Bezug zum BSI sind in App, README und Handbuch einheitlich formuliert.
- Dialog **Kataloge**: Je Katalog ein Auswahlknopf **Anzeigen** und **Vergleich**. Ein erneuter Klick auf den Vergleichsstand beendet den Vergleich; wird der Vergleichsstand zum Anzeigen gewählt, tauschen beide die Rollen. „Als Basis“, „Vergleichen“ und „Vergleich lösen“ entfallen. Der Vergleich bleibt beim nächsten Aufruf erhalten.
- Der Hinweisbalken im Vergleich nennt die beiden Stände und erscheint auch, wenn es keine Unterschiede gibt.
- Der Vergleich prüft alle Angaben einer Anforderung, auch Handlungswort, Dokumentation, gefordertes Ergebnis, Spezifikation, Schutzziele, Tags und die Einordnung. Der Reiter **Änderungen** verwendet die Bezeichnungen der Detailansicht und zeigt Texte nur einmal, als Wortvergleich.
- Katalog löschen fragt vorher nach.
- Die Suche reagiert deutlich schneller. Mehrere Wörter müssen alle vorkommen, in beliebiger Reihenfolge; in Anführungszeichen gesetzt wird die Wortfolge gesucht.
- Ist nichts gewählt, zeigt die Detailansicht eine Übersicht über den Katalog mit den Angaben aus seinen OSCAL-Metadaten: Version, letzte Änderung, Beschreibung, umgesetzte Norm, Verantwortliche, Verweise, Schlagwörter, weitere Eigenschaften und frühere Fassungen. Die Pfadleiste beginnt mit einem Buch-Symbol (zugeklappt in der Übersicht, aufgeschlagen darunter), das zur Übersicht zurückführt.
- Ist die Auswahl durch Filter ausgeblendet, sagt die Detailansicht das jetzt ausdrücklich.
- Nach dem Aufheben aller Filter hat der Baum wieder den Aufklapp-Zustand von vorher, statt aufgeklappt zu bleiben.
- Nach dem Laden eines Katalogs sind Listen, Modalverben, Schutzbedarf und Aufwand aufgeklappt, die langen Filterlisten zu.
- Eine gewählte Praktik oder ein Teilbereich rückt in der Liste nach oben statt an den unteren Rand.
- Der Link „Filter zurücksetzen“ neben der Trefferzahl entfällt (doppelt zu „Alle zurücksetzen“); das Suchfeld erscheint erst mit geladenem Katalog. Die Suchfelder der Filterleiste werden nicht mehr über Sitzungen hinweg gemerkt.
- Barrierefreiheit orientiert sich an WCAG 2.1 AA, im hohen Kontrastmodus an AAA-Kontrast: Die Anforderungsliste ist für Screenreader ein Baum mit Ebenen und Aufklapp-Zustand, → und ← klappen Unteranforderungen auf und zu; der Lizenztext ist per Tastatur scrollbar.
- Strengere Content-Security-Policy: Skripte, Stile, Schriften und Bilder nur von der eigenen Adresse, Kataloge über eine URL nur per https.

### Behoben

- Beim Wechsel des Vergleichsstands ohne vorheriges Lösen erschienen gelöschte Anforderungen des vorigen Vergleichs als „Neu“.
- Gelöschte Unteranforderungen stehen wieder unter ihrer Anforderung und nicht mehr doppelt im Baum.
- Ein Katalog, der sich nicht öffnen lässt, wird nicht mehr gespeichert; eine Datei ohne Anforderungen wird abgelehnt. Lässt sich ein gespeicherter Katalog nicht öffnen, startet der Explorer mit einem anderen oder zeigt einen Hinweis, statt im Ladebildschirm hängen zu bleiben.
- Die gewählte Anforderung verschwand beim Blättern mit ↑ unter der Überschrift der Praktik.
- Beim Import einer gleichnamigen Liste ließ sich der Import nicht abbrechen; Esc legte eine Kopie an.

## [1.0.2] – 2026-09-24

### Geändert

- Neues Info-Symbol: gefüllter blauer Kreis mit ausgestanztem „i“ (WCAG 1.4.11)

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
