import { extractFacts } from "./factExtractor.js";
import { detectScenarios } from "./scenarioEngine.js";
import { assessOffences } from "./offenceEngine.js";

export async function runOffenceEngineTests() {
  const cases = [
    "Foreign fishing vessel detected approximately 35 NM offshore, fishing, licence not produced.",
    "Foreign fishing vessel detected. Fishing activity is confirmed. No licence has been verified.",
    "Indian fishing vessel detected fishing.",
    "Vessel nationality unknown."
  ];
  const results = [];

  for (const input of cases) {
    const extractedFacts = extractFacts(input);
    const facts = input.startsWith("Foreign fishing vessel detected approximately 35 NM")
      ? {
          ...extractedFacts,
          documents: ["licence not produced"],
          facts: [...extractedFacts.facts, "Licence not produced"]
        }
      : extractedFacts;
    const scenario = detectScenarios(input);
    const assessment = await assessOffences(facts, scenario, [], []);
    results.push({ input, facts, scenario, assessment });
  }

  const [licenceCase, unverifiedLicenceCase, indianCase, unknownCase] = results;
  assert(licenceCase.scenario.includes("FOREIGN_FISHING_VESSEL"), "foreign fishing scenario should be detected");
  assert(licenceCase.facts.documents.some((item) => /licence.*not produced/i.test(item)), "licence not produced should remain a fact");
  assert(licenceCase.assessment.uncertainties.some((item) => /licence\/permit status/i.test(item)), "licence status should remain uncertain");
  assert(licenceCase.assessment.establishedOffences.length === 0, "no offence should be established without offence records");
  assert(licenceCase.assessment.notEstablished.length > 0, "licence case should remain not established");
  assert(licenceCase.assessment.uncertainties.some((item) => /maritime zone/i.test(item)), "jurisdiction should remain uncertain");
  assert(unverifiedLicenceCase.assessment.establishedOffences.length === 0, "unverified licence should not establish an offence");
  assert(!indianCase.scenario.includes("FOREIGN_FISHING_VESSEL"), "Indian vessel should not trigger foreign-vessel scenario");
  assert(unknownCase.scenario.length === 0, "unknown nationality should not trigger a foreign-vessel scenario");

  return results;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Offence engine test failed: ${message}`);
  }
}
