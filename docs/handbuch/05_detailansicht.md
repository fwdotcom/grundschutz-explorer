# Die Detailansichten

Die Detailansicht auf der rechten Seite des Bildschirms bereitet alle Fach- und Metadaten des Katalogs übersichtlich auf. Sie umfasst die allgemeine **Katalogübersicht**, die vollständige **Anforderungsansicht** mit ihren fachlichen Reitern sowie den interaktiven **Wortvergleich** im Vergleichsmodus.

## Katalogübersicht

Solange keine konkrete Anforderung ausgewählt ist – oder wenn Sie in der Pfadleiste auf das **Buch-Symbol** am Anfang klicken –, zeigt die Detailansicht eine umfassende Übersicht über den geladenen Katalog und seine übergeordneten NIST-OSCAL-Metadaten. Dazu gehören Versionsstand, gesetzliche Grundlagen, Herausgeberangaben des BSI sowie offizielle Dokumentenverweise.

## Aufbau der Anforderungsansicht

Sobald Sie eine Anforderung in der Baumansicht oder der Trefferliste auswählen, wechselt die Detailansicht in den Anforderungsmodus. Der Kopfbereich fasst die Einordnung und Kernattribute zusammen:

- **Pfadleiste (Breadcrumb):** Führt vom Buch-Symbol (Katalogübersicht) über Praktik und Thema bis zur Anforderung. Jeder Knoten lässt sich anklicken, um in der Hierarchie zurückzuspringen.
- **Kennung und Titel:** Eindeutige Kennzeichnung der Anforderung (z. B. `DEV.3.1`) und ihr offizieller Titel.
- **Stern-Symbol:** Fügt die Anforderung mit einem Klick zur aktuellen Arbeitsliste hinzu oder entfernt sie wieder (Gelb = in aktiver Liste, Grau = in anderer Liste, Umriss = in keiner Liste).
- **Status-Badges:** Kennzeichnen Art (*Anforderung* oder *Unteranforderung*), die Anzahl der Unteranforderungen und der elementaren Gefährdungen (jeweils einschließlich aller Unteranforderungen), Schutzbedarf (*Standard* oder *Erhöht*) und im Vergleichsmodus den Änderungsstatus (*Neu*, *Geändert*, *Gelöscht*).
- **Reiterleiste (Tabs):** Erlaubt den schnellen Wechsel zwischen *Übersicht*, *Hilfestellung*, *Notizen* und im Vergleichsmodus *Änderungen*.

## Registerkarte „Übersicht“

Die Registerkarte **Übersicht** bündelt alle operativen Vorgaben der gewählten Anforderung.

![Detailansicht einer Anforderung: Reiter Übersicht](bilder/detailansicht.png){width=36%}

/// figure-caption
    attrs: {id: fig-detailansicht}
Detailansicht einer Anforderung mit Breadcrumb, Metadaten und Reiter „Übersicht“ (am Beispiel DEV.3.1 Replay-Angriffe)
///

Die Übersicht gliedert sich in folgende funktionale Abschnitte:

- **Anforderungstext:** Der normative Kern der Anforderung. Das maßgebliche Modalverb ist farbig hervorgehoben; Parameterplatzhalter sind mit konkreten Werten aufgelöst.
- **Kenngrößen (Zielobjekt, Schutzziele, Aufwand und Dokumentation):** Die operativen Basisangaben der Anforderung in einer gemeinsamen Karte. Das Zielobjekt zeigt, worauf sich die Anforderung bezieht, ergänzt um die übergeordneten Kategorien (z. B. *Führungskräfte ‹ Mitarbeitende ‹ Nutzende*). Die Schutzwirkung auf Vertraulichkeit (C), Integrität (I), Verfügbarkeit (A) und Authentizität (Au) wird mit zwei Punkten symbolisiert (●● = im Zentrum, ●○ = wirkt hin, ○○ = keine Zuordnung). Ein fünfstufiger Farbbalken verdeutlicht den geschätzten Realisierungsaufwand nach BSI-Definition, und die Dokumentationsvorgabe bestimmt den geforderten Nachweis. Ein Klick auf Zielobjekt, Schutzziele, Aufwand oder Dokumentation filtert direkt danach.
- **Unteranforderungen:** Falls vorhanden, listet eine Karte die untergeordneten Anforderungen mit Kennung, Titel und Modalverb auf.
- **Gefährdungen:** Abgewendete BSI-Gefährdungen (G 0.1 bis G 0.47), die direkt als Klickfilter nutzbar sind.
- **Verknüpfte Anforderungen:** Zeigt Voraussetzungen und verwandte Anforderungen.
- **Einordnung:** Quellkatalog und thematische Tags, direkt als Klickfilter nutzbar.
- **Definitionen (i-Symbol):** Neben den Angaben klappt ein Klick auf das Info-Symbol die offizielle BSI-Definition am unteren Bildschirmrand als Erläuterung auf.
- **UUID:** Am Ende der Übersicht steht die eindeutige, unveränderliche Kennung der Anforderung im NIST-OSCAL-Datenbestand.

## Registerkarte „Hilfestellung“

Reicht der normative Anforderungstext für die praktische Ausgestaltung nicht aus, verweist die Registerkarte **Hilfestellung** auf praxisnahe Empfehlungen des BSI. Hier finden sich Erläuterungen zur Implementierung, empfohlene Werkzeuge (z. B. für Software Composition Analysis) sowie Querverweise auf Technische Richtlinien (wie BSI TR-03183 oder TR-02102):

![Registerkarte Hilfestellung mit Hinweisen zur praktischen Umsetzung](bilder/detail-hilfestellung.png){width=36%}

/// figure-caption
    attrs: {id: fig-detail-hilfestellung}
Registerkarte „Hilfestellung“ mit Verweisen auf Technische Richtlinien
///

## Registerkarte „Notizen“

Direkt an jeder Anforderung können Sie individuelle Notizen und Umsetzungskommentare erfassen:

![Registerkarte Notizen mit Textfeld, Statuspunkt und Zeitstempel](bilder/detail-notizen.png){width=36%}

/// figure-caption
    attrs: {id: fig-detail-notizen}
Registerkarte „Notizen“ mit Textfeld, Statuspunkt und Zeitstempel
///

- **Notizen schreiben:** Eingaben werden direkt in der aktuell **aktiven Liste** gespeichert.
- **Notizen anderer Listen einsehen:** Über das Auswahlmenü können Notizen aus anderen Listen schreibgeschützt eingesehen werden.
- **Statuspunkt am Reiter:** Ein grüner Punkt signalisiert eine Notiz in der aktiven Liste; ein grauer Punkt weist auf Notizen in anderen Listen hin.
- **Zeitstempel:** Dokumentiert das Datum der letzten Bearbeitung.

*(Eine ausführliche Beschreibung der Listenverwaltung finden Sie im Kapitel **Listen und Notizen**.)*

## Registerkarte „Änderungen“ (Vergleichsmodus)

Solange zwei unterschiedliche Katalogstände verglichen werden, erscheint zusätzlich der Reiter **Änderungen**. Er zeigt die veränderten Eigenschaften und einen Wortvergleich der Texte; beschrieben ist er im [Kapitel Kataloge laden und vergleichen](#fig-detail-aenderungen).
