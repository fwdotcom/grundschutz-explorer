/**
 * SPDX-FileCopyrightText: 2026 Frank Winter
 * SPDX-License-Identifier: MIT
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeWordDiff, compareCatalogs, applyDiff } from '../src/js/diffEngine.js';
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

test('compareCatalogs verändert keinen der Kataloge', () => {
  const base = catalog([control('GC.1.1', 'A'), control('GC.1.2', 'B')]);
  const next = catalog([control('GC.1.1', 'A geändert')]);
  compareCatalogs(base, next);
  assert.equal(next.controlMap.size, 1);
  assert.equal(next.allControls.length, 1);
  assert.equal(next.controlMap.get('GC.1.1').diff, undefined);
});

test('compareCatalogs vergleicht alle Felder, Listen ohne Rücksicht auf die Reihenfolge', () => {
  const withProps = (props, statementProps = []) => ({
    id: 'GC.1.1',
    title: 'T',
    props,
    parts: [{ name: 'statement', prose: 'A', props: [{ name: 'modal_verb', value: 'MUSS' }, ...statementProps] }],
  });
  const base = catalog([
    withProps([{ name: 'tags', value: 'Cloud, VPN' }, { name: 'integrity', value: '1' }], [{ name: 'action_word', value: 'prüfen' }]),
  ]);
  const next = catalog([
    withProps([{ name: 'tags', value: 'VPN, Zero Trust' }, { name: 'integrity', value: '2' }], [{ name: 'action_word', value: 'dokumentieren' }]),
  ]);
  const changes = compareCatalogs(base, next).diffsByControlId.get('GC.1.1').changes;
  const byField = Object.fromEntries(changes.map((c) => [c.field, c]));
  assert.deepEqual(Object.keys(byField).sort(), ['actionWord', 'integrity', 'tags']);
  assert.deepEqual(byField.tags.removed, ['Cloud']);
  assert.deepEqual(byField.tags.added, ['Zero Trust']);
  assert.equal(byField.integrity.oldValue, '1');
  assert.equal(byField.integrity.newValue, '2');

  const reordered = catalog([withProps([{ name: 'tags', value: 'VPN, Cloud' }, { name: 'integrity', value: '1' }], [{ name: 'action_word', value: 'prüfen' }])]);
  assert.equal(compareCatalogs(base, reordered).hasDiff, false);
});

test('applyDiff setzt gelöschte Unteranforderungen an ihre frühere Stelle, ohne Doppelungen', () => {
  const withSubs = (id, subs) => ({ ...control(id, id), controls: subs });
  const base = catalog([
    withSubs('GC.1.1', [control('GC.1.1.1', 'a'), control('GC.1.1.2', 'b')]),
    withSubs('GC.1.2', [control('GC.1.2.1', 'c')]),
  ]);
  // GC.1.1.2 entfällt unter einer bleibenden Anforderung, GC.1.2 samt Unteranforderung ganz
  const next = catalog([withSubs('GC.1.1', [control('GC.1.1.1', 'a')])]);
  const diff = compareCatalogs(base, next);
  applyDiff(next, diff);

  const sub = next.practices[0].subgroups[0];
  assert.deepEqual(sub.controls.map((c) => c.id), ['GC.1.1', 'GC.1.2']);
  assert.deepEqual(next.controlMap.get('GC.1.1').subcontrols.map((c) => c.id), ['GC.1.1.1', 'GC.1.1.2']);
  const deletedParent = next.controlMap.get('GC.1.2');
  assert.equal(deletedParent.diff.status, 'deleted');
  assert.deepEqual(deletedParent.subcontrols.map((c) => [c.id, c.diff.status]), [['GC.1.2.1', 'deleted']]);
  // Jede Anforderung genau einmal in der flachen Liste
  const ids = next.allControls.map((c) => c.id);
  assert.equal(ids.length, new Set(ids).size);
  assert.equal(next.practices[0].controls.length, ids.length);
  assert.equal(next.controlMap.get('GC.1.1.1').diff.status, 'unchanged');
});
