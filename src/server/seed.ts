import { randomUUID, scryptSync } from "node:crypto";
import {
  batches,
  batchCentre,
  centres,
  offsets,
  planSchema,
  eventSchema,
  studentSchema,
} from "@/domain/model";
import { addDays, refundQuote, splitFee, todayInIndia } from "@/domain/money";
import type { Tx } from "./db";

export const demoPassword = "SetuDemo2026!";
export function passwordHash(password: string, salt: string) {
  return scryptSync(password, salt, 32).toString("hex");
}
export async function seedWorkspace(tx: Tx, workspace: string) {
  const staff = [
    { id: "central", name: "Ananya · Central accounts", centres },
    ...centres.map((centre, i) => ({
      id: `centre-${i + 1}`,
      name: `${centre} accounts`,
      centres: [centre],
    })),
  ];
  for (const s of staff)
    await tx`INSERT INTO people(workspace,id,role,name,centres,password_hash) VALUES(${workspace},${s.id},'accounts',${s.name},${s.centres},${passwordHash(demoPassword, workspace + s.id)})`;
  for (let i = 1; i <= 40; i++) {
    const id = `PARENT-${String(i).padStart(2, "0")}`;
    await tx`INSERT INTO people(workspace,id,role,name,locale,consent) VALUES(${workspace},${id},'parent',${`Demo parent ${i}`},${i % 3 ? "en" : "hi"},${i > 3})`;
    if (i > 3)
      await tx`INSERT INTO consent_events(id,workspace,person_id,granted) VALUES(${randomUUID()},${workspace},${id},true)`;
  }
  const first = [
    "Ishita",
    "Aarav",
    "Mohit",
    "Diya",
    "Kabir",
    "Ananya",
    "Vihaan",
    "Saanvi",
    "Aditya",
    "Kavya",
  ];
  const last = [
    "Sharma",
    "Meena",
    "Gurjar",
    "Joshi",
    "Verma",
    "Saini",
    "Singh",
    "Yadav",
  ];
  const today = todayInIndia();
  const attendanceRows: {
    workspace: string;
    student_id: string;
    day: string;
    present: boolean;
  }[] = [];
  const testRows: {
    workspace: string;
    student_id: string;
    name: string;
    day: string;
    marks: number;
    maximum: number;
  }[] = [];
  const reminderRows: {
    workspace: string;
    id: string;
    student_id: string;
    instalment_id: string;
    scheduled: string;
    locale: string;
  }[] = [];
  for (let i = 0; i < 80; i++) {
    const id =
      ["STU-0587", "STU-0412", "STU-0219"][i] ??
      `STU-${String(700 + i).padStart(4, "0")}`;
    const name =
      i < 3
        ? (["Ishita Sharma", "Aarav Meena", "Mohit Gurjar"][i] ??
          "Demo student")
        : `${first[i % first.length]} ${last[Math.floor(i / first.length) % last.length]}`;
    const batch =
      batches[i === 0 ? 1 : i === 1 ? 0 : i === 2 ? 2 : i % 8] ?? batches[0];
    const parent = `PARENT-${String((i % 40) + 1).padStart(2, "0")}`;
    const count = i === 2 ? 3 : 4;
    const gross = 12_000_000;
    const discount = i > 3 && i % 7 === 0 ? 600_000 : 0;
    const amounts = splitFee(gross - discount, count);
    const dues =
      i < 2
        ? ["2026-10-10", "2026-12-10", "2027-03-10", "2027-06-10"]
        : i === 2
          ? ["2026-11-15", "2027-02-15", "2027-05-15"]
          : [i % 7 ? -90 : -100, -5, 60, 150].map((n) => addDays(today, n));
    const plan = planSchema.parse({
      gross,
      discount,
      taxBps: 1800,
      start: addDays(today, -120),
      end: addDays(today, 244),
      instalments: amounts.map((amount, n) => ({
        id: `${id}-I${n + 1}`,
        amount,
        due: dues[n],
      })),
    });
    await tx`INSERT INTO students(workspace,id,name,centre,batch,parent_id,plan) VALUES(${workspace},${id},${name},${batchCentre(batch)},${batch},${parent},${tx.json(plan)})`;
    const base = studentSchema.parse({
      id,
      name,
      centre: batchCentre(batch),
      batch,
      parentId: parent,
      plan,
      events: [],
      attendance: [],
      tests: [],
      risk: null,
    });
    const paidCount =
      i === 2 ? 0 : i === 3 ? 3 : i % 5 === 0 ? 0 : i % 3 === 0 ? 2 : 1;
    for (let p = 0; p < paidCount || (i === 0 && p === 0); p++) {
      const instalment = plan.instalments[p];
      if (!instalment) continue;
      const amount = i === 0 ? 1_500_000 : instalment.amount;
      const at =
        i < 2
          ? "2026-10-10T09:00:00.000Z"
          : new Date(
              addDays(today, -Math.max(1, (i % 21) - p * 5)) + "T09:00:00Z",
            ).toISOString();
      const receiptId = randomUUID();
      await tx`INSERT INTO receipts(workspace,id,student_id,amount,at,reference) VALUES(${workspace},${receiptId},${id},${amount},${at},${`DEMO-${id}-${p + 1}`})`;
      const event = eventSchema.parse({
        id: randomUUID(),
        kind: "allocation",
        at,
        amount,
        receiptId,
        instalmentId: instalment.id,
      });
      base.events.push(event);
      await tx`INSERT INTO ledger_events(workspace,id,student_id,data) VALUES(${workspace},${event.id},${id},${tx.json(event)})`;
    }
    if (i === 3) {
      const q = refundQuote(base, addDays(today, -4));
      const e = eventSchema.parse({
        ...q,
        id: randomUUID(),
        kind: "withdrawal",
        at: new Date().toISOString(),
      });
      await tx`INSERT INTO ledger_events(workspace,id,student_id,data) VALUES(${workspace},${e.id},${id},${tx.json(e)})`;
    }
    if (i === 4)
      await tx`INSERT INTO receipts(workspace,id,student_id,amount,at,reference) VALUES(${workspace},${randomUUID()},${id},250000,now(),${`UNMATCHED-${id}`})`;
    for (let d = 28; d >= 1; d--)
      attendanceRows.push({
        workspace,
        student_id: id,
        day: addDays(today, -d),
        present:
          i % 6 === 0
            ? d > 14
              ? d % 7 !== 0
              : d % 3 === 0
            : (d + i) % 9 !== 0,
      });
    for (let t = 0; t < (i === 5 ? 1 : 4); t++)
      testRows.push({
        workspace,
        student_id: id,
        name: `Practice test ${t + 1}`,
        day: addDays(today, -28 + t * 7),
        marks: i % 6 === 0 ? 80 - t * 13 : 58 + ((i * 3 + t * 7) % 36),
        maximum: 100,
      });
    for (const inst of plan.instalments)
      for (const offset of offsets)
        reminderRows.push({
          workspace,
          id: `${inst.id}:${offset}`,
          student_id: id,
          instalment_id: inst.id,
          scheduled: addDays(inst.due, offset),
          locale: "en",
        });
  }
  await tx`INSERT INTO attendance ${tx(attendanceRows)}`;
  await tx`INSERT INTO test_results ${tx(testRows)}`;
  await tx`INSERT INTO reminders ${tx(reminderRows)}`;
}
