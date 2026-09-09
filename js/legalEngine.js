import { detectScenarios } from "./scenarioEngine.js";

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
    sources: []
  };
}

export function analyseSituation(userInput) {
  const input = String(userInput || "").trim();
  const detectedScenario = detectScenarios(input);

  // Legal data remains empty until verified source material is added under data/.
  return createEmptyAnalysis(input, detectedScenario);
}
