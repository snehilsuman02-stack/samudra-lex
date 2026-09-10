# Legal database expansion framework

This directory contains the structural foundation for the next legal-data expansion phase.

The project currently stores its legal material as JSON records in the `data/` tree rather than a separate SQLite database. To support future expansion without redesigning the application, the framework below keeps legal records in a structured, version-aware, evidence-aware pattern.

## Core tables

- `legal_sources`
- `acts`
- `sections`
- `legal_elements`
- `fact_requirements`
- `evidence_requirements`
- `offences`
- `penalties`
- `jurisdiction_zones`

## Design principles

- Preserve the existing verified records and engine behavior.
- Do not create imagined Acts, sections, offences, or source references.
- Treat a section as a provision that can have subsections, clauses, and legal elements.
- Keep evidence and verification separate from the legal conclusion itself.
- Preserve legal version metadata (`status`, `effective_from`, `effective_to`, `verification_status`).

## Future expansion path

The framework is deliberately neutral. It allows future addition of maritime, fisheries, customs, pollution, wildlife, and other relevant bodies of law without requiring the UI to be rebuilt.

The next phases should add only verified records already present in authoritative legal sources.
