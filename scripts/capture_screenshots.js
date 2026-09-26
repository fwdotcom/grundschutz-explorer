/**
 * SPDX-FileCopyrightText: 2026 Frank Winter
 * SPDX-License-Identifier: MIT
 *
 * Automatische Screenshot-Erstellung für das Handbuch via Chrome DevTools Protocol.
 */

import { spawn } from 'node:child_process';
import http from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const TESTDATEN = path.join(ROOT, 'testdaten');
const BILDER_DIR = path.join(ROOT, 'docs', 'handbuch', 'bilder');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
  '.csv': 'text/csv; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

function createStaticServer() {
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://127.0.0.1`);
      let pathname = decodeURIComponent(url.pathname);
      if (pathname === '/') pathname = '/index.html';

      let filePath;
      if (pathname.startsWith('/testdaten/')) {
        filePath = path.join(TESTDATEN, pathname.replace('/testdaten/', ''));
      } else {
        filePath = path.join(SRC, pathname.replace(/^\//, ''));
      }

      const content = await readFile(filePath);
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, {
        'Content-Type': MIME[ext] || 'application/octet-stream',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(content);
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    }
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      resolve({ server, port });
    });
  });
}

async function main() {
  const { server, port } = await createStaticServer();
  console.log(`HTTP-Server läuft auf http://127.0.0.1:${port}`);

  const tempDir = path.join(process.env.TEMP, `gsexplorer-chrome-${Date.now()}`);
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const cdpPort = 9335;

  const chrome = spawn(chromePath, [
    '--headless=new',
    `--remote-debugging-port=${cdpPort}`,
    `--user-data-dir=${tempDir}`,
    '--no-first-run',
    '--disable-extensions',
    '--no-default-browser-check',
    '--window-size=1280,850',
    '--hide-scrollbars',
  ]);

  try {
    let wsUrl = null;
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 200));
      try {
        const res = await fetch(`http://127.0.0.1:${cdpPort}/json/list`);
        const tabs = await res.json();
        const pageTab = tabs.find((t) => t.type === 'page');
        if (pageTab?.webSocketDebuggerUrl) {
          wsUrl = pageTab.webSocketDebuggerUrl;
          break;
        }
      } catch {}
    }
    if (!wsUrl) throw new Error('Chrome CDP konnte nicht erreicht werden.');

    const ws = new WebSocket(wsUrl);
    await new Promise((r) => (ws.onopen = r));

    let msgId = 1;
    const send = (method, params = {}) =>
      new Promise((resolve, reject) => {
        const currentId = msgId++;
        const onMsg = (evt) => {
          const data = JSON.parse(evt.data);
          if (data.id === currentId) {
            ws.removeEventListener('message', onMsg);
            if (data.error) reject(new Error(`${method}: ${JSON.stringify(data.error)}`));
            else resolve(data.result);
          }
        };
        ws.addEventListener('message', onMsg);
        ws.send(JSON.stringify({ id: currentId, method, params }));
      });

    const evalJs = async (expr) => {
      const res = await send('Runtime.evaluate', {
        expression: expr,
        returnByValue: true,
        awaitPromise: true,
      });
      return res.result?.value;
    };

    const wait = (ms) => new Promise((r) => setTimeout(r, ms));

    const waitFor = async (expr, timeout = 12000) => {
      const start = Date.now();
      while (Date.now() - start < timeout) {
        const res = await evalJs(`Boolean(${expr})`);
        if (res) return true;
        await wait(200);
      }
      throw new Error(`Timeout waiting for ${expr}`);
    };

    await send('Page.enable');
    await send('DOM.enable');
    await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1200,
      height: 760,
      deviceScaleFactor: 2,
      mobile: false,
    });
    await send('Emulation.setEmulatedMedia', {
      media: 'screen',
      features: [
        { name: 'prefers-color-scheme', value: 'light' },
        { name: 'prefers-contrast', value: 'no-preference' },
      ],
    });

    await mkdir(BILDER_DIR, { recursive: true });

    const ensureLightTheme = async () => {
      await evalJs(`(() => {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.remove('contrast');
      })()`);
    };

    const capture = async (filename, clip = null) => {
      await ensureLightTheme();
      const opts = { format: 'png' };
      if (clip) {
        opts.clip = {
          x: Math.max(0, Math.round(clip.x)),
          y: Math.max(0, Math.round(clip.y)),
          width: Math.round(clip.width),
          height: Math.round(clip.height),
          scale: 1,
        };
      }
      const res = await send('Page.captureScreenshot', opts);
      const buf = Buffer.from(res.data, 'base64');
      const outPath = path.join(BILDER_DIR, filename);
      await writeFile(outPath, buf);
      console.log(`Screenshot gespeichert (hell): ${filename} (${(buf.length / 1024).toFixed(0)} KB)`);
    };

    const getRect = async (selector) => {
      return await evalJs(`(() => {
        const el = document.querySelector(${JSON.stringify(selector)});
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: r.left, y: r.top, width: r.width, height: r.height };
      })()`);
    };

    // 1. STARTSEITE (noch kein Katalog geladen)
    console.log('\n--- 1. Startseite aufnehmen (gesamte Bildschirmseite) ---');
    await send('Page.navigate', { url: `http://127.0.0.1:${port}/index.html` });
    await waitFor('document.querySelector(".welcome")');
    await wait(400);

    // Gesamte Bildschirmseite aufnehmen (analog oberflaeche.png)
    await capture('startseite.png');

    // 2. DIALOG KATALOG LADEN
    console.log('\n--- 2. Dialog Katalog laden aufnehmen ---');
    await evalJs(`document.querySelector('.welcome-cta')?.click()`);
    await waitFor('document.querySelector("dialog[aria-labelledby=\'load-title\'][open]")');
    await wait(300);

    const loadDialogRect = await getRect('dialog[aria-labelledby="load-title"]');
    if (loadDialogRect) {
      await capture('kataloge-laden.png', {
        x: loadDialogRect.x - 10,
        y: loadDialogRect.y - 10,
        width: loadDialogRect.width + 20,
        height: loadDialogRect.height + 20,
      });
    }
    // Dialog schließen
    await evalJs(`document.querySelector('dialog[aria-labelledby="load-title"] .icon-btn')?.click()`);
    await wait(300);

    // 3. DATENBANK INITIALISIEREN: Basiskatalog, Vergleichskatalog, Listen & Notizen
    console.log('\n--- 3. Datenbank initialisieren ---');
    const baseRaw = await readFile(path.join(TESTDATEN, 'Grundschutz++-resolved_catalog.json'), 'utf8');
    const testRaw = await readFile(path.join(TESTDATEN, 'Grundschutz++-vergleich_catalog.json'), 'utf8');

    await evalJs(`(async () => {
      const baseJson = ${baseRaw};
      const testJson = ${testRaw};

      const req = indexedDB.open('grundschutz_explorer', 2);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('catalogs')) {
          const cs = db.createObjectStore('catalogs', { keyPath: 'id' });
          cs.createIndex('importedAt', 'importedAt');
        }
        if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings', { keyPath: 'key' });
        if (!db.objectStoreNames.contains('lists')) db.createObjectStore('lists', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('listEntries')) {
          const es = db.createObjectStore('listEntries', { keyPath: 'key' });
          es.createIndex('listId', 'listId');
        }
      };
      const db = await new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });

      const tx = db.transaction(['catalogs', 'settings', 'lists', 'listEntries'], 'readwrite');

      tx.objectStore('catalogs').put({
        id: 'bsi-base',
        title: 'Anwenderkatalog Grundschutz++',
        version: '2026-09-10',
        sourceType: 'official',
        sourceName: 'BSI Stand-der-Technik-Bibliothek',
        importedAt: '2026-09-24T10:00:00.000Z',
        catalogData: baseJson
      });
      tx.objectStore('catalogs').put({
        id: 'test-vergleich',
        title: 'Anwenderkatalog Grundschutz++ (Vergleichsversion)',
        version: '2026.2-Testvergleich',
        sourceType: 'file',
        sourceName: 'Grundschutz++-vergleich_catalog.json',
        importedAt: '2026-09-25T20:00:00.000Z',
        catalogData: testJson
      });

      tx.objectStore('settings').put({ key: 'last_active_catalog_id', value: 'bsi-base' });
      tx.objectStore('settings').put({ key: 'comparison_catalog_id', value: '' });
      tx.objectStore('settings').put({ key: 'active_list_id', value: 'list-audit' });
      tx.objectStore('settings').put({ key: 'dark_mode', value: false });
      tx.objectStore('settings').put({ key: 'high_contrast', value: false });
      tx.objectStore('settings').put({ key: 'font_scale', value: 1 });

      tx.objectStore('lists').put({
        id: 'list-audit',
        name: 'Audit 2026',
        createdAt: '2026-09-25T12:00:00.000Z'
      });
      tx.objectStore('lists').put({
        id: 'list-team',
        name: 'Entwicklungsteam',
        createdAt: '2026-09-25T14:00:00.000Z'
      });

      tx.objectStore('listEntries').put({
        key: 'list-audit|DEV.3.4',
        listId: 'list-audit',
        controlId: 'DEV.3.4',
        note: 'Passwort-Hashing nach BSI TR-02102 auf Argon2id umstellen. Salt mindestens 128 Bit Zufallswert.',
        updatedAt: '2026-09-25T15:30:00.000Z'
      });
      tx.objectStore('listEntries').put({
        key: 'list-team|DEV.4.3',
        listId: 'list-team',
        controlId: 'DEV.4.3',
        note: 'Prüfen, ob SBOM im CI/CD-Build automatisiert erzeugt und digital signiert wird.',
        updatedAt: '2026-09-25T16:00:00.000Z'
      });

      await new Promise((resolve) => {
        tx.oncomplete = resolve;
      });
      db.close();
    })()`);

    console.log('Datenbank erfolgreich befüllt. Lade Seite neu...');
    await send('Page.navigate', { url: `http://127.0.0.1:${port}/index.html` });
    await waitFor('document.querySelector(".topbar") && document.querySelector(".detail-pane")');
    await wait(600);

    // 4. KOPFZEILE
    console.log('\n--- 4. Kopfzeile aufnehmen ---');
    const headerRect = await getRect('.topbar');
    if (headerRect) {
      await capture('kopfzeile.png', headerRect);
    }

    // 5. OBERFLÄCHE (GESAMTANSICHT)
    console.log('\n--- 5. Gesamtansicht aufnehmen ---');
    await capture('oberflaeche.png');

    // 6. UNTERANFORDERUNGEN IM BAUM (Mehrstufige Verästelung in GC.9.1)
    console.log('\n--- 6. Mehrstufige Unteranforderungen im Baum aufnehmen ---');
    await evalJs(`(() => {
      // GC aufklappen falls noch zu
      const gcHead = document.querySelector('.practice-head[data-practice-id="GC"]');
      if (gcHead && !gcHead.closest('.practice-group')?.classList.contains('open')) {
        gcHead.querySelector('.head-toggle')?.click();
      }
    })()`);
    await wait(300);
    await evalJs(`(() => {
      // GC.9 aufklappen
      const gc9Head = document.querySelector('.subgroup-head[data-sub-id="GC.9"]');
      if (gc9Head && !gc9Head.closest('.subgroup')?.classList.contains('open')) {
        gc9Head.querySelector('.head-toggle')?.click();
      }
    })()`);
    await wait(300);
    await evalJs(`(() => {
      // GC.9.1 aufklappen (Ebene 1)
      const gc91Row = document.querySelector('.ctrl-row[data-ctrl-id="GC.9.1"]');
      gc91Row?.querySelector('.ctrl-toggle')?.click();
    })()`);
    await wait(300);
    await evalJs(`(() => {
      // GC.9.1.1 aufklappen (Ebene 2)
      const gc911Row = document.querySelector('.ctrl-row[data-ctrl-id="GC.9.1.1"]');
      gc911Row?.querySelector('.ctrl-toggle')?.click();
    })()`);
    await wait(300);
    await evalJs(`(() => {
      // GC.9.1.1.1 aufklappen (Ebene 3)
      const gc9111Row = document.querySelector('.ctrl-row[data-ctrl-id="GC.9.1.1.1"]');
      gc9111Row?.querySelector('.ctrl-toggle')?.click();

      // Zu GC.9.1 scrollen
      const target = document.querySelector('.ctrl-row[data-ctrl-id="GC.9.1"]');
      target?.scrollIntoView({ block: 'start' });
    })()`);
    await wait(400);

    const listPaneRect = await getRect('.list-pane');
    if (listPaneRect) {
      await capture('unteranforderungen.png', {
        x: listPaneRect.x,
        y: listPaneRect.y,
        width: Math.min(listPaneRect.width, 540),
        height: Math.min(listPaneRect.height, 460),
      });
    }

    // 7. DETAILANSICHT: REITER ÜBERSICHT (DEV.3.1 mit kurzem Text)
    console.log('\n--- 7. Detailansicht: Reiter Übersicht aufnehmen (DEV.3.1) ---');
    await evalJs(`(() => {
      const devHead = document.querySelector('.practice-head[data-practice-id="DEV"]');
      if (devHead && !devHead.closest('.practice-group')?.classList.contains('open')) {
        devHead.querySelector('.head-toggle')?.click();
      }
    })()`);
    await wait(300);
    await evalJs(`(() => {
      const dev3Head = document.querySelector('.subgroup-head[data-sub-id="DEV.3"]');
      if (dev3Head && !dev3Head.closest('.subgroup')?.classList.contains('open')) {
        dev3Head.querySelector('.head-toggle')?.click();
      }
    })()`);
    await wait(300);
    await evalJs(`(() => {
      const dev31Row = document.querySelector('.ctrl-row[data-ctrl-id="DEV.3.1"]');
      dev31Row?.click();
    })()`);
    await waitFor('document.querySelector("#tab-overview.on")');
    await wait(400);
    const dev31DetailRect = await getRect('.detail-pane');
    if (dev31DetailRect) {
      await capture('detailansicht.png', {
        x: dev31DetailRect.x,
        y: dev31DetailRect.y,
        width: dev31DetailRect.width,
        height: 528,
      });
    }

    // Zurück zu DEV.3.4 für Hilfestellung und Notizen
    await evalJs(`(() => {
      const dev34Row = document.querySelector('.ctrl-row[data-ctrl-id="DEV.3.4"]');
      dev34Row?.click();
    })()`);
    await wait(300);

    // 8. DETAILANSICHT: REITER HILFESTELLUNG
    console.log('\n--- 8. Detailansicht: Reiter Hilfestellung aufnehmen ---');
    await evalJs(`document.querySelector('#tab-guidance')?.click()`);
    await waitFor('document.querySelector("#tab-guidance.on")');
    await wait(300);
    const gdnDetailRect = await getRect('.detail-pane');
    if (gdnDetailRect) {
      await capture('detail-hilfestellung.png', {
        x: gdnDetailRect.x,
        y: gdnDetailRect.y,
        width: gdnDetailRect.width,
        height: 405,
      });
    }

    // 9. DETAILANSICHT: REITER NOTIZEN
    console.log('\n--- 9. Detailansicht: Reiter Notizen aufnehmen ---');
    await evalJs(`document.querySelector('#tab-notes')?.click()`);
    await waitFor('document.querySelector("#tab-notes.on")');
    await wait(300);
    const noteDetailRect = await getRect('.detail-pane');
    if (noteDetailRect) {
      await capture('detail-notizen.png', {
        x: noteDetailRect.x,
        y: noteDetailRect.y,
        width: noteDetailRect.width,
        height: 508,
      });
    }

    // 10. LISTEN IN FILTERLEISTE
    console.log('\n--- 10. Listen in Filterleiste aufnehmen ---');
    await evalJs(`(() => {
      const firstMenuBtn = document.querySelector('.list-row .list-menu-btn');
      firstMenuBtn?.click();
    })()`);
    await wait(300);
    const listenBounds = await evalJs(`(() => {
      const rail = document.querySelector('.rail');
      const listSec = rail?.querySelector('.rail-section');
      const listMenu = document.querySelector('.list-menu');
      if (!rail || !listSec) return null;
      const railR = rail.getBoundingClientRect();
      const secR = listSec.getBoundingClientRect();
      const menuR = listMenu?.getBoundingClientRect();
      const bottom = Math.max(secR.bottom, menuR ? menuR.bottom + 3 : 0);
      return {
        x: railR.x,
        y: railR.y,
        width: railR.width,
        height: Math.ceil(bottom - railR.y)
      };
    })()`);
    if (listenBounds) {
      await capture('listen.png', listenBounds);
    }
    await evalJs(`(() => {
      const firstMenuBtn = document.querySelector('.list-row .list-menu-btn');
      if (document.querySelector('.list-menu')) firstMenuBtn?.click();
    })()`);
    await wait(200);

    // 11. FILTER UND FLACHE TREFFERLISTE (NUR und NICHT)
    console.log('\n--- 11. Filter und flache Trefferliste aufnehmen (NUR & NICHT) ---');
    await evalJs(`(() => {
      // 1. NUR Modalverb: MUSS
      const mussRow = [...document.querySelectorAll('.rail-row')].find(el => el.textContent.includes('MUSS'));
      mussRow?.querySelector('.rail-row-main')?.click();

      // 2. NICHT Aufwand: Stufe 5 (Ausschluss)
      const stufe5Row = [...document.querySelectorAll('.rail-row')].find(el => el.textContent.includes('Stufe 5'));
      stufe5Row?.querySelector('.rail-btn.btn-cross')?.click();
    })()`);
    await waitFor('document.querySelectorAll(".tag-chip").length >= 2');
    await wait(400);
    const listPaneFilterRect = await getRect('.list-pane');
    if (listPaneFilterRect) {
      await capture('filter.png', {
        x: listPaneFilterRect.x,
        y: listPaneFilterRect.y,
        width: listPaneFilterRect.width,
        height: Math.min(listPaneFilterRect.height, 520),
      });
    }
    // Filter zurücksetzen
    await evalJs(`document.querySelector('.rail-header button[title="Alle Filter zurücksetzen"]')?.click()`);
    await wait(300);

    // 14. DIALOG KATALOGE (VERSIONEN)
    console.log('\n--- 14. Dialog Kataloge (Versionen) aufnehmen ---');
    await evalJs(`document.querySelector('.topbar-actions button.btn-secondary')?.click()`);
    await waitFor('document.querySelector("dialog[aria-labelledby=\'catalog-title\'][open]")');
    await wait(400);
    const catVersionsRect = await getRect('dialog[aria-labelledby="catalog-title"]');
    if (catVersionsRect) {
      await capture('kataloge-versionen.png', {
        x: catVersionsRect.x - 10,
        y: catVersionsRect.y - 10,
        width: catVersionsRect.width + 20,
        height: catVersionsRect.height + 20,
      });
    }

    // 15. VERGLEICHSMODUS AKTIVIEREN
    console.log('\n--- 15. Vergleichsmodus aktivieren & aufnehmen ---');
    await evalJs(`(() => {
      const items = [...document.querySelectorAll('.version-item')];
      const testItem = items.find(it => it.textContent.includes('Vergleichsversion'));
      testItem?.querySelector('.cat-radio.is-comp')?.click();
    })()`);
    await wait(400);
    // Dialog schließen
    await evalJs(`document.querySelector('dialog[aria-labelledby="catalog-title"] .icon-btn')?.click()`);
    await waitFor('document.querySelector(".diff-banner")');
    await wait(500);

    // Screenshot Vergleichsmodus gesamt
    await capture('vergleich.png', {
      x: 0,
      y: 0,
      width: 1200,
      height: 540,
    });

    // 16. DETAILANSICHT: REITER ÄNDERUNGEN (DEV.4.3)
    console.log('\n--- 16. Detailansicht: Reiter Änderungen aufnehmen ---');
    await evalJs(`(() => {
      const dev4Head = document.querySelector('.subgroup-head[data-sub-id="DEV.4"]');
      if (dev4Head && !dev4Head.closest('.subgroup')?.classList.contains('open')) {
        dev4Head.querySelector('.head-toggle')?.click();
      }
      const dev43Row = document.querySelector('.ctrl-row[data-ctrl-id="DEV.4.3"]');
      if (dev43Row) dev43Row.click();
    })()`);
    await wait(300);
    await evalJs(`document.querySelector('#tab-diff')?.click()`);
    await waitFor('document.querySelector("#tab-diff.on")');
    await wait(400);
    const diffDetailRect = await getRect('.detail-pane');
    if (diffDetailRect) {
      await capture('detail-aenderungen.png', {
        x: diffDetailRect.x,
        y: diffDetailRect.y,
        width: diffDetailRect.width,
        height: 520,
      });
    }

    console.log('\nAlle Screenshots erfolgreich aufgenommen!');
    ws.close();
  } catch (err) {
    console.error('Fehler bei Screenshot-Erstellung:', err);
  } finally {
    chrome.kill();
    server.close();
  }
}

main().catch(console.error);
