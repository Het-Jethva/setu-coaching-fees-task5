import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { snapshotSchema } from "../src/domain/model";
import { addDays, financials } from "../src/domain/money";

const base = process.env.APP_URL ?? "http://localhost:3000";
class Reviewer {
  jar = new Map<string, string>();
  async send(path: string, payload?: unknown, expected = 200) {
    const res = await fetch(base + path, {
      method: payload ? "POST" : "GET",
      headers: {
        Origin: base,
        Cookie: [...this.jar].map(([k, v]) => `${k}=${v}`).join("; "),
        ...(payload ? { "Content-Type": "application/json" } : {}),
      },
      ...(payload ? { body: JSON.stringify(payload) } : {}),
    });
    for (const cookie of res.headers.getSetCookie()) {
      const first = cookie.split(";")[0] ?? "";
      const index = first.indexOf("=");
      this.jar.set(first.slice(0, index), first.slice(index + 1));
    }
    const result: unknown = await res.json();
    assert.equal(
      res.status,
      expected,
      `${path}: expected ${expected}; got ${res.status}: ${JSON.stringify(result)}`,
    );
    return result;
  }
  async staff(id = "central") {
    await this.send("/api/auth", { action: "demo" });
    await this.send("/api/auth", {
      action: "staff",
      id,
      password: "SetuDemo2026!",
    });
  }
  async parent(id = "PARENT-01") {
    const otp = z
      .object({ challenge: z.string(), demoCode: z.string() })
      .parse(await this.send("/api/auth", { action: "requestOtp", id }));
    await this.send("/api/auth", {
      action: "verifyOtp",
      challenge: otp.challenge,
      code: otp.demoCode,
    });
  }
  async state() {
    return snapshotSchema.parse(await this.send("/api/state"));
  }
  act(payload: unknown, expected = 200) {
    return this.send("/api/action", payload, expected);
  }
}
const r = new Reviewer();
await r.staff();
let state = await r.state();
assert.equal(state.students.length, 80);
const original = state.students.find((s) => s.id === "STU-0587");
assert.ok(original);
assert.equal(financials(original).instalments[0]?.balance, 1500000);
const checkout = z.object({ checkoutId: z.string() }).parse(
  await r.act({
    action: "checkout",
    studentId: original.id,
    instalmentId: original.plan.instalments[0]?.id,
    amount: 1500000,
  }),
);
await Promise.all([
  r.act({
    action: "completeCheckout",
    checkoutId: checkout.checkoutId,
    outcome: "success",
  }),
  r.act({
    action: "completeCheckout",
    checkoutId: checkout.checkoutId,
    outcome: "success",
  }),
]);
state = await r.state();
const paid = state.students.find((s) => s.id === original.id);
assert.ok(paid);
assert.equal(financials(paid).instalments[0]?.balance, 0);
assert.equal(
  state.receipts.filter((p) => p.id === checkout.checkoutId).length,
  1,
);
assert.ok(
  state.reminders
    .filter((m) => m.instalmentId === original.plan.instalments[0]?.id)
    .every((m) => m.status !== "pending"),
);
process.stdout.write(
  "PASS: sample seed, duplicate callbacks, receipt uniqueness, immediate reminder cancellation.\n",
);
const allocationToCorrect = paid.events.find(
  (e) => e.kind === "allocation" && e.receiptId === checkout.checkoutId,
);
assert.ok(allocationToCorrect);
await r.act({
  action: "reverse",
  studentId: paid.id,
  eventId: allocationToCorrect.id,
  reason: "Correct a duplicate bank posting",
});
assert.ok(
  (await r.state()).reminders.some(
    (m) =>
      m.instalmentId === original.plan.instalments[0]?.id &&
      m.status === "pending",
  ),
);
const unpaid = state.students.find((s) => s.id === "STU-0219");
assert.ok(unpaid);
const newPlan = {
  action: "configurePlan",
  studentId: unpaid.id,
  gross: 12000000,
  discount: 600000,
  taxBps: 1800,
  start: unpaid.plan.start,
  end: unpaid.plan.end,
  dues: [0, 60, 120, 180].map((n) => addDays(unpaid.plan.start, n)),
};
await r.act({ ...newPlan, discount: 13000000 }, 400);
await r.act(newPlan);
const configured = (await r.state()).students.find((s) => s.id === unpaid.id);
assert.ok(configured);
assert.equal(configured.plan.instalments.length, 4);
assert.ok(configured.plan.instalments.every((i) => i.amount === 2850000));
const firstPayment = z
  .object({ checkoutId: z.string() })
  .parse(
    await r.act({
      action: "checkout",
      studentId: unpaid.id,
      instalmentId: configured.plan.instalments[0]?.id,
      amount: 10000,
    }),
  );
await r.act({
  action: "completeCheckout",
  checkoutId: firstPayment.checkoutId,
  outcome: "success",
});
await r.act(newPlan, 409);
process.stdout.write(
  "PASS: payment reversal reopens unsent reminders; discount/four-instalment revision is protected after payment.\n",
);

await r.parent();
await r.act(
  {
    action: "checkout",
    studentId: "STU-0219",
    instalmentId: "STU-0219-I1",
    amount: 10000,
  },
  403,
);
assert.equal((await r.state()).students.length, 0);
await r.act({ action: "consent", granted: true });
await r.act({ action: "language", locale: "hi" });
const parentState = await r.state();
assert.equal(parentState.students.length, 2);
assert.ok(parentState.students.every((s) => s.parentId === "PARENT-01"));
await r.act({ action: "runReminders" }, 403);
await r.staff();
await r.act({ action: "runReminders" });
const remindersAfter = (await r.state()).reminders;
assert.ok(
  remindersAfter.some(
    (m) =>
      m.instalmentId === original.plan.instalments[0]?.id &&
      m.status === "sent",
  ),
);
const sentBefore = remindersAfter.filter((m) => m.status === "sent").length;
await r.act({ action: "runReminders" });
assert.equal(
  (await r.state()).reminders.filter((m) => m.status === "sent").length,
  sentBefore,
);
assert.ok(remindersAfter.some((m) => m.status === "sent" && m.locale === "hi"));
process.stdout.write(
  "PASS: parent scope, consent gate, role checks, Hindi reminders, reminder retries.\n",
);

const other = new Reviewer();
await other.staff("centre-2");
const otherState = await other.state();
assert.equal(otherState.students.length, 20);
assert.ok(otherState.students.every((s) => s.centre === "North"));
await other.act(
  { action: "refundPreview", studentId: "STU-0587", on: state.today },
  403,
);
await other.staff();
assert.equal(
  financials(
    (await other.state()).students.find((s) => s.id === "STU-0587") ?? original,
  ).instalments[0]?.balance,
  1500000,
);
process.stdout.write(
  "PASS: centre scope and independent reviewer workspaces.\n",
);

state = await r.state();
const aarav = state.students.find((s) => s.id === "STU-0412");
assert.ok(aarav);
const withdrawalDate = addDays(aarav.plan.start, 30);
let quote = z.object({ version: z.string(), refund: z.number() }).parse(
  await r.act({
    action: "refundPreview",
    studentId: aarav.id,
    on: withdrawalDate,
  }),
);
const added = z.object({ checkoutId: z.string() }).parse(
  await r.act({
    action: "checkout",
    studentId: aarav.id,
    instalmentId: aarav.plan.instalments[1]?.id,
    amount: 10000,
  }),
);
await r.act({
  action: "completeCheckout",
  checkoutId: added.checkoutId,
  outcome: "success",
});
await r.act(
  {
    action: "withdraw",
    studentId: aarav.id,
    on: withdrawalDate,
    version: quote.version,
  },
  409,
);
quote = z.object({ version: z.string(), refund: z.number() }).parse(
  await r.act({
    action: "refundPreview",
    studentId: aarav.id,
    on: withdrawalDate,
  }),
);
await Promise.all([
  r.act({
    action: "withdraw",
    studentId: aarav.id,
    on: withdrawalDate,
    version: quote.version,
  }),
  r.act({
    action: "withdraw",
    studentId: aarav.id,
    on: withdrawalDate,
    version: quote.version,
  }),
]);
await r.act(
  {
    action: "payout",
    studentId: aarav.id,
    amount: quote.refund + 1,
    requestId: randomUUID(),
  },
  400,
);
const payoutId = randomUUID(),
  payout = Math.min(10000, quote.refund);
assert.ok(payout > 0);
await Promise.all([
  r.act({
    action: "payout",
    studentId: aarav.id,
    amount: payout,
    requestId: payoutId,
  }),
  r.act({
    action: "payout",
    studentId: aarav.id,
    amount: payout,
    requestId: payoutId,
  }),
]);
state = await r.state();
const withdrawn = state.students.find((s) => s.id === aarav.id);
assert.ok(withdrawn);
assert.equal(withdrawn.events.filter((e) => e.kind === "withdrawal").length, 1);
assert.equal(withdrawn.events.filter((e) => e.id === payoutId).length, 1);
const allocation = withdrawn.events.find((e) => e.kind === "allocation");
assert.ok(allocation);
await r.act(
  {
    action: "reverse",
    studentId: aarav.id,
    eventId: allocation.id,
    reason: "Correct demo receipt",
  },
  400,
);
await r.act({
  action: "reverse",
  studentId: aarav.id,
  eventId: payoutId,
  reason: "Reverse mock payout first",
});
await r.act({
  action: "reverse",
  studentId: aarav.id,
  eventId: allocation.id,
  reason: "Correct demo receipt",
});
process.stdout.write(
  "PASS: stale refund quotes, withdrawal/payout retries, payout caps, safe corrections.\n",
);

const batch = "JEE 2027 Morning",
  csv = `student_id,date,status\nSTU-0412,${state.today},present\nSTU-0219,${state.today},present\n`;
const bad = z
  .object({ previewId: z.null(), errors: z.array(z.string()) })
  .parse(
    await r.act({ action: "previewImport", batch, kind: "attendance", csv }),
  );
assert.ok(bad.errors.length);
const valid = z.object({ previewId: z.string() }).parse(
  await r.act({
    action: "previewImport",
    batch,
    kind: "attendance",
    csv: `student_id,date,status\nSTU-0412,${state.today},present\n`,
  }),
);
await r.act({ action: "confirmImport", previewId: valid.previewId });
await r.act({ action: "confirmImport", previewId: valid.previewId });
assert.equal(
  (await r.state()).students
    .find((s) => s.id === "STU-0412")
    ?.attendance.filter((a) => a.date === state.today).length,
  1,
);
const tests = z.object({ previewId: z.string() }).parse(
  await r.act({
    action: "previewImport",
    batch,
    kind: "tests",
    csv: `student_id,test_name,date,marks,maximum_marks\nSTU-0412,Import verification,${state.today},81,100\n`,
  }),
);
await r.act({ action: "confirmImport", previewId: tests.previewId });
const invalid = z.object({ previewId: z.null() }).parse(
  await r.act({
    action: "previewImport",
    batch,
    kind: "tests",
    csv: `student_id,test_name,date,marks,maximum_marks\nSTU-0412,Invalid,${state.today},101,100\n`,
  }),
);
assert.equal(invalid.previewId, null);
process.stdout.write(
  "PASS: all-or-nothing CSV previews, batch ownership, repeated confirmation, score validation.\n",
);
const csrf = await fetch(base + "/api/action", {
  method: "POST",
  headers: {
    Origin: "https://untrusted.example",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ action: "runReminders" }),
});
assert.equal(csrf.status, 403);
if (!state.aiConfigured) await r.act({ action: "assess", batch }, 503);
const cookies = [...r.jar].map(([k, v]) => `${k}=${v}`).join("; ");
const xml = await fetch(base + "/api/export?format=xml", {
  headers: { Cookie: cookies },
});
assert.equal(xml.status, 200);
assert.match(await xml.text(), /<TALLYREQUEST>Import Data<\/TALLYREQUEST>/);
const receipt = await fetch(base + `/api/receipt?id=${checkout.checkoutId}`, {
  headers: { Cookie: cookies },
});
assert.equal(receipt.status, 200);
assert.match(await receipt.text(), /GST included/);
process.stdout.write(
  "PASS: CSRF rejection, honest AI configuration state, Tally XML, GST receipt.\nAll API verification scenarios passed.\n",
);
