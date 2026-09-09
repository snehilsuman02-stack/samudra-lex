# SAMUDRA-LEX

## Project purpose

SAMUDRA-LEX is a lightweight maritime law-enforcement decision-support foundation for Indian Coast Guard operational users. Its eventual workflow will help an officer describe a situation, identify a possible scenario, locate verified legal information, and review source references.

The current version is only the foundation. It does **not** contain a complete verified legal database and must not be treated as legal advice or an operational order.

## Current technology stack

- HTML
- CSS
- Vanilla JavaScript ES modules
- JSON data files
- No framework, package manager, backend, database, Firebase, Electron, or external runtime dependency

## Current V1 architecture

- `index.html` provides the situation-first user interface.
- `js/app.js` handles form submission and result rendering.
- `js/scenarioEngine.js` provides transparent keyword-based operational category detection.
- `js/legalEngine.js` returns the future analysis contract with empty legal collections.
- `js/dataLoader.js` provides relative-path JSON loading helpers.
- `data/` contains schema placeholders for future verified legal data.

The planned legal data relationship is ACT -> SECTION -> SUBSECTION -> CLAUSE, with links to scenarios, powers, conditions, procedures, evidence, handover and sources.

## Current limitations

- No verified Acts, sections, offences, powers, procedures, jurisdiction rules or source records are populated.
- Scenario detection is basic keyword matching and is not legal analysis.
- The application does not authenticate users, store records, call an AI service, or provide offline packaging.
- Opening the HTML directly from a `file://` URL may prevent browser `fetch()` calls to JSON files. Use a local static server when testing data loading.

## Planned future development

1. Define a governance and verification process for authoritative legal source material.
2. Add reviewed JSON records for Acts, provisions and source references.
3. Connect scenario categories to legal records without inferring unsupported conclusions.
4. Add transparent conditions, limitations, evidence and handover guidance from verified sources.
5. Add focused tests for data validation and scenario-to-source retrieval.

## How to open and test locally

The interface can be opened by opening `index.html` in a browser. For future JSON loading, use any static file server from the project directory, for example:

```text
python -m http.server 8000
```

Then open `http://localhost:8000/`. Enter a situation such as the example shown in the interface and select **ANALYSE SITUATION**. Confirm that operational categories can appear and that the result still shows **NO VERIFIED LEGAL BASIS FOUND**.

## Planned GitHub Pages deployment

The project is designed for GitHub Pages: all application paths are relative, there is no backend requirement, and the site can be served as static files. Deployment is intentionally not configured yet.
