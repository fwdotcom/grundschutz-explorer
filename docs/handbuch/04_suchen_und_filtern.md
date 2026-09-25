# Suchen und filtern

Suche und Filter lassen sich frei kombinieren. Wie mehrere Filter zusammenwirken, beschreibt der Abschnitt **So wirken Filter zusammen**.

![Aktive Filter und flache Trefferliste](bilder/filter.png)

/// figure-caption
    attrs: {id: fig-filter}
Aktive Filter und flache Trefferliste
///

## Volltextsuche

Das Suchfeld in der Kopfzeile durchsucht Kennungen, Titel, Anforderungstexte, Hilfestellungen, die Bezeichnungen der Gefährdungen und die Tags. Die Treffer erscheinen sofort während der Eingabe.

- **Strg + K** oder **/** setzt den Cursor ins Suchfeld.
- **Esc** leert das Suchfeld.
- Das Kreuz rechts im Suchfeld leert es ebenfalls.

## Einen Filter setzen

Jeder Wert in der Filterleiste hat rechts zwei Schaltflächen:

| Schaltfläche | Wirkung |
| :--- | :--- |
| **✓** (Nur) | Zeigt nur Anforderungen mit diesem Wert – bei mehreren ✓ im selben Bereich mit einem davon. |
| **✕** (Nicht) | Blendet Anforderungen mit diesem Wert aus. |
| Papierkorb | Erscheint bei aktiven Werten und hebt den Filter wieder auf. |

Ein Klick auf den Namen eines Werts wirkt wie **✓**, ein weiterer Klick hebt den Filter wieder auf.

Die Zahl neben einem Wert gibt an, wie viele Anforderungen mit diesem Wert zu den Filtern der **übrigen** Bereiche passen. Werte ohne Treffer sind blass dargestellt.

Der Trichter oben in der Filterleiste blendet Werte ohne Treffer ganz aus, in allen Bereichen außer den **Schutzzielen** und den **Listen**. Das kürzt die Filterleiste, an der Liste der Anforderungen ändert sich nichts. Gesetzte Werte bleiben sichtbar, auch wenn sie keine Treffer haben. Ein weiterer Klick zeigt wieder alle Werte.

## So wirken Filter zusammen

Für alle Bereiche gilt dieselbe Regel:

- **Innerhalb eines Bereichs: oder.** Mehrere Werte mit **✓** im selben Bereich erweitern die Auswahl. Es genügt, wenn einer davon passt.
- **Zwischen den Bereichen: und.** Eine Anforderung erscheint nur, wenn sie in jedem Bereich mit gesetztem Filter passt. Das gilt auch für die Volltextsuche.
- **✕ schließt immer aus.** Eine Anforderung mit einem ausgeschlossenen Wert fällt heraus, auch wenn ein anderer ihrer Werte mit **✓** gewählt ist.

| Filter | Angezeigt werden Anforderungen mit … |
| :--- | :--- |
| ✓ MUSS, ✓ SOLLTE | MUSS oder SOLLTE |
| ✓ MUSS, ✓ Aufwand Stufe 1 | MUSS und Aufwandsstufe 1 |
| ✓ Stufe 1, ✓ Stufe 2, ✓ Praktik GC | Aufwandsstufe 1 oder 2 in der Praktik GC |
| ✓ Zero Trust, ✕ VPN (Tags) | Tag „Zero Trust“, aber ohne Tag „VPN“ |

/// table-caption
    attrs: {id: tbl-filter-beispiele}
Beispiele für kombinierte Filter
///

## Die Filterbereiche

| Bereich | Filtert nach |
| :--- | :--- |
| Modalverben | Verbindlichkeit: MUSS, SOLLTE, KANN |
| Schutzbedarf | Sicherheitsstufe: Standard-Sicherheitsstufe oder erhöhte Sicherheitsstufe |
| Aufwand | Aufwandsstufe 0 bis 5, jeweils mit farbigem Balken |
| Handlungswort | Das Verb, das die geforderte Handlung beschreibt, etwa „dokumentieren“ oder „verankern“ |
| Dokumentation | Die Dokumentationsvorgabe, etwa „IT-Betriebskonzept“ |
| Schutzziele | Wirkung auf Vertraulichkeit, Integrität, Verfügbarkeit und Authentizität |
| Praktiken | Die Praktiken des Katalogs, etwa GC, ARCH oder OPS |
| Gefährdungen | Die elementaren Gefährdungen G 0.1 bis G 0.47 |
| Tags | Schlagwörter des BSI, etwa „Zero Trust“ |
| Änderungen | Nur im Vergleichsmodus: neu, geändert, gelöscht |

In den langen Listen **Handlungswort**, **Dokumentation**, **Gefährdungen** und **Tags** hilft ein Suchfeld oberhalb der Werte, gesetzte Werte stehen dort oben.

> [!TIP]
> Fahren Sie mit der Maus über einen Wert, um die Definition des BSI zu sehen, etwa was ein Handlungswort genau verlangt oder wie eine Aufwandsstufe definiert ist.

## Schutzziele filtern

Bei den Schutzzielen hat jede Zeile drei Schaltflächen für die Wirkungsstufen:

| Symbol | Stufe | Bedeutung |
| :--- | :--- | :--- |
| ○○ | 0 | Die Anforderung wirkt nicht oder kaum auf dieses Schutzziel. |
| ●○ | 1 | Die Anforderung wirkt auf dieses Schutzziel hin. |
| ●● | 2 | Das Schutzziel steht im Zentrum der Anforderung. |

Ein **Klick** zeigt nur Anforderungen mit dieser Stufe, ein **Rechtsklick** schließt die Stufe aus. Jedes Schutzziel ist ein eigener Bereich: Mehrere Stufen desselben Schutzziels verknüpfen mit „oder“, verschiedene Schutzziele mit „und“.

Ein Beispiel: „Authentizität ●○“ und „Authentizität ●●“ zusammen finden alle Anforderungen, die überhaupt auf die Authentizität wirken. Denselben Effekt hat ein Rechtsklick auf „Authentizität ○○“.

> [!TIP]
> Wenn Sie für ein Zielobjekt einen hohen Schutzbedarf an Vertraulichkeit festgestellt haben, finden Sie mit „Vertraulichkeit ●●“ die Anforderungen, die dafür besonders wichtig sind.

## Aktive Filter

Alle aktiven Filter stehen als Chips über der Liste, ein Chip je Bereich. **NUR** kennzeichnet die mit **✓** gewählten Werte, **NICHT** die mit **✕** ausgeschlossenen; sind in einem Bereich beide gesetzt, hat er zwei Chips. So lässt sich die Regel direkt ablesen: Innerhalb eines Chips gilt „oder“, zwischen den Chips „und“.

Ein Beispiel: **NUR** Handlung: aktivieren oder analysieren · **NUR** Modalverb: MUSS · **NICHT** Tag: VPN

- Der Papierkorb am Chip hebt alle Filter dieses Chips auf.
- Einzelne Werte entfernen Sie in der Filterleiste mit einem Klick auf den Wert.
- **Alle zurücksetzen** hebt alle Filter und die Suche auf.

## Filter direkt aus der Detailansicht

Viele Angaben in der Detailansicht sind gestrichelt unterstrichen. Ein Klick darauf setzt den passenden Filter zusätzlich zu den bereits gesetzten, zum Beispiel auf das Handlungswort, die Dokumentationsvorgabe, eine Gefährdung, ein Schutzziel, einen Tag oder die Aufwandsstufe. So finden Sie mit einem Klick alle Anforderungen, die dieselbe Eigenschaft haben.

## Gespeicherter Zustand

Der Explorer merkt sich Filter, Suche und die aufgeklappten Bereiche in Ihrem Browser. Beim nächsten Aufruf finden Sie alles so vor, wie Sie es verlassen haben. Wenn Sie einen neuen Katalog laden, setzt der Explorer die Filter zurück und klappt alle Bereiche zu.
