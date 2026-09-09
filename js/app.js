import { analyseSituation } from "./legalEngine.js";
import { assessCase, createCase, listSavedCases, loadCase, saveCase } from "./caseAssessment.js";

const form = document.querySelector("#analysis-form");
const input = document.querySelector("#situation-input");
const results = document.querySelector("#results");
const resultContent = document.querySelector("#result-content");
const newAnalysisButton = document.querySelector("#new-analysis");
const saveCaseButton = document.querySelector("#save-case");
const evidenceList = document.querySelector("#evidence-list");
let currentCase = createCase();
let evidenceItems = [];

document.querySelector("#case-id").value = currentCase.caseId;
renderSavedCases();

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  currentCase = readCaseFromForm();
  const [analysis, caseResult] = await Promise.all([
    analyseSituation(input.value),
    assessCase(currentCase)
  ]);
  currentCase = caseResult;
  renderAnalysis(analysis, caseResult);
});

newAnalysisButton.addEventListener("click", () => {
  form.reset();
  evidenceItems = [];
  renderEvidenceList();
  currentCase = createCase();
  document.querySelector("#case-id").value = currentCase.caseId;
  results.hidden = true;
  input.focus();
});

saveCaseButton.addEventListener("click", () => {
  currentCase = readCaseFromForm();
  saveCase(currentCase);
  renderSavedCases();
  saveCaseButton.textContent = "Case saved";
});

document.querySelector("#load-case").addEventListener("click", () => {
  const saved = loadCase(document.querySelector("#saved-case-select").value);
  if (!saved) return;
  currentCase = saved;
  populateCaseForm(saved);
});

document.querySelector("#add-evidence").addEventListener("click", () => {
  const description = document.querySelector("#evidence-description").value.trim();
  if (!description) return;
  evidenceItems.push({
    evidenceId: `evidence-${Date.now()}`,
    type: document.querySelector("#evidence-type").value,
    description,
    source: "Local case register",
    dateTime: new Date().toISOString(),
    verified: document.querySelector("#evidence-verified").value === "true",
    relatedConditionId: document.querySelector("#evidence-condition").value.trim()
  });
  document.querySelector("#evidence-description").value = "";
  renderEvidenceList();
});

function renderAnalysis(analysis, caseResult) {
  const scenarioDetected = analysis.detectedScenario.includes("FOREIGN_FISHING_VESSEL");
  const scenarioMarkup = analysis.detectedScenario.length
    ? `<ul class="scenario-list">${analysis.detectedScenario.map((scenario) => `<li>${formatScenarioName(scenario)}</li>`).join("")}</ul>`
    : "<p>No broad operational scenario category detected from the supplied text.</p>";

  const legalSourceMarkup = analysis.legalSources.length
    ? analysis.legalSources.map(renderLegalSource).join("")
    : `<div class="no-basis">
        <strong>NO VERIFIED LEGAL BASIS FOUND</strong>
        <p>The current legal database does not contain a verified provision matching this query.</p>
      </div>`;
  const powerMarkup = renderPowerAssessment(analysis.powerAssessment);

  resultContent.innerHTML = `
    <div class="result-block">
      <h3>SITUATION</h3>
      <p>${escapeHtml(analysis.input)}</p>
    </div>
    <div class="result-block">
      <h3>FACTS IDENTIFIED</h3>
      ${renderFacts(analysis.facts)}
    </div>
    <div class="result-block">
      <h3>SCENARIO DETECTED</h3>
      ${scenarioMarkup}
      <p class="disclaimer">These categories are operational prompts only. They are not findings of fact or legal conclusions.</p>
    </div>
    <div class="result-block">
      <h3>JURISDICTION</h3>
      <p>Requires confirmation</p>
    </div>
    <div class="result-block">
      <h3>LEGAL SOURCES TO REVIEW</h3>
      ${legalSourceMarkup}
    </div>
    <div class="result-block">
      <h3>LEGAL POWERS ASSESSMENT</h3>
      ${powerMarkup}
    </div>
    ${renderCaseAssessment(caseResult)}
    ${scenarioDetected ? `<div class="result-block"><h3>WARNING</h3><p class="disclaimer">Scenario classification does not establish that an offence has occurred or that a particular enforcement power is available.</p></div>` : ""}
  `;
  results.hidden = false;
  results.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderCaseAssessment(caseResult) {
  if (!caseResult?.assessment) return "";
  const assessment = caseResult.assessment;
  const offences = assessment.offences.length
    ? assessment.offences.map((offence) => `<article class="case-offence"><h4>${escapeHtml(offence.name)}</h4><p class="case-status">${escapeHtml(offence.status)}</p><p>${escapeHtml(offence.reason)}</p><p class="statutory-label">LEGAL BASIS</p><p class="source-reference">${escapeHtml(offence.legalBasis.map((basis) => `${basis.actId} / ${basis.sectionId}`).join("; "))}</p><details><summary>Why this result?</summary>${renderDecisionTrace(offence)}</details></article>`).join("")
    : "<p>No applicable verified offence record was assessed.</p>";
  return `<div class="result-block case-assessment"><h3>CASE ASSESSMENT</h3><p class="case-final-status">${escapeHtml(assessment.overallStatus)}</p><p>${escapeHtml(assessment.reasons.map((item) => item.reason).join(" "))}</p><h4>APPLICABLE OFFENCE(S)</h4>${offences}<h4>FAILED CONDITIONS</h4>${renderList(assessment.failedConditions.map((item) => item.reason || item.description), "No failed conditions identified.")}<h4>VERIFICATION REQUIRED</h4>${renderList(assessment.verificationRequired.map((item) => item.action), "No unresolved conditions identified.")}<h4>EVIDENCE GAPS</h4>${renderList(assessment.evidenceGaps.map((item) => `${item.action} (${item.evidenceStatus})`), "No evidence gaps identified.")}</div>`;
}

function renderDecisionTrace(offence) {
  return `<ol class="decision-trace">${offence.decisionTrace.map((entry) => `<li><strong>${escapeHtml(entry.description)}</strong><span>${escapeHtml(entry.evaluation || entry.status)}: ${escapeHtml(entry.reason)}</span></li>`).join("")}</ol>`;
}

function renderList(items, emptyText) {
  return items.length ? `<ul class="fact-list">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : `<p>${emptyText}</p>`;
}

function readCaseFromForm() {
  const booleanOrNull = (id) => {
    const value = document.querySelector(id).value;
    return value === "" ? null : value === "true";
  };
  return createCase({
    ...currentCase,
    incident: {
      ...currentCase.incident,
      description: input.value,
      dateTime: document.querySelector("#incident-date-time").value,
      latitude: document.querySelector("#latitude").value,
      longitude: document.querySelector("#longitude").value,
      reportedLocation: document.querySelector("#reported-location").value,
      activity: document.querySelector("#observed-activity").value.split(",").map((item) => item.trim()).filter(Boolean)
    },
    vessel: {
      name: document.querySelector("#vessel-name").value,
      imoNumber: document.querySelector("#imo-number").value,
      callSign: document.querySelector("#call-sign").value,
      flag: document.querySelector("#vessel-flag").value,
      vesselType: document.querySelector("#vessel-type").value,
      owner: document.querySelector("#vessel-owner").value
    },
    jurisdiction: {
      maritimeZone: document.querySelector("#maritime-zone").value,
      distanceFromBaseline: document.querySelector("#distance-baseline").value,
      positionVerified: document.querySelector("#position-verified").value === "true"
    },
    licence: { required: null, produced: booleanOrNull("#licence-produced"), valid: null, verified: document.querySelector("#licence-verified").value === "true" },
    permit: { required: null, produced: booleanOrNull("#permit-produced"), verified: document.querySelector("#permit-verified").value === "true" },
    persons: { ...currentCase.persons, role: document.querySelector("#person-role").value },
    conduct: {
      contravention: booleanOrNull("#conduct-contravention"),
      licenceViolation: booleanOrNull("#conduct-licence"),
      permitViolation: booleanOrNull("#conduct-permit"),
      failureToStop: booleanOrNull("#conduct-stop"),
      obstruction: booleanOrNull("#conduct-obstruction")
    },
    evidence: evidenceItems
  });
}

function renderEvidenceList() {
  evidenceList.innerHTML = evidenceItems.map((item) => `<li>${escapeHtml(item.type)}: ${escapeHtml(item.description)}${item.verified ? " (verified)" : " (not verified)"}</li>`).join("");
}

function renderSavedCases() {
  const select = document.querySelector("#saved-case-select");
  select.innerHTML = '<option value="">Select a saved case</option>';
  listSavedCases().forEach((saved) => {
    const option = document.createElement("option");
    option.value = saved.caseId;
    option.textContent = `${saved.caseId} — ${saved.incident.description || "No description"}`;
    select.append(option);
  });
}

function populateCaseForm(saved) {
  input.value = saved.incident.description || "";
  document.querySelector("#case-id").value = saved.caseId;
  document.querySelector("#vessel-name").value = saved.vessel.name || "";
  document.querySelector("#imo-number").value = saved.vessel.imoNumber || "";
  document.querySelector("#call-sign").value = saved.vessel.callSign || "";
  document.querySelector("#vessel-flag").value = saved.vessel.flag || "";
  document.querySelector("#vessel-type").value = saved.vessel.vesselType || "";
  document.querySelector("#vessel-owner").value = saved.vessel.owner || "";
  document.querySelector("#incident-date-time").value = saved.incident.dateTime || "";
  document.querySelector("#latitude").value = saved.incident.latitude || "";
  document.querySelector("#longitude").value = saved.incident.longitude || "";
  document.querySelector("#reported-location").value = saved.incident.reportedLocation || "";
  document.querySelector("#observed-activity").value = (saved.incident.activity || []).join(", ");
  document.querySelector("#maritime-zone").value = saved.jurisdiction.maritimeZone || "";
  document.querySelector("#position-verified").value = String(Boolean(saved.jurisdiction.positionVerified));
  document.querySelector("#distance-baseline").value = saved.jurisdiction.distanceFromBaseline || "";
  document.querySelector("#person-role").value = saved.persons.role || "";
  evidenceItems = Array.isArray(saved.evidence) ? saved.evidence : [];
  renderEvidenceList();
}

function renderFacts(facts) {
  const details = [
    ["Vessel Type", facts.vesselType || "Unknown"],
    ["Nationality", facts.nationality],
    ["Activity", facts.activity.length ? facts.activity.map(formatFactValue).join(", ") : "None detected"],
    ["Distance Mentioned", facts.location.distanceNm === null ? (facts.location.mentioned ? facts.location.text : "None") : `${facts.location.distanceNm} NM`],
    ["Document Issue", facts.documents.length ? facts.documents.join(", ") : "None detected"],
    ["Behaviour", facts.behaviour.length ? facts.behaviour.join(", ") : "None detected"]
  ];
  const detailsMarkup = details.map(([label, value]) => `<dt>${label}</dt><dd>${escapeHtml(value)}</dd>`).join("");
  const factList = facts.facts.length
    ? `<p class="fact-label">FACTS</p><ul class="fact-list">${facts.facts.map((fact) => `<li>${escapeHtml(fact)}</li>`).join("")}</ul>`
    : "";
  const uncertaintyList = facts.uncertainties.length
    ? `<p class="fact-label">UNCERTAINTIES</p><ul class="fact-list uncertainty-list">${facts.uncertainties.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
    : "";

  return `<dl class="fact-details">${detailsMarkup}</dl>${factList}${uncertaintyList}`;
}

function renderLegalSource(section) {
  return `<article class="legal-source">
    <p class="source-kicker">LEGAL SOURCE TO REVIEW</p>
    <h4>${escapeHtml(section.actName)} — Section ${escapeHtml(section.sectionNumber)}</h4>
    <dl class="source-details">
      <dt>Act</dt><dd>${escapeHtml(section.actName)}</dd>
      <dt>Section</dt><dd>${escapeHtml(section.sectionNumber)}</dd>
      <dt>Title</dt><dd>${escapeHtml(section.title)}</dd>
    </dl>
    <p class="statutory-label">STATUTORY TEXT</p>
    <div class="statutory-text">${escapeHtml(section.text)}</div>
    <p class="statutory-label">SOURCE</p>
    <p class="source-reference">${escapeHtml(section.source)}<br><a href="${escapeHtml(section.sourceUrl)}" target="_blank" rel="noreferrer">Official India Code source</a><br>Last verified: ${escapeHtml(section.lastVerified)}</p>
    <p class="disclaimer">This display contains statutory text only. It is not an operational interpretation or an automatic authorisation for a particular action.</p>
  </article>`;
}

function renderPotentialPower(power) {
  return `<article class="power-record">
    <h4>${escapeHtml(power.assessmentStatus || "Potential statutory power identified")}</h4>
    <p>${escapeHtml(power.powerName)}</p>
    <p class="power-description">${escapeHtml(power.description)}</p>
    <p class="statutory-label">LEGAL BASIS</p>
    <p class="power-detail">${escapeHtml(power.actName || "Verified Act record")} — Section 9${escapeHtml(power.legalBasis.subsection)}.</p>
    <p class="statutory-label">CONDITIONS / LIMITATIONS</p>
    <ul>${[...power.conditions, ...power.limitations].map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    <p class="power-detail">${escapeHtml(power.assessmentReason || "")}</p>
    <p class="statutory-label">SOURCE</p>
    <p class="source-reference">${escapeHtml(power.source)}<br><a href="${escapeHtml(power.sourceUrl)}" target="_blank" rel="noreferrer">Official India Code source</a><br>Last verified: ${escapeHtml(power.lastVerified)}</p>
  </article>`;
}

function renderPowerAssessment(assessment) {
  if (!assessment) return "<p>POWER DATA NOT AVAILABLE</p>";
  const sections = [
    ["POTENTIALLY RELEVANT POWERS", assessment.applicablePowers],
    ["CONDITION-DEPENDENT POWERS", assessment.conditionalPowers],
    ["INSUFFICIENT FACTS", assessment.insufficientFacts]
  ];
  const markup = sections.map(([heading, powers]) => `<section class="power-group"><h4>${heading}</h4>${powers.length ? powers.map(renderPotentialPower).join("") : "<p>No powers in this category.</p>"}</section>`).join("");
  const dataWarning = assessment.warnings.includes("POWER DATA NOT AVAILABLE")
    ? "<p class=\"power-data-warning\">POWER DATA NOT AVAILABLE</p>"
    : "";
  const verificationWarning = assessment.warnings.includes("VERIFICATION DATA INCOMPLETE")
    ? "<p class=\"power-data-warning\">VERIFICATION DATA INCOMPLETE</p>"
    : "";
  return `${dataWarning}${verificationWarning}${markup}<div class="legal-caution"><strong>LEGAL CAUTION</strong><p>This assessment identifies statutory provisions potentially relevant to the facts entered by the user. It does not by itself establish that an offence has occurred, that jurisdiction has been established, or that a particular enforcement action must be taken.</p><p>Verify the current law, applicable rules, orders, notifications, authorisation/delegation, jurisdiction and facts before action.</p></div>`;
}

function formatScenarioName(scenario) {
  return scenario
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatFactValue(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
