PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS acts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  short_name TEXT,
  act_name TEXT,
  type TEXT DEFAULT 'ACT',
  description TEXT,
  full_text TEXT,
  source TEXT,
  source_reference TEXT,
  effective_date TEXT,
  verification_date TEXT,
  verification_authority TEXT,
  version TEXT,
  status TEXT DEFAULT 'DRAFT',
  keywords TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS sections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  act_id INTEGER,
  section_number TEXT,
  title TEXT,
  summary TEXT,
  full_text TEXT,
  related_powers TEXT,
  related_offences TEXT,
  related_scenarios TEXT,
  related_procedures TEXT,
  source TEXT,
  source_reference TEXT,
  effective_date TEXT,
  verification_date TEXT,
  verification_authority TEXT,
  version TEXT,
  status TEXT DEFAULT 'DRAFT',
  keywords TEXT,
  notes TEXT,
  FOREIGN KEY(act_id) REFERENCES acts(id)
);

CREATE TABLE IF NOT EXISTS rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  type TEXT DEFAULT 'RULE',
  act_name TEXT,
  section TEXT,
  description TEXT,
  full_text TEXT,
  source TEXT,
  source_reference TEXT,
  effective_date TEXT,
  verification_date TEXT,
  verification_authority TEXT,
  version TEXT,
  status TEXT DEFAULT 'DRAFT',
  keywords TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS regulations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  type TEXT DEFAULT 'REGULATION',
  act_name TEXT,
  section TEXT,
  description TEXT,
  full_text TEXT,
  source TEXT,
  source_reference TEXT,
  effective_date TEXT,
  verification_date TEXT,
  verification_authority TEXT,
  version TEXT,
  status TEXT DEFAULT 'DRAFT',
  keywords TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  type TEXT DEFAULT 'NOTIFICATION',
  act_name TEXT,
  section TEXT,
  description TEXT,
  full_text TEXT,
  source TEXT,
  source_reference TEXT,
  effective_date TEXT,
  verification_date TEXT,
  verification_authority TEXT,
  version TEXT,
  status TEXT DEFAULT 'DRAFT',
  keywords TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS government_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  type TEXT DEFAULT 'GOVERNMENT_ORDER',
  act_name TEXT,
  section TEXT,
  description TEXT,
  full_text TEXT,
  source TEXT,
  source_reference TEXT,
  effective_date TEXT,
  verification_date TEXT,
  verification_authority TEXT,
  version TEXT,
  status TEXT DEFAULT 'DRAFT',
  keywords TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS delegations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  type TEXT DEFAULT 'DELEGATION',
  act_name TEXT,
  section TEXT,
  description TEXT,
  full_text TEXT,
  source TEXT,
  source_reference TEXT,
  effective_date TEXT,
  verification_date TEXT,
  verification_authority TEXT,
  version TEXT,
  status TEXT DEFAULT 'DRAFT',
  keywords TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS powers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  act_name TEXT,
  section_ref TEXT,
  description TEXT,
  full_text TEXT,
  source TEXT,
  source_reference TEXT,
  effective_date TEXT,
  verification_date TEXT,
  verification_authority TEXT,
  version TEXT,
  status TEXT DEFAULT 'DRAFT',
  keywords TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS power_conditions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  power_id INTEGER,
  condition_text TEXT,
  FOREIGN KEY(power_id) REFERENCES powers(id)
);

CREATE TABLE IF NOT EXISTS offences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  type TEXT DEFAULT 'OFFENCE',
  act_name TEXT,
  section TEXT,
  description TEXT,
  full_text TEXT,
  source TEXT,
  source_reference TEXT,
  effective_date TEXT,
  verification_date TEXT,
  verification_authority TEXT,
  version TEXT,
  status TEXT DEFAULT 'DRAFT',
  keywords TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS jurisdictions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  zone_name TEXT,
  description TEXT,
  relevant_law TEXT,
  powers TEXT,
  limitations TEXT,
  source TEXT,
  source_reference TEXT,
  effective_date TEXT,
  verification_date TEXT,
  verification_authority TEXT,
  version TEXT,
  status TEXT DEFAULT 'DRAFT'
);

CREATE TABLE IF NOT EXISTS scenarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT,
  category TEXT,
  situation TEXT,
  jurisdiction TEXT,
  potential_laws TEXT,
  potential_powers TEXT,
  conditions TEXT,
  immediate_actions TEXT,
  evidence TEXT,
  documentation TEXT,
  handover TEXT,
  escalation TEXT,
  status TEXT DEFAULT 'DEMO',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS scenario_law (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scenario_id INTEGER,
  act_name TEXT,
  section_ref TEXT,
  source TEXT,
  notes TEXT,
  FOREIGN KEY(scenario_id) REFERENCES scenarios(id)
);

CREATE TABLE IF NOT EXISTS scenario_powers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scenario_id INTEGER,
  power_name TEXT,
  description TEXT,
  FOREIGN KEY(scenario_id) REFERENCES scenarios(id)
);

CREATE TABLE IF NOT EXISTS scenario_procedures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scenario_id INTEGER,
  title TEXT,
  description TEXT,
  FOREIGN KEY(scenario_id) REFERENCES scenarios(id)
);

CREATE TABLE IF NOT EXISTS checklists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT,
  category TEXT,
  description TEXT,
  source TEXT,
  version TEXT,
  status TEXT DEFAULT 'DRAFT'
);

CREATE TABLE IF NOT EXISTS checklist_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  checklist_id INTEGER,
  item_text TEXT,
  note TEXT,
  completed INTEGER DEFAULT 0,
  timestamp TEXT,
  FOREIGN KEY(checklist_id) REFERENCES checklists(id)
);

CREATE TABLE IF NOT EXISTS forms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT,
  category TEXT,
  description TEXT,
  source TEXT,
  version TEXT,
  status TEXT DEFAULT 'DRAFT'
);

CREATE TABLE IF NOT EXISTS legal_sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT,
  type TEXT,
  source_name TEXT,
  reference TEXT,
  effective_date TEXT,
  verification_date TEXT,
  verification_authority TEXT,
  version TEXT,
  status TEXT DEFAULT 'DRAFT'
);

CREATE TABLE IF NOT EXISTS legal_documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  type TEXT DEFAULT 'ACT',
  source_name TEXT,
  reference TEXT,
  effective_date TEXT,
  verification_date TEXT,
  verification_authority TEXT,
  version TEXT DEFAULT '1.0.0',
  status TEXT DEFAULT 'DRAFT',
  keywords TEXT,
  summary TEXT,
  full_text TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS document_sections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER,
  section_number TEXT,
  title TEXT,
  summary TEXT,
  full_text TEXT,
  keywords TEXT,
  source_reference TEXT,
  version TEXT DEFAULT '1.0.0',
  status TEXT DEFAULT 'DRAFT',
  FOREIGN KEY(document_id) REFERENCES legal_documents(id)
);

CREATE TABLE IF NOT EXISTS legal_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT,
  entity_id INTEGER,
  version TEXT,
  change_summary TEXT,
  status TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE VIRTUAL TABLE IF NOT EXISTS legal_documents_fts USING fts5(
  title, type, source_name, reference, summary, full_text, keywords, content='legal_documents', content_rowid='id'
);

CREATE VIRTUAL TABLE IF NOT EXISTS document_sections_fts USING fts5(
  title, summary, full_text, keywords, content='document_sections', content_rowid='id'
);

CREATE TRIGGER IF NOT EXISTS legal_documents_ai AFTER INSERT ON legal_documents BEGIN
  INSERT INTO legal_documents_fts(rowid, title, type, source_name, reference, summary, full_text, keywords)
  VALUES (new.id, new.title, new.type, new.source_name, new.reference, new.summary, new.full_text, new.keywords);
END;

CREATE TRIGGER IF NOT EXISTS legal_documents_ad AFTER DELETE ON legal_documents BEGIN
  INSERT INTO legal_documents_fts(legal_documents_fts, rowid, title, type, source_name, reference, summary, full_text, keywords)
  VALUES('delete', old.id, old.title, old.type, old.source_name, old.reference, old.summary, old.full_text, old.keywords);
END;

CREATE TRIGGER IF NOT EXISTS legal_documents_au AFTER UPDATE ON legal_documents BEGIN
  INSERT INTO legal_documents_fts(legal_documents_fts, rowid, title, type, source_name, reference, summary, full_text, keywords)
  VALUES('delete', old.id, old.title, old.type, old.source_name, old.reference, old.summary, old.full_text, old.keywords);
  INSERT INTO legal_documents_fts(rowid, title, type, source_name, reference, summary, full_text, keywords)
  VALUES (new.id, new.title, new.type, new.source_name, new.reference, new.summary, new.full_text, new.keywords);
END;

CREATE TRIGGER IF NOT EXISTS document_sections_ai AFTER INSERT ON document_sections BEGIN
  INSERT INTO document_sections_fts(rowid, title, summary, full_text, keywords)
  VALUES (new.id, new.title, new.summary, new.full_text, new.keywords);
END;

CREATE TRIGGER IF NOT EXISTS document_sections_ad AFTER DELETE ON document_sections BEGIN
  INSERT INTO document_sections_fts(document_sections_fts, rowid, title, summary, full_text, keywords)
  VALUES('delete', old.id, old.title, old.summary, old.full_text, old.keywords);
END;

CREATE TRIGGER IF NOT EXISTS document_sections_au AFTER UPDATE ON document_sections BEGIN
  INSERT INTO document_sections_fts(document_sections_fts, rowid, title, summary, full_text, keywords)
  VALUES('delete', old.id, old.title, old.summary, old.full_text, old.keywords);
  INSERT INTO document_sections_fts(rowid, title, summary, full_text, keywords)
  VALUES (new.id, new.title, new.summary, new.full_text, new.keywords);
END;

CREATE TABLE IF NOT EXISTS cases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_number TEXT,
  title TEXT,
  vessel TEXT,
  persons TEXT,
  location TEXT,
  maritime_zone TEXT,
  scenario TEXT,
  reason TEXT,
  applicable_legislation TEXT,
  potential_offence TEXT,
  actions TEXT,
  evidence TEXT,
  witnesses TEXT,
  handover TEXT,
  remarks TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS case_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id INTEGER,
  event_time TEXT,
  description TEXT,
  FOREIGN KEY(case_id) REFERENCES cases(id)
);

CREATE TABLE IF NOT EXISTS evidence (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  evidence_id TEXT,
  category TEXT,
  description TEXT,
  event_datetime TEXT,
  location TEXT,
  collected_by TEXT,
  associated_vessel TEXT,
  associated_person TEXT,
  source TEXT,
  storage_location TEXT,
  remarks TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS evidence_transfers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  evidence_id INTEGER,
  transferred_by TEXT,
  transferred_to TEXT,
  transfer_time TEXT,
  purpose TEXT,
  reference TEXT,
  FOREIGN KEY(evidence_id) REFERENCES evidence(id)
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL,
  name TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT,
  details TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key_name TEXT UNIQUE,
  key_value TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_acts_title ON acts(title);
CREATE INDEX IF NOT EXISTS idx_sections_title ON sections(title);
CREATE INDEX IF NOT EXISTS idx_powers_title ON powers(title);
CREATE INDEX IF NOT EXISTS idx_scenarios_title ON scenarios(title);
CREATE INDEX IF NOT EXISTS idx_cases_number ON cases(case_number);
