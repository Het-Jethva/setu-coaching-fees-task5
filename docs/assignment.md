# Task 5 assignment requirements

Source: [Isocode take-home task](https://workspace.isocodelabs.com/roles/01M5HC2B8JDGS5MQ8KGQ78VX5R/stages/task), read in the authenticated browser on 3 November 2026.

This file records the supplied requirements. Proposed product choices and assumptions belong in the design notes and Technical Design Document.

## Submission

- Deadline: 9 November 2026, 11:59 pm IST.
- Work alone. AI tools are highly recommended. The candidate owns the judgment, numbers, and final choices and explains them in the interview.
- Build one selected problem end to end. A small, finished core takes priority over incomplete breadth.
- Upload one ZIP, up to 25 MB, containing exactly two files: a Technical Design Document in PDF or Word format and `deployment.md`.
- Put the public GitHub URL at the top of the Technical Design Document. Add the live application URL if deployed.
- Keep commit history and keep the repository public until review finishes.
- Use only information in the problem statement. Label every assumption in the Technical Design Document.
- Never commit secrets or real personal data.
- Resubmission is allowed until the deadline. The latest version is reviewed.

The Technical Design Document covers architecture and rationale, the data model, main flows, AI behavior, UI decisions, cuts, and next steps. The deployment guide gives local setup steps, deployment details, environment variable names without values, and reviewer demo logins.

## General product requirements

- Working main flows with realistic sample data and no dead buttons.
- Frontend, backend, database, sign-in, and appropriate roles.
- Working AI or automation, including wrong and uncertain outcomes.
- Consistent, polished, responsive UI with loading, empty, and error states.
- Tests for important logic, validated inputs, access control, and no repository secrets.

Assessment weights: quality of work 50%, problem solving 30%, and communication 20%. The brief values readable code, deliberate design, honest limits, and well-judged depth.

## Client and existing workflow

Company A in Jaipur provides engineering and medical entrance coaching. It has four centres, 2,600 students, 140 staff, and annual revenue of ₹30–34 crore. Average annual fees are ₹1.2 lakh, paid in three or four instalments.

Centres record receipts in desktop fee software and post totals to Tally. Each centre keeps due dates in Excel. Staff phone parents about dues, and parents call to ask for balances. Test scores are PDFs shared in WhatsApp groups. Staff calculate refunds manually.

The problem statement supplies these assumptions:

- Annual billing: 2,600 × ₹1.2 lakh = ₹31.2 crore.
- Uncollected fees from late and uneven follow-up: 2%, or ₹62.4 lakh.
- Instalment value received more than 60 days late: 12%.
- Follow-up work: eight accounts staff spend half their time, equivalent to four full-time staff at ₹4.2 lakh each, or ₹16.8 lakh annually.
- Combined stated annual cost: ₹79.2 lakh. The brief does not price the financing cost of late collections.

Users are mobile parents, students, and centre accounts staff. The founder-director is the buyer.

## Client request

Parents can see what they owe and when without calling. Reminders run automatically and stop as soon as payment is made. Staff can view dues across centres and by batch. Refunds follow a written policy.

## Must-have list

1. Per-student fee ledger with plan, instalments, discounts, payments, balance, and days overdue.
2. Parent portal with OTP login, dues, receipts, attendance, and test scores.
3. Automatic Hindi or English reminders before, on, and after due dates, stopping on payment.
4. A payment link per instalment using gateway test mode, which marks the instalment paid.
5. Pro-rata refund calculator and accounts dashboard by centre and batch, with ageing and Tally export.
6. Bulk attendance and test-score upload per batch.

## Required core

The engineering submission must deliver about six to eight screens covering the fee ledger, parent portal with dues and pay link, reminders that stop on payment, refund calculator, and dues dashboard.

Roles: parent and accounts executive. AI feature: dropout-risk flag. The main rules to solve are instalments and pro-rata refunds.

The core instructions explicitly say to mock payments, messages, and outside systems and to seed from the supplied sample data. The rest of the must-have list is optional depth. This qualifies the earlier gateway-test-mode wording for the required core.

## Automation and AI safeguards

- Automate reminders and payment matching.
- Flag dropout risk from missed instalments, falling attendance, and test trends.
- A flag creates only an internal counsellor call task. It never causes a fee action or a parent message.
- Counsellors can mark flags as false.
- Unmatched payments enter an accounts queue. They never automatically mark an instalment paid.

## Constraints stated in the brief

The brief cites the Ministry of Education's 2024 coaching guidelines for a published refund policy and pro-rata refunds within ten days of withdrawal. It cites the DPDP Act 2023 for verifiable parental consent because most students are minors. These are assignment constraints recorded from the brief, not independently verified legal advice.

Receipts must show GST. Parents use low-end phones, and Hindi is required. The brief does not supply a GST rate, tax treatment, refund formula, consent verification procedure, or reminder schedule.

## Design

Use clean layouts, white space, a restrained palette, and clear typography. Every element needs a purpose. Parents should understand their dues within five seconds: amount, due date, and pay button.

## Budget and success measures

The client project budget is ₹6 lakh for six weeks. The assignment itself has the submission deadline above.

Client targets are reducing instalment value more than 60 days late from 12% to 6% within two terms, reducing parent calls about dues by 70%, and reducing month-end reconciliation from four days to one. These are targets, not measured product outcomes.

## Supplied sample data

| Student ID | Name | Batch | Due date | Amount | Paid | Supplied status |
| --- | --- | --- | --- | ---: | ---: | --- |
| STU-0412 | Aarav Meena | JEE 2027 Morning | 2026-10-10 | ₹30,000 | ₹30,000 | Paid |
| STU-0587 | Ishita Sharma | JEE 2027 Evening | 2026-10-10 | ₹30,000 | ₹15,000 | Part paid, 23 days overdue |
| STU-0219 | Mohit Gurjar | NEET 2027 Morning | 2026-11-15 | ₹40,000 | ₹0 | Due in 13 days |

The sample's relative-day labels are copied from the brief. They must not be mistaken for a permanent calculation rule.

## Out of scope

- Video lectures or a learning platform.
- Timetables.
- Admissions CRM.
