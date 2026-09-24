# Grundschutz++ Explorer (GS++ SPA)

Eine moderne, performante und reine **Single Page Application (SPA)** zur Analyse, Filterung, Auswertung und Versionierung der offiziellen **BSI Grundschutz++ (GS++)** Kataloge und **Elementaren Gefährdungen** im **NIST OSCAL 1.1.3 JSON-Format**.

---

## 📁 Projektstruktur (Alles in `src/`)

Sämtlicher Anwendungscode liegt sauber und übersichtlich im Ordner `src/`:

```
gsexplorer/
├── src/
│   ├── index.html                           # Zentraler SPA-Einstiegspunkt für Ihren Webserver
│   ├── css/
│   │   └── app.css                         # Eigenes Stylesheet (Design-Tokens, Hell/Dunkel)
│   ├── js/
│   │   ├── app.js                          # Hauptanwendung (Vue 3, State, Komponentenlogik)
│   │   ├── diffEngine.js                   # Differenzanalyse & Text-Diffing (Myers/LCS)
│   │   ├── namespaces.js                   # Lädt die BSI-Namespace-Definitionen (CSV) aus data/namespaces/
│   │   ├── oscalParser.js                  # BSI OSCAL Katalog-Parser
│   │   └── storage.js                      # IndexedDB-Persistenzschicht
│   ├── vendor/
│   │   └── vue.global.prod.js              # Lokale Vue 3 Runtime (100 % autark & offline-fähig)
│   └── data/
│       ├── Grundschutz++-resolved_catalog.json       # Offizieller BSI GS++ Katalog (652 Controls)
│       └── namespaces/                               # BSI-Namespaces (Vokabulare & Definitionen), unverändert aus
│                                                     # Stand-der-Technik-Bibliothek/documentation/namespaces
├── README.md
└── .gitignore
```

---

## 🚀 Ausführen mit beliebigem statischen Webserver

Es ist **kein Build-Schritt** (`npm run build`), kein TypeScript und **keine Serverkomponente** erforderlich.

Lassen Sie Ihren gewünschten statischen Webserver einfach auf den Ordner `src/` (oder das Projektverzeichnis) verweisen:

### Option A: Python
```bash
python -m http.server -d src 8080
```

### Option B: Node / npx serve (optional)
```bash
npx serve src
```

### Option C: Beliebiger Webserver (Nginx, Apache, Caddy, IIS, VS Code Live Server)
Geben Sie den Ordner `src` als Document Root an und rufen Sie `index.html` im Browser auf.

---

## 🌟 Funktionsumfang

1. **Reine SPA (Client-Only)**
   * Läuft zu 100 % im Browser. Sämtliche Datenverarbeitung, Filterung, Speicherung und Text-Diffing laufen lokal.
   * Keine Abhängigkeit von externen CDNs erforderlich (alle Vendor-Bibliotheken liegen in `src/vendor/`).

2. **Keine eigenen Annahmen / keine eigenen Datenstrukturen**
   * Die Daten basieren exakt auf dem offiziellen BSI OSCAL-Standard (`catalog.groups` $\to$ `subgroups` $\to$ `controls` $\to$ `parts`).
   * Übernahme aller amtlichen BSI-Namespaces und Properties (`sec_level`, `effort_level`, `modal_verb`, `action_word`, `result`, `documentation`, `alt-identifier`).

3. **Elementare Gefährdungen ($G\ 0.1$ bis $G\ 0.47$)**
   * Zuordnung ausschließlich aus der OSCAL-Eigenschaft `threats` der Grundschutz++-Anforderungen, wie vom BSI im Katalog gepflegt.
   * Bezeichnungen und Definitionen aus dem BSI-Namespace `basethreats.csv`.

4. **Hierarchisch klappbare Baumstruktur & Detailansicht (Split-Screen)**
   * **Linke Spalte**:
     * Dreistufige Hierarchie: **Praktik** (z. B. `GC`, `ARCH`, `OPS`) $\to$ **Teilbereich** (z. B. `GC.1`) $\to$ **Anforderung** (z. B. `GC.1.1`).
     * Globale Steuerung (*Alle aufklappen* / *Alle zuklappen*) sowie automatisches Aufklappen bei Suchtreffern.
     * Sofort sichtbare Badges für Modalverben (`MUSS`, `SOLLTE`, `KANN`), Sicherheitsniveau (`normal-SdT`) und Diff-Status (`+`, `~`, `-`).
     * Dynamisch anpassbare Spaltenbreite per Maus-Resizer.
   * **Rechte Spalte (Detailsicht)**:
     * Vollständiger **Anforderungstext (Statement)** mit hervorgehobenen Modalverben und aufgelösten Parametern.
     * Amtliche **BSI-Erläuterung & Hilfestellung (Guidance)**.
     * Liste der verknüpften **Elementaren Gefährdungen** mit 1-Klick-Filterfunktion.
     * Vollständige **OSCAL-Eigenschaften & Metadaten**-Tabelle mit Namespace-Verweisen.
     * **Diff-Inspektor** mit Textvergleich (Word-Level-Diff) bei Versionsabweichungen.

5. **Multi-Kriterien Filterleiste**
   * **Volltextsuche**: Durchsucht live Kennungen, Titel, Anforderungstexte, Erläuterungen und Gefährdungen.
   * **Praktiken-Filter**: Schnellauswahl der 19 Grundschutz++-Praktiken.
   * **Modalverb-Filter**: Filtern nach Verbindlichkeit (`MUSS`, `SOLLTE`, `KANN`).
   * **Sicherheitsniveau**: Filter nach `sec_level`.
   * **Elementare Gefährdungen**: Dropdown-Auswahl aller zugeordneten Gefährdungen ($G\ 0.x$).
   * **Diff-Filter**: Schnellauswahl für *Alle Änderungen*, *Nur Neu*, *Nur Geändert*, *Nur Gelöscht*.

6. **Browser-Persistenz (IndexedDB)**
   * Gespeicherte Kataloge bleiben auch nach dem Schließen des Browsers vollständig erhalten.
   * Keine 5-MB-Begrenzung (wie bei localStorage) – geeignet für Multi-Megabyte-Kataloge.
   * Versionsverwaltung: Wechseln zwischen mehreren Versionen und Festlegen von Basis- und Vergleichsversionen.

7. **Differenzsicht (Diff-Modus)**
   * Automatischer Abgleich beim Laden neuer Versionen (z. B. BSI-Updates).
   * Visualisierung:
     * 🟢 **Neu (+)**: In neuer Version hinzugefügte Anforderungen.
     * 🟡 **Geändert (~)**: In beiden Versionen vorhanden, jedoch mit geänderten Texten, Modalverben, Niveaus oder Gefährdungen.
     * 🔴 **Gelöscht (-)**: In der Basisversion vorhanden, in der neuen Version entfallen.
     * ⚪ **Unverändert**: Identische Anforderungen.
   * Kennzahlen-Banner im Kopfbereich (`+X Neu`, `~Y Geändert`, `-Z Gelöscht`).
   * Wortgenaues Inline-Diffing geänderter Anforderungstexte und Erläuterungen.

---

## 📄 Lizenz & Hosting

* **Lizenz**: [MIT License](LICENSE) – Copyright (c) 2026 Frank Winter
* **Hosting**: Bereitgestellt als freies Open-Source-Projekt via **GitHub Pages**.
* **Datenschutz & Privacy**: 100 % Client-seitig, keine Cookies, kein Tracking, Persistenz ausschließlich lokal im Browser via IndexedDB.

