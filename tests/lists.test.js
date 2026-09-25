/**
 * SPDX-FileCopyrightText: 2026 Frank Winter
 * SPDX-License-Identifier: MIT
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  LIST_EXPORT_FORMAT,
  entryKey,
  buildListExport,
  parseListImport,
  mergeNotes,
  uniqueListName,
  listExportFileName,
} from '../src/js/lists.js';

const lists = [
  { id: 'a', name: 'Workshop', createdAt: '2026-09-01T00:00:00.000Z' },
  { id: 'b', name: 'Audit', createdAt: '2026-09-02T00:00:00.000Z' },
];
const entries = [
  { key: entryKey('a', 'GC.2.1'), listId: 'a', controlId: 'GC.2.1', note: 'klären', createdAt: 'x', updatedAt: 'y' },
  { key: entryKey('a', 'GC.10.1'), listId: 'a', controlId: 'GC.10.1', note: '', createdAt: 'x', updatedAt: 'y' },
  { key: entryKey('b', 'GC.2.1'), listId: 'b', controlId: 'GC.2.1', note: 'anderes', createdAt: 'x', updatedAt: 'y' },
];

test('Export enthält nur die Einträge der gewählten Listen, natürlich sortiert', () => {
  const data = buildListExport([lists[0]], entries, '1.1.0');
  assert.equal(data.format, LIST_EXPORT_FORMAT);
  assert.equal(data.lists.length, 1);
  assert.deepEqual(
    data.lists[0].entries.map((e) => e.controlId),
    ['GC.2.1', 'GC.10.1']
  );
  assert.equal(data.lists[0].entries[0].note, 'klären');
});

test('Export lässt sich wieder importieren', () => {
  const data = JSON.parse(JSON.stringify(buildListExport(lists, entries)));
  const imported = parseListImport(data);
  assert.deepEqual(imported.map((l) => l.name), ['Workshop', 'Audit']);
  assert.equal(imported[1].entries[0].note, 'anderes');
});

test('Import lehnt fremde oder neuere Dateien ab', () => {
  assert.throws(() => parseListImport({ foo: 1 }), /keine Listen-Sicherung/);
  assert.throws(() => parseListImport({ format: LIST_EXPORT_FORMAT, version: 99, lists: [] }), /neueren Version/);
});

test('Import überspringt ungültige Einträge und fasst doppelte zusammen', () => {
  const imported = parseListImport({
    format: LIST_EXPORT_FORMAT,
    version: 1,
    lists: [
      { name: '  ' },
      {
        name: 'Liste',
        entries: [{ controlId: 'GC.1.1', note: 'eins' }, { controlId: 'GC.1.1', note: 'zwei' }, { note: 'ohne Kennung' }, null],
      },
    ],
  });
  assert.equal(imported.length, 1);
  assert.equal(imported[0].entries.length, 1);
  assert.match(imported[0].entries[0].note, /eins[\s\S]*zwei/);
});

test('Notizen zusammenführen verliert keinen Text', () => {
  assert.equal(mergeNotes('', 'neu'), 'neu');
  assert.equal(mergeNotes('alt', ''), 'alt');
  assert.equal(mergeNotes('gleich', 'gleich'), 'gleich');
  assert.equal(mergeNotes('alt und mehr', 'alt'), 'alt und mehr');
  assert.match(mergeNotes('alt', 'neu'), /^alt\n\n---\n\nneu$/);
});

test('Listennamen werden eindeutig gemacht', () => {
  assert.equal(uniqueListName('Audit', ['Workshop']), 'Audit');
  assert.equal(uniqueListName('audit', ['Audit', 'Audit (2)']), 'audit (3)');
});

test('Dateiname der Sicherung', () => {
  const day = new Date('2026-09-25T10:00:00Z');
  assert.equal(listExportFileName('Workshop IT-Betrieb Ärger', day), 'grundschutz-explorer-liste-workshop-it-betrieb-aerger-2026-09-25.json');
  assert.equal(listExportFileName('', day), 'grundschutz-explorer-listen-2026-09-25.json');
});
