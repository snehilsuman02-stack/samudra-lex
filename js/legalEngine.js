import { detectScenarios } from "./scenarioEngine.js";
import { loadCoastGuardSection121 } from "./dataLoader.js";

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

  if (/\b(?:coast guard powers|powers of coast guard members)\b/i.test(input)) {
    try {
      const section = await loadCoastGuardSection121();
      if (section.status === "VERIFIED_SOURCE") {
        analysis.legalSources.push(section);
      }
    } catch (error) {
      analysis.warnings.push("Verified legal source could not be loaded.");
    }
  }

  return analysis;
}
