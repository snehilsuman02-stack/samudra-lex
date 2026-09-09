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
  const scenarioMarkup = analysis.detectedScenario.length
    ? `<ul class="scenario-list">${analysis.detectedScenario.map((scenario) => `<li>${scenario}</li>`).join("")}</ul>`
    : "<p>No broad operational scenario category detected from the supplied text.</p>";

  const legalSourceMarkup = analysis.legalSources.length
    ? analysis.legalSources.map(renderLegalSource).join("")
    : `<div class="no-basis">
        <strong>NO VERIFIED LEGAL BASIS FOUND</strong>
        <p>The current legal database does not contain a verified provision matching this query.</p>
      </div>`;

  resultContent.innerHTML = `
    <div class="result-block">
      <h3>Possible scenario categories</h3>
      ${scenarioMarkup}
      <p class="disclaimer">These categories are operational prompts only. They are not findings of fact or legal conclusions.</p>
    </div>
    <div class="result-block">
      <h3>Legal sources found</h3>
      ${legalSourceMarkup}
    </div>
  `;
  results.hidden = false;
  results.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderLegalSource(section) {
  return `<article class="legal-source">
    <p class="source-kicker">LEGAL SOURCES FOUND</p>
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

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
