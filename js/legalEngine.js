import { detectScenarios } from "./scenarioEngine.js";
import { loadCoastGuardAct, loadCoastGuardSection121 } from "./dataLoader.js";

export function createEmptyAnalysis(input, detectedScenario = []) {
  return {
    input,
    detectedScenario,
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

  analysis.legalSources = await searchLegalData(input);

  return analysis;
}

export async function searchLegalData(query) {
  const normalizedQuery = normalizeText(query);
  const queryTerms = normalizedQuery.split(" ").filter((term) => term.length >= 3);

  if (!queryTerms.length) {
    return [];
  }

  try {
    const [act, section] = await Promise.all([
      loadCoastGuardAct(),
      loadCoastGuardSection121()
    ]);

    if (act.status !== "VERIFIED_SOURCE" || section.status !== "VERIFIED_SOURCE") {
      return [];
    }

    const searchableText = normalizeText([
      act.actName,
      act.shortName,
      `section ${section.sectionNumber}`,
      section.title
    ].join(" "));

    if (!queryTerms.some((term) => searchableText.includes(term))) {
      return [];
    }

    return [{
      actName: act.actName,
      sectionNumber: section.sectionNumber,
      title: section.title,
      text: section.text,
      source: section.source,
      sourceUrl: section.sourceUrl,
      lastVerified: section.lastVerified
    }];
  } catch (error) {
    return [];
  }
}

function normalizeText(value) {
  return String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
}
