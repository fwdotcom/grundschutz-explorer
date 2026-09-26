# Suchen und filtern

Suche und Filter lassen sich beliebig miteinander kombinieren. Sie arbeiten nach einer einheitlichen, logischen Regel und ermöglichen sowohl grobe thematische Eingrenzungen als auch hochspezifische Detailabfragen.

![Kombinierte Filter-Chips und flache Trefferliste](bilder/filter.png){width=70%}

/// figure-caption
    attrs: {id: fig-filter}
Kombinierte Filter: Einschluss (NUR MUSS) und Ausschluss (NICHT Aufwand Stufe 5) mit flacher Trefferliste
///

## Volltextsuche

Das Suchfeld in der Kopfzeile durchsucht Kennungen, Titel, Anforderungstexte, Hilfestellungen, Gefährdungsbezeichnungen und Tags in Echtzeit:

- **Eingabe:** Die Trefferliste aktualisiert sich sofort während des Tippens.
- **Mehrere Suchwörter:** Werden mit Leerzeichen getrennt eingegeben und automatisch mit **UND** verknüpft (alle Wörter müssen vorkommen, die Reihenfolge ist beliebig).
- **Exakte Wortfolgen:** Setzen Sie einen Suchausdruck in doppelte Anführungszeichen (z. B. `"Security by Design"`), um gezielt nach dieser zusammenhängenden Phrase zu suchen.
- **Tastatur:** Mit `Strg + K` (oder `/`) springen Sie direkt ins Suchfeld; `Esc` leert das Suchfeld und setzt den Fokus zurück.

## Filter setzen

Jeder Wert in der Filterleiste besitzt funktionale Steuerelemente:

| Aktion | Wirkung |
| :--- | :--- |
| **Klick auf Wert** oder **✓** | **Einschließen (NUR):** Zeigt Anforderungen, die diese Eigenschaft besitzen. |
| **✕** | **Ausschließen (NICHT):** Blendet Anforderungen mit dieser Eigenschaft zuverlässig aus. |
| **Papierkorb** | Hebt den gesetzten Filter für diesen Wert wieder auf. |

Die Zahl neben jedem Wert gibt an, wie viele Anforderungen im Katalog diesen Wert aufweisen – unter Berücksichtigung aller in **anderen** Abschnitten gesetzten Filter.

> [!TIP]
> Das **Trichter-Symbol** oben rechts in der Filterleiste blendet alle Zeilen ohne Treffer aus. Dadurch wird die Filterleiste auf die tatsächlich verfügbaren Optionen komprimiert.

## Die Filterlogik

Für alle Filterbereiche gilt ein einheitliches, intuitives Prinzip:

- **Innerhalb eines Bereichs: ODER.** Mehrere mit **✓** aktivierte Werte im selben Bereich erweitern die Trefferliste. Es genügt, wenn einer der gewählten Werte auf eine Anforderung zutrifft (z. B. `MUSS` oder `SOLLTE`).
- **Zwischen den Bereichen: UND.** Werden Werte in unterschiedlichen Bereichen ausgewählt, müssen alle Bedingungen erfüllt sein (z. B. `MUSS` und `Aufwand Stufe 2` und Praktik `DEV`).
- **✕ schließt immer aus:** Ein Ausschlussfilter sticht jeden Einschlussfilter. Eine Anforderung mit einem ausgeschlossenen Merkmal wird nicht angezeigt, selbst wenn andere Merkmale übereinstimmen.

| Gesetzte Filter | Angezeigte Anforderungen |
| :--- | :--- |
| ✓ MUSS, ✓ SOLLTE | Alle Anforderungen mit Verbindlichkeit MUSS oder SOLLTE. |
| ✓ MUSS, ✓ Aufwandsstufe 1 | Verbindliche Anforderungen (MUSS), die zugleich Stufe 1 erfordern. |
| ✓ Praktik DEV, ✕ Tag: VPN | Alle Entwicklungs-Anforderungen, die nicht das Schlagwort „VPN“ tragen. |
| ✓ Liste: Audit 2026 | Nur Anforderungen, die in der eigenen Liste „Audit 2026“ stehen. |

/// table-caption
    attrs: {id: tbl-filter-beispiele}
Beispiele für kombinierte Filterbedingungen
///

## Die Filterbereiche

| Bereich | Bedeutung und Filterkriterien |
| :--- | :--- |
| **Listen** | Eigene Sammlungen: Zeigt oder schließt Anforderungen aus bestimmten Listen aus. |
| **Modalverben** | Verbindlichkeitsgrad: MUSS, SOLLTE oder KANN. |
| **Schutzbedarf** | Sicherheitsniveaus: Standard-Sicherheitsstufe oder Erhöhte Sicherheitsstufe. |
| **Aufwand** | Aufwandsstufen 0 bis 5 (von geringem bis zu sehr hohem Realisierungsaufwand). |
| **Handlungswort** | Das primäre Verbum der Forderung (z. B. *dokumentieren*, *verankern*, *prüfen*). |
| **Dokumentation** | Geforderte Dokumentenart (z. B. *Sicherheitskonzept*, *Freigabeplan*). |
| **Schutzziele** | Wirkungsgrad auf Vertraulichkeit, Integrität, Verfügbarkeit und Authentizität. |
| **Praktiken** | Die 20 Fachpraktiken des BSI-Grundschutzes (z. B. *DEV*, *ARCH*, *BES*, *GC*). |
| **Gefährdungen** | Zuordnung zu den elementaren Gefährdungen G 0.1 bis G 0.47. |
| **Tags** | Fachliche Schlagwörter aus dem kontrollierten Vokabular des BSI. |
| **Änderungen** | Im Vergleichsmodus: gezieltes Filtern nach neuen, geänderten oder entfallenen Anforderungen. |

## Schutzziele gezielt filtern

Die Schutzziele Vertraulichkeit (C), Integrität (I), Verfügbarkeit (A) und Authentizität (Au) verfügen über eine dreistufige Skala:

| Symbol | Stufe | Bedeutung |
| :---: | :---: | :--- |
| ○○ | 0 | Die Anforderung entfaltet keine wesentliche Schutzwirkung auf dieses Ziel. |
| ●○ | 1 | Die Anforderung wirkt auf das Schutzziel hin. |
| ●● | 2 | Das Schutzziel steht im Zentrum der Anforderung. |

Ein Linksklick filtert nach der entsprechenden Stufe, ein Rechtsklick schließt diese Stufe aus. Wählen Sie z. B. bei der Vertraulichkeit sowohl `●○` als auch `●●`, erfasst der Filter alle Anforderungen mit relevanter Schutzwirkung auf die Vertraulichkeit.

## Aktive Filter-Chips

Oberhalb der Anforderungsliste erscheinen alle aktiven Filter als übersichtliche Chips:

- **NUR [Kategorie: Werte]:** Zeigt eingeschlossene Kriterien; mehrere Werte innerhalb des Chips sind mit „oder“ verknüpft.
- **NICHT [Kategorie: Werte]:** Zeigt ausgeschlossene Kriterien.
- **Papierkorb am Chip:** Entfernt alle Kriterien dieser Kategorie mit einem Klick.
- **Alle zurücksetzen:** Hebt sämtliche gesetzten Filter und Suchbegriffe sofort auf.

## Klickfilter aus der Detailansicht

Zahlreiche Eigenschaften in der Detailansicht sind dezent gestrichelt unterstrichen. Ein Klick darauf übernimmt diesen Wert direkt als Filter in die aktuelle Suche (z. B. ein Klick auf ein Handlungswort, eine Dokumentationsart, einen Tag oder eine elementare Gefährdung).
