# Begriffe

Die folgenden Begriffe stammen aus dem Grundschutz++-Katalog und den Begriffsdefinitionen des BSI. Die vollständigen Definitionen zeigt der Explorer direkt an der jeweiligen Stelle per Tooltip oder Info-Button.

## Aufbau des Katalogs

Praktik
: Oberste Gliederungsebene, etwa „DEV Entwicklung“, „GC Governance und Compliance“ oder „ARCH Architektur“. Jede Praktik besitzt eine offizielle Zweckbestimmung des BSI.

Teilbereich
: Fachliche Untergliederung innerhalb einer Praktik, etwa „DEV.4 Softwareentwicklung - Code“.

Anforderung
: Ein verbindlich zu erreichender Zielzustand, etwa „DEV.4.3“. Eine Anforderung kann ihrerseits konkretere Unteranforderungen enthalten.

Unteranforderung
: Spezifizierung einer übergeordneten Anforderung, etwa „DEV.1.1.1“. Im Grundschutz++-Katalog reicht die Hierarchie bis zu vier Ebenen tief.

## Angaben an einer Anforderung

Modalverb
: Grad der Verbindlichkeit:
  - **MUSS:** Unbedingt und ausnahmslos zu erfüllen.
  - **SOLLTE:** Im Regelfall verbindlich; Abweichungen sind fundiert zu begründen und zu dokumentieren.
  - **KANN:** Fakultative Empfehlung je nach Schutzbedarfsanalyse und Risikosituation.

Schutzbedarf
: Sicherheitsniveau, für das eine Anforderung konzipiert ist: **Standard-Sicherheitsstufe** (im Katalog `normal-SdT`) oder **Erhöhte Sicherheitsstufe** (`erhöht`).

Handlungswort
: Das Verb, das die geforderte Handlung operationalisiert (z. B. *verankern*, *dokumentieren*, *durchführen*).

Dokumentationsvorgabe
: Die Dokumentenart oder der Nachweis, in dem das Resultat der Anforderung formal festgehalten wird (z. B. *Sicherheitskonzept*, *Freigabeplan*).

Aufwand
: Schätzung des Umsetzungs- und Pflegeaufwands in den Stufen 0 bis 5. Stufe 1 steht für unkomplizierte Sofortmaßnahmen, Stufe 5 für komplexe Infrastrukturprojekte. Stufe 0 bedeutet: Der Aufwand wird nicht bewertet, da die Maßnahme als zwingende Grundvoraussetzung gilt.

Schutzziele
: Vertraulichkeit (C), Integrität (I), Verfügbarkeit (A) und Authentizität (Au). Für jedes Schutzziel quantifiziert der Katalog die Wirkung: 0 (keine), 1 (wirkt hin) oder 2 (im Zentrum der Anforderung).

Elementare Gefährdung
: Eine der 47 elementaren Gefährdungen G 0.1 bis G 0.47 des IT-Grundschutzes (z. B. „G 0.18 Fehlplanung oder fehlende Anpassung“).

Tag
: Schlagwort aus dem kontrollierten BSI-Vokabular zur thematischen Querschnittsklassifikation (z. B. „Zero Trust“, „Lieferketten“ oder „Kryptografie“).

## Arbeitsfunktionen des Explorers

Eigene Liste
: Eine benutzerdefinierte Sammlung von Anforderungen (z. B. für eine konkrete Projektgruppe, ein Audit oder Maßnahmenpakete).

Notiz
: Ein individueller Textkommentar, der einer Anforderung innerhalb einer bestimmten Liste zugeordnet und lokal gespeichert wird.

Wortvergleich (Word-Diff)
: Algorithmus (Longest Common Subsequence), der Texte zweier Katalogversionen vergleicht und entfernte Wörter durchgestrichen sowie hinzugefügte Wörter farbig markiert.

OSCAL
: Open Security Controls Assessment Language (NIST SP 800-53 / NIST OSCAL 1.1.3), das internationale XML/JSON/YAML-Standardformat für maschinenlesbare Sicherheitskataloge.
