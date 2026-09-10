import { analyseSituation } from "./legalEngine.js";
import { assessCase, CASE_STORAGE_KEY, createCase, listSavedCases, loadCase, saveCase } from "./caseAssessment.js";
import { summarizeCaseStatus } from "./workflowState.js";

const form = document.querySelector("#analysis-form");
const input = document.querySelector("#situation-input");
const results = document.querySelector("#results");
const resultContent = document.querySelector("#result-content");
const newAnalysisButton = document.querySelector("#new-analysis");
const saveCaseButton = document.querySelector("#save-case");
const evidenceList = document.querySelector("#evidence-list");
const sidebar = document.querySelector("#sidebar");
const mobileMenuButton = document.querySelector(".mobile-menu-button");

let currentCase = createCase();
let evidenceItems = [];
let latestAnalysis = null;

initialize();

function initialize() {
  document.querySelector("#case-id").value = currentCase.caseId;
  wireNavigation();
  wireDashboardActions();
  wireSituationForm();
  wireBoardingAssistant();
  wireOffenceFinder();
  wireActsSearch();
  wireEvidenceRegister();
  wireSavedCases();
  wireSettings();
  renderSavedCases();
  renderLegalSources();
  renderVerificationModule();
  renderEvidenceRegisterList();
  renderOperationalSummary();
  showModule("dashboard");
}

function wireNavigation() {
  document.querySelectorAll("[data-nav]").forEach((button) => {
    button.addEventListener("click", () => {
      showModule(button.dataset.nav);
      if (window.innerWidth <= 800) {
        sidebar.classList.remove("open");
      }
    });
  });

  mobileMenuButton.addEventListener("click", () => {
    sidebar.classList.toggle("open");
  });
}

function wireDashboardActions() {
  document.querySelectorAll("[data-action]").forEach((button) => {
    const action = button.dataset.action;
    if (action === "open-situation") showModule("situation-analysis");
    if (action === "open-boarding") showModule("boarding-assistant");
    if (action === "open-offence-finder") showModule("offence-finder");
    if (action === "open-acts") showModule("acts-sections");
    if (action === "open-verification") showModule("legal-verification");
    if (action === "open-case-manager") showModule("saved-cases");
    if (action === "open-evidence") showModule("evidence-register");
    if (action === "open-saved-cases") showModule("saved-cases");
    if (action === "new-situation") {
      handleNewAnalysis();
      showModule("situation-analysis");
    }
    if (action === "new-boarding-case") showModule("boarding-assistant");
    if (action === "search-legal-provision") showModule("acts-sections");
    if (action === "verify-finding") showModule("legal-verification");
    if (action === "open-saved-case") showModule("saved-cases");
    if (action === "populate-situation-from-board") populateSituationFromBoard();
  });
}

function wireSituationForm() {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    currentCase = readCaseFromForm();
    const [analysis, caseResult] = await Promise.all([
      analyseSituation(input.value),
      assessCase(currentCase)
    ]);
    currentCase = caseResult;
    latestAnalysis = { analysis, caseResult };
    renderAnalysis(analysis, caseResult);
    renderVerificationModule();
    renderSavedCases();
    renderOperationalSummary();
    showModule("situation-analysis");
  });

  newAnalysisButton.addEventListener("click", () => handleNewAnalysis());

  saveCaseButton.addEventListener("click", () => {
    currentCase = readCaseFromForm();
    saveCase(currentCase);
    renderSavedCases();
    renderOperationalSummary();
    saveCaseButton.textContent = "Case saved";
    setTimeout(() => { saveCaseButton.textContent = "Save case"; }, 1200);
  });

  document.querySelector("#load-case").addEventListener("click", () => {
    const saved = loadCase(document.querySelector("#saved-case-select").value);
    if (!saved) return;
    currentCase = saved;
    populateCaseForm(saved);
    renderOperationalSummary();
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
    renderEvidenceRegisterList();
  });
}

function wireBoardingAssistant() {
  const boardForm = document.querySelector("#boarding-form");
  boardForm.addEventListener("submit", (event) => {
    event.preventDefault();
    populateSituationFromBoard();
  });
}

function wireOffenceFinder() {
  const formEl = document.querySelector("#offence-form");
  const resultsEl = document.querySelector("#offence-results");
  formEl.addEventListener("submit", async (event) => {
    event.preventDefault();
    const candidate = createCase({
      incident: {
        description: [
          document.querySelector("#finder-activity").value,
          document.querySelector("#finder-zone").value,
          document.querySelector("#finder-vessel-type").value
        ].filter(Boolean).join(" ") || "Offence Finder assessment",
        activity: [document.querySelector("#finder-activity").value].filter(Boolean)
      },
      vessel: { vesselType: document.querySelector("#finder-vessel-type").value },
      jurisdiction: { maritimeZone: document.querySelector("#finder-zone").value },
      conduct: {
        contravention: document.querySelector("#finder-contravention").value === "true" ? true : document.querySelector("#finder-contravention").value === "false" ? false : null,
        licenceViolation: document.querySelector("#finder-documents").value === "not-produced" ? true : null,
        permitViolation: document.querySelector("#finder-documents").value === "not-produced" ? true : null
      }
    });
    const caseResult = await assessCase(candidate);
    const assessment = caseResult.assessment || {};
    const entries = Array.isArray(assessment.offences) && assessment.offences.length
      ? assessment.offences.map((offence) => `
        <div class="list-row">
          <header>
            <h4>${escapeHtml(offence.name)}</h4>
            <span class="status-badge ${statusClass(offence.status)}">${escapeHtml(offence.status)}</span>
          </header>
          <p>${escapeHtml(offence.reason)}</p>
          <div class="tight-grid">
            <div><strong>Legal basis:</strong><br>${escapeHtml(offence.legalBasis.map((basis) => `${basis.actId} / ${basis.sectionId}`).join("; ") || "Not available")}</div>
            <div><strong>Verification:</strong><br>${escapeHtml((assessment.verificationRequired || []).map((item) => item.action).join("; ") || "No unresolved conditions identified.")}</div>
          </div>
        </div>
      `).join("")
      : `<div class="list-row"><p>No verified offence record was assessed.</p></div>`;
    resultsEl.innerHTML = `
      <div class="result-block">
        <h3>OFFENCE FINDER RESULT</h3>
        <div class="status-badge ${statusClass(assessment.overallStatus || "UNKNOWN")}">${escapeHtml(assessment.overallStatus || "UNKNOWN")}</div>
      </div>
      ${entries}
    `;
  });
}

function wireActsSearch() {
  const actsSearch = document.querySelector("#acts-search");
  const actFilter = document.querySelector("#acts-filter-act");
  const zoneFilter = document.querySelector("#acts-filter-zone");
  const subjectFilter = document.querySelector("#acts-filter-subject");

  actsSearch.addEventListener("input", renderLegalReferenceResults);
  actFilter.addEventListener("change", renderLegalReferenceResults);
  zoneFilter.addEventListener("change", renderLegalReferenceResults);
  subjectFilter.addEventListener("change", renderLegalReferenceResults);
  renderLegalReferenceResults();
}

function wireEvidenceRegister() {
  document.querySelector("#add-evidence-register-item").addEventListener("click", () => {
    const entry = {
      evidenceId: document.querySelector("#evidence-id").value || `EVD-${Date.now()}`,
      type: document.querySelector("#evidence-register-type").value,
      description: document.querySelector("#evidence-register-description").value,
      source: document.querySelector("#evidence-register-source").value,
      dateTime: document.querySelector("#evidence-register-datetime").value,
      relatedFact: document.querySelector("#evidence-register-fact").value,
      verificationStatus: document.querySelector("#evidence-register-status").value,
      remarks: document.querySelector("#evidence-register-remarks").value
    };
    const existing = Array.isArray(currentCase.evidence) ? currentCase.evidence : [];
    currentCase.evidence = [...existing, { ...entry, verified: entry.verificationStatus === "VERIFIED" }];
    evidenceItems = currentCase.evidence;
    renderEvidenceList();
    renderEvidenceRegisterList();
    renderOperationalSummary();
  });

  document.querySelector("#view-evidence-register-item").addEventListener("click", () => {
    renderEvidenceRegisterList();
  });

  document.querySelector("#edit-evidence-register-item").addEventListener("click", () => {
    const id = document.querySelector("#evidence-id").value;
    const index = currentCase.evidence.findIndex((item) => item.evidenceId === id);
    if (index >= 0) {
      currentCase.evidence[index] = { ...currentCase.evidence[index], type: document.querySelector("#evidence-register-type").value };
      renderEvidenceRegisterList();
    }
  });

  document.querySelector("#delete-evidence-register-item").addEventListener("click", () => {
    const id = document.querySelector("#evidence-id").value;
    currentCase.evidence = currentCase.evidence.filter((item) => item.evidenceId !== id);
    evidenceItems = currentCase.evidence;
    renderEvidenceList();
    renderEvidenceRegisterList();
  });
}

function wireSavedCases() {
  document.querySelector("#saved-cases-list").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-case-id]");
    if (!button) return;
    const { caseId, action } = button.dataset;
    const entries = listSavedCases();
    const match = entries.find((item) => item.caseId === caseId);
    if (!match) return;

    if (action === "open") {
      currentCase = match;
      populateCaseForm(match);
      renderOperationalSummary();
      showModule("situation-analysis");
    }
    if (action === "edit") {
      currentCase = match;
      populateCaseForm(match);
      renderOperationalSummary();
      showModule("situation-analysis");
    }
    if (action === "duplicate") {
      const duplicate = createCase({ ...match, caseId: nextCaseId() });
      saveCase(duplicate);
      renderSavedCases();
      renderOperationalSummary();
      renderSavedCaseCards();
    }
    if (action === "delete") {
      const updated = listSavedCases().filter((item) => item.caseId !== caseId);
      try {
        window.localStorage.setItem(CASE_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // ignore storage access failures in offline or restricted contexts
      }
      renderSavedCases();
      renderOperationalSummary();
      renderSavedCaseCards();
    }
  });
}

function wireSettings() {
  document.querySelector("#reset-ui-preferences").addEventListener("click", () => {
    try {
      const keys = Object.keys(window.localStorage).filter((key) => key.includes("samudra") || key.includes("ui"));
      keys.forEach((key) => window.localStorage.removeItem(key));
    } catch {
      // ignore storage access failures
    }
  });
}

function handleNewAnalysis() {
  form.reset();
  evidenceItems = [];
  renderEvidenceList();
  currentCase = createCase();
  document.querySelector("#case-id").value = currentCase.caseId;
  results.hidden = true;
  renderOperationalSummary();
  input.focus();
}

function populateSituationFromBoard() {
  const activityValues = Array.from(document.querySelectorAll('input[name="activity"]:checked')).map((item) => item.value);
  const documentValues = Array.from(document.querySelectorAll('input[name="documents"]:checked')).map((item) => item.value);
  const description = [
    document.querySelector("#board-vessel-name").value,
    document.querySelector("#board-flag").value,
    document.querySelector("#board-zone").value,
    activityValues.join(", "),
    document.querySelector("#board-observations").value
  ].filter(Boolean).join(". ");

  input.value = description || "Boarding observation recorded.";
  document.querySelector("#vessel-name").value = document.querySelector("#board-vessel-name").value;
  document.querySelector("#vessel-flag").value = document.querySelector("#board-flag").value;
  document.querySelector("#vessel-type").value = document.querySelector("#board-vessel-type").value;
  document.querySelector("#imo-number").value = document.querySelector("#board-imo").value;
  document.querySelector("#observed-activity").value = activityValues.join(", ");
  document.querySelector("#maritime-zone").value = document.querySelector("#board-zone").value;
  document.querySelector("#incident-date-time").value = document.querySelector("#board-datetime").value;
  document.querySelector("#latitude").value = document.querySelector("#board-latitude").value;
  document.querySelector("#longitude").value = document.querySelector("#board-longitude").value;
  document.querySelector("#distance-baseline").value = document.querySelector("#board-distance").value;
  document.querySelector("#person-role").value = "master";
  document.querySelector("#evidence-description").value = documentValues.join(", ") || "Boarding documents observed.";
  showModule("situation-analysis");
}

function showModule(name) {
  document.querySelectorAll(".view").forEach((view) => {
    view.classList.toggle("active", view.dataset.view === name);
  });
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.classList.toggle("active", button.dataset.nav === name);
  });
}

function renderAnalysis(analysis, caseResult) {
  const scenarioDetected = analysis.detectedScenario.includes("FOREIGN_FISHING_VESSEL");
  const scenarioMarkup = analysis.detectedScenario.length
    ? `<ul class="scenario-list">${analysis.detectedScenario.map((scenario) => `<li>${formatScenarioName(scenario)}</li>`).join("")}</ul>`
    : "<p>No broad operational scenario category detected from the supplied text.</p>";

  const legalSourceMarkup = analysis.legalSources.length
    ? analysis.legalSources.map(renderLegalSource).join("")
    : `<div class="no-basis"><strong>NO VERIFIED LEGAL BASIS FOUND</strong><p>The current legal database does not contain a verified provision matching this query.</p></div>`;
  const powerMarkup = renderPowerAssessment(analysis.powerAssessment);
  const workflowSummary = summarizeCaseStatus(caseResult);

  resultContent.innerHTML = `
    <div class="result-block workflow-summary ${workflowSummary.severity}">
      <h3>OPERATIONS SUMMARY</h3>
      <div class="status-badge ${statusClass(caseResult.assessment?.overallStatus || "UNKNOWN")}">${escapeHtml(caseResult.assessment?.overallStatus || "UNKNOWN")}</div>
      <p><strong>${escapeHtml(workflowSummary.title)}</strong></p>
      <p>${escapeHtml(workflowSummary.action)}</p>
      <p>${escapeHtml(workflowSummary.detail)}</p>
    </div>
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
  return `<div class="result-block case-assessment"><h3>CASE ASSESSMENT</h3><p class="case-final-status">${escapeHtml(assessment.overallStatus)}</p><p>${escapeHtml((assessment.reasons || []).map((item) => item.reason).join(" "))}</p><h4>APPLICABLE OFFENCE(S)</h4>${offences}<h4>FAILED CONDITIONS</h4>${renderList((assessment.failedConditions || []).map((item) => item.reason || item.description), "No failed conditions identified.")}<h4>VERIFICATION REQUIRED</h4>${renderList((assessment.verificationRequired || []).map((item) => item.action), "No unresolved conditions identified.")}<h4>EVIDENCE GAPS</h4>${renderList((assessment.evidenceGaps || []).map((item) => `${item.action} (${item.evidenceStatus})`), "No evidence gaps identified.")}</div>`;
}

function renderDecisionTrace(offence) {
  return `<ol class="decision-trace">${offence.decisionTrace.map((entry) => `<li><strong>${escapeHtml(entry.description)}</strong><span>${escapeHtml(entry.evaluation || entry.status)}: ${escapeHtml(entry.reason)}</span></li>`).join("")}</ol>`;
}

function renderList(items, emptyText) {
  return items.length ? `<ul class="fact-list">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : `<p>${emptyText}</p>`;
}

function readCaseFromForm() {
  const booleanOrNull = (selector) => {
    const value = document.querySelector(selector).value;
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
  if (!select) return;
  select.innerHTML = '<option value="">Select a saved case</option>';
  listSavedCases().forEach((saved) => {
    const option = document.createElement("option");
    option.value = saved.caseId;
    option.textContent = `${saved.caseId} — ${saved.incident.description || "No description"}`;
    select.append(option);
  });
  renderSavedCaseCards();
}

function renderSavedCaseCards() {
  const container = document.querySelector("#saved-cases-list");
  if (!container) return;
  const cases = listSavedCases();
  container.innerHTML = cases.length
    ? cases.map((saved) => `
      <article class="list-row">
        <header>
          <h4>${escapeHtml(saved.caseId)}</h4>
          <span class="status-badge ${statusClass(saved.assessment?.overallStatus || "UNKNOWN")}">${escapeHtml(saved.assessment?.overallStatus || "UNKNOWN")}</span>
        </header>
        <div class="tight-grid">
          <div><strong>DATE</strong><br>${escapeHtml(saved.createdAt || saved.updatedAt || "-")}</div>
          <div><strong>VESSEL</strong><br>${escapeHtml(saved.vessel.name || "Unknown")}</div>
          <div><strong>LOCATION</strong><br>${escapeHtml(saved.jurisdiction?.maritimeZone || saved.incident.reportedLocation || "Unknown")}</div>
          <div><strong>SCENARIO</strong><br>${escapeHtml(saved.scenarios?.join(", ") || "None")}</div>
          <div><strong>LEGAL FINDING</strong><br>${escapeHtml(saved.assessment?.overallStatus || "Pending")}</div>
          <div><strong>STATUS</strong><br>${escapeHtml(saved.assessment?.overallStatus || "PENDING VERIFICATION")}</div>
        </div>
        <div class="case-card-actions">
          <button class="secondary-button" type="button" data-case-id="${saved.caseId}" data-action="open">OPEN</button>
          <button class="secondary-button" type="button" data-case-id="${saved.caseId}" data-action="edit">EDIT</button>
          <button class="secondary-button" type="button" data-case-id="${saved.caseId}" data-action="duplicate">DUPLICATE</button>
          <button class="secondary-button" type="button" data-case-id="${saved.caseId}" data-action="delete">DELETE</button>
        </div>
      </article>
    `).join("")
    : `<div class="list-row"><p>No saved cases found.</p></div>`;
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
  document.querySelector("#licence-produced").value = toSelectValue(saved.licence.produced);
  document.querySelector("#licence-verified").value = String(Boolean(saved.licence.verified));
  document.querySelector("#permit-produced").value = toSelectValue(saved.permit.produced);
  document.querySelector("#permit-verified").value = String(Boolean(saved.permit.verified));
  document.querySelector("#person-role").value = saved.persons.role || "";
  document.querySelector("#conduct-contravention").value = toSelectValue(saved.conduct.contravention);
  document.querySelector("#conduct-licence").value = toSelectValue(saved.conduct.licenceViolation);
  document.querySelector("#conduct-permit").value = toSelectValue(saved.conduct.permitViolation);
  document.querySelector("#conduct-stop").value = toSelectValue(saved.conduct.failureToStop);
  document.querySelector("#conduct-obstruction").value = toSelectValue(saved.conduct.obstruction);
  evidenceItems = Array.isArray(saved.evidence) ? saved.evidence : [];
  renderEvidenceList();
  renderOperationalSummary();
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
    <p class="source-reference">${escapeHtml(section.source)}<br><a href="${escapeHtml(section.sourceUrl)}" target="_blank" rel="noreferrer">Official source</a><br>Last verified: ${escapeHtml(section.lastVerified)}</p>
    <p class="disclaimer">This display contains statutory text only. It is not an operational interpretation or an automatic authorisation for a particular action.</p>
  </article>`;
}

function renderPowerAssessment(powerAssessment) {
  if (!powerAssessment) return "<p>No power assessment available.</p>";
  const powers = Array.isArray(powerAssessment.applicablePowers) && powerAssessment.applicablePowers.length
    ? powerAssessment.applicablePowers.map((power) => `<div class="power-record"><h4>${escapeHtml(power.name || "Power")}</h4><p class="power-description">${escapeHtml(power.description || "")}</p>${power.conditions ? `<ul>${power.conditions.map((condition) => `<li>${escapeHtml(condition)}</li>`).join("")}</ul>` : ""}</div>`).join("")
    : "<p>No verified enforcement powers were matched from the current legal data.</p>";
  return `<div class="power-group"><h4>APPLICABLE POWERS</h4>${powers}</div>`;
}

function renderLegalReferenceResults() {
  const query = document.querySelector("#acts-search").value.trim().toLowerCase();
  const actFilter = document.querySelector("#acts-filter-act").value;
  const zoneFilter = document.querySelector("#acts-filter-zone").value;
  const subjectFilter = document.querySelector("#acts-filter-subject").value;
  const resultsEl = document.querySelector("#acts-results");

  const records = [
    { act: "Coast Guard Act, 1978", section: "121", subject: "Coast Guard powers", zone: "All", title: "Coast Guard Act, 1978 - Section 121", source: "VERIFIED_SOURCE", category: "Enforcement" },
    { act: "Maritime Zones Act", section: "3", subject: "Foreign fishing vessel restrictions", zone: "Territorial waters", title: "Foreign fishing vessel restrictions", source: "VERIFIED_SOURCE", category: "Fishing regulation" },
    { act: "Maritime Zones Act", section: "9", subject: "Authorised officer powers", zone: "EEZ", title: "Authorised officers and powers", source: "VERIFIED_SOURCE", category: "Search and seizure" },
    { act: "Maritime Zones Act", section: "10", subject: "Offence provisions", zone: "Territorial waters", title: "Foreign fishing vessel offence provisions", source: "VERIFIED_SOURCE", category: "Offence" }
  ];

  const filtered = records.filter((record) => {
    const matchesQuery = !query || `${record.act} ${record.section} ${record.title} ${record.subject}`.toLowerCase().includes(query);
    const matchesAct = !actFilter || record.act.toLowerCase().includes(actFilter.toLowerCase());
    const matchesZone = !zoneFilter || record.zone === "All" || record.zone.toLowerCase().includes(zoneFilter.toLowerCase());
    const matchesSubject = !subjectFilter || record.subject.toLowerCase().includes(subjectFilter.toLowerCase());
    return matchesQuery && matchesAct && matchesZone && matchesSubject;
  });

  resultsEl.innerHTML = filtered.length
    ? filtered.map((record) => `
      <div class="list-row">
        <header>
          <h4>${escapeHtml(record.act)}</h4>
          <span class="status-badge established">${escapeHtml(record.source)}</span>
        </header>
        <div class="tight-grid">
          <div><strong>SECTION</strong><br>${escapeHtml(record.section)}</div>
          <div><strong>SUBJECT</strong><br>${escapeHtml(record.subject)}</div>
          <div><strong>LEGAL PROVISION</strong><br>${escapeHtml(record.title)}</div>
          <div><strong>SOURCE STATUS</strong><br>${escapeHtml(record.source)}</div>
        </div>
      </div>
    `).join("")
    : `<div class="list-row"><p>No matching legal provisions found.</p></div>`;
}

function renderLegalSources() {
  const searchBox = document.querySelector("#source-search");
  const statusFilter = document.querySelector("#source-filter-status");
  const sortSelect = document.querySelector("#source-sort");
  const list = document.querySelector("#legal-sources-list");

  const records = [
    { act: "Coast Guard Act, 1978", section: "121", source: "India Code", databaseStatus: "CONNECTED / AVAILABLE", verificationStatus: "VERIFIED_SOURCE", versionDate: "2026-09-09" },
    { act: "Maritime Zones (Fishing) Act, 1981", section: "3", source: "India Code", databaseStatus: "CONNECTED / AVAILABLE", verificationStatus: "VERIFIED_SOURCE", versionDate: "2026-09-09" },
    { act: "Maritime Zones (Fishing) Act, 1981", section: "9", source: "India Code", databaseStatus: "CONNECTED / AVAILABLE", verificationStatus: "VERIFIED_SOURCE", versionDate: "2026-09-09" },
    { act: "Maritime Zones (Fishing) Act, 1981", section: "10", source: "India Code", databaseStatus: "CONNECTED / AVAILABLE", verificationStatus: "VERIFIED_SOURCE", versionDate: "2026-09-09" }
  ];

  const filtered = records.filter((record) => {
    const query = searchBox.value.trim().toLowerCase();
    const matchesQuery = !query || `${record.act} ${record.section} ${record.source}`.toLowerCase().includes(query);
    const matchesStatus = !statusFilter.value || record.verificationStatus === statusFilter.value;
    return matchesQuery && matchesStatus;
  });

  const sorted = filtered.sort((a, b) => {
    if (sortSelect.value === "status") return a.verificationStatus.localeCompare(b.verificationStatus);
    if (sortSelect.value === "section") return String(a.section).localeCompare(String(b.section));
    return a.act.localeCompare(b.act);
  });

  list.innerHTML = sorted.map((record) => `
    <div class="list-row">
      <header>
        <h4>${escapeHtml(record.act)}</h4>
        <span class="status-badge ${record.verificationStatus === "VERIFIED_SOURCE" ? "established" : "pending"}">${escapeHtml(record.verificationStatus)}</span>
      </header>
      <div class="tight-grid">
        <div><strong>ACT</strong><br>${escapeHtml(record.act)}</div>
        <div><strong>SECTION</strong><br>${escapeHtml(record.section)}</div>
        <div><strong>SOURCE</strong><br>${escapeHtml(record.source)}</div>
        <div><strong>DATABASE STATUS</strong><br>${escapeHtml(record.databaseStatus)}</div>
        <div><strong>VERIFICATION STATUS</strong><br>${escapeHtml(record.verificationStatus)}</div>
        <div><strong>VERSION / DATE</strong><br>${escapeHtml(record.versionDate)}</div>
      </div>
    </div>
  `).join("") || "<div class=\"list-row\"><p>No legal sources match the current filter.</p></div>";

  searchBox.addEventListener("input", renderLegalSources);
  statusFilter.addEventListener("change", renderLegalSources);
  sortSelect.addEventListener("change", renderLegalSources);
}

function renderVerificationModule() {
  const container = document.querySelector("#legal-verification-content");
  if (!container) return;
  if (!latestAnalysis || !latestAnalysis.caseResult?.assessment) {
    container.innerHTML = `<div class="list-row"><p>No legal verification result yet. Run a situation analysis to populate the legal finding.</p></div>`;
    return;
  }
  const assessment = latestAnalysis.caseResult.assessment;
  const details = assessment.legalBasis?.length ? assessment.legalBasis.map((basis) => `${basis.actId} / ${basis.sectionId}`).join("; ") : "Not available";
  const workflowSummary = summarizeCaseStatus(latestAnalysis.caseResult);
  container.innerHTML = `
    <div class="list-row">
      <header>
        <h4>LEGAL FINDING</h4>
        <span class="status-badge ${statusClass(assessment.overallStatus || "UNKNOWN")}">${escapeHtml(assessment.overallStatus || "UNKNOWN")}</span>
      </header>
      <div class="workflow-banner ${workflowSummary.severity}">
        <strong>${escapeHtml(workflowSummary.action)}</strong>
        <p>${escapeHtml(workflowSummary.detail)}</p>
      </div>
      <div class="tight-grid">
        <div><strong>STATUS</strong><br>${escapeHtml(assessment.overallStatus || "UNKNOWN")}</div>
        <div><strong>LEGAL BASIS</strong><br>${escapeHtml(details)}</div>
        <div><strong>FACTS ESTABLISHED</strong><br>${escapeHtml((assessment.confirmedFacts || []).join("; ") || "None recorded.")}</div>
        <div><strong>FACTS REQUIRING VERIFICATION</strong><br>${escapeHtml((assessment.verificationRequired || []).map((item) => item.action).join("; ") || "No unresolved facts.")}</div>
        <div><strong>EVIDENCE AVAILABLE</strong><br>${escapeHtml((currentCase.evidence || []).map((item) => item.description || item.type).join("; ") || "No evidence recorded.")}</div>
        <div><strong>EVIDENCE REQUIRED</strong><br>${escapeHtml((assessment.evidenceGaps || []).map((item) => item.action).join("; ") || "No evidence gaps identified.")}</div>
        <div><strong>SOURCE / ACT / SECTION</strong><br>${escapeHtml(details)}</div>
        <div><strong>REASONING</strong><br>${escapeHtml((assessment.reasons || []).map((item) => item.reason).join("; ") || "No structured reasoning available.")}</div>
      </div>
    </div>
  `;
}

function renderEvidenceRegisterList() {
  const container = document.querySelector("#evidence-register-list");
  if (!container) return;
  const rows = currentCase.evidence && currentCase.evidence.length
    ? currentCase.evidence.map((item) => `
      <div class="list-row">
        <header>
          <h4>${escapeHtml(item.evidenceId || "EVIDENCE")}</h4>
          <span class="status-badge ${item.verified ? "established" : "pending"}">${escapeHtml((item.verificationStatus || (item.verified ? "VERIFIED" : "PENDING VERIFICATION")))}</span>
        </header>
        <div class="tight-grid">
          <div><strong>EVIDENCE TYPE</strong><br>${escapeHtml(item.type || "Unknown")}</div>
          <div><strong>DESCRIPTION</strong><br>${escapeHtml(item.description || "No description")}</div>
          <div><strong>SOURCE</strong><br>${escapeHtml(item.source || "Local case register")}</div>
          <div><strong>DATE/TIME</strong><br>${escapeHtml(item.dateTime || "-")}</div>
          <div><strong>RELATED FACT</strong><br>${escapeHtml(item.relatedFact || item.relatedConditionId || "-")}</div>
          <div><strong>REMARKS</strong><br>${escapeHtml(item.remarks || "-")}</div>
        </div>
      </div>
    `).join("")
    : `<div class="list-row"><p>No evidence has been recorded for the current case.</p></div>`;
  container.innerHTML = rows;
}

function renderOperationalSummary() {
  const summary = summarizeCaseStatus(currentCase);
  const summaryNode = document.querySelector("#operational-summary");
  if (!summaryNode) return;
  summaryNode.innerHTML = `
    <div class="status-badge ${statusClass(currentCase.assessment?.overallStatus || "UNKNOWN")}">${escapeHtml(currentCase.assessment?.overallStatus || "UNKNOWN")}</div>
    <strong>${escapeHtml(summary.action)}</strong>
    <span>${escapeHtml(summary.detail)}</span>
  `;
}

function toSelectValue(value) {
  return value === null || value === undefined ? "" : String(value);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatScenarioName(name) {
  return name.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatFactValue(value) {
  return String(value).trim();
}

function statusClass(status) {
  if (!status) return "unknown";
  if (status.includes("OFFENCE ESTABLISHED")) return "established";
  if (status.includes("SUSPECTED") || status.includes("PENDING")) return "suspected";
  if (status.includes("NOT ESTABLISHED")) return "not-established";
  return "unknown";
}

function nextCaseId() {
  const year = new Date().getFullYear();
  const suffix = String(Date.now()).slice(-4);
  return `SLX-${year}-${suffix}`;
}
