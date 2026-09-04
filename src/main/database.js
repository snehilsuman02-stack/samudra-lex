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
  let sql = '';
  const params = [];

  if (type === 'ALL') {
    sql = `
      SELECT title AS title, 'ACT' AS type, description AS description, source AS source, status AS status, version AS version FROM acts WHERE title LIKE ? OR description LIKE ? OR keywords LIKE ?
      UNION ALL
      SELECT title, 'SECTION', summary, source, status, version FROM sections WHERE title LIKE ? OR summary LIKE ? OR keywords LIKE ?
      UNION ALL
      SELECT title, 'POWER', description, source, status, version FROM powers WHERE title LIKE ? OR description LIKE ? OR keywords LIKE ?
      UNION ALL
      SELECT title AS title, 'SCENARIO' AS type, situation AS description, 'DEMO DATABASE' AS source, status AS status, '1.0.0' AS version FROM scenarios WHERE title LIKE ? OR situation LIKE ?
      UNION ALL
      SELECT title, 'CHECKLIST', description, source, status, version FROM checklists WHERE title LIKE ? OR description LIKE ?
      UNION ALL
      SELECT title, 'FORM', description, source, status, version FROM forms WHERE title LIKE ? OR description LIKE ?
      LIMIT 50`;

    params.push(
      likePattern, likePattern, likePattern,
      likePattern, likePattern, likePattern,
      likePattern, likePattern, likePattern,
      likePattern, likePattern,
      likePattern, likePattern,
      likePattern, likePattern
    );
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
  return { acts, sections };
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
  };

  const sql = map[moduleName] || 'SELECT 1';
  return dbRef.prepare(sql).all();
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
