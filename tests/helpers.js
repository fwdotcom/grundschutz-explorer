/**
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

export async function readJson(relativeToSrc) {
  return JSON.parse(await readFile(path.join(SRC, relativeToSrc), 'utf8'));
}
