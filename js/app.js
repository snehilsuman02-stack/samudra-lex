import { analyseSituation } from "./legalEngine.js";

const form = document.querySelector("#analysis-form");
const input = document.querySelector("#situation-input");
const results = document.querySelector("#results");
const resultContent = document.querySelector("#result-content");
const newAnalysisButton = document.querySelector("#new-analysis");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const analysis = await analyseSituation(input.value);
  renderAnalysis(analysis);
});

newAnalysisButton.addEventListener("click", () => {
  results.hidden = true;
  input.focus();
});

function renderAnalysis(analysis) {
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
  const powerMarkup = analysis.potentialPowers.length
    ? analysis.potentialPowers.map(renderPotentialPower).join("")
    : "<p>No verified statutory powers were linked to this result.</p>";

  resultContent.innerHTML = `
    <div class="result-block">
      <h3>SITUATION</h3>
      <p>${escapeHtml(analysis.input)}</p>
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
      <h3>POTENTIAL STATUTORY POWERS</h3>
      ${powerMarkup}
    </div>
    ${scenarioDetected ? `<div class="result-block"><h3>WARNING</h3><p class="disclaimer">Scenario classification does not establish that an offence has occurred or that a particular enforcement power is available.</p></div>` : ""}
  `;
  results.hidden = false;
  results.scrollIntoView({ behavior: "smooth", block: "start" });
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
    <h4>Potential statutory power identified</h4>
    <p>${escapeHtml(power.powerName)}</p>
    <p class="power-description">${escapeHtml(power.description)}</p>
    <p class="statutory-label">LEGAL BASIS</p>
    <p class="power-detail">Section ${escapeHtml(power.legalBasis.subsection)} of the Foreign Fishing Vessels Act, 1981.</p>
    <p class="statutory-label">CONDITIONS / LIMITATIONS</p>
    <ul>${[...power.conditions, ...power.limitations].map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
  </article>`;
}

function formatScenarioName(scenario) {
  return scenario
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
