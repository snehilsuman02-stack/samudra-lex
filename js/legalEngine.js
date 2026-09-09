import { detectScenarios } from "./scenarioEngine.js";
import { extractFacts } from "./factExtractor.js";
import {
  loadCoastGuardAct,
  loadCoastGuardSection121,
  loadForeignFishingVesselScenario,
  loadForeignFishingAct,
  loadForeignFishingSection9,
  loadForeignFishingSection9Powers
} from "./dataLoader.js";

export function createEmptyAnalysis(input, detectedScenario = []) {
  return {
    input,
    detectedScenario,
    facts: extractFacts(input),
    jurisdictionConsiderations: [],
    applicableLaws: [],
    relevantSections: [],
    potentialPowers: [],
    conditions: [],
    procedures: [],
    evidence: [],
    handover: [],
    warnings: [],
    sources: [],
    legalSources: []
  };
}

export async function analyseSituation(userInput) {
  const input = String(userInput || "").trim();
  const detectedScenario = detectScenarios(input);
  const analysis = createEmptyAnalysis(input, detectedScenario);

  analysis.legalSources = await searchLegalData(input, detectedScenario);
  if (analysis.legalSources.some((source) => source.sectionId === "mz-fishing-foreign-vessels-section-9")) {
    analysis.potentialPowers = await loadForeignFishingSection9Powers();
  }

  return analysis;
}

export async function searchLegalData(query, detectedScenario = []) {
  const normalizedQuery = normalizeText(query);
  const queryTerms = normalizedQuery.split(" ").filter((term) => term.length >= 3);

  if (!queryTerms.length) {
    return [];
  }

  try {
    const [coastGuardAct, coastGuardSection, foreignFishingScenario, foreignFishingAct, foreignFishingSection] = await Promise.all([
      loadCoastGuardAct(),
      loadCoastGuardSection121(),
      loadForeignFishingVesselScenario(),
      loadForeignFishingAct(),
      loadForeignFishingSection9()
    ]);

    const sources = [];
    const scenarioLinked = detectedScenario.includes(foreignFishingScenario.id);
    const section9Terms = ["foreign", "fishing", "authorised", "officer", "maritime", "zones", "section", "arrest", "crew", "seize", "detain", "board", "search"];
    const section9SearchMatch = queryTerms.some((term) => section9Terms.includes(term));
    if (foreignFishingAct.status === "VERIFIED_SOURCE" && foreignFishingSection.status === "VERIFIED_SOURCE"
      && (scenarioLinked || section9SearchMatch)) {
      sources.push(toLegalSource(foreignFishingAct, foreignFishingSection));
    }

    const coastGuardSearchableText = normalizeText([
      coastGuardAct.actName,
      coastGuardAct.shortName,
      `section ${coastGuardSection.sectionNumber}`,
      coastGuardSection.title
    ].join(" "));
    const coastGuardMatch = queryTerms.some((term) => coastGuardSearchableText.includes(term));
    if (coastGuardAct.status === "VERIFIED_SOURCE" && coastGuardSection.status === "VERIFIED_SOURCE"
      && (scenarioLinked || coastGuardMatch)) {
      sources.push(toLegalSource(coastGuardAct, coastGuardSection));
    }

    return sources;
  } catch (error) {
    return [];
  }
}

function toLegalSource(act, section) {
  return {
    actId: act.id,
    sectionId: section.id,
    actName: act.actName,
    sectionNumber: section.sectionNumber,
    title: section.title,
    text: section.text,
    source: section.source,
    sourceUrl: section.sourceUrl,
    lastVerified: section.lastVerified
  };
}

function normalizeText(value) {
  return String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
}
