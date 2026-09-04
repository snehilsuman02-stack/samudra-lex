# SAMUDRA-LEX

SAMUDRA-LEX is an offline-first desktop decision-support application for maritime law enforcement operations. It is designed as a professional prototype for Indian Coast Guard-style workflow support and is built around local SQLite storage, secure Electron architecture, and a modular legal reference experience.

## Purpose

This application helps officers quickly:

- identify potentially relevant laws and powers
- review scenario-based operational guidance
- support boarding, search, seizure, detention, and arrest assessment
- document evidence and case development
- generate draft reports and checklists
- maintain data locally with backup and restore controls

The software is a legal reference and workflow support tool. It does not create authority or replace formal legal advice.

## Demo legal status

All legal content used in the initial prototype is clearly marked as DEMO DATA and is NOT for operational use.

## Features

- Offline Electron desktop application
- SQLite database with local persistence
- Search across legal records, powers, scenarios, checklists, and forms
- Scenario-based assistant workflow
- Jurisdiction decision support panel
- Boarding workflow wizard
- Search and seizure workflow
- Arrest decision-support module
- Evidence and case builder
- Checklist manager
- draft report generation
- backup and restore support
- local authentication and audit logging

## Installation

1. Install Node.js 18 or later.
2. Open a terminal in the project folder.
3. Run:

```bash
npm install
```

## Development

```bash
npm run dev
```

## Database setup

```bash
npm run database:init
npm run database:seed
```

## Windows packaging

```bash
npm run package
```

This creates a distributable Windows build in the `dist` directory.

## Architecture summary

- Electron main process manages app lifecycle and security.
- Preload script exposes a narrow safe API to the renderer.
- SQLite is the source of truth for legal content, cases, evidence, and settings.
- Renderer modules are organized by feature.

## Legal content management

See the docs folder for the legal content guide and architecture reference.

## Security and operational note

The app is designed to operate without internet access. Core functionality relies only on the local SQLite database and the local filesystem.

> IMPORTANT NOTICE
>
> SAMUDRA-LEX is a legal-reference and decision-support application. It does not itself confer any statutory power or authority upon any user.
