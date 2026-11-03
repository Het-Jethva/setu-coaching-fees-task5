import { z } from "zod";
import type postgres from "postgres";
import {
  actorSchema,
  receiptSchema,
  reminderSchema,
  studentSchema,
  type Actor,
  type Student,
  type Event,
} from "@/domain/model";
import { db, demand } from "./db";
export type Query = postgres.ISql;
export async function studentsFor(
  actor: Actor,
  sql: Query = db(),
  studentId?: string,
): Promise<Student[]> {
  const rows =
    await sql`SELECT s.id,s.name,s.centre,s.batch,s.parent_id AS "parentId",s.plan,
    COALESCE((SELECT jsonb_agg(e.data ORDER BY e.data->>'at', e.id) FROM ledger_events e WHERE e.workspace=s.workspace AND e.student_id=s.id),'[]') AS events,
    COALESCE((SELECT jsonb_agg(jsonb_build_object('date',a.day::text,'present',a.present) ORDER BY a.day) FROM attendance a WHERE a.workspace=s.workspace AND a.student_id=s.id),'[]') AS attendance,
    COALESCE((SELECT jsonb_agg(jsonb_build_object('name',t.name,'date',t.day::text,'marks',t.marks,'maximum',t.maximum) ORDER BY t.day) FROM test_results t WHERE t.workspace=s.workspace AND t.student_id=s.id),'[]') AS tests,
    CASE WHEN ${actor.role}='accounts' THEN (SELECT r.data || jsonb_build_object('dismissed',COALESCE(c.dismissed,false)) FROM risk_assessments r LEFT JOIN call_tasks c ON c.workspace=r.workspace AND c.student_id=r.student_id AND c.evidence_hash=r.evidence_hash WHERE r.workspace=s.workspace AND r.student_id=s.id ORDER BY r.data->>'at' DESC LIMIT 1) ELSE NULL END AS risk
    FROM students s WHERE s.workspace=${actor.workspace} AND (${studentId ?? null}::text IS NULL OR s.id=${studentId ?? null})
    AND ((${actor.role}='accounts' AND s.centre=ANY(${actor.centres}::text[])) OR (${actor.role}='parent' AND ${actor.consent} AND s.parent_id=${actor.id})) ORDER BY s.id`;
  return studentSchema.array().parse(rows);
}
export async function lockedStudent(
  sql: Query,
  actor: Actor,
  studentId: string,
) {
  await sql`SELECT id FROM students WHERE workspace=${actor.workspace} AND id=${studentId} FOR UPDATE`;
  const student = (await studentsFor(actor, sql, studentId))[0];
  demand(student, "Student is unavailable or outside your access.", 403);
  return student;
}
export function requireAccounts(actor: Actor) {
  demand(actor.role === "accounts", "Accounts access is required.", 403);
}
export async function postEvent(
  sql: Query,
  actor: Actor,
  studentId: string,
  event: Event,
) {
  await sql`INSERT INTO ledger_events(workspace,id,student_id,data) VALUES(${actor.workspace},${event.id},${studentId},${sql.json(event)})`;
  await sql`UPDATE students SET revision=revision+1 WHERE workspace=${actor.workspace} AND id=${studentId}`;
}
export async function getReceipts(actor: Actor, sql: Query = db()) {
  const rows =
    await sql`SELECT r.id,r.student_id AS "studentId",r.amount::float8 AS amount,r.at,r.reference FROM receipts r JOIN students s ON s.workspace=r.workspace AND s.id=r.student_id WHERE r.workspace=${actor.workspace} AND ((${actor.role}='accounts' AND s.centre=ANY(${actor.centres}::text[])) OR (${actor.role}='parent' AND ${actor.consent} AND s.parent_id=${actor.id})) ORDER BY r.at DESC`;
  return receiptSchema
    .array()
    .parse(rows.map((r) => ({ ...r, at: new Date(r.at).toISOString() })));
}
export async function snapshot(actor: Actor) {
  const { todayInIndia } = await import("@/domain/money");
  const students = await studentsFor(actor);
  const receipts = await getReceipts(actor);
  const reminders =
    await db()`SELECT r.id,r.student_id AS "studentId",r.instalment_id AS "instalmentId",r.scheduled::text,r.status,r.body,r.locale,r.sent_at::text AS "sentAt" FROM reminders r JOIN students s ON s.workspace=r.workspace AND s.id=r.student_id WHERE r.workspace=${actor.workspace} AND ((${actor.role}='accounts' AND s.centre=ANY(${actor.centres}::text[])) OR (${actor.role}='parent' AND ${actor.consent} AND s.parent_id=${actor.id})) ORDER BY r.scheduled DESC`;
  return {
    actor,
    students,
    receipts,
    reminders: reminderSchema.array().parse(reminders),
    today: todayInIndia(),
    aiConfigured: Boolean(process.env.OPENROUTER_API_KEY),
  };
}
export const personRow = z.object({
  id: z.string(),
  role: actorSchema.shape.role,
  name: z.string(),
  centres: z.array(z.string()),
  consent: z.boolean(),
  locale: actorSchema.shape.locale,
});
