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
    ["section 15 unknown conduct", { legal: { authorisedOfficer: true, authorisedOfficerRequirement: true } }, "UNKNOWN"],
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