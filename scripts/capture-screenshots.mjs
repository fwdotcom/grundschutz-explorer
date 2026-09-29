/**
 * SPDX-FileCopyrightText: 2026 Frank Winter
 * SPDX-License-Identifier: MIT
 *
 * Erstellt die Screenshots für das Handbuch (docs/handbuch/bilder/*.png) mit Playwright.
 *
 * Ablauf: Die App wird aus src/ über einen lokalen HTTP-Server ausgeliefert. Nach Startseite und Dialog
 * „Katalog laden“ werden der Katalog aus testdaten/, eine daraus abgeleitete Vergleichsversion, Listen,
 * Notizen und Einstellungen direkt in die IndexedDB der App geschrieben; danach wird die Seite neu geladen und die App über ihre eigenen
 * Funktionen in die gewünschten Zustände gebracht.
 *
 * Aufruf (im Ordner scripts):
 *   npm install           # Playwright und Chromium
 *   npm run screenshots
 *
 * Umgebungsvariablen:
 *   BILDER_DIR=<Ordner>   Bilder woanders ablegen (z. B. zum Vergleich)
 *   HEADED=1              Browser sichtbar starten (zum Nachvollziehen)
 */

import { chromium } from 'playwright';
import http from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
// Anwenderkatalog aus der Stand-der-Technik-Bibliothek des BSI (Stand 10.09.2026)
const BASE_CATALOG = path.join(ROOT, 'testdaten', 'Grundschutz++-resolved_catalog.json');
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

// ---------- Vergleichskatalog ----------

const NS = 'https://github.com/BSI-Bund/Stand-der-Technik-Bibliothek/tree/main/documentation/namespaces/';
const NS_FILE = {
  sec_level: 'security_level.csv',
  effort_level: 'effort_level.csv',
  confidentiality: 'security_targets.csv',
  integrity: 'security_targets.csv',
  availability: 'security_targets.csv',
  authenticity: 'security_targets.csv',
  threats: 'basethreats.csv',
  tags: 'tags.csv',
  target_object_categories: 'target_object_categories.csv',
  documentation: 'documentation_guidelines.csv',
  result: 'result.csv',
  action_word: 'action_words.csv',
  modal_verb: 'modal_verbs.csv',
};

// Eigenschaften in der Form des Katalogs: [name, wert] → { name, ns, value }
const props = (pairs) =>
  pairs.map(([name, value]) => (NS_FILE[name] ? { name, ns: NS + NS_FILE[name], value } : { name, value }));

function newControl(id, title, { props: controlProps, statement, statementProps, guidance }) {
  return {
    id,
    class: 'BSI-Stand-der-Technik-Kernel-G0',
    title,
    props: props(controlProps),
    parts: [
      { id: `${id}_stm`, name: 'statement', props: props(statementProps), prose: statement },
      { id: `${id}_gdn`, name: 'guidance', prose: guidance },
    ],
  };
}

function controlIndex(node, map = new Map()) {
  for (const c of node.controls || []) {
    map.set(c.id, { control: c, parent: node });
    controlIndex(c, map);
  }
  for (const g of node.groups || []) controlIndex(g, map);
  return map;
}

/**
 * Vergleichsversion des Katalogs für Vergleichsmodus und Reiter „Änderungen“: je zwei neue und
 * gelöschte Anforderungen, geänderte Texte, Modalverben und Kenngrößen.
 */
function buildComparisonCatalog(base) {
  const data = structuredClone(base);
  const cat = data.catalog;
  cat.uuid = '4e8b3a72-9c1f-4d3b-8517-7e6d0a2c9184';
  Object.assign(cat.metadata, {
    title: 'Anwenderkatalog Grundschutz++ (Vergleichsversion)',
    'last-modified': '2026-09-25T20:00:00Z',
    version: '2026.2-Testvergleich',
    remarks:
      'Modifizierter Testkatalog zur Verifikation des Differenzvergleichs (Neu, Geändert, Gelöscht, Wortvergleich) im Grundschutz++ Explorer.',
  });

  const index = controlIndex(cat);
  const get = (id) => {
    const hit = index.get(id);
    if (!hit) throw new Error(`${id} nicht im Katalog gefunden – Vergleichskatalog anpassen.`);
    return hit;
  };
  const part = (id, name) => get(id).control.parts.find((p) => p.name === name);
  const setProps = (node, values) => {
    for (const [name, value] of Object.entries(values)) node.props.find((p) => p.name === name).value = value;
  };
  const remove = (id) => {
    const { parent } = get(id);
    parent.controls = parent.controls.filter((c) => c.id !== id);
  };

  // Geändert
  setProps(part('GC.1.1', 'statement'), { modal_verb: 'SOLLTE' });
  part('GC.1.1', 'statement').prose =
    'Governance und Compliance MUSS Verfahren und Regelungen zur Errichtung, kontinuierlichen Aufrechterhaltung ' +
    'sowie jährlichen Überprüfung eines ISMS nach {{ insert: param, gc.1.1-prm1 }} verankern.';
  part('DEV.2.1', 'guidance').prose +=
    ' Neu hinzugefügt: Architekturentscheidungen müssen in Architecture Decision Records (ADR) nachvollziehbar festgehalten werden.';
  setProps(get('DEV.3.4').control, {
    sec_level: 'erhöht',
    effort_level: '3',
    integrity: '2',
    authenticity: '2',
    threats: 'G 0.19, G 0.46, G 0.47',
    tags: 'Cryptography, Passwortsicherheit, Zero Trust',
  });
  setProps(part('DEV.4.3', 'statement'), { modal_verb: 'MUSS' });
  part('DEV.4.3', 'statement').prose =
    'Entwicklung für Anwendungen MUSS alle eingesetzten Bestandteile und Abhängigkeiten mit Hilfe einer ' +
    'standardisierten Software Bill of Materials (SBOM im CycloneDX- oder SPDX-Format) vor jedem Release ' +
    'automatisiert dokumentieren.';
  part('DEV.4.3', 'guidance').prose =
    'Details siehe BSI TR-03183-2 sowie BSI CS 148. Anwendungen zur Modulverwaltung und Software Composition ' +
    'Analysis (SCA) MÜSSEN SBOMs als Teil des CI/CD-Prozesses generieren und digital signieren.';

  // Gelöscht
  remove('DEV.2.6.2');
  remove('DEV.4.7');

  // Neu
  get('DEV.1.1').control.controls.push(
    newControl('DEV.1.1.4', 'Verbindlichkeit und Sanktionen', {
      props: [
        ['alt-identifier', 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'],
        ['sec_level', 'normal-SdT'],
        ['effort_level', '1'],
        ['confidentiality', '1'],
        ['integrity', '1'],
        ['availability', '0'],
        ['authenticity', '0'],
        ['threats', 'G 0.18'],
      ],
      statementProps: [
        ['target_object_categories', 'Anwendungen'],
        ['documentation', 'Sicherheitsrichtlinie'],
        ['action_word', 'festlegen'],
        ['modal_verb', 'SOLLTE'],
      ],
      statement:
        'Die Institution SOLLTE festlegen, welche Konsequenzen und Eskalationsschritte bei vorsätzlicher oder ' +
        'grob fahrlässiger Nichteinhaltung der Entwicklungsrichtlinien greifen.',
      guidance: 'Klare Regelungen schaffen Verbindlichkeit für Entwicklungsteams und externe Dienstleister.',
    })
  );
  get('DEV.4.3').parent.controls.push(
    newControl('DEV.4.12', 'Automatisierte Schwachstellenscans in der Bereitstellungspipeline', {
      props: [
        ['alt-identifier', 'f47ac10b-58cc-4372-a567-0e02b2c3d479'],
        ['sec_level', 'normal-SdT'],
        ['effort_level', '2'],
        ['confidentiality', '2'],
        ['integrity', '2'],
        ['availability', '1'],
        ['authenticity', '1'],
        ['threats', 'G 0.14, G 0.23, G 0.39'],
        ['tags', 'Secure Compiling Practices, Automatisierung, CI/CD'],
      ],
      statementProps: [
        ['target_object_categories', 'Anwendungen'],
        ['documentation', 'Entwicklungsdokumentation'],
        ['result', 'automatisierte Prüfungen auf Sicherheitslücken und veraltete Komponenten (SAST und SCA)'],
        ['action_word', 'integrieren'],
        ['modal_verb', 'MUSS'],
      ],
      statement:
        'Entwicklung für Anwendungen MUSS automatisierte Prüfungen auf Sicherheitslücken und veraltete Komponenten ' +
        '(SAST und SCA) in den Build- und Bereitstellungsprozess integrieren.',
      guidance:
        'Automatisierte Scans in CI/CD-Pipelines identifizieren Schwachstellen bereits vor dem Deployment in Test- ' +
        'oder Produktionsumgebungen (Shift-Left). Gefundene Sicherheitslücken mit hohem Schweregrad sollten das ' +
        'automatische Ausrollen verhindern.',
    })
  );
  return data;
}

// ---------- Browser ----------

function createStaticServer() {
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://127.0.0.1`);
      let pathname = decodeURIComponent(url.pathname);
      if (pathname === '/') pathname = '/index.html';

      const filePath = path.join(SRC, pathname.replace(/^\//, ''));

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
  const appUrl = `http://127.0.0.1:${port}/index.html`;
  console.log(`HTTP-Server läuft auf http://127.0.0.1:${port}`);

  const VIEW_W = 1440;
  const VIEW_H = 900;

  const browser = await chromium.launch({ headless: !process.env.HEADED });

  try {
    const context = await browser.newContext({
      viewport: { width: VIEW_W, height: VIEW_H },
      deviceScaleFactor: 2,
      locale: 'de-DE',
      timezoneId: 'Europe/Berlin',
      colorScheme: 'light',
      contrast: 'no-preference',
    });
    const page = await context.newPage();
    page.on('pageerror', (err) => console.warn('  [Seitenfehler]', err.message));

    // Ausdruck im Seitenkontext auswerten; Promises werden abgewartet
    const evalJs = (expr) => page.evaluate(expr);

    const wait = (ms) => page.waitForTimeout(ms);

    const waitFor = (expr, timeout = 12000) => page.waitForFunction(expr, null, { timeout });

    await mkdir(BILDER_DIR, { recursive: true });

    const ensureLightTheme = async () => {
      await evalJs(`(() => {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.remove('contrast');
      })()`);
    };

    const capture = async (filename, clip = null) => {
      await ensureLightTheme();
      const opts = { path: path.join(BILDER_DIR, filename) };
      if (clip) {
        opts.clip = {
          x: Math.max(0, Math.round(clip.x)),
          y: Math.max(0, Math.round(clip.y)),
          width: Math.round(clip.width),
          height: Math.round(clip.height),
        };
      }
      const buf = await page.screenshot(opts);
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
    const setViewport = (width, height) => page.setViewportSize({ width, height });

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

    // 1. STARTSEITE (noch kein Katalog geladen)
    console.log('\n--- 1. Startseite ---');
    await page.goto(appUrl);
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

    // 3. DATENBANK: Basiskatalog, Vergleichskatalog, Listen und Notizen (über js/storage.js der App)
    console.log('\n--- 3. Datenbank initialisieren ---');
    const baseJson = JSON.parse(await readFile(BASE_CATALOG, 'utf8'));
    const testJson = buildComparisonCatalog(baseJson);

    await page.evaluate(
      async ({ baseJson, testJson }) => {
        const s = await import('./js/storage.js');
        await s.clearAllData();

        await s.saveCatalogRecord({
          id: 'bsi-base',
          title: 'Anwenderkatalog Grundschutz++',
          version: '2026-09-10',
          sourceType: 'official',
          sourceName: 'BSI Stand-der-Technik-Bibliothek',
          importedAt: '2026-09-24T10:00:00.000Z',
          catalogData: baseJson,
        });
        await s.saveCatalogRecord({
          id: 'test-vergleich',
          title: 'Anwenderkatalog Grundschutz++ (Vergleichsversion)',
          version: '2026.2-Testvergleich',
          sourceType: 'file',
          sourceName: 'Grundschutz++-vergleich_catalog.json',
          importedAt: '2026-09-25T20:00:00.000Z',
          catalogData: testJson,
        });

        await s.saveListData(
          [
            { id: 'list-audit', name: 'Audit 2026', createdAt: '2026-09-25T12:00:00.000Z' },
            { id: 'list-team', name: 'Entwicklungsteam', createdAt: '2026-09-25T14:00:00.000Z' },
          ],
          [
            {
              key: 'list-audit|DEV.3.4',
              listId: 'list-audit',
              controlId: 'DEV.3.4',
              note: 'Passwort-Hashing nach BSI TR-02102 auf Argon2id umstellen. Salt mindestens 128 Bit Zufallswert.',
              updatedAt: '2026-09-25T15:30:00.000Z',
            },
            {
              key: 'list-team|DEV.4.3',
              listId: 'list-team',
              controlId: 'DEV.4.3',
              note: 'Prüfen, ob SBOM im CI/CD-Build automatisiert erzeugt und digital signiert wird.',
              updatedAt: '2026-09-25T16:00:00.000Z',
            },
          ]
        );

        const settings = {
          last_active_catalog_id: 'bsi-base',
          comparison_catalog_id: '',
          active_list_id: 'list-audit',
          dark_mode: false,
          high_contrast: false,
          font_scale: 1,
          // Breitere Detailansicht, damit Pfadleiste und Reiter in den Ausschnitten nicht umbrechen
          detail_pane_width: 40,
        };
        for (const [key, value] of Object.entries(settings)) await s.saveSetting(key, value);
      },
      { baseJson, testJson }
    );

    console.log('Datenbank befüllt, Seite wird neu geladen ...');
    await page.reload();
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

    // 7a. AUFGEKLAPPTE BEGRIFFE UNTER DEM ANFORDERUNGSTEXT (SENS.11.3): nur die Karte mit dem Wortlaut
    console.log('\n--- 7a. Detailansicht: Begriffe aus dem Anforderungstext (SENS.11.3) ---');
    await act(`vm.statementTermsOpen = true`);
    await wait(300);
    {
      const pane = await getRect('.detail-pane');
      const card = await getRect('.detail-body > .stack > .card');
      await capture('detail-klappbereich.png', { x: pane.x, y: card.y - 16, width: pane.width, height: card.height + 32 });
    }
    await act(`vm.statementTermsOpen = false`);
    await wait(200);

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
    // Das hohe, fast leere Notizfeld nur für die Aufnahme auf den Text verkleinern, damit der Hinweis zum
    // Aktivieren direkt darunter steht
    await evalJs(`(() => { const el = document.querySelector('.notes-text'); el.style.minHeight = '0'; el.style.height = 'auto'; })()`);
    await wait(300);
    await captureDetail('detail-notizen-andere.png', (await bottomOf(`document.querySelector('.notes-readonly')`)) + 16);
    await evalJs(`document.querySelector('.notes-text')?.removeAttribute('style')`);
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

    // 13c. TREFFER IN LISTE ÜBERNEHMEN: Thema DEV.3 als flache Liste (DEV.3.4 steht schon in „Audit 2026“), Menü am Stern geöffnet
    console.log('\n--- 13c. Treffer in Liste übernehmen ---');
    const prevViewMode = await evalJs(`document.getElementById('app')._vnode.component.proxy.listViewMode`);
    await act(`vm.filters.subgroupFilter = 'DEV.3'; vm.listViewMode = 'flat'`);
    await waitFor(`document.querySelectorAll('.tag-chip').length >= 1`);
    await evalJs(`document.querySelector('.list-scroll').scrollTop = 0`);
    await evalJs(`document.querySelector('.hits-list-anchor .list-menu-btn')?.click()`);
    await waitFor(`document.querySelector('.hits-menu')`);
    await wait(300);
    {
      const pane = await getRect('.list-pane');
      const bottom = await evalJs(`Math.max(
        document.querySelector('.hits-menu').getBoundingClientRect().bottom,
        [...document.querySelectorAll('.list-scroll .ctrl-row')].pop()?.getBoundingClientRect().bottom || 0
      )`);
      await capture('treffer-in-liste.png', { x: pane.x, y: pane.y, width: pane.width, height: bottom - pane.y + 12 });
    }
    await evalJs(`document.querySelector('.hits-menu') && document.querySelector('.hits-list-anchor .list-menu-btn')?.click()`);
    await act(`vm.resetFilters(); vm.listViewMode = ${JSON.stringify(prevViewMode)}`);
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
  } catch (err) {
    console.error('Fehler bei Screenshot-Erstellung:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
