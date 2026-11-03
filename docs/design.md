# Product design decisions

This document separates accepted choices from open questions. All product rules absent from the assignment will be listed as assumptions in the Technical Design Document.

## Accepted choices

The user accepted these choices on 3 November 2026, across three interview rounds.

| ID | Choice | Effect |
| --- | --- | --- |
| D1 | Build every must-have before the final polish pass. | Bulk attendance and test-score uploads, Tally export, attendance and results in the parent portal, and the full core are in scope. |
| D2 | Use Next.js, TypeScript, and PostgreSQL. | Keep frontend and backend in one repository. |
| D3 | Use a hosted AI model through OpenRouter. | Select a free model using current availability and relevant capabilities. Validate the selected model at runtime with the user's key. |
| D4 | Deliver a public live demo on free services. | Also deliver a public GitHub repository, tested local setup, TDD, deployment guide, and final ZIP. |
| D5 | Create an original, minimal fictional coaching brand. | Use a restrained palette, clear typography, and a Hindi and English parent portal centred on amount, due date, and Pay. |
| D6 | Use GST-inclusive fees with a configurable demo rate of 18%. | Apply a fixed rupee discount before splitting fees into three or four instalments. Partial payments target one instalment. Excess and unmatched payments enter the accounts queue. No late fees. |
| D7 | Use calendar-day pro-rata refunds on the discounted course total. | Count the withdrawal day as used. Cancel unearned charges, preserve unpaid earned fees, and refund only collected money above earned fees. Staff preview and confirm. Refunds are due within ten calendar days. No cancellation charge. |
| D8 | Restrict parents to linked children and staff to assigned centres. | Seed a central executive with access to all four centres. Accounts staff handle call tasks. Demo OTPs expire and limit attempts. Record demo parental consent before showing child records. |
| D9 | Send reminders at offsets of -7, 0, +3, +7, and +14 days from the due date. | Run daily in the parent's preferred language. Part payments leave balance reminders active. Full payment cancels pending reminders. Withdrawal and missing consent block sends. Check current balances and suppress duplicates. |
| D10 | Import attendance and test results from CSV with preview and all-or-nothing confirmation. | Reject wrong-batch students and conflicting duplicates. Export Tally voucher XML and a readable CSV. Document a test-import procedure. Mock the live Tally connection. |
| D11 | Seed 80 fictional students, four centres, and eight batches. | Preserve the three supplied rows and add realistic payment, attendance, score, discount, unmatched-payment, and refund cases. Calculate dates in India. Isolate reviewer demo data. |
| D12 | Replace the proposed Gemini provider with a free OpenRouter model. | Select `nvidia/nemotron-3.5-super-vl:free` on current capability evidence. Preserve the assignment's human-review boundary. Runtime behavior still needs testing with a key. |
| D13 | Deploy to Vercel Hobby and Neon Free. | Use a daily production reminder job. Provider account setup follows a working local app. |
| D14 | Preserve posted financial history and correct it through visible reversals. | Explicit staff allocations cannot exceed received money. Withdrawal confirmation creates the refund obligation. Record the mock payout separately. Repeated callbacks and repeated confirmations cannot post money twice. |
| D15 | Calculate all dashboard metrics from the ledger. | Show outstanding, overdue, net collections this month, and refunds awaiting payout by centre and batch. Outstanding includes future fees. Age unpaid balances into not yet due, 1–30, 31–60, 61–90, and over 90 days. Show unmatched money separately. |
| D16 | Run AI checks on demand for batches of at most ten students. | Use synthetic anonymous summaries, two attendance periods, and at least three tests. Create call tasks only for validated high risk. Cache unchanged evidence and allow false-flag dismissal. Cap attempts at five per workspace and forty app-wide daily. No paid fallback. Show unavailable or not assessed states honestly. |
| D17 | Build the UI with shadcn/ui. | The user requested the shadcn and frontend-design skills in response to the final plan review. Treat this as the accepted plan with that amendment. |

D4 accepts clearly labelled demo adapters for payments, OTP delivery, reminders, and outside systems, as allowed by the core brief. Durable payment records, message scheduling, login checks, and reconciliation still need to work.

## Design tree

- Full must-have scope, accepted in D1.
  - Instalment allocation, discounts, partial payments, and GST: D6 accepted.
  - Withdrawal date, refund formula, and refund approval: D7 accepted.
  - Reminder timing, partial-payment behavior, and retry handling: D9 accepted.
  - Attendance and test import formats and validation: D10 accepted.
  - Tally export format and demonstrated compatibility: D10 accepted.
  - Payment corrections, withdrawal confirmation, and refund settlement: D14 accepted.
  - Dashboard metric definitions and ageing buckets: D15 accepted.
- One Next.js application and PostgreSQL, accepted in D2.
  - Parent and staff access boundaries and consent: D8 accepted.
  - Hosting, database provider, and scheduled execution: D13 accepted.
- Hosted AI, accepted in D3.
  - Provider: OpenRouter accepted in D12. The selected model advertises structured output.
  - Anonymous inputs, uncertainty, failed requests, refresh, and request limits: D16 accepted.
  - Call-task review, false flags, and duplicate suppression: D16 accepted.
- Public demo and submission package, accepted in D4.
  - Synthetic seed coverage, current-date calculations, and demo isolation: D11 accepted.
  - Reviewer accounts and consent demonstration: D8 accepted.
- Original bilingual design, accepted in D5.
  - Navigation, screen grouping, and detailed visual choices follow the settled flows.

## Platform facts checked on 3 November 2026

- [Vercel supports Next.js](https://vercel.com/docs/frameworks/full-stack/nextjs). [Hobby is for personal, non-commercial use](https://vercel.com/docs/plans/hobby). A personal assignment demo appears to fit that restriction. This is an interpretation, not a confirmed account entitlement.
- [Hobby cron jobs run at most daily and within the chosen hour](https://vercel.com/docs/cron-jobs/usage-and-pricing). [They invoke production deployments](https://vercel.com/docs/cron-jobs/quickstart).
- [Neon documents a Vercel integration](https://neon.com/docs/guides/vercel-overview) and [a free PostgreSQL plan with usage limits and idle suspension](https://neon.com/docs/introduction/plans).

### OpenRouter

The previous Gemini proposal was not selected. The following facts come from current public documentation and catalogue data, not an authenticated inference test.

- [`nvidia/nemotron-3.5-super-vl:free`](https://openrouter.ai/api/v1/models/nvidia/nemotron-3.5-super-vl:free/endpoints) currently advertises zero input and output prices, a one-million-token context, and structured-output support. It is the selected model for this task. This is a capability-based choice, not a measured quality ranking.
- A second structured-output candidate, [`dots-studio/dots-3-note-preview:free`](https://openrouter.ai/dots-studio/dots-3-note-preview:free), has a published retirement date of 31 December 2026. [`nvidia/nemotron-3-ultra-550b-a55b:free`](https://openrouter.ai/api/v1/models/nvidia/nemotron-3-ultra-550b-a55b:free/endpoints) does not advertise structured-output parameters in the checked endpoint catalogue.
- [Free-model limits](https://openrouter.ai/docs/api_reference/limits) are 20 requests per minute and 50 per day for an unfunded account. Failed attempts count. The free variants do not require a credit purchase. Availability and the user's actual remaining quota still need checking.
- [Structured-output support](https://openrouter.ai/docs/guides/features/structured-outputs) does not remove the need for server-side schema and semantic validation. The application must reject incomplete, malformed, and unsupported results.
- The [NVIDIA free-model notice](https://openrouter.ai/nvidia/nemotron-3.5-super-vl:free) permits session logging for security and product improvement and excludes confidential and personal data. Send invented records only, with identifiers and contact details removed.
- [Provider routing](https://openrouter.ai/docs/guides/routing/provider-selection) documents provider allowlists, required parameters, disabled provider fallback, and zero-price filters. Do not configure a model fallback chain or paid plugins. Reject requests if the intended free-only controls cannot be enforced.
- OpenRouter's [pricing page](https://openrouter.ai/pricing) and routing FAQ are not fully consistent about free-plan routing controls. Verify the chosen constraints with the actual key. Do not silently weaken them to make a request succeed.
- Store `OPENROUTER_API_KEY` only in server-side environment secrets. [Authentication](https://openrouter.ai/docs/api_reference/authentication) uses Bearer tokens.

A platform capability is not a client requirement. At interview time, provider accounts and keys were pending setup dependencies; they are now configured for the deployed personal demo.

## Interview status

All three interview rounds are resolved. Q6 through Q11 and Q13 through Q16 were accepted as proposed. For Q12, the user delegated selection of a suitable free OpenRouter model. The final [build plan](./build-plan.md) was accepted with the shadcn amendment.

## Implementation status

All must-haves are implemented and deployed. Local/hosted API journeys, real OpenRouter inference, scheduler retries, phone layouts, and the final typography pass were verified. The public repository, live app, TDD, deployment guide and two-file archive are the delivery artifacts.

The user requested a final Impeccable typography pass and delegated the family choice. The final system uses self-hosted Manrope with Noto Sans Devanagari, readable role sizes and natural Hindi heading spacing. The final extracted system is recorded in the root DESIGN.md.
