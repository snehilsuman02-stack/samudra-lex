import { createActRecord, createEvidenceRequirement, createFactRequirement, createJurisdictionZone, createLegalElement, createLegalSourceRecord, createOffenceRecord, createPenaltyRecord, createSectionRecord, normalizeSectionKey, validateLegalDatabase } from "./legalDatabase.js";

const validSource = createLegalSourceRecord({
  source_id: "source-1",
  source_type: "ACT",
  title: "The Maritime Zones of India (Regulation of Fishing by Foreign Vessels) Act, 1981",
  short_title: "Foreign Fishing Vessels Act",
  jurisdiction: "India",
  issuing_authority: "Government of India",
  year: 1981,
  commencement_date: "1981-01-01",
  status: "CURRENT",
  source_reference: "India Code",
  verification_status: "VERIFIED",
  version: "1.0",
  notes: "Verified source"
});

const validAct = createActRecord({
  act_id: "act-1",
  legal_source_id: validSource.source_id,
  act_name: "The Maritime Zones of India (Regulation of Fishing by Foreign Vessels) Act, 1981",
  short_title: "Foreign Fishing Vessels Act",
  year: 1981,
  jurisdiction: "India",
  subject_category: "FISHERIES",
  status: "CURRENT",
  commencement_date: "1981-01-01",
  source_reference: "India Code",
  verification_status: "VERIFIED"
});

const validSection = createSectionRecord({
  section_id: "section-9",
  act_id: validAct.act_id,
  section_number: "9",
  subsection: "(1)",
  clause: "(a)",
  title: "Stop or board a foreign vessel",
  provision_text: "An authorised officer may stop or board a foreign vessel.",
  offence_flag: false,
  penalty_flag: false,
  jurisdiction: "India",
  effective_from: "1981-01-01",
  source_reference: "India Code",
  verification_status: "VERIFIED"
});

const validElement = createLegalElement({
  element_id: "element-1",
  section_id: validSection.section_id,
  element_type: "VESSEL STATUS",
  description: "A foreign vessel is involved.",
  required: true,
  fact_type: "vessel.nationality",
  verification_required: true
});

const validFactRequirement = createFactRequirement({
  fact_requirement_id: "fact-1",
  section_id: validSection.section_id,
  fact_name: "vessel nationality",
  fact_type: "vessel.nationality",
  required: true,
  verification_status: "VERIFIED"
});

const validEvidence = createEvidenceRequirement({
  evidence_requirement_id: "evidence-1",
  section_id: validSection.section_id,
  element_id: validElement.element_id,
  fact_requirement_id: validFactRequirement.fact_requirement_id,
  evidence_type: "vessel documents",
  description: "Vessel registration or licence",
  verification_status: "VERIFIED"
});

const validOffence = createOffenceRecord({
  offence_id: "offence-1",
  section_id: validSection.section_id,
  offence_name: "Unlawful fishing by foreign vessel",
  offence_description: "Fishing without compliance with section 9 requirements.",
  offence_category: "FISHERIES",
  jurisdiction: "India",
  penalty_reference: "Section 10",
  verification_required: true,
  status: "CURRENT",
  notes: "Offence record"
});

const validPenalty = createPenaltyRecord({
  penalty_id: "penalty-1",
  section_id: validSection.section_id,
  offence_id: validOffence.offence_id,
  penalty_type: "FINE",
  fine: "INR 10 lakhs",
  effective_from: "1981-01-01",
  source_reference: "India Code",
  verification_status: "VERIFIED"
});

const validZone = createJurisdictionZone({
  zone_id: "zone-1",
  zone_category: "TERRITORIAL WATERS",
  name: "Territorial Waters",
  jurisdiction: "India",
  status: "CURRENT"
});

const db = {
  legal_sources: [validSource],
  acts: [validAct],
  sections: [validSection],
  legal_elements: [validElement],
  fact_requirements: [validFactRequirement],
  evidence_requirements: [validEvidence],
  offences: [validOffence],
  penalties: [validPenalty],
  jurisdiction_zones: [validZone]
};

const result = validateLegalDatabase(db);
if (!result.valid) {
  throw new Error(`Database validation failed: ${result.errors.join("; ")}`);
}

if (normalizeSectionKey("9") !== "9") {
  throw new Error("Section key normalization failed for plain section number");
}

if (normalizeSectionKey("9(1)(a)") !== "9(1)(a)") {
  throw new Error("Section key normalization failed for subsection and clause");
}

if (validateLegalDatabase({ ...db, sections: [{ ...validSection, section_id: "dup" }, { ...validSection, section_id: "dup" }] }).valid) {
  throw new Error("Duplicate section IDs should be rejected");
}

console.log("LEGAL DATABASE ARCHITECTURE TESTS PASSED");
