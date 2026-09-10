import { assessCase, buildFacts, createCase, listSavedCases, saveCase } from "./caseAssessment.js";

export async function runCaseAssessmentTests() {
  const offenceData = await loadJson(new URL("../data/offences/mzi-fishing-act-1981-offences.json", import.meta.url));
  const offence = offenceData.offences[0];
  const base = {
    incident: { description: "Foreign fishing vessel detected offshore, actively fishing." },
    jurisdiction: { maritimeZone: "territorial_waters", positionVerified: true },
    persons: { role: "master" },
    conduct: { contravention: true }
  };
  const established = await assessCase(createCase(base), [offence], []);
  assert(established.assessment.overallStatus === "OFFENCE ESTABLISHED", "complete case should establish the existing offence");
  assert(established.assessment.decisionTrace.length > 0, "decision trace should be preserved");

  const incomplete = await assessCase(createCase({ incident: { description: "Foreign fishing vessel detected offshore, actively fishing." } }), [offence], []);
  assert(incomplete.assessment.overallStatus === "SUSPECTED / REQUIRES FURTHER VERIFICATION", "incomplete case should require verification");
  assert(incomplete.assessment.verificationRequired.length > 0, "incomplete case should expose verification requirements");

  const licenceCase = createCase({
    ...base,
    licence: { required: true, produced: false, verified: false },
    conduct: { contravention: null }
  });
  const licenceFacts = buildFacts(licenceCase);
  assert(licenceFacts.documents.includes("licence not produced"), "licence not produced should remain a fact");
  const licenceAssessment = await assessCase(licenceCase, [offence], []);
  assert(licenceAssessment.assessment.overallStatus !== "OFFENCE ESTABLISHED", "licence absence must not establish an offence");

  const evidenceCase = createCase({
    incident: { description: "Foreign fishing vessel detected offshore, actively fishing." },
    persons: { role: "master" },
    conduct: { contravention: true },
    evidence: [{ evidenceId: "gps-1", type: "GPS / position data", description: "Position record", verified: false, relatedConditionId: "mzi-s10-element-maritime-zone" }]
  });
  const evidenceAssessment = await assessCase(evidenceCase, [offence], []);
  assert(evidenceAssessment.assessment.evidenceGaps.some((gap) => gap.evidenceStatus === "EVIDENCE NOT VERIFIED" || gap.evidenceStatus === "EVIDENCE NOT PROVIDED"), "unverified evidence must not prove a condition");

  const unknownRole = await assessCase(createCase({ ...base, persons: { role: "" } }), [offence], []);
  assert(unknownRole.assessment.overallStatus === "SUSPECTED / REQUIRES FURTHER VERIFICATION", "unknown role should require verification");

  const falseConduct = await assessCase(createCase({ ...base, conduct: { contravention: false } }), [offence], []);
  assert(falseConduct.assessment.overallStatus === "NOT ESTABLISHED", "confirmed false conduct should not establish the offence");

  const customAlternative = customOffence([
    { id: "a", required: false, alternativeGroup: "g", factKey: "conduct.first", operator: "TRUE", expectedValue: "" },
    { id: "b", required: false, alternativeGroup: "g", factKey: "conduct.second", operator: "TRUE", expectedValue: "" }
  ], [{ id: "g", operator: "ANY", elementIds: ["a", "b"] }]);
  const alternativeCase = await assessCase(createCase({ conduct: { first: false, second: true } }), [customAlternative], []);
  assert(alternativeCase.assessment.overallStatus === "OFFENCE ESTABLISHED", "alternative group success should establish the custom test offence");

  const unknownAlternativeCase = await assessCase(createCase({ conduct: { first: false } }), [customAlternative], []);
  assert(unknownAlternativeCase.assessment.overallStatus === "SUSPECTED / REQUIRES FURTHER VERIFICATION", "false plus unknown alternative should require verification");

  const duplicateVerificationOffences = [
    customOffence([{ id: "unknown-licence-a", required: true, description: "Licence status", factKey: "missingLicenceA", operator: "EXISTS", expectedValue: "" }]),
    customOffence([{ id: "unknown-licence-b", required: true, description: "Permit status", factKey: "missingPermitB", operator: "EXISTS", expectedValue: "" }])
  ];
  const duplicateVerificationCase = await assessCase(createCase(), duplicateVerificationOffences, []);
  const verificationActions = duplicateVerificationCase.assessment.verificationRequired.map((item) => item.action.toLowerCase().replace(/\s+/g, " ").trim());
  const evidenceGapActions = duplicateVerificationCase.assessment.evidenceGaps.map((item) => item.action.toLowerCase().replace(/\s+/g, " ").trim());
  assert(new Set(verificationActions).size === verificationActions.length, "verification requirements should be unique by normalized action");
  assert(new Set(evidenceGapActions).size === evidenceGapActions.length, "evidence gaps should be unique by normalized action");
  assert(duplicateVerificationCase.assessment.verificationRequired.length === 1, "equivalent licence and permit verification actions should be shown once");
  assert(duplicateVerificationCase.assessment.verificationRequired[0].conditionIds.length === 2, "merged verification should retain both source condition IDs");

  const offshoreNoLicence = await assessCase(createCase({
    incident: { description: "Foreign fishing vessel detected approximately 35 NM offshore. The vessel appears to be engaged in fishing and is unable to produce the required documents." },
    licence: { produced: false },
    permit: { produced: false }
  }));
  const scenarioVerificationActions = offshoreNoLicence.assessment.verificationRequired.map((item) => item.action.toLowerCase().replace(/\s+/g, " ").trim());
  const scenarioEvidenceGapActions = offshoreNoLicence.assessment.evidenceGaps.map((item) => item.action.toLowerCase().replace(/\s+/g, " ").trim());
  assert(new Set(scenarioVerificationActions).size === scenarioVerificationActions.length, "offshore no-licence verification requirements should be unique");
  assert(new Set(scenarioEvidenceGapActions).size === scenarioEvidenceGapActions.length, "offshore no-licence evidence gaps should be unique");

  const reassessmentStart = await assessCase(createCase({ ...base, jurisdiction: { maritimeZone: "" } }), [offence], []);
  const reassessmentEnd = await assessCase(createCase({ ...base, jurisdiction: { maritimeZone: "territorial_waters" } }), [offence], []);
  assert(reassessmentStart.assessment.overallStatus !== reassessmentEnd.assessment.overallStatus, "changing case inputs should recalculate the assessment");

  const verifiedEvidenceCase = await assessCase(createCase({
    ...base,
    evidence: [{ evidenceId: "position-1", type: "GPS / position data", description: "Verified position", verified: true, relatedConditionId: "mzi-s10-element-maritime-zone" }]
  }), [offence], []);
  assert(verifiedEvidenceCase.evidence.some((item) => item.verified), "verified evidence should remain in the saved case");

  const storage = createMemoryStorage();
  const saved = createCase({ incident: { description: "Saved case" } });
  saveCase(saved, storage);
  assert(listSavedCases(storage).length === 1, "saved case should be retained");
  const second = createCase({ incident: { description: "Second case" } });
  saveCase(second, storage);
  assert(listSavedCases(storage).length === 2, "new case should not overwrite an existing case");

  saveCase(established, storage);
  const retained = listSavedCases(storage).find((item) => item.caseId === established.caseId);
  assert(retained?.assessment?.overallStatus === established.assessment.overallStatus, "saved case should retain its assessment");

  return { passed: 19 };
}

function customOffence(elements, alternativeGroups = []) {
  return { id: "case-test-offence", name: "Case test offence", verified: true, actId: "test-act", sectionId: "test-section", sourceId: "test-source", elements, alternativeGroups };
}

function createMemoryStorage() {
  const values = new Map();
  return { getItem: (key) => values.get(key) || null, setItem: (key, value) => values.set(key, value) };
}

async function loadJson(url) {
  const response = await fetch(url.href || url);
  if (!response.ok) throw new Error(`Unable to load case test data: ${url}`);
  return response.json();
}

function assert(condition, message) {
  if (!condition) throw new Error(`Case assessment test failed: ${message}`);
}

if (typeof process !== "undefined" && process.argv[1]?.endsWith("caseAssessment.test.js")) {
  const nativeFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    if (String(url).startsWith("file:")) {
      const { readFile } = await import("node:fs/promises");
      const contents = await readFile(new URL(url), "utf8");
      return { ok: true, json: async () => JSON.parse(contents) };
    }
    return nativeFetch(url, options);
  };
  runCaseAssessmentTests()
    .then((result) => console.log(`CASE ASSESSMENT TESTS PASSED: ${result.passed}`))
    .catch((error) => {
      console.error("CASE ASSESSMENT TESTS FAILED");
      console.error(error.message);
      process.exitCode = 1;
    });
}
