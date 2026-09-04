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
  state.overview = overview;
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
        <h3>Legal Documents</h3>
        <div class="metric">${overview.totalLegalDocuments || 0}</div>
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

async function renderLawLibrary() {
  const library = await window.samudraAPI.getLawLibrary();
  const documents = library.documents || [];
  const documentCards = documents.length
    ? documents.map((doc) => `
      <div class="document-item">
        <h4>${doc.title}</h4>
        <div class="muted">${doc.type} • ${doc.source_name || 'Local import'} • ${doc.status || 'DRAFT'}</div>
        <p>${doc.summary || 'No summary available.'}</p>
        <div class="tag">${doc.version || '1.0.0'}</div>
      </div>
    `).join('')
    : '<p class="muted">No imported legal documents yet. Add a source document to begin building the legal knowledge base.</p>';

  $('#view-container').innerHTML = `
    <div class="list-box">
      <h3>Legal Knowledge Library</h3>
      <div class="document-import-panel">
        <input id="doc-title" type="text" placeholder="Document title" />
        <input id="doc-source" type="text" placeholder="Source / authority" />
        <input id="doc-reference" type="text" placeholder="Reference / gazette / notice" />
        <textarea id="doc-text" rows="6" placeholder="Paste the relevant legal text or extracted body here..."></textarea>
        <div class="form-row">
          <input id="doc-keywords" type="text" placeholder="Keywords" />
          <input id="doc-status" type="text" value="DRAFT" placeholder="Status" />
        </div>
        <button id="import-document-btn" class="primary-btn small-btn">IMPORT DOCUMENT</button>
      </div>
    </div>
    <div class="list-box">
      <h3>Imported Documents</h3>
      <div class="document-list">${documentCards}</div>
    </div>
  `;

  $('#import-document-btn').addEventListener('click', async () => {
    const payload = {
      title: $('#doc-title').value.trim(),
      source_name: $('#doc-source').value.trim(),
      reference: $('#doc-reference').value.trim(),
      keywords: $('#doc-keywords').value.trim(),
      status: $('#doc-status').value.trim() || 'DRAFT',
      type: 'ACT',
      text: $('#doc-text').value.trim(),
      summary: $('#doc-text').value.trim().slice(0, 300),
      verification_authority: 'LOCAL REVIEW',
      verification_date: new Date().toISOString().slice(0, 10),
    };

    if (!payload.title || !payload.text) {
      $('#doc-text').focus();
      return;
    }

    const result = await window.samudraAPI.importDocument(payload);
    if (result.ok) {
      await renderLawLibrary();
      await renderDashboard();
      state.overview = await window.samudraAPI.getOverview();
    }
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

async async function renderView() {
  if (state.currentView === 'dashboard') {
    renderDashboard();
    return;
  }

  if (state.currentView === 'law-library') {
    await renderLawLibrary();
    return;
  }

  if (state.currentView === 'situation') {
    const defaultText = 'foreign fishing vessel without documentation';
    const matches = await window.samudraAPI.resolveLegalBasis(defaultText, 6);
    const resultMarkup = matches.length
      ? matches.map((item) => `
          <div class="result-item">
            <strong>${item.title}</strong>
            <div class="muted">${item.type} • ${item.source || 'Source unavailable'}</div>
            <div>${item.summary || 'No summary available.'}</div>
            <div class="tag">${item.status || 'VERIFY'}</div>
            <div class="muted">${item.match || 'Match'}</div>
          </div>
        `).join('')
      : '<p class="muted">NO VERIFIED LEGAL BASIS FOUND IN THE CURRENT DATABASE.</p>';

    $('#view-container').innerHTML = `
      <div class="list-box">
        <h3>Situation Assistant</h3>
        <div class="situation-panel">
          <textarea id="situation-input" rows="4">${defaultText}</textarea>
          <button id="resolve-legal-basis-btn" class="primary-btn small-btn">RESOLVE LEGAL BASIS</button>
        </div>
      </div>
      <div class="list-box">
        <h3>Relevant Law Matches</h3>
        ${resultMarkup}
      </div>
    `;

    $('#resolve-legal-basis-btn').addEventListener('click', async () => {
      const text = $('#situation-input').value.trim();
      const matches = await window.samudraAPI.resolveLegalBasis(text || defaultText, 6);
      const output = matches.length
        ? matches.map((item) => `
            <div class="result-item">
              <strong>${item.title}</strong>
              <div class="muted">${item.type} • ${item.source || 'Source unavailable'}</div>
              <div>${item.summary || 'No summary available.'}</div>
              <div class="tag">${item.status || 'VERIFY'}</div>
              <div class="muted">${item.match || 'Match'}</div>
            </div>
          `).join('')
        : '<p class="muted">NO VERIFIED LEGAL BASIS FOUND IN THE CURRENT DATABASE.</p>';
      $('#view-container').querySelectorAll('.list-box')[1].innerHTML = `<h3>Relevant Law Matches</h3>${output}`;
    });
    return;
  }

  const modules = {
    powers: '<div class="list-box"><h3>What Can I Do?</h3><p class="muted">STOP • BOARD • INSPECT • SEARCH • ARREST • SEIZE • HANDOVER</p><p class="status-conditional">CONDITIONAL — VERIFY ALL STATUTORY CONDITIONS BEFORE EXERCISE.</p></div>',
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
