import { analyseSituation } from "./legalEngine.js";
import { assessCase, CASE_STORAGE_KEY, createCase, listSavedCases, loadCase, saveCase } from "./caseAssessment.js?v=21";
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
let legalRecords = [];
let legalActs = [];
let selectedActId = null;
let selectedSectionId = null;
let offenceFinderResult = null;
let selectedOffenceIndex = null;

initialize();

async function initialize() {
  try {
    const legalData = await loadLegalRecords();
    legalActs = legalData.acts;
    legalRecords = legalData.records;
    document.querySelector("#case-id").value = currentCase.caseId;
    wireNavigation();
    wireDashboardActions();
    wireSituationForm();
    wireBoardingAssistant();
    wireOffenceFinder();
    populateLegalFilters();
    wireActsSearch();
    wireEvidenceRegister();
    wireSavedCases();
    wireSettings();
    wireCaseWorkspace();
    wireActsBrowser();
    renderSavedCases();
    renderLegalSources();
    renderVerificationModule();
    renderEvidenceRegisterList();
    renderOperationalSummary();
    renderCaseWorkspace();
    renderActsBrowser();
    showModule("dashboard");
  } catch (error) {
    console.error("SAMUDRA-LEX initialization failed", error);
    legalRecords = [];
    legalActs = [];
    showModule("dashboard");
    renderOperationalSummary();
  }
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
    button.addEventListener("click", () => {
      const action = button.dataset.action;
      if (action === "open-situation") showModule("situation-analysis");
      if (action === "open-boarding") showModule("boarding-assistant");
      if (action === "open-offence-finder") showModule("offence-finder");
      if (action === "open-acts") showModule("acts-sections");
      if (action === "open-verification") showModule("legal-verification");
      if (action === "open-case-manager") showModule("saved-cases");
      if (action === "open-case-workspace") {
        renderCaseWorkspace();
        showModule("case-workspace");
      }
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
      if (action === "open-sources") showModule("legal-sources");
      if (action === "new-case") {
        handleNewCase();
        showModule("case-workspace");
      }
      if (action === "populate-situation-from-board") populateSituationFromBoard();
      if (action === "back-dashboard") showModule("dashboard");
    });
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
    renderCaseWorkspace();
    showModule("situation-analysis");
  });

  newAnalysisButton.addEventListener("click", () => handleNewAnalysis());

  saveCaseButton.addEventListener("click", () => {
    currentCase = readCaseFromForm();
    saveCase(currentCase);
    renderSavedCases();
    renderOperationalSummary();
    renderCaseWorkspace();
    saveCaseButton.textContent = "Case saved";
    setTimeout(() => { saveCaseButton.textContent = "Save case"; }, 1200);
  });

  document.querySelector("#load-case").addEventListener("click", () => {
    const saved = loadCase(document.querySelector("#saved-case-select").value);
    if (!saved) return;
    currentCase = saved;
    populateCaseForm(saved);
    renderOperationalSummary();
    renderCaseWorkspace();
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
    renderCaseWorkspace();
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
  const offenceList = document.querySelector("#offence-list");
  const offenceDetail = document.querySelector("#offence-detail");
  const engineButton = formEl?.querySelector('button[type="submit"]');
  const engineStatus = document.querySelector("#offence-engine-status");
  if (!formEl || !offenceList || !offenceDetail) return;
  formEl.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (engineButton?.disabled) return;
    if (engineButton) {
      engineButton.disabled = true;
      engineButton.textContent = "Running...";
    }
    if (engineStatus) {
      engineStatus.className = "offence-engine-status running";
      engineStatus.textContent = "RUNNING OFFENCE ENGINE...";
    }
    try {
      const candidate = buildOffenceFinderCase();
      const caseResult = await assessCase(candidate);
      currentCase = caseResult;
      renderOperationalSummary();
      renderCaseWorkspace();
      offenceFinderResult = caseResult;
      selectedOffenceIndex = null;
      renderOffenceFinderList();
      renderOffenceFinderDetail();
      if (engineStatus) {
        engineStatus.className = "offence-engine-status completed";
        engineStatus.textContent = "OFFENCE ENGINE COMPLETED";
      }
    } catch (error) {
      console.error("SAMUDRA-LEX offence engine error", error);
      if (engineStatus) {
        engineStatus.className = "offence-engine-status error";
        engineStatus.textContent = "OFFENCE ENGINE ERROR — Unable to complete the assessment.";
      }
    } finally {
      if (engineButton) {
        engineButton.disabled = false;
        engineButton.textContent = "Run offence engine";
      }
    }
  });
  document.querySelector("#offence-search").addEventListener("input", renderOffenceFinderList);
  document.querySelector("#offence-filter-act").addEventListener("change", renderOffenceFinderList);
  document.querySelector("#offence-filter-section").addEventListener("change", renderOffenceFinderList);
  document.querySelector("#offence-filter-status").addEventListener("change", renderOffenceFinderList);
  document.querySelector("#offence-filter-scenario").addEventListener("change", renderOffenceFinderList);
  document.querySelector("#clear-offence-filters").addEventListener("click", () => {
    ["#offence-search", "#offence-filter-act", "#offence-filter-section", "#offence-filter-status", "#offence-filter-scenario"].forEach((selector) => { document.querySelector(selector).value = ""; });
    renderOffenceFinderList();
  });
  offenceList.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-offence-index]");
    if (!button) return;
    selectedOffenceIndex = Number(button.dataset.offenceIndex);
    renderOffenceFinderDetail();
  });
  offenceDetail.addEventListener("click", (event) => {
    const action = event.target.closest("button[data-offence-action]")?.dataset.offenceAction;
    if (action === "back") {
      selectedOffenceIndex = null;
      renderOffenceFinderDetail();
    }
    if (action === "case-workspace") showModule("case-workspace");
    if (action === "evidence") showModule("evidence-register");
    if (action === "situation") showModule("situation-analysis");
  });
  renderOffenceFinderList();
}

function buildOffenceFinderCase() {
  if (currentCase?.incident?.description?.trim()) return createCase(currentCase);
  return createCase({
    incident: {
      description: [
        document.querySelector("#finder-activity").value,
        document.querySelector("#finder-zone").value,
        document.querySelector("#finder-vessel-type").value,
        document.querySelector("#finder-documents").value === "not-produced" ? "required documents not produced" : ""
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
}

function renderOffenceFinderList() {
  const list = document.querySelector("#offence-list");
  if (!list) return;
  const offences = offenceFinderResult?.assessment?.offences || [];
  populateOffenceFinderFilters(offences);
  const query = document.querySelector("#offence-search")?.value.trim().toLowerCase() || "";
  const actFilter = document.querySelector("#offence-filter-act")?.value || "";
  const sectionFilter = document.querySelector("#offence-filter-section")?.value || "";
  const statusFilter = document.querySelector("#offence-filter-status")?.value || "";
  const scenarioFilter = document.querySelector("#offence-filter-scenario")?.value || "";
  const scenarios = new Set([...(currentCase?.scenarios || []), ...(offenceFinderResult?.scenarios || [])]);
  const filtered = offences.map((offence, index) => ({ offence, index })).filter(({ offence }) => {
    const basis = offence.legalBasis?.[0] || {};
    const record = legalRecords.find((item) => item.sectionId === basis.sectionId);
    const searchText = `${offence.name} ${basis.actId} ${basis.sectionId} ${record?.act || ""} ${record?.section || ""} ${offence.reason || ""}`.toLowerCase();
    return (!query || query.split(/\s+/).every((term) => searchText.includes(term)))
      && (!actFilter || basis.actId === actFilter)
      && (!sectionFilter || basis.sectionId === sectionFilter)
      && (!statusFilter || offence.status === statusFilter)
      && (!scenarioFilter || scenarios.has(scenarioFilter));
  });
  list.innerHTML = filtered.length
    ? filtered.map(({ offence, index }) => renderOffenceFinderListItem(offence, index)).join("")
    : `<div class="list-row"><p>${offences.length ? "NO OFFENCE FINDINGS MATCH THE CURRENT FILTERS." : "NO OFFENCE FINDINGS\nNo offence has been identified from the current facts and verified legal data."}</p></div>`;
}

function populateOffenceFinderFilters(offences) {
  const options = {
    "#offence-filter-act": new Map(),
    "#offence-filter-section": new Map(),
    "#offence-filter-status": new Map(),
    "#offence-filter-scenario": new Map()
  };
  offences.forEach((offence) => {
    const basis = offence.legalBasis?.[0] || {};
    const record = legalRecords.find((item) => item.sectionId === basis.sectionId);
    options["#offence-filter-act"].set(basis.actId, record?.act || basis.actId);
    options["#offence-filter-section"].set(basis.sectionId, record?.section ? `${record.section} — ${record.title}` : basis.sectionId);
    options["#offence-filter-status"].set(offence.status, offence.status);
  });
  legalActs.forEach((act) => options["#offence-filter-act"].set(act.id, act.actName || act.id));
  legalRecords.forEach((record) => options["#offence-filter-section"].set(record.sectionId, `${record.section} — ${record.title}`));
  [
    "OFFENCE ESTABLISHED",
    "NOT ESTABLISHED",
    "SUSPECTED / REQUIRES FURTHER VERIFICATION"
  ].forEach((status) => options["#offence-filter-status"].set(status, status));
  const scenarios = new Set([...(currentCase?.scenarios || []), ...(offenceFinderResult?.scenarios || [])]);
  scenarios.forEach((scenario) => options["#offence-filter-scenario"].set(scenario, formatScenarioName(scenario)));
  Object.entries(options).forEach(([selector, values]) => {
    const select = document.querySelector(selector);
    if (!select) return;
    const previous = select.value;
    const label = selector.includes("status") ? "ALL STATUSES" : selector.includes("scenario") ? "ALL SCENARIOS" : selector.includes("section") ? "ALL SECTIONS" : "ALL ACTS";
    select.innerHTML = `<option value="">${label}</option>${[...values].filter(([value]) => value).map(([value, text]) => `<option value="${escapeHtml(value)}">${escapeHtml(text)}</option>`).join("")}`;
    if ([...values].some(([value]) => value === previous)) select.value = previous;
  });
}

function renderOffenceFinderListItem(offence, index) {
  const basis = offence.legalBasis?.[0] || {};
  const record = legalRecords.find((item) => item.sectionId === basis.sectionId);
  return `<button class="offence-list-item" type="button" data-offence-index="${index}"><span><strong>${escapeHtml(offence.name || "Unnamed offence")}</strong><small>${escapeHtml(record?.act || basis.actId || "NOT AVAILABLE")} / ${escapeHtml(record?.section || basis.sectionId || "NOT AVAILABLE")}</small><small>${escapeHtml(offence.reason || "No explanation available.")}</small></span><span class="status-badge ${statusClass(offence.status)}">${escapeHtml(offence.status || "UNKNOWN")}</span></button>`;
}

function renderOffenceFinderDetail() {
  const detail = document.querySelector("#offence-detail");
  const list = document.querySelector("#offence-list");
  if (!detail || !list) return;
  const offences = offenceFinderResult?.assessment?.offences || [];
  if (selectedOffenceIndex === null || !offences[selectedOffenceIndex]) {
    detail.hidden = true;
    list.hidden = false;
    return;
  }
  const offence = offences[selectedOffenceIndex];
  detail.hidden = false;
  list.hidden = true;
  const cards = renderOffenceFinderCard(offence, offenceFinderResult.assessment.evidenceGaps || [], offenceFinderResult.evidence || [], offenceFinderResult);
  const activeCase = currentCase?.caseId ? currentCase : null;
  detail.innerHTML = `<div class="offence-detail-header"><div><p class="eyebrow">OFFENCE REVIEW</p><h3>${escapeHtml(offence.name || "Unnamed offence")}</h3></div><button class="secondary-button" type="button" data-offence-action="back">Back to Offence Finder</button></div>${cards}<section class="case-actions-panel"><h4>CASE ACTIONS</h4>${activeCase ? `<button class="secondary-button" type="button" data-offence-action="case-workspace">Open Case Workspace</button><button class="secondary-button" type="button" data-offence-action="evidence">View Evidence Register</button><button class="secondary-button" type="button" data-offence-action="situation">Open Situation Analysis</button>` : "<p>NO ACTIVE CASE</p>"}</section>`;
}

function renderOffenceFinderResults(assessment, caseResult = {}) {
  const offences = Array.isArray(assessment.offences) ? assessment.offences : [];
  if (!offences.length) return `<div class="offence-summary"><h3>OFFENCE ANALYSIS</h3><p>NO OFFENCE FINDINGS GENERATED</p></div>`;
  const counts = {
    established: offences.filter((offence) => offence.status === "OFFENCE ESTABLISHED").length,
    notEstablished: offences.filter((offence) => offence.status === "NOT ESTABLISHED").length,
    requiresVerification: offences.filter((offence) => offence.status === "SUSPECTED / REQUIRES FURTHER VERIFICATION").length
  };
  const summary = `<div class="offence-summary"><h3>OFFENCE ANALYSIS SUMMARY</h3><div class="offence-summary-grid"><div><strong>TOTAL FINDINGS</strong><span>${offences.length}</span></div><div class="summary-established"><strong>OFFENCE ESTABLISHED</strong><span>${counts.established}</span></div><div class="summary-not-established"><strong>NOT ESTABLISHED</strong><span>${counts.notEstablished}</span></div><div class="summary-verification"><strong>REQUIRES FURTHER VERIFICATION</strong><span>${counts.requiresVerification}</span></div></div></div>`;
  return `${summary}<div class="offence-result-list">${offences.map((offence) => renderOffenceFinderCard(offence, assessment.evidenceGaps || [], caseResult.evidence || [], caseResult)).join("")}</div>`;
}

function renderOffenceFinderCard(offence, evidenceGaps, caseEvidence, caseResult = {}) {
  const verificationItems = deduplicateDisplayRequirements(offence.verificationRequired || []);
  const verificationKeys = new Set(verificationItems.map((item) => normalizeDisplayRequirement(item.action)));
  const offenceEvidenceGaps = deduplicateDisplayRequirements(evidenceGaps.filter((item) => verificationKeys.has(normalizeDisplayRequirement(item.action))));
  const legalBasis = (offence.legalBasis || []).map((basis) => {
    const record = legalRecords.find((item) => item.sectionId === basis.sectionId);
    return `<div><strong>ACT</strong><br>${escapeHtml(record?.act || basis.actId || "Not available")}</div><div><strong>SECTION</strong><br>${escapeHtml(record?.section || basis.sectionId || "Not available")}</div>`;
  }).join("") || `<div><strong>ACT</strong><br>Not available</div><div><strong>SECTION</strong><br>Not available</div>`;
  const conditionMapping = renderConditionMapping(offence, evidenceGaps, caseEvidence, caseResult);
  return `<article class="offence-result-card">
    <header class="offence-card-header"><div><p class="section-label">OFFENCE</p><h4>${escapeHtml(offence.name || "Unnamed offence")}</h4></div><span class="status-badge ${statusClass(offence.status)} offence-status">${escapeHtml(offence.status || "UNKNOWN")}</span></header>
    <div class="offence-condition-summary"><strong>OFFENCE STATUS</strong><span>${conditionSummary(offence)}</span></div>
    <section><h5>EXPLANATION</h5><p>${escapeHtml(offence.reason || "No explanation available.")}</p></section>
    <section><h5>LEGAL BASIS</h5><div class="offence-legal-basis">${legalBasis}</div></section>
    ${conditionMapping}
    ${verificationItems.length ? `<section><h5>VERIFICATION REQUIRED</h5>${renderRequirementList(verificationItems)}</section>` : ""}
    ${offenceEvidenceGaps.length ? `<section><h5>EVIDENCE GAPS</h5>${renderRequirementList(offenceEvidenceGaps, (item) => `${item.action} (${item.evidenceStatus || "EVIDENCE NOT PROVIDED"})`)}</section>` : ""}
  </article>`;
}

function renderConditionMapping(offence, evidenceGaps = [], caseEvidence = [], caseResult = {}) {
  const elements = uniqueConditionElements(offence);
  if (!elements.length) return `<details class="condition-mapping"><summary>LEGAL CONDITIONS</summary><p>No legal condition mapping is available for this finding.</p></details>`;
  const legalBasis = (offence.legalBasis || [])[0] || {};
  const verificationByCondition = new Map((offence.verificationRequired || []).map((item) => [item.conditionId, item.action]));
  const evidenceGapByCondition = new Map();
  evidenceGaps.forEach((gap) => (gap.conditionIds || [gap.conditionId]).forEach((conditionId) => evidenceGapByCondition.set(conditionId, gap)));
  const rows = elements.map((element) => {
    const linkedEvidence = caseEvidence.filter((item) => item.relatedConditionId === element.elementId);
    const evidenceText = linkedEvidence.length
      ? linkedEvidence.map((item) => `${item.evidenceId || "Evidence"}: ${item.description || item.type || "Recorded evidence"}`).join("; ")
      : element.inputValue === undefined || element.inputValue === null
        ? conditionEvidenceContext(element, caseResult)
        : `FACT AVAILABLE: ${formatConditionValue(element.inputValue)}`;
    const status = formatConditionStatus(element.status);
    const verification = verificationByCondition.get(element.elementId) || evidenceGapByCondition.get(element.elementId)?.action || "Not required for this condition.";
    return `<div class="condition-row"><div><strong>CONDITION</strong><span>${escapeHtml(element.element || "Condition not described")}</span></div><div><strong>STATUS</strong><span class="condition-status ${conditionStatusClass(element.status)}">${escapeHtml(status)}</span></div><div><strong>EVIDENCE / FACT</strong><span>${escapeHtml(evidenceText)}</span></div><div><strong>SOURCE</strong><span>${escapeHtml(legalBasis.actId || "Not available")} / ${escapeHtml(legalBasis.sectionId || "Not available")}</span></div><div><strong>VERIFICATION</strong><span>${escapeHtml(verification)}</span></div></div>`;
  }).join("");
  return `<details class="condition-mapping"><summary>LEGAL CONDITIONS</summary><div class="condition-list">${rows}</div></details>`;
}

function conditionEvidenceContext(element, caseResult) {
  const reason = `${element.element || ""} ${element.reason || ""}`;
  const distance = caseResult.facts?.location?.distanceNm;
  if (/maritime zone|geographical|location\.maritimeZone/i.test(reason) && distance !== null && distance !== undefined) {
    return `Distance approximately ${distance} NM was entered, but maritime zone is not confirmed.`;
  }
  if (/licence|permit/i.test(reason) && (caseResult.licence?.produced === null || caseResult.licence?.produced === undefined) && (caseResult.permit?.produced === null || caseResult.permit?.produced === undefined)) {
    return "Licence/permit status has not been verified.";
  }
  if (/role|owner|master/i.test(reason) && !caseResult.persons?.role) return "Person role is not recorded.";
  if (/authorised officer/i.test(reason)) return "Authorised officer status is not recorded.";
  return "EVIDENCE NOT PROVIDED";
}

function uniqueConditionElements(offence) {
  const traceById = new Map((offence.decisionTrace || []).map((entry) => [entry.conditionId, entry]));
  const unique = new Map();
  (offence.elements || []).forEach((element) => {
    const conditionId = element.elementId || element.id || "";
    const trace = traceById.get(conditionId);
    const condition = String(element.element || trace?.description || "").trim();
    if (!condition && !conditionId) return;
    unique.set(conditionId || condition.toLowerCase(), {
      ...element,
      element: condition || `Condition ${conditionId}`,
      elementId: conditionId,
      status: element.status || trace?.status || "UNKNOWN",
      inputValue: element.inputValue === undefined ? trace?.inputValue : element.inputValue,
      evidenceStatus: element.evidenceStatus || trace?.evidenceStatus
    });
  });
  return [...unique.values()];
}

function conditionSummary(offence) {
  const elements = Array.isArray(offence.elements) ? offence.elements : [];
  const established = elements.filter((element) => element.status === "ESTABLISHED").length;
  const notEstablished = elements.filter((element) => element.status === "NOT_ESTABLISHED").length;
  const requiringVerification = elements.filter((element) => element.status === "UNKNOWN").length;
  return `${established} Established / ${notEstablished} Not Established / ${requiringVerification} Requiring Verification`;
}

function formatConditionStatus(status) {
  if (status === "ESTABLISHED") return "ESTABLISHED";
  if (status === "NOT_ESTABLISHED") return "NOT ESTABLISHED";
  return "UNKNOWN / REQUIRES VERIFICATION";
}

function conditionStatusClass(status) {
  if (status === "ESTABLISHED") return "established";
  if (status === "NOT_ESTABLISHED") return "not-established";
  return "suspected";
}

function formatConditionValue(value) {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function renderRequirementList(items, formatter = (item) => item.action) {
  return `<ul class="requirement-list">${items.map((item) => `<li>${escapeHtml(formatter(item))}</li>`).join("")}</ul>`;
}

function deduplicateDisplayRequirements(items = []) {
  const unique = new Map();
  items.forEach((item) => {
    const action = String(item?.action || "").trim();
    if (action && !unique.has(normalizeDisplayRequirement(action))) unique.set(normalizeDisplayRequirement(action), { ...item, action });
  });
  return [...unique.values()];
}

function normalizeDisplayRequirement(value) {
  return String(value).trim().replace(/\s+/g, " ").toLowerCase();
}

function wireActsSearch() {
  const actsSearch = document.querySelector("#acts-search");
  const actFilter = document.querySelector("#acts-filter-act");
  const sectionFilter = document.querySelector("#acts-filter-section");
  const offenceFilter = document.querySelector("#acts-filter-offence");

  if (!actsSearch || !actFilter || !sectionFilter || !offenceFilter) return;
  actsSearch.addEventListener("input", () => {
    selectedActId = null;
    selectedSectionId = null;
    renderLegalReferenceResults();
  });
  actFilter.addEventListener("change", renderLegalReferenceResults);
  sectionFilter.addEventListener("change", renderLegalReferenceResults);
  offenceFilter.addEventListener("change", renderLegalReferenceResults);
  actFilter.addEventListener("change", () => {
    selectedActId = actFilter.value || null;
    selectedSectionId = null;
    renderActsBrowser();
  });
  renderLegalReferenceResults();
}

function wireActsBrowser() {
  const browser = document.querySelector("#acts-browser");
  const details = document.querySelector("#acts-details");
  if (!browser || !details) return;
  browser.addEventListener("click", (event) => {
    const actButton = event.target.closest("button[data-act-id]");
    const sectionButton = event.target.closest("button[data-section-id]");
    const backActs = event.target.closest("button[data-acts-back]");
    const backDashboard = event.target.closest("button[data-acts-dashboard]");
    if (backDashboard) {
      showModule("dashboard");
      return;
    }
    if (backActs) {
      selectedSectionId = null;
      renderActsBrowser();
      history.pushState({ actsLevel: "acts" }, "", "#acts");
      return;
    }
    if (actButton) {
      selectedActId = actButton.dataset.actId;
      selectedSectionId = null;
      renderActsBrowser();
      history.pushState({ actsLevel: "act", actId: selectedActId }, "", `#acts/${selectedActId}`);
      return;
    }
    if (sectionButton) {
      selectedSectionId = sectionButton.dataset.sectionId;
      renderActsBrowser();
      history.pushState({ actsLevel: "section", actId: selectedActId, sectionId: selectedSectionId }, "", `#acts/${selectedActId}/${selectedSectionId}`);
    }
  });
  details.addEventListener("click", (event) => {
    if (event.target.closest("button[data-acts-dashboard]")) {
      showModule("dashboard");
      return;
    }
    if (event.target.closest("button[data-acts-back]")) {
      selectedSectionId = null;
      renderActsBrowser();
      history.pushState({ actsLevel: "act", actId: selectedActId }, "", `#acts/${selectedActId}`);
    }
  });
  window.addEventListener("popstate", restoreActsHistory);
}

function restoreActsHistory(event) {
  if (event.state?.actsLevel === "section") {
    selectedActId = event.state.actId;
    selectedSectionId = event.state.sectionId;
    renderActsBrowser();
  } else if (event.state?.actsLevel === "act") {
    selectedActId = event.state.actId;
    selectedSectionId = null;
    renderActsBrowser();
  } else if (event.state?.actsLevel === "acts") {
    selectedActId = null;
    selectedSectionId = null;
    renderActsBrowser();
  }
}

function wireCaseWorkspace() {
  document.querySelectorAll("[data-case-tab]").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll("[data-case-tab]").forEach((item) => item.classList.toggle("active", item === tab));
      document.querySelectorAll("[data-case-panel]").forEach((panel) => panel.classList.toggle("active", panel.dataset.casePanel === tab.dataset.caseTab));
    });
  });
}

function wireEvidenceRegister() {
  document.querySelector("#add-evidence-register-item").addEventListener("click", () => {
    const description = document.querySelector("#evidence-register-description").value.trim();
    if (!description) return;
    const entry = {
      evidenceId: document.querySelector("#evidence-id").value || `EVD-${Date.now()}`,
      type: document.querySelector("#evidence-register-type").value,
      description,
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
    renderCaseWorkspace();
  });

  document.querySelector("#view-evidence-register-item").addEventListener("click", () => {
    renderEvidenceRegisterList();
  });

  document.querySelector("#edit-evidence-register-item").addEventListener("click", () => {
    const id = document.querySelector("#evidence-id").value;
    const index = currentCase.evidence.findIndex((item) => item.evidenceId === id);
    if (index >= 0) {
      currentCase.evidence[index] = {
        ...currentCase.evidence[index],
        type: document.querySelector("#evidence-register-type").value,
        description: document.querySelector("#evidence-register-description").value,
        source: document.querySelector("#evidence-register-source").value,
        dateTime: document.querySelector("#evidence-register-datetime").value,
        relatedFact: document.querySelector("#evidence-register-fact").value,
        verificationStatus: document.querySelector("#evidence-register-status").value,
        remarks: document.querySelector("#evidence-register-remarks").value,
        verified: document.querySelector("#evidence-register-status").value === "VERIFIED"
      };
      renderEvidenceRegisterList();
      renderCaseWorkspace();
    }
  });

  document.querySelector("#delete-evidence-register-item").addEventListener("click", () => {
    const id = document.querySelector("#evidence-id").value;
    currentCase.evidence = currentCase.evidence.filter((item) => item.evidenceId !== id);
    evidenceItems = currentCase.evidence;
    renderEvidenceList();
    renderEvidenceRegisterList();
    renderCaseWorkspace();
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
      renderCaseWorkspace();
      showModule("situation-analysis");
    }
    if (action === "edit") {
      currentCase = match;
      populateCaseForm(match);
      renderOperationalSummary();
      renderCaseWorkspace();
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

function handleNewCase() {
  handleNewAnalysis();
  latestAnalysis = null;
  renderVerificationModule();
  renderCaseWorkspace();
  renderSavedCases();
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
  if (name === "acts-sections") {
    selectedActId = null;
    selectedSectionId = null;
    history.replaceState({ actsLevel: "acts" }, "", "#acts");
  } else if (name === "dashboard") {
    history.replaceState(null, "", window.location.pathname + window.location.search);
  }
  document.querySelectorAll(".view").forEach((view) => {
    view.classList.toggle("active", view.dataset.view === name);
  });
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.classList.toggle("active", button.dataset.nav === name);
  });
  if (name === "acts-sections") renderActsBrowser();
}

function renderCaseWorkspace() {
  const statusPanel = document.querySelector("#case-status-panel");
  if (!statusPanel) return;
  const assessment = currentCase.assessment || {};
  const hasSituation = Boolean(currentCase.incident?.description);
  const hasAssessment = Boolean(assessment.overallStatus);
  const hasEvidence = Array.isArray(currentCase.evidence) && currentCase.evidence.length > 0;
  const reviewStatus = assessment.verificationRequired?.length ? "REQUIRES VERIFICATION" : hasAssessment ? "COMPLETED" : "NOT STARTED";
  const statusRows = [
    ["CASE ID", currentCase.caseId],
    ["CASE STATUS", hasAssessment ? "IN PROGRESS" : hasSituation ? "IN PROGRESS" : "NOT STARTED"],
    ["ANALYSIS STATUS", hasAssessment ? "COMPLETED" : hasSituation ? "IN PROGRESS" : "NOT STARTED"],
    ["LEGAL STATUS", assessment.overallStatus || "NOT STARTED"],
    ["EVIDENCE STATUS", hasEvidence ? "IN PROGRESS" : "NOT STARTED"],
    ["REVIEW STATUS", reviewStatus]
  ];
  statusPanel.innerHTML = `<div class="case-status-grid">${statusRows.map(([label, value]) => `<div><strong>${label}</strong><span>${escapeHtml(value)}</span></div>`).join("")}</div><p class="disclaimer">Workflow statuses describe case progress only and are not legal conclusions.</p>`;

  const assessmentText = hasAssessment ? assessment.overallStatus : "No analysis has been run for this case.";
  const basis = (assessment.legalBasis || []).map((item) => `${item.actId} / ${item.sectionId}`).join("; ") || "Not available";
  const reviewItems = assessment.verificationRequired || [];
  const panels = {
    "case-details": `<div class="tight-grid"><div><strong>CASE ID</strong><br>${escapeHtml(currentCase.caseId)}</div><div><strong>VESSEL</strong><br>${escapeHtml(currentCase.vessel?.name || "Unknown")}</div><div><strong>FLAG</strong><br>${escapeHtml(currentCase.vessel?.flag || "Unknown")}</div><div><strong>VESSEL TYPE</strong><br>${escapeHtml(currentCase.vessel?.vesselType || "Unknown")}</div><div><strong>CREATED</strong><br>${escapeHtml(currentCase.createdAt || "-")}</div><div><strong>UPDATED</strong><br>${escapeHtml(currentCase.updatedAt || "-")}</div></div>`,
    situation: `<h3>SITUATION</h3><p>${escapeHtml(currentCase.incident?.description || "No situation has been recorded.")}</p>`,
    "legal-analysis": `<h3>LEGAL ANALYSIS</h3><p>${escapeHtml(assessmentText)}</p><p><strong>LEGAL BASIS</strong><br>${escapeHtml(basis)}</p>`,
    "offence-findings": renderWorkspaceOffences(assessment),
    "case-evidence": currentCase.evidence?.length ? renderEvidenceRegisterListMarkup(currentCase.evidence) : "<p>No evidence has been recorded for this case.</p>",
    "case-sources": legalRecords.length ? legalRecords.filter((record) => (assessment.legalBasis || []).some((basisItem) => basisItem.sectionId === record.sectionId)).map(renderLegalRecord).join("") || "<p>No linked legal sources are available.</p>" : "<p>NO VERIFIED LEGAL DATA FOUND</p>",
    "case-review": renderReviewPanel(assessment)
  };
  Object.entries(panels).forEach(([name, markup]) => {
    const panel = document.querySelector(`[data-case-panel="${name}"]`);
    if (panel) panel.innerHTML = markup;
  });
}

function renderActsBrowser() {
  const browser = document.querySelector("#acts-browser");
  const details = document.querySelector("#acts-details");
  const breadcrumb = document.querySelector("#acts-breadcrumb");
  if (!browser || !details || !breadcrumb) return;

  const selectedAct = legalActs.find((act) => act.id === selectedActId);
  const selectedSection = legalRecords.find((record) => record.sectionId === selectedSectionId);
  if (selectedSection) {
    breadcrumb.textContent = `ACTS / ${selectedSection.act} / SECTION ${selectedSection.section}`;
    browser.hidden = true;
    details.hidden = false;
    details.innerHTML = renderSectionDetails(selectedSection);
    return;
  }

  details.hidden = true;
  browser.hidden = false;
  if (selectedAct) {
    const sections = legalRecords.filter((record) => record.actId === selectedAct.id);
    breadcrumb.textContent = `ACTS / ${selectedAct.actName || selectedAct.id}`;
    browser.innerHTML = `<div class="acts-browser-heading"><div><h3>${escapeHtml(selectedAct.actName || selectedAct.id)}</h3><span class="status-badge ${selectedAct.status === "VERIFIED_SOURCE" ? "established" : "pending"}">${escapeHtml(selectedAct.status || "NOT AVAILABLE")}</span></div><button class="secondary-button" type="button" data-acts-back>Back to Acts</button></div>${sections.length ? `<div class="acts-section-list">${sections.map(renderSectionButton).join("")}</div>` : "<div class=\"list-row\"><p>NO VERIFIED SECTIONS AVAILABLE FOR THIS ACT</p></div>"}`;
    return;
  }

  breadcrumb.textContent = "ACTS";
  if (!legalActs.length) {
    browser.innerHTML = `<div class="list-row"><p>NO VERIFIED ACTS AVAILABLE</p></div>`;
    return;
  }
  const query = document.querySelector("#acts-search")?.value.trim().toLowerCase() || "";
  const actFilter = document.querySelector("#acts-filter-act")?.value || "";
  const sectionFilter = document.querySelector("#acts-filter-section")?.value || "";
  const offenceFilter = document.querySelector("#acts-filter-offence")?.value || "";
  const matchingRecords = legalRecords.filter((record) => {
    const haystack = `${record.act} ${record.section} ${record.title} ${record.offenceNames.join(" ")} ${record.text}`.toLowerCase();
    return (!query || query.split(/\s+/).every((term) => haystack.includes(term)))
      && (!actFilter || record.actId === actFilter)
      && (!sectionFilter || record.sectionId === sectionFilter)
      && (!offenceFilter || record.offences.includes(offenceFilter));
  });
  const matchingActs = legalActs.filter((act) => !actFilter || act.id === actFilter).filter((act) => !query || `${act.actName} ${act.shortName}`.toLowerCase().split(/\s+/).some((term) => query.split(/\s+/).includes(term)) || matchingRecords.some((record) => record.actId === act.id));
  browser.innerHTML = matchingActs.length
    ? `<div class="acts-browser-heading"><div><h3>AVAILABLE ACTS</h3><p>Select an Act to view its verified sections.</p></div><button class="secondary-button" type="button" data-acts-dashboard>Back to Dashboard</button></div><div class="acts-card-grid">${matchingActs.map(renderActButton).join("")}</div>${query || sectionFilter || offenceFilter ? `<div class="acts-search-results"><h3>SEARCH RESULTS</h3>${matchingRecords.length ? matchingRecords.map(renderSectionButton).join("") : "<div class=\"list-row\"><p>NO MATCHING VERIFIED LEGAL DATA FOUND</p></div>"}</div>` : ""}`
    : `<div class="list-row"><p>NO MATCHING VERIFIED LEGAL DATA FOUND</p></div>`;
}

function renderActButton(act) {
  const sectionCount = legalRecords.filter((record) => record.actId === act.id).length;
  return `<button class="legal-browser-card" type="button" data-act-id="${escapeHtml(act.id)}"><span class="card-kicker">ACT</span><strong>${escapeHtml(act.actName || act.id)}</strong><span>${sectionCount ? `${sectionCount} available section${sectionCount === 1 ? "" : "s"}` : "NO VERIFIED SECTIONS AVAILABLE"}</span><span class="status-badge ${act.status === "VERIFIED_SOURCE" ? "established" : "pending"}">${escapeHtml(act.status || "NOT AVAILABLE")}</span></button>`;
}

function renderSectionButton(record) {
  return `<button class="legal-section-button" type="button" data-section-id="${escapeHtml(record.sectionId)}"><span><strong>SECTION ${escapeHtml(record.section)}</strong><small>${escapeHtml(record.title)}</small></span><span class="status-badge ${record.verificationStatus === "VERIFIED_SOURCE" ? "established" : "pending"}">${escapeHtml(record.verificationStatus)}</span></button>`;
}

function renderSectionDetails(record) {
  const value = (text) => text ? escapeHtml(text) : "NOT AVAILABLE IN VERIFIED DATABASE";
  const offence = record.offenceRecords?.[0];
  return `<div class="acts-details-heading"><div><p class="section-label">SECTION DETAILS</p><h3>${escapeHtml(record.title)}</h3></div><div class="module-actions"><button class="secondary-button" type="button" data-acts-back>Back to Acts</button><button class="secondary-button" type="button" data-acts-dashboard>Back to Dashboard</button></div></div><dl class="source-details"><dt>ACT</dt><dd>${value(record.act)}</dd><dt>SECTION NUMBER</dt><dd>${value(record.section)}</dd><dt>SECTION TITLE</dt><dd>${value(record.title)}</dd><dt>LEGAL TEXT / DESCRIPTION</dt><dd><div class="statutory-text">${value(record.text)}</div></dd><dt>OFFENCE</dt><dd>${value(offence?.name)}</dd><dt>PENALTY</dt><dd>${value(offence?.penalty)}</dd><dt>JURISDICTION</dt><dd>${value(record.jurisdiction)}</dd><dt>SOURCE</dt><dd>${value(record.source)}${record.sourceUrl ? `<br><a href="${escapeHtml(record.sourceUrl)}" target="_blank" rel="noreferrer">Official source</a>` : ""}</dd><dt>VERIFICATION STATUS</dt><dd><span class="status-badge ${record.verificationStatus === "VERIFIED_SOURCE" ? "established" : "pending"}">${escapeHtml(record.verificationStatus || "NOT AVAILABLE")}</span></dd></dl>`;
}

function renderWorkspaceOffences(assessment) {
  const offences = assessment.offences || [];
  if (!offences.length) return "<h3>OFFENCE FINDINGS</h3><p>No offence assessment is available.</p>";
  return `<h3>OFFENCE FINDINGS</h3>${offences.map((offence) => `<div class="list-row"><header><h4>${escapeHtml(offence.name)}</h4><span class="status-badge ${statusClass(offence.status)}">${escapeHtml(offence.status)}</span></header><p><strong>LEGAL BASIS</strong><br>${escapeHtml((offence.legalBasis || []).map((item) => `${item.actId} / ${item.sectionId}`).join("; ") || "Not available")}</p><p><strong>FACTS / EVIDENCE</strong><br>${escapeHtml(offence.reason || "No structured reasoning available.")}</p><p><strong>VERIFICATION REQUIREMENT</strong><br>${escapeHtml((offence.verificationRequired || []).map((item) => item.action).join("; ") || "None identified")}</p></div>`).join("")}`;
}

function renderEvidenceRegisterListMarkup(items) {
  return items.map((item) => `<div class="list-row"><header><h4>${escapeHtml(item.evidenceId || "EVIDENCE")}</h4><span class="status-badge ${item.verified ? "established" : "pending"}">${escapeHtml(item.verificationStatus || (item.verified ? "VERIFIED" : "PENDING VERIFICATION"))}</span></header><div class="tight-grid"><div><strong>EVIDENCE TYPE</strong><br>${escapeHtml(item.type || "Unknown")}</div><div><strong>DESCRIPTION</strong><br>${escapeHtml(item.description || "No description")}</div><div><strong>SOURCE</strong><br>${escapeHtml(item.source || "Local case register")}</div><div><strong>DATE / TIME</strong><br>${escapeHtml(item.dateTime || "-")}</div><div><strong>REMARKS</strong><br>${escapeHtml(item.remarks || "-")}</div></div></div>`).join("");
}

function renderReviewPanel(assessment) {
  const offences = assessment.offences || [];
  const verified = offences.filter((item) => item.status === "OFFENCE ESTABLISHED");
  const requiresVerification = offences.filter((item) => item.status === "SUSPECTED / REQUIRES FURTHER VERIFICATION");
  const notEstablished = offences.filter((item) => item.status === "NOT ESTABLISHED");
  const renderGroup = (title, items, emptyText) => `<section class="review-group"><h3>${title}</h3>${items.length ? items.map((item) => `<div class="list-row"><header><h4>${escapeHtml(item.name)}</h4><span class="status-badge ${statusClass(item.status)}">${escapeHtml(item.status)}</span></header><p><strong>ITEM</strong><br>${escapeHtml(item.name)}</p><p><strong>LEGAL BASIS</strong><br>${escapeHtml((item.legalBasis || []).map((basis) => `${basis.actId} / ${basis.sectionId}`).join("; ") || "Not available")}</p><p><strong>REASON FOR VERIFICATION</strong><br>${escapeHtml(item.reason || "No structured reason available.")}</p><p><strong>REVIEW STATUS</strong><br>${title === "REQUIRES VERIFICATION" ? "PENDING REVIEW" : "RECORDED"}</p></div>`).join("") : `<p>${emptyText}</p>`}</section>`;
  return `${renderGroup("VERIFIED", verified, "No verified findings recorded.")}${renderGroup("REQUIRES VERIFICATION", requiresVerification, "No findings currently require verification.")}${renderGroup("NOT ESTABLISHED", notEstablished, "No findings recorded as not established.")}<p class="disclaimer">Operational legal-enforcement support only. Verify applicable law, jurisdiction, facts and evidence before enforcement or legal action.</p>`;
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
      ${renderSituationSummary(caseResult, analysis.input)}
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
    ? assessment.offences.map((offence) => `<article class="case-offence"><h4>${escapeHtml(offence.name)}</h4><p class="case-status">${escapeHtml(offence.status)}</p><p>${escapeHtml(offence.reason)}</p><p class="statutory-label">LEGAL BASIS</p><p class="source-reference">${escapeHtml(offence.legalBasis.map((basis) => `${basis.actId} / ${basis.sectionId}`).join("; "))}</p>${renderConditionMapping(offence, assessment.evidenceGaps || [], currentCase.evidence || [], caseResult)}<details><summary>Why this result?</summary>${renderDecisionTrace(offence)}</details></article>`).join("")
    : "<p>No applicable verified offence record was assessed.</p>";
  return `<div class="result-block case-assessment"><h3>CASE ASSESSMENT</h3><p class="case-final-status">${escapeHtml(assessment.overallStatus)}</p><p>${escapeHtml((assessment.reasons || []).map((item) => item.reason).join(" "))}</p><h4>APPLICABLE OFFENCE(S)</h4>${offences}<h4>FAILED CONDITIONS</h4>${renderList((assessment.failedConditions || []).map((item) => item.reason || item.description), "No failed conditions identified.")}<h4>VERIFICATION REQUIRED</h4>${renderList((assessment.verificationRequired || []).map((item) => item.action), "No unresolved conditions identified.")}<h4>EVIDENCE GAPS</h4>${renderList((assessment.evidenceGaps || []).map((item) => `${item.action} (${item.evidenceStatus})`), "No evidence gaps identified.")}</div>`;
}

function renderDecisionTrace(offence) {
  const entries = (offence.decisionTrace || []).map((entry) => {
    const description = String(entry?.description || "").trim();
    const reason = String(entry?.reason || "").trim();
    return { ...entry, description, reason, explanation: description || reason };
  }).filter((entry) => entry.explanation);
  return entries.length
    ? `<ol class="decision-trace">${entries.map((entry) => `<li><strong>${escapeHtml(entry.explanation)}</strong>${entry.reason && entry.description ? `<span>${escapeHtml(entry.evaluation || entry.status || "UNKNOWN")}: ${escapeHtml(entry.reason)}</span>` : ""}</li>`).join("")}</ol>`
    : "<p>No additional explanation is available for this finding.</p>";
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

function renderSituationSummary(caseResult, description) {
  const licence = formatDocumentStatus(caseResult.licence, "Licence");
  const permit = formatDocumentStatus(caseResult.permit, "Permit");
  const authorisedOfficer = readCaseValue(caseResult, ["authorisedOfficer", "legal.authorisedOfficer", "conduct.authorisedOfficer"]);
  const recordedRequirement = readCaseValue(caseResult, ["authorisedOfficerRequirement", "legal.authorisedOfficerRequirement", "conduct.authorisedOfficerRequirement"]);
  const details = [
    ["Description", description || "No situation description provided."],
    ["Vessel", caseResult.vessel?.name || "Vessel name unknown"],
    ["Vessel type", caseResult.vessel?.vesselType || "Vessel type unknown"],
    ["Flag / nationality", caseResult.vessel?.flag || "Flag / nationality unknown"],
    ["Observed activity", (caseResult.incident?.activity || []).join(", ") || "Observed activity unknown"],
    ["Maritime zone", caseResult.jurisdiction?.maritimeZone || "Maritime zone unknown"],
    ["Licence status", licence],
    ["Permit status", permit],
    ["Person role", caseResult.persons?.role || "Person role unknown"],
    ["Authorised officer status", formatKnownStatus(authorisedOfficer, "Authorised officer status")],
    ["Recorded requirement", formatKnownStatus(recordedRequirement, "Recorded requirement")]
  ];
  return `<dl class="fact-details situation-summary-details">${details.map(([label, value]) => `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd>`).join("")}</dl>`;
}

function formatDocumentStatus(document, label) {
  if (!document || document.produced === null || document.produced === undefined) return `${label} status unknown`;
  if (document.produced === false) return `${label} not produced`;
  if (document.verified === true) return `${label} verified`;
  return `${label} produced, verification unknown`;
}

function formatKnownStatus(value, label) {
  if (value === true) return `${label} confirmed`;
  if (value === false) return `${label} not confirmed`;
  return `${label} unknown`;
}

function readCaseValue(caseData, paths) {
  for (const path of paths) {
    const value = path.split(".").reduce((current, key) => current?.[key], caseData);
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
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
  const sectionFilter = document.querySelector("#acts-filter-section").value;
  const offenceFilter = document.querySelector("#acts-filter-offence").value;
  const resultsEl = document.querySelector("#acts-results");

  const filtered = legalRecords.filter((record) => {
    const haystack = `${record.act} ${record.section} ${record.title} ${record.offenceNames.join(" ")} ${record.text}`.toLowerCase();
    const matchesQuery = !query || query.split(/\s+/).every((term) => haystack.includes(term));
    const matchesAct = !actFilter || record.actId === actFilter;
    const matchesSection = !sectionFilter || record.sectionId === sectionFilter;
    const matchesOffence = !offenceFilter || record.offences.includes(offenceFilter);
    return matchesQuery && matchesAct && matchesSection && matchesOffence;
  });

  resultsEl.innerHTML = filtered.length
    ? filtered.map(renderLegalRecord).join("")
    : `<div class="list-row"><p>NO VERIFIED LEGAL DATA FOUND</p></div>`;
  renderActsBrowser();
}

async function loadLegalRecords() {
  const paths = [
    "acts/coast-guard-act-1978.json",
    "acts/maritime-zones-fishing-foreign-vessels-act-1981.json",
    "sections/coast-guard-act-section-121.json",
    "sections/mz-fishing-foreign-vessels-section-3.json",
    "sections/mz-fishing-foreign-vessels-section-9.json",
    "sections/mz-fishing-foreign-vessels-section-10.json",
    "offences/mzi-fishing-act-1981-offences.json"
  ];
  try {
    const [coastGuardAct, fishingAct, ...records] = await Promise.all(paths.map(loadAppJson));
    const offenceData = records.pop();
    const sections = records;
    const acts = [coastGuardAct, fishingAct];
    const offenceNames = new Map((offenceData.offences || []).map((offence) => [offence.id, offence.name]));
    const offenceRecords = new Map((offenceData.offences || []).map((offence) => [offence.id, offence]));
    const actMap = new Map(acts.map((act) => [act.id, act]));
    const normalizedRecords = sections.map((section) => {
      const act = actMap.get(section.actId) || {};
      const sectionId = section.id || act.sections?.find((id) => String(id).endsWith(`-${section.sectionNumber}`)) || `${section.actId}-section-${section.sectionNumber}`;
      return {
        actId: section.actId,
        act: act.actName || section.actId,
        sectionId,
        section: section.sectionNumber || section.id,
        title: section.title || "Untitled provision",
        text: section.text || "",
        source: section.source || act.source || "",
        sourceUrl: section.sourceUrl || act.sourceUrl || "",
        sourceStatus: act.status || section.status || "PENDING_VERIFICATION",
        verificationStatus: (section.verified || section.status === "VERIFIED_SOURCE") && act.status === "VERIFIED_SOURCE" ? "VERIFIED_SOURCE" : "PENDING_VERIFICATION",
        lastVerified: section.lastVerified || act.lastVerified || "",
        offences: (section.relatedOffences || []).map((id) => id),
        offenceNames: (section.relatedOffences || []).map((id) => offenceNames.get(id)).filter(Boolean),
        offenceRecords: (section.relatedOffences || []).map((id) => offenceRecords.get(id)).filter(Boolean),
        jurisdiction: section.jurisdiction || act.jurisdiction || ""
      };
    });
    return { acts, records: normalizedRecords };
  } catch {
    return { acts: [], records: [] };
  }
}

async function loadAppJson(path) {
  const response = await fetch(`data/${path}`);
  if (!response.ok) throw new Error(`Unable to load legal record: ${path}`);
  return response.json();
}

function populateLegalFilters() {
  const actFilter = document.querySelector("#acts-filter-act");
  const sectionFilter = document.querySelector("#acts-filter-section");
  const offenceFilter = document.querySelector("#acts-filter-offence");
  if (!actFilter || !sectionFilter || !offenceFilter) return;
  actFilter.innerHTML = '<option value="">ACT</option>';
  sectionFilter.innerHTML = '<option value="">SECTION</option>';
  offenceFilter.innerHTML = '<option value="">OFFENCE</option>';
  const acts = new Map();
  const sections = new Map();
  const offences = new Map();
  legalRecords.forEach((record) => {
    acts.set(record.actId, record.act);
    sections.set(record.sectionId, `${record.section} — ${record.title}`);
    record.offenceNames.forEach((name, index) => offences.set(record.offences[index], name));
  });
  acts.forEach((label, value) => actFilter.add(new Option(label, value)));
  sections.forEach((label, value) => sectionFilter.add(new Option(label, value)));
  offences.forEach((label, value) => offenceFilter.add(new Option(label, value)));
}

function renderLegalRecord(record) {
  const status = record.verificationStatus || "PENDING_VERIFICATION";
  return `<div class="list-row">
    <header>
      <h4>${escapeHtml(record.act)} — Section ${escapeHtml(record.section)}</h4>
      <span class="status-badge ${status === "VERIFIED_SOURCE" ? "established" : "pending"}">${escapeHtml(status)}</span>
    </header>
    <div class="tight-grid">
      <div><strong>ACT / REGULATION</strong><br>${escapeHtml(record.act)}</div>
      <div><strong>SECTION</strong><br>${escapeHtml(record.section)}</div>
      <div><strong>TITLE</strong><br>${escapeHtml(record.title)}</div>
      <div><strong>SOURCE STATUS</strong><br>${escapeHtml(record.sourceStatus)}</div>
      <div><strong>VERIFICATION STATUS</strong><br>${escapeHtml(status)}</div>
      <div><strong>OFFENCE</strong><br>${escapeHtml(record.offenceNames.join("; ") || "Not linked")}</div>
    </div>
    <details><summary>View statutory text</summary><div class="statutory-text">${escapeHtml(record.text)}</div></details>
  </div>`;
}

function renderLegalSources() {
  const searchBox = document.querySelector("#source-search");
  const statusFilter = document.querySelector("#source-filter-status");
  const sortSelect = document.querySelector("#source-sort");
  const list = document.querySelector("#legal-sources-list");

  const filtered = legalRecords.filter((record) => {
    const query = searchBox.value.trim().toLowerCase();
    const matchesQuery = !query || `${record.act} ${record.section} ${record.title} ${record.source}`.toLowerCase().includes(query);
    const matchesStatus = !statusFilter.value || record.verificationStatus === statusFilter.value;
    return matchesQuery && matchesStatus;
  });

  const sorted = filtered.sort((a, b) => {
    if (sortSelect.value === "status") return a.verificationStatus.localeCompare(b.verificationStatus);
    if (sortSelect.value === "section") return String(a.section).localeCompare(String(b.section));
    return a.act.localeCompare(b.act) || a.section.localeCompare(b.section);
  });

  list.innerHTML = sorted.map(renderLegalRecord).join("") || "<div class=\"list-row\"><p>NO VERIFIED LEGAL DATA FOUND</p></div>";

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
    ? renderEvidenceRegisterListMarkup(currentCase.evidence)
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
