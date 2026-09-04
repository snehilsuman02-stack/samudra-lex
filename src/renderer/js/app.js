const $ = (selector) => document.querySelector(selector);

const state = {
  currentView: 'dashboard',
  user: null,
};

function showScreen(screenId) {
  document.getElementById('login-screen').classList.toggle('active', screenId === 'login');
  document.getElementById('main-app').classList.toggle('hidden', screenId !== 'main');
  document.getElementById('login-screen').classList.toggle('hidden', screenId !== 'login');
}

function setStatus(text, tone = 'warning') {
  const node = $('#login-status');
  node.textContent = text;
  node.style.color = tone === 'error' ? '#d96d6d' : tone === 'success' ? '#4bc38b' : '#f3c76c';
}

async function initializeApp() {
  const ping = await window.samudraAPI.ping();
  if (!ping?.ok) {
    setStatus('Database not initialised. Please re-open application.', 'error');
    return;
  }

  const result = await window.samudraAPI.getOverview();
  state.overview = result;
  renderDashboard();
}

async function handleLogin() {
  const username = $('#username').value.trim();
  const password = $('#password').value.trim();

  const response = await window.samudraAPI.login(username, password);
  if (!response.ok) {
    setStatus(response.message || 'Invalid credentials.', 'error');
    return;
  }

  state.user = response.user;
  showScreen('main');
  renderDashboard();
  bindNav();
  bindSearch();
}

function bindNav() {
  document.querySelectorAll('.nav-item').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach((el) => el.classList.remove('active'));
      button.classList.add('active');
      state.currentView = button.dataset.view;
      renderView();
    });
  });
}

function bindSearch() {
  const searchInput = $('#global-search');
  const filterSelect = $('#search-filter');

  searchInput.addEventListener('input', async () => {
    const query = searchInput.value.trim();
    if (!query) {
      renderView();
      return;
    }

    const results = await window.samudraAPI.search(query, filterSelect.value);
    renderSearchResults(results);
  });

  filterSelect.addEventListener('change', async () => {
    const query = searchInput.value.trim();
    if (!query) {
      renderView();
      return;
    }
    const results = await window.samudraAPI.search(query, filterSelect.value);
    renderSearchResults(results);
  });
}

function renderSearchResults(results) {
  const container = $('#view-container');
  if (!results || results.length === 0) {
    container.innerHTML = '<div class="list-box"><h3>Search Results</h3><p class="muted">NO VERIFIED LEGAL BASIS FOUND IN THE CURRENT DATABASE.</p></div>';
    return;
  }

  const rows = results.map((item) => `
    <div class="result-item">
      <strong>${item.title}</strong>
      <div class="muted">${item.type} • ${item.source || 'Source unavailable'}</div>
      <div>${item.description || 'No summary available.'}</div>
      <div class="tag">${item.status || 'VERIFY'}</div>
      <div class="muted">Version: ${item.version || '1.0.0'}</div>
    </div>
  `).join('');

  container.innerHTML = `<div class="list-box"><h3>Search Results</h3>${rows}</div>`;
}

async function renderDashboard() {
  const overview = state.overview || await window.samudraAPI.getOverview();
  const scenarios = await window.samudraAPI.getScenarios();

  const scenarioCards = scenarios.map((scenario) => `
    <div class="scenario-item" data-scenario-id="${scenario.id}">
      <h4>${scenario.title}</h4>
      <div class="muted">${scenario.category}</div>
      <p>${scenario.situation}</p>
      <div><span class="tag">${scenario.jurisdiction}</span></div>
    </div>
  `).join('');

  $('#view-container').innerHTML = `
    <div class="card-grid">
      <div class="card">
        <h3>Total Acts</h3>
        <div class="metric">${overview.totalActs || 0}</div>
      </div>
      <div class="card">
        <h3>Scenarios</h3>
        <div class="metric">${overview.totalScenarios || 0}</div>
      </div>
      <div class="card">
        <h3>Cases</h3>
        <div class="metric">${overview.totalCases || 0}</div>
      </div>
      <div class="card">
        <h3>Database</h3>
        <div class="metric">${overview.dbVersion || '1.0.0'}</div>
      </div>
    </div>
    <div class="list-box">
      <h3>Scenario Assistant</h3>
      <div class="scenario-list">${scenarioCards}</div>
    </div>
  `;

  document.querySelectorAll('.scenario-item').forEach((item) => {
    item.addEventListener('click', async () => {
      const scenarioId = item.dataset.scenarioId;
      const scenario = await window.samudraAPI.getScenarioById(Number(scenarioId));
      if (scenario) {
        renderScenarioDetail(scenario);
      }
    });
  });
}

function renderScenarioDetail(scenario) {
  const html = `
    <div class="list-box">
      <h3>${scenario.title}</h3>
      <p><strong>Situation:</strong> ${scenario.situation}</p>
      <p><strong>Jurisdiction:</strong> ${scenario.jurisdiction}</p>
      <p><strong>Potential laws:</strong> ${scenario.potential_laws}</p>
      <p><strong>Potential powers:</strong> ${scenario.potential_powers}</p>
      <p><strong>Conditions:</strong> ${scenario.conditions}</p>
      <p><strong>Immediate actions:</strong> ${scenario.immediate_actions}</p>
      <p><strong>Evidence:</strong> ${scenario.evidence}</p>
      <p><strong>Documentation:</strong> ${scenario.documentation}</p>
      <p><strong>Handover:</strong> ${scenario.handover}</p>
      <p><strong>Escalation:</strong> ${scenario.escalation}</p>
      <p class="status-verify">DEMO DATA — NOT FOR OPERATIONAL USE.</p>
    </div>
  `;
  $('#view-container').innerHTML = html;
}

function renderView() {
  if (state.currentView === 'dashboard') {
    renderDashboard();
    return;
  }

  const modules = {
    situation: '<div class="list-box"><h3>Situation Assistant</h3><p class="muted">Select a scenario from the dashboard or search for a scenario to review legal mapping.</p></div>',
    powers: '<div class="list-box"><h3>What Can I Do?</h3><p class="muted">STOP • BOARD • INSPECT • SEARCH • ARREST • SEIZE • HANDOVER</p><p class="status-conditional">CONDITIONAL — VERIFY ALL STATUTORY CONDITIONS BEFORE EXERCISE.</p></div>',
    'law-library': '<div class="list-box"><h3>Law Library</h3><p class="muted">COAST GUARD • MARITIME ZONES • FISHERIES • CUSTOMS • NARCOTICS • IMMIGRATION • MARINE POLLUTION</p></div>',
    jurisdiction: '<div class="list-box"><h3>Jurisdiction</h3><p>SELECTED ZONE</p><p class="muted">Jurisdiction shown is a decision-support aid and must be independently confirmed where operational or legal consequences arise.</p></div>',
    boarding: '<div class="list-box"><h3>Boarding Assistant</h3><p class="muted">STEP 1 — VESSEL • STEP 2 — POSITION • STEP 3 — REASON • STEP 4 — PRE-BOARDING • STEP 5 — DOCUMENTS</p></div>',
    'search-seizure': '<div class="list-box"><h3>Search / Seizure</h3><p class="muted">DRAFT / SYSTEM-GENERATED — VERIFY AGAINST APPLICABLE LAW AND APPROVED FORMAT.</p></div>',
    arrest: '<div class="list-box"><h3>Arrest</h3><p class="status-not-established">ARREST AUTHORITY NOT ESTABLISHED IN CURRENT DATABASE.</p></div>',
    evidence: '<div class="list-box"><h3>Evidence</h3><p class="muted">Evidence categories: physical, documentary, photographic, video, electronic, witness statement, officer observation.</p></div>',
    cases: '<div class="list-box"><h3>Cases</h3><p class="muted">Case builder supports timeline, evidence links and report generation.</p></div>',
    checklists: '<div class="list-box"><h3>Checklists</h3><p class="muted">Pre-boarding • Boarding • Search • Seizure • Arrest • Evidence • Handover</p></div>',
    forms: '<div class="list-box"><h3>Forms</h3><p class="muted">DEMO TEMPLATE — REQUIRES OFFICIAL VALIDATION</p></div>',
    updates: '<div class="list-box"><h3>Legal Updates</h3><p class="status-verify">NEW LEGAL DATABASE UPDATE AVAILABLE</p></div>',
    settings: '<div class="list-box"><h3>Settings</h3><p class="muted">User profile • Database version • Backup • Restore • Update • High contrast • Accessibility options</p></div>',
    about: '<div class="list-box"><h3>About</h3><p class="muted">IMPORTANT NOTICE<br/>SAMUDRA-LEX is a legal-reference and decision-support application. It does not itself confer any statutory power or authority upon any user.</p></div>',
  };

  const html = modules[state.currentView] || modules.dashboard;
  $('#view-container').innerHTML = html;
}

$('#login-btn').addEventListener('click', handleLogin);
$('#logout-btn').addEventListener('click', () => {
  state.user = null;
  showScreen('login');
  $('#password').value = '';
});

(async () => {
  try {
    await window.samudraAPI.initDb();
    await initializeApp();
    showScreen('login');
  } catch (error) {
    setStatus(error.message || 'Unable to initialise database.', 'error');
  }
})();
