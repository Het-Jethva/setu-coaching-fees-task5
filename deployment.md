# Run and review Setu

Repository: https://github.com/Het-Jethva/setu-coaching-fees-task5

Live app: https://setu-coaching-fees-task5.vercel.app

Public refund policy: https://setu-coaching-fees-task5.vercel.app/refund-policy

## Reviewer login

Open the app and choose Accounts executive. Select Central accounts for all four centres or a centre-only account to verify access boundaries. Demo password: `SetuDemo2026!`.

For a parent, choose Parent, enter `PARENT-01`, request an OTP, and copy the six-digit code from the visible demo inbox. The OTP expires after five minutes and allows five attempts. Accept demo consent to see linked records. `PARENT-01` includes Ishita; `PARENT-02` includes Aarav; `PARENT-03` includes Mohit.

Each browser gets an isolated synthetic workspace that expires after 48 hours. Switching roles in the same browser preserves that workspace, so a parent payment can be inspected from Accounts. An incognito browser starts an independent walkthrough.

## Run locally

Prerequisites: Node.js 24 or newer, npm, Docker with Compose, and Git. Node.js 26 and PostgreSQL 17 were used during verification.

1. Clone the public repository and enter its directory.
2. Run `npm ci`.
3. Run `docker compose up -d --wait`. Compose waits until PostgreSQL accepts connections.
4. Copy `.env.example` to `.env.local`. In PowerShell, run `Copy-Item .env.example .env.local`.
5. Run `npm run db:migrate`. This idempotent script creates the database schema and financial-history protection.
6. Add your own OpenRouter key to `.env.local` to enable live AI. Keep that file ignored by Git.
7. Run `npm run dev` and open http://localhost:3000.

First sign-in creates 80 students, four centres, eight batches, receipts, partial payments, attendance, results, reminder stages, an unmatched payment, and a pending refund. The three assignment sample rows retain their IDs, names, batches, due dates, and amounts. Relative day counts are calculated using the current India date.

Run `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build` for checks. With the server running, run `npm run verify:api`. Run `npm run verify:ai` for a real inference test, which consumes one free-model request when no cached result exists.

For local production, run `npm run build` followed by `npm start`. Stop the development server before building into the same `.next` directory.

## Deployment

The public personal demo runs on Vercel with PostgreSQL on Neon Free. Server functions and the database use Singapore. Static pages and font files are served by Vercel. The app uses native PostgreSQL transactions and no separate worker service.

To deploy another instance:

1. Create a Vercel Next.js project from the repository. The framework is explicitly declared in `vercel.json`.
2. Create a Neon Free database, connect it to the project, and configure the production database environment variable.
3. Configure the server-side OpenRouter key and a random scheduler secret in Vercel environment settings.
4. Run the migration script against the new production database from a trusted terminal. Supply its connection through an ignored environment file or the process environment.
5. Deploy with `vercel --prod`, or deploy through the linked GitHub project.
6. Test sign-in, a mock payment, receipt, refund, import, and real AI assessment on the deployed URL.

The configured cron is `30 3 * * *`, once daily at 03:30 UTC, corresponding to the 09:00 IST scheduling hour. Vercel Hobby can invoke within that hour. Production calls `/api/cron` with the scheduler secret as a Bearer token. The handler rechecks balances, consent, and withdrawal before recording each mock message. Repeated invocations do not duplicate a stage. Expired demo workspaces are removed after the run.

## Environment variable names

| Name | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection, with TLS in hosted environments. Required. |
| `OPENROUTER_API_KEY` | Server-only key for the selected free model. Required for live AI. |
| `CRON_SECRET` | Bearer secret authorizing production reminder runs. Required for scheduling. |
| `APP_URL` | Target URL used by verification scripts. |
| `TALLY_BANK_LEDGER` | Optional export bank ledger name. |
| `TALLY_FEES_LEDGER` | Optional export student-fees ledger name. |

Environment values are deliberately omitted. Demo login details above are public review credentials, not production secrets. Never prefix the AI key with `NEXT_PUBLIC_`.

## Suggested walkthrough

1. As Parent PARENT-01, record consent, switch to Hindi, inspect Ishita's unpaid balance, and simulate a successful payment. Open the GST receipt.
2. Switch to Central accounts in the same browser. Find Ishita's ledger and verify the paid instalment and cancelled reminders.
3. Open Operations, run due reminders, and inspect the Hindi/English mock inbox. Unconsented and withdrawn records do not send.
4. Review the unmatched payment and allocate it explicitly from the student ledger.
   Before recording money on an unpaid student, Edit fee plan demonstrates discounts, GST assumptions, due dates and three/four instalments. Plans become protected after financial activity.
5. Preview a withdrawal on another paid student. Confirm it, inspect earned/unearned amounts and the ten-day refund deadline, then record a mock payout.
6. Download a batch CSV template, upload it, inspect the preview, and confirm it. Try a wrong-batch student or marks above maximum to see atomic rejection.
7. Download Tally XML and CSV. Assess a batch under Counsellor follow-up, then dismiss a false flag if the model produces one.

## Tally export test procedure

Create a disposable company in TallyPrime and create the bank and student-fees ledgers using the names configured above. Import the downloaded XML through Tally's data-import workflow for vouchers. Compare voucher IDs, dates, debit/credit totals, received amounts, and refund payouts with the CSV and fee receipts. Stable voucher identifiers support duplicate review. The export does not create a complete chart of accounts or replace statutory accounting configuration.

No live Tally installation was available for certification. XML generation, escaping, balance direction, and download were checked. Import behavior and tax-ledger mapping must be verified in the client's Tally company before production use.

## Deliberate demo boundaries

Payments, OTP/SMS delivery, message sends, refund payouts, and outside systems are mocked as the core brief permits. Their records and state changes persist in PostgreSQL. The consent workflow records a versioned decision; production identity/parental verification remains an integration.

GST-inclusive pricing at 18%, the calendar-day refund policy, centre/batch identities, reminder offsets, and synthetic data beyond the supplied rows are explicit assignment assumptions. Legal and tax validation remains client work before a real rollout.

The free OpenRouter model has limited availability and quotas. Requests contain only invented anonymous summaries, use free-only routing, and have no paid fallback. The app limits attempts to five per workspace and forty app-wide per UTC day, including failures. No predictive accuracy or business savings are claimed.
