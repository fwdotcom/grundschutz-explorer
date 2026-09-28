# Die Detailansicht {#kap-detailansicht}

Die Detailansicht rechts zeigt alle Angaben einer Anforderung, verteilt auf die Reiter **Übersicht**, **Hilfestellung**, **Notizen** und im Vergleichsmodus **Änderungen**. Ist keine Anforderung gewählt, zeigt sie die Übersicht über den Katalog, bei gewählter Praktik oder gewähltem Thema die Übersicht dieser Ebene (siehe [Kapitel „Im Katalog navigieren“](#kap-navigieren)).

## Kopfbereich und Übersicht

![Detailansicht einer Anforderung: Reiter Übersicht](bilder/detailansicht.png){width=48%}

/// figure-caption
    attrs: {id: fig-detailansicht}
Detailansicht von SENS.11.3 Whaling: Pfadleiste, Kopfbereich und Reiter „Übersicht“ mit den Kenngrößen
///

Der Kopfbereich steht über allen Reitern:

- **Pfadleiste:** vom Buch-Symbol (Katalogübersicht) über Praktik und Thema bis zu übergeordneten Anforderungen. Jeder Eintrag ist anklickbar.
- **Kennung und Titel,** z. B. `SENS.11.3` *Whaling*.
- **Stern:** nimmt die Anforderung in die aktive Liste auf oder entfernt sie wieder. Der Tooltip nennt alle Listen, in denen sie steht (siehe [Kapitel „Listen und Notizen“](#kap-listen-notizen)).
- **Hinweise:** Art (*Anforderung* oder *Unteranforderung*), Modalverb, Schutzbedarf, die Zahl der Unteranforderungen und der elementaren Gefährdungen (jeweils einschließlich aller Unteranforderungen) und im Vergleichsmodus der Änderungsstatus (*Neu*, *Geändert*, *Gelöscht*).
- **Reiter:** Mit der Maus oder, bei fokussierter Reiterleiste, mit **←** und **→** wechseln Sie zwischen den Reitern.

Darunter bündelt der Reiter **Übersicht** alle Angaben für die Umsetzung, von oben nach unten:

- **Anforderungstext:** der verbindliche Text. Das Modalverb ist farbig hervorgehoben, Parameter sind durch ihre Werte ersetzt.
- **Kenngrößen:**
  - **Zielobjektkategorie:** worauf sich die Anforderung bezieht. Daneben stehen gedämpft die übergeordneten Kategorien, zu denen sie gehört, z. B. *Führungskräfte ‹ Mitarbeitende ‹ Nutzende*. Bei mehreren Kategorien steht jede in einer eigenen Zeile.
  - **Schutzziele:** die Wirkung auf Vertraulichkeit, Integrität, Verfügbarkeit und Authentizität, dargestellt mit zwei Punkten (●● im Zentrum, ●○ wirkt hin, ○○ keine).
  - **Aufwand:** fünfteiliger Farbbalken und Stufe nach BSI-Definition.
  - **Dokumentation:** die geforderte Dokumentationsvorgabe.
- **Elementare Gefährdungen:** die Gefährdungen, gegen die die Anforderung wirkt.
- **Unteranforderungen:** falls vorhanden, mit Kennung, Titel und Modalverb; ein Klick öffnet die Unteranforderung.
- **Verknüpfte Anforderungen:** gegliedert in *Setzt voraus*, *Voraussetzung für* und *Verwandte Anforderungen*. Ein Klick öffnet die verknüpfte Anforderung.
- **Einordnung:** Quellkatalog und Tags.
- **UUID:** am Ende die eindeutige, unveränderliche Kennung der Anforderung im OSCAL-Datenbestand.

Gestrichelt unterstrichene Angaben filtern mit einem Klick danach (siehe [Kapitel „Suchen und filtern“](#kap-suchen-filtern)).

### Definitionen nachschlagen

Neben vielen Angaben steht ein blaues **Info-Symbol**. Ein Klick darauf blendet am unteren Rand der Detailansicht eine Erläuterung mit der Definition des BSI ein, etwa zu einer Zielobjektkategorie, einer Aufwandsstufe, einer Dokumentationsvorgabe, einem Quellkatalog oder einem Tag. Bei Zielobjektkategorien nennt die Erläuterung zusätzlich die Oberkategorien. Ein zweiter Klick auf das Info-Symbol, das Kreuz oder **Esc** schließt die Erläuterung.

## Reiter „Hilfestellung“

Die Hilfestellung enthält Hinweise zur praktischen Umsetzung einer Anforderung. Ist für eine Anforderung keine Hilfestellung hinterlegt, weist der Reiter darauf hin.

![Reiter Hilfestellung](bilder/detail-hilfestellung.png){width=48%}

/// figure-caption
    attrs: {id: fig-detail-hilfestellung}
Reiter „Hilfestellung“ mit dem Hinweis des BSI zu DEV.3.4 Passwort-Hashing
///

## Reiter „Notizen“

Im Reiter **Notizen** halten Sie eigene Anmerkungen zur Anforderung fest. Notizen gehören immer zu einer Liste.

![Reiter Notizen](bilder/detail-notizen.png){width=48%}

/// figure-caption
    attrs: {id: fig-detail-notizen}
Reiter „Notizen“ mit der Notiz der aktiven Liste und dem Zeitpunkt der letzten Änderung
///

- **Schreiben:** Was Sie eingeben, wird automatisch in der **aktiven Liste** gespeichert. Eine Speichern-Schaltfläche gibt es nicht.
- **Punkt am Reiter:** Grün bedeutet eine Notiz in der aktiven Liste, grau eine Notiz nur in einer anderen Liste.
- **Zeitstempel:** nennt Datum und Uhrzeit der letzten Änderung.
- **Notizen anderer Listen:** Hat die Anforderung auch in anderen Listen eine Notiz, wählen Sie die Liste über das Auswahlfeld oben. Solche Notizen sind nur lesbar.

Wie Listen und Notizen zusammenspielen, beschreibt das [Kapitel „Listen und Notizen“](#kap-listen-notizen).

## Reiter „Änderungen“

Im Vergleichsmodus erscheint zusätzlich der Reiter **Änderungen**. Er zeigt, was sich an der gewählten Anforderung gegenüber dem Vergleichsstand geändert hat, bis hin zum Wortvergleich der Texte. Beschrieben ist er im [Kapitel „Kataloge laden und vergleichen“](#kap-kataloge) (siehe [Abbildung](#fig-detail-aenderungen)).
