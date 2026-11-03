# Setu coaching fees

Task 5: an end-to-end coaching institute fee ledger and bilingual parent portal, built with Next.js, TypeScript, PostgreSQL, and shadcn/ui.

- [Live app](https://setu-coaching-fees-task5.vercel.app)
- [Published refund policy](https://setu-coaching-fees-task5.vercel.app/refund-policy)
- [Deployment and reviewer guide](./deployment.md)
- [Submission ZIP](./submission/setu-task5-submission.zip)
- [Technical Design Document](./output/pdf/Technical-Design-Document.pdf)
- [Accepted product decisions](./docs/design.md)
- [Architecture](./docs/architecture.md)

## Try the demo

Choose **Accounts executive**, keep **Central accounts**, and use the displayed demo password `SetuDemo2026!`. Centre-only accounts demonstrate restricted views.

For the parent flow, choose **Parent**, request an OTP for `PARENT-01`, and enter the code shown in the demo inbox. Record demo consent. This parent sees Ishita and a fictional sibling. `PARENT-02` links Aarav, and `PARENT-03` links Mohit.

Each browser gets its own 80-student workspace with four centres and eight batches. Changes persist for 48 hours. Records come from the assignment samples and fictional generated data. No real SMS, money, or student information is used.

## Run locally

Use Node.js 24 or newer, npm, and Docker. Tested with Node.js 26 and PostgreSQL 17.

```bash
npm ci
docker compose up -d --wait
cp .env.example .env.local
npm run db:migrate
npm run dev
```

In PowerShell, use `Copy-Item .env.example .env.local` for the copy step. Open [localhost:3000](http://localhost:3000). First sign-in creates the synthetic workspace.

Add your own `OPENROUTER_API_KEY` to the ignored environment file for live risk assessment. Other flows work without it and show an explicit unavailable AI state.

## Verify

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

With the application running:

```bash
npm run verify:api
npm run verify:ai
```

The API script exercises sample data, duplicate callbacks, role/centre/reviewer isolation, consent, Hindi reminders, cancellation/retries, stale refund previews, payout limits, corrections, atomic imports, receipts, and exports. The AI script makes one real free-model batch request and checks persistence, caching, and false-flag dismissal. It consumes the configured key's free quota.

The TDD is generated from `docs/technical-design.md` and the inspected screenshots in `docs/images`. To rebuild the exact two-file submission, install Python packages `reportlab` and `pypdf`, then run `python scripts/build-submission.py`.

## Product coverage and limits

Ledgers include plans, discounts, instalments, partial payments, balances, GST receipts, and overdue days. Parents get Hindi/English dues, pay links, attendance, scores, and receipts. Staff get dashboards, ageing, reconciliation, corrections, refunds, CSV previews/imports, and Tally XML/CSV exports.

Money uses integer paise and immutable history. Reminders recheck the balance and consent under the payment lock. AI can create only internal counsellor call tasks. Missing client rules are explicit assumptions in the design document.

Payments, OTP/message delivery, refund payouts, identity verification, and external-system connections use clearly labelled demo adapters. Tally XML is generated; a live Tally import has not been certified.
