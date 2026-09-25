/**
 * SPDX-FileCopyrightText: 2026 Frank Winter
 * SPDX-License-Identifier: MIT
 *
 * Gemeinsame Hilfen für die Tests (Node-Test-Runner, ohne Abhängigkeiten).
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const SRC = path.join(ROOT, 'src');

/**
 * Ersetzt fetch() durch Lesezugriffe auf src/, wie sie die App im Browser relativ zu index.html ausführt.
 */
export function installLocalFetch() {
  globalThis.fetch = async (url) => {
    try {
      const body = await readFile(path.join(SRC, String(url)));
      return new Response(body, { status: 200 });
    } catch {
      return new Response('', { status: 404 });
    }
  };
}

export const OFFICIAL_CATALOG_URL =
  'https://raw.githubusercontent.com/BSI-Bund/Stand-der-Technik-Bibliothek/main/control_layer/Grundschutz%2B%2B/Grundschutz%2B%2B-resolved_catalog.json';

/**
 * Lädt den aktuellen BSI-Katalog aus dem Netz (vor installLocalFetch() gesichertes fetch).
 * Ohne Verbindung wird der aufrufende Test übersprungen.
 */
const networkFetch = globalThis.fetch;
let officialCatalog;
export async function fetchOfficialCatalog(t) {
  if (officialCatalog === undefined) {
    try {
      const res = await networkFetch(OFFICIAL_CATALOG_URL);
      officialCatalog = res.ok ? await res.json() : null;
    } catch {
      officialCatalog = null;
    }
  }
  if (!officialCatalog) t.skip('BSI-Katalog nicht erreichbar (keine Netzverbindung)');
  return officialCatalog;
}

export async function readJson(relativeToSrc) {
  return JSON.parse(await readFile(path.join(SRC, relativeToSrc), 'utf8'));
}
