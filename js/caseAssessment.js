import { detectScenarios } from "./scenarioEngine.js";
import { extractFacts } from "./factExtractor.js";
import { assessOffences } from "./offenceEngine.js";

export const CASE_STORAGE_KEY = "samudraLex.cases";
let inMemoryCaseSequence = 0;

export function createCase(overrides = {}) {
  const now = new Date().toISOString();
  return {
    caseId: overrides.caseId || createCaseId(),
    createdAt: overrides.createdAt || now,
    updatedAt: now,
    vessel: {
      name: "",
      imoNumber: "",
      callSign: "",
      flag: "",
      vesselType: "",
      owner: "",
      ...overrides.vessel
    },
    incident: {
      dateTime: "",
      latitude: "",
      longitude: "",
      reportedLocation: "",
      activity: [],
      description: "",
      ...overrides.incident
    },
    jurisdiction: {
      maritimeZone: "",
      distanceFromBaseline: "",
      positionVerified: false,
      ...overrides.jurisdiction
    },
    licence: {
      required: null,
      produced: null,
      valid: null,
      verified: false,
      ...overrides.licence
    },
    permit: {
      required: null,
      produced: null,
      verified: false,
      ...overrides.permit
    },
    persons: {
      master: "",
      owner: "",
      crew: "",
      role: "",
      ...overrides.persons
    },
    conduct: {
      contravention: null,
      licenceViolation: null,
      permitViolation: null,
      failureToStop: null,
      obstruction: null,
      ...overrides.conduct
    },
    evidence: Array.isArray(overrides.evidence) ? overrides.evidence : [],
    assessment: overrides.assessment || {}
  };
}

export async function assessCase(caseData, offences = null, requirements = null) {
  const currentCase = createCase(caseData);
  const facts = buildFacts(currentCase);
  const scenarios = detectScenarios(currentCase.incident.description);
  const loadedOffences = offences || await loadJson("../data/offences/mzi-fishing-act-1981-offences.json");
  const loadedRequirements = requirements || [await loadJson("../data/requirements/mzi-fishing-act-1981-section-3.json")];
  const offenceRecords = Array.isArray(loadedOffences) ? loadedOffences : loadedOffences.offences || [];
  const requirementRecords = Array.isArray(loadedRequirements) ? loadedRequirements : [loadedRequirements];
  const offenceAssessment = assessOffences(facts, scenarios, requirementRecords, offenceRecords);
  const assessments = offenceAssessment.assessments.filter((assessment) => assessment.offenceId);
  const verificationRequired = assessments.flatMap((assessment) => assessment.verificationRequired || []);
  const evidenceGaps = verificationRequired.map((item) => ({
    ...item,
    evidenceStatus: findEvidenceStatus(currentCase.evidence, item.conditionId)
  }));
  const overallStatus = selectOverallStatus(assessments);
  const assessment = {
    overallStatus,
    offences: assessments,
    confirmedFacts: facts.facts || [],
    failedConditions: assessments.flatMap((item) => item.conditionsNotSatisfied || []),
    verificationRequired,
    evidenceGaps,
    legalBasis: assessments.flatMap((item) => item.legalBasis || []),
    decisionTrace: assessments.flatMap((item) => item.decisionTrace || []),
    reasons: assessments.map((item) => ({ offenceId: item.offenceId, status: item.status, reason: item.reason }))
  };
  return { ...currentCase, facts, scenarios, assessment };
}

export function buildFacts(caseData) {
  const facts = extractFacts(caseData.incident.description || "");
  if (Array.isArray(caseData.incident.activity) && caseData.incident.activity.length) {
    facts.activity = caseData.incident.activity;
  }
  if (caseData.jurisdiction.maritimeZone) {
    facts.location = { ...facts.location, maritimeZone: caseData.jurisdiction.maritimeZone };
  }
  if (caseData.conduct?.contravention !== null && caseData.conduct?.contravention !== undefined) {
    facts.legal = { ...(facts.legal || {}), section3Contravention: caseData.conduct.contravention };
  }
  if (caseData.persons.role) {
    facts.person = { ...(facts.person || {}), role: caseData.persons.role };
  }
  facts.conduct = { ...(caseData.conduct || {}) };
  facts.legal = {
    ...(facts.legal || {}),
    ...(caseData.conduct?.licenceViolation !== null && caseData.conduct?.licenceViolation !== undefined ? { licenceViolation: caseData.conduct.licenceViolation } : {}),
    ...(caseData.conduct?.permitViolation !== null && caseData.conduct?.permitViolation !== undefined ? { permitViolation: caseData.conduct.permitViolation } : {}),
    ...(caseData.conduct?.failureToStop !== null && caseData.conduct?.failureToStop !== undefined ? { failureToStop: caseData.conduct.failureToStop } : {}),
    ...(caseData.conduct?.obstruction !== null && caseData.conduct?.obstruction !== undefined ? { obstruction: caseData.conduct.obstruction } : {})
  };
  if (caseData.licence.produced === false) facts.documents = [...new Set([...(facts.documents || []), "licence not produced"])]
  if (caseData.permit.produced === false) facts.documents = [...new Set([...(facts.documents || []), "permit not produced"])]
  return facts;
}

export function saveCase(caseData, storage = globalThis.localStorage) {
  if (!storage) return false;
  const cases = readSavedCases(storage);
  const updated = createCase(caseData);
  const index = cases.findIndex((item) => item.caseId === updated.caseId);
  if (index === -1) cases.push(updated); else cases[index] = updated;
  storage.setItem(CASE_STORAGE_KEY, JSON.stringify(cases));
  return true;
}

export function loadCase(caseId, storage = globalThis.localStorage) {
  return readSavedCases(storage).find((item) => item.caseId === caseId) || null;
}

export function listSavedCases(storage = globalThis.localStorage) {
  return readSavedCases(storage);
}

function readSavedCases(storage) {
  if (!storage) return [];
  try {
    const value = JSON.parse(storage.getItem(CASE_STORAGE_KEY) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function createCaseId(storage = globalThis.localStorage) {
  const year = new Date().getFullYear();
  const key = "samudraLex.caseSequence";
  const next = storage
    ? Number(storage.getItem(key) || 0) + 1
    : ++inMemoryCaseSequence;
  storage?.setItem(key, String(next));
  return `SLX-${year}-${String(next).padStart(4, "0")}`;
}

async function loadJson(path) {
  const response = await fetch(new URL(path, import.meta.url));
  if (!response.ok) throw new Error(`Unable to load case data: ${path}`);
  return response.json();
}

function selectOverallStatus(assessments) {
  if (assessments.some((item) => item.status === "OFFENCE ESTABLISHED")) return "OFFENCE ESTABLISHED";
  if (assessments.some((item) => item.status === "SUSPECTED / REQUIRES FURTHER VERIFICATION")) return "SUSPECTED / REQUIRES FURTHER VERIFICATION";
  if (assessments.some((item) => item.status === "NOT ESTABLISHED")) return "NOT ESTABLISHED";
  return "SUSPECTED / REQUIRES FURTHER VERIFICATION";
}

function findEvidenceStatus(evidence, conditionId) {
  const linked = evidence.find((item) => item.relatedConditionId === conditionId);
  return linked ? (linked.verified ? "FACT CONFIRMED" : "EVIDENCE NOT VERIFIED") : "EVIDENCE NOT PROVIDED";
}
