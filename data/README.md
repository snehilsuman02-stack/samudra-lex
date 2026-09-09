# SAMUDRA-LEX Legal Data

SAMUDRA-LEX legal data follows these principles:

1. All legal information must come from verified authoritative sources.
2. Do not invent legal provisions.
3. Every substantive legal record should contain a `sourceId`.
4. Records should contain verification status and `lastVerified`.
5. A missing database record must not be interpreted as proof that no law exists.
6. Facts, suspected offences, legal powers and legal conclusions must remain separate.
7. SAMUDRA-LEX is a legal decision-support system and does not replace legal judgment.

## Legal distinction

The database must never automatically treat `licence not produced` as `no valid licence`, and must never automatically treat either statement as `offence committed`.

Records should preserve this distinction:

```text
FACT
  -> LEGAL REQUIREMENT
  -> SUSPECTED OFFENCE
  -> OFFENCE
  -> LEGAL POWER
  -> CONDITION / LIMITATION
  -> PROCEDURE
```

Schema files define the structure for future verified records. They do not contain legal conclusions or substantive legal content.
