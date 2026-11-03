# Coaching fees build plan

Status: accepted on 3 November 2026 with the user's amendment to use shadcn/ui and the shadcn and frontend-design skills. Implementation is underway.

This plan implements [the assignment](./assignment.md) and [the accepted decisions](./design.md). The agreed scope includes every must-have, followed by a complete polish pass.

## Product

Build one Next.js and TypeScript application backed by PostgreSQL, using shadcn/ui and the requested design skills. Parents use a Hindi and English mobile portal. Accounts executives manage assigned centres, and a seeded central executive can see all four. Each reviewer receives isolated fictional demo data containing 80 students across eight batches, including the three supplied sample rows.

Group the experience into these main screens. Tabs and dialogs keep related actions together.

1. Sign-in and parental consent, with an explicit demo OTP inbox.
2. Parent portal for dues, receipts, attendance, and test results.
3. Instalment checkout with mock success, failure, and pending outcomes.
4. Accounts dashboard with centre and batch filters, ageing, and student search.
5. Student fee ledger with payments, discounts, corrections, and withdrawal/refund preview.
6. Accounts operations with reminder history, unmatched payments, pending refunds, and counsellor call tasks.
7. Batch attendance and test-result imports with validation and preview, plus Tally exports.
8. Published refund policy explaining the accepted demo rules.

## Rules that must hold

- GST-inclusive fees use the configurable 18% demo assumption. Discounts apply before instalment splitting. Show GST on receipts.
- A partial payment reduces the selected instalment. Staff resolve excess or unmatched money explicitly. Posted history is preserved through corrections.
- Full payment cancels pending reminders for that instalment. Each send checks current balance, consent, and withdrawal status. Retried jobs and callbacks cannot duplicate messages or money.
- Refunds use discounted course fees and calendar days, including the withdrawal day. Cancel unearned fees, preserve unpaid earned fees, and refund only collected money above earned fees.
- Withdrawal confirmation creates the refund obligation with a ten-day deadline. Recording a mock payout is a separate action.
- Dashboard totals come from the ledger. Outstanding and overdue are distinct. Unmatched money remains separate.
- CSV imports show row-level validation and commit the entire valid upload together. Reject wrong-batch students and conflicting duplicates. Produce Tally voucher XML and a readable CSV.
- Enforce parent-child links, staff centre scope, and reviewer isolation on the server. Record demo consent and limit OTP attempts.

## AI

Use OpenRouter with `nvidia/nemotron-3.5-super-vl:free`, subject to live verification. Staff assess up to ten students per request. Send only invented, anonymous fee, attendance, and test-trend summaries.

Require two attendance periods and three tests. Validate structured results and evidence. Only validated high risk creates an internal counsellor call task. Staff can dismiss false flags, and unchanged evidence reuses prior results. The model cannot change fees or send parent messages.

Limit attempts to five per workspace and forty app-wide daily. Use free-only routing with no paid fallback. Missing evidence, missing keys, provider errors, and quota exhaustion have visible states. Test actual inference after the key is configured.

## Delivery sequence

- [ ] Sketch module boundaries and the data model, then create the application and initial Git history.
- [ ] Build authentication, consent, reviewer isolation, schema, and repeatable sample-data setup.
- [ ] Complete ledger, parent checkout, GST receipts, reconciliation, and daily reminder processing.
- [ ] Complete withdrawal/refund settlement, dashboard totals, corrections, and Tally export.
- [ ] Complete attendance and test imports, parent academic views, and hosted AI review.
- [ ] Finish visual polish, Hindi copy, phone layouts, loading states, empty states, and error recovery.
- [ ] Verify important money and date rules, access boundaries, retry behavior, import behavior, and full reviewer journeys.
- [ ] Publish the public GitHub repository and deploy the app to Vercel Hobby with Neon Free PostgreSQL. Configure the production daily reminder job and verify deployed flows.
- [ ] Produce the PDF or Word TDD, `deployment.md`, and a ZIP containing exactly those two files. Verify the archive and links before the deadline of 9 November 2026, 11:59 pm IST.

## Deliverables and disclosed limits

Deliver the public repository with meaningful commit history, live demo, tested local setup, reviewer logins, Technical Design Document, deployment guide, and final submission ZIP. Label all business assumptions in the TDD.

Payments, OTP delivery, messages, payouts, and external systems are clearly labelled demo adapters. Their state changes and workflows still persist in the database. Real gateway and message delivery, production identity verification, legal/tax validation, and a live Tally connection remain production integrations. Do not claim measured business savings or validated dropout-prediction accuracy.

API keys and provider accounts are setup dependencies, not unresolved product decisions. Request secret configuration through local or hosting environment settings when the working application is ready for it.
