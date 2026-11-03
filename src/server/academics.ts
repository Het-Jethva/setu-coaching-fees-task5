import Papa from "papaparse";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { batchCentre, batches, daySchema, type Actor } from "@/domain/model";
import { db, demand } from "./db";
import { requireAccounts, studentsFor, type Query } from "./store";

const attendanceRow = z.object({
  studentId: z.string().min(1),
  date: daySchema,
  present: z.boolean(),
});
const testRow = z
  .object({
    studentId: z.string().min(1),
    date: daySchema,
    name: z.string().min(1).max(100),
    marks: z.number().min(0).max(10000),
    maximum: z.number().positive().max(10000),
  })
  .refine((r) => r.marks <= r.maximum, "Marks exceed maximum marks.");
const importRowsSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("attendance"), rows: z.array(attendanceRow) }),
  z.object({ kind: z.literal("tests"), rows: z.array(testRow) }),
]);
type ImportRows = z.infer<typeof importRowsSchema>;
function batchAccess(a: Actor, batch: string) {
  requireAccounts(a);
  demand(
    batches.includes(batch) && a.centres.includes(batchCentre(batch)),
    "Batch is outside your assigned centres.",
    403,
  );
}
async function validateExisting(
  sql: Query,
  a: Actor,
  batch: string,
  data: ImportRows,
) {
  const allowed = new Set(
    (await studentsFor(a, sql))
      .filter((s) => s.batch === batch)
      .map((s) => s.id),
  );
  const errors: string[] = [],
    seen = new Map<string, string>();
  for (const [i, row] of data.rows.entries()) {
    if (!allowed.has(row.studentId)) {
      errors.push(`Row ${i + 2}: student is not in the selected batch.`);
      continue;
    }
    const key =
      row.studentId +
      row.date +
      (data.kind === "tests" && "name" in row ? row.name : "");
    const serialized = JSON.stringify(row);
    if (seen.has(key) && seen.get(key) !== serialized)
      errors.push(`Row ${i + 2}: conflicting duplicate in this file.`);
    seen.set(key, serialized);
    if (data.kind === "attendance" && "present" in row) {
      const existing = (
        await sql`SELECT present FROM attendance WHERE workspace=${a.workspace} AND student_id=${row.studentId} AND day=${row.date}::date`
      )[0];
      if (existing && existing.present !== row.present)
        errors.push(`Row ${i + 2}: conflicts with existing attendance.`);
    } else if ("name" in row) {
      const existing = (
        await sql`SELECT marks,maximum FROM test_results WHERE workspace=${a.workspace} AND student_id=${row.studentId} AND day=${row.date}::date AND name=${row.name}`
      )[0];
      if (
        existing &&
        (Number(existing.marks) !== row.marks ||
          Number(existing.maximum) !== row.maximum)
      )
        errors.push(`Row ${i + 2}: conflicts with an existing test result.`);
    }
  }
  return errors;
}
export async function previewImport(
  a: Actor,
  batch: string,
  kind: "attendance" | "tests",
  csv: string,
) {
  batchAccess(a, batch);
  const parsed = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim(),
  });
  demand(
    parsed.data.length > 0 && parsed.data.length <= 500,
    "Upload between 1 and 500 rows.",
  );
  const errors = parsed.errors.map(
    (e) => `CSV row ${(e.row ?? 0) + 2}: ${e.message}`,
  );
  const rows: unknown[] = [];
  for (const [i, r] of parsed.data.entries()) {
    const result =
      kind === "attendance"
        ? attendanceRow.safeParse({
            studentId: r.student_id?.trim(),
            date: r.date?.trim(),
            present:
              r.status?.trim().toLowerCase() === "present"
                ? true
                : r.status?.trim().toLowerCase() === "absent"
                  ? false
                  : null,
          })
        : testRow.safeParse({
            studentId: r.student_id?.trim(),
            date: r.date?.trim(),
            name: r.test_name?.trim(),
            marks: r.marks?.trim() ? Number(r.marks) : NaN,
            maximum: r.maximum_marks?.trim() ? Number(r.maximum_marks) : NaN,
          });
    if (result.success) rows.push(result.data);
    else
      errors.push(
        `Row ${i + 2}: ${result.error.issues.map((e) => e.path.join(".") + " " + e.message).join("; ")}`,
      );
  }
  const data = importRowsSchema.parse({ kind, rows });
  errors.push(...(await validateExisting(db(), a, batch, data)));
  if (errors.length)
    return {
      previewId: null,
      count: parsed.data.length,
      rows: rows.slice(0, 10),
      errors,
    };
  const id = randomUUID();
  await db()`INSERT INTO import_previews(id,workspace,person_id,batch,kind,rows) VALUES(${id},${a.workspace},${a.id},${batch},${kind},${db().json(data)})`;
  return {
    previewId: id,
    count: data.rows.length,
    rows: data.rows.slice(0, 10),
    errors: [],
  };
}
export async function confirmImport(a: Actor, id: string) {
  requireAccounts(a);
  return db().begin(async (tx) => {
    const p = (
      await tx`SELECT * FROM import_previews WHERE id=${id} AND workspace=${a.workspace} AND person_id=${a.id} AND expires_at>now() FOR UPDATE`
    )[0];
    demand(p, "Preview expired. Upload the CSV again.", 404);
    batchAccess(a, String(p.batch));
    if (p.confirmed) return { imported: true, replayed: true };
    await tx`SELECT pg_advisory_xact_lock(hashtext(${a.workspace + String(p.batch)}))`;
    const data = importRowsSchema.parse(p.rows);
    const errors = await validateExisting(tx, a, String(p.batch), data);
    demand(errors.length === 0, errors.join("\n"));
    if (data.kind === "attendance")
      for (const r of data.rows)
        await tx`INSERT INTO attendance(workspace,student_id,day,present) VALUES(${a.workspace},${r.studentId},${r.date}::date,${r.present}) ON CONFLICT DO NOTHING`;
    else
      for (const r of data.rows)
        await tx`INSERT INTO test_results(workspace,student_id,name,day,marks,maximum) VALUES(${a.workspace},${r.studentId},${r.name},${r.date}::date,${r.marks},${r.maximum}) ON CONFLICT DO NOTHING`;
    await tx`UPDATE import_previews SET confirmed=true WHERE id=${id}`;
    return { imported: true, count: data.rows.length };
  });
}
