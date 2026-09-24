import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { parseOscalCatalog, formatBsiThreat, resolveParamsInProse } from '../src/js/oscalParser.js';
import { loadNamespaces, lookupNamespace } from '../src/js/namespaces.js';
import { installLocalFetch, fetchOfficialCatalog } from './helpers.js';

// Kleiner, vollständig bekannter Katalog für exakte Prüfungen
const SAMPLE = {
  catalog: {
    uuid: 'sample-uuid',
    metadata: { title: 'Testkatalog', version: '2026-01' },
    groups: [
      {
        id: 'GC',
        title: 'Governance und Compliance',
        props: [{ name: 'label', value: 'GC', remarks: 'Beschreibung der Praktik' }],
        groups: [
          {
            id: 'GC.1',
            title: 'Grundlagen',
            controls: [
              {
                id: 'GC.1.1',
                title: 'Erste Anforderung',
                params: [{ id: 'gc.1.1-prm1', values: ['jährlich'] }],
                props: [
                  { name: 'sec_level', value: 'normal-SdT' },
                  { name: 'effort_level', value: '3' },
                  { name: 'confidentiality', value: '2' },
                  { name: 'integrity', value: '1' },
                  { name: 'availability', value: '0' },
                  { name: 'threats', value: 'G 0.19, G 0.18' },
                ],
                parts: [
                  {
                    name: 'statement',
                    prose: 'Die Institution MUSS die Regeln {{ insert: param, gc.1.1-prm1 }} prüfen.',
                    props: [
                      { name: 'modal_verb', value: 'muss' },
                      { name: 'action_word', value: 'überprüfen' },
                      { name: 'documentation', value: 'Detektions-Konzept' },
                    ],
                  },
                  { name: 'guidance', prose: 'Hinweis zur Umsetzung' },
                ],
                controls: [
                  {
                    id: 'GC.1.1.1',
                    title: 'Unteranforderung',
                    parts: [{ name: 'statement', prose: 'Text', props: [{ name: 'modal_verb', value: 'SOLLTE' }] }],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
};

before(async () => {
  installLocalFetch();
  await loadNamespaces();
});

test('Beispielkatalog: Struktur, Felder und Unteranforderungen', () => {
  const cat = parseOscalCatalog(SAMPLE);
  assert.equal(cat.title, 'Testkatalog');
  assert.equal(cat.practices.length, 1);
  assert.equal(cat.practices[0].remarks, 'Beschreibung der Praktik');
  assert.equal(cat.allControls.length, 2);

  const c = cat.controlMap.get('GC.1.1');
  assert.equal(c.subgroupId, 'GC.1');
  assert.equal(c.modalVerb, 'MUSS');
  assert.equal(c.secLevel, 'normal-SdT');
  assert.equal(c.effortLevel, '3');
  assert.equal(c.actionWord, 'überprüfen');
  assert.equal(c.documentation, 'Detektions-Konzept');
  assert.equal(c.confidentiality, '2');
  assert.equal(c.integrity, '1');
  assert.equal(c.availability, '0');
  assert.equal(c.authenticity, undefined);
  assert.equal(c.statementProse, 'Die Institution MUSS die Regeln [jährlich] prüfen.');
  assert.equal(c.guidanceProse, 'Hinweis zur Umsetzung');
  // Gefährdungen aus der Eigenschaft "threats", sortiert und mit offizieller Bezeichnung
  assert.deepEqual(c.elementareGefaehrdungen, [
    'G 0.18: Fehlplanung oder fehlende Anpassung',
    'G 0.19: Offenlegung schützenswerter Informationen',
  ]);

  const sub = cat.controlMap.get('GC.1.1.1');
  assert.equal(sub.isSubcontrol, true);
  assert.equal(sub.parentControlId, 'GC.1.1');
  assert.equal(sub.modalVerb, 'SOLLTE');
});

test('ungültige Eingaben werden mit verständlicher Meldung abgelehnt', () => {
  assert.throws(() => parseOscalCatalog(null), /leer oder nicht definiert/);
  assert.throws(() => parseOscalCatalog({ foo: 1 }), /Kein gültiges OSCAL-Katalog-Objekt/);
});

test('formatBsiThreat und resolveParamsInProse', () => {
  assert.equal(formatBsiThreat('G 0.18'), 'G 0.18: Fehlplanung oder fehlende Anpassung');
  assert.equal(formatBsiThreat('G 0.18: anderer Titel'), 'G 0.18: Fehlplanung oder fehlende Anpassung');
  assert.equal(formatBsiThreat(''), '');
  assert.equal(resolveParamsInProse('ohne {{ insert: param, x }}', []), 'ohne {{ insert: param, x }}');
  assert.equal(resolveParamsInProse('mit {{insert: param, X}}', [{ id: 'x', label: 'Wert' }]), 'mit [Wert]');
});

test('aktueller BSI-Katalog: Plausibilität', async (t) => {
  const raw = await fetchOfficialCatalog(t);
  if (!raw) return;
  const cat = parseOscalCatalog(raw);
  assert.ok(cat.allControls.length > 500, 'zu wenige Anforderungen');
  assert.equal(cat.controlMap.size, cat.allControls.length, 'Kennungen sind nicht eindeutig');

  for (const c of cat.allControls) {
    assert.ok(['MUSS', 'SOLLTE', 'KANN'].includes(c.modalVerb), `${c.id}: unbekanntes Modalverb ${c.modalVerb}`);
    for (const t of c.elementareGefaehrdungen) {
      const code = t.split(':')[0];
      assert.ok(lookupNamespace('basethreats', code), `${c.id}: unbekannte Gefährdung ${code}`);
    }
    for (const key of ['confidentiality', 'integrity', 'availability', 'authenticity']) {
      if (c[key] !== undefined) assert.ok(['0', '1', '2'].includes(c[key]), `${c.id}: ${key}=${c[key]}`);
    }
  }
});

test('aktueller BSI-Katalog: Unteranforderungen in beliebiger Tiefe', async (t) => {
  const raw = await fetchOfficialCatalog(t);
  if (!raw) return;
  const cat = parseOscalCatalog(raw);

  // Jede Anforderung aus der Rohdatei, auch tief verschachtelte, ist erfasst
  let rawCount = 0;
  const walk = (controls) => {
    for (const c of controls || []) {
      rawCount++;
      walk(c.controls);
    }
  };
  const walkGroups = (groups) => {
    for (const g of groups || []) {
      walk(g.controls);
      walkGroups(g.groups);
    }
  };
  walkGroups(raw.catalog.groups);
  assert.equal(cat.allControls.length, rawCount);

  // Jede Unteranforderung hängt an einer vorhandenen Anforderung desselben Teilbereichs
  for (const c of cat.allControls) {
    if (!c.parentControlId) continue;
    const parent = cat.controlMap.get(c.parentControlId);
    assert.ok(parent, `${c.id}: übergeordnete Anforderung ${c.parentControlId} fehlt`);
    assert.ok(parent.subcontrols.includes(c), `${c.id}: fehlt in subcontrols von ${parent.id}`);
    assert.equal(c.subgroupId, parent.subgroupId, `${c.id}: anderer Teilbereich als ${parent.id}`);
  }
});

test('Unteranforderungen über mehrere Ebenen', () => {
  const ctrl = (id, controls) => ({
    id,
    title: id,
    props: [{ name: 'modal_verb', value: 'MUSS' }],
    parts: [{ name: 'statement', prose: 'Text' }],
    ...(controls ? { controls } : {}),
  });
  const raw = {
    catalog: {
      uuid: 'deep',
      metadata: { title: 'Tief' },
      groups: [
        {
          id: 'P',
          title: 'Praktik',
          groups: [{ id: 'P.1', title: 'Teilbereich', controls: [ctrl('P.1.1', [ctrl('P.1.1.1', [ctrl('P.1.1.1.1', [ctrl('P.1.1.1.1.1')])])])] }],
        },
      ],
    },
  };
  const cat = parseOscalCatalog(raw);
  assert.equal(cat.allControls.length, 4);
  const deepest = cat.controlMap.get('P.1.1.1.1.1');
  assert.ok(deepest);
  assert.equal(deepest.parentControlId, 'P.1.1.1.1');
  assert.equal(cat.controlMap.get('P.1.1.1.1').parentControlId, 'P.1.1.1');
  assert.equal(deepest.subgroupId, 'P.1');
  assert.equal(deepest.groupId, 'P');
});
