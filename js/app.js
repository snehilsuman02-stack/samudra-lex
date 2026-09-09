import { analyseSituation } from "./legalEngine.js";

const form = document.querySelector("#analysis-form");
const input = document.querySelector("#situation-input");
const results = document.querySelector("#results");
const resultContent = document.querySelector("#result-content");
const newAnalysisButton = document.querySelector("#new-analysis");

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const analysis = analyseSituation(input.value);
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

  resultContent.innerHTML = `
    <div class="result-block">
      <h3>Possible scenario categories</h3>
      ${scenarioMarkup}
      <p class="disclaimer">These categories are operational prompts only. They are not findings of fact or legal conclusions.</p>
    </div>
    <div class="result-block">
      <div class="no-basis">
        <strong>NO VERIFIED LEGAL BASIS FOUND</strong>
        <p>The verified legal database has not yet been populated for this situation. No Acts, sections, powers, procedures or jurisdictional conclusions have been inferred.</p>
      </div>
    </div>
  `;
  results.hidden = false;
  results.scrollIntoView({ behavior: "smooth", block: "start" });
}
