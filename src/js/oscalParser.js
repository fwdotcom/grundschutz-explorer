/**
 * Pure JavaScript BSI OSCAL Parser (Zero-Build, Client-Side)
 * Strictly follows NIST OSCAL 1.1.3 & official BSI Grundschutz++ catalog schemas.
 */

import { lookupNamespace } from './namespaces.js';

// Offizielle Bezeichnung einer elementaren Gefährdung (Namespace basethreats.csv)
function canonicalThreatTitle(code) {
  return lookupNamespace('basethreats', code)?.Begriff || '';
}

/**
 * Normalizes threat code or string to canonical representation: e.g. "G 0.18: Fehlplanung oder fehlende Anpassung"
 */
export function formatBsiThreat(raw) {
  if (!raw || typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (trimmed.includes(':')) {
    const parts = trimmed.split(':');
    const code = parts[0].trim();
    const title = parts.slice(1).join(':').trim();
    const canonicalTitle = canonicalThreatTitle(code) || title;
    return `${code}: ${canonicalTitle}`;
  }
  const canonicalTitle = canonicalThreatTitle(trimmed);
  return canonicalTitle ? `${trimmed}: ${canonicalTitle}` : trimmed;
}

/**
 * Extracts and maps Elementare Gefährdungen from official BSI mapping collection.
 * Target control ID (e.g. 'GC.1.1' or 'ARCH.1.1.1') -> Array of unique Gefährdungen
 */
export function parseMappingCollection(rawJson) {
  const result = new Map();
  const mappings = rawJson?.['mapping-collection']?.mappings || rawJson?.mappings || [];

  for (const m of mappings) {
    const maps = m.maps || [];
    for (const entry of maps) {
      // Find elementare Gefährdungen in props
      const threatProps = (entry.props || []).filter(
        (p) => p.name === 'elementare_gefaehrdung' && typeof p.value === 'string'
      );
      if (threatProps.length === 0) continue;

      // Find target controls
      const targets = entry.targets || [];
      for (const target of targets) {
        const targetId = target['id-ref'] || target.idRef;
        if (!targetId) continue;

        if (!result.has(targetId)) {
          result.set(targetId, new Set());
        }
        const set = result.get(targetId);
        for (const tp of threatProps) {
          const formatted = formatBsiThreat(tp.value);
          if (formatted) set.add(formatted);
        }
      }
    }
  }

  // Convert Set to sorted Array
  const finalMap = new Map();
  result.forEach((val, key) => {
    finalMap.set(
      key,
      Array.from(val).sort((a, b) => a.localeCompare(b, 'de', { numeric: true }))
    );
  });

  return finalMap;
}

/**
 * Replaces parameter placeholders like {{ insert: param, gc.1.1-prm1 }} with resolved values
 */
export function resolveParamsInProse(prose, params = []) {
  if (!prose) return '';
  const paramMap = new Map();
  for (const p of params) {
    if (p.id) {
      const val = p.values && p.values.length > 0 ? p.values.join(', ') : p.label || p.id;
      paramMap.set(p.id.toLowerCase(), val);
    }
  }

  return prose.replace(/\{\{\s*insert:\s*param,\s*([^}\s]+)\s*\}\}/gi, (match, paramId) => {
    const lookup = paramMap.get(paramId.trim().toLowerCase());
    return lookup ? `[${lookup}]` : match;
  });
}

/**
 * Recursively parses an OSCAL control, including subcontrols (ctrl.controls)
 */
function parseControl(ctrl, groupPath, groupTitle, subgroupId, subgroupTitle, threatsMap, parentControlId = null) {
  const props = ctrl.props || [];
  const params = ctrl.params || [];
  const parts = ctrl.parts || [];

  const secLevel = props.find((p) => p.name === 'sec_level')?.value;
  const effortLevel = props.find((p) => p.name === 'effort_level')?.value;
  const altIdentifier = props.find((p) => p.name === 'alt-identifier')?.value;

  // Wirkung auf die Schutzziele (0 = keine, 1 = wirkt hin, 2 = im Zentrum), siehe security_targets_levels.csv
  const securityTarget = (name) => props.find((p) => p.name === name)?.value;
  const confidentiality = securityTarget('confidentiality');
  const integrity = securityTarget('integrity');
  const availability = securityTarget('availability');
  const authenticity = securityTarget('authenticity');

  // Statement part
  const statementPart = parts.find((p) => p.name === 'statement');
  const statementProps = statementPart?.props || [];
  let statementProse = statementPart?.prose || '';
  if (statementProse) {
    statementProse = resolveParamsInProse(statementProse, params);
  }

  const modalVerbRaw = statementProps.find((p) => p.name === 'modal_verb')?.value?.toUpperCase();
  let modalVerb = 'UNBEKANNT';
  if (modalVerbRaw === 'MUSS') modalVerb = 'MUSS';
  else if (modalVerbRaw === 'SOLLTE') modalVerb = 'SOLLTE';
  else if (modalVerbRaw === 'KANN') modalVerb = 'KANN';

  const actionWord = statementProps.find((p) => p.name === 'action_word')?.value;
  const result = statementProps.find((p) => p.name === 'result')?.value;
  const resultSpecification = statementProps.find((p) => p.name === 'result_specification')?.value;
  const documentation = statementProps.find((p) => p.name === 'documentation')?.value;

  // Guidance part
  const guidancePart = parts.find((p) => p.name === 'guidance');
  const guidanceProse = guidancePart?.prose || '';

  // Associated threats from BOTH external BSI mapping and control's own 'threats' property
  const threatSet = new Set();

  // 1. External mapping collection
  const mappedThreats = threatsMap?.get(ctrl.id) || [];
  for (const t of mappedThreats) {
    const formatted = formatBsiThreat(t);
    if (formatted) threatSet.add(formatted);
  }

  // 2. Direct OSCAL property on control
  const threatsProp = props.find((p) => p.name === 'threats')?.value;
  if (threatsProp) {
    const rawTokens = threatsProp.split(',').map((s) => s.trim()).filter(Boolean);
    for (const token of rawTokens) {
      const formatted = formatBsiThreat(token);
      if (formatted) threatSet.add(formatted);
    }
  }

  const elementareGefaehrdungen = Array.from(threatSet).sort((a, b) =>
    a.localeCompare(b, 'de', { numeric: true })
  );

  // Recursively parse child subcontrols if present (e.g. ARCH.1.1 -> ARCH.1.1.1, ARCH.1.1.2...)
  const subcontrols = [];
  if (ctrl.controls && ctrl.controls.length > 0) {
    for (const childCtrl of ctrl.controls) {
      subcontrols.push(
        parseControl(
          childCtrl,
          [...groupPath, ctrl.id],
          groupTitle,
          subgroupId,
          subgroupTitle,
          threatsMap,
          ctrl.id
        )
      );
    }
  }

  return {
    id: ctrl.id,
    title: ctrl.title || ctrl.id,
    class: ctrl.class,
    groupId: groupPath[0] || '',
    groupTitle,
    subgroupId,
    subgroupTitle,
    parentControlId,
    isSubcontrol: Boolean(parentControlId),
    subcontrols,
    groupPath,
    secLevel,
    effortLevel,
    confidentiality,
    integrity,
    availability,
    authenticity,
    altIdentifier,
    allProps: props,
    params,
    statementProse,
    modalVerb,
    actionWord,
    result,
    resultSpecification,
    documentation,
    guidanceProse,
    elementareGefaehrdungen,
  };
}

function parsePractice(group, threatsMap) {
  const practiceId = group.id;
  const practiceTitle = group.title;
  const labelProp = group.props?.find((p) => p.name === 'label');
  const remarks = labelProp?.remarks;

  const subgroups = [];
  const directControls = [];

  // Direct controls under practice
  if (group.controls && group.controls.length > 0) {
    for (const c of group.controls) {
      directControls.push(parseControl(c, [practiceId], practiceTitle, undefined, undefined, threatsMap, null));
    }
  }

  // Subgroups (e.g. GC.1, ARCH.1)
  if (group.groups && group.groups.length > 0) {
    for (const sub of group.groups) {
      const subLabel = sub.props?.find((p) => p.name === 'label')?.value;
      const subControls = [];

      if (sub.controls && sub.controls.length > 0) {
        for (const c of sub.controls) {
          subControls.push(
            parseControl(c, [practiceId, sub.id], practiceTitle, sub.id, sub.title, threatsMap, null)
          );
        }
      }

      subgroups.push({
        id: sub.id,
        title: sub.title,
        label: subLabel,
        controls: subControls,
      });
    }
  }

  // Flatten all controls belonging to this practice (including nested subcontrols)
  const allPracticeControls = [];
  function collectControls(ctrlList) {
    for (const c of ctrlList) {
      allPracticeControls.push(c);
      if (c.subcontrols && c.subcontrols.length > 0) {
        collectControls(c.subcontrols);
      }
    }
  }
  collectControls(directControls);
  for (const s of subgroups) {
    collectControls(s.controls);
  }

  return {
    id: practiceId,
    title: practiceTitle,
    label: labelProp?.value,
    remarks,
    subgroups,
    controls: allPracticeControls,
  };
}

export function parseOscalCatalog(rawJson, threatsMap) {
  if (!rawJson) {
    throw new Error('Ungültige JSON-Datei: Die Datei ist leer oder nicht definiert.');
  }

  const catalog = rawJson.catalog || rawJson;
  if (!catalog || (!catalog.groups && !catalog.controls && !catalog.metadata)) {
    throw new Error('Ungültiges Format: Kein gültiges OSCAL-Katalog-Objekt ("catalog") gefunden.');
  }

  const metadata = catalog.metadata || {};
  const uuid = catalog.uuid || metadata.uuid || crypto.randomUUID();
  const title = metadata.title || 'BSI IT-Grundschutz++ Katalog';
  const version = metadata.version || metadata['last-modified'] || '';
  const lastModified = metadata['last-modified'] || '';
  const oscalVersion = metadata['oscal-version'] || '1.1.3';
  const remarks = metadata.remarks || '';

  const practices = [];
  const rawGroups = catalog.groups || [];

  for (const g of rawGroups) {
    practices.push(parsePractice(g, threatsMap));
  }

  const allControls = [];
  const controlMap = new Map();

  for (const p of practices) {
    for (const c of p.controls) {
      allControls.push(c);
      controlMap.set(c.id, c);
    }
  }

  // Top level controls outside groups if any
  if (catalog.controls && catalog.controls.length > 0) {
    for (const c of catalog.controls) {
      if (!controlMap.has(c.id)) {
        const parsed = parseControl(c, ['GENERAL'], 'Allgemein', undefined, undefined, threatsMap, null);
        allControls.push(parsed);
        controlMap.set(c.id, parsed);
        if (parsed.subcontrols && parsed.subcontrols.length > 0) {
          for (const subc of parsed.subcontrols) {
            allControls.push(subc);
            controlMap.set(subc.id, subc);
          }
        }
      }
    }
  }

  return {
    uuid,
    title,
    version,
    lastModified,
    oscalVersion,
    remarks,
    practices,
    allControls,
    controlMap,
  };
}
