INSERT INTO settings (key_name, key_value) VALUES
('app_version', '1.0.0'),
('db_version', '1.0.0'),
('last_verified', '2026-09-04'),
('database_status', 'DEMO DATA — NOT FOR OPERATIONAL USE');

INSERT INTO users (username, password_hash, role, name) VALUES
('officer', '118b8d35a17bcf2c7d2d790509e12308dc6332c5d234f0098d2d6be6700bebb1', 'OFFICER', 'Duty Officer'),
('legaladmin', 'aa1d1ee9f55a4359ab4d909c51fdf33a31b5934e215e367aa29c5a4880ac6c55', 'LEGAL ADMIN', 'Legal Admin'),
('systemadmin', '74ae50680d6a162be85365dbdec9b81af4534bbb1cf7d80be4ae3ab9c1070b99', 'SYSTEM ADMIN', 'System Admin');

INSERT INTO acts (title, short_name, act_name, type, description, full_text, source, source_reference, effective_date, verification_date, verification_authority, version, status, keywords, notes)
VALUES
('DEMO ACT — Maritime Enforcement Act', 'DEMO-MEA', 'Maritime Enforcement Act', 'ACT', 'Demonstration legal reference for prototype workflows only.', 'DEMO DATA — NOT FOR OPERATIONAL USE. This is placeholder legal content used to validate the software architecture.', 'DEMO DATABASE', 'Demo source reference', '2026-01-01', '2026-09-04', 'Demo Verification Authority', '1.0.0', 'VERIFY', 'maritime, enforcement, demo, boarding, search', 'DEMO DATA — NOT FOR OPERATIONAL USE.');

INSERT INTO sections (act_id, section_number, title, summary, full_text, related_powers, related_offences, related_scenarios, related_procedures, source, source_reference, effective_date, verification_date, verification_authority, version, status, keywords, notes)
VALUES
(1, 'DEMO-01', 'Demonstration Boarding Power', 'A demonstration section used for prototype boarding assessments.', 'DEMO DATA — NOT FOR OPERATIONAL USE. This section is illustrative only and should be replaced by verified legal content.', '1', '1', '1', '1', 'DEMO DATABASE', 'Section DEMO-01', '2026-01-01', '2026-09-04', 'Demo Verification Authority', '1.0.0', 'VERIFY', 'boarding, power, scope, demo', 'DEMO DATA — NOT FOR OPERATIONAL USE.');

INSERT INTO powers (title, act_name, section_ref, description, full_text, source, source_reference, effective_date, verification_date, verification_authority, version, status, keywords, notes)
VALUES
('Demonstration Boarding Power', 'Maritime Enforcement Act', 'DEMO-01', 'Prototype authority to direct boarding and inspection for demonstration use.', 'DEMO DATA — NOT FOR OPERATIONAL USE. This is not a real legal power.', 'DEMO DATABASE', 'Demo Power Reference', '2026-01-01', '2026-09-04', 'Demo Verification Authority', '1.0.0', 'VERIFY', 'boarding, inspection, authority, demo', 'CONDITIONAL — VERIFY ALL STATUTORY CONDITIONS BEFORE EXERCISE.');

INSERT INTO power_conditions (power_id, condition_text) VALUES
(1, 'Vessel is within the relevant maritime zone and intervention is authorised by command.'),
(1, 'Reason for boarding is documented and communicated.'),
(1, 'No conflicting legal restriction is identified by competent authority.');

INSERT INTO offences (title, type, act_name, section, description, full_text, source, source_reference, effective_date, verification_date, verification_authority, version, status, keywords, notes)
VALUES
('Demonstration Illegal Fishing', 'OFFENCE', 'Maritime Enforcement Act', 'DEMO-01', 'Prototype offence for illegal fishing assessment.', 'DEMO DATA — NOT FOR OPERATIONAL USE. This offence is illustrative only.', 'DEMO DATABASE', 'Demo offence reference', '2026-01-01', '2026-09-04', 'Demo Verification Authority', '1.0.0', 'VERIFY', 'fishing, illegal, offence, demo', 'DEMO DATA — NOT FOR OPERATIONAL USE.');

INSERT INTO jurisdictions (zone_name, description, relevant_law, powers, limitations, source, source_reference, effective_date, verification_date, verification_authority, version, status)
VALUES
('TERRITORIAL SEA', 'Demonstration zone for prototype legal assessment.', 'DEMO ACT — Maritime Enforcement Act', 'Demonstration Boarding Power', 'Jurisdiction shown is a decision-support aid and must be independently confirmed where operational or legal consequences arise.', 'DEMO DATABASE', 'Demo jurisdiction reference', '2026-01-01', '2026-09-04', 'Demo Verification Authority', '1.0.0', 'VERIFY');

INSERT INTO scenarios (title, category, situation, jurisdiction, potential_laws, potential_powers, conditions, immediate_actions, evidence, documentation, handover, escalation, status)
VALUES
('DEMO — Foreign Fishing Vessel', 'FISHERIES', 'Foreign fishing vessel without appropriate documentation or licence.', 'TERRITORIAL SEA', 'DEMO ACT — Maritime Enforcement Act; DEMO SECTION — Section DEMO-01', 'Demonstration Boarding Power', 'Verify zone, legal basis, and command authorisation.', 'Establish identity, record position, request documentation, assess risk.', 'Vessel identity, licence records, onboard logs, photographs, statements.', 'Boarding plan, search record, evidence inventory, report draft.', 'Inform local command and flag state where required.', 'Escalate to legal/command authority for verification.', 'DEMO'),
('DEMO — Suspected Illegal Fishing', 'FISHERIES', 'Suspected fishing in contravention of permit conditions.', 'TERRITORIAL SEA', 'DEMO ACT — Maritime Enforcement Act; DEMO SECTION — Section DEMO-01', 'Demonstration Boarding Power', 'Check vessel activity, permit records, catch evidence, and zone conditions.', 'Stop, board, inspect logs and catch, document findings.', 'Catch documents, photographs, logs, witness observations.', 'Boarding report, search record, evidence register.', 'Handover to competent authority if required.', 'Escalate to legal team if authority remains uncertain.', 'DEMO');

INSERT INTO scenario_law (scenario_id, act_name, section_ref, source, notes) VALUES
(1, 'Maritime Enforcement Act', 'DEMO-01', 'DEMO DATABASE', 'Prototype mapping only.'),
(2, 'Maritime Enforcement Act', 'DEMO-01', 'DEMO DATABASE', 'Prototype mapping only.');

INSERT INTO scenario_powers (scenario_id, power_name, description) VALUES
(1, 'Demonstration Boarding Power', 'Prototype authority to board and inspect for demonstration use.'),
(2, 'Demonstration Boarding Power', 'Prototype authority to board and inspect for demonstration use.');

INSERT INTO scenario_procedures (scenario_id, title, description) VALUES
(1, 'Initial assessment', 'Identify vessel, confirm position, and confirm statutory basis.'),
(2, 'Boarding procedure', 'Prepare boarding team, collect documentation, observe and record evidence.');

INSERT INTO checklists (title, category, description, source, version, status) VALUES
('Pre-boarding checklist', 'Pre-boarding', 'Prototype pre-boarding readiness checklist.', 'DEMO DATABASE', '1.0.0', 'VERIFY'),
('Boarding checklist', 'Boarding', 'Prototype boarding workflow checklist.', 'DEMO DATABASE', '1.0.0', 'VERIFY');

INSERT INTO checklist_items (checklist_id, item_text, note, completed, timestamp) VALUES
(1, 'Vessel identified', 'Confirm identity and position.', 0, NULL),
(1, 'Position recorded', 'Log latitude and longitude.', 0, NULL),
(1, 'Legal basis identified', 'Review relevant legal record and command authorisation.', 0, NULL),
(2, 'Communication recorded', 'Document radio and signal contact.', 0, NULL),
(2, 'Observations recorded', 'Capture crew, ship, location, and activity details.', 0, NULL);

INSERT INTO forms (title, category, description, source, version, status) VALUES
('Boarding Report', 'Operational', 'DEMO TEMPLATE — REQUIRES OFFICIAL VALIDATION', 'DEMO DATABASE', '1.0.0', 'VERIFY'),
('Search Record', 'Operational', 'DEMO TEMPLATE — REQUIRES OFFICIAL VALIDATION', 'DEMO DATABASE', '1.0.0', 'VERIFY');

INSERT INTO legal_sources (title, type, source_name, reference, effective_date, verification_date, verification_authority, version, status)
VALUES
('DEMO ACT — Maritime Enforcement Act', 'ACT', 'DEMO DATABASE', 'Demo legal source reference', '2026-01-01', '2026-09-04', 'Demo Verification Authority', '1.0.0', 'VERIFY');

INSERT INTO legal_versions (entity_type, entity_id, version, change_summary, status)
VALUES
('ACT', 1, '1.0.0', 'Initial demo legal record added to prototype database.', 'DRAFT');

INSERT INTO audit_log (action, details) VALUES
('SYSTEM', 'Database initialized with DEMO DATA only.'),
('SETUP', 'Application configured for offline offline operation.');
