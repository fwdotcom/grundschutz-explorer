# Die Detailansicht {#kap-detailansicht}

Die Detailansicht rechts zeigt alle Angaben einer Anforderung, verteilt auf die Reiter **Übersicht**, **Hilfestellung**, **Notizen** und im Vergleichsmodus **Änderungen**. Ist keine Anforderung gewählt, zeigt sie die Übersicht über den Katalog, bei gewählter Praktik oder gewähltem Thema die Übersicht dieser Ebene (siehe [Kapitel „Im Katalog navigieren“](#kap-navigieren)).

## Kopfbereich und Übersicht

![Detailansicht einer Anforderung: Reiter Übersicht](bilder/detailansicht.png){width=48%}

/// figure-caption
    attrs: {id: fig-detailansicht}
Detailansicht
///

Der Kopfbereich steht über allen Reitern:

- **Pfadleiste:** vom Buch-Symbol (Katalogübersicht) über Praktik und Thema bis zu übergeordneten Anforderungen. Jeder Eintrag ist anklickbar.
- **Kennung und Titel,** z. B. `SENS.11.3` *Whaling*.
- **Stern:** nimmt die Anforderung in die aktive Liste auf oder entfernt sie wieder. Seine Farbe signalisiert, ob die Anforderung bereits in einer Liste steht; der Tooltip nennt alle zugehörigen Listen (ausführlich in [Kapitel „Listen und Notizen“](#kap-listen-notizen)).
- **Hinweise:** Art (*Anforderung* oder *Unteranforderung*), Modalverb, Schutzbedarf, die Zahl der Unteranforderungen und der elementaren Gefährdungen (jeweils einschließlich aller Unteranforderungen) und im Vergleichsmodus der Änderungsstatus (*Neu*, *Geändert*, *Gelöscht*).
- **Reiter:** Mit der Maus oder, bei fokussierter Reiterleiste, mit **←** und **→** wechseln Sie zwischen den Reitern.

Darunter bündelt der Reiter **Übersicht** alle Angaben für die Umsetzung, von oben nach unten:

- **Anforderungstext:** der verbindliche Text. Das Modalverb ist farbig hervorgehoben, Parameter sind durch ihre Werte ersetzt. Der Pfeil unten rechts blendet die Begriffe aus dem Text einzeln ein (siehe [Abbildung](#fig-detail-klappbereich)).
- **Kenngrößen:**
  - **Schutzziele:** die Wirkung auf Vertraulichkeit, Integrität, Verfügbarkeit und Authentizität, dargestellt mit zwei Punkten (●● im Zentrum, ●○ wirkt hin, ○○ keine).
  - **Aufwand:** fünfteiliger Farbbalken und Stufe nach BSI-Definition.
  - **Dokumentation:** die geforderte Dokumentationsvorgabe.
- **Elementare Gefährdungen:** die Gefährdungen, gegen die die Anforderung wirkt.
- **Unteranforderungen:** falls vorhanden, mit Kennung, Titel und Modalverb; ein Klick öffnet die Unteranforderung.
- **Verknüpfte Anforderungen:** gegliedert in *Setzt voraus*, *Voraussetzung für* und *Verwandte Anforderungen*. Ein Klick öffnet die verknüpfte Anforderung.
- **Einordnung:** Quellkatalog und Tags.
- **UUID:** am Ende die eindeutige, unveränderliche Kennung der Anforderung im OSCAL-Datenbestand.

## Definitionen nachschlagen und Begriffe filtern

Neben vielen Angaben steht ein blaues **Info-Symbol**. Ein Klick darauf blendet am unteren Rand der Detailansicht eine Erläuterung mit der Definition des BSI ein. Ein zweiter Klick auf das Info-Symbol, das Kreuz oder **Esc** schließt die Erläuterung.

Gestrichelt unterstrichene Angaben setzen Sie mit einem Klick als Filter, ein weiterer Klick hebt ihn wieder auf (siehe [Kapitel „Suchen und filtern“](#kap-suchen-filtern)).

Zielobjektkategorie, Modalverb und Handlungswort können mit dem Pfeil unten rechts im Anforderungstext separat angezeigt und als Filter verwendet werden.

![Aufgeklappte Begriffe unter dem Anforderungstext](bilder/detail-klappbereich.png){width=48%}

/// figure-caption
    attrs: {id: fig-detail-klappbereich}
Begriffe zum Anforderungstext
///

- **Zielobjektkategorie:** worauf sich die Anforderung bezieht, einschließlich der übergeordneten Kategorien, zu denen sie gehört, z. B. *Führungskräfte ‹ Mitarbeitende ‹ Nutzende*.
- **Modalverb:** der Grad der Verbindlichkeit (*MUSS*, *SOLLTE*, *KANN*).
- **Handlungswort:** die geforderte Tätigkeit, z. B. *sensibilisieren*.

## Reiter „Hilfestellung“

Die Hilfestellung enthält Hinweise zur praktischen Umsetzung einer Anforderung. Ist für eine Anforderung keine Hilfestellung hinterlegt, weist der Reiter darauf hin.

![Reiter Hilfestellung](bilder/detail-hilfestellung.png){width=48%}

/// figure-caption
    attrs: {id: fig-detail-hilfestellung}
Reiter „Hilfestellung“
///

## Reiter „Notizen“

Im Reiter **Notizen** halten Sie eigene Anmerkungen zur gewählten Anforderung fest. Notizen gehören immer zu einer Liste und werden automatisch beim Tippen in der aktiven Liste gespeichert. Ein kleiner Punkt am Reiter signalisiert farblich, ob Notizen zur Anforderung vorliegen (grün für die aktive Liste, grau für eine andere Liste).

![Reiter Notizen mit bearbeitbarer Notiz der aktiven Liste](bilder/detail-notizen.png){width=48%}

/// figure-caption
    attrs: {id: fig-detail-notizen}
Reiter „Notizen“
///

Ausführliche Erläuterungen zu Notizen, den Zuständen des Punkts am Reiter sowie dem Wechsel zwischen den Listen finden Sie im [Kapitel „Listen und Notizen“](#kap-listen-notizen) (siehe [Abbildung](#fig-detail-notizen-andere)).

## Reiter „Änderungen“

Im Vergleichsmodus erscheint zusätzlich der Reiter **Änderungen**. Er zeigt, was sich an der gewählten Anforderung gegenüber dem Vergleichsstand geändert hat, bis hin zum Wortvergleich der Texte. Beschrieben ist er im [Kapitel „Kataloge laden und vergleichen“](#kap-kataloge) (siehe [Abbildung](#fig-detail-aenderungen)).
