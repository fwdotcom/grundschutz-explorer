import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeWordDiff, compareCatalogs } from '../src/js/diffEngine.js';
import { parseOscalCatalog } from '../src/js/oscalParser.js';

const control = (id, prose, verb = 'MUSS') => ({
  id,
  title: `Titel ${id}`,
  parts: [{ name: 'statement', prose, props: [{ name: 'modal_verb', value: verb }] }],
});

const catalog = (controls) =>
  parseOscalCatalog({
    catalog: {
      metadata: { title: 'Test', version: 'v' },
      groups: [{ id: 'GC', title: 'GC', groups: [{ id: 'GC.1', title: 'GC.1', controls }] }],
    },
  });

test('computeWordDiff: Grenzfälle und Wortänderung', () => {
  assert.deepEqual(computeWordDiff('', ''), []);
  assert.deepEqual(computeWordDiff('', 'neu'), [{ value: 'neu', added: true }]);
  assert.deepEqual(computeWordDiff('alt', ''), [{ value: 'alt', removed: true }]);
  assert.deepEqual(computeWordDiff('gleich', 'gleich'), [{ value: 'gleich' }]);

  const parts = computeWordDiff('Die Institution MUSS prüfen', 'Die Institution SOLLTE prüfen');
  assert.equal(parts.filter((p) => p.removed).map((p) => p.value.trim()).join(' '), 'MUSS');
  assert.equal(parts.filter((p) => p.added).map((p) => p.value.trim()).join(' '), 'SOLLTE');
  // Zusammengesetzt ergeben die Teile wieder alten bzw. neuen Text
  assert.equal(parts.filter((p) => !p.added).map((p) => p.value).join(''), 'Die Institution MUSS prüfen');
  assert.equal(parts.filter((p) => !p.removed).map((p) => p.value).join(''), 'Die Institution SOLLTE prüfen');
});

test('compareCatalogs: neu, geändert, gelöscht, unverändert', () => {
  const base = catalog([control('GC.1.1', 'A'), control('GC.1.2', 'B'), control('GC.1.3', 'C')]);
  const next = catalog([control('GC.1.1', 'A'), control('GC.1.2', 'B geändert', 'SOLLTE'), control('GC.1.4', 'D')]);
  const diff = compareCatalogs(base, next);

  assert.equal(diff.hasDiff, true);
  assert.equal(diff.addedCount, 1);
  assert.equal(diff.modifiedCount, 1);
  assert.equal(diff.deletedCount, 1);
  assert.equal(diff.unchangedCount, 1);
  assert.equal(diff.diffsByControlId.get('GC.1.4').status, 'added');
  assert.equal(diff.diffsByControlId.get('GC.1.3').status, 'deleted');

  const modified = diff.diffsByControlId.get('GC.1.2');
  assert.equal(modified.status, 'modified');
  assert.deepEqual(modified.changes.map((c) => c.field).sort(), ['modalVerb', 'statementProse']);
});

test('compareCatalogs: identische Kataloge haben keine Unterschiede', () => {
  const diff = compareCatalogs(catalog([control('GC.1.1', 'A')]), catalog([control('GC.1.1', 'A')]));
  assert.equal(diff.hasDiff, false);
  assert.equal(diff.unchangedCount, 1);
});
