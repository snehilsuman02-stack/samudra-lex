import { summarizeCaseStatus } from "./workflowState.js";

const cases = [
  {
    name: "offence established",
    input: { assessment: { overallStatus: "OFFENCE ESTABLISHED" }, vessel: { name: "MV Aurora" } },
    expected: { severity: "critical", action: "Immediate enforcement action required" }
  },
  {
    name: "suspected requires verification",
    input: { assessment: { overallStatus: "SUSPECTED / REQUIRES FURTHER VERIFICATION" }, vessel: { name: "MV Horizon" } },
    expected: { severity: "warning", action: "Expand fact verification before enforcement" }
  },
  {
    name: "not established",
    input: { assessment: { overallStatus: "NOT ESTABLISHED" }, vessel: { name: "MV Beacon" } },
    expected: { severity: "neutral", action: "No enforcement action recommended" }
  }
];

for (const test of cases) {
  const summary = summarizeCaseStatus(test.input);
  if (summary.severity !== test.expected.severity || summary.action !== test.expected.action) {
    throw new Error(`${test.name}: expected ${JSON.stringify(test.expected)} but received ${JSON.stringify(summary)}`);
  }
}

console.log("WORKFLOW STATE TESTS PASSED");
