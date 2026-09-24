/**
 * Grundschutz++ Explorer SPA - Main Application (Pure JavaScript, Zero-Build)
 */

import { parseOscalCatalog, formatBsiThreat } from './oscalParser.js';
import { namespaces, loadNamespaces, lookupNamespace, namespaceDefinition } from './namespaces.js';
import { compareCatalogs, computeWordDiff } from './diffEngine.js';
import {
  saveCatalogRecord,
  getCatalogRecord,
  getAllCatalogRecords,
  deleteCatalogRecord,
  saveSetting,
  getSetting,
  clearAllData,
} from './storage.js';

// Schutzziele: Feld der Anforderung, Anzeige und Begriff im Namespace security_targets.csv
const SECURITY_TARGETS = [
  { key: 'confidentiality', short: 'C', label: 'Vertraulichkeit', nsKey: 'Vertraulichkeit (Confidentiality)' },
  { key: 'integrity', short: 'I', label: 'Integrität', nsKey: 'Integrität (Integrity)' },
  { key: 'availability', short: 'A', label: 'Verfügbarkeit', nsKey: 'Verfügbarkeit (Availability)' },
  { key: 'authenticity', short: 'Au', label: 'Authentizität', nsKey: 'Authentizität (Authenticity)' },
];

// Kurzbezeichnung der Wirkungsstufen (Definition in security_targets_levels.csv)
const SECURITY_TARGET_LEVEL_LABELS = { 0: 'keine', 1: 'wirkt hin', 2: 'im Zentrum' };

// Einwertige Filter-Facetten: Kategorie → Feld der Anforderung
const VALUE_FACETS = {
  secLevel: 'secLevel',
  effort: 'effortLevel',
  actionWord: 'actionWord',
  documentation: 'documentation',
  ...Object.fromEntries(SECURITY_TARGETS.map((t) => [t.key, t.key])),
};

const { createApp, ref, computed, onMounted, onBeforeUnmount, watch, nextTick } = window.Vue;

const PRESET_CATALOG_URL =
  'https://raw.githubusercontent.com/BSI-Bund/Stand-der-Technik-Bibliothek/main/control_layer/Grundschutz%2B%2B/Grundschutz%2B%2B-resolved_catalog.json';

const APP_VERSION = '1.0.0';

const app = createApp({
  setup() {
    // Core State
    const activeCatalog = ref(null);
    const activeRecordId = ref('');
    const comparisonCatalog = ref(null);
    const comparisonRecordId = ref('');
    const diffSummary = ref(null);
    const storedCatalogs = ref([]);
    const selectedControlId = ref('');

    // UI State
    const isImportModalOpen = ref(false);
    const isVersionsModalOpen = ref(false);
    const isImpressumModalOpen = ref(false);
    const isDatenschutzModalOpen = ref(false);
    const isDarkMode = ref(false);
    const isLoadingInitial = ref(true);
    const isLoadingBundle = ref(false);
    const detailPaneWidth = ref(46); // Anteil der Detailsicht am Arbeitsbereich (%)
    const isResizing = ref(false);
    const isDragOver = ref(false);

    // Template Refs
    const searchInput = ref(null);
    const splitEl = ref(null);
    const listScroll = ref(null);
    const detailBody = ref(null);

    // Detail Tab State
    const detailActiveTab = ref('overview');
    // Aktive Ebene der Detailansicht: null = Anforderung, sonst { level: 'practice' | 'subgroup', id }
    const detailScope = ref(null);
    // Ausgeklappte Definitionen (Info-Buttons) in der Detailansicht
    const openDefs = ref({ effort: false, actionWord: false, documentation: false, securityTargets: false });
    // Zähler, der nach dem Laden der BSI-Namespaces erhöht wird (macht Definitionen reaktiv)
    const namespacesVersion = ref(0);

    // Import Modal State
    const importModalTab = ref('presets');
    const importUrlInput = ref('');
    const importIsDiff = ref(false);
    const importLoading = ref(false);
    const importError = ref('');
    const importSuccess = ref('');

    // Tree Expanded Keys
    const expandedKeys = ref(new Set());

    // Filter State (Text Search & Drilldowns)
    const filters = ref({
      searchQuery: '',
      subgroupFilter: '',
      controlFilter: '',
    });

    // Tag-based Facet Filters: Array of { key, category, value, mode: 'include'|'exclude', label, categoryLabel }
    const activeTags = ref([]);

    // Mini-Suche für Gefährdungen in der Left Rail
    const threatRailSearch = ref('');
    const threatShowOnlyMatching = ref(false);
    const threatShowAll = ref(false);

    // Aufklapp-Status der Rail-Sektionen
    const railCollapsed = ref({
      modalVerbs: false,
      secLevels: false,
      practices: false,
      threats: false,
      diffs: false,
      effort: false,
      actionWords: true,
      documentation: true,
      securityTargets: false,
    });

    // Suchfelder der langen Werte-Facetten
    const facetSearch = ref({ actionWord: '', documentation: '' });

    // Computed: Practice options
    const practiceOptions = computed(() => {
      if (!activeCatalog.value) return [];
      return activeCatalog.value.practices.map((p) => ({
        id: p.id,
        title: p.title,
      }));
    });

    // Computed: Available Security Levels
    const availableSecLevels = computed(() => {
      if (!activeCatalog.value) return [];
      const levels = new Set();
      for (const c of activeCatalog.value.allControls) {
        if (c.secLevel) levels.add(c.secLevel);
      }
      return Array.from(levels).sort((a, b) => (b.startsWith('normal') - a.startsWith('normal')) || a.localeCompare(b, 'de'));
    });

    // Computed: Werte der Facetten Aufwand, Handlungswort und Dokumentation
    const facetOptions = computed(() => {
      const opts = { effort: [], actionWord: [], documentation: [] };
      if (!activeCatalog.value) return opts;
      for (const [category, field] of Object.entries(VALUE_FACETS)) {
        if (!(category in opts)) continue;
        const values = new Set();
        for (const c of activeCatalog.value.allControls) {
          if (c[field] !== undefined && c[field] !== null && c[field] !== '') values.add(String(c[field]));
        }
        opts[category] = Array.from(values).sort((a, b) =>
          category === 'effort' ? Number(a) - Number(b) : a.localeCompare(b, 'de')
        );
      }
      return opts;
    });

    // Höchste Aufwandsstufe (BSI-Skala, ggf. durch den Katalog erweitert)
    const maxEffort = computed(() => {
      namespacesVersion.value;
      const nums = [...Object.keys(namespaces.effortLevels), ...facetOptions.value.effort].map(Number).filter((n) => !Number.isNaN(n));
      return nums.length ? Math.max(...nums) : 0;
    });

    // Gefilterte Optionslisten für Handlungswort/Dokumentation (Suchfeld im Rail)
    function facetOptionsFiltered(category) {
      const q = (facetSearch.value[category] || '').trim().toLowerCase();
      const list = facetOptions.value[category] || [];
      const selected = list.filter((v) => getTagMode(category, v));
      const rest = list.filter((v) => !getTagMode(category, v) && (!q || v.toLowerCase().includes(q)));
      // Bei aktivem Einschluss nur die gewählten Werte zeigen (analog Schutzniveau)
      if (hasCategoryInclude(category) && !q) return selected;
      return [...selected, ...rest];
    }

    // Aufwand als horizontaler Balken: Farbe von grün (0) bis rot (Maximum)
    function hasEffort(level) {
      return level !== undefined && level !== null && level !== '' && !Number.isNaN(Number(level));
    }

    function effortColor(level) {
      const ratio = maxEffort.value ? Math.max(0, Math.min(1, Number(level) / maxEffort.value)) : 0;
      return `hsl(${Math.round(120 * (1 - ratio))}, 70%, 45%)`;
    }

    function effortDefinition(level) {
      return hasEffort(level) ? definition('effortLevels', String(Number(level))) : '';
    }

    // Definition eines Begriffs aus einem BSI-Namespace (leer, wenn nicht vorhanden)
    function definition(name, value) {
      namespacesVersion.value;
      return namespaceDefinition(name, value);
    }

    function namespaceEntry(name, value) {
      namespacesVersion.value;
      return lookupNamespace(name, value);
    }

    // Schutzziele einer Anforderung: nur vorhanden, wenn mindestens ein Wert gesetzt ist
    function hasSecurityTargets(ctrl) {
      return Boolean(ctrl) && SECURITY_TARGETS.some((t) => ctrl[t.key] !== undefined && ctrl[t.key] !== null && ctrl[t.key] !== '');
    }

    // Schutzziele, die im Zentrum der Anforderung stehen (Wert 2)
    function centralSecurityTargets(ctrl) {
      return ctrl ? SECURITY_TARGETS.filter((t) => String(ctrl[t.key]) === '2') : [];
    }

    function securityTargetLevelLabel(value) {
      return SECURITY_TARGET_LEVEL_LABELS[Number(value)] ?? '–';
    }

    function securityTargetChipLabel(target, value) {
      return `${target.label}: ${value} (${securityTargetLevelLabel(value)})`;
    }

    // Erster Absatz einer Definition (für Tooltips)
    function shortDefinition(name, value) {
      return definition(name, value).split(/\n\s*\n/)[0];
    }

    // Computed: Active filter specification grouped by category and mode
    const activeFilterSpec = computed(() => {
      const spec = {
        inc: { practice: new Set(), modalVerb: new Set(), threat: new Set(), diff: new Set() },
        exc: { practice: new Set(), modalVerb: new Set(), threat: new Set(), diff: new Set() },
      };
      for (const category of Object.keys(VALUE_FACETS)) {
        spec.inc[category] = new Set();
        spec.exc[category] = new Set();
      }
      for (const t of activeTags.value) {
        if (t.mode === 'include') {
          if (!spec.inc[t.category]) spec.inc[t.category] = new Set();
          spec.inc[t.category].add(t.value);
        } else if (t.mode === 'exclude') {
          if (!spec.exc[t.category]) spec.exc[t.category] = new Set();
          spec.exc[t.category].add(t.value);
        }
      }
      return spec;
    });

    function matchesFilterCategory(ctrl, ignoreCategory = null) {
      const f = filters.value;

      // 1. Text Search Query
      const query = f.searchQuery.trim().toLowerCase();
      if (query) {
        const queryMatches =
          ctrl.id.toLowerCase().includes(query) ||
          ctrl.title.toLowerCase().includes(query) ||
          (ctrl.statementProse || '').toLowerCase().includes(query) ||
          (ctrl.guidanceProse || '').toLowerCase().includes(query) ||
          ctrl.elementareGefaehrdungen.some((t) => t.toLowerCase().includes(query));
        if (!queryMatches) return false;
      }

      // 2. Drilldowns (Subgroup & Control)
      if (f.subgroupFilter && ctrl.subgroupId !== f.subgroupFilter) return false;
      if (f.controlFilter) {
        const isSelf = ctrl.id === f.controlFilter;
        const isChild = ctrl.parentControlId === f.controlFilter;
        const isParent = ctrl.subcontrols?.some((sc) => sc.id === f.controlFilter);
        if (!isSelf && !isChild && !isParent) return false;
      }

      // 3. Facets (STRICT AND CONJUNCTION)
      const spec = activeFilterSpec.value;

      // Practice
      if (ignoreCategory !== 'practice') {
        if (spec.exc.practice.has(ctrl.groupId)) return false;
        if (spec.inc.practice.size > 0) {
          for (const reqP of spec.inc.practice) {
            if (ctrl.groupId !== reqP) return false;
          }
        }
      }

      // Modal Verb
      if (ignoreCategory !== 'modalVerb') {
        if (spec.exc.modalVerb.has(ctrl.modalVerb)) return false;
        if (spec.inc.modalVerb.size > 0) {
          for (const reqV of spec.inc.modalVerb) {
            if (ctrl.modalVerb !== reqV) return false;
          }
        }
      }

      // Einwertige Facetten: Schutzniveau, Aufwand, Handlungswort, Dokumentation
      for (const [category, field] of Object.entries(VALUE_FACETS)) {
        if (ignoreCategory === category) continue;
        const value = ctrl[field] === undefined || ctrl[field] === null ? '' : String(ctrl[field]);
        if (spec.exc[category].has(value)) return false;
        for (const req of spec.inc[category]) {
          if (value !== req) return false;
        }
      }

      // Threat
      if (ignoreCategory !== 'threat') {
        if (spec.exc.threat.size > 0 && ctrl.elementareGefaehrdungen.some((t) => spec.exc.threat.has(splitThreat(t).code))) {
          return false;
        }
        if (spec.inc.threat.size > 0) {
          for (const reqT of spec.inc.threat) {
            if (!ctrl.elementareGefaehrdungen.some((t) => splitThreat(t).code === reqT)) {
              return false;
            }
          }
        }
      }

      // Diff
      if (ignoreCategory !== 'diff') {
        const status = ctrl.diff?.status || 'unchanged';
        if (spec.exc.diff.has(status)) return false;
        if (spec.inc.diff.size > 0) {
          for (const reqDiff of spec.inc.diff) {
            if (reqDiff === 'all_diffs') {
              if (status === 'unchanged') return false;
            } else if (status !== reqDiff) {
              return false;
            }
          }
        }
      }

      return true;
    }

    function matchesFilters(ctrl) {
      return matchesFilterCategory(ctrl, null);
    }

    // Computed: Filtered Control IDs
    const filteredControlIds = computed(() => {
      const matches = new Set();
      if (!activeCatalog.value) return matches;
      for (const ctrl of activeCatalog.value.allControls) {
        if (matchesFilters(ctrl)) matches.add(ctrl.id);
      }
      return matches;
    });

    // Practice Counts (ignoring practice facet)
    const practiceCounts = computed(() => {
      const counts = { __all: 0 };
      if (!activeCatalog.value) return counts;
      for (const ctrl of activeCatalog.value.allControls) {
        if (!matchesFilterCategory(ctrl, 'practice')) continue;
        counts[ctrl.groupId] = (counts[ctrl.groupId] || 0) + 1;
        counts.__all++;
      }
      return counts;
    });

    // Modalverb Counts (ignoring modalVerb facet)
    const modalVerbCounts = computed(() => {
      const counts = { MUSS: 0, SOLLTE: 0, KANN: 0 };
      if (!activeCatalog.value) return counts;
      for (const ctrl of activeCatalog.value.allControls) {
        if (!matchesFilterCategory(ctrl, 'modalVerb')) continue;
        if (ctrl.modalVerb && counts[ctrl.modalVerb] !== undefined) {
          counts[ctrl.modalVerb]++;
        }
      }
      return counts;
    });

    // Security Level Counts (ignoring secLevel facet)
    const secLevelCounts = computed(() => {
      const counts = {};
      if (!activeCatalog.value) return counts;
      for (const ctrl of activeCatalog.value.allControls) {
        if (!matchesFilterCategory(ctrl, 'secLevel')) continue;
        if (ctrl.secLevel) {
          counts[ctrl.secLevel] = (counts[ctrl.secLevel] || 0) + 1;
        }
      }
      return counts;
    });

    // Counts für Aufwand, Handlungswort, Dokumentation (jeweils ohne eigene Facette)
    const facetCounts = computed(() => {
      const result = { effort: {}, actionWord: {}, documentation: {} };
      for (const t of SECURITY_TARGETS) result[t.key] = {};
      if (!activeCatalog.value) return result;
      for (const category of Object.keys(result)) {
        const field = VALUE_FACETS[category];
        const counts = result[category];
        for (const ctrl of activeCatalog.value.allControls) {
          const v = ctrl[field];
          if (v === undefined || v === null || v === '') continue;
          if (!matchesFilterCategory(ctrl, category)) continue;
          counts[v] = (counts[v] || 0) + 1;
        }
      }
      return result;
    });

    // Threat Counts (ignoring threat facet)
    const threatCounts = computed(() => {
      const counts = {};
      if (!activeCatalog.value) return counts;
      for (const ctrl of activeCatalog.value.allControls) {
        if (!matchesFilterCategory(ctrl, 'threat')) continue;
        for (const t of ctrl.elementareGefaehrdungen) {
          const { code } = splitThreat(t);
          if (code) {
            counts[code] = (counts[code] || 0) + 1;
          }
        }
      }
      return counts;
    });

    // Diff Counts (ignoring diff facet)
    const diffCounts = computed(() => {
      const counts = { all_diffs: 0, added: 0, modified: 0, deleted: 0 };
      if (!activeCatalog.value) return counts;
      for (const ctrl of activeCatalog.value.allControls) {
        if (!matchesFilterCategory(ctrl, 'diff')) continue;
        const status = ctrl.diff?.status || 'unchanged';
        if (status !== 'unchanged') {
          counts.all_diffs++;
          if (counts[status] !== undefined) counts[status]++;
        }
      }
      return counts;
    });

    const threatsWithMatchesCount = computed(() => {
      let count = 0;
      for (let i = 1; i <= 47; i++) {
        const code = `G 0.${i}`;
        if ((threatCounts.value[code] || 0) > 0) count++;
      }
      return count;
    });

    // Gefährdungen für die Left Rail (gefiltert nach Suchbegriff und Treffer-Option)
    const displayedThreatOptions = computed(() => {
      const list = [];
      const q = threatRailSearch.value.trim().toLowerCase();
      const onlyMatches = threatShowOnlyMatching.value;
      const hasInclude = hasCategoryInclude('threat');

      namespacesVersion.value;
      const nsCodes = Object.keys(namespaces.basethreats).sort(
        (a, b) => Number(a.replace(/^G 0\./, '')) - Number(b.replace(/^G 0\./, ''))
      );
      const codes = nsCodes.length ? nsCodes : Array.from({ length: 47 }, (_, i) => `G 0.${i + 1}`);

      for (const code of codes) {
        const title = namespaces.basethreats[code]?.Begriff || `Gefährdung ${code.replace(/^G /, '')}`;
        const count = threatCounts.value[code] || 0;
        const isActive = isTagActive('threat', code);
        const isIncluded = isTagActive('threat', code, 'include');

        // Wenn "Nur" gewählt ist, andere Gefährdungen ausblenden (außer bei Suche oder Klick auf "Weitere anzeigen")
        if (hasInclude && !threatShowAll.value && !q) {
          if (!isIncluded) continue;
        }

        if (onlyMatches && count === 0 && !isActive) {
          continue;
        }

        if (q) {
          const matchesCode = code.toLowerCase().includes(q) || `g0${i}`.includes(q) || `g${i}`.includes(q) || `${i}` === q;
          const matchesTitle = title.toLowerCase().includes(q);
          if (!matchesCode && !matchesTitle) continue;
        }

        list.push({
          code,
          title,
          label: `${code}: ${title}`,
          definition: namespaces.basethreats[code]?.Definition?.split(/\n\s*\n/)[0] || '',
        });
      }
      return list;
    });

    // Alle aktiven Filter-Chips für die Visualisierungsleiste über dem Explorer
    const allActiveChips = computed(() => {
      const chips = [];

      // 1. Textsuche
      if (filters.value.searchQuery.trim()) {
        chips.push({
          key: 'searchQuery',
          type: 'search',
          category: 'search',
          categoryLabel: 'Suche',
          label: `"${filters.value.searchQuery.trim()}"`,
          mode: 'include',
        });
      }

      // 2. Tag-basierte Filter (Praktik, Modalverb, Niveau, Gefährdung, Diff)
      for (const tag of activeTags.value) {
        chips.push({
          ...tag,
          type: 'facet',
        });
      }

      // 3. Teilbereich-Drilldown
      if (filters.value.subgroupFilter) {
        let subTitle = filters.value.subgroupFilter;
        if (activeCatalog.value) {
          for (const p of activeCatalog.value.practices) {
            const sub = p.subgroups.find((s) => s.id === filters.value.subgroupFilter);
            if (sub) {
              subTitle = `${sub.id} ${sub.title}`;
              break;
            }
          }
        }
        chips.push({
          key: 'subgroupFilter',
          type: 'subgroup',
          category: 'subgroup',
          categoryLabel: 'Teilbereich',
          label: subTitle,
          mode: 'include',
        });
      }

      // 4. Anforderungs-Drilldown
      if (filters.value.controlFilter) {
        const ctrl = activeCatalog.value?.controlMap.get(filters.value.controlFilter);
        chips.push({
          key: 'controlFilter',
          type: 'control',
          category: 'control',
          categoryLabel: 'Anforderung',
          label: ctrl ? `${ctrl.id} ${ctrl.title}` : filters.value.controlFilter,
          mode: 'include',
        });
      }

      return chips;
    });

    const hasActiveFilters = computed(() => allActiveChips.value.length > 0);

    // Selected Control
    const selectedControl = computed(() => {
      if (!activeCatalog.value || !selectedControlId.value) return null;
      return activeCatalog.value.controlMap.get(selectedControlId.value) || null;
    });

    // Parent Control (if selectedControl is a subcontrol)
    const parentControl = computed(() => {
      if (!activeCatalog.value || !selectedControl.value?.parentControlId) return null;
      return activeCatalog.value.controlMap.get(selectedControl.value.parentControlId) || null;
    });

    // Praktik bzw. Teilbereich der aktiven Detail-Ebene
    const scopePractice = computed(() => {
      const scope = detailScope.value;
      if (!scope || !activeCatalog.value) return null;
      if (scope.level === 'practice') return activeCatalog.value.practices.find((p) => p.id === scope.id) || null;
      return activeCatalog.value.practices.find((p) => p.subgroups.some((sg) => sg.id === scope.id)) || null;
    });

    const scopeSubgroup = computed(() => {
      if (detailScope.value?.level !== 'subgroup' || !scopePractice.value) return null;
      return scopePractice.value.subgroups.find((sg) => sg.id === detailScope.value.id) || null;
    });

    const scopeStats = computed(() => {
      if (scopeSubgroup.value) return summarizeControls(flattenControls(scopeSubgroup.value.controls));
      if (scopePractice.value) return summarizeControls(scopePractice.value.controls);
      return null;
    });

    // Anforderungen, die direkt an der Praktik hängen (ohne Teilbereich)
    const scopeDirectControls = computed(() => {
      if (!scopePractice.value || scopeSubgroup.value) return [];
      return scopePractice.value.controls.filter((c) => !c.subgroupId && !c.parentControlId);
    });

    // Example controls with threats for quick jumping
    const exampleControlsWithThreats = computed(() => {
      if (!activeCatalog.value) return [];
      const candidateIds = ['ARCH.1.1', 'ARCH.2.2', 'UMS.1.1', 'ASST.1.1', 'CON.1.1', 'OPS.1.1'];
      return candidateIds
        .map((id) => activeCatalog.value.controlMap.get(id))
        .filter((c) => c && c.elementareGefaehrdungen.length > 0);
    });

    // Base Control for Diff Comparison in Detail View
    const baseControlForDiff = computed(() => {
      if (!comparisonCatalog.value || !selectedControlId.value) return null;
      return comparisonCatalog.value.controlMap.get(selectedControlId.value) || null;
    });

    // Word diffs
    const statementDiffTokens = computed(() => {
      if (!diffSummary.value?.hasDiff || !selectedControl.value) return [];
      const oldText = baseControlForDiff.value?.statementProse || '';
      const newText = selectedControl.value.statementProse || '';
      return computeWordDiff(oldText, newText);
    });

    const guidanceDiffTokens = computed(() => {
      if (!diffSummary.value?.hasDiff || !selectedControl.value) return [];
      const oldText = baseControlForDiff.value?.guidanceProse || '';
      const newText = selectedControl.value.guidanceProse || '';
      return computeWordDiff(oldText, newText);
    });

    // Reihenfolge der sichtbaren Einträge (für Pfeiltasten-Navigation)
    const visibleOrder = computed(() => {
      const order = [];
      if (!activeCatalog.value) return order;
      const ids = filteredControlIds.value;
      const keys = expandedKeys.value;
      for (const p of activeCatalog.value.practices) {
        if (!keys.has(`p_${p.id}`)) continue;
        for (const sub of p.subgroups) {
          if (!keys.has(`sub_${sub.id}`)) continue;
          for (const ctrl of sub.controls) {
            if (!isControlVisible(ctrl)) continue;
            order.push(ctrl.id);
            if (ctrl.subcontrols?.length && keys.has(`ctrl_${ctrl.id}`)) {
              for (const sc of ctrl.subcontrols) {
                if (ids.has(sc.id)) order.push(sc.id);
              }
            }
          }
        }
      }
      return order;
    });

    // State Persistence Helpers
    const isRestoringState = ref(true);

    let saveFilterTimeout = null;
    function scheduleSaveFilters() {
      if (isRestoringState.value) return;
      clearTimeout(saveFilterTimeout);
      saveFilterTimeout = setTimeout(async () => {
        try {
          await saveSetting('saved_filter_state', {
            filters: {
              searchQuery: filters.value.searchQuery,
              subgroupFilter: filters.value.subgroupFilter,
              controlFilter: filters.value.controlFilter,
            },
            // Reaktive Proxys lassen sich nicht in IndexedDB klonen → einfache Kopien speichern
            activeTags: activeTags.value.map((t) => ({ ...t })),
            threatRailSearch: threatRailSearch.value,
            threatShowOnlyMatching: threatShowOnlyMatching.value,
            threatShowAll: threatShowAll.value,
          });
        } catch (err) {
          console.warn('Fehler beim Speichern der Filter:', err);
        }
      }, 150);
    }

    let saveCollapseTimeout = null;
    function scheduleSaveCollapse() {
      if (isRestoringState.value) return;
      clearTimeout(saveCollapseTimeout);
      saveCollapseTimeout = setTimeout(async () => {
        try {
          await saveSetting('saved_collapse_state', {
            railCollapsed: { ...railCollapsed.value },
            expandedKeys: Array.from(expandedKeys.value),
            selectedControlId: selectedControlId.value,
          });
        } catch (err) {
          console.warn('Fehler beim Speichern der Einklappsituation:', err);
        }
      }, 150);
    }

    // Watch filters to auto-expand groups with matches
    watch(
      () => filteredControlIds.value,
      (newIds) => {
        if (isRestoringState.value) return;
        if (newIds && newIds.size > 0 && activeCatalog.value && hasActiveFilters.value) {
          let keysChanged = false;
          for (const p of activeCatalog.value.practices) {
            let hasPracticeMatch = false;
            for (const sub of p.subgroups) {
              let hasSubMatch = false;
              for (const ctrl of sub.controls) {
                const ctrlMatch = newIds.has(ctrl.id);
                const subCtrlMatch = ctrl.subcontrols?.some((sc) => newIds.has(sc.id));
                if (subCtrlMatch) {
                  if (!expandedKeys.value.has(`ctrl_${ctrl.id}`)) {
                    expandedKeys.value.add(`ctrl_${ctrl.id}`);
                    keysChanged = true;
                  }
                  hasSubMatch = true;
                }
                if (ctrlMatch || subCtrlMatch) {
                  hasSubMatch = true;
                }
              }
              if (hasSubMatch) {
                if (!expandedKeys.value.has(`sub_${sub.id}`)) {
                  expandedKeys.value.add(`sub_${sub.id}`);
                  keysChanged = true;
                }
                hasPracticeMatch = true;
              }
            }
            if (hasPracticeMatch) {
              if (!expandedKeys.value.has(`p_${p.id}`)) {
                expandedKeys.value.add(`p_${p.id}`);
                keysChanged = true;
              }
            }
          }
          if (keysChanged) {
            expandedKeys.value = new Set(expandedKeys.value);
            scheduleSaveCollapse();
          }
        }
      }
    );

    // Filter-Änderungen automatisch persistieren
    watch(
      () => [
        filters.value.searchQuery,
        filters.value.subgroupFilter,
        filters.value.controlFilter,
        activeTags.value,
        threatRailSearch.value,
        threatShowOnlyMatching.value,
        threatShowAll.value,
      ],
      () => {
        scheduleSaveFilters();
      },
      { deep: true }
    );

    // Einklapp-Zustände der Rail-Sektionen & Auswahl automatisch persistieren
    watch(
      () => [
        railCollapsed.value.modalVerbs,
        railCollapsed.value.secLevels,
        railCollapsed.value.practices,
        railCollapsed.value.threats,
        railCollapsed.value.diffs,
        railCollapsed.value.effort,
        railCollapsed.value.actionWords,
        railCollapsed.value.documentation,
        railCollapsed.value.securityTargets,
        selectedControlId.value,
      ],
      () => {
        scheduleSaveCollapse();
      }
    );

    // Reset subgroup & control filter when user selects a different practice or resets practice filter
    watch(
      () => activeTags.value,
      () => {
        const incPractices = activeFilterSpec.value.inc.practice;
        if (incPractices.size === 1) {
          const onlyP = Array.from(incPractices)[0];
          if (filters.value.subgroupFilter && !filters.value.subgroupFilter.startsWith(onlyP + '.')) {
            filters.value.subgroupFilter = '';
          }
          if (filters.value.controlFilter && !filters.value.controlFilter.startsWith(onlyP + '.')) {
            filters.value.controlFilter = '';
          }
        }
      },
      { deep: true }
    );

    watch(
      () => filters.value.subgroupFilter,
      (newSub) => {
        if (filters.value.controlFilter && newSub && !filters.value.controlFilter.startsWith(newSub + '.')) {
          filters.value.controlFilter = '';
        }
      }
    );

    async function restorePersistedState() {
      try {
        const [savedFilterState, savedCollapseState] = await Promise.all([
          getSetting('saved_filter_state'),
          getSetting('saved_collapse_state'),
        ]);

        if (savedFilterState) {
          if (savedFilterState.filters) {
            filters.value.searchQuery = savedFilterState.filters.searchQuery || '';
            filters.value.subgroupFilter = savedFilterState.filters.subgroupFilter || '';
            filters.value.controlFilter = savedFilterState.filters.controlFilter || '';
          }
          if (Array.isArray(savedFilterState.activeTags)) {
            activeTags.value = savedFilterState.activeTags;
          }
          if (typeof savedFilterState.threatRailSearch === 'string') {
            threatRailSearch.value = savedFilterState.threatRailSearch;
          }
          if (typeof savedFilterState.threatShowOnlyMatching === 'boolean') {
            threatShowOnlyMatching.value = savedFilterState.threatShowOnlyMatching;
          }
          if (typeof savedFilterState.threatShowAll === 'boolean') {
            threatShowAll.value = savedFilterState.threatShowAll;
          }
        }

        if (savedCollapseState) {
          if (savedCollapseState.railCollapsed) {
            railCollapsed.value = {
              ...railCollapsed.value,
              ...savedCollapseState.railCollapsed,
            };
          }
          if (Array.isArray(savedCollapseState.expandedKeys)) {
            expandedKeys.value = new Set(savedCollapseState.expandedKeys);
          }
          if (savedCollapseState.selectedControlId) {
            selectedControlId.value = savedCollapseState.selectedControlId;
          }
        }

        return { savedFilterState, savedCollapseState };
      } catch (err) {
        console.warn('Fehler beim Wiederherstellen der Filter/Einklapp-Zustände:', err);
        return null;
      }
    }

    // Lifecycle Mount
    onMounted(async () => {
      window.addEventListener('keydown', handleGlobalKeydown);
      const savedDark = await getSetting(
        'dark_mode',
        window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
      );
      isDarkMode.value = Boolean(savedDark);
      applyDarkMode(isDarkMode.value);

      // BSI-Namespaces vor dem Katalog laden (Gefährdungsbezeichnungen werden beim Parsen benötigt)
      await loadNamespaces();
      namespacesVersion.value++;

      await refreshStoredCatalogs();

      const restored = await restorePersistedState();
      const hasSavedCollapse = Boolean(restored?.savedCollapseState && Array.isArray(restored.savedCollapseState.expandedKeys));

      const lastActiveId = await getSetting('last_active_catalog_id');
      if (lastActiveId && storedCatalogs.value.some((c) => c.id === lastActiveId)) {
        await loadCatalogById(lastActiveId, !hasSavedCollapse);
      } else if (storedCatalogs.value.length > 0) {
        await loadCatalogById(storedCatalogs.value[0].id, !hasSavedCollapse);
      } else {
        // Auto-load bundle on very first visit so SPA works immediately!
        await loadOfficialBundle();
      }

      if (activeCatalog.value && activeCatalog.value.allControls.length > 0) {
        if (!selectedControlId.value || !activeCatalog.value.controlMap.has(selectedControlId.value)) {
          selectedControlId.value = activeCatalog.value.allControls[0].id;
        }
      }

      scrollSelectedIntoView();

      isLoadingInitial.value = false;

      setTimeout(() => {
        isRestoringState.value = false;
      }, 200);
    });

    onBeforeUnmount(() => {
      window.removeEventListener('keydown', handleGlobalKeydown);
    });

    function handleGlobalKeydown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInput.value?.focus();
        searchInput.value?.select();
        return;
      }
      if (e.key === 'Escape') {
        if (isImportModalOpen.value) isImportModalOpen.value = false;
        else if (isVersionsModalOpen.value) isVersionsModalOpen.value = false;
        else if (isImpressumModalOpen.value) isImpressumModalOpen.value = false;
        else if (isDatenschutzModalOpen.value) isDatenschutzModalOpen.value = false;
        return;
      }
      if (isImportModalOpen.value || isVersionsModalOpen.value || isImpressumModalOpen.value || isDatenschutzModalOpen.value) return;
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if (e.key === '/') {
        e.preventDefault();
        searchInput.value?.focus();
      } else if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        stepSelection(1);
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        stepSelection(-1);
      }
    }

    function stepSelection(delta) {
      const order = visibleOrder.value;
      if (order.length === 0) return;
      // Aus einer Ebenen-Übersicht heraus: bei der ersten bzw. letzten Anforderung dieser Ebene einsteigen
      if (detailScope.value && scopePractice.value) {
        const inScope = order.filter((id) => {
          const c = activeCatalog.value.controlMap.get(id);
          return scopeSubgroup.value ? c?.subgroupId === scopeSubgroup.value.id : c?.groupId === scopePractice.value.id;
        });
        if (inScope.length) {
          selectControlById(delta > 0 ? inScope[0] : inScope[inScope.length - 1]);
          return;
        }
      }
      const idx = order.indexOf(selectedControlId.value);
      const next =
        idx === -1 ? (delta > 0 ? 0 : order.length - 1) : Math.max(0, Math.min(order.length - 1, idx + delta));
      selectControlById(order[next]);
    }

    function scrollSelectedIntoView() {
      nextTick(() => {
        const el = listScroll.value?.querySelector(`[data-ctrl-id="${CSS.escape(selectedControlId.value)}"]`);
        el?.scrollIntoView({ block: 'nearest' });
        if (detailBody.value) detailBody.value.scrollTop = 0;
      });
    }

    function applyDarkMode(val) {
      if (val) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }

    function toggleDarkMode() {
      isDarkMode.value = !isDarkMode.value;
      applyDarkMode(isDarkMode.value);
      saveSetting('dark_mode', isDarkMode.value);
    }

    async function refreshStoredCatalogs() {
      storedCatalogs.value = await getAllCatalogRecords();
    }

    // Nach dem Laden neuer Daten: Filter zurücksetzen, Filter-Abschnitte und Explorer einklappen
    function resetViewForNewData() {
      resetFilters();
      collapseAllRail();
      collapseAll();
      detailScope.value = null;
    }

    // resetView: Ansicht für neue Daten zurücksetzen (siehe resetViewForNewData)
    async function loadCatalogById(id, resetView = true) {
      const record = await getCatalogRecord(id);
      if (!record) return;

      activeRecordId.value = id;
      await saveSetting('last_active_catalog_id', id);

      const parsed = parseOscalCatalog(record.catalogData);
      activeCatalog.value = parsed;

      if (comparisonCatalog.value) {
        diffSummary.value = compareCatalogs(comparisonCatalog.value, activeCatalog.value);
      }

      if (parsed.allControls.length > 0) {
        if (!selectedControlId.value || !parsed.controlMap.has(selectedControlId.value)) {
          selectedControlId.value = parsed.allControls[0].id;
        }
      }

      if (resetView) {
        resetViewForNewData();
      }
    }

    // 1-Click Loader für den offiziellen Katalog
    async function loadOfficialBundle() {
      isLoadingBundle.value = true;
      try {
        // Katalog laden (GitHub, sonst lokale Kopie)
        let catData = null;
        try {
          const res = await fetch(PRESET_CATALOG_URL);
          if (res.ok) catData = await res.json();
        } catch {}
        if (!catData) {
          const res = await fetch('data/Grundschutz++-resolved_catalog.json');
          catData = await res.json();
        }

        const catObj = catData.catalog || catData;
        const catTitle = catObj.metadata?.title || 'Anwenderkatalog Grundschutz++';
        const catVersion = catObj.metadata?.version || catObj.metadata?.['last-modified'] || '';
        const newId = crypto.randomUUID();

        const record = {
          id: newId,
          title: catTitle,
          version: catVersion,
          sourceType: 'preset',
          sourceName: 'BSI Stand-der-Technik-Bibliothek (Offizieller Bund-Katalog)',
          importedAt: new Date().toISOString(),
          catalogData: catData,
        };

        await saveCatalogRecord(record);
        await refreshStoredCatalogs();
        await loadCatalogById(newId);
      } catch (err) {
        console.error('Error loading official bundle:', err);
        alert('Fehler beim Laden des offiziellen Pakets: ' + err.message);
      } finally {
        isLoadingBundle.value = false;
      }
    }

    // Fetch per URL (used in import modal)
    async function fetchFromUrl(targetUrl, presetName = '', fallbackLocalUrl = '') {
      importError.value = '';
      importSuccess.value = '';
      importLoading.value = true;

      try {
        let res;
        try {
          res = await fetch(targetUrl, {
            headers: { Accept: 'application/json' },
          });
          if (!res.ok && fallbackLocalUrl) {
            throw new Error(`Remote HTTP ${res.status}`);
          }
        } catch (networkErr) {
          if (fallbackLocalUrl) {
            res = await fetch(fallbackLocalUrl, {
              headers: { Accept: 'application/json' },
            });
          } else {
            throw networkErr;
          }
        }

        if (!res.ok) {
          throw new Error(`HTTP-Fehler ${res.status}: ${res.statusText}`);
        }

        const jsonData = await res.json();
        await processImportedJson(jsonData, 'url', presetName || targetUrl);
      } catch (err) {
        console.error('Fetch error:', err);
        importError.value = `Fehler beim Abrufen der URL: ${err.message || err}. (Prüfen Sie ggf. die Internetverbindung oder nutzen Sie den Datei-Upload).`;
      } finally {
        importLoading.value = false;
      }
    }

    function handleCustomUrlFetch() {
      if (!importUrlInput.value.trim()) {
        importError.value = 'Bitte geben Sie eine gültige URL ein.';
        return;
      }
      fetchFromUrl(importUrlInput.value.trim());
    }

    function handleFileUpload(e) {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      readFile(files[0]);
    }

    function handleFileDrop(e) {
      e.preventDefault();
      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) return;
      readFile(files[0]);
    }

    function readFile(file) {
      importError.value = '';
      importSuccess.value = '';
      importLoading.value = true;

      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const text = evt.target.result;
          const jsonData = JSON.parse(text);
          await processImportedJson(jsonData, 'upload', file.name);
        } catch (err) {
          console.error('JSON parse error:', err);
          importError.value = `Die Datei konnte nicht als JSON geparst werden: ${err.message}`;
          importLoading.value = false;
        }
      };
      reader.onerror = () => {
        importError.value = 'Fehler beim Lesen der Datei.';
        importLoading.value = false;
      };
      reader.readAsText(file);
    }

    async function processImportedJson(jsonData, sourceType, sourceName) {
      const isCatalog = Boolean(
        jsonData?.catalog ||
        (jsonData?.groups && jsonData?.controls) ||
        jsonData?.metadata?.title
      );

      if (!isCatalog) {
        importError.value =
          'Die Datei enthält keinen gültigen OSCAL-Katalog ("catalog"). Keine BSI-kompatible Struktur gefunden.';
        importLoading.value = false;
        return;
      }

      // Catalog
      const catObj = jsonData.catalog || jsonData;
      const catTitle = catObj.metadata?.title || sourceName;
      const catVersion = catObj.metadata?.version || catObj.metadata?.['last-modified'] || '';
      const newId = crypto.randomUUID();

      const record = {
        id: newId,
        title: catTitle,
        version: catVersion,
        sourceType,
        sourceName,
        importedAt: new Date().toISOString(),
        catalogData: jsonData,
      };

      await saveCatalogRecord(record);
      await refreshStoredCatalogs();

      if (importIsDiff.value && activeCatalog.value) {
        comparisonRecordId.value = newId;
        const parsedNew = parseOscalCatalog(jsonData);
        diffSummary.value = compareCatalogs(activeCatalog.value, parsedNew);
        comparisonCatalog.value = activeCatalog.value;
        activeCatalog.value = parsedNew;
        activeRecordId.value = newId;
        resetViewForNewData();
        importSuccess.value = `Vergleichsversion geladen. Differenzanalyse aktiv!`;
      } else {
        await loadCatalogById(newId);
        importSuccess.value = `OSCAL-Katalog erfolgreich importiert (${sourceName})`;
      }

      setTimeout(() => {
        isImportModalOpen.value = false;
      }, 600);
    }

    function selectControl(ctrl) {
      if (!ctrl) return;
      detailScope.value = null;
      selectedControlId.value = ctrl.id;

      let changedKeys = false;
      // Auto-expand control if it has subcontrols so they are immediately visible
      if (ctrl.subcontrols && ctrl.subcontrols.length > 0) {
        if (!expandedKeys.value.has('ctrl_' + ctrl.id)) {
          expandedKeys.value.add('ctrl_' + ctrl.id);
          changedKeys = true;
        }
      }
      // If this is a subcontrol, ensure parent is expanded
      if (ctrl.parentControlId) {
        if (!expandedKeys.value.has('ctrl_' + ctrl.parentControlId)) {
          expandedKeys.value.add('ctrl_' + ctrl.parentControlId);
          changedKeys = true;
        }
      }
      if (ctrl.subgroupId) {
        if (!expandedKeys.value.has('sub_' + ctrl.subgroupId)) {
          expandedKeys.value.add('sub_' + ctrl.subgroupId);
          changedKeys = true;
        }
      }
      if (ctrl.groupId) {
        if (!expandedKeys.value.has('p_' + ctrl.groupId)) {
          expandedKeys.value.add('p_' + ctrl.groupId);
          changedKeys = true;
        }
      }
      if (changedKeys) {
        expandedKeys.value = new Set(expandedKeys.value);
      }
      scheduleSaveCollapse();
      scrollSelectedIntoView();
    }

    function selectControlById(id) {
      if (!activeCatalog.value || !id) return;
      const ctrl = activeCatalog.value.controlMap.get(id);
      if (ctrl) {
        selectControl(ctrl);
      }
    }

    function toggleControlExpand(ctrlId, event) {
      if (event) event.stopPropagation();
      const key = 'ctrl_' + ctrlId;
      if (expandedKeys.value.has(key)) {
        expandedKeys.value.delete(key);
      } else {
        expandedKeys.value.add(key);
      }
      expandedKeys.value = new Set(expandedKeys.value);
      scheduleSaveCollapse();
    }

    function getTagMode(category, value) {
      const t = activeTags.value.find((tag) => tag.category === category && tag.value === value);
      return t ? t.mode : null;
    }

    function isTagActive(category, value, mode = null) {
      const t = activeTags.value.find((tag) => tag.category === category && tag.value === value);
      if (!t) return false;
      if (!mode) return true;
      return t.mode === mode;
    }

    function setTag(category, value, mode = 'include', label = '', categoryLabel = '') {
      const key = `${category}:${value}`;
      const idx = activeTags.value.findIndex((t) => t.category === category && t.value === value);
      if (idx >= 0) {
        activeTags.value[idx].mode = mode;
        if (label) activeTags.value[idx].label = label;
        if (categoryLabel) activeTags.value[idx].categoryLabel = categoryLabel;
      } else {
        activeTags.value.push({
          key,
          category,
          value,
          mode,
          label: label || value,
          categoryLabel: categoryLabel || category,
        });
      }
    }

    function toggleTag(category, value, targetMode = 'include', label = '', categoryLabel = '') {
      const key = `${category}:${value}`;
      const idx = activeTags.value.findIndex((t) => t.category === category && t.value === value);
      if (idx >= 0) {
        const current = activeTags.value[idx];
        if (current.mode === targetMode) {
          activeTags.value.splice(idx, 1);
          if (category === 'threat' && !hasCategoryInclude('threat')) threatShowAll.value = false;
          return;
        } else {
          current.mode = targetMode;
          return;
        }
      }

      // Wenn 'include' (Nur) in einer Einzelauswahl-Kategorie gewählt wird, eventuell vorhandene andere Includes ablösen
      if (targetMode === 'include' && ['modalVerb', 'practice', 'diff', ...Object.keys(VALUE_FACETS)].includes(category)) {
        activeTags.value = activeTags.value.filter((t) => !(t.category === category && t.mode === 'include'));
      }

      activeTags.value.push({
        key,
        category,
        value,
        mode: targetMode,
        label: label || value,
        categoryLabel: categoryLabel || category,
      });
    }

    function hasCategoryInclude(category) {
      return activeTags.value.some((t) => t.category === category && t.mode === 'include');
    }

    function removeTag(category, value) {
      const idx = activeTags.value.findIndex((t) => t.category === category && t.value === value);
      if (idx >= 0) {
        activeTags.value.splice(idx, 1);
      }
      if (category === 'threat' && !hasCategoryInclude('threat')) {
        threatShowAll.value = false;
      }
    }

    function toggleTagMode(tag) {
      tag.mode = tag.mode === 'include' ? 'exclude' : 'include';
    }

    function clearTagsForCategory(category) {
      activeTags.value = activeTags.value.filter((t) => t.category !== category);
      if (category === 'threat') threatShowAll.value = false;
    }

    function activeTagCountFor(category) {
      return activeTags.value.filter((t) => t.category === category).length;
    }

    function removeChip(chip) {
      if (chip.type === 'search') {
        filters.value.searchQuery = '';
      } else if (chip.type === 'subgroup') {
        filters.value.subgroupFilter = '';
      } else if (chip.type === 'control') {
        filters.value.controlFilter = '';
      } else if (chip.type === 'facet') {
        removeTag(chip.category, chip.value);
      }
    }

    function toggleChipMode(chip) {
      if (chip.type === 'facet') {
        toggleTagMode(chip);
      }
    }

    function filterByThreat(threatText) {
      const { code } = splitThreat(threatText);
      if (!code) return;
      const title = namespaceEntry('basethreats', code)?.Begriff || splitThreat(threatText).title || code;
      const label = `${code} ${title}`.trim();
      toggleTag('threat', code, 'include', label, 'Gefährdung');
      scrollSelectedIntoView();
    }

    function toggleDiffFilter(status, targetMode = 'include') {
      const labelMap = { all_diffs: 'Alle Änderungen', added: 'Neu', modified: 'Geändert', deleted: 'Gelöscht' };
      const label = labelMap[status] || status;
      toggleTag('diff', status, targetMode, label, 'Status');
    }

    function resetFilters() {
      filters.value.searchQuery = '';
      filters.value.subgroupFilter = '';
      filters.value.controlFilter = '';
      activeTags.value = [];
      threatShowAll.value = false;
      scheduleSaveFilters();
    }

    // Breadcrumb-Navigation: wechselt nur die Detailansicht auf die gewählte Ebene, setzt keine Filter
    function navigateToPractice(groupId) {
      if (!groupId) return;
      detailScope.value = { level: 'practice', id: groupId };
      expandedKeys.value.add('p_' + groupId);
      expandedKeys.value = new Set(expandedKeys.value);
      scheduleSaveCollapse();
      scrollPracticeIntoView(groupId);
      resetDetailScroll();
    }

    function navigateToSubgroup(subgroupId, groupId) {
      if (!subgroupId) return;
      detailScope.value = { level: 'subgroup', id: subgroupId };
      if (groupId) expandedKeys.value.add('p_' + groupId);
      expandedKeys.value.add('sub_' + subgroupId);
      expandedKeys.value = new Set(expandedKeys.value);
      scheduleSaveCollapse();
      scrollSubgroupIntoView(subgroupId);
      resetDetailScroll();
    }

    // Klick auf Praktik/Teilbereich im Explorer: Übersicht öffnen; ist sie bereits offen, auf-/zuklappen
    function onPracticeHeadClick(groupId) {
      if (detailScope.value?.level === 'practice' && detailScope.value.id === groupId) toggleGroup('p_' + groupId);
      else navigateToPractice(groupId);
    }

    function onSubgroupHeadClick(subgroupId, groupId) {
      if (detailScope.value?.level === 'subgroup' && detailScope.value.id === subgroupId) toggleGroup('sub_' + subgroupId);
      else navigateToSubgroup(subgroupId, groupId);
    }

    function resetDetailScroll() {
      nextTick(() => {
        if (detailBody.value) detailBody.value.scrollTop = 0;
      });
    }

    // Kennzahlen für eine Menge von Anforderungen (inkl. Unteranforderungen)
    function summarizeControls(controls) {
      const stats = { total: 0, main: 0, sub: 0, muss: 0, sollte: 0, kann: 0, added: 0, modified: 0, deleted: 0 };
      for (const c of controls) {
        stats.total++;
        if (c.parentControlId) stats.sub++;
        else stats.main++;
        const v = verbKey(c.modalVerb);
        if (v) stats[v]++;
        const s = c.diff?.status;
        if (s === 'added' || s === 'modified' || s === 'deleted') stats[s]++;
      }
      return stats;
    }

    function flattenControls(controls) {
      const out = [];
      const walk = (list) => {
        for (const c of list) {
          out.push(c);
          if (c.subcontrols?.length) walk(c.subcontrols);
        }
      };
      walk(controls);
      return out;
    }

    function controlBreadcrumbLabel(ctrl) {
      if (!ctrl) return '';
      const id = ctrl.id || '';
      const title = ctrl.title || '';
      if (!id) return title;
      if (title.startsWith(id)) return title;
      return `${id} ${title}`.trim();
    }

    function practiceBreadcrumbLabel(ctrl) {
      if (!ctrl) return '';
      const id = ctrl.groupId || '';
      const title = ctrl.groupTitle || '';
      if (!id) return title;
      if (title.startsWith(id)) return title;
      return `${id} ${title}`.trim();
    }

    function subgroupBreadcrumbLabel(ctrl) {
      if (!ctrl) return '';
      const subId = ctrl.subgroupId || '';
      const title = ctrl.subgroupTitle || '';
      if (!subId) return title;
      if (title.startsWith(subId)) return title;
      return `${subId} ${title}`.trim();
    }

    function scrollPracticeIntoView(practiceId) {
      nextTick(() => {
        const el = listScroll.value?.querySelector(`[data-practice-id="${CSS.escape(practiceId)}"]`);
        el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      });
    }

    function scrollSubgroupIntoView(subgroupId) {
      nextTick(() => {
        const el = listScroll.value?.querySelector(`[data-sub-id="${CSS.escape(subgroupId)}"]`);
        el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      });
    }

    function toggleGroup(key) {
      if (expandedKeys.value.has(key)) {
        expandedKeys.value.delete(key);
      } else {
        expandedKeys.value.add(key);
      }
      expandedKeys.value = new Set(expandedKeys.value);
      scheduleSaveCollapse();
    }

    function expandAll() {
      if (!activeCatalog.value) return;
      const s = new Set();
      for (const p of activeCatalog.value.practices) {
        s.add(`p_${p.id}`);
        for (const sub of p.subgroups) {
          s.add(`sub_${sub.id}`);
          for (const c of sub.controls) {
            if (c.subcontrols && c.subcontrols.length > 0) {
              s.add(`ctrl_${c.id}`);
            }
          }
        }
      }
      expandedKeys.value = s;
      scheduleSaveCollapse();
    }

    function collapseAll() {
      expandedKeys.value = new Set();
      scheduleSaveCollapse();
    }

    function expandAllRail() {
      for (const k of Object.keys(railCollapsed.value)) {
        railCollapsed.value[k] = false;
      }
      scheduleSaveCollapse();
    }

    function collapseAllRail() {
      for (const k of Object.keys(railCollapsed.value)) {
        railCollapsed.value[k] = true;
      }
      scheduleSaveCollapse();
    }

    function countMatchingControlsInPractice(p) {
      return p.controls.filter((c) => filteredControlIds.value.has(c.id)).length;
    }

    function countMatchingControlsInSubgroup(sub) {
      let count = 0;
      for (const c of sub.controls) {
        if (filteredControlIds.value.has(c.id)) count++;
        if (c.subcontrols) {
          for (const sc of c.subcontrols) {
            if (filteredControlIds.value.has(sc.id)) count++;
          }
        }
      }
      return count;
    }

    function isControlVisible(ctrl) {
      if (filteredControlIds.value.has(ctrl.id)) return true;
      if (ctrl.subcontrols && ctrl.subcontrols.some((sc) => filteredControlIds.value.has(sc.id))) {
        return true;
      }
      return false;
    }

    // Comparison actions in Versions Modal
    async function selectComparison(id) {
      const record = await getCatalogRecord(id);
      if (!record || !activeCatalog.value) return;

      comparisonRecordId.value = id;
      const parsedComp = parseOscalCatalog(record.catalogData);
      comparisonCatalog.value = parsedComp;

      diffSummary.value = compareCatalogs(parsedComp, activeCatalog.value);
    }

    function clearComparison() {
      if (detailActiveTab.value === 'diff') detailActiveTab.value = 'overview';
      comparisonRecordId.value = '';
      comparisonCatalog.value = null;
      diffSummary.value = null;

      if (activeRecordId.value) {
        // gleicher Katalog, nur der Vergleich endet: Aufklapp-Zustand beibehalten
        loadCatalogById(activeRecordId.value, false);
      }
    }

    async function deleteCatalog(id) {
      await deleteCatalogRecord(id);
      await refreshStoredCatalogs();

      if (activeRecordId.value === id) {
        activeCatalog.value = null;
        activeRecordId.value = '';
        selectedControlId.value = '';
        if (storedCatalogs.value.length > 0) {
          await loadCatalogById(storedCatalogs.value[0].id);
        }
      }
      if (comparisonRecordId.value === id) {
        clearComparison();
      }
    }

    async function clearAll() {
      if (confirm('Möchten Sie wirklich alle lokal gespeicherten Kataloge löschen?')) {
        await clearAllData();
        activeCatalog.value = null;
        activeRecordId.value = '';
        comparisonCatalog.value = null;
        comparisonRecordId.value = '';
        diffSummary.value = null;
        selectedControlId.value = '';
        expandedKeys.value = new Set();
        resetFilters();
        await refreshStoredCatalogs();
        isVersionsModalOpen.value = false;
      }
    }

    // Resizer: Breite der Detailsicht in % des Split-Bereichs
    function startResize() {
      const container = splitEl.value;
      if (!container) return;
      isResizing.value = true;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      const handleMouseMove = (ev) => {
        const rect = container.getBoundingClientRect();
        const pct = ((rect.right - ev.clientX) / rect.width) * 100;
        detailPaneWidth.value = Math.round(Math.max(28, Math.min(70, pct)) * 10) / 10;
      };
      const stopResize = () => {
        isResizing.value = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', stopResize);
      };
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', stopResize);
    }

    function formatDate(isoStr) {
      try {
        const d = new Date(isoStr);
        return d.toLocaleString('de-DE', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      } catch {
        return isoStr;
      }
    }

    function escapeHtml(str) {
      const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
      return str.replace(/[&<>"']/g, (ch) => entities[ch]);
    }

    function verbKey(modalVerb) {
      return ['MUSS', 'SOLLTE', 'KANN'].includes(modalVerb) ? modalVerb.toLowerCase() : '';
    }

    function diffLabel(status, long = false) {
      if (status === 'added') return long ? 'Neu hinzugefügt' : 'Neu';
      if (status === 'modified') return 'Geändert';
      if (status === 'deleted') return 'Gelöscht';
      return '';
    }

    // Versionskennungen, die ein ISO-Zeitstempel sind, als Datum darstellen
    function formatVersion(version) {
      if (!version) return '';
      if (!/^\d{4}-\d{2}-\d{2}T/.test(version)) return version;
      const d = new Date(version);
      return isNaN(d) ? version : 'Stand ' + d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }

    function highlightProse(prose = '', modalVerb = '') {
      if (!prose) return '';
      const safe = escapeHtml(prose);
      const key = verbKey(modalVerb);
      if (!key) return safe;
      return safe.replace(new RegExp(`\\b(${modalVerb})\\b`, 'g'), `<mark class="${key}">$1</mark>`);
    }

    function splitThreat(threatStr) {
      if (!threatStr) return { code: '', title: '' };
      if (threatStr.includes(':')) {
        const parts = threatStr.split(':');
        return {
          code: parts[0].trim(),
          title: parts.slice(1).join(':').trim(),
        };
      }
      return { code: threatStr.trim(), title: '' };
    }

    return {
      activeCatalog,
      activeRecordId,
      comparisonCatalog,
      comparisonRecordId,
      diffSummary,
      storedCatalogs,
      selectedControlId,
      selectedControl,
      parentControl,
      exampleControlsWithThreats,
      baseControlForDiff,
      statementDiffTokens,
      guidanceDiffTokens,

      // UI
      isImportModalOpen,
      isVersionsModalOpen,
      isImpressumModalOpen,
      isDatenschutzModalOpen,
      isDarkMode,
      isLoadingInitial,
      isLoadingBundle,
      detailPaneWidth,
      isResizing,
      isDragOver,
      detailActiveTab,
      searchInput,
      splitEl,
      listScroll,
      detailBody,
      expandedKeys,

      // Import Modal
      importModalTab,
      importUrlInput,
      importIsDiff,
      importLoading,
      importError,
      importSuccess,
      PRESET_CATALOG_URL,

      // Filters & Tags
      filters,
      activeTags,
      practiceOptions,
      availableSecLevels,
      practiceCounts,
      modalVerbCounts,
      secLevelCounts,
      facetCounts,
      facetOptions,
      facetOptionsFiltered,
      facetSearch,
      maxEffort,
      hasEffort,
      effortColor,
      effortDefinition,
      openDefs,
      SECURITY_TARGETS,
      hasSecurityTargets,
      centralSecurityTargets,
      securityTargetLevelLabel,
      securityTargetChipLabel,
      definition,
      namespaceEntry,
      shortDefinition,
      threatCounts,
      diffCounts,
      displayedThreatOptions,
      threatRailSearch,
      threatShowOnlyMatching,
      threatsWithMatchesCount,
      railCollapsed,
      filteredControlIds,
      allActiveChips,
      hasActiveFilters,

      // Tag Helpers
      getTagMode,
      isTagActive,
      hasCategoryInclude,
      threatShowAll,
      setTag,
      toggleTag,
      removeTag,
      toggleTagMode,
      clearTagsForCategory,
      activeTagCountFor,
      removeChip,
      toggleChipMode,

      // Actions
      applyDarkMode,
      toggleDarkMode,
      loadCatalogById,
      loadOfficialBundle,
      fetchFromUrl,
      handleCustomUrlFetch,
      handleFileUpload,
      handleFileDrop,
      selectControl,
      selectControlById,
      navigateToPractice,
      navigateToSubgroup,
      onPracticeHeadClick,
      onSubgroupHeadClick,
      detailScope,
      scopePractice,
      scopeSubgroup,
      scopeStats,
      scopeDirectControls,
      summarizeControls,
      flattenControls,
      practiceBreadcrumbLabel,
      subgroupBreadcrumbLabel,
      controlBreadcrumbLabel,
      scrollPracticeIntoView,
      scrollSubgroupIntoView,
      appVersion: APP_VERSION,
      toggleControlExpand,
      filterByThreat,
      toggleDiffFilter,
      stepSelection,
      resetFilters,
      toggleGroup,
      expandAll,
      collapseAll,
      expandAllRail,
      collapseAllRail,
      countMatchingControlsInPractice,
      countMatchingControlsInSubgroup,
      isControlVisible,
      selectComparison,
      clearComparison,
      deleteCatalog,
      clearAll,
      startResize,
      formatDate,
      formatVersion,
      highlightProse,
      splitThreat,
      verbKey,
      diffLabel,
    };
  },
});

app.mount('#app');
