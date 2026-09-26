# Einführung

Der Grundschutz++ Explorer ist ein Werkzeug zum Lesen, Auswerten und Verwalten des **Anwenderkatalogs Grundschutz++**, den das Bundesamt für Sicherheit in der Informationstechnik (BSI) maschinenlesbar im Format NIST OSCAL veröffentlicht. Der Katalog umfasst rund tausend Anforderungen. Im Explorer finden Sie die für Sie relevanten Anforderungen schnell, erfassen eigene Notizen in flexiblen Listen, schlagen Definitionen nach und vergleichen zwei Katalogstände Wort für Wort miteinander.

Das Projekt wurde von Frank Winter, selbst Informationssicherheitsbeauftragter
einer deutschen Landesbehörde, nebenberuflich als freies Open-Source-Projekt (MIT-Lizenz) konzipiert und entwickelt. Ziel ist es, Sicherheitsverantwortlichen, Auditoren und IT-Teams ein schnelles, datensparsames und intuitives Werkzeug für den Arbeitsalltag an die Hand zu geben. Der Autor und das Projekt stehen in keiner organisatorischen oder geschäftlichen Verbindung zum BSI. Sämtliche amtlichen Katalogdaten und Begriffsdefinitionen werden neutral, originalgetreu und ungefiltert visualisiert, sodass Sie stets auf verlässlicher und unverfälschter Grundlage arbeiten.

## Wofür der Explorer gedacht ist

- **Nachschlagen:** Anforderungen über Kennung, Titel oder Volltextsuche in Sekundenschnelle finden.
- **Eingrenzen:** den Katalog nach Verbindlichkeit (Modalverb), Schutzbedarf, Aufwand, Handlungswort, Dokumentationsvorgabe, Schutzzielen, Praktiken, Gefährdungen, Tags und Listen filtern.
- **Eigene Listen & Notizen:** Anforderungen mit einem Stern in thematische Listen aufnehmen (z. B. für Audits, Arbeitsgruppen oder Umsetzungsbesprechungen) und Notizen direkt an der Anforderung festhalten.
- **Verstehen:** BSI-Begriffsdefinitionen per Info-Button direkt an der Anforderung nachschlagen, etwa was eine Aufwandsstufe bedeutet oder welche Vorgaben mit einem Handlungswort verknüpft sind.
- **Vergleichen:** eine neue Version gegen eine ältere halten und auf Wortebene sehen, was neu hinzugekommen, präzisiert oder entfallen ist.

## Voraussetzungen

Sie benötigen lediglich einen aktuellen Webbrowser (z. B. Chrome, Edge, Firefox oder Safari). Eine Installation, Registrierung oder Anmeldung ist nicht erforderlich. Rufen Sie die Anwendung einfach auf:

```text
https://www.grundschutz-explorer.de
```

![Startseite beim ersten Aufruf](bilder/startseite.png){width=100%}

/// figure-caption
    attrs: {id: fig-startseite}
Startseite beim ersten Aufruf
///

Beim ersten Aufruf erscheint die Startseite. Über **Katalog laden** öffnen Sie den Ladedialog und beziehen den aktuellen Grundschutz++-Katalog direkt vom BSI oder laden einen eigenen OSCAL-Katalog per Datei oder URL. Darunter fasst die Startseite kurz zusammen, woher die Daten stammen und wie der Explorer mit Ihren Daten verfährt. Ein geladener Katalog bleibt in Ihrem Browser gespeichert und steht beim nächsten Besuch sofort bereit.

![Dialog „Katalog laden“](bilder/kataloge-laden.png){width=55%}

/// figure-caption
    attrs: {id: fig-start-katalog-laden}
Dialog „Katalog laden“ mit offizieller BSI-Quelle, URL-Eingabe und Dateiupload
///

> [!NOTE]
> Die Schaltfläche **Offiziellen BSI Grundschutz++ Anwenderkatalog laden** ruft die Datei direkt aus der Stand-der-Technik-Bibliothek des BSI auf GitHub ab. Vorher stellt der Explorer keinerlei externe Verbindungen her.

## Datenschutz und lokale Speicherung

Der Explorer arbeitet zu 100 % lokal in Ihrem Browser (Zero-Server-Architektur). Kataloge, Listen, Notizen, Filter und Einstellungen werden ausschließlich in der internen Datenbank Ihres Browsers (IndexedDB) abgelegt. Es gibt kein Tracking, keine Cookies von Drittanbietern und keine Datenübertragung an Server.

> [!TIP]
> Einzelne Kataloge löschen Sie unter **Kataloge** über das Papierkorb-Symbol. Alle lokal gespeicherten Daten (Kataloge, Listen, Notizen und Einstellungen) entfernen Sie in der **Datenschutzerklärung** mit einem Klick auf **Alle lokal gespeicherten Daten löschen**.

## Aufbau dieses Handbuchs

- **Grundlagen:** Stellt die Bildschirmoberfläche und ihre Bedienelemente vor.
- **Arbeiten mit dem Katalog:** Führt Schritt für Schritt durch Navigation, Suche und Filter, das Lesen von Anforderungen, die Listen- und Notizverwaltung sowie den Versionsvergleich.
- **Anhang:** Enthält Begriffsdefinitionen, Tastaturkürzel und Hinweise zu Datenquellen.
