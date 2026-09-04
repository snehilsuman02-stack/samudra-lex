const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { hashPassword } = require('./security');

const APP_DATA_DIR = path.join(process.cwd(), 'app-data');
const DB_FILE = path.join(APP_DATA_DIR, 'samudra-lex.db');
let db;

function ensureAppDataDir() {
  if (!fs.existsSync(APP_DATA_DIR)) {
    fs.mkdirSync(APP_DATA_DIR, { recursive: true });
  }
}

function initDatabase() {
  ensureAppDataDir();
  db = new Database(DB_FILE);
  db.pragma('journal_mode = WAL');
  const schemaSql = fs.readFileSync(path.join(process.cwd(), 'database', 'schema.sql'), 'utf8');
  db.exec(schemaSql);
  return { ok: true, dbPath: DB_FILE };
}

function seedDatabase() {
  if (!db) {
    initDatabase();
  }

  const count = db.prepare('SELECT COUNT(*) AS total FROM acts').get();
  if (count.total > 0) {
    return { ok: true, inserted: 0, message: 'Database already contains records.' };
  }

  const seedSql = fs.readFileSync(path.join(process.cwd(), 'database', 'seed.sql'), 'utf8');
  db.exec(seedSql);

  const credentials = [
    ['officer', 'officer123'],
    ['legaladmin', 'legaladmin123'],
    ['systemadmin', 'systemadmin123'],
  ];

  const insertUser = db.prepare('INSERT OR REPLACE INTO users (username, password_hash, role, name) VALUES (?, ?, ?, ?)');
  for (const [username, password] of credentials) {
    insertUser.run(username, hashPassword(password), username === 'officer' ? 'OFFICER' : username === 'legaladmin' ? 'LEGAL ADMIN' : 'SYSTEM ADMIN', username === 'officer' ? 'Duty Officer' : username === 'legaladmin' ? 'Legal Admin' : 'System Admin');
  }

  db.prepare('INSERT INTO audit_log (action, details) VALUES (?, ?)').run('SYSTEM', 'Demo data seeded for first-time initialization.');

  return { ok: true, inserted: 1, message: 'Database seeded with DEMO DATA.' };
}

function initializeDatabase() {
  initDatabase();
  return seedDatabase();
}

function runCli() {
  const [, , command] = process.argv;
  if (command === '--init') {
    const result = initializeDatabase();
    console.log(JSON.stringify(result));
    process.exit(0);
  }

  if (command === '--seed') {
    const result = seedDatabase();
    console.log(JSON.stringify(result));
    process.exit(0);
  }
}

function getDb() {
  if (!db) {
    initDatabase();
  }
  return db;
}

function search(query, type = 'ALL') {
  const safeQuery = String(query || '').trim();
  if (!safeQuery) {
    return [];
  }

  const dbRef = getDb();
  const likePattern = `%${safeQuery}%`;
  const normalizedType = String(type || 'ALL').trim().toUpperCase();
  let sql = '';
  const params = [];

  const addFreeTextMatch = (table, columns, extraColumns = []) => {
    const columnList = [...columns, ...extraColumns];
    const searchTerms = columnList.map(() => 'LIKE ?').join(' OR ');
    return `SELECT title, ${JSON.stringify(table)} AS type, description, source, status, version FROM ${table} WHERE ${searchTerms}`;
  };

  const actSql = `SELECT title AS title, 'ACT' AS type, description AS description, source AS source, status AS status, version AS version FROM acts WHERE title LIKE ? OR description LIKE ? OR keywords LIKE ?`;
  const sectionSql = `SELECT title AS title, 'SECTION' AS type, summary AS description, source AS source, status AS status, version AS version FROM sections WHERE title LIKE ? OR summary LIKE ? OR keywords LIKE ?`;
  const powerSql = `SELECT title AS title, 'POWER' AS type, description AS description, source AS source, status AS status, version AS version FROM powers WHERE title LIKE ? OR description LIKE ? OR keywords LIKE ?`;
  const scenarioSql = `SELECT title AS title, 'SCENARIO' AS type, situation AS description, 'DEMO DATABASE' AS source, status AS status, '1.0.0' AS version FROM scenarios WHERE title LIKE ? OR situation LIKE ?`;
  const documentSql = `SELECT title AS title, 'LEGAL_DOCUMENT' AS type, summary AS description, source_name AS source, status AS status, version AS version FROM legal_documents WHERE title LIKE ? OR summary LIKE ? OR keywords LIKE ? OR full_text LIKE ?`;
  const documentSectionSql = `SELECT title AS title, 'DOCUMENT_SECTION' AS type, summary AS description, source_reference AS source, status AS status, version AS version FROM document_sections WHERE title LIKE ? OR summary LIKE ? OR keywords LIKE ? OR full_text LIKE ?`;
  const checklistSql = `SELECT title AS title, 'CHECKLIST' AS type, description AS description, source AS source, status AS status, version AS version FROM checklists WHERE title LIKE ? OR description LIKE ?`;
  const formSql = `SELECT title AS title, 'FORM' AS type, description AS description, source AS source, status AS status, version AS version FROM forms WHERE title LIKE ? OR description LIKE ?`;

  if (normalizedType === 'ALL') {
    sql = `${actSql}
      UNION ALL
      ${sectionSql}
      UNION ALL
      ${powerSql}
      UNION ALL
      ${scenarioSql}
      UNION ALL
      ${documentSql}
      UNION ALL
      ${documentSectionSql}
      UNION ALL
      ${checklistSql}
      UNION ALL
      ${formSql}
      LIMIT 100`;

    params.push(
      likePattern, likePattern, likePattern,
      likePattern, likePattern, likePattern,
      likePattern, likePattern, likePattern,
      likePattern, likePattern,
      likePattern, likePattern, likePattern, likePattern,
      likePattern, likePattern, likePattern, likePattern,
      likePattern, likePattern,
      likePattern, likePattern
    );
  } else if (normalizedType === 'ACTS') {
    sql = actSql;
    params.push(likePattern, likePattern, likePattern);
  } else if (normalizedType === 'SECTIONS') {
    sql = sectionSql;
    params.push(likePattern, likePattern, likePattern);
  } else if (normalizedType === 'POWERS') {
    sql = powerSql;
    params.push(likePattern, likePattern, likePattern);
  } else if (normalizedType === 'SCENARIOS') {
    sql = scenarioSql;
    params.push(likePattern, likePattern);
  } else if (normalizedType === 'DOCUMENTS' || normalizedType === 'LEGAL_DOCUMENTS') {
    sql = documentSql;
    params.push(likePattern, likePattern, likePattern, likePattern);
  } else if (normalizedType === 'DOCUMENT_SECTIONS' || normalizedType === 'LEGAL_DOCUMENT_SECTIONS') {
    sql = documentSectionSql;
    params.push(likePattern, likePattern, likePattern, likePattern);
  } else if (normalizedType === 'CHECKLISTS') {
    sql = checklistSql;
    params.push(likePattern, likePattern);
  } else if (normalizedType === 'FORMS') {
    sql = formSql;
    params.push(likePattern, likePattern);
  } else {
    return search(safeQuery, 'ALL');
  }

  const rows = dbRef.prepare(sql).all(...params);
  return rows;
}

function getOverview() {
  const dbRef = getDb();
  return {
    totalActs: dbRef.prepare('SELECT COUNT(*) AS total FROM acts').get().total,
    totalScenarios: dbRef.prepare('SELECT COUNT(*) AS total FROM scenarios').get().total,
    totalCases: dbRef.prepare('SELECT COUNT(*) AS total FROM cases').get().total,
    totalLegalDocuments: dbRef.prepare('SELECT COUNT(*) AS total FROM legal_documents').get().total,
    dbVersion: dbRef.prepare("SELECT key_value FROM settings WHERE key_name = 'db_version'").get()?.key_value || '1.0.0',
  };
}

function getScenarios() {
  const dbRef = getDb();
  return dbRef.prepare('SELECT * FROM scenarios ORDER BY id').all();
}

function getScenarioById(id) {
  const dbRef = getDb();
  const scenario = dbRef.prepare('SELECT * FROM scenarios WHERE id = ?').get(id);
  if (!scenario) return null;

  const law = dbRef.prepare('SELECT * FROM scenario_law WHERE scenario_id = ?').all(id);
  const powers = dbRef.prepare('SELECT * FROM scenario_powers WHERE scenario_id = ?').all(id);
  const procedures = dbRef.prepare('SELECT * FROM scenario_procedures WHERE scenario_id = ?').all(id);

  return { ...scenario, law, powers, procedures };
}

function getLawLibrary() {
  const dbRef = getDb();
  const acts = dbRef.prepare('SELECT * FROM acts ORDER BY id').all();
  const sections = dbRef.prepare('SELECT * FROM sections ORDER BY act_id, id').all();
  const documents = dbRef.prepare('SELECT * FROM legal_documents ORDER BY id DESC').all();
  const docSections = dbRef.prepare('SELECT * FROM document_sections ORDER BY document_id, id').all();
  return { acts, sections, documents, docSections };
}

function getLegalDocuments() {
  const dbRef = getDb();
  return dbRef.prepare('SELECT * FROM legal_documents ORDER BY id DESC').all();
}

function getLegalDocumentById(id) {
  const dbRef = getDb();
  const document = dbRef.prepare('SELECT * FROM legal_documents WHERE id = ?').get(id);
  if (!document) return null;
  const sections = dbRef.prepare('SELECT * FROM document_sections WHERE document_id = ? ORDER BY id').all(id);
  return { ...document, sections };
}

function getModuleRecords(moduleName) {
  const dbRef = getDb();
  const map = {
    scenarios: 'SELECT * FROM scenarios ORDER BY id',
    powers: 'SELECT * FROM powers ORDER BY id',
    jurisdictions: 'SELECT * FROM jurisdictions ORDER BY id',
    cases: 'SELECT * FROM cases ORDER BY id',
    checklists: 'SELECT * FROM checklists ORDER BY id',
    forms: 'SELECT * FROM forms ORDER BY id',
    documents: 'SELECT * FROM legal_documents ORDER BY id DESC',
    'document-sections': 'SELECT * FROM document_sections ORDER BY id',
  };

  const sql = map[moduleName] || 'SELECT 1';
  return dbRef.prepare(sql).all();
}

function resolveLegalBasis(searchText, limit = 6) {
  const dbRef = getDb();
  const query = String(searchText || '').trim();
  if (!query) {
    return [];
  }

  const likePattern = `%${query}%`;
  const rowLimit = Number.isFinite(Number(limit)) ? Math.max(1, Number(limit)) : 6;

  const results = [];

  const actRows = dbRef.prepare(`SELECT title, description AS summary, source, status, version, 'ACT' AS type FROM acts WHERE title LIKE ? OR description LIKE ? OR keywords LIKE ? OR full_text LIKE ? LIMIT ?`).all(likePattern, likePattern, likePattern, likePattern, rowLimit);
  actRows.forEach((row) => results.push({ ...row, match: 'Act match' }));

  const sectionRows = dbRef.prepare(`SELECT title, summary, source, status, version, 'SECTION' AS type FROM sections WHERE title LIKE ? OR summary LIKE ? OR keywords LIKE ? OR full_text LIKE ? LIMIT ?`).all(likePattern, likePattern, likePattern, likePattern, rowLimit);
  sectionRows.forEach((row) => results.push({ ...row, match: 'Section match' }));

  const powerRows = dbRef.prepare(`SELECT title, description AS summary, source, status, version, 'POWER' AS type FROM powers WHERE title LIKE ? OR description LIKE ? OR keywords LIKE ? OR full_text LIKE ? LIMIT ?`).all(likePattern, likePattern, likePattern, likePattern, rowLimit);
  powerRows.forEach((row) => results.push({ ...row, match: 'Power match' }));

  const offenceRows = dbRef.prepare(`SELECT title, description AS summary, source, status, version, 'OFFENCE' AS type FROM offences WHERE title LIKE ? OR description LIKE ? OR keywords LIKE ? OR full_text LIKE ? LIMIT ?`).all(likePattern, likePattern, likePattern, likePattern, rowLimit);
  offenceRows.forEach((row) => results.push({ ...row, match: 'Offence match' }));

  const legalDocumentRows = dbRef.prepare(`SELECT title, summary, source_name AS source, status, version, 'LEGAL_DOCUMENT' AS type FROM legal_documents WHERE title LIKE ? OR summary LIKE ? OR keywords LIKE ? OR full_text LIKE ? LIMIT ?`).all(likePattern, likePattern, likePattern, likePattern, rowLimit);
  legalDocumentRows.forEach((row) => results.push({ ...row, match: 'Document match' }));

  return results.slice(0, rowLimit * 5);
}

function importLegalDocument(payload = {}) {
  const dbRef = getDb();
  const title = String(payload.title || '').trim();
  const text = String(payload.text || payload.full_text || '').trim();
  if (!title || !text) {
    return { ok: false, message: 'Document title and text are required.' };
  }

  const type = String(payload.type || 'ACT').trim() || 'ACT';
  const sourceName = String(payload.source_name || payload.sourceName || 'LOCAL IMPORT').trim();
  const reference = String(payload.reference || '').trim();
  const effectiveDate = String(payload.effective_date || payload.effectiveDate || '').trim();
  const verificationDate = String(payload.verification_date || payload.verificationDate || new Date().toISOString().slice(0, 10)).trim();
  const verificationAuthority = String(payload.verification_authority || payload.verificationAuthority || 'LOCAL OFFICER REVIEW').trim();
  const version = String(payload.version || '1.0.0').trim();
  const status = String(payload.status || 'DRAFT').trim();
  const keywords = String(payload.keywords || '').trim();
  const summary = String(payload.summary || text.slice(0, 300)).trim();

  const insertDocument = dbRef.prepare(`INSERT INTO legal_documents (
    title, type, source_name, reference, effective_date, verification_date, verification_authority, version, status, keywords, summary, full_text
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const result = insertDocument.run(
    title,
    type,
    sourceName,
    reference,
    effectiveDate,
    verificationDate,
    verificationAuthority,
    version,
    status,
    keywords,
    summary,
    text
  );

  const documentId = Number(result.lastInsertRowid);
  const sections = text
    .split(/\n{2,}|\n(?=(?:[A-Z][A-Za-z0-9\s\-]+:|\d+\.?\s|Chapter\s|Section\s))/)
    .map((section) => section.trim())
    .filter(Boolean);

  if (sections.length > 0) {
    const insertSection = dbRef.prepare(`INSERT INTO document_sections (
      document_id, section_number, title, summary, full_text, keywords, source_reference, version, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);

    sections.forEach((sectionText, index) => {
      const headingMatch = sectionText.match(/^(?:Section\s+\d+[:.-]?\s*|Chapter\s+[A-Za-z0-9.-]+[:.-]?\s*|\d+[.)]\s*)?(.*)$/i);
      const sectionTitle = (headingMatch && headingMatch[2] && headingMatch[2].trim()) || `Section ${index + 1}`;
      const sectionSummary = sectionText.length > 200 ? `${sectionText.slice(0, 200)}...` : sectionText;
      insertSection.run(
        documentId,
        `SEC-${index + 1}`,
        sectionTitle,
        sectionSummary,
        sectionText,
        keywords,
        reference,
        version,
        status
      );
    });
  }

  dbRef.prepare('INSERT INTO legal_versions (entity_type, entity_id, version, change_summary, status) VALUES (?, ?, ?, ?, ?)')
    .run('LEGAL_DOCUMENT', documentId, version, `Imported document: ${title}`, status);

  dbRef.prepare('INSERT INTO audit_log (action, details) VALUES (?, ?)')
    .run('LEGAL_DOCUMENT_IMPORTED', `Document ${title} imported and indexed.`);

  return { ok: true, id: documentId, message: 'Legal document imported successfully.' };
}

function verifyLogin(username, password) {
  const dbRef = getDb();
  const user = dbRef.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) return { ok: false, message: 'Invalid credentials.' };

  const hash = hashPassword(password);
  if (user.password_hash !== hash) {
    return { ok: false, message: 'Invalid credentials.' };
  }

  dbRef.prepare('INSERT INTO audit_log (action, details) VALUES (?, ?)').run('LOGIN', `User ${username} logged in.`);

  return { ok: true, user: { id: user.id, username: user.username, role: user.role, name: user.name } };
}

function addCase(payload) {
  const dbRef = getDb();
  const caseNumber = `CASE-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
  const insert = dbRef.prepare(`INSERT INTO cases (
    case_number, title, vessel, persons, location, maritime_zone, scenario, reason, applicable_legislation,
    potential_offence, actions, evidence, witnesses, handover, remarks
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

  const result = insert.run(
    caseNumber,
    payload.title || 'Untitled case',
    payload.vessel || '',
    payload.persons || '',
    payload.location || '',
    payload.maritime_zone || '',
    payload.scenario || '',
    payload.reason || '',
    payload.applicable_legislation || '',
    payload.potential_offence || '',
    payload.actions || '',
    payload.evidence || '',
    payload.witnesses || '',
    payload.handover || '',
    payload.remarks || ''
  );

  dbRef.prepare('INSERT INTO audit_log (action, details) VALUES (?, ?)').run('CASE_CREATED', `Case ${caseNumber} created.`);
  return { ok: true, id: result.lastInsertRowid, caseNumber };
}

function addEvidence(payload) {
  const dbRef = getDb();
  const evidenceId = `EV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
  const insert = dbRef.prepare(`INSERT INTO evidence (evidence_id, category, description, event_datetime, location, collected_by, associated_vessel, associated_person, source, storage_location, remarks) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const result = insert.run(
    evidenceId,
    payload.category || 'Other',
    payload.description || '',
    payload.event_datetime || new Date().toISOString(),
    payload.location || '',
    payload.collected_by || '',
    payload.associated_vessel || '',
    payload.associated_person || '',
    payload.source || '',
    payload.storage_location || '',
    payload.remarks || ''
  );
  dbRef.prepare('INSERT INTO audit_log (action, details) VALUES (?, ?)').run('EVIDENCE_CREATED', `Evidence ${evidenceId} added.`);
  return { ok: true, id: result.lastInsertRowid, evidenceId };
}

function addCaseEvent(payload) {
  const dbRef = getDb();
  const insert = dbRef.prepare('INSERT INTO case_events (case_id, event_time, description) VALUES (?, ?, ?)');
  const result = insert.run(payload.case_id, payload.event_time || new Date().toTimeString().slice(0, 5), payload.description || 'Event');
  return { ok: true, id: result.lastInsertRowid };
}

function getCases() {
  const dbRef = getDb();
  const cases = dbRef.prepare('SELECT * FROM cases ORDER BY id DESC').all();
  const events = dbRef.prepare('SELECT * FROM case_events ORDER BY case_id, id').all();
  return { cases, events };
}

function createBackup() {
  const dbRef = getDb();
  const backupPath = path.join(APP_DATA_DIR, `samudra-lex-backup-${Date.now()}.db`);
  const source = fs.readFileSync(DB_FILE);
  fs.writeFileSync(backupPath, source);
  dbRef.prepare('INSERT INTO audit_log (action, details) VALUES (?, ?)').run('BACKUP_CREATED', `Backup created at ${backupPath}`);
  return { ok: true, path: backupPath };
}

function restoreBackup(backupPath) {
  if (!backupPath || !fs.existsSync(backupPath)) {
    throw new Error('Backup file not found.');
  }

  const currentDb = getDb();
  const original = fs.readFileSync(DB_FILE);
  fs.writeFileSync(path.join(APP_DATA_DIR, `samudra-lex-pre-restore-${Date.now()}.db`), original);
  fs.copyFileSync(backupPath, DB_FILE);
  currentDb.close();
  db = new Database(DB_FILE);
  db.pragma('journal_mode = WAL');
  db.prepare('INSERT INTO audit_log (action, details) VALUES (?, ?)').run('DATABASE_RESTORED', `Database restored from ${backupPath}`);
  return { ok: true, message: 'Database restored successfully.' };
}

module.exports = {
  initDatabase,
  seedDatabase,
  initializeDatabase,
  runCli,
  getDb,
  search,
  getOverview,
  getScenarios,
  getScenarioById,
  getLawLibrary,
  getLegalDocuments,
  getLegalDocumentById,
  resolveLegalBasis,
  importLegalDocument,
  getModuleRecords,
  verifyLogin,
  addCase,
  addEvidence,
  addCaseEvent,
  getCases,
  createBackup,
  restoreBackup,
};

if (require.main === module) {
  runCli();
}
