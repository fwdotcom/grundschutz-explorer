/**
 * SPDX-FileCopyrightText: 2026 Frank Winter
 * SPDX-License-Identifier: MIT
 *
 * Pure JavaScript Diff Engine & LCS Word-Diff (Zero-Build, Client-Side)
 */

/**
 * Computes word-level diff using Longest Common Subsequence (LCS)
 * Returns array of { value: string, added?: boolean, removed?: boolean }
 */
export function computeWordDiff(oldText = '', newText = '') {
  if (!oldText && !newText) return [];
  if (!oldText) return [{ value: newText, added: true }];
  if (!newText) return [{ value: oldText, removed: true }];
  if (oldText === newText) return [{ value: oldText }];

  // Tokenize preserving whitespace and words
  const tokenize = (str) => str.match(/([^\s]+|\s+)/g) || [];
  const words1 = tokenize(oldText);
  const words2 = tokenize(newText);

  const n = words1.length;
  const m = words2.length;

  // LCS Matrix
  // For memory safety with very large text, limit or use 2 rows
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (words1[i - 1] === words2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to build diff tokens
  let i = n;
  let j = m;
  const rawTokens = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && words1[i - 1] === words2[j - 1]) {
      rawTokens.push({ value: words1[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      rawTokens.push({ value: words2[j - 1], added: true });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      rawTokens.push({ value: words1[i - 1], removed: true });
      i--;
    }
  }

  rawTokens.reverse();

  // Merge adjacent tokens of same type
  const merged = [];
  for (const tok of rawTokens) {
    const last = merged[merged.length - 1];
    if (last && Boolean(last.added) === Boolean(tok.added) && Boolean(last.removed) === Boolean(tok.removed)) {
      last.value += tok.value;
    } else {
      merged.push({ ...tok });
    }
  }

  return merged;
}

/**
 * Verglichene Felder einer Anforderung, in der Reihenfolge der Detailansicht.
 * kind: 'value' (Einzelwert), 'list' (Menge, Reihenfolge egal), 'prose' (Text, Wortvergleich in der Detailansicht)
 */
export const COMPARED_FIELDS = [
  { field: 'title', label: 'Titel', kind: 'value' },
  { field: 'placement', label: 'Einordnung', kind: 'value' },
  { field: 'modalVerb', label: 'Modalverb', kind: 'value' },
  { field: 'secLevel', label: 'Schutzbedarf', kind: 'value' },
  { field: 'statementProse', label: 'Anforderungstext', kind: 'prose' },
  { field: 'confidentiality', label: 'Vertraulichkeit', kind: 'value' },
  { field: 'integrity', label: 'Integrität', kind: 'value' },
  { field: 'availability', label: 'Verfügbarkeit', kind: 'value' },
  { field: 'authenticity', label: 'Authentizität', kind: 'value' },
  { field: 'actionWord', label: 'Handlungswort', kind: 'value' },
  { field: 'documentation', label: 'Dokumentation', kind: 'value' },
  { field: 'result', label: 'Gefordertes Ergebnis', kind: 'value' },
  { field: 'resultSpecification', label: 'Spezifikation', kind: 'value' },
  { field: 'effortLevel', label: 'Aufwand', kind: 'value' },
  { field: 'tags', label: 'Tags', kind: 'list' },
  { field: 'elementareGefaehrdungen', label: 'Elementare Gefährdungen', kind: 'list' },
  { field: 'guidanceProse', label: 'Hilfestellung', kind: 'prose' },
  { field: 'altIdentifier', label: 'UUID', kind: 'value' },
];

// Wert eines Feldes; „Einordnung“ ist die übergeordnete Anforderung, sonst der Teilbereich bzw. die Praktik
function fieldValue(ctrl, field) {
  if (field === 'placement') return ctrl.parentControlId || ctrl.subgroupId || ctrl.groupId || '';
  const v = ctrl[field];
  if (Array.isArray(v)) return v;
  return v === undefined || v === null ? '' : String(v).trim();
}

// Unterschiede zweier Fassungen einer Anforderung, je Feld ein Eintrag
export function compareControls(baseCtrl, newCtrl) {
  const changes = [];
  for (const { field, label, kind } of COMPARED_FIELDS) {
    const oldValue = fieldValue(baseCtrl, field);
    const newValue = fieldValue(newCtrl, field);
    if (kind === 'list') {
      const oldSet = new Set(oldValue);
      const newSet = new Set(newValue);
      const removed = [...oldSet].filter((v) => !newSet.has(v));
      const added = [...newSet].filter((v) => !oldSet.has(v));
      if (removed.length || added.length) changes.push({ field, label, kind, removed, added });
    } else if (oldValue !== newValue) {
      changes.push({ field, label, kind, oldValue, newValue });
    }
  }
  return changes;
}

/**
 * Vergleicht einen älteren Stand (base) mit dem angezeigten (current). Verändert keinen der Kataloge.
 * deletedControls: Anforderungen, die es nur im älteren Stand gibt (Objekte aus base).
 */
export function compareCatalogs(baseCatalog, newCatalog) {
  const diffsByControlId = new Map();
  const deletedControls = [];
  let addedCount = 0;
  let modifiedCount = 0;
  let deletedCount = 0;
  let unchangedCount = 0;

  for (const [id, newCtrl] of newCatalog.controlMap) {
    const baseCtrl = baseCatalog.controlMap.get(id);
    if (!baseCtrl) {
      diffsByControlId.set(id, { status: 'added', changes: [] });
      addedCount++;
      continue;
    }
    const changes = compareControls(baseCtrl, newCtrl);
    diffsByControlId.set(id, { status: changes.length ? 'modified' : 'unchanged', changes });
    if (changes.length) modifiedCount++;
    else unchangedCount++;
  }

  for (const [id, baseCtrl] of baseCatalog.controlMap) {
    if (newCatalog.controlMap.has(id)) continue;
    diffsByControlId.set(id, { status: 'deleted', changes: [] });
    deletedControls.push(baseCtrl);
    deletedCount++;
  }

  return {
    hasDiff: addedCount > 0 || modifiedCount > 0 || deletedCount > 0,
    addedCount,
    modifiedCount,
    deletedCount,
    unchangedCount,
    diffsByControlId,
    deletedControls,
  };
}

/**
 * Überträgt einen Vergleich auf den angezeigten Katalog: setzt ctrl.diff und fügt die gelöschten Anforderungen
 * an ihrer früheren Stelle ein – Unteranforderungen unter ihrer übergeordneten Anforderung, sonst im Teilbereich.
 * Verändert den Katalog; gedacht für einen frisch geparsten Katalog, der nur der Anzeige dient.
 */
export function applyDiff(catalog, diff) {
  for (const [id, ctrl] of catalog.controlMap) ctrl.diff = diff.diffsByControlId.get(id) || null;

  const deletedIds = new Set(diff.deletedControls.map((c) => c.id));
  // Kopie einer gelöschten Anforderung; ihre Unteranforderungen nur, soweit sie ebenfalls gelöscht sind
  const copyDeleted = (baseCtrl) => {
    const copy = {
      ...baseCtrl,
      diff: diff.diffsByControlId.get(baseCtrl.id),
      subcontrols: (baseCtrl.subcontrols || []).filter((sc) => deletedIds.has(sc.id)).map(copyDeleted),
    };
    catalog.controlMap.set(copy.id, copy);
    catalog.allControls.push(copy);
    return copy;
  };

  for (const baseCtrl of diff.deletedControls) {
    // Unter einer ebenfalls gelöschten Anforderung: wird mit ihr eingefügt
    if (baseCtrl.parentControlId && deletedIds.has(baseCtrl.parentControlId)) continue;
    const copy = copyDeleted(baseCtrl);

    let practice = catalog.practices.find((p) => p.id === baseCtrl.groupId);
    if (!practice) {
      practice = { id: baseCtrl.groupId, title: baseCtrl.groupTitle || baseCtrl.groupId, subgroups: [], controls: [] };
      catalog.practices.push(practice);
    }
    // Die Praktik führt alle ihre Anforderungen flach (für Zählungen), einschließlich Unteranforderungen
    const addFlat = (c) => {
      practice.controls.push(c);
      for (const sc of c.subcontrols) addFlat(sc);
    };
    addFlat(copy);

    const parent = baseCtrl.parentControlId ? catalog.controlMap.get(baseCtrl.parentControlId) : null;
    if (parent) {
      parent.subcontrols = [...(parent.subcontrols || []), copy];
    } else if (baseCtrl.subgroupId) {
      let sub = practice.subgroups.find((s) => s.id === baseCtrl.subgroupId);
      if (!sub) {
        sub = { id: baseCtrl.subgroupId, title: baseCtrl.subgroupTitle || baseCtrl.subgroupId, controls: [] };
        practice.subgroups.push(sub);
      }
      sub.controls.push(copy);
    }
  }
  return catalog;
}
