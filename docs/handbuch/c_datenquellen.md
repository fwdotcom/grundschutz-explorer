# Datenquellen und Lizenzen

## Inhalte des BSI

Der offizielle Grundschutz++-Anwenderkatalog und die Begriffsdefinitionen stammen aus der öffentlich zugänglichen **Stand-der-Technik-Bibliothek** des Bundesamts für Sicherheit in der Informationstechnik:

```text
https://github.com/BSI-Bund/Stand-der-Technik-Bibliothek
```

| Inhalt | Quelle in der Bibliothek | Verwendung im Explorer |
| :--- | :--- | :--- |
| **Grundschutz++-Anwenderkatalog** | `control_layer/Grundschutz++/` | Wird beim Laden direkt und unverändert vom BSI (GitHub) abgerufen. Das Projekt liefert keine Katalogdaten mit. |
| **BSI-Namespaces und Begriffsdefinitionen** | `documentation/namespaces/` | Lokale Kopien der CSV-Dateien (Aufwand, Gefährdungen, Handlungswörter, Dokumentation, Modalverben, Schutzbedarf, Schutzziele und Wirkungsstufen, Tags). |

Die Inhalte der Stand-der-Technik-Bibliothek stehen unter der Lizenz **Creative Commons Namensnennung – Weitergabe unter gleichen Bedingungen 4.0 International (CC BY-SA 4.0)**. Der Explorer zeigt sie unverändert an. Die Rechte an diesen Inhalten liegen beim BSI.

## Verwendete Komponenten

### Vue.js

JavaScript-Framework, auf dem die Oberfläche des Explorers aufbaut. Es wird mit der Anwendung ausgeliefert und nicht von einem fremden Server geladen.

| Rechteinhaber | Lizenz | Quelle |
| :--- | :--- | :--- |
| © Yuxi (Evan) You und Vue-Mitwirkende | MIT-Lizenz | `https://github.com/vuejs/core` |

### Schrift Open Sans

Schriftart der Oberfläche. Sie wird mit der Anwendung ausgeliefert und nicht von einem Schriftdienst geladen.

| Rechteinhaber | Lizenz | Quelle |
| :--- | :--- | :--- |
| © The Open Sans Project Authors | SIL Open Font License 1.1 | `https://github.com/googlefonts/opensans` |

### Symbole

Die Symbole der Oberfläche sind direkt in die Anwendung eingebettet. Ein Teil davon entspricht Symbolen aus Lucide bzw. dem Vorgängerprojekt Feather Icons.

| Rechteinhaber | Lizenz | Quelle |
| :--- | :--- | :--- |
| © Lucide Icons and Contributors | ISC-Lizenz | `https://github.com/lucide-icons/lucide` |
| © Cole Bemis (Feather Icons) | MIT-Lizenz | `https://github.com/feathericons/feather` |

## Der Grundschutz++ Explorer

Der Grundschutz++ Explorer ist ein unabhängiges Open-Source-Projekt ohne Verbindung zum BSI und steht unter der **MIT-Lizenz**.

| Eigenschaft | Angabe |
| :--- | :--- |
| **Webadresse** | `https://www.grundschutz-explorer.de` |
| **Autor & Copyright** | © 2026 Frank Winter |
| **Technik** | Läuft vollständig im Browser, Daten werden nur lokal gespeichert (IndexedDB) |
| **Standards** | NIST OSCAL 1.1.3; orientiert sich an WCAG 2.1 AA, im hohen Kontrastmodus an AAA-Kontrast |
| **Handbuch** | Erstellt mit markpublish, `https://www.markpublish.com` |
