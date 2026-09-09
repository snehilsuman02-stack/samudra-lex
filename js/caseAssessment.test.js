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

  const storage = createMemoryStorage();
  const saved = createCase({ incident: { description: "Saved case" } });
  saveCase(saved, storage);
  assert(listSavedCases(storage).length === 1, "saved case should be retained");
  const second = createCase({ incident: { description: "Second case" } });
  saveCase(second, storage);
  assert(listSavedCases(storage).length === 2, "new case should not overwrite an existing case");

  return { passed: 7 };
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
