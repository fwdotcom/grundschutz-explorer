# Listen und Notizen {#kap-listen-notizen}

Mit eigenen Listen stellen Sie Anforderungen für einen bestimmten Zweck zusammen, etwa für ein Audit, einen Entwicklungs-Sprint, die Prüfung eines Dienstleisters oder eine Besprechung. Zu jeder Anforderung in einer Liste können Sie eine Notiz festhalten.

![Listenbereich in der Filterleiste mit geöffnetem Menü](bilder/listen.png){width=30%}

/// figure-caption
    attrs: {id: fig-listen}
Listenbereich in der Filterleiste: aktive Liste, Trefferzahlen, Filterschaltflächen und Menü einer Liste
///

## Listen anlegen und verwalten

Der Bereich **Listen** steht ganz oben in der Filterleiste:

- **Neue Liste anlegen:** Klicken Sie auf **„+ Neue Liste“**, geben Sie einen Namen ein (z. B. *Audit 2026*) und bestätigen Sie mit der Eingabetaste (**Esc** bricht ab).
- **Aktive Liste:** Klicken Sie auf den Auswahlschalter oder den Namen einer Liste. Ein grüner Punkt kennzeichnet die aktive Liste. Stern und Notizfeld wirken immer auf sie. Sobald Listen bestehen, ist genau eine davon aktiv.
- **Zahl hinter dem Namen:** die Anzahl der Anforderungen in der jeweiligen Liste.
- **Menü einer Liste (···):** Umbenennen, Exportieren oder Löschen. Enthält die Liste Einträge, fragt der Explorer vor dem Löschen nach und nennt, wie viele davon Notizen haben.

> [!TIP]
> Gibt es noch keine Liste und Sie klicken auf einen Stern oder verfassen eine Notiz, legt der Explorer automatisch die Liste **Merkliste** an und macht sie zur aktiven Liste.

## Anforderungen aufnehmen: der Stern

Rechts neben dem Titel jeder Anforderung steht in der Detailansicht eine Stern-Schaltfläche. Ihre Farbgebung zeigt den aktuellen Status:

| Stern | Farbgebung | Bedeutung | Klick auf den Stern |
| :---: | :--- | :--- | :--- |
| ![Gelber Stern](bilder/stern-aktiv.png){width=5mm} | **Gelb** (gefüllt) | Die Anforderung steht in der **aktiven Liste**. | Entfernt sie aus der aktiven Liste. |
| ![Grauer Stern](bilder/stern-andere.png){width=5mm} | **Grau** (gefüllt) | Die Anforderung steht in mindestens einer **anderen Liste**. | Nimmt sie zusätzlich in die aktive Liste auf. |
| ![Stern als Umriss](bilder/stern-keine.png){width=5mm} | **Umriss** (ungefüllt) | Die Anforderung steht in **keiner Liste**. | Nimmt sie in die aktive Liste auf. |

/// table-caption
    attrs: {id: tbl-stern}
Die drei Zustände des Sterns in der Detailansicht
///

Der Tooltip des Sterns nennt alle Listen, in denen die Anforderung verzeichnet ist. Hat die Anforderung in der aktiven Liste eine Notiz, fragt der Explorer vor dem Entfernen nach, da die Notiz dabei gelöscht würde.

In der Anforderungsliste (mittlere Spalte) zeigt ein kleiner gelber bzw. grauer Stern ebenfalls an, ob eine Anforderung in der aktiven oder einer anderen Liste steht.

## Notizen

Notizen erfassen Sie in der Detailansicht im Reiter **Notizen**. Sie gehören immer zu einer bestimmten Liste und werden beim Tippen automatisch gespeichert. War die Anforderung noch nicht in der aktiven Liste, wird sie bei der Notizeingabe automatisch aufgenommen.

Ein farbiger Punkt am Reiter signalisiert den Notizen-Status:

| Markierung am Reiter | Zustand | Bedeutung | Bearbeitbarkeit |
| :---: | :--- | :--- | :--- |
| **Grüner Punkt** | Notiz in aktiver Liste | Zur Anforderung liegt eine Notiz in der derzeit aktiven Liste vor. | Im Textfeld bearbeitbar; der Zeitstempel unter dem Feld nennt die letzte Änderung. |
| **Grauer Punkt** | Notiz in anderer Liste | In der aktiven Liste gibt es keine Notiz, jedoch in mindestens einer anderen Liste. | Schreibgeschützt angezeigt; mit *„[Listenname]“ aktivieren* umschaltbar. |
| **Kein Punkt** | Keine Notiz vorhanden | In keiner Liste ist eine Notiz zu dieser Anforderung hinterlegt. | Das Textfeld ist leer; eine Eingabe legt die Notiz direkt in der aktiven Liste an. |

/// table-caption
    attrs: {id: tbl-notizen-stati}
Zustände des Punkts am Reiter „Notizen“
///

Gibt es Notizen in mehreren Listen, wechseln Sie über das Auswahlfeld über dem Textfeld zwischen diesen. Notizen inaktiver Listen sind schreibgeschützt, lassen sich aber über die Schaltfläche unter dem Hinweistext aktivieren und bearbeiten.

![Reiter Notizen mit schreibgeschützter Notiz einer anderen Liste](bilder/detail-notizen-andere.png){width=48%}

/// figure-caption
    attrs: {id: fig-detail-notizen-andere}
Reiter „Notizen“ mit Notiz der nicht aktiven Liste „Entwicklungsteam“ (schreibgeschützt mit Aktivierungs-Link)
///

In der Anforderungsliste weist ein kleines Notizsymbol (grün für die aktive Liste, grau für eine andere Liste) direkt auf vorhandene Notizen hin.

## Listen als Filter

Listen wirken in der Filterleiste wie jeder andere Filterbereich:

- **✓ (nur diese Liste):** zeigt nur die Anforderungen dieser Liste.
- **✕ (Liste ausschließen):** blendet alle Anforderungen dieser Liste aus.
- **Mehrere Listen mit ✓:** zeigt alle Anforderungen, die in mindestens einer dieser Listen stehen (ODER-Verknüpfung).
- **Aktive Liste ausschließen:** Schließen Sie die aktive Liste mit ✕ aus, wird eine andere, nicht ausgeschlossene Liste aktiv. Sind alle Listen ausgeschlossen, bleibt die bisherige aktiv.

## Listen sichern und austauschen

Mit Export und Import übertragen Sie Listen auf ein anderes Gerät, geben sie an Kolleginnen und Kollegen weiter oder sichern sie, bevor Sie den Browserspeicher leeren:

- **Eine Liste exportieren:** im Menü **···** der Liste auf **Exportieren** klicken. Der Explorer lädt eine JSON-Datei mit allen Einträgen und Notizen herunter.
- **Alle Listen sichern:** das Ordner-Symbol neben **„+ Neue Liste“** öffnet ein Menü; **Alle Listen sichern** lädt alle Listen in einer Datei herunter.
- **Listen importieren:** im selben Menü **Listen importieren …** wählen und eine zuvor exportierte JSON-Datei auswählen.

Gibt es eine importierte Liste bereits (gleicher Name, unabhängig von Groß- und Kleinschreibung), fragt der Explorer nach:

- **Zusammenführen:** Neue Einträge werden ergänzt. Unterscheiden sich die Notizen zu derselben Anforderung, bleiben beide erhalten, getrennt durch eine Trennlinie.
- **Als „Name (2)“ anlegen:** Die importierte Liste wird unter einem freien Namen zusätzlich angelegt.
- **Import abbrechen:** Der ganze Import wird abgebrochen, es wird nichts geändert.

> [!TIP]
> Die Exportdateien sind einfache JSON-Dateien. Sie lassen sich mit gängigen Werkzeugen weiterverarbeiten oder in einer Versionsverwaltung ablegen.
