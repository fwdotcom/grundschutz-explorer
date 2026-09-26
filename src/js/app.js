/**
 * SPDX-FileCopyrightText: 2026 Frank Winter
 * SPDX-License-Identifier: MIT
 *
 * Grundschutz++ Explorer SPA - Main Application (Pure JavaScript, Zero-Build)
 */

import { parseOscalCatalog, formatBsiThreat } from './oscalParser.js';
import { namespaces, loadNamespaces, lookupNamespace, namespaceDefinition } from './namespaces.js';
import { compareCatalogs, applyDiff, computeWordDiff } from './diffEngine.js';
import { matchesFacets } from './filters.js';
import {
  saveCatalogRecord,
  getCatalogRecord,
  getAllCatalogRecords,
  deleteCatalogRecord,
  saveSetting,
  getSetting,
  clearAllData,
  getAllLists,
  getAllListEntries,
  saveListData,
  deleteListEntry,
  deleteList,
} from './storage.js';
import {
  entryKey,
  createListId,
  buildListExport,
  parseListImport,
  mergeNotes,
  uniqueListName,
  listExportFileName,
} from './lists.js';

// Schutzziele: Feld der Anforderung, Anzeige und Begriff im Namespace security_targets.csv
const SECURITY_TARGETS = [
  { key: 'confidentiality', short: 'C', label: 'Vertraulichkeit', nsKey: 'Vertraulichkeit (Confidentiality)' },
  { key: 'integrity', short: 'I', label: 'Integrität', nsKey: 'Integrität (Integrity)' },
  { key: 'availability', short: 'A', label: 'Verfügbarkeit', nsKey: 'Verfügbarkeit (Availability)' },
  { key: 'authenticity', short: 'Au', label: 'Authentizität', nsKey: 'Authentizität (Authenticity)' },
];

// Kurzbezeichnung der Wirkungsstufen (Definition in security_targets_levels.csv)
const SECURITY_TARGET_LEVEL_LABELS = { 0: 'keine', 1: 'wirkt hin', 2: 'im Zentrum' };

// Filter-Facetten mit einem Wert je Anforderung: Kategorie → Feld der Anforderung
const VALUE_FACETS = {
  secLevel: 'secLevel',
  effort: 'effortLevel',
  actionWord: 'actionWord',
  documentation: 'documentation',
  ...Object.fromEntries(SECURITY_TARGETS.map((t) => [t.key, t.key])),
};

const { createApp, ref, shallowRef, computed, onMounted, onBeforeUnmount, watch, nextTick } = window.Vue;

const PRESET_CATALOG_URL =
  'https://raw.githubusercontent.com/BSI-Bund/Stand-der-Technik-Bibliothek/main/control_layer/Grundschutz%2B%2B/Grundschutz%2B%2B-resolved_catalog.json';

// Projektseite auf GitHub (Fußzeile: Projektseite, Lizenz)
const PROJECT_URL = 'https://github.com/fwdotcom/grundschutz-explorer';

// Handbuch, von scripts/build_manual.py je Version erzeugt
const MANUAL_PATH = 'docs/manual/grundschutz-explorer-handbuch-v';

const APP_VERSION = '1.1.0';

// Standardliste: nimmt Stern und Notizen auf, solange keine andere Liste aktiv ist (wird bei Bedarf angelegt)
const DEFAULT_LIST_NAME = 'Merkliste';

// Stufen der Schriftgröße (Faktor auf alle Schriftgrößen, CSS-Variable --font-scale)
const FONT_SCALES = [
  { value: 1, label: 'normal' },
  { value: 1.125, label: 'groß' },
  { value: 1.25, label: 'sehr groß' },
];

// Aufklapp-Zustand der Filterbereiche beim ersten Start und nach dem Laden eines Katalogs:
// die kurzen, häufig genutzten Bereiche offen, die langen Listen zu
const RAIL_COLLAPSED_DEFAULT = {
  lists: false,
  modalVerbs: false,
  secLevels: false,
  effort: false,
  actionWords: true,
  documentation: true,
  securityTargets: true,
  practices: true,
  threats: true,
  tags: true,
  diffs: false,
};

// Übliche Rollen-, Eigenschafts- und Verweisbezeichnungen aus OSCAL auf Deutsch; Unbekanntes erscheint unverändert
const OSCAL_ROLES = {
  creator: 'Ersteller',
  'prepared-by': 'Erstellt von',
  'prepared-for': 'Erstellt für',
  'content-approver': 'Inhaltlich freigegeben von',
  contact: 'Kontakt',
  maintainer: 'Pflege',
  publisher: 'Herausgeber',
};
const OSCAL_PROPS = {
  keywords: 'Schlagwörter',
  scope_implements_norm: 'Umgesetzte Norm',
  marking: 'Kennzeichnung',
};
const OSCAL_LINK_RELS = {
  reference: 'Referenz',
  'canonical': 'Kanonische Fassung',
  alternate: 'Alternative Fassung',
  'latest-version': 'Neueste Fassung',
  'predecessor-version': 'Vorgängerfassung',
  'successor-version': 'Nachfolgefassung',
};

const app = createApp({
  setup() {
    // Core State
    // Angezeigter Katalog und optional ein älterer Stand zum Vergleich. Gemerkt werden nur die beiden IDs;
    // activeCatalog ist immer frisch geparst und trägt das Ergebnis des Vergleichs (siehe showCatalogs).
    // shallowRef: die Katalogdaten ändern sich nach dem Parsen nicht mehr; tiefe Reaktivität kostete bei
    // jedem Zugriff (Zählungen über alle Anforderungen) spürbar Zeit
    const activeCatalog = shallowRef(null);
    const activeRecordId = ref('');
    const comparisonCatalog = shallowRef(null);
    const comparisonRecordId = ref('');
    const diffSummary = ref(null);
    // Fehler beim Start bzw. beim Wechsel des Katalogs (Startseite bzw. Dialog „Kataloge“)
    const startupError = ref('');
    const catalogError = ref('');
    const storedCatalogs = ref([]);
    const selectedControlId = ref('');

    // UI State
    // Dialog "Kataloge": Versionen verwalten und Kataloge laden
    const isCatalogModalOpen = ref(false);
    // Dialog "Katalog laden" (über "Kataloge" oder die Startseite)
    const isLoadModalOpen = ref(false);
    const loadFile = ref(null);
    const isImpressumModalOpen = ref(false);
    const isDatenschutzModalOpen = ref(false);
    const isLicenseModalOpen = ref(false);
    // Bestätigungsdialog (ersetzt window.confirm): Inhalt, Element und Rückgabe des offenen Promise
    const confirmState = ref(null);
    const confirmDialogEl = ref(null);
    let confirmResolve = null;
    const isDarkMode = ref(false);
    const isHighContrast = ref(false);
    const fontScale = ref(1);
    const isLoadingInitial = ref(true);
    const detailPaneWidth = ref(46); // Anteil der Detailsicht am Arbeitsbereich (%)
    const DETAIL_PANE_MIN = 28;
    const DETAIL_PANE_MAX = 70;
    // Filterleiste als Drawer (nur unter 980px Breite)
    const isRailOpen = ref(false);
    const railToggleBtn = ref(null);
    const railCloseBtn = ref(null);
    const narrowQuery = window.matchMedia?.('(max-width: 980px)');
    const isResizing = ref(false);
    const isDragOver = ref(false);

    // Template Refs
    const searchInput = ref(null);
    const splitEl = ref(null);
    const listScroll = ref(null);
    const detailBody = ref(null);
    const footerLeft = ref(null);
    let footerObserver = null;

    // Detail Tab State
    const detailActiveTab = ref('overview');
    // Aktive Ebene der Detailansicht: null = Anforderung, sonst { level: 'practice' | 'subgroup', id }
    const detailScope = ref(null);
    // Ausgeklappte Definitionen (Info-Buttons) in der Detailansicht
    const openDefs = ref({ effort: false, actionWord: false, documentation: false, securityTargets: false, secLevel: false });
    // Zähler, der nach dem Laden der BSI-Namespaces erhöht wird (macht Definitionen reaktiv)
    const namespacesVersion = ref(0);

    // Import Modal State
    const importUrlInput = ref('');
    const importLoading = ref(false);
    const importError = ref('');
    // Hinweis im Dialog "Katalog laden", wenn der Katalog bereits gespeichert ist
    const loadNotice = ref('');

    // Tree Expanded Keys
    const expandedKeys = ref(new Set());

    // Filter State (Text Search & Drilldowns)
    const filters = ref({
      searchQuery: '',
      subgroupFilter: '',
      controlFilter: '',
    });

    // Suchbegriff, nach dem gefiltert wird: folgt der Eingabe mit kurzer Verzögerung, damit nicht jeder Tastendruck
    // alle Zählungen neu berechnet; ein geleertes Suchfeld wirkt sofort
    const searchTerm = ref('');
    let searchTimer = null;
    watch(
      () => filters.value.searchQuery,
      (q) => {
        clearTimeout(searchTimer);
        const term = q.trim().toLowerCase();
        if (!term) searchTerm.value = '';
        else searchTimer = setTimeout(() => (searchTerm.value = term), 150);
      }
    );

    // Suchbegriff in Wörter zerlegt; in Anführungszeichen gesetzte Teile bleiben als Wortfolge zusammen
    const searchWords = computed(() =>
      (searchTerm.value.match(/"[^"]+"|„[^“”"]+[“”"]|\S+/g) || []).map((w) => w.replace(/^["„]|["“”]$/g, '').trim()).filter(Boolean)
    );

    // Tag-based Facet Filters: Array of { key, category, value, mode: 'include'|'exclude', label, categoryLabel }
    const activeTags = ref([]);

    // Mini-Suche für Gefährdungen in der Left Rail
    const threatRailSearch = ref('');
    // Werte ohne Treffer in der Filterleiste ausblenden (Umschalter im Kopf der Filterleiste)
    const railOnlyMatching = ref(false);

    // Flache Trefferliste vs. Baumansicht ('tree' | 'flat')
    const listViewMode = ref('tree');

    // Aufklapp-Status der Rail-Sektionen
    const railCollapsed = ref({ ...RAIL_COLLAPSED_DEFAULT });

    const tagRailSearch = ref('');

    // Suchfelder der langen Werte-Facetten
    const facetSearch = ref({ actionWord: '', documentation: '' });

    // Eigene Listen: Anforderungen mit Notizen, z. B. für eine Besprechung
    const lists = ref([]); // [{ id, name, createdAt, updatedAt }]
    const listEntries = ref({}); // entryKey → { key, listId, controlId, note, createdAt, updatedAt }
    // Nur eine Liste ist aktiv: in sie schreiben Stern und Notizfeld
    const activeListId = ref('');
    // Im Reiter "Notizen" angezeigte Liste (aktive Liste oder eine andere, nur lesbar)
    const notesViewListId = ref('');
    // Inline-Eingabe in der Filterleiste: { id: '' (neue Liste) | Listen-ID (umbenennen), name }
    const listEdit = ref(null);
    const listImportInput = ref(null);
    // Geöffnetes ⋯-Menü einer Liste bzw. '__all' für das Menü der Gruppe
    const listMenuId = ref('');
    const listNotice = ref('');

    const sortedLists = computed(() =>
      [...lists.value].sort((a, b) => a.name.localeCompare(b.name, 'de', { numeric: true }))
    );
    const activeList = computed(() => lists.value.find((l) => l.id === activeListId.value) || null);
    const defaultList = computed(
      () => lists.value.find((l) => l.name.toLocaleLowerCase('de') === DEFAULT_LIST_NAME.toLocaleLowerCase('de')) || null
    );
    // Ziel von Stern und Notizfeld: aktive Liste, sonst die Merkliste (id '' = wird beim ersten Schreiben angelegt)
    const writeList = computed(() => activeList.value || defaultList.value || { id: '', name: DEFAULT_LIST_NAME });

    // Anforderung → Einträge (in welchen Listen sie steht)
    const entriesByControl = computed(() => {
      const map = new Map();
      for (const e of Object.values(listEntries.value)) {
        if (!map.has(e.controlId)) map.set(e.controlId, []);
        map.get(e.controlId).push(e);
      }
      return map;
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

    // Optionslisten für Aufwand, Handlungswort und Dokumentation; in den langen Listen mit Suchfeld stehen gesetzte Werte oben
    function facetOptionsFiltered(category) {
      const q = (facetSearch.value[category] || '').trim().toLowerCase();
      const counts = facetCounts.value[category] || {};
      const list = (facetOptions.value[category] || []).filter((v) => railRowVisible(category, v, counts[v] || 0));
      if (category === 'effort') return list;
      const selected = list.filter((v) => getTagMode(category, v));
      const rest = list.filter((v) => !getTagMode(category, v) && (!q || v.toLowerCase().includes(q)));
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

    // Erster Absatz einer Definition (für Tooltips)
    function shortDefinition(name, value) {
      return definition(name, value).split(/\n\s*\n/)[0];
    }

    // Computed: Active filter specification grouped by category and mode
    const activeFilterSpec = computed(() => {
      const spec = {
        inc: { practice: new Set(), modalVerb: new Set(), threat: new Set(), diff: new Set(), tags: new Set(), list: new Set() },
        exc: { practice: new Set(), modalVerb: new Set(), threat: new Set(), diff: new Set(), tags: new Set(), list: new Set() },
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

      // 1. Volltextsuche: jedes Wort muss vorkommen, in beliebiger Reihenfolge; "…" sucht eine Wortfolge
      if (searchWords.value.length) {
        const text = searchText(ctrl);
        if (!searchWords.value.every((w) => text.includes(w))) return false;
      }

      // 2. Drilldowns (Subgroup & Control)
      if (f.subgroupFilter && ctrl.subgroupId !== f.subgroupFilter) return false;
      if (f.controlFilter) {
        const isSelf = ctrl.id === f.controlFilter;
        const isChild = controlAncestors(ctrl).some((a) => a.id === f.controlFilter);
        const target = activeCatalog.value?.controlMap.get(f.controlFilter);
        const isParent = Boolean(target && controlAncestors(target).some((a) => a.id === ctrl.id));
        if (!isSelf && !isChild && !isParent) return false;
      }

      // 3. Facetten: zwischen den Bereichen und, innerhalb eines Bereichs oder (filters.js)
      return matchesFacets(activeFilterSpec.value, (category) => facetValues(ctrl, category), ignoreCategory);
    }

    // Durchsuchbarer Text je Anforderung, einmal berechnet: Kennung, Titel, Anforderungstext, Hilfestellung,
    // Gefährdungen und Tags (Zeilenumbruch als Trenner, damit kein Treffer über Feldgrenzen entsteht)
    const searchTexts = new WeakMap();
    function searchText(ctrl) {
      let text = searchTexts.get(ctrl);
      if (text === undefined) {
        text = [ctrl.id, ctrl.title, ctrl.statementProse, ctrl.guidanceProse, ...ctrl.elementareGefaehrdungen, ...(ctrl.tags || [])]
          .filter(Boolean)
          .join('\n')
          .toLowerCase();
        searchTexts.set(ctrl, text);
      }
      return text;
    }

    // Werte einer Anforderung je Filterbereich, als Liste
    function facetValues(ctrl, category) {
      if (category in VALUE_FACETS) {
        const value = ctrl[VALUE_FACETS[category]];
        return [value === undefined || value === null ? '' : String(value)];
      }
      switch (category) {
        case 'practice':
          return [ctrl.groupId];
        case 'modalVerb':
          return [ctrl.modalVerb];
        case 'threat':
          return ctrl.elementareGefaehrdungen.map((t) => splitThreat(t).code);
        case 'tags':
          return ctrl.tags || [];
        case 'list':
          return (entriesByControl.value.get(ctrl.id) || []).map((e) => e.listId);
        case 'diff':
          return [ctrl.diff?.status || 'unchanged'];
        default:
          return [];
      }
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

    // Flache Trefferliste aller matchenden Anforderungen
    const flatFilteredControls = computed(() => {
      if (!activeCatalog.value) return [];
      const list = [];
      const ids = filteredControlIds.value;
      for (const ctrl of activeCatalog.value.allControls) {
        if (ids.has(ctrl.id)) list.push(ctrl);
      }
      return list;
    });

    // Practice Counts (ignoring practice facet)
    const practiceCounts = computed(() => {
      const counts = {};
      if (!activeCatalog.value) return counts;
      for (const ctrl of activeCatalog.value.allControls) {
        if (!matchesFilterCategory(ctrl, 'practice')) continue;
        counts[ctrl.groupId] = (counts[ctrl.groupId] || 0) + 1;
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
      const counts = { added: 0, modified: 0, deleted: 0 };
      if (!activeCatalog.value) return counts;
      for (const ctrl of activeCatalog.value.allControls) {
        if (!matchesFilterCategory(ctrl, 'diff')) continue;
        const status = ctrl.diff?.status || 'unchanged';
        if (counts[status] !== undefined) counts[status]++;
      }
      return counts;
    });

    // Zeile in der Filterleiste zeigen: immer, wenn der Wert gesetzt ist (✓/✕) oder Treffer hat; sonst nur ohne „Werte ohne Treffer ausblenden“
    function railRowVisible(category, value, count) {
      return !railOnlyMatching.value || count > 0 || Boolean(getTagMode(category, value));
    }

    function railSectionEmpty(category, values, counts) {
      return values.every((v) => !railRowVisible(category, v, counts[v] || 0));
    }

    // Gefährdungen für die Left Rail (gefiltert nach Suchbegriff und Treffer-Option)
    const displayedThreatOptions = computed(() => {
      const list = [];
      const q = threatRailSearch.value.trim().toLowerCase();

      namespacesVersion.value;
      const nsCodes = Object.keys(namespaces.basethreats).sort(
        (a, b) => Number(a.replace(/^G 0\./, '')) - Number(b.replace(/^G 0\./, ''))
      );
      const codes = nsCodes.length ? nsCodes : Array.from({ length: 47 }, (_, i) => `G 0.${i + 1}`);

      for (const code of codes) {
        const title = namespaces.basethreats[code]?.Begriff || `Gefährdung ${code.replace(/^G /, '')}`;
        const count = threatCounts.value[code] || 0;
        const isActive = isTagActive('threat', code);

        if (!railRowVisible('threat', code, count)) {
          continue;
        }

        if (q) {
          const num = code.replace(/^G\s*0?\.?/i, '').trim();
          const matchesCode =
            code.toLowerCase().includes(q) ||
            `g0${num}`.includes(q) ||
            `g${num}`.includes(q) ||
            num === q;
          const matchesTitle = title.toLowerCase().includes(q);
          if (!matchesCode && !matchesTitle) continue;
        }

        list.push({
          code,
          title,
          label: `${code}: ${title}`,
          definition: namespaces.basethreats[code]?.Definition?.split(/\n\s*\n/)[0] || '',
          isActive,
        });
      }
      // Gesetzte Gefährdungen (✓ oder ✕) oben
      return [...list.filter((t) => t.isActive), ...list.filter((t) => !t.isActive)];
    });

    // Tags (kontrolliertes Vokabular aus tags.csv)
    const allCatalogTags = computed(() => {
      if (!activeCatalog.value) return [];
      const set = new Set();
      for (const ctrl of activeCatalog.value.allControls) {
        for (const tag of ctrl.tags || []) {
          set.add(tag);
        }
      }
      return Array.from(set).sort((a, b) => a.localeCompare(b, 'de'));
    });

    const tagCounts = computed(() => {
      const counts = {};
      if (!activeCatalog.value) return counts;
      for (const ctrl of activeCatalog.value.allControls) {
        if (!matchesFilterCategory(ctrl, 'tags')) continue;
        for (const tag of ctrl.tags || []) {
          counts[tag] = (counts[tag] || 0) + 1;
        }
      }
      return counts;
    });

    const displayedTagOptions = computed(() => {
      const q = tagRailSearch.value.trim().toLowerCase();
      const list = [];
      for (const tag of allCatalogTags.value) {
        if (q && !tag.toLowerCase().includes(q)) continue;
        if (!railRowVisible('tags', tag, tagCounts.value[tag] || 0)) continue;
        list.push({
          tag,
          count: tagCounts.value[tag] || 0,
          isActive: isTagActive('tags', tag),
          isIncluded: isTagActive('tags', tag, 'include'),
          isExcluded: isTagActive('tags', tag, 'exclude'),
        });
      }
      // Gesetzte Tags (✓ oder ✕) oben
      return [...list.filter((i) => i.isActive), ...list.filter((i) => !i.isActive)];
    });

    function activeTagCountFor(category) {
      return activeTags.value.filter((t) => t.category === category).length;
    }

    function tagDefinition(name) {
      return definition('tags', name);
    }

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
          label: `„${filters.value.searchQuery.trim()}“`,
          mode: 'include',
        });
      }

      // 2. Facettenfilter: ein Chip je Bereich und Modus. Die Werte eines NUR-Chips verknüpfen mit „oder“,
      //    die Chips untereinander mit „und“ (filters.js)
      const groups = new Map();
      for (const tag of activeTags.value) {
        const key = `${tag.category}:${tag.mode}`;
        if (!groups.has(key)) {
          groups.set(key, { key, type: 'facet', category: tag.category, mode: tag.mode, categoryLabel: tag.categoryLabel, labels: [] });
        }
        groups.get(key).labels.push(tag.label);
      }
      for (const group of groups.values()) {
        const { labels, ...chip } = group;
        chips.push({ ...chip, values: labels, label: labels.join(chip.mode === 'include' ? ' oder ' : ', ') });
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

    // Einträge je Liste, die zu den übrigen Filtern passen
    const listCounts = computed(() => {
      const counts = {};
      const map = activeCatalog.value?.controlMap;
      if (!map) return counts;
      for (const e of Object.values(listEntries.value)) {
        const ctrl = map.get(e.controlId);
        if (!ctrl || !matchesFilterCategory(ctrl, 'list')) continue;
        counts[e.listId] = (counts[e.listId] || 0) + 1;
      }
      return counts;
    });

    // Stern der gewählten Anforderung: 'none' | 'other' (in einer anderen Liste) | 'here' (in der Zielliste)
    const selectedStarState = computed(() => {
      const entries = selectedControl.value ? entriesByControl.value.get(selectedControl.value.id) || [] : [];
      if (writeList.value.id && entries.some((e) => e.listId === writeList.value.id)) return 'here';
      return entries.length ? 'other' : 'none';
    });

    const selectedStarTitle = computed(() => {
      const names = (entriesByControl.value.get(selectedControl.value?.id) || [])
        .map((e) => lists.value.find((l) => l.id === e.listId)?.name)
        .filter(Boolean);
      const where = names.length ? `In ${names.length === 1 ? 'Liste' : 'Listen'}: ${names.join(', ')}` : 'In keiner Liste';
      return selectedStarState.value === 'here'
        ? `${where}\n\nKlicken: aus „${writeList.value.name}“ entfernen`
        : `${where}\n\nKlicken: in „${writeList.value.name}“ aufnehmen`;
    });

    // Listen, deren Notiz im Reiter "Notizen" wählbar ist: die Zielliste und alle nicht ausgeschlossenen mit Notiz
    const notesViewOptions = computed(() => {
      const ctrl = selectedControl.value;
      if (!ctrl) return [];
      const excluded = activeFilterSpec.value.exc.list;
      const options = [writeList.value];
      for (const list of sortedLists.value) {
        if (list.id === writeList.value.id || excluded.has(list.id)) continue;
        if (listEntries.value[entryKey(list.id, ctrl.id)]?.note?.trim()) options.push(list);
      }
      return options;
    });

    const notesViewList = computed(
      () => notesViewOptions.value.find((l) => l.id === notesViewListId.value) || notesViewOptions.value[0] || null
    );

    const notesViewEntry = computed(() =>
      notesViewList.value?.id && selectedControl.value
        ? listEntries.value[entryKey(notesViewList.value.id, selectedControl.value.id)] || null
        : null
    );

    // Markierungen in der Explorerliste je Anforderung: { star, note } mit 'here' (Zielliste) bzw. 'other' (andere Liste)
    const listMarks = computed(() => {
      const marks = new Map();
      const target = writeList.value.id;
      const excluded = activeFilterSpec.value.exc.list;
      for (const [controlId, entries] of entriesByControl.value) {
        const star = entries.some((e) => e.listId === target) ? 'here' : 'other';
        const hasNote = (e) => Boolean(e.note?.trim());
        const note = entries.some((e) => e.listId === target && hasNote(e))
          ? 'here'
          : entries.some((e) => e.listId !== target && !excluded.has(e.listId) && hasNote(e))
            ? 'other'
            : '';
        marks.set(controlId, { star, note });
      }
      return marks;
    });

    // Punkt am Reiter "Notizen": 'here' = Notiz in der Zielliste, 'other' = nur in anderen Listen
    const selectedNoteState = computed(() => {
      const ctrl = selectedControl.value;
      if (!ctrl) return '';
      const target = writeList.value.id;
      if (target && listEntries.value[entryKey(target, ctrl.id)]?.note?.trim()) return 'here';
      return notesViewOptions.value.some((l) => l.id !== target) ? 'other' : '';
    });

    // Selected Control
    const selectedControl = computed(() => {
      if (!activeCatalog.value || !selectedControlId.value) return null;
      return activeCatalog.value.controlMap.get(selectedControlId.value) || null;
    });

    // Übergeordnete Anforderungen der Auswahl, von oben nach unten (Unteranforderungen sind beliebig tief verschachtelt)
    function controlAncestors(ctrl) {
      const out = [];
      const map = activeCatalog.value?.controlMap;
      let parentId = ctrl?.parentControlId;
      while (map && parentId) {
        const parent = map.get(parentId);
        if (!parent) break;
        out.unshift(parent);
        parentId = parent.parentControlId;
      }
      return out;
    }

    const ancestorControls = computed(() => controlAncestors(selectedControl.value));

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

    // Gewählte Zeile der Liste für Screenreader (aria-activedescendant des Baums bzw. der Listbox)
    const activeRowId = computed(() =>
      selectedControl.value && !detailScope.value && !selectionFilteredOut.value ? 'row-' + selectedControl.value.id : null
    );

    // Die Auswahl rechts hat links keinen sichtbaren Eintrag mehr (durch Filter ausgeblendet)
    const selectionFilteredOut = computed(() => {
      if (!activeCatalog.value) return false;
      if (scopeSubgroup.value) return countMatchingControlsInSubgroup(scopeSubgroup.value) === 0;
      if (scopePractice.value) return countMatchingControlsInPractice(scopePractice.value) === 0;
      const ctrl = selectedControl.value;
      if (!ctrl) return false;
      if (filteredControlIds.value.has(ctrl.id)) return false;
      // Anforderung, die wegen passender Unteranforderungen in der Baumansicht steht
      return !(listViewMode.value === 'tree' && isControlVisible(ctrl));
    });

    // Metadaten des Katalogs nach dem OSCAL-Metadatenmodell, für die Katalogübersicht aufbereitet.
    // Verweise auf "#uuid" zeigen auf eine Ressource im Anhang (back-matter), deren rlinks die Adresse tragen.
    const catalogMeta = computed(() => {
      const cat = activeCatalog.value;
      if (!cat) return null;
      const m = cat.metadata || {};
      const resources = new Map((cat.backMatter?.resources || []).map((r) => [r.uuid, r]));
      const parties = new Map((m.parties || []).map((p) => [p.uuid, p]));
      const roles = new Map((m.roles || []).map((r) => [r.id, r]));

      const link = (l) => {
        const res = l.href?.startsWith('#') ? resources.get(l.href.slice(1)) : null;
        const href = res ? res.rlinks?.[0]?.href || '' : l.href || '';
        return { text: l.text || res?.title || href, href: safeHref(href), rel: OSCAL_LINK_RELS[l.rel] || l.rel || '' };
      };
      const party = (p) => ({
        name: p.name || p['short-name'] || p.uuid,
        email: p['email-addresses']?.[0] || '',
        links: (p.links || []).map(link),
      });

      // Stand des Katalogs: Version, Veröffentlichung (falls angegeben), letzte Änderung
      const dates = [
        ['Version', formatTimestamp(m.version)],
        ['Veröffentlicht', formatTimestamp(m.published)],
        ['Zuletzt geändert', formatTimestamp(m['last-modified'])],
      ].filter(([, v]) => v);
      // Eigenschaften: Norm und Schlagwörter an festen Stellen, alle übrigen als "weitere Eigenschaften"
      const props = m.props || [];
      const propValues = (name) => props.filter((p) => p.name === name).map((p) => p.value).filter(Boolean);
      const otherProps = props
        .filter((p) => !['scope_implements_norm', 'keywords'].includes(p.name))
        .map((p) => ({ label: OSCAL_PROPS[p.name] || p.name, name: p.name, value: p.value }));

      const responsibleUuids = new Set();
      const responsible = (m['responsible-parties'] || []).map((rp) => {
        (rp['party-uuids'] || []).forEach((u) => responsibleUuids.add(u));
        return {
          role: OSCAL_ROLES[rp['role-id']] || roles.get(rp['role-id'])?.title || rp['role-id'],
          parties: (rp['party-uuids'] || []).map((u) => parties.get(u)).filter(Boolean).map(party),
        };
      });
      // Beteiligte ohne zugeordnete Rolle
      const otherParties = (m.parties || []).filter((p) => !responsibleUuids.has(p.uuid)).map(party);

      return {
        remarks: m.remarks || '',
        dates,
        norms: propValues('scope_implements_norm'),
        keywords: propValues('keywords'),
        otherProps,
        responsible,
        otherParties,
        links: (m.links || []).map(link),
        revisions: (m.revisions || []).map((r) => ({
          title: r.title || '',
          version: r.version || '',
          date: formatTimestamp(r.published || r['last-modified']),
          remarks: r.remarks || '',
        })),
      };
    });

    // Adressen aus Katalogen nur als Link, wenn sie ungefährlich sind (kein javascript: o. Ä.)
    function safeHref(href) {
      return /^(https?:|mailto:)/i.test(href || '') ? href : '';
    }

    // OSCAL-Zeitstempel (ISO 8601) als Datum und Uhrzeit, andere Angaben unverändert
    function formatTimestamp(value) {
      if (!value) return '';
      return /^\d{4}-\d{2}-\d{2}T/.test(value) && !isNaN(new Date(value)) ? formatDate(value) : value;
    }

    // Bezeichnung der Auswahl, die durch Filter ausgeblendet ist
    const hiddenSelectionLabel = computed(() => {
      if (scopeSubgroup.value) return `${scopeSubgroup.value.id} ${scopeSubgroup.value.title}`;
      if (scopePractice.value) return `${scopePractice.value.id} ${scopePractice.value.title}`;
      return selectedControl.value ? `${selectedControl.value.id} ${selectedControl.value.title}` : '';
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

    // Base Control for Diff Comparison in Detail View
    const baseControlForDiff = computed(() => {
      if (!comparisonCatalog.value || !selectedControlId.value) return null;
      return comparisonCatalog.value.controlMap.get(selectedControlId.value) || null;
    });

    // Word diffs
    const statementDiffTokens = computed(() => {
      if (selectedControl.value?.diff?.status !== 'modified') return [];
      const oldText = baseControlForDiff.value?.statementProse || '';
      const newText = selectedControl.value.statementProse || '';
      // Nur geänderte Texte zeigen
      const tokens = computeWordDiff(oldText, newText);
      return tokens.some((tok) => tok.added || tok.removed) ? tokens : [];
    });

    const guidanceDiffTokens = computed(() => {
      if (selectedControl.value?.diff?.status !== 'modified') return [];
      const oldText = baseControlForDiff.value?.guidanceProse || '';
      const newText = selectedControl.value.guidanceProse || '';
      // Nur geänderte Texte zeigen
      const tokens = computeWordDiff(oldText, newText);
      return tokens.some((tok) => tok.added || tok.removed) ? tokens : [];
    });

    // Reihenfolge der sichtbaren Einträge (für Pfeiltasten-Navigation)
    const visibleOrder = computed(() => {
      if (!activeCatalog.value) return [];
      if (listViewMode.value === 'flat') {
        return flatFilteredControls.value.map((c) => c.id);
      }
      const order = [];
      const keys = expandedKeys.value;
      for (const p of activeCatalog.value.practices) {
        if (!keys.has(`p_${p.id}`)) continue;
        for (const sub of p.subgroups) {
          if (!keys.has(`sub_${sub.id}`)) continue;
          for (const row of visibleControlRows(sub.controls)) order.push(row.ctrl.id);
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
            railOnlyMatching: railOnlyMatching.value,
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
            listViewMode: listViewMode.value,
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
              // true, wenn die Anforderung selbst oder eine Unteranforderung passt; klappt Zweige mit Treffern auf
              const expandMatches = (ctrl) => {
                let childMatch = false;
                for (const sc of ctrl.subcontrols || []) {
                  if (expandMatches(sc)) childMatch = true;
                }
                if (childMatch && !expandedKeys.value.has(`ctrl_${ctrl.id}`)) {
                  expandedKeys.value.add(`ctrl_${ctrl.id}`);
                  keysChanged = true;
                }
                return childMatch || newIds.has(ctrl.id);
              };
              for (const ctrl of sub.controls) {
                if (expandMatches(ctrl)) hasSubMatch = true;
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
        railOnlyMatching.value,
      ],
      () => {
        scheduleSaveFilters();
      },
      { deep: true }
    );

    // Wenn von ungefiltert auf gefiltert gewechselt wird: automatisch auf flache Liste wechseln.
    // Filter klappen im Baum die Zweige mit Treffern auf; ohne Filter gelten wieder Ansicht und Aufklapp-Zustand
    // von vorher (die Auswahl bleibt dabei sichtbar).
    let treeKeysBeforeFilter = null;
    let viewModeBeforeFilter = null;
    watch(
      () => hasActiveFilters.value,
      (isActive, wasActive) => {
        if (isRestoringState.value) return;
        if (isActive && !wasActive) {
          treeKeysBeforeFilter = new Set(expandedKeys.value);
          viewModeBeforeFilter = listViewMode.value;
          listViewMode.value = 'flat';
          scheduleSaveCollapse();
        } else if (!isActive && wasActive) {
          if (treeKeysBeforeFilter) {
            expandedKeys.value = treeKeysBeforeFilter;
            if (selectedControl.value) expandPathTo(selectedControl.value);
            treeKeysBeforeFilter = null;
          }
          listViewMode.value = viewModeBeforeFilter || 'tree';
          viewModeBeforeFilter = null;
          scheduleSaveCollapse();
          scrollSelectedIntoView();
        }
      }
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
        railCollapsed.value.tags,
        railCollapsed.value.lists,
        selectedControlId.value,
        listViewMode.value,
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

    // Aktive Liste merken; wird sie ausgeschlossen, ist sie nicht mehr aktiv
    watch(activeListId, (id) => {
      saveSetting('active_list_id', id).catch(() => {});
    });
    watch(
      () => activeTags.value,
      () => {
        if (activeListId.value && getTagMode('list', activeListId.value) === 'exclude') activeListId.value = '';
      },
      { deep: true }
    );
    // Beim Wechsel der Anforderung ausstehende Notizen sofort speichern und wieder die aktive Liste zeigen
    watch(selectedControlId, () => {
      flushNoteSaves();
      notesViewListId.value = '';
    });

    async function restorePersistedState() {
      try {
        const [savedFilterState, savedCollapseState] = await Promise.all([
          getSetting('saved_filter_state'),
          getSetting('saved_collapse_state'),
        ]);

        if (savedFilterState) {
          if (savedFilterState.filters) {
            filters.value.searchQuery = savedFilterState.filters.searchQuery || '';
            searchTerm.value = filters.value.searchQuery.trim().toLowerCase();
            filters.value.subgroupFilter = savedFilterState.filters.subgroupFilter || '';
            filters.value.controlFilter = savedFilterState.filters.controlFilter || '';
          }
          if (Array.isArray(savedFilterState.activeTags)) {
            activeTags.value = savedFilterState.activeTags;
          }
          // threatShowOnlyMatching: frühere Einstellung, galt nur für die Gefährdungen
          const onlyMatching = savedFilterState.railOnlyMatching ?? savedFilterState.threatShowOnlyMatching;
          if (typeof onlyMatching === 'boolean') {
            railOnlyMatching.value = onlyMatching;
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
          if (savedCollapseState.listViewMode === 'flat' || savedCollapseState.listViewMode === 'tree') {
            listViewMode.value = savedCollapseState.listViewMode;
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
      narrowQuery?.addEventListener('change', onNarrowChange);
      // Darstellung: ohne gespeicherte Wahl (oder ohne lesbaren Speicher) den Systemeinstellungen folgen
      const setting = (key, fallback) => getSetting(key, fallback).catch(() => fallback);
      const savedDark = await setting('dark_mode', window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false);
      isDarkMode.value = Boolean(savedDark);
      applyDarkMode(isDarkMode.value);

      const savedContrast = await setting('high_contrast', window.matchMedia?.('(prefers-contrast: more)').matches ?? false);
      isHighContrast.value = Boolean(savedContrast);
      applyHighContrast(isHighContrast.value);

      const savedScale = Number(await setting('font_scale', 1));
      fontScale.value = FONT_SCALES.some((o) => o.value === savedScale) ? savedScale : 1;
      applyFontScale(fontScale.value);

      if (footerLeft.value && window.ResizeObserver) {
        footerObserver = new ResizeObserver(updateFooterCompact);
        footerObserver.observe(footerLeft.value.closest('.app-footer'));
      }
      updateFooterCompact();
      // Nach dem Laden der Webschrift ändern sich die Textbreiten
      document.fonts?.ready.then(updateFooterCompact);

      window.addEventListener('click', closeListMenuOnOutsideClick);
      window.addEventListener('pagehide', flushNoteSaves);
      document.addEventListener('visibilitychange', flushNoteSaves);

      // Der Start darf nie im Ladezustand hängen bleiben: Fehler erscheinen als Hinweis auf der Startseite
      try {
        await loadLists();

        // BSI-Namespaces vor dem Katalog laden (Gefährdungsbezeichnungen werden beim Parsen benötigt)
        await loadNamespaces();
        namespacesVersion.value++;

        await refreshStoredCatalogs();

        const restored = await restorePersistedState();
        dropUnknownListTags();
        const hasSavedCollapse = Boolean(restored?.savedCollapseState && Array.isArray(restored.savedCollapseState.expandedKeys));

        // Ohne gespeicherten Katalog (erster Start oder Speicher geleert) erscheint die Startseite;
        // geladen wird erst auf ausdrücklichen Wunsch.
        const known = (id) => storedCatalogs.value.some((c) => c.id === id);
        const lastActiveId = await getSetting('last_active_catalog_id');
        const savedComparisonId = await getSetting('comparison_catalog_id', '');
        // Zuerst den zuletzt angezeigten Katalog samt Vergleich; lässt er sich nicht öffnen, ohne Vergleich,
        // danach die übrigen gespeicherten Kataloge
        const attempts = [];
        if (known(lastActiveId)) {
          if (known(savedComparisonId)) attempts.push([lastActiveId, savedComparisonId]);
          attempts.push([lastActiveId, '']);
        }
        for (const c of storedCatalogs.value) if (c.id !== lastActiveId) attempts.push([c.id, '']);
        const lastError = await showFirstOpenable(attempts, { resetView: !hasSavedCollapse });
        if (lastError) {
          startupError.value =
            `Die gespeicherten Kataloge lassen sich nicht öffnen (${lastError.message}). ` +
            'Löschen Sie sie unter „Kataloge“ und laden Sie den Katalog neu.';
        }

        // Eine gespeicherte Auswahl, die es im Katalog nicht (mehr) gibt, verwerfen – keine automatische Auswahl
        if (activeCatalog.value && selectedControlId.value && !activeCatalog.value.controlMap.has(selectedControlId.value)) {
          selectedControlId.value = '';
        }
        scrollSelectedIntoView();
      } catch (err) {
        console.error('Fehler beim Start:', err);
        startupError.value =
          'Die im Browser gespeicherten Daten konnten nicht gelesen werden. Möglicherweise erlaubt Ihr Browser ' +
          'in diesem Fenster keinen lokalen Speicher, etwa im privaten Modus.';
      } finally {
        isLoadingInitial.value = false;
        // Erst wenn die Beobachter auf den wiederhergestellten Zustand reagiert haben, wieder speichern
        // (sonst schriebe das Wiederherstellen selbst den Zustand zurück bzw. schaltete die Ansicht um)
        await nextTick();
        isRestoringState.value = false;
      }
    });

    onBeforeUnmount(() => {
      window.removeEventListener('keydown', handleGlobalKeydown);
      narrowQuery?.removeEventListener('change', onNarrowChange);
      window.removeEventListener('click', closeListMenuOnOutsideClick);
      window.removeEventListener('pagehide', flushNoteSaves);
      document.removeEventListener('visibilitychange', flushNoteSaves);
      flushNoteSaves();
      footerObserver?.disconnect();
    });

    // Fußzeile: Reicht der Platz links nicht, werden nacheinander App-Name, Version und Projektlink ausgeblendet.
    // Gemessen wird jeweils ab voller Anzeige, damit wieder eingeblendet wird, sobald Platz frei wird.
    function updateFooterCompact() {
      const el = footerLeft.value;
      if (!el) return;
      let level = 0;
      el.dataset.hide = level;
      while (level < 3 && el.scrollWidth > el.clientWidth) el.dataset.hide = ++level;
    }

    // Zeigt einen modalen Bestätigungsdialog und liefert true (bestätigt) oder false (abgebrochen, Escape, Klick daneben);
    // mit altLabel gibt es einen dritten Knopf, der 'alt' liefert
    function askConfirm({ title, message, hint = '', confirmLabel = 'OK', cancelLabel = 'Abbrechen', altLabel = '', danger = false }) {
      confirmResolve?.(false);
      confirmState.value = { title, message, hint, confirmLabel, cancelLabel, altLabel, danger };
      return new Promise((resolve) => {
        confirmResolve = resolve;
        nextTick(() => {
          const dialog = confirmDialogEl.value;
          if (!dialog.open) dialog.showModal();
          // Bei destruktiven Aktionen liegt der Fokus auf "Abbrechen"
          dialog.querySelector('[data-autofocus]')?.focus();
        });
      });
    }

    function onConfirmDialogClose() {
      const dialog = confirmDialogEl.value;
      const result = dialog.returnValue === 'confirm' ? true : dialog.returnValue === 'alt' ? 'alt' : false;
      dialog.returnValue = '';
      confirmState.value = null;
      const resolve = confirmResolve;
      confirmResolve = null;
      resolve?.(result);
    }

    function handleGlobalKeydown(e) {
      // Offener Bestätigungsdialog behandelt Tasten selbst (Escape schließt nur ihn)
      if (confirmState.value) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInput.value?.focus();
        searchInput.value?.select();
        return;
      }
      if (e.key === 'Escape') {
        // Modale Dialoge (<dialog>) schließen sich über ihr cancel-Ereignis selbst
        if (listMenuId.value) listMenuId.value = '';
        else if (isRailOpen.value) closeRail();
        return;
      }
      if (isCatalogModalOpen.value || isLoadModalOpen.value || isImpressumModalOpen.value || isDatenschutzModalOpen.value || isLicenseModalOpen.value) return;
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      // Pfeiltasten, die ein Element schon selbst verarbeitet hat (Reiter, Trenner), nicht noch einmal auswerten
      if (e.defaultPrevented) return;
      if (e.key === '/') {
        e.preventDefault();
        searchInput.value?.focus();
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        if (stepTree(e.key === 'ArrowRight')) e.preventDefault();
      } else if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        stepSelection(1);
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        stepSelection(-1);
      }
    }

    function openRail() {
      isRailOpen.value = true;
      nextTick(() => railCloseBtn.value?.focus());
    }

    function closeRail() {
      if (!isRailOpen.value) return;
      isRailOpen.value = false;
      nextTick(() => railToggleBtn.value?.focus());
    }

    // Wird das Fenster breiter, ist die Leiste wieder fest eingeblendet
    function onNarrowChange(e) {
      if (!e.matches) isRailOpen.value = false;
    }

    // Reiter der Detailansicht: Pfeiltasten, Pos1 und Ende wechseln den Reiter (WAI-ARIA Tabs)
    function onTabsKeydown(e) {
      const tabs = [...e.currentTarget.querySelectorAll('[role="tab"]')];
      const idx = tabs.indexOf(document.activeElement);
      if (idx === -1) return;
      let next;
      if (e.key === 'ArrowRight') next = (idx + 1) % tabs.length;
      else if (e.key === 'ArrowLeft') next = (idx - 1 + tabs.length) % tabs.length;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = tabs.length - 1;
      else return;
      e.preventDefault();
      tabs[next].focus();
      tabs[next].click();
    }

    // → klappt die Unteranforderungen der gewählten Anforderung auf, ← klappt sie zu bzw. springt zur übergeordneten
    // (wie in einem Baum); liefert true, wenn etwas geschehen ist
    function stepTree(open) {
      const ctrl = selectedControl.value;
      if (!ctrl || detailScope.value || listViewMode.value !== 'tree') return false;
      const key = 'ctrl_' + ctrl.id;
      const hasChildren = ctrl.subcontrols?.length > 0;
      if (open) {
        if (!hasChildren || expandedKeys.value.has(key)) return false;
        toggleControlExpand(ctrl.id);
        return true;
      }
      if (hasChildren && expandedKeys.value.has(key)) {
        toggleControlExpand(ctrl.id);
        return true;
      }
      const parent = ctrl.parentControlId && activeCatalog.value?.controlMap.get(ctrl.parentControlId);
      if (!parent) return false;
      selectControl(parent);
      return true;
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

    function applyFontScale(value) {
      document.documentElement.style.setProperty('--font-scale', String(value));
    }

    function setFontScale(value) {
      fontScale.value = value;
      applyFontScale(value);
      saveSetting('font_scale', value);
      nextTick(updateFooterCompact);
    }

    function applyHighContrast(val) {
      document.documentElement.classList.toggle('hc', Boolean(val));
    }

    function toggleHighContrast() {
      isHighContrast.value = !isHighContrast.value;
      applyHighContrast(isHighContrast.value);
      saveSetting('high_contrast', isHighContrast.value);
    }

    function openCatalogDialog() {
      isCatalogModalOpen.value = true;
    }

    // Nach dem Laden zurück zur Katalogliste (über "Kataloge") oder direkt in den Katalog (Startseite)
    let loadReturnToList = true;
    function openLoadDialog(returnToList = true) {
      loadReturnToList = returnToList;
      importError.value = '';
      loadNotice.value = '';
      importUrlInput.value = '';
      loadFile.value = null;
      isLoadModalOpen.value = true;
    }

    function closeLoadDialog() {
      if (importLoading.value) return;
      isLoadModalOpen.value = false;
    }

    // Datei und URL schließen sich aus: geladen wird, was zuletzt angegeben wurde
    function selectLoadFile(file) {
      if (!file) return;
      loadFile.value = file;
      importUrlInput.value = '';
      importError.value = '';
      loadNotice.value = '';
    }

    function onLoadFileSelected(e) {
      selectLoadFile(e.target.files?.[0]);
    }

    function onLoadFileDrop(e) {
      e.preventDefault();
      selectLoadFile(e.dataTransfer?.files?.[0]);
    }

    function submitLoadDialog() {
      if (importLoading.value) return;
      if (loadFile.value) {
        readFile(loadFile.value);
      } else if (importUrlInput.value.trim()) {
        fetchFromUrl(importUrlInput.value.trim());
      } else {
        importError.value = 'Bitte eine URL angeben oder eine Datei auswählen.';
      }
    }

    // Offiziellen Katalog aus der Stand-der-Technik-Bibliothek des BSI laden (Dialog "Katalog laden")
    function loadOfficialCatalog() {
      fetchFromUrl(PRESET_CATALOG_URL, 'BSI Stand-der-Technik-Bibliothek (GitHub)');
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
      treeKeysBeforeFilter = null;
      viewModeBeforeFilter = null;
      railCollapsed.value = { ...RAIL_COLLAPSED_DEFAULT };
      collapseAll();
      detailScope.value = null;
      selectedControlId.value = '';
    }

    /**
     * Zeigt einen Katalog an, optional verglichen mit einem älteren Stand. Beide werden frisch geparst, der
     * Vergleich wird auf den angezeigten Katalog übertragen (applyDiff); die gespeicherten Daten bleiben unberührt.
     * resetView: Ansicht für neue Daten zurücksetzen (siehe resetViewForNewData)
     */
    async function showCatalogs(activeId, comparisonId = '', { resetView = false } = {}) {
      if (comparisonId === activeId) comparisonId = '';
      const [record, comparisonRecord] = await Promise.all([
        getCatalogRecord(activeId),
        comparisonId ? getCatalogRecord(comparisonId) : null,
      ]);
      if (!record) throw new Error('Der Katalog ist nicht mehr gespeichert.');

      const catalog = parseOscalCatalog(record.catalogData);
      let comparison = null;
      let diff = null;
      if (comparisonRecord) {
        comparison = parseOscalCatalog(comparisonRecord.catalogData);
        diff = compareCatalogs(comparison, catalog);
        applyDiff(catalog, diff);
      }

      activeCatalog.value = catalog;
      activeRecordId.value = activeId;
      comparisonCatalog.value = comparison;
      comparisonRecordId.value = comparison ? comparisonId : '';
      diffSummary.value = diff;
      await Promise.all([
        saveSetting('last_active_catalog_id', activeId),
        saveSetting('comparison_catalog_id', comparisonRecordId.value),
      ]);

      // Ohne Unterschiede gibt es weder Änderungsfilter noch den Reiter "Änderungen"
      if (!diff?.hasDiff) {
        if (activeTags.value.some((t) => t.category === 'diff')) activeTags.value = activeTags.value.filter((t) => t.category !== 'diff');
        if (detailActiveTab.value === 'diff') detailActiveTab.value = 'overview';
      }
      // Keine automatische Auswahl: eine nicht (mehr) vorhandene Auswahl wird verworfen
      if (selectedControlId.value && !catalog.controlMap.has(selectedControlId.value)) {
        selectedControlId.value = '';
      }
      if (resetView) resetViewForNewData();
    }

    // Wechsel im Dialog "Kataloge"; Fehler erscheinen dort
    async function runCatalogChange(activeId, comparisonId) {
      catalogError.value = '';
      try {
        await showCatalogs(activeId, comparisonId);
        startupError.value = '';
      } catch (err) {
        console.error('Katalogwechsel fehlgeschlagen:', err);
        catalogError.value = `Der Katalog lässt sich nicht öffnen: ${err.message || err}`;
      }
    }

    // Probiert [angezeigt, Vergleich]-Paare der Reihe nach, bis sich eines öffnen lässt. Liefert den letzten Fehler,
    // wenn keines geht; dann ist kein Katalog angezeigt (Startseite).
    async function showFirstOpenable(attempts, options = {}) {
      let lastError = null;
      for (const [activeId, comparisonId] of attempts) {
        try {
          await showCatalogs(activeId, comparisonId, options);
          return null;
        } catch (err) {
          console.error('Katalog konnte nicht geöffnet werden:', err);
          lastError = err;
        }
      }
      clearShownCatalog();
      return lastError;
    }

    function clearShownCatalog() {
      activeCatalog.value = null;
      activeRecordId.value = '';
      comparisonCatalog.value = null;
      comparisonRecordId.value = '';
      diffSummary.value = null;
      selectedControlId.value = '';
      saveSetting('last_active_catalog_id', '').catch(() => {});
      saveSetting('comparison_catalog_id', '').catch(() => {});
    }

    // Angezeigten Katalog wählen; war er der Vergleichsstand, tauschen beide die Rollen
    function chooseActiveCatalog(id) {
      if (id === activeRecordId.value && activeCatalog.value) return;
      const comparisonId = comparisonRecordId.value === id ? activeRecordId.value : comparisonRecordId.value;
      return runCatalogChange(id, comparisonId);
    }

    // Vergleichsstand wählen; ein weiterer Klick auf den gewählten hebt den Vergleich auf
    function chooseComparisonCatalog(id) {
      if (id === activeRecordId.value || !activeCatalog.value) return;
      return runCatalogChange(activeRecordId.value, comparisonRecordId.value === id ? '' : id);
    }

    // Katalog über eine URL laden (Dialog "Katalog laden")
    async function fetchFromUrl(targetUrl, presetName = '') {
      importError.value = '';
      loadNotice.value = '';
      importLoading.value = true;
      try {
        let jsonData;
        try {
          const res = await fetch(targetUrl, { headers: { Accept: 'application/json' } });
          if (!res.ok) throw new Error(`HTTP-Fehler ${res.status}${res.statusText ? ': ' + res.statusText : ''}`);
          jsonData = await res.json();
        } catch (err) {
          console.error('Fetch error:', err);
          importError.value = `Fehler beim Abrufen der URL: ${err.message || err}. (Prüfen Sie ggf. die Internetverbindung oder nutzen Sie den Datei-Upload).`;
          return;
        }
        await processImportedJson(jsonData, 'url', presetName || targetUrl);
      } catch (err) {
        console.error('Import error:', err);
        importError.value = `Der Katalog konnte nicht gespeichert werden: ${err.message || err}`;
      } finally {
        importLoading.value = false;
      }
    }

    async function readFile(file) {
      importError.value = '';
      loadNotice.value = '';
      importLoading.value = true;
      try {
        let jsonData;
        try {
          jsonData = JSON.parse(await file.text());
        } catch (err) {
          importError.value = `Die Datei ist keine gültige JSON-Datei: ${err.message}`;
          return;
        }
        await processImportedJson(jsonData, 'upload', file.name);
      } catch (err) {
        console.error('Import error:', err);
        importError.value = `Der Katalog konnte nicht gespeichert werden: ${err.message || err}`;
      } finally {
        importLoading.value = false;
      }
    }

    // SHA-256 über den Katalog-Inhalt; unabhängig von Formatierung und Quelle der Datei
    async function hashCatalog(jsonData) {
      const bytes = new TextEncoder().encode(JSON.stringify(jsonData));
      const digest = await crypto.subtle.digest('SHA-256', bytes);
      return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
    }

    // Prüft, speichert und zeigt einen geladenen Katalog. Gespeichert wird nur, was sich auch öffnen lässt.
    async function processImportedJson(jsonData, sourceType, sourceName) {
      let parsed;
      try {
        parsed = parseOscalCatalog(jsonData);
      } catch (err) {
        importError.value = `Die Datei enthält keinen lesbaren OSCAL-Katalog: ${err.message}`;
        return;
      }
      if (parsed.allControls.length === 0) {
        importError.value = 'Die Datei enthält keinen OSCAL-Katalog mit Anforderungen.';
        return;
      }

      const catObj = jsonData.catalog || jsonData;
      const catTitle = catObj.metadata?.title || sourceName;
      const catVersion = catObj.metadata?.version || catObj.metadata?.['last-modified'] || '';
      const contentHash = await hashCatalog(jsonData);

      // Dublettenprüfung: identischer Inhalt ist bereits gespeichert
      await refreshStoredCatalogs();
      let duplicate = null;
      for (const rec of storedCatalogs.value) {
        if ((rec.contentHash || (await hashCatalog(rec.catalogData))) === contentHash) {
          duplicate = rec;
          break;
        }
      }

      // Aus dem Dialog "Katalog laden": Hinweis dort anzeigen, nichts laden
      if (duplicate && isLoadModalOpen.value) {
        loadNotice.value = `Dieser Katalog ist bereits geladen: „${duplicate.title}“, importiert ${formatDate(duplicate.importedAt)}.`;
        return;
      }

      let newId;
      if (duplicate) {
        newId = duplicate.id;
      } else {
        newId = crypto.randomUUID();
        await saveCatalogRecord({
          id: newId,
          title: catTitle,
          version: catVersion,
          sourceType,
          sourceName,
          importedAt: new Date().toISOString(),
          contentHash,
          catalogData: jsonData,
        });
        await refreshStoredCatalogs();
      }

      // Neue Daten: der Katalog wird ohne Vergleich angezeigt (den Vergleich wählt man im Dialog "Kataloge")
      await showCatalogs(newId, '', { resetView: true });
      startupError.value = '';

      const fromLoadDialog = isLoadModalOpen.value;
      isLoadModalOpen.value = false;
      isCatalogModalOpen.value = fromLoadDialog && loadReturnToList;
    }

    function selectControl(ctrl) {
      if (!ctrl) return;
      detailScope.value = null;
      selectedControlId.value = ctrl.id;

      expandPathTo(ctrl);
      scheduleSaveCollapse();
      scrollSelectedIntoView();
    }

    // Klappt den Weg zu einer Anforderung auf (Praktik, Teilbereich, übergeordnete Anforderungen) und ihre Unteranforderungen
    function expandPathTo(ctrl) {
      let changedKeys = false;
      // Auto-expand control if it has subcontrols so they are immediately visible
      if (ctrl.subcontrols && ctrl.subcontrols.length > 0) {
        if (!expandedKeys.value.has('ctrl_' + ctrl.id)) {
          expandedKeys.value.add('ctrl_' + ctrl.id);
          changedKeys = true;
        }
      }
      // Unteranforderung: alle übergeordneten Anforderungen aufklappen
      for (const ancestor of controlAncestors(ctrl)) {
        if (!expandedKeys.value.has('ctrl_' + ancestor.id)) {
          expandedKeys.value.add('ctrl_' + ancestor.id);
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

    function toggleTag(category, value, targetMode = 'include', label = '', categoryLabel = '') {
      const key = `${category}:${value}`;
      const idx = activeTags.value.findIndex((t) => t.category === category && t.value === value);
      if (idx >= 0) {
        const current = activeTags.value[idx];
        if (current.mode === targetMode) {
          activeTags.value.splice(idx, 1);
          return;
        } else {
          current.mode = targetMode;
          return;
        }
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

    function removeTag(category, value) {
      const idx = activeTags.value.findIndex((t) => t.category === category && t.value === value);
      if (idx >= 0) {
        activeTags.value.splice(idx, 1);
      }
    }

    function removeChip(chip) {
      if (chip.type === 'search') {
        filters.value.searchQuery = '';
      } else if (chip.type === 'subgroup') {
        filters.value.subgroupFilter = '';
      } else if (chip.type === 'control') {
        filters.value.controlFilter = '';
      } else if (chip.type === 'facet') {
        // Ein Chip fasst alle Werte eines Bereichs im selben Modus zusammen
        activeTags.value = activeTags.value.filter((t) => !(t.category === chip.category && t.mode === chip.mode));
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

    function resetFilters() {
      filters.value.searchQuery = '';
      filters.value.subgroupFilter = '';
      filters.value.controlFilter = '';
      activeTags.value = [];
      scheduleSaveFilters();
    }

    // ---------- Eigene Listen ----------

    async function loadLists() {
      try {
        const [storedLists, storedEntries] = await Promise.all([getAllLists(), getAllListEntries()]);
        lists.value = storedLists;
        listEntries.value = Object.fromEntries(storedEntries.map((e) => [e.key, e]));
        const savedActive = await getSetting('active_list_id', '');
        activeListId.value = storedLists.some((l) => l.id === savedActive) ? savedActive : '';
        if (!activeListId.value && storedLists.length === 1) activeListId.value = storedLists[0].id;
      } catch (err) {
        console.warn('Fehler beim Laden der Listen:', err);
      }
    }

    // Filter auf Listen, die es nicht mehr gibt, verwerfen
    function dropUnknownListTags() {
      const ids = new Set(lists.value.map((l) => l.id));
      if (activeTags.value.some((t) => t.category === 'list' && !ids.has(t.value))) {
        activeTags.value = activeTags.value.filter((t) => t.category !== 'list' || ids.has(t.value));
      }
    }

    let listNoticeTimer = null;
    function showListNotice(text) {
      listNotice.value = text;
      clearTimeout(listNoticeTimer);
      listNoticeTimer = setTimeout(() => {
        listNotice.value = '';
      }, 6000);
    }

    // Browser bitten, die Daten nicht bei Platzmangel zu räumen
    function requestPersistentStorage() {
      navigator.storage?.persist?.().catch(() => {});
    }

    function setActiveList(id) {
      if (activeListId.value === id) {
        activeListId.value = '';
        return;
      }
      // Eine ausgeschlossene Liste kann nicht zugleich aktiv sein
      if (getTagMode('list', id) === 'exclude') removeTag('list', id);
      activeListId.value = id;
    }

    function startNewList() {
      listMenuId.value = '';
      railCollapsed.value.lists = false;
      listEdit.value = { id: '', name: '' };
      nextTick(() => document.querySelector('.list-edit input')?.focus());
    }

    function startRenameList(list) {
      listMenuId.value = '';
      listEdit.value = { id: list.id, name: list.name };
      nextTick(() => document.querySelector('.list-edit input')?.select());
    }

    function cancelListEdit() {
      listEdit.value = null;
    }

    async function commitListEdit() {
      const edit = listEdit.value;
      if (!edit) return;
      listEdit.value = null;
      const name = edit.name.trim();
      if (!name) return;
      const now = new Date().toISOString();
      const otherNames = lists.value.filter((l) => l.id !== edit.id).map((l) => l.name);
      try {
        if (!edit.id) {
          const list = { id: createListId(), name: uniqueListName(name, otherNames), createdAt: now, updatedAt: now };
          await saveListData([list]);
          lists.value = [...lists.value, list];
          activeListId.value = list.id;
          requestPersistentStorage();
        } else {
          const list = lists.value.find((l) => l.id === edit.id);
          if (!list || list.name === name) return;
          const renamed = { ...list, name: uniqueListName(name, otherNames), updatedAt: now };
          await saveListData([renamed]);
          lists.value = lists.value.map((l) => (l.id === renamed.id ? renamed : l));
          const tag = activeTags.value.find((t) => t.category === 'list' && t.value === renamed.id);
          if (tag) tag.label = renamed.name;
        }
      } catch (err) {
        showListNotice('Die Liste konnte nicht gespeichert werden.');
        console.warn('Fehler beim Speichern der Liste:', err);
      }
    }

    async function removeList(list) {
      listMenuId.value = '';
      const entries = Object.values(listEntries.value).filter((e) => e.listId === list.id);
      const withNote = entries.filter((e) => e.note?.trim()).length;
      if (entries.length > 0) {
        const detail =
          `${entries.length} ${entries.length === 1 ? 'Eintrag' : 'Einträgen'}` +
          (withNote ? `, davon ${withNote} mit Notiz,` : '');
        const confirmed = await askConfirm({
          title: 'Liste löschen?',
          message: `Die Liste „${list.name}“ mit ${detail} wird gelöscht.`,
          hint: 'Tipp: Über „Exportieren“ im Listenmenü sichern Sie die Liste vorher als Datei.',
          confirmLabel: 'Liste löschen',
          danger: true,
        });
        if (!confirmed) return;
      }
      for (const e of entries) {
        clearTimeout(pendingNoteSaves.get(e.key));
        pendingNoteSaves.delete(e.key);
      }
      try {
        await deleteList(list.id);
      } catch (err) {
        showListNotice('Die Liste konnte nicht gelöscht werden.');
        console.warn('Fehler beim Löschen der Liste:', err);
        return;
      }
      lists.value = lists.value.filter((l) => l.id !== list.id);
      listEntries.value = Object.fromEntries(Object.entries(listEntries.value).filter(([, e]) => e.listId !== list.id));
      removeTag('list', list.id);
      if (activeListId.value === list.id) activeListId.value = '';
      if (!activeListId.value && lists.value.length === 1) activeListId.value = lists.value[0].id;
    }

    // Filter auf eine Liste (✓ / ✕), wie bei den übrigen Facetten
    function toggleListFilter(list, mode) {
      toggleTag('list', list.id, mode, list.name, 'Liste');
    }

    // Notizen werden kurz nach dem Tippen gespeichert, je Eintrag entprellt
    const pendingNoteSaves = new Map();

    function persistEntry(key) {
      pendingNoteSaves.delete(key);
      const entry = listEntries.value[key];
      if (!entry) return;
      saveListData([], [{ ...entry }]).catch((err) => {
        showListNotice('Die Notiz konnte nicht gespeichert werden.');
        console.warn('Fehler beim Speichern der Notiz:', err);
      });
    }

    function flushNoteSaves() {
      for (const [key, timer] of pendingNoteSaves) {
        clearTimeout(timer);
        persistEntry(key);
      }
    }

    async function addEntry(listId, controlId, note = '') {
      const now = new Date().toISOString();
      const entry = { key: entryKey(listId, controlId), listId, controlId, note, createdAt: now, updatedAt: now };
      listEntries.value = { ...listEntries.value, [entry.key]: entry };
      try {
        await saveListData([], [{ ...entry }]);
      } catch (err) {
        showListNotice('Der Eintrag konnte nicht gespeichert werden.');
        console.warn('Fehler beim Speichern des Eintrags:', err);
      }
    }

    // Liefert die ID der Zielliste; ohne aktive Liste wird die Merkliste aktiviert bzw. angelegt
    function ensureWriteList() {
      if (activeListId.value) return activeListId.value;
      if (defaultList.value) {
        activeListId.value = defaultList.value.id;
        return activeListId.value;
      }
      const now = new Date().toISOString();
      const list = { id: createListId(), name: DEFAULT_LIST_NAME, createdAt: now, updatedAt: now };
      lists.value = [...lists.value, list];
      activeListId.value = list.id;
      railCollapsed.value.lists = false;
      requestPersistentStorage();
      saveListData([list]).catch((err) => {
        showListNotice('Die Merkliste konnte nicht gespeichert werden.');
        console.warn('Fehler beim Anlegen der Merkliste:', err);
      });
      return list.id;
    }

    // Stern: gewählte Anforderung in die Zielliste aufnehmen bzw. daraus entfernen
    async function toggleStar() {
      const ctrl = selectedControl.value;
      if (!ctrl) return;
      const listId = ensureWriteList();
      const key = entryKey(listId, ctrl.id);
      const existing = listEntries.value[key];
      if (!existing) {
        await addEntry(listId, ctrl.id);
        return;
      }
      if (
        existing.note?.trim() &&
        !(await askConfirm({
          title: 'Aus Liste entfernen?',
          message: `„${ctrl.id}“ wird aus der Liste „${activeList.value.name}“ entfernt. Die Notiz wird dabei gelöscht.`,
          confirmLabel: 'Entfernen',
          danger: true,
        }))
      ) {
        return;
      }
      clearTimeout(pendingNoteSaves.get(key));
      pendingNoteSaves.delete(key);
      const next = { ...listEntries.value };
      delete next[key];
      listEntries.value = next;
      try {
        await deleteListEntry(key);
      } catch (err) {
        console.warn('Fehler beim Entfernen aus der Liste:', err);
      }
    }

    function updateNote(text) {
      const ctrl = selectedControl.value;
      if (!ctrl) return;
      const listId = ensureWriteList();
      const key = entryKey(listId, ctrl.id);
      const entry = listEntries.value[key];
      if (!entry) {
        // Erste Eingabe nimmt die Anforderung in die Zielliste auf
        addEntry(listId, ctrl.id, text);
        return;
      }
      entry.note = text;
      entry.updatedAt = new Date().toISOString();
      clearTimeout(pendingNoteSaves.get(key));
      pendingNoteSaves.set(key, setTimeout(() => persistEntry(key), 400));
    }

    function downloadJson(data, fileName) {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    function exportList(list) {
      listMenuId.value = '';
      flushNoteSaves();
      downloadJson(buildListExport([list], Object.values(listEntries.value), APP_VERSION), listExportFileName(list.name));
    }

    function exportAllLists() {
      listMenuId.value = '';
      flushNoteSaves();
      downloadJson(buildListExport(sortedLists.value, Object.values(listEntries.value), APP_VERSION), listExportFileName());
    }

    function startListImport() {
      listMenuId.value = '';
      listImportInput.value?.click();
    }

    async function onListImportFile(e) {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;
      let imported;
      try {
        imported = parseListImport(JSON.parse(await file.text()));
      } catch (err) {
        showListNotice(err instanceof SyntaxError ? 'Die Datei ist keine gültige JSON-Datei.' : err.message);
        return;
      }
      if (imported.length === 0) {
        showListNotice('Die Datei enthält keine Listen.');
        return;
      }

      flushNoteSaves();
      const now = new Date().toISOString();
      const nextLists = [...lists.value];
      const nextEntries = { ...listEntries.value };
      const changedLists = [];
      const changedEntries = [];
      let entryCount = 0;

      for (const incoming of imported) {
        const takenNames = nextLists.map((l) => l.name);
        const existing = nextLists.find((l) => l.name.toLocaleLowerCase('de') === incoming.name.toLocaleLowerCase('de'));
        // Zusammenführen, als Kopie anlegen oder den ganzen Import abbrechen (auch mit Esc)
        const choice = existing
          ? await askConfirm({
              title: 'Liste bereits vorhanden',
              message: `Die Liste „${existing.name}“ gibt es bereits. Sollen die Einträge zusammengeführt werden?`,
              hint: 'Unterschiedliche Notizen bleiben dabei beide erhalten.',
              confirmLabel: 'Zusammenführen',
              altLabel: `Als „${uniqueListName(incoming.name, takenNames)}“ anlegen`,
              cancelLabel: 'Import abbrechen',
            })
          : 'alt';
        if (!choice) {
          showListNotice('Import abgebrochen, es wurde nichts geändert.');
          return;
        }
        const merge = choice === true;
        let target;
        if (merge) {
          target = { ...existing, updatedAt: now };
          nextLists[nextLists.indexOf(existing)] = target;
        } else {
          target = {
            id: createListId(),
            name: uniqueListName(incoming.name, takenNames),
            createdAt: incoming.createdAt,
            updatedAt: now,
          };
          nextLists.push(target);
        }
        changedLists.push(target);

        for (const e of incoming.entries) {
          const key = entryKey(target.id, e.controlId);
          const prev = nextEntries[key];
          const entry = prev
            ? { ...prev, note: mergeNotes(prev.note, e.note), updatedAt: now }
            : { key, listId: target.id, controlId: e.controlId, note: e.note, createdAt: e.createdAt, updatedAt: e.updatedAt };
          nextEntries[key] = entry;
          changedEntries.push({ ...entry });
          entryCount++;
        }
      }

      try {
        await saveListData(changedLists, changedEntries);
      } catch (err) {
        showListNotice('Der Import konnte nicht gespeichert werden.');
        console.warn('Fehler beim Import der Listen:', err);
        return;
      }
      lists.value = nextLists;
      listEntries.value = nextEntries;
      if (!activeListId.value && nextLists.length === 1) activeListId.value = nextLists[0].id;
      railCollapsed.value.lists = false;
      requestPersistentStorage();
      showListNotice(
        `${imported.length} ${imported.length === 1 ? 'Liste' : 'Listen'} mit ${entryCount} ` +
          `${entryCount === 1 ? 'Eintrag' : 'Einträgen'} importiert.`
      );
    }

    function toggleListMenu(id) {
      listMenuId.value = listMenuId.value === id ? '' : id;
    }

    function closeListMenuOnOutsideClick(e) {
      if (listMenuId.value && !e.target.closest?.('.list-menu, .list-menu-btn')) listMenuId.value = '';
    }

    function secLevelDisplayLabel(lvl) {
      return definition('securityLevels', lvl) || (lvl === 'normal-SdT' ? 'Standard-Sicherheitsstufe' : (lvl === 'erhöht' ? 'Erhöhte Sicherheitsstufe' : (lvl || '')));
    }

    function onBreadcrumbClick(level, target, extra) {
      listViewMode.value = 'tree';
      scheduleSaveCollapse();
      if (level === 'practice') {
        navigateToPractice(target);
      } else if (level === 'subgroup') {
        navigateToSubgroup(target, extra);
      } else if (level === 'parent') {
        if (target) {
          selectControl(target);
        }
      }
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

    // Pfadleiste "Katalog": Auswahl aufheben, rechts erscheint die Übersicht über den Katalog
    function showCatalogOverview() {
      detailScope.value = null;
      selectedControlId.value = '';
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
        el?.scrollIntoView({ block: 'start', behavior: 'smooth' });
      });
    }

    function scrollSubgroupIntoView(subgroupId) {
      nextTick(() => {
        const el = listScroll.value?.querySelector(`[data-sub-id="${CSS.escape(subgroupId)}"]`);
        el?.scrollIntoView({ block: 'start', behavior: 'smooth' });
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
          for (const c of flattenControls(sub.controls)) {
            if (c.subcontrols?.length) s.add(`ctrl_${c.id}`);
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
      return flattenControls(sub.controls).filter((c) => filteredControlIds.value.has(c.id)).length;
    }

    // Sichtbar ist, was zu den Filtern passt, sowie eine Anforderung mit passenden Unteranforderungen (in beliebiger Tiefe)
    function isControlVisible(ctrl) {
      if (filteredControlIds.value.has(ctrl.id)) return true;
      return Boolean(ctrl.subcontrols?.some((sc) => isControlVisible(sc)));
    }

    // Zeilen der Baumansicht unterhalb eines Teilbereichs: sichtbare Anforderungen mit Tiefe, nur aufgeklappte Zweige
    function visibleControlRows(controls, depth = 0, out = []) {
      for (const ctrl of controls) {
        if (!isControlVisible(ctrl)) continue;
        out.push({ ctrl, depth });
        if (ctrl.subcontrols?.length && expandedKeys.value.has('ctrl_' + ctrl.id)) {
          visibleControlRows(ctrl.subcontrols, depth + 1, out);
        }
      }
      return out;
    }

    // Katalog löschen; war er angezeigt, rückt ein anderer nach (bevorzugt nicht der Vergleichsstand)
    async function deleteCatalog(cat) {
      const role =
        cat.id === activeRecordId.value
          ? ' Er wird gerade angezeigt.'
          : cat.id === comparisonRecordId.value
            ? ' Er ist gerade der Vergleichsstand.'
            : '';
      const confirmed = await askConfirm({
        title: 'Katalog löschen?',
        message: `„${cat.title}“${cat.version ? ` (${formatVersion(cat.version)})` : ''} wird aus Ihrem Browser gelöscht.${role}`,
        hint: 'Den offiziellen Katalog können Sie jederzeit neu laden.',
        confirmLabel: 'Katalog löschen',
        danger: true,
      });
      if (!confirmed) return;
      catalogError.value = '';
      try {
        await deleteCatalogRecord(cat.id);
        await refreshStoredCatalogs();
      } catch (err) {
        catalogError.value = `Der Katalog konnte nicht gelöscht werden: ${err.message || err}`;
        return;
      }

      const activeId = activeRecordId.value === cat.id ? '' : activeRecordId.value;
      const comparisonId = comparisonRecordId.value === cat.id ? '' : comparisonRecordId.value;
      if (activeId) {
        // Der angezeigte Katalog bleibt; ggf. endet nur der Vergleich
        if (comparisonId !== comparisonRecordId.value) await runCatalogChange(activeId, comparisonId);
        return;
      }
      // Ein anderer rückt nach: zuerst die übrigen Stände mit dem bisherigen Vergleich, zuletzt der Vergleichsstand selbst
      const others = storedCatalogs.value.filter((c) => c.id !== comparisonId).map((c) => [c.id, comparisonId]);
      const attempts = comparisonId ? [...others, [comparisonId, '']] : others;
      const err = await showFirstOpenable(attempts);
      startupError.value = '';
      if (err) catalogError.value = `Die übrigen Kataloge lassen sich nicht öffnen: ${err.message || err}`;
    }

    async function clearAll() {
      const listText = lists.value.length
        ? ` Dabei werden auch ${lists.value.length === 1 ? 'Ihre Liste' : `Ihre ${lists.value.length} Listen`} mit allen Notizen gelöscht.`
        : '';
      const confirmed = await askConfirm({
        title: 'Alle Daten löschen?',
        message: `Alle lokal gespeicherten Kataloge und Einstellungen werden gelöscht.${listText}`,
        hint: 'Dieser Schritt lässt sich nicht rückgängig machen.',
        confirmLabel: 'Alles löschen',
        danger: true,
      });
      if (confirmed) {
        pendingNoteSaves.forEach((timer) => clearTimeout(timer));
        pendingNoteSaves.clear();
        await clearAllData();
        lists.value = [];
        listEntries.value = {};
        activeListId.value = '';
        activeCatalog.value = null;
        activeRecordId.value = '';
        comparisonCatalog.value = null;
        comparisonRecordId.value = '';
        diffSummary.value = null;
        selectedControlId.value = '';
        startupError.value = '';
        expandedKeys.value = new Set();
        resetFilters();
        await refreshStoredCatalogs();
        isCatalogModalOpen.value = false;
        isDatenschutzModalOpen.value = false;
      }
    }

    // Resizer: Breite der Detailsicht in % des Split-Bereichs
    function setDetailPaneWidth(pct) {
      detailPaneWidth.value = Math.round(Math.max(DETAIL_PANE_MIN, Math.min(DETAIL_PANE_MAX, pct)) * 10) / 10;
    }

    // Pointer-Events decken Maus, Touch und Stift ab; die Pointer-Capture hält das Ziehen am Trenner
    function startResize(e) {
      const container = splitEl.value;
      if (!container || e.button !== 0) return;
      e.preventDefault();
      const handle = e.currentTarget;
      handle.setPointerCapture(e.pointerId);
      isResizing.value = true;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      const handleMove = (ev) => {
        const rect = container.getBoundingClientRect();
        setDetailPaneWidth(((rect.right - ev.clientX) / rect.width) * 100);
      };
      const stopResize = () => {
        isResizing.value = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        handle.removeEventListener('pointermove', handleMove);
        handle.removeEventListener('pointerup', stopResize);
        handle.removeEventListener('pointercancel', stopResize);
      };
      handle.addEventListener('pointermove', handleMove);
      handle.addEventListener('pointerup', stopResize);
      handle.addEventListener('pointercancel', stopResize);
    }

    // Tastatur am Trenner: Pfeiltasten 1 % (mit Umschalt 5 %), Pos1/Ende an die Grenzen
    function onResizerKeydown(e) {
      const step = e.shiftKey ? 5 : 1;
      if (e.key === 'ArrowLeft') setDetailPaneWidth(detailPaneWidth.value + step);
      else if (e.key === 'ArrowRight') setDetailPaneWidth(detailPaneWidth.value - step);
      else if (e.key === 'Home') setDetailPaneWidth(DETAIL_PANE_MAX);
      else if (e.key === 'End') setDetailPaneWidth(DETAIL_PANE_MIN);
      else return;
      e.preventDefault();
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

    // Wert einer Änderung (Reiter "Änderungen") so, wie ihn die Detailansicht zeigt
    function formatChangeValue(field, value) {
      if (value === '' || value === undefined || value === null) return '–';
      if (field === 'secLevel') return secLevelDisplayLabel(value);
      if (field === 'effortLevel') return `Stufe ${value}`;
      if (SECURITY_TARGETS.some((st) => st.key === field)) return `${value} (${securityTargetLevelLabel(value)})`;
      return value;
    }

    // Kurzbezeichnung eines gespeicherten Katalogs (Hinweisbalken im Vergleich): der Stand, sonst der Titel
    function catalogLabel(id) {
      const rec = storedCatalogs.value.find((c) => c.id === id);
      if (!rec) return '';
      return rec.version ? formatVersion(rec.version) : rec.title;
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
      const escapedVerb = modalVerb.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return safe.replace(new RegExp(`\\b(${escapedVerb})\\b`, 'g'), `<mark class="${key}">$1</mark>`);
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
      footerLeft,
      lists,
      sortedLists,
      activeListId,
      activeList,
      writeList,
      listMarks,
      notesViewListId,
      notesViewOptions,
      notesViewList,
      notesViewEntry,
      listEdit,
      listImportInput,
      listMenuId,
      listNotice,
      listCounts,
      selectedStarState,
      selectedStarTitle,
      selectedNoteState,
      setActiveList,
      startNewList,
      startRenameList,
      cancelListEdit,
      commitListEdit,
      removeList,
      toggleListFilter,
      toggleStar,
      updateNote,
      exportList,
      exportAllLists,
      startListImport,
      onListImportFile,
      toggleListMenu,
      activeCatalog,
      activeRecordId,
      comparisonCatalog,
      comparisonRecordId,
      diffSummary,
      storedCatalogs,
      selectedControlId,
      selectedControl,
      ancestorControls,
      baseControlForDiff,
      statementDiffTokens,
      guidanceDiffTokens,

      // UI
      isCatalogModalOpen,
      openCatalogDialog,
      isLoadModalOpen,
      openLoadDialog,
      closeLoadDialog,
      loadFile,
      onLoadFileSelected,
      onLoadFileDrop,
      submitLoadDialog,
      loadOfficialCatalog,
      presetCatalogUrlDisplay: decodeURIComponent(PRESET_CATALOG_URL),
      isImpressumModalOpen,
      isDatenschutzModalOpen,
      isLicenseModalOpen,
      confirmState,
      confirmDialogEl,
      onConfirmDialogClose,
      isDarkMode,
      isLoadingInitial,
      detailPaneWidth,
      DETAIL_PANE_MIN,
      DETAIL_PANE_MAX,
      onResizerKeydown,
      isRailOpen,
      railToggleBtn,
      railCloseBtn,
      openRail,
      closeRail,
      onTabsKeydown,
      isResizing,
      isDragOver,
      detailActiveTab,
      searchInput,
      splitEl,
      listScroll,
      detailBody,
      expandedKeys,

      // Import Modal
      importUrlInput,
      importLoading,
      importError,
      loadNotice,
      PRESET_CATALOG_URL,

      // Filters & Tags
      filters,
      activeTags,
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
      selectionFilteredOut,
      SECURITY_TARGETS,
      hasSecurityTargets,
      centralSecurityTargets,
      securityTargetLevelLabel,
      definition,
      namespaceEntry,
      shortDefinition,
      threatCounts,
      diffCounts,
      displayedThreatOptions,
      threatRailSearch,
      railOnlyMatching,
      railRowVisible,
      railSectionEmpty,
      allCatalogTags,
      tagCounts,
      tagRailSearch,
      displayedTagOptions,
      tagDefinition,
      railCollapsed,
      filteredControlIds,
      allActiveChips,
      hasActiveFilters,

      // Tag Helpers
      getTagMode,
      isTagActive,
      toggleTag,
      removeTag,
      activeTagCountFor,
      removeChip,

      // Actions
      applyDarkMode,
      toggleDarkMode,
      isHighContrast,
      toggleHighContrast,
      FONT_SCALES,
      fontScale,
      setFontScale,
      chooseActiveCatalog,
      catalogLabel,
      catalogMeta,
      activeRowId,
      showCatalogOverview,
      hiddenSelectionLabel,
      formatChangeValue,
      chooseComparisonCatalog,
      startupError,
      catalogError,
      fetchFromUrl,
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
      PROJECT_URL,
      manualUrl: `${MANUAL_PATH}${APP_VERSION}.pdf`,
      toggleControlExpand,
      filterByThreat,
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
      visibleControlRows,
      deleteCatalog,
      clearAll,
      startResize,
      formatDate,
      formatVersion,
      highlightProse,
      splitThreat,
      listViewMode,
      flatFilteredControls,
      secLevelDisplayLabel,
      onBreadcrumbClick,
      verbKey,
      diffLabel,
    };
  },
});

// Modaler Dialog für <dialog v-if="…" v-modal="schließen">: öffnet per showModal() (Fokusfalle, inerter Hintergrund),
// leitet Escape und Klick auf den Hintergrund an die Schließen-Funktion weiter und gibt den Fokus danach zurück
app.directive('modal', {
  mounted(el, { value }) {
    el._modalClose = value;
    el._modalReturnFocus = document.activeElement;
    el.addEventListener('cancel', (e) => {
      e.preventDefault();
      el._modalClose();
    });
    // Schließt der Browser den Dialog doch selbst (z. B. wiederholtes Escape), Zustand angleichen;
    // lehnt die Schließen-Funktion ab (Laden läuft), den Dialog wieder öffnen
    el.addEventListener('close', () => {
      el._modalClose();
      window.Vue.nextTick(() => {
        if (el.isConnected && !el.open) el.showModal();
      });
    });
    el.addEventListener('mousedown', (e) => {
      if (e.target === el) el._modalClose();
    });
    el.showModal();
  },
  updated(el, { value }) {
    el._modalClose = value;
  },
  unmounted(el) {
    const target = el._modalReturnFocus;
    if (target?.isConnected) target.focus();
  },
});

// Text eines contenteditable-Elements setzen, ohne die Cursorposition beim Tippen zu verlieren
function setPlainText(el, value) {
  if (document.activeElement === el) return;
  if (el.innerText !== value) el.textContent = value;
}
app.directive('plain-text', {
  mounted(el, { value }) {
    // Nach dem Löschen bleibt teils ein einzelnes <br> stehen; leeren, damit der Platzhalter (:empty) wieder greift
    el.addEventListener('input', () => { if (!el.textContent && el.firstChild) el.textContent = ''; }, true);
    setPlainText(el, value);
  },
  updated: (el, { value }) => setPlainText(el, value),
});

app.mount('#app');
