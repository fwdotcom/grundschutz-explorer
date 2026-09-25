/**
 * SPDX-FileCopyrightText: 2026 Frank Winter
 * SPDX-License-Identifier: MIT
 *
 * Eigene Listen: Einträge (Anforderung + Notiz), Export und Import als JSON (ohne Abhängigkeiten)
 */

export const LIST_EXPORT_FORMAT = 'grundschutz-explorer-lists';
export const LIST_EXPORT_VERSION = 1;

// Trenner, wenn beim Zusammenführen zwei unterschiedliche Notizen aufeinandertreffen
const NOTE_MERGE_SEPARATOR = '\n\n---\n\n';

export function entryKey(listId, controlId) {
  return `${listId}|${controlId}`;
}

export function createListId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `list-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Baut die Exportdatei für eine oder mehrere Listen.
 * entries: alle Einträge; exportiert werden nur die der übergebenen Listen.
 */
export function buildListExport(lists, entries, appVersion = '') {
  return {
    format: LIST_EXPORT_FORMAT,
    version: LIST_EXPORT_VERSION,
    app: appVersion,
    exportedAt: new Date().toISOString(),
    lists: lists.map((list) => ({
      name: list.name,
      createdAt: list.createdAt,
      entries: entries
        .filter((e) => e.listId === list.id)
        .sort((a, b) => a.controlId.localeCompare(b.controlId, 'de', { numeric: true }))
        .map((e) => ({
          controlId: e.controlId,
          note: e.note || '',
          createdAt: e.createdAt,
          updatedAt: e.updatedAt,
        })),
    })),
  };
}

/**
 * Prüft eine Importdatei und liefert bereinigte Listen: [{ name, createdAt, entries: [{ controlId, note, ... }] }].
 * Wirft einen Error mit verständlicher Meldung, wenn die Datei nicht passt.
 */
export function parseListImport(data) {
  if (!data || typeof data !== 'object' || data.format !== LIST_EXPORT_FORMAT) {
    throw new Error('Die Datei ist keine Listen-Sicherung des Grundschutz++ Explorers.');
  }
  if (typeof data.version !== 'number' || data.version > LIST_EXPORT_VERSION) {
    throw new Error('Die Listen-Sicherung stammt aus einer neueren Version des Explorers.');
  }
  if (!Array.isArray(data.lists)) {
    throw new Error('Die Listen-Sicherung enthält keine Listen.');
  }
  const now = new Date().toISOString();
  return data.lists
    .filter((l) => l && typeof l.name === 'string' && l.name.trim())
    .map((l) => {
      // Doppelte Anforderungen innerhalb einer Liste zusammenfassen
      const byControl = new Map();
      for (const e of Array.isArray(l.entries) ? l.entries : []) {
        if (!e || typeof e.controlId !== 'string' || !e.controlId.trim()) continue;
        const controlId = e.controlId.trim();
        const note = typeof e.note === 'string' ? e.note : '';
        const prev = byControl.get(controlId);
        byControl.set(controlId, {
          controlId,
          note: prev ? mergeNotes(prev.note, note) : note,
          createdAt: typeof e.createdAt === 'string' ? e.createdAt : now,
          updatedAt: typeof e.updatedAt === 'string' ? e.updatedAt : now,
        });
      }
      return {
        name: l.name.trim(),
        createdAt: typeof l.createdAt === 'string' ? l.createdAt : now,
        entries: Array.from(byControl.values()),
      };
    });
}

// Führt zwei Notizen zusammen, ohne Text zu verlieren
export function mergeNotes(existing = '', incoming = '') {
  const a = existing.trim();
  const b = incoming.trim();
  if (!a) return incoming;
  if (!b || a === b || a.includes(b)) return existing;
  return existing.trimEnd() + NOTE_MERGE_SEPARATOR + incoming.trim();
}

// Freier Listenname: "Name", sonst "Name (2)", "Name (3)" …
export function uniqueListName(name, existingNames) {
  const taken = new Set(existingNames.map((n) => n.toLocaleLowerCase('de')));
  if (!taken.has(name.toLocaleLowerCase('de'))) return name;
  for (let i = 2; ; i++) {
    const candidate = `${name} (${i})`;
    if (!taken.has(candidate.toLocaleLowerCase('de'))) return candidate;
  }
}

// Dateiname der Sicherung, z. B. grundschutz-explorer-liste-workshop-it-betrieb-2026-09-25.json
export function listExportFileName(listName = '', date = new Date()) {
  const day = date.toISOString().slice(0, 10);
  if (!listName) return `grundschutz-explorer-listen-${day}.json`;
  const slug = listName
    .toLocaleLowerCase('de')
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return `grundschutz-explorer-liste-${slug || 'export'}-${day}.json`;
}
