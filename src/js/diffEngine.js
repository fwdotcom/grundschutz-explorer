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
 * Compares two NormalizedCatalogs
 */
export function compareCatalogs(baseCatalog, newCatalog) {
  const diffsByControlId = new Map();

  let addedCount = 0;
  let modifiedCount = 0;
  let deletedCount = 0;
  let unchangedCount = 0;

  const baseMap = baseCatalog.controlMap;
  const newMap = newCatalog.controlMap;

  // 1. Check all controls in newCatalog against baseCatalog
  for (const [id, newCtrl] of newMap.entries()) {
    const baseCtrl = baseMap.get(id);

    if (!baseCtrl) {
      // Control is new (added)
      const diffInfo = {
        status: 'added',
        changes: [
          {
            field: 'all',
            label: 'Neue Anforderung',
            oldValue: '',
            newValue: `Neu hinzugefügt: ${newCtrl.id} - ${newCtrl.title}`,
          },
        ],
      };
      newCtrl.diff = diffInfo;
      diffsByControlId.set(id, diffInfo);
      addedCount++;
    } else {
      // Check for modifications
      const changes = [];

      if ((baseCtrl.title || '').trim() !== (newCtrl.title || '').trim()) {
        changes.push({
          field: 'title',
          label: 'Titel',
          oldValue: baseCtrl.title || '',
          newValue: newCtrl.title || '',
        });
      }

      if ((baseCtrl.modalVerb || '') !== (newCtrl.modalVerb || '')) {
        changes.push({
          field: 'modalVerb',
          label: 'Modalverb',
          oldValue: baseCtrl.modalVerb || 'UNBEKANNT',
          newValue: newCtrl.modalVerb || 'UNBEKANNT',
        });
      }

      if ((baseCtrl.secLevel || '') !== (newCtrl.secLevel || '')) {
        changes.push({
          field: 'secLevel',
          label: 'Sicherheitsniveau (sec_level)',
          oldValue: baseCtrl.secLevel || '-',
          newValue: newCtrl.secLevel || '-',
        });
      }

      if ((baseCtrl.effortLevel || '') !== (newCtrl.effortLevel || '')) {
        changes.push({
          field: 'effortLevel',
          label: 'Aufwandsklasse (effort_level)',
          oldValue: baseCtrl.effortLevel || '-',
          newValue: newCtrl.effortLevel || '-',
        });
      }

      if ((baseCtrl.statementProse || '').trim() !== (newCtrl.statementProse || '').trim()) {
        changes.push({
          field: 'statementProse',
          label: 'Anforderungstext (Statement)',
          oldValue: baseCtrl.statementProse || '',
          newValue: newCtrl.statementProse || '',
        });
      }

      if ((baseCtrl.guidanceProse || '').trim() !== (newCtrl.guidanceProse || '').trim()) {
        changes.push({
          field: 'guidanceProse',
          label: 'Erläuterung & Hilfestellung (Guidance)',
          oldValue: baseCtrl.guidanceProse || '',
          newValue: newCtrl.guidanceProse || '',
        });
      }

      // Check Elementare Gefährdungen diff
      const oldThreats = [...baseCtrl.elementareGefaehrdungen].sort().join(';');
      const newThreats = [...newCtrl.elementareGefaehrdungen].sort().join(';');
      if (oldThreats !== newThreats) {
        changes.push({
          field: 'elementareGefaehrdungen',
          label: 'Elementare Gefährdungen',
          oldValue: baseCtrl.elementareGefaehrdungen.join(', ') || 'Keine',
          newValue: newCtrl.elementareGefaehrdungen.join(', ') || 'Keine',
        });
      }

      if (changes.length > 0) {
        const diffInfo = {
          status: 'modified',
          changes,
        };
        newCtrl.diff = diffInfo;
        diffsByControlId.set(id, diffInfo);
        modifiedCount++;
      } else {
        const diffInfo = {
          status: 'unchanged',
          changes: [],
        };
        newCtrl.diff = diffInfo;
        diffsByControlId.set(id, diffInfo);
        unchangedCount++;
      }
    }
  }

  // 2. Check for deleted controls (in base but not in new)
  for (const [id, baseCtrl] of baseMap.entries()) {
    if (!newMap.has(id)) {
      const diffInfo = {
        status: 'deleted',
        changes: [
          {
            field: 'all',
            label: 'Entfallene Anforderung',
            oldValue: `${baseCtrl.id} - ${baseCtrl.title}`,
            newValue: 'In neuer Version nicht mehr vorhanden',
          },
        ],
      };
      diffsByControlId.set(id, diffInfo);
      deletedCount++;

      const deletedControl = {
        ...baseCtrl,
        diff: diffInfo,
      };

      const targetPractice = newCatalog.practices.find((p) => p.id === baseCtrl.groupId);
      if (targetPractice) {
        if (baseCtrl.subgroupId) {
          const targetSub = targetPractice.subgroups.find((s) => s.id === baseCtrl.subgroupId);
          if (targetSub) {
            targetSub.controls.push(deletedControl);
          } else {
            targetPractice.controls.push(deletedControl);
          }
        } else {
          targetPractice.controls.push(deletedControl);
        }
      }
      newCatalog.allControls.push(deletedControl);
      newCatalog.controlMap.set(id, deletedControl);
    }
  }

  return {
    hasDiff: addedCount > 0 || modifiedCount > 0 || deletedCount > 0,
    baseCatalogTitle: `${baseCatalog.title} (${baseCatalog.version || 'Basis'})`,
    comparedCatalogTitle: `${newCatalog.title} (${newCatalog.version || 'Neu'})`,
    addedCount,
    modifiedCount,
    deletedCount,
    unchangedCount,
    diffsByControlId,
  };
}
