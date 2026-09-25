/**
 * SPDX-FileCopyrightText: 2026 Frank Winter
 * SPDX-License-Identifier: MIT
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchesFacets } from '../src/js/filters.js';

// Filter wie in der App: je Bereich die Werte mit ✓ (inc) und ✕ (exc)
function spec({ inc = {}, exc = {} } = {}) {
  const toSets = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, new Set(v)]));
  return { inc: toSets(inc), exc: toSets(exc) };
}

// Werte einer Anforderung je Bereich
const ctrl = { modalVerb: ['MUSS'], effort: ['2'], tags: ['Cloud', 'Zero Trust'] };
const valuesOf = (category) => ctrl[category] || [];

test('ohne Filter passt jede Anforderung', () => {
  assert.equal(matchesFacets(spec(), valuesOf), true);
});

test('mehrere ✓ im selben Bereich: einer genügt (oder), auch bei einem Wert je Anforderung', () => {
  assert.equal(matchesFacets(spec({ inc: { modalVerb: ['MUSS', 'SOLLTE'] } }), valuesOf), true);
  assert.equal(matchesFacets(spec({ inc: { modalVerb: ['SOLLTE', 'KANN'] } }), valuesOf), false);
  assert.equal(matchesFacets(spec({ inc: { tags: ['Zero Trust', 'OT'] } }), valuesOf), true);
});

test('zwischen den Bereichen: alle müssen passen (und)', () => {
  assert.equal(matchesFacets(spec({ inc: { modalVerb: ['MUSS'], effort: ['2'] } }), valuesOf), true);
  assert.equal(matchesFacets(spec({ inc: { modalVerb: ['MUSS'], effort: ['3'] } }), valuesOf), false);
});

test('✕ schließt aus, auch wenn ein ✓ im selben Bereich passt', () => {
  assert.equal(matchesFacets(spec({ exc: { tags: ['Cloud'] } }), valuesOf), false);
  assert.equal(matchesFacets(spec({ inc: { tags: ['Zero Trust'] }, exc: { tags: ['Cloud'] } }), valuesOf), false);
  assert.equal(matchesFacets(spec({ exc: { modalVerb: ['SOLLTE'] } }), valuesOf), true);
});

test('✓ und ✕ im selben Bereich mit einem Wert je Anforderung ergeben keine leere Liste', () => {
  // Früher: ✓ MUSS, ✕ SOLLTE, dann SOLLTE auf ✓ umgeschaltet – zwei ✓ wurden mit „und“ geprüft
  assert.equal(matchesFacets(spec({ inc: { modalVerb: ['MUSS', 'SOLLTE'] } }), valuesOf), true);
});

test('Anforderung ohne Wert im Bereich passt zu keinem ✓', () => {
  assert.equal(matchesFacets(spec({ inc: { threat: ['G 0.1'] } }), valuesOf), false);
  assert.equal(matchesFacets(spec({ exc: { threat: ['G 0.1'] } }), valuesOf), true);
});

test('der übergangene Bereich zählt nicht mit (Trefferzahlen neben den Werten)', () => {
  const s = spec({ inc: { modalVerb: ['KANN'], effort: ['2'] } });
  assert.equal(matchesFacets(s, valuesOf), false);
  assert.equal(matchesFacets(s, valuesOf, 'modalVerb'), true);
});
