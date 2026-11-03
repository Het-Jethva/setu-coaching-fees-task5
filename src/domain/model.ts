import { z } from "zod";

export const daySchema = z.iso.date().brand<"CalendarDay">();
export const moneySchema = z
  .number()
  .int()
  .min(0)
  .max(1_000_000_000_000)
  .brand<"Paise">();
export const idSchema = z.string().min(1).max(100);
export const localeSchema = z.enum(["en", "hi"]);
export const offsets = [-7, 0, 3, 7, 14];
export const centres = ["Central", "North", "East", "West"];
export const batches = [
  "JEE 2027 Morning",
  "JEE 2027 Evening",
  "NEET 2027 Morning",
  "NEET 2027 Evening",
  "JEE 2028 Morning",
  "JEE 2028 Evening",
  "NEET 2028 Morning",
  "NEET 2028 Evening",
];
export const batchCentre = (batch: string) =>
  centres[Math.floor(Math.max(0, batches.indexOf(batch)) / 2)] ?? "Central";
const fact = { id: idSchema, at: z.iso.datetime() };
export const eventSchema = z.discriminatedUnion("kind", [
  z.object({
    ...fact,
    kind: z.literal("allocation"),
    amount: moneySchema,
    receiptId: idSchema,
    instalmentId: idSchema,
  }),
  z.object({
    ...fact,
    kind: z.literal("reversal"),
    originalId: idSchema,
    reason: z.string().min(3).max(300),
  }),
  z.object({
    ...fact,
    kind: z.literal("withdrawal"),
    on: daySchema,
    earned: moneySchema,
    unearned: moneySchema,
    usedDays: z.number().int().min(0),
    totalDays: z.number().int().positive(),
    due: daySchema,
  }),
  z.object({
    ...fact,
    kind: z.literal("payout"),
    amount: moneySchema,
    withdrawalId: idSchema,
  }),
]);
export const planSchema = z.object({
  gross: moneySchema,
  discount: moneySchema,
  taxBps: z.number().int().min(0).max(5000),
  start: daySchema,
  end: daySchema,
  instalments: z
    .array(z.object({ id: idSchema, due: daySchema, amount: moneySchema }))
    .min(3)
    .max(4),
});
export const attendanceSchema = z.object({
  date: daySchema,
  present: z.boolean(),
});
export const testSchema = z.object({
  name: z.string(),
  date: daySchema,
  marks: z.number().min(0),
  maximum: z.number().positive(),
});
export const riskSchema = z.object({
  hash: z.string(),
  level: z.enum(["low", "medium", "high"]),
  reasons: z.array(z.string()),
  at: z.iso.datetime(),
  dismissed: z.boolean(),
  model: z.string(),
});
export const studentSchema = z.object({
  id: idSchema,
  name: z.string(),
  centre: z.string(),
  batch: z.string(),
  parentId: idSchema,
  plan: planSchema,
  events: z.array(eventSchema),
  attendance: z.array(attendanceSchema),
  tests: z.array(testSchema),
  risk: riskSchema.nullable(),
});
export const actorSchema = z.object({
  id: z.string(),
  workspace: z.string().uuid(),
  role: z.enum(["parent", "accounts"]),
  name: z.string(),
  centres: z.array(z.string()),
  consent: z.boolean(),
  locale: localeSchema,
});
export const receiptSchema = z.object({
  id: idSchema,
  studentId: idSchema,
  amount: moneySchema,
  at: z.iso.datetime(),
  reference: z.string(),
});
export const reminderSchema = z.object({
  id: idSchema,
  studentId: idSchema,
  instalmentId: idSchema,
  scheduled: daySchema,
  status: z.enum(["pending", "sent", "cancelled", "skipped"]),
  body: z.string().nullable(),
  locale: localeSchema,
  sentAt: z.string().nullable(),
});
export const snapshotSchema = z.object({
  actor: actorSchema,
  students: z.array(studentSchema),
  receipts: z.array(receiptSchema),
  reminders: z.array(reminderSchema),
  today: daySchema,
  aiConfigured: z.boolean(),
});
export type Day = z.infer<typeof daySchema>;
export type Paise = z.infer<typeof moneySchema>;
export type Event = z.infer<typeof eventSchema>;
export type Student = z.infer<typeof studentSchema>;
export type Actor = z.infer<typeof actorSchema>;
export type Snapshot = z.infer<typeof snapshotSchema>;
export type Receipt = z.infer<typeof receiptSchema>;
export type Locale = z.infer<typeof localeSchema>;

const studentInput = { studentId: idSchema };
export const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("consent"), granted: z.boolean() }),
  z.object({ action: z.literal("language"), locale: localeSchema }),
  z.object({
    action: z.literal("checkout"),
    ...studentInput,
    instalmentId: idSchema,
    amount: moneySchema.positive(),
  }),
  z.object({
    action: z.literal("completeCheckout"),
    checkoutId: z.string().uuid(),
    outcome: z.enum(["success", "failure", "pending"]),
  }),
  z.object({
    action: z.literal("refundPreview"),
    ...studentInput,
    on: daySchema,
  }),
  z.object({
    action: z.literal("withdraw"),
    ...studentInput,
    on: daySchema,
    version: z.string(),
  }),
  z.object({
    action: z.literal("payout"),
    ...studentInput,
    amount: moneySchema.positive(),
    requestId: z.string().uuid(),
  }),
  z.object({
    action: z.literal("reverse"),
    ...studentInput,
    eventId: idSchema,
    reason: z.string().min(3).max(300),
  }),
  z.object({
    action: z.literal("allocate"),
    ...studentInput,
    receiptId: idSchema,
    instalmentId: idSchema,
    amount: moneySchema.positive(),
    requestId: z.string().uuid(),
  }),
  z.object({ action: z.literal("runReminders") }),
  z.object({
    action: z.literal("previewImport"),
    batch: z.string(),
    kind: z.enum(["attendance", "tests"]),
    csv: z.string().min(1).max(200_000),
  }),
  z.object({
    action: z.literal("confirmImport"),
    previewId: z.string().uuid(),
  }),
  z.object({ action: z.literal("assess"), batch: z.string() }),
  z.object({ action: z.literal("dismiss"), ...studentInput, hash: z.string() }),
]);
export type Action = z.infer<typeof actionSchema>;
