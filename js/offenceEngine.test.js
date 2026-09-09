import { assessOffences } from "./offenceEngine.js";

const offenceDataUrl = new URL("../data/offences/mzi-fishing-act-1981-offences.json", import.meta.url);

export async function runOffenceEngineTests() {
  const offenceData = await loadJson(offenceDataUrl);
  const offence = offenceData.offences[0];
  const section15Offence = offenceData.offences.find((record) => record.sectionId === "mz-fishing-foreign-vessels-section-15");
  const tests = [
    {
      name: "unknown zone and contravention",
      facts: facts({ nationality: "Foreign", activity: ["fishing"], location: { mentioned: true, distanceNm: 35 }, person: {} }),
      expected: "SUSPECTED / REQUIRES FURTHER VERIFICATION"
    },
    {
      name: "false contravention",
      facts: facts({ nationality: "Foreign", activity: ["fishing"], location: { maritimeZone: "territorial_waters" }, legal: { section3Contravention: false }, person: { role: "master" } }),
      expected: "NOT ESTABLISHED"
    },
    {
      name: "territorial waters contravention by master",
      facts: facts({ nationality: "Foreign", activity: ["fishing"], location: { maritimeZone: "territorial_waters" }, legal: { section3Contravention: true }, person: { role: "master" } }),
      expected: "OFFENCE ESTABLISHED"
    },
    {
      name: "EEZ contravention by owner",
      facts: facts({ nationality: "Foreign", activity: ["fishing"], location: { maritimeZone: "EEZ" }, legal: { section3Contravention: true }, person: { role: "owner" } }),
      expected: "OFFENCE ESTABLISHED"
    },
    {
      name: "Indian vessel",
      facts: facts({ nationality: "Indian", activity: ["fishing"], location: { maritimeZone: "territorial_waters" }, legal: { section3Contravention: true }, person: { role: "master" } }),
      expected: "NOT ESTABLISHED"
    },
    {
      name: "licence not produced",
      facts: facts({ nationality: "Foreign", activity: ["fishing"], documents: ["licence not produced"], location: { mentioned: true, distanceNm: 35 }, person: { role: "master" } }),
      expected: "SUSPECTED / REQUIRES FURTHER VERIFICATION"
    },
    {
      name: "distance without maritime zone",
      facts: facts({ nationality: "Foreign", activity: ["fishing"], location: { mentioned: true, distanceNm: 35 }, legal: { section3Contravention: true }, person: { role: "master" } }),
      expected: "SUSPECTED / REQUIRES FURTHER VERIFICATION"
    }
  ];

  const results = tests.map((test) => {
    const assessment = assessOffences(test.facts, ["FOREIGN_FISHING_VESSEL"], [], [offence]);
    const actual = assessment.assessments[0]?.status;
    if (actual !== test.expected) {
      throw new Error(`${test.name}: expected ${test.expected}, received ${actual}`);
    }
    return { name: test.name, status: actual, uncertainties: assessment.uncertainties };
  });

  const roleTests = [
    ["role master", "master", "ESTABLISHED"],
    ["role owner", "owner", "ESTABLISHED"],
    ["role crew", "crew", "NOT_ESTABLISHED"],
    ["role absent", undefined, "UNKNOWN"]
  ];
  for (const [name, role, expected] of roleTests) {
    const roleFacts = facts({
      nationality: "Foreign",
      activity: ["fishing"],
      location: { maritimeZone: "territorial_waters" },
      legal: { section3Contravention: true },
      person: role === undefined ? {} : { role }
    });
    const assessment = assessOffences(roleFacts, ["FOREIGN_FISHING_VESSEL"], [], [offence]);
    const element = assessment.assessments[0]?.elements.find((item) => item.elementId === "mzi-s10-element-owner-or-master");
    if (element?.status !== expected) {
      throw new Error(`${name}: expected ${expected}, received ${element?.status}`);
    }
    results.push({ name, status: element.status });
  }

  const section15Tests = [
    ["section 15 licence requirement", { legal: { authorisedOfficer: true, authorisedOfficerRequirement: true, section15Conduct: { failureToProduceLicence: true } } }, "OFFENCE ESTABLISHED"],
    ["section 15 permit requirement", { legal: { authorisedOfficer: true, authorisedOfficerRequirement: true, section15Conduct: { failureToProducePermit: true } } }, "OFFENCE ESTABLISHED"],
    ["section 15 failure to stop", { legal: { authorisedOfficer: true, authorisedOfficerRequirement: true, section15Conduct: { failureToStop: true } } }, "OFFENCE ESTABLISHED"],
    ["section 15 obstruction", { legal: { authorisedOfficer: true, authorisedOfficerRequirement: true, section15Conduct: { obstruction: true } } }, "OFFENCE ESTABLISHED"],
    ["section 15 no officer requirement", { legal: { authorisedOfficer: true, authorisedOfficerRequirement: false, section15Conduct: { failureToProduceLicence: true } } }, "NOT ESTABLISHED"],
    ["section 15 unknown conduct", { legal: { authorisedOfficer: true, authorisedOfficerRequirement: true } }, "SUSPECTED / REQUIRES FURTHER VERIFICATION"],
    ["section 15 all conduct false", { legal: { authorisedOfficer: true, authorisedOfficerRequirement: true, section15Conduct: { obstruction: false, facilitiesOrSecurityFailure: false, failureToStop: false, failureToProduceLicence: false, failureToProducePermit: false, failureToProduceLogBook: false, failureToProduceOtherDocument: false, failureToProduceFish: false, failureToProduceNet: false, failureToProduceFishingGearOrEquipment: false } } }, "NOT ESTABLISHED"]
  ];
  for (const [name, values, expected] of section15Tests) {
    const assessment = assessOffences(facts({ nationality: "Foreign", activity: ["fishing"], ...values }), ["FOREIGN_FISHING_VESSEL"], [], [section15Offence]);
    const actual = assessment.assessments[0]?.status;
    if (actual !== expected) {
      throw new Error(`${name}: expected ${expected}, received ${actual}`);
    }
    results.push({ name, status: actual });
  }

  const malformedSection15 = {
    ...section15Offence,
    alternativeGroups: [{ id: "malformed", operator: "ANY", elementIds: ["missing-element"] }]
  };
  const malformedAssessment = assessOffences(
    facts({ nationality: "Foreign", activity: ["fishing"], legal: { authorisedOfficer: true, authorisedOfficerRequirement: true, section15Conduct: { failureToStop: true } } }),
    ["FOREIGN_FISHING_VESSEL"],
    [],
    [malformedSection15]
  );
  if (malformedAssessment.establishedOffences.length !== 0 || !malformedAssessment.assessments[0].warnings.some((warning) => /malformed|missing element IDs/i.test(warning))) {
    throw new Error("section 15 malformed alternative group should warn and block establishment");
  }
  results.push({ name: "section 15 malformed alternative group", status: malformedAssessment.assessments[0].status });

  const traceOffence = {
    id: "trace-offence",
    verified: true,
    actId: "trace-act",
    sectionId: "trace-section",
    sourceId: "trace-source",
    elements: [
      { id: "true-condition", description: "Confirmed condition", required: true, factKey: "confirmed", operator: "TRUE", expectedValue: "" },
      { id: "unknown-condition", description: "Unresolved condition", required: true, factKey: "missing", operator: "EXISTS", expectedValue: "" }
    ]
  };
  const traceAssessment = assessOffences({ confirmed: true }, [], [], [traceOffence]).assessments[0];
  if (traceAssessment.status !== "SUSPECTED / REQUIRES FURTHER VERIFICATION"
    || traceAssessment.decisionTrace.length !== 2
    || traceAssessment.verificationRequired.length !== 1
    || traceAssessment.decisionTrace[1].evaluation !== "UNKNOWN"
    || !traceAssessment.reason) {
    throw new Error("decision trace or verification workflow did not capture the unresolved condition");
  }
  results.push({ name: "decision trace and verification workflow", status: traceAssessment.status });

  const alternativeTrace = assessOffences(
    { first: false, second: true },
    [],
    [],
    [{
      id: "alternative-trace-offence",
      verified: true,
      actId: "trace-act",
      sectionId: "trace-section",
      sourceId: "trace-source",
      elements: [
        { id: "alternative-a", description: "Alternative A", required: false, alternativeGroup: "any", factKey: "first", operator: "TRUE", expectedValue: "" },
        { id: "alternative-b", description: "Alternative B", required: false, alternativeGroup: "any", factKey: "second", operator: "TRUE", expectedValue: "" }
      ],
      alternativeGroups: [{ id: "any", description: "Any alternative", operator: "ANY", elementIds: ["alternative-a", "alternative-b"] }]
    }]
  ).assessments[0];
  if (alternativeTrace.status !== "OFFENCE ESTABLISHED"
    || alternativeTrace.alternativeGroups[0].alternatives[1].status !== "ESTABLISHED"
    || alternativeTrace.alternativeGroups[0].alternatives[0].status !== "NOT_ESTABLISHED") {
    throw new Error("alternative group decision trace did not identify the successful alternative");
  }
  results.push({ name: "alternative group decision trace", status: alternativeTrace.status });

  const falseUnknownAlternative = assessOffences(
    { first: false },
    [],
    [],
    [{
      id: "false-unknown-alternative-offence",
      verified: true,
      actId: "trace-act",
      sectionId: "trace-section",
      sourceId: "trace-source",
      elements: [
        { id: "false-alternative", description: "False alternative", required: false, alternativeGroup: "false-unknown", factKey: "first", operator: "TRUE", expectedValue: "" },
        { id: "unknown-alternative", description: "Unknown alternative", required: false, alternativeGroup: "false-unknown", factKey: "missing", operator: "TRUE", expectedValue: "" }
      ],
      alternativeGroups: [{ id: "false-unknown", description: "False or unknown alternative", operator: "ANY", elementIds: ["false-alternative", "unknown-alternative"] }]
    }]
  ).assessments[0];
  if (falseUnknownAlternative.status !== "SUSPECTED / REQUIRES FURTHER VERIFICATION"
    || falseUnknownAlternative.verificationRequired.length !== 1
    || falseUnknownAlternative.verificationRequired[0].conditionId !== "unknown-alternative") {
    throw new Error("false plus unknown alternative group should require verification only for the unknown alternative");
  }
  results.push({ name: "alternative false plus unknown", status: falseUnknownAlternative.status });

  const allUnknown = assessOffences(
    {},
    [],
    [],
    [{
      id: "all-unknown-offence",
      verified: true,
      actId: "trace-act",
      sectionId: "trace-section",
      sourceId: "trace-source",
      elements: [
        { id: "unknown-a", description: "Unknown A", required: true, factKey: "missingA", operator: "EXISTS", expectedValue: "" },
        { id: "unknown-b", description: "Unknown B", required: true, factKey: "missingB", operator: "EXISTS", expectedValue: "" }
      ]
    }]
  ).assessments[0];
  if (allUnknown.status !== "SUSPECTED / REQUIRES FURTHER VERIFICATION"
    || allUnknown.verificationRequired.length !== 2
    || !/missingA|unknown/i.test(allUnknown.reason)) {
    throw new Error("all unknown mandatory conditions should be suspected with targeted verification");
  }
  results.push({ name: "all unknown mandatory conditions", status: allUnknown.status });

  const falseJurisdiction = assessOffences(
    { location: { maritimeZone: "EEZ" } },
    [],
    [],
    [{
      id: "false-jurisdiction-offence",
      verified: true,
      actId: "trace-act",
      sectionId: "trace-section",
      sourceId: "trace-source",
      elements: [{ id: "zone", description: "Territorial waters", required: true, factKey: "location.maritimeZone", operator: "EQUALS", expectedValue: "territorial_waters" }]
    }]
  ).assessments[0];
  if (falseJurisdiction.status !== "NOT ESTABLISHED"
    || !/does not satisfy|false/i.test(falseJurisdiction.reason)
    || falseJurisdiction.verificationRequired.length !== 0) {
    throw new Error("false jurisdiction should be not established without verification tasks");
  }
  results.push({ name: "false jurisdiction", status: falseJurisdiction.status });

  const finalStatuses = new Set(["OFFENCE ESTABLISHED", "SUSPECTED / REQUIRES FURTHER VERIFICATION", "NOT ESTABLISHED", "UNKNOWN"]);
  if (results.filter((result) => !result.name.startsWith("role")).some((result) => !finalStatuses.has(result.status))) {
    throw new Error("final offence status vocabulary is not canonical");
  }

  return results;
}

function facts(values) {
  return {
    nationality: "Unknown",
    activity: [],
    location: { mentioned: false, distanceNm: null },
    documents: [],
    person: {},
    legal: {},
    ...values
  };
}

async function loadJson(url) {
  const response = await fetch(url.href || url);
  if (!response.ok) throw new Error(`Unable to load test offence data: ${url}`);
  return response.json();
}

if (typeof process !== "undefined" && process.argv[1]?.endsWith("offenceEngine.test.js")) {
  const nativeFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    if (String(url).startsWith("file:")) {
      const { readFile } = await import("node:fs/promises");
      const contents = await readFile(new URL(url), "utf8");
      return {
        ok: true,
        json: async () => JSON.parse(contents)
      };
    }
    return nativeFetch(url, options);
  };

  runOffenceEngineTests()
    .then((results) => {
      results.forEach((result) => {
        console.log(`${result.name}: ${result.status}`);
      });
      console.log("ALL OFFENCE ENGINE TESTS PASSED");
    })
    .catch((error) => {
      console.error("OFFENCE ENGINE TEST FAILED");
      console.error(error.message);
      process.exitCode = 1;
    });
}