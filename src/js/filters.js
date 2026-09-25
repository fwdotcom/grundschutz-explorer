/**
 * SPDX-FileCopyrightText: 2026 Frank Winter
 * SPDX-License-Identifier: MIT
 *
 * Facettenfilter (ohne Abhängigkeiten): eine Regel für alle Bereiche der Filterleiste.
 * - Zwischen den Bereichen: und – eine Anforderung muss jeden Bereich mit Filter erfüllen.
 * - Mehrere ✓ im selben Bereich: oder – einer der Werte genügt.
 * - ✕: Anforderungen mit einem ausgeschlossenen Wert fallen immer heraus.
 */

/**
 * Prüft eine Anforderung gegen die aktiven Facettenfilter.
 *
 * @param {{inc: Object<string, Set<string>>, exc: Object<string, Set<string>>}} spec
 *   Gewählte (✓) und ausgeschlossene (✕) Werte je Bereich
 * @param {(category: string) => string[]} valuesOf
 *   Werte der Anforderung im Bereich, als Liste – auch in Bereichen mit nur einem Wert je Anforderung
 * @param {string|null} ignoreCategory
 *   Bereich, der nicht geprüft wird (für die Trefferzahlen neben den Werten dieses Bereichs)
 */
export function matchesFacets(spec, valuesOf, ignoreCategory = null) {
  const categories = new Set([...Object.keys(spec.inc), ...Object.keys(spec.exc)]);
  for (const category of categories) {
    if (category === ignoreCategory) continue;
    const inc = spec.inc[category];
    const exc = spec.exc[category];
    if (!inc?.size && !exc?.size) continue;
    const values = valuesOf(category);
    if (exc?.size && values.some((v) => exc.has(v))) return false;
    if (inc?.size && !values.some((v) => inc.has(v))) return false;
  }
  return true;
}
