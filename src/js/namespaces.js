/**
 * SPDX-FileCopyrightText: 2026 Frank Winter
 * SPDX-License-Identifier: MIT
 *
 * BSI-Namespace-Definitionen (kontrollierte Vokabulare der Stand-der-Technik-Bibliothek)
 *
 * Die CSV-Dateien liegen unverändert unter data/namespaces/ und stammen aus
 * https://github.com/BSI-Bund/Stand-der-Technik-Bibliothek/tree/main/documentation/namespaces
 * Für ein Update genügt es, die Dateien dort neu herunterzuladen.
 */

const NAMESPACE_BASE = 'data/namespaces/';

// Genutzte Namespaces: Datei und Spalte mit dem Schlüssel
const NAMESPACE_FILES = {
  effortLevels: { file: 'effort_level.csv', key: 'Aufwand' },
  basethreats: { file: 'basethreats.csv', key: 'ID' },
  actionWords: { file: 'action_words.csv', key: 'Infinitiv' },
  documentation: { file: 'documentation_guidelines.csv', key: 'Begriff' },
  modalVerbs: { file: 'modal_verbs.csv', key: 'Begriff' },
  securityLevels: { file: 'security_level.csv', key: 'Begriff' },
  securityTargets: { file: 'security_targets.csv', key: 'Begriff' },
  securityTargetLevels: { file: 'security_targets_levels.csv', key: 'Wert' },
  tags: { file: 'tags.csv', key: 'Tag' },
};

/**
 * Geladene Namespaces: je Namespace ein Objekt Schlüssel → Zeile (Spaltenname → Wert).
 * Wird von loadNamespaces() befüllt; bis dahin (oder falls das Laden scheitert) leer.
 */
export const namespaces = Object.fromEntries(Object.keys(NAMESPACE_FILES).map((name) => [name, {}]));

/**
 * Minimaler CSV-Parser nach RFC 4180 (Komma, Anführungszeichen, "" als Escape, Zeilenumbrüche in Feldern).
 */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  const src = text.replace(/^﻿/, '');

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
}

// Vergleichsschlüssel: Groß-/Kleinschreibung, Leerzeichen und Bindestriche ignorieren
// (z.B. "Detektions-Konzept" im Katalog ↔ "Detektionskonzept" im Namespace)
function normalizeKey(value) {
  return String(value).toLowerCase().replace(/[\s\-‐–]+/g, '');
}

function tableFromCsv(text, keyColumn) {
  const [header, ...rows] = parseCsv(text);
  if (!header) return {};
  const columns = header.map((h) => h.trim());
  const keyIndex = columns.indexOf(keyColumn);
  const table = {};
  const normalized = {};
  for (const r of rows) {
    const entry = {};
    columns.forEach((col, idx) => {
      entry[col] = (r[idx] ?? '').trim();
    });
    const key = (r[keyIndex] ?? '').trim();
    if (key) {
      table[key] = entry;
      normalized[normalizeKey(key)] = entry;
    }
  }
  Object.defineProperty(table, '_normalized', {
    value: normalized,
    enumerable: false,
    writable: true,
    configurable: true,
  });
  return table;
}

/**
 * Lädt alle genutzten Namespaces. Fehler einzelner Dateien werden protokolliert,
 * die App funktioniert dann ohne die jeweiligen Definitionen weiter.
 */
export async function loadNamespaces() {
  await Promise.all(
    Object.entries(NAMESPACE_FILES).map(async ([name, { file, key }]) => {
      try {
        const res = await fetch(NAMESPACE_BASE + file);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        namespaces[name] = tableFromCsv(await res.text(), key);
      } catch (err) {
        console.warn(`Namespace ${file} konnte nicht geladen werden:`, err);
      }
    })
  );
  return namespaces;
}

/**
 * Liefert den Eintrag eines Namespace zu einem Wert (exakt, sonst tolerant verglichen).
 */
export function lookupNamespace(name, value) {
  if (value === undefined || value === null || value === '') return null;
  const table = namespaces[name];
  if (!table) return null;
  const key = String(value).trim();
  if (table[key]) return table[key];
  const norm = normalizeKey(key);
  if (table._normalized && table._normalized[norm]) {
    return table._normalized[norm];
  }
  return null;
}

/**
 * Definitionstext eines Namespace-Eintrags (Spalte "Definition").
 */
export function namespaceDefinition(name, value) {
  const entry = lookupNamespace(name, value);
  return entry?.Definition || entry?.Bedeutung || '';
}
