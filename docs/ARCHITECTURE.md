# SAMUDRA-LEX Architecture

## Frontend

The renderer is a browser-based interface rendered by Electron. It displays dashboards, search results, scenario assessments, boarding workflows, evidence modules, and report generation.

## Electron

The Electron main process manages the app lifecycle, creates the secure BrowserWindow, and initializes local app-data. The preload script is the only bridge to the renderer and exposes a narrow API.

## SQLite

SQLite is the source of truth for all legal data, workloads, evidence, settings, and cases. Local persistence allows full offline operation.

## IPC

The app uses Electron IPC to request database queries and actions from the renderer without exposing Node.js APIs to the browser.

## Security

- contextIsolation enabled
- nodeIntegration disabled
- prepared SQL statements
- password hashing with SHA-256
- no online dependency for core features

## Decision engine

The system matches scenario, power, and jurisdiction information from the approved database and returns a decision-support assessment with clear legal cautioning.

## Future AI / RAG

The design allows later local retrieval and citation layers to work over the approved legal corpus, with all answers requiring source, act, section, version, and verification date.
