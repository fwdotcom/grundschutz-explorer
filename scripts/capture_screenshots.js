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
// Zielordner; mit BILDER_DIR=<Ordner> lassen sich die Bilder zum Vergleich woanders ablegen
const BILDER_DIR = process.env.BILDER_DIR || path.join(ROOT, 'docs', 'handbuch', 'bilder');

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
    '--window-size=1440,900',
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

    // Die App über ihre eigenen Funktionen steuern (Wurzelkomponente am Element #app), statt sich durch
    // den Baum zu klicken: robuster gegenüber Änderungen am Markup
    const act = async (code) => {
      const err = await evalJs(`(async () => {
        try { const vm = document.getElementById('app')._vnode.component.proxy; ${code}; } catch (e) { return String(e); }
      })()`);
      if (err) throw new Error(`App-Aufruf fehlgeschlagen: ${err}`);
    };
    const setViewport = (width, height) =>
      send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 2, mobile: false });
    const VIEW_W = 1440;
    const VIEW_H = 900;

    // Anforderung auswählen und Reiter öffnen
    const showControl = async (id, tab = 'overview') => {
      await act(`vm.selectControl(vm.activeCatalog.controlMap.get(${JSON.stringify(id)})); vm.detailActiveTab = ${JSON.stringify(tab)}`);
      await waitFor(`document.querySelector('.detail-id')?.textContent.trim() === ${JSON.stringify(id)} && document.querySelector('#tab-${tab}.on')`);
      await wait(350);
    };

    // Unterkante eines Elements (CSS-Pixel); das Element liefert ein JS-Ausdruck
    const bottomOf = (expr) => evalJs(`(() => { const el = ${expr}; return el ? el.getBoundingClientRect().bottom : null; })()`);

    // Detailbereich von oben bis zu einer Unterkante (höchstens bis zum Fensterrand bzw. maxHeight)
    const captureDetail = async (filename, bottom, maxHeight = Infinity) => {
      const pane = await getRect('.detail-pane');
      if (!(bottom > pane.y)) throw new Error(`${filename}: Unterkante des Ausschnitts nicht gefunden`);
      const height = Math.min(bottom - pane.y, pane.height, maxHeight);
      await capture(filename, { x: pane.x, y: pane.y, width: pane.width, height });
    };

    // Liste so scrollen, dass ein Element direkt unter der mitlaufenden Kopfzeile steht
    const scrollListTo = (selector, stickySelector) =>
      evalJs(`(() => {
        const list = document.querySelector('.list-scroll');
        const el = document.querySelector(${JSON.stringify(selector)});
        if (!list || !el) return;
        const stickyEl = ${stickySelector ? `document.querySelector(${JSON.stringify(stickySelector)})` : 'null'};
        const sticky = stickyEl ? stickyEl.getBoundingClientRect().height : 0;
        list.scrollTop += el.getBoundingClientRect().top - list.getBoundingClientRect().top - sticky;
      })()`);

    await setViewport(VIEW_W, VIEW_H);

    // 1. STARTSEITE (noch kein Katalog geladen)
    console.log('\n--- 1. Startseite ---');
    await send('Page.navigate', { url: `http://127.0.0.1:${port}/index.html` });
    await waitFor('document.querySelector(".welcome")');
    await wait(400);
    await capture('startseite.png');

    // 2. DIALOG KATALOG LADEN
    console.log('\n--- 2. Dialog Katalog laden ---');
    await evalJs(`document.querySelector('.welcome-cta')?.click()`);
    await waitFor(`document.querySelector('dialog[aria-labelledby="load-title"][open]')`);
    await wait(300);
    const loadDialogRect = await getRect('dialog[aria-labelledby="load-title"]');
    await capture('kataloge-laden.png', {
      x: loadDialogRect.x - 10,
      y: loadDialogRect.y - 10,
      width: loadDialogRect.width + 20,
      height: loadDialogRect.height + 20,
    });
    await evalJs(`document.querySelector('dialog[aria-labelledby="load-title"] .icon-btn')?.click()`);
    await wait(300);

    // 3. DATENBANK: Basiskatalog, Vergleichskatalog, Listen und Notizen
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
      // Breitere Detailansicht, damit Pfadleiste und Reiter in den Ausschnitten nicht umbrechen
      tx.objectStore('settings').put({ key: 'detail_pane_width', value: 40 });

      tx.objectStore('lists').put({ id: 'list-audit', name: 'Audit 2026', createdAt: '2026-09-25T12:00:00.000Z' });
      tx.objectStore('lists').put({ id: 'list-team', name: 'Entwicklungsteam', createdAt: '2026-09-25T14:00:00.000Z' });

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

    console.log('Datenbank befüllt, Seite wird neu geladen ...');
    await send('Page.navigate', { url: `http://127.0.0.1:${port}/index.html` });
    await waitFor(`document.querySelector('.topbar') && document.querySelector('.detail-pane') && document.getElementById('app')._vnode?.component`);
    await wait(600);

    // 4. KOPFZEILE
    console.log('\n--- 4. Kopfzeile ---');
    await capture('kopfzeile.png', await getRect('.topbar'));

    // 5. GESAMTANSICHT mit gewählter Anforderung
    console.log('\n--- 5. Gesamtansicht ---');
    await showControl('DEV.3.4');
    await scrollListTo('.subgroup-head[data-sub-id="DEV.3"]', '.practice-head[data-practice-id="DEV"]');
    await wait(300);
    await capture('oberflaeche.png');

    // 6. UNTERANFORDERUNGEN IM BAUM (GC.9.1 über drei Ebenen)
    console.log('\n--- 6. Unteranforderungen im Baum ---');
    await act(`vm.collapseAll()`);
    await wait(200);
    await act(`vm.selectControl(vm.activeCatalog.controlMap.get('GC.9.1.1.1'))`);
    await wait(300);
    // Auswahl aufheben, damit keine Zeile hervorgehoben ist; der Baum bleibt aufgeklappt
    await act(`vm.showCatalogOverview()`);
    await wait(300);
    await scrollListTo('.subgroup-head[data-sub-id="GC.9"]', '.practice-head[data-practice-id="GC"]');
    await wait(300);
    {
      const pane = await getRect('.list-pane');
      const bottom = await bottomOf(`document.querySelector('.ctrl-row[data-ctrl-id="GC.9.1.1.4"]')`);
      await capture('unteranforderungen.png', { x: pane.x, y: pane.y, width: pane.width, height: bottom - pane.y + 1 });
    }

    // 7. DETAILANSICHT, REITER ÜBERSICHT (SENS.11.3: kurzer Text, Zielobjekt mit übergeordneten Kategorien)
    console.log('\n--- 7. Detailansicht: Übersicht (SENS.11.3) ---');
    await setViewport(VIEW_W, 1600);
    await showControl('SENS.11.3');
    // bis einschließlich der Karte mit den Kenngrößen
    await captureDetail('detailansicht.png', (await bottomOf(`document.querySelectorAll('.detail-body > .stack > .card')[1]`)) + 16);

    // 7b. KOPFBEREICH EINER UNTERANFORDERUNG (GC.9.1.1.1): Pfadleiste mit übergeordneten Anforderungen bis zu den Reitern
    console.log('\n--- 7b. Detailansicht: Kopfbereich (GC.9.1.1.1) ---');
    await showControl('GC.9.1.1.1');
    await captureDetail('detail-kopf.png', (await bottomOf(`document.querySelector('.detail-head .tabs')`)) + 1);

    // 8. REITER HILFESTELLUNG (DEV.3.4): Hinweistext des BSI
    console.log('\n--- 8. Detailansicht: Hilfestellung (DEV.3.4) ---');
    await showControl('DEV.3.4', 'guidance');
    await captureDetail('detail-hilfestellung.png', (await bottomOf(`document.querySelector('.detail-body > .stack > .card')`)) + 16, 760);

    // 9. REITER NOTIZEN: eigene Notiz (DEV.3.4) und Notiz einer anderen Liste (DEV.4.3)
    console.log('\n--- 9. Detailansicht: Notizen ---');
    await showControl('DEV.3.4', 'notes');
    // knapp unter der letzten Textzeile, ohne die leere Fläche des hohen Notizfelds
    await captureDetail('detail-notizen.png', (await evalJs(`(() => {
      const range = document.createRange();
      range.selectNodeContents(document.querySelector('.notes-text'));
      return range.getBoundingClientRect().bottom;
    })()`)) + 20);
    await showControl('DEV.4.3', 'notes');
    // Notiz der nicht aktiven Liste „Entwicklungsteam“ (nur lesbar) anzeigen
    await act(`vm.notesViewListId = 'list-team'`);
    await waitFor(`document.querySelector('.notes-readonly')`);
    await wait(300);
    await captureDetail('detail-notizen-andere.png', (await bottomOf(`document.querySelector('.notes-readonly')`)) + 16);
    await setViewport(VIEW_W, VIEW_H);
    await wait(300);

    // 10. STERN: die drei Zustände als kleine quadratische Bilder
    console.log('\n--- 10. Stern: drei Zustände ---');
    for (const [id, filename] of [
      ['DEV.3.4', 'stern-aktiv.png'],
      ['DEV.4.3', 'stern-andere.png'],
      ['DEV.3.1', 'stern-keine.png'],
    ]) {
      await showControl(id);
      const r = await getRect('.detail-titlebar .star-btn');
      const size = Math.max(r.width, r.height) + 8;
      await capture(filename, { x: r.x + r.width / 2 - size / 2, y: r.y + r.height / 2 - size / 2, width: size, height: size });
    }

    // 11. LISTEN-MARKIERUNGEN IN DER BAUMANSICHT: sieben Zeilen von DEV.3.3 bis DEV.4.4
    //     (Stern und Notiz der aktiven Liste bei DEV.3.4, einer anderen Liste bei DEV.4.3)
    console.log('\n--- 11. Listen-Markierungen in der Liste ---');
    await act(`vm.collapseAll()`);
    await wait(200);
    await showControl('DEV.4.3');
    await showControl('DEV.3.4');
    await scrollListTo('.ctrl-row[data-ctrl-id="DEV.3.3"]', '.practice-head[data-practice-id="DEV"]');
    await wait(300);
    {
      const list = await getRect('.list-scroll');
      const top = await evalJs(`document.querySelector('.ctrl-row[data-ctrl-id="DEV.3.3"]').getBoundingClientRect().top`);
      const bottom = await bottomOf(`document.querySelector('.ctrl-row[data-ctrl-id="DEV.4.4"]')`);
      await capture('listen-markierungen.png', { x: list.x, y: top, width: list.width, height: bottom - top });
    }

    // 12. LISTEN IN DER FILTERLEISTE (mit geöffnetem Menü)
    console.log('\n--- 12. Listen in der Filterleiste ---');
    await evalJs(`document.querySelector('.list-row .list-menu-btn')?.click()`);
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
      return { x: railR.x, y: railR.y, width: railR.width, height: Math.ceil(bottom - railR.y) };
    })()`);
    await capture('listen.png', listenBounds);
    await evalJs(`document.querySelector('.list-menu') && document.querySelector('.list-row .list-menu-btn')?.click()`);
    await wait(200);

    // 13. FILTER UND FLACHE TREFFERLISTE (NUR MUSS, NICHT Aufwand Stufe 5)
    console.log('\n--- 13. Filter und flache Trefferliste ---');
    await evalJs(`(() => {
      const mussRow = [...document.querySelectorAll('.rail-row')].find((el) => el.textContent.includes('MUSS'));
      mussRow?.querySelector('.rail-row-main')?.click();
      const stufe5Row = [...document.querySelectorAll('.rail-row')].find((el) => el.textContent.includes('Stufe 5'));
      stufe5Row?.querySelector('.rail-btn.btn-cross')?.click();
    })()`);
    await waitFor(`document.querySelectorAll('.tag-chip').length >= 2`);
    await evalJs(`document.querySelector('.list-scroll').scrollTop = 0`);
    await wait(400);
    {
      const pane = await getRect('.list-pane');
      await capture('filter.png', { x: pane.x, y: pane.y, width: pane.width, height: Math.min(pane.height, 520) });
    }
    await act(`vm.resetFilters()`);
    await wait(300);

    // 13b. FILTERLEISTE ALS AUSSCHNITT bis einschließlich „Modalverben“ (NUR MUSS, NICHT Erhöhte Sicherheitsstufe)
    console.log('\n--- 13b. Filterleiste (Ausschnitt) ---');
    await evalJs(`(() => {
      const mussRow = [...document.querySelectorAll('.rail-row')].find((el) => el.textContent.includes('MUSS'));
      mussRow?.querySelector('.rail-row-main')?.click();
      const erhoehtRow = [...document.querySelectorAll('.rail-row')].find((el) => el.textContent.includes('Erhöhte Sicherheitsstufe'));
      erhoehtRow?.querySelector('.rail-btn.btn-cross')?.click();
    })()`);
    await waitFor(`document.querySelectorAll('.tag-chip').length >= 2`);
    await wait(400);
    {
      const rail = await getRect('.rail');
      const verbBottom = await bottomOf(
        `[...document.querySelectorAll('.rail-section')].find((s) => s.querySelector('.rail-heading-title')?.textContent.trim() === 'Modalverben')`
      );
      await capture('filterleiste.png', { x: rail.x, y: rail.y, width: rail.width, height: verbBottom - rail.y + 4 });
    }
    await act(`vm.resetFilters()`);
    await wait(300);

    // 14. ZIELOBJEKTKATEGORIEN MIT ÜBERGEORDNETEN KATEGORIEN (Filterbereich, Chip und Treffer)
    console.log('\n--- 14. Zielobjektkategorien mit übergeordneten Kategorien ---');
    await act(`
      for (const key of Object.keys(vm.railCollapsed)) vm.railCollapsed[key] = key !== 'targetObjects';
      vm.targetObjectInheritance = true;
      vm.toggleTag('targetObject', 'Führungskräfte', 'include', 'Führungskräfte', 'Zielobjektkategorie');
    `);
    await waitFor(`document.querySelector('.rail-row.is-implied')`);
    await evalJs(`document.querySelector('.list-scroll').scrollTop = 0`);
    await wait(400);
    {
      const rail = await getRect('.rail');
      const pane = await getRect('.list-pane');
      const bottom = await bottomOf(`document.querySelectorAll('.rail-threats-scroll .rail-row')[7]`);
      await capture('filter-zielobjekte.png', {
        x: rail.x,
        y: rail.y,
        width: pane.x + pane.width - rail.x,
        height: bottom - rail.y + 8,
      });
    }
    await act(`
      vm.targetObjectInheritance = false;
      vm.resetFilters();
      Object.assign(vm.railCollapsed, { lists: false, secLevels: false, modalVerbs: false, effort: false, sourceCatalogs: false, diffs: false });
    `);
    await wait(300);

    // 15. DIALOG KATALOGE (VERSIONEN)
    console.log('\n--- 15. Dialog Kataloge ---');
    await evalJs(`document.querySelector('.topbar-actions button.btn-secondary')?.click()`);
    await waitFor(`document.querySelector('dialog[aria-labelledby="catalog-title"][open]')`);
    await wait(400);
    const catVersionsRect = await getRect('dialog[aria-labelledby="catalog-title"]');
    await capture('kataloge-versionen.png', {
      x: catVersionsRect.x - 10,
      y: catVersionsRect.y - 10,
      width: catVersionsRect.width + 20,
      height: catVersionsRect.height + 20,
    });

    // 16. VERGLEICHSMODUS: Kopfzeile mit Hinweisbalken
    console.log('\n--- 16. Vergleichsmodus ---');
    await evalJs(`(() => {
      const items = [...document.querySelectorAll('.version-item')];
      const testItem = items.find((it) => it.textContent.includes('Vergleichsversion'));
      testItem?.querySelector('.cat-radio.is-comp')?.click();
    })()`);
    await wait(400);
    await evalJs(`document.querySelector('dialog[aria-labelledby="catalog-title"] .icon-btn')?.click()`);
    await waitFor(`document.querySelector('.diff-banner')`);
    await wait(500);
    {
      const banner = await getRect('.diff-banner');
      await capture('vergleich.png', { x: 0, y: 0, width: VIEW_W, height: Math.ceil(banner.y + banner.height) });
    }

    // 17. REITER ÄNDERUNGEN (DEV.4.3): Änderungsübersicht und Wortvergleich des Anforderungstexts
    console.log('\n--- 17. Detailansicht: Änderungen (DEV.4.3) ---');
    await setViewport(VIEW_W, 1600);
    await showControl('DEV.4.3', 'diff');
    await captureDetail('detail-aenderungen.png', (await bottomOf(`document.querySelectorAll('.detail-body > .stack > .card')[1]`)) + 16);
    await setViewport(VIEW_W, VIEW_H);

    console.log('\nAlle Screenshots erfolgreich aufgenommen!');
    ws.close();
  } catch (err) {
    console.error('Fehler bei Screenshot-Erstellung:', err);
    process.exitCode = 1;
  } finally {
    chrome.kill();
    server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
