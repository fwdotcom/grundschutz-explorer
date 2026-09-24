/**
 * Prüft die ausgelieferte statische Seite: verlinkte Dateien vorhanden, Module importierbar, Metadaten gesetzt.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, access } from 'node:fs/promises';
import path from 'node:path';
import { SRC } from './helpers.js';

const html = await readFile(path.join(SRC, 'index.html'), 'utf8');

test('alle lokal referenzierten Dateien in index.html existieren', async () => {
  // Nur statische Attribute; an Vue gebundene (:href, v-bind:src) enthalten Ausdrücke statt Pfaden
  const refs = [...html.matchAll(/(?<![:\w-])(?:src|href)="([^"]+)"/g)]
    .map((m) => m[1])
    .filter((ref) => !/^(https?:|mailto:|#|data:|javascript:)/.test(ref) && !ref.includes('{{'));
  assert.ok(refs.length > 0);
  for (const ref of refs) {
    await assert.doesNotReject(access(path.join(SRC, ref)), `fehlt: ${ref}`);
  }
});

test('lokale fetch()-Pfade in app.js existieren', async () => {
  const app = await readFile(path.join(SRC, 'js/app.js'), 'utf8');
  const paths = [...app.matchAll(/fetch\('(data\/[^']+)'\)/g)].map((m) => m[1]);
  for (const p of paths) {
    await assert.doesNotReject(access(path.join(SRC, p)), `fehlt: ${p}`);
  }
});

test('alle JS-Module (außer der Browser-App) lassen sich importieren', async () => {
  // app.js und storage.js benötigen Vue bzw. IndexedDB aus dem Browser
  const files = (await readdir(path.join(SRC, 'js'))).filter((f) => f.endsWith('.js') && !['app.js', 'storage.js'].includes(f));
  for (const f of files) {
    await assert.doesNotReject(import(`../src/js/${f}`), `Import fehlgeschlagen: ${f}`);
  }
});

test('Metadaten: Titel, Beschreibung und Open Graph mit absoluten URLs', () => {
  assert.match(html, /<title>[^<]+<\/title>/);
  assert.match(html, /<meta name="description" content="[^"]{50,}"/);
  for (const prop of ['og:title', 'og:description', 'og:type', 'og:url', 'og:image']) {
    assert.match(html, new RegExp(`<meta property="${prop}" content="[^"]+"`), `${prop} fehlt`);
  }
  const ogImage = html.match(/<meta property="og:image" content="([^"]+)"/)[1];
  assert.match(ogImage, /^https:\/\//, 'og:image muss eine absolute URL sein');
});

test('Handbuch-Pfad in app.js passt zu scripts/build_manual.py', async () => {
  const app = await readFile(path.join(SRC, 'js/app.js'), 'utf8');
  const script = await readFile(path.join(SRC, '..', 'scripts/build_manual.py'), 'utf8');
  const manualPath = app.match(/^const MANUAL_PATH = '([^']+)';/m)?.[1];
  const prefix = script.match(/^FILE_PREFIX = "([^"]+)"/m)?.[1];
  assert.ok(manualPath && prefix, 'MANUAL_PATH oder FILE_PREFIX nicht gefunden');
  assert.equal(manualPath, `docs/manual/${prefix}`);
});

test('Lizenztext im Dialog stimmt mit LICENSE überein', async () => {
  const decode = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
  const normalize = (s) => s.replace(/\s+/g, ' ').trim();
  const shown = html.match(/<pre class="license-text"[^>]*>([\s\S]*?)<\/pre>/)?.[1];
  assert.ok(shown, 'Lizenztext im Dialog nicht gefunden');
  const license = await readFile(path.join(SRC, '..', 'LICENSE'), 'utf8');
  assert.equal(normalize(decode(shown)), normalize(license));
});

test('Open-Graph-Bild liegt lokal vor', async () => {
  const ogImage = html.match(/<meta property="og:image" content="https:\/\/[^/]+\/([^"]+)"/)[1];
  await assert.doesNotReject(access(path.join(SRC, ogImage)), `fehlt: ${ogImage}`);
});
