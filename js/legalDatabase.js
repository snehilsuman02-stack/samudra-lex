export const LEGAL_SOURCE_TYPES = Object.freeze([
  "ACT",
  "RULE",
  "REGULATION",
  "NOTIFICATION",
  "ORDER",
  "BYLAW",
  "OTHER"
]);

export const LEGAL_SOURCE_STATUSES = Object.freeze([
  "CURRENT",
  "SUPERSEDED",
  "AMENDED",
  "REPEALED",
  "NOT_YET_EFFECTIVE",
  "UNKNOWN"
]);

export const LEGAL_VERIFICATION_STATUSES = Object.freeze([
  "VERIFIED",
  "PENDING_VERIFICATION",
  "SOURCE_NOT_CONFIRMED",
  "SUPERSEDED",
  "UNKNOWN"
]);

export const LEGAL_CATEGORIES = Object.freeze([
  "MARITIME",
  "SHIPPING",
  "FISHERIES",
  "CUSTOMS",
  "SMUGGLING",
  "IMMIGRATION",
  "FOREIGN_VESSELS",
  "POLLUTION",
  "MARINE_ENVIRONMENT",
  "WILDLIFE",
  "NARCOTICS",
  "ARMS",
  "DOCUMENTATION",
  "PORTS",
  "SAFETY",
  "SEARCH_AND_RESCUE",
  "SECURITY",
  "CRIMINAL_LAW",
  "OTHER"
]);

export const JURISDICTION_ZONE_CATEGORIES = Object.freeze([
  "BASELINE",
  "TERRITORIAL_WATERS",
  "CONTIGUOUS_ZONE",
  "EXCLUSIVE_ECONOMIC_ZONE",
  "CONTINENTAL_SHELF",
  "HIGH_SEAS",
  "PORT_HARBOR",
  "INTERNAL_WATERS",
  "OTHER"
]);

export const LEGAL_ELEMENT_TYPES = Object.freeze([
  "VESSEL_STATUS",
  "VESSEL_LOCATION",
  "MARITIME_ZONE",
  "ACTIVITY",
  "LICENCE",
  "PERMIT",
  "DOCUMENT",
  "PERSON",
  "CONDUCT",
  "TIME",
  "JURISDICTION",
  "OTHER"
]);

export function createLegalSourceRecord(overrides = {}) {
  return {
    source_id: "",
    source_type: "ACT",
    title: "",
    short_title: "",
    jurisdiction: "",
    issuing_authority: "",
    year: null,
    commencement_date: "",
    effective_from: "",
    effective_to: "",
    status: "CURRENT",
    source_reference: "",
    verification_status: "PENDING_VERIFICATION",
    version: "",
    notes: "",
    ...overrides
  };
}

export function createActRecord(overrides = {}) {
  return {
    act_id: "",
    legal_source_id: "",
    act_name: "",
    short_title: "",
    year: null,
    jurisdiction: "",
    subject_category: "OTHER",
    status: "CURRENT",
    commencement_date: "",
    effective_from: "",
    effective_to: "",
    source_reference: "",
    verification_status: "PENDING_VERIFICATION",
    notes: "",
    ...overrides
  };
}

export function createSectionRecord(overrides = {}) {
  return {
    section_id: "",
    act_id: "",
    section_number: "",
    subsection: "",
    clause: "",
    title: "",
    provision_text: "",
    offence_flag: false,
    penalty_flag: false,
    jurisdiction: "",
    effective_from: "",
    effective_to: "",
    source_reference: "",
    verification_status: "PENDING_VERIFICATION",
    notes: "",
    ...overrides
  };
}

export function createLegalElement(overrides = {}) {
  return {
    element_id: "",
    section_id: "",
    element_type: "OTHER",
    description: "",
    required: true,
    fact_type: "",
    verification_required: false,
    notes: "",
    ...overrides
  };
}

export function createFactRequirement(overrides = {}) {
  return {
    fact_requirement_id: "",
    section_id: "",
    fact_name: "",
    fact_type: "",
    required: true,
    status: "VERIFIED",
    verification_status: "PENDING_VERIFICATION",
    notes: "",
    ...overrides
  };
}

export function createEvidenceRequirement(overrides = {}) {
  return {
    evidence_requirement_id: "",
    section_id: "",
    element_id: "",
    fact_requirement_id: "",
    evidence_type: "OTHER",
    description: "",
    verification_status: "PENDING_VERIFICATION",
    notes: "",
    ...overrides
  };
}

export function createOffenceRecord(overrides = {}) {
  return {
    offence_id: "",
    section_id: "",
    offence_name: "",
    offence_description: "",
    offence_category: "OTHER",
    jurisdiction: "",
    penalty_reference: "",
    verification_required: false,
    status: "CURRENT",
    notes: "",
    ...overrides
  };
}

export function createPenaltyRecord(overrides = {}) {
  return {
    penalty_id: "",
    section_id: "",
    offence_id: "",
    penalty_type: "OTHER",
    minimum_penalty: "",
    maximum_penalty: "",
    imprisonment: "",
    fine: "",
    forfeiture: "",
    seizure: "",
    other_action: "",
    conditions: "",
    effective_from: "",
    effective_to: "",
    source_reference: "",
    verification_status: "PENDING_VERIFICATION",
    ...overrides
  };
}

export function createJurisdictionZone(overrides = {}) {
  return {
    zone_id: "",
    zone_category: "OTHER",
    name: "",
    jurisdiction: "",
    status: "CURRENT",
    notes: "",
    ...overrides
  };
}

export function createDatabaseSeed() {
  return {
    legal_sources: [],
    acts: [],
    sections: [],
    legal_elements: [],
    fact_requirements: [],
    evidence_requirements: [],
    offences: [],
    penalties: [],
    jurisdiction_zones: []
  };
}

export function normalizeSectionKey(sectionKey) {
  return String(sectionKey ?? "").trim().replace(/\s+/g, " ");
}

export function validateLegalDatabase(database) {
  const errors = [];
  const records = database && typeof database === "object" ? database : {};

  const legalSources = Array.isArray(records.legal_sources) ? records.legal_sources : [];
  const acts = Array.isArray(records.acts) ? records.acts : [];
  const sections = Array.isArray(records.sections) ? records.sections : [];
  const legalElements = Array.isArray(records.legal_elements) ? records.legal_elements : [];
  const factRequirements = Array.isArray(records.fact_requirements) ? records.fact_requirements : [];
  const evidenceRequirements = Array.isArray(records.evidence_requirements) ? records.evidence_requirements : [];
  const offences = Array.isArray(records.offences) ? records.offences : [];
  const penalties = Array.isArray(records.penalties) ? records.penalties : [];
  const zones = Array.isArray(records.jurisdiction_zones) ? records.jurisdiction_zones : [];

  const seenLegalSources = new Set();
  legalSources.forEach((source, index) => {
    const prefix = `legal_sources[${index}]`;
    if (!source || typeof source !== "object") return errors.push(`${prefix} must be an object`);
    if (!source.source_id) errors.push(`${prefix}.source_id is required`);
    if (seenLegalSources.has(source.source_id)) errors.push(`${prefix}.source_id is duplicated`);
    else if (source.source_id) seenLegalSources.add(source.source_id);
    if (!LEGAlSourceTypeValid(source.source_type)) errors.push(`${prefix}.source_type is invalid`);
    if (source.verification_status && !includesEnumValue(LEGAL_VERIFICATION_STATUSES, source.verification_status)) {
      errors.push(`${prefix}.verification_status is invalid`);
    }
    if (source.effective_from && !isValidDate(source.effective_from)) errors.push(`${prefix}.effective_from is not a valid ISO date`);
    if (source.effective_to && !isValidDate(source.effective_to)) errors.push(`${prefix}.effective_to is not a valid ISO date`);
  });

  const seenActs = new Set();
  acts.forEach((act, index) => {
    const prefix = `acts[${index}]`;
    if (!act || typeof act !== "object") return errors.push(`${prefix} must be an object`);
    if (!act.act_id) errors.push(`${prefix}.act_id is required`);
    if (seenActs.has(act.act_id)) errors.push(`${prefix}.act_id is duplicated`);
    else if (act.act_id) seenActs.add(act.act_id);
    if (act.legal_source_id && !seenLegalSources.has(act.legal_source_id)) {
      errors.push(`${prefix}.legal_source_id does not reference a legal source`);
    }
    if (act.verification_status && !includesEnumValue(LEGAL_VERIFICATION_STATUSES, act.verification_status)) {
      errors.push(`${prefix}.verification_status is invalid`);
    }
    if (act.effective_from && !isValidDate(act.effective_from)) errors.push(`${prefix}.effective_from is not a valid ISO date`);
    if (act.effective_to && !isValidDate(act.effective_to)) errors.push(`${prefix}.effective_to is not a valid ISO date`);
  });

  const seenSectionIds = new Set();
  const sectionNumberMap = new Map();
  sections.forEach((section, index) => {
    const prefix = `sections[${index}]`;
    if (!section || typeof section !== "object") return errors.push(`${prefix} must be an object`);
    if (!section.section_id) errors.push(`${prefix}.section_id is required`);
    if (seenSectionIds.has(section.section_id)) errors.push(`${prefix}.section_id is duplicated`);
    else if (section.section_id) seenSectionIds.add(section.section_id);
    if (!section.act_id) errors.push(`${prefix}.act_id is required`);
    if (section.act_id && !seenActs.has(section.act_id)) errors.push(`${prefix}.act_id does not reference an act`);
    if (!section.section_number) errors.push(`${prefix}.section_number is required`);
    const sectionKey = `${section.act_id || ""}|${normalizeSectionKey(section.section_number)}|${normalizeSectionKey(section.subsection || "")}|${normalizeSectionKey(section.clause || "")}`;
    if (sectionNumberMap.has(sectionKey)) errors.push(`${prefix} duplicates an existing section key for the same Act and provision`);
    sectionNumberMap.set(sectionKey, true);
    if (section.verification_status && !includesEnumValue(LEGAL_VERIFICATION_STATUSES, section.verification_status)) {
      errors.push(`${prefix}.verification_status is invalid`);
    }
    if (section.effective_from && !isValidDate(section.effective_from)) errors.push(`${prefix}.effective_from is not a valid ISO date`);
    if (section.effective_to && !isValidDate(section.effective_to)) errors.push(`${prefix}.effective_to is not a valid ISO date`);
  });

  legalElements.forEach((element, index) => {
    const prefix = `legal_elements[${index}]`;
    if (!element || typeof element !== "object") return errors.push(`${prefix} must be an object`);
    if (!element.element_id) errors.push(`${prefix}.element_id is required`);
    if (!element.section_id) errors.push(`${prefix}.section_id is required`);
    if (element.section_id && !seenSectionIds.has(element.section_id)) errors.push(`${prefix}.section_id does not reference a section`);
    if (element.element_type && !includesEnumValue(LEGAL_ELEMENT_TYPES, element.element_type)) errors.push(`${prefix}.element_type is invalid`);
  });

  factRequirements.forEach((item, index) => {
    const prefix = `fact_requirements[${index}]`;
    if (!item || typeof item !== "object") return errors.push(`${prefix} must be an object`);
    if (!item.fact_requirement_id) errors.push(`${prefix}.fact_requirement_id is required`);
    if (!item.section_id) errors.push(`${prefix}.section_id is required`);
    if (item.section_id && !seenSectionIds.has(item.section_id)) errors.push(`${prefix}.section_id does not reference a section`);
    if (item.verification_status && !includesEnumValue(LEGAL_VERIFICATION_STATUSES, item.verification_status)) errors.push(`${prefix}.verification_status is invalid`);
  });

  evidenceRequirements.forEach((item, index) => {
    const prefix = `evidence_requirements[${index}]`;
    if (!item || typeof item !== "object") return errors.push(`${prefix} must be an object`);
    if (!item.evidence_requirement_id) errors.push(`${prefix}.evidence_requirement_id is required`);
    if (!item.section_id) errors.push(`${prefix}.section_id is required`);
    if (item.section_id && !seenSectionIds.has(item.section_id)) errors.push(`${prefix}.section_id does not reference a section`);
    if (item.element_id && !legalElements.some((element) => element.element_id === item.element_id)) errors.push(`${prefix}.element_id does not reference a legal element`);
    if (item.fact_requirement_id && !factRequirements.some((requirement) => requirement.fact_requirement_id === item.fact_requirement_id)) errors.push(`${prefix}.fact_requirement_id does not reference a fact requirement`);
    if (item.verification_status && !includesEnumValue(LEGAL_VERIFICATION_STATUSES, item.verification_status)) errors.push(`${prefix}.verification_status is invalid`);
  });

  offences.forEach((offence, index) => {
    const prefix = `offences[${index}]`;
    if (!offence || typeof offence !== "object") return errors.push(`${prefix} must be an object`);
    if (!offence.offence_id) errors.push(`${prefix}.offence_id is required`);
    if (!offence.section_id) errors.push(`${prefix}.section_id is required`);
    if (offence.section_id && !seenSectionIds.has(offence.section_id)) errors.push(`${prefix}.section_id does not reference a section`);
    if (offence.status && !LEGAlSourceStatusValid(offence.status)) errors.push(`${prefix}.status is invalid`);
  });

  penalties.forEach((penalty, index) => {
    const prefix = `penalties[${index}]`;
    if (!penalty || typeof penalty !== "object") return errors.push(`${prefix} must be an object`);
    if (!penalty.penalty_id) errors.push(`${prefix}.penalty_id is required`);
    if (!penalty.section_id) errors.push(`${prefix}.section_id is required`);
    if (penalty.section_id && !seenSectionIds.has(penalty.section_id)) errors.push(`${prefix}.section_id does not reference a section`);
    if (penalty.offence_id && !offences.some((offence) => offence.offence_id === penalty.offence_id)) errors.push(`${prefix}.offence_id does not reference an offence`);
    if (penalty.verification_status && !includesEnumValue(LEGAL_VERIFICATION_STATUSES, penalty.verification_status)) errors.push(`${prefix}.verification_status is invalid`);
    if (penalty.effective_from && !isValidDate(penalty.effective_from)) errors.push(`${prefix}.effective_from is not a valid ISO date`);
    if (penalty.effective_to && !isValidDate(penalty.effective_to)) errors.push(`${prefix}.effective_to is not a valid ISO date`);
  });

  zones.forEach((zone, index) => {
    const prefix = `jurisdiction_zones[${index}]`;
    if (!zone || typeof zone !== "object") return errors.push(`${prefix} must be an object`);
    if (!zone.zone_id) errors.push(`${prefix}.zone_id is required`);
    if (zone.zone_category && !includesEnumValue(JURISDICTION_ZONE_CATEGORIES, zone.zone_category)) errors.push(`${prefix}.zone_category is invalid`);
    if (zone.status && !includesEnumValue(LEGAL_SOURCE_STATUSES, zone.status)) errors.push(`${prefix}.status is invalid`);
  });

  return {
    valid: errors.length === 0,
    errors
  };
}

function LEGAlSourceTypeValid(value) {
  return value === undefined || value === null || includesEnumValue(LEGAL_SOURCE_TYPES, value);
}

function LEGAlSourceStatusValid(value) {
  return value === undefined || value === null || includesEnumValue(LEGAL_SOURCE_STATUSES, value);
}

function includesEnumValue(enumValues, value) {
  if (value === undefined || value === null) return true;
  const normalizedValue = normalizeEnumToken(String(value));
  return enumValues.some((option) => normalizeEnumToken(option) === normalizedValue);
}

function normalizeEnumToken(value) {
  return String(value)
    .trim()
    .toUpperCase()
    .replace(/[_\-\s]+/g, "");
}

function isValidDate(value) {
  if (!value || typeof value !== "string") return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}
