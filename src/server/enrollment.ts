import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import {
  eventSchema,
  moneySchema,
  type Actor,
  type Day,
  type Student,
} from "@/domain/model";
import {
  activeEvents,
  financials,
  refundQuote,
  rupees,
  todayInIndia,
} from "@/domain/money";
import { db, demand } from "./db";
import {
  lockedStudent,
  postEvent,
  requireAccounts,
  studentsFor,
  type Query,
} from "./store";

export const ledgerVersion = (s: Student) =>
  createHash("sha256")
    .update(JSON.stringify([s.plan, s.events]))
    .digest("hex");
const checkoutSchema = z.object({
  id: z.string(),
  student_id: z.string(),
  instalment_id: z.string(),
  amount: z.coerce.number().int().positive(),
  status: z.enum(["success", "pending", "failure"]),
  expires_at: z.coerce.date(),
});
async function cancelPaid(sql: Query, a: Actor, s: Student) {
  const f = financials(s);
  const ids = f.instalments
    .filter((i) => i.balance === 0 || f.withdrawn)
    .map((i) => i.id);
  if (ids.length)
    await sql`UPDATE reminders SET status='cancelled' WHERE workspace=${a.workspace} AND student_id=${s.id} AND instalment_id=ANY(${ids}::text[]) AND status='pending'`;
}
export async function createCheckout(
  a: Actor,
  input: { studentId: string; instalmentId: string; amount: number },
) {
  return db().begin(async (tx) => {
    const s = await lockedStudent(tx, a, input.studentId);
    const i = financials(s).instalments.find(
      (i) => i.id === input.instalmentId,
    );
    demand(
      i && input.amount > 0 && input.amount <= i.balance,
      "Enter an amount up to this instalment's remaining balance.",
    );
    const id = randomUUID();
    await tx`INSERT INTO checkouts(workspace,id,student_id,instalment_id,amount) VALUES(${a.workspace},${id},${s.id},${i.id},${input.amount})`;
    return {
      checkoutId: id,
      amount: input.amount,
      studentName: s.name,
      instalmentId: i.id,
    };
  });
}
export async function completeCheckout(
  a: Actor,
  checkoutId: string,
  outcome: "success" | "pending" | "failure",
) {
  return db().begin(async (tx) => {
    const initial = (
      await tx`SELECT * FROM checkouts WHERE workspace=${a.workspace} AND id=${checkoutId}`
    )[0];
    demand(initial, "Payment link was not found.", 404);
    const s = await lockedStudent(tx, a, String(initial.student_id));
    const c = checkoutSchema.parse(
      (
        await tx`SELECT * FROM checkouts WHERE workspace=${a.workspace} AND id=${checkoutId} FOR UPDATE`
      )[0],
    );
    if (c.status === "success")
      return { status: "success", receiptId: c.id, replayed: true };
    demand(
      c.status !== "failure",
      "This payment failed. Create a new payment link.",
    );
    demand(
      c.expires_at.getTime() > Date.now(),
      "This payment link expired. Create a new link.",
    );
    if (outcome !== "success") {
      await tx`UPDATE checkouts SET status=${outcome} WHERE workspace=${a.workspace} AND id=${checkoutId}`;
      return { status: outcome };
    }
    const balance =
      financials(s).instalments.find((i) => i.id === c.instalment_id)
        ?.balance ?? 0;
    const amount = Math.min(c.amount, balance);
    const at = new Date().toISOString();
    await tx`INSERT INTO receipts(workspace,id,student_id,amount,at,reference) VALUES(${a.workspace},${c.id},${s.id},${c.amount},${at},${`MOCK-${c.id}`})`;
    if (amount) {
      const e = eventSchema.parse({
        id: `pay:${c.id}`,
        kind: "allocation",
        at,
        amount,
        receiptId: c.id,
        instalmentId: c.instalment_id,
      });
      await postEvent(tx, a, s.id, e);
      s.events.push(e);
    }
    await tx`UPDATE checkouts SET status='success' WHERE workspace=${a.workspace} AND id=${checkoutId}`;
    await cancelPaid(tx, a, s);
    return {
      status: "success",
      receiptId: c.id,
      allocated: amount,
      unmatched: c.amount - amount,
    };
  });
}
export async function allocateReceipt(
  a: Actor,
  input: {
    studentId: string;
    receiptId: string;
    instalmentId: string;
    amount: number;
    requestId: string;
  },
) {
  requireAccounts(a);
  return db().begin(async (tx) => {
    const s = await lockedStudent(tx, a, input.studentId);
    const existing = s.events.find((e) => e.id === input.requestId);
    if (existing) {
      demand(
        existing.kind === "allocation" &&
          existing.amount === input.amount &&
          existing.receiptId === input.receiptId &&
          existing.instalmentId === input.instalmentId,
        "Request ID belongs to a different operation.",
        409,
      );
      return { allocated: true, replayed: true };
    }
    const receipt = (
      await tx`SELECT amount FROM receipts WHERE workspace=${a.workspace} AND student_id=${s.id} AND id=${input.receiptId} FOR UPDATE`
    )[0];
    demand(receipt, "Receipt is outside this student's ledger.", 403);
    const allocated = activeEvents(s.events).reduce(
      (n, e) =>
        n +
        (e.kind === "allocation" && e.receiptId === input.receiptId
          ? e.amount
          : 0),
      0,
    );
    const balance =
      financials(s).instalments.find((i) => i.id === input.instalmentId)
        ?.balance ?? 0;
    demand(
      input.amount > 0 &&
        input.amount <= Number(receipt.amount) - allocated &&
        input.amount <= balance,
      "Allocation exceeds received money or the instalment balance.",
    );
    const e = eventSchema.parse({
      id: input.requestId,
      at: new Date().toISOString(),
      kind: "allocation",
      amount: input.amount,
      receiptId: input.receiptId,
      instalmentId: input.instalmentId,
    });
    await postEvent(tx, a, s.id, e);
    s.events.push(e);
    await cancelPaid(tx, a, s);
    return { allocated: true };
  });
}
export async function previewWithdrawal(a: Actor, studentId: string, on: Day) {
  requireAccounts(a);
  const s = (await studentsFor(a, db(), studentId))[0];
  demand(s, "Student is outside your access.", 403);
  demand(on <= todayInIndia(), "Withdrawal date cannot be in the future.");
  return { ...refundQuote(s, on), version: ledgerVersion(s) };
}
export async function withdraw(
  a: Actor,
  studentId: string,
  on: Day,
  version: string,
) {
  requireAccounts(a);
  return db().begin(async (tx) => {
    const s = await lockedStudent(tx, a, studentId),
      f = financials(s);
    if (f.withdrawn) {
      demand(
        f.withdrawn.on === on,
        "A different withdrawal is already recorded.",
        409,
      );
      return { withdrawn: true, replayed: true };
    }
    demand(on <= todayInIndia(), "Withdrawal date cannot be in the future.");
    demand(
      ledgerVersion(s) === version,
      "The ledger changed. Calculate a fresh refund preview.",
      409,
    );
    const q = refundQuote(s, on);
    const e = eventSchema.parse({
      ...q,
      id: `withdraw:${studentId}`,
      kind: "withdrawal",
      at: new Date().toISOString(),
    });
    await postEvent(tx, a, s.id, e);
    s.events.push(e);
    await cancelPaid(tx, a, s);
    return { withdrawn: true, ...q };
  });
}
export async function recordPayout(
  a: Actor,
  studentId: string,
  amount: number,
  requestId: string,
) {
  requireAccounts(a);
  return db().begin(async (tx) => {
    const s = await lockedStudent(tx, a, studentId),
      f = financials(s);
    const existing = s.events.find((e) => e.id === requestId);
    if (existing) {
      demand(
        existing.kind === "payout" && existing.amount === amount,
        "Request ID belongs to a different payout.",
        409,
      );
      return { paid: true, replayed: true };
    }
    demand(
      f.withdrawn && amount > 0 && amount <= f.refundable,
      "Payout exceeds the remaining refund.",
    );
    await postEvent(
      tx,
      a,
      s.id,
      eventSchema.parse({
        id: requestId,
        at: new Date().toISOString(),
        kind: "payout",
        withdrawalId: f.withdrawn.id,
        amount,
      }),
    );
    return { paid: true };
  });
}
export async function reverse(
  a: Actor,
  studentId: string,
  eventId: string,
  reason: string,
) {
  requireAccounts(a);
  return db().begin(async (tx) => {
    const s = await lockedStudent(tx, a, studentId);
    const original = s.events.find((e) => e.id === eventId);
    demand(
      original &&
        (original.kind === "allocation" || original.kind === "payout"),
      "Only a payment allocation or payout can be reversed.",
    );
    if (
      s.events.some(
        (e) => e.kind === "reversal" && e.originalId === original.id,
      )
    )
      return { reversed: true, replayed: true };
    demand(
      original.kind !== "allocation" || financials(s).payouts === 0,
      "Reverse the refund payout first before correcting a refunded payment.",
    );
    await postEvent(
      tx,
      a,
      s.id,
      eventSchema.parse({
        id: `reverse:${original.id}`,
        at: new Date().toISOString(),
        kind: "reversal",
        originalId: original.id,
        reason,
      }),
    );
    return { reversed: true };
  });
}
export async function runReminders(a: Actor) {
  requireAccounts(a);
  const list = await studentsFor(a),
    today = todayInIndia();
  let sent = 0;
  for (const student of list)
    sent += await db().begin(async (tx) => {
      const s = await lockedStudent(tx, a, student.id),
        f = financials(s);
      await cancelPaid(tx, a, s);
      const parent = (
        await tx`SELECT consent,locale FROM people WHERE workspace=${a.workspace} AND id=${s.parentId}`
      )[0];
      if (!parent?.consent || f.withdrawn) return 0;
      let count = 0;
      for (const i of f.instalments.filter((i) => i.balance > 0)) {
        const rows =
          await tx`SELECT id FROM reminders WHERE workspace=${a.workspace} AND student_id=${s.id} AND instalment_id=${i.id} AND status='pending' AND scheduled<=${today}::date ORDER BY scheduled DESC FOR UPDATE`;
        const latest = rows[0];
        if (!latest) continue;
        const locale = parent.locale === "hi" ? "hi" : "en";
        const body =
          locale === "hi"
            ? `${s.name} की फीस ${rupees(i.balance, "hi")} शेष है। देय तिथि ${i.due}। भुगतान के लिए अभिभावक पोर्टल खोलें। यह डेमो संदेश है।`
            : `${s.name} has ${rupees(i.balance)} remaining, due ${i.due}. Open the parent portal to pay. This is a demo reminder.`;
        await tx`UPDATE reminders SET status='skipped' WHERE workspace=${a.workspace} AND student_id=${s.id} AND instalment_id=${i.id} AND status='pending' AND scheduled<=${today}::date AND id<>${String(latest.id)}`;
        await tx`UPDATE reminders SET status='sent',body=${body},locale=${locale},sent_at=now() WHERE workspace=${a.workspace} AND id=${String(latest.id)} AND status='pending'`;
        count++;
      }
      return count;
    });
  return {
    sent,
    message: `${sent} demo reminder${sent === 1 ? "" : "s"} recorded. Paid and unconsented ledgers were checked before every send.`,
  };
}
