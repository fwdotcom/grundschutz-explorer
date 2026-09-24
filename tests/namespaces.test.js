import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv, loadNamespaces, namespaces, lookupNamespace, namespaceDefinition } from '../src/js/namespaces.js';
import { installLocalFetch } from './helpers.js';

before(async () => {
  installLocalFetch();
  await loadNamespaces();
});

test('parseCsv: Anführungszeichen, Kommas und Zeilenumbrüche in Feldern', () => {
  const rows = parseCsv('﻿a,b,c\r\n1,"x, y","Zeile 1\nZeile 2"\n2,"sagt ""Hallo""",\n\n');
  assert.deepEqual(rows, [
    ['a', 'b', 'c'],
    ['1', 'x, y', 'Zeile 1\nZeile 2'],
    ['2', 'sagt "Hallo"', ''],
  ]);
});

test('alle genutzten Namespaces werden geladen', () => {
  for (const [name, table] of Object.entries(namespaces)) {
    assert.ok(Object.keys(table).length > 0, `Namespace ${name} ist leer`);
  }
});

test('Aufwandsstufen 0 bis 5 mit Definition', () => {
  for (const level of ['0', '1', '2', '3', '4', '5']) {
    assert.ok(namespaceDefinition('effortLevels', level), `Stufe ${level} ohne Definition`);
  }
});

test('elementare Gefährdungen G 0.1 bis G 0.47 mit Bezeichnung', () => {
  for (let i = 1; i <= 47; i++) {
    assert.ok(lookupNamespace('basethreats', `G 0.${i}`)?.Begriff, `G 0.${i} fehlt`);
  }
  // Bezeichnung mit Komma muss vollständig eingelesen werden
  assert.equal(lookupNamespace('basethreats', 'G 0.4').Begriff, 'Verschmutzung, Staub, Korrosion');
});

test('Schutzziele und Wirkungsstufen', () => {
  assert.ok(namespaceDefinition('securityTargets', 'Vertraulichkeit (Confidentiality)'));
  for (const v of ['0', '1', '2']) assert.ok(namespaceDefinition('securityTargetLevels', v));
});

test('tolerante Suche ignoriert Groß-/Kleinschreibung, Leerzeichen und Bindestriche', () => {
  assert.ok(lookupNamespace('documentation', 'Detektions-Konzept'), 'Detektions-Konzept ↔ Detektionskonzept');
  assert.ok(lookupNamespace('documentation', 'outsourcing strategie'), 'outsourcing strategie ↔ Outsourcing-Strategie');
  assert.equal(lookupNamespace('documentation', 'gibt es nicht'), null);
  assert.equal(lookupNamespace('documentation', ''), null);
});
