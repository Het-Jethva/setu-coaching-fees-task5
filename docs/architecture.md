# Enrollment owns financial changes

The application uses Next.js route handlers and React views over PostgreSQL. Server-derived sessions scope every read and write to the reviewer workspace, staff centres, or linked children.

## Module map

- `domain/model.ts`: boundary schemas and the types derived from them.
- `domain/money.ts`: pure integer-paise, date, standing, and refund calculations.
- `server/db.ts`: PostgreSQL connections and schema setup.
- `server/access.ts`: isolated demo provisioning, OTPs, sessions, consent, and scope.
- `server/enrollment.ts`: the only writer of financial facts, plus checkout, reconciliation, withdrawal, payouts, and reminder processing.
- `server/academics.ts`: CSV preview and atomic import.
- `server/risk.ts`: anonymous evidence, durable quotas, provider requests, and review tasks.
- `server/reporting.ts`: ledger-derived dashboard and Tally serialization.
- `app/api`: transport validation and calls into the owning module.
- `components`: shadcn primitives and the application screens.

Financial commands lock the student enrollment before reading current financial events and appending new facts. Mock message delivery is a database record, so its eligibility check and delivery can commit under the same lock as payments. External AI calls run outside database transactions.

## Design comparison

Two isolated candidates compared a full balanced-posting journal with a narrower enrollment journal. Scores use 1–5, where 5 best fits this assignment.

| Criterion | Balanced-posting candidate A | Enrollment candidate B |
| --- | ---: | ---: |
| Transactional consistency | 5 | 5 |
| Workspace, centre, and parent isolation | 5 | 5 |
| Small public API and module simplicity | 3 | 5 |
| Serverless deployment fit | 4 | 5 |
| Testable money and retry rules | 5 | 5 |

Use B as the base. Graft A's UTC-day AI-attempt accounting, final-balance recheck before reminders, stable operation keys, and explicit distinction between received and allocated money. Reject a full general-ledger chart of accounts because this product manages fees rather than replacing Tally. Keep normalized operational records and append-only financial facts, with no event bus, background projection worker, or writable cached balances.

The skill's default Claude and Grok model families are unavailable in this session. Both candidate seats used the inherited model, and the separate-family cross-judge was skipped. This comparison establishes the design contract; runtime tests still need to prove the implementation.

## Key invariants

Money uses integer paise and deterministic rounding. Payment allocations cannot exceed either received money or current instalment balance. Withdrawn balances use earned course fees, not the original instalment schedule. Corrections preserve originals and cannot release already refunded funds without reversing the payout first.

Callbacks and refund confirmation use stable request identities. Reminder stages have unique database keys. Parent consent and centre scope are checked on the server. Academic imports validate the full preview again at confirmation. AI quotas reserve attempts before networking, count failures, and use the UTC day to match the provider's reset.
