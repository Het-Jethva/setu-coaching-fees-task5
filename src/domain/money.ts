import {
  daySchema,
  moneySchema,
  type Day,
  type Event,
  type Student,
} from "./model";

export const todayInIndia = () =>
  daySchema.parse(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date()),
  );
export const addDays = (day: string, n: number) =>
  daySchema.parse(
    new Date(Date.parse(day + "T00:00:00Z") + n * 86400000)
      .toISOString()
      .slice(0, 10),
  );
export const daysBetween = (a: string, b: string) =>
  Math.round(
    (Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86400000,
  );
export const roundRatio = (
  value: number,
  numerator: number,
  denominator: number,
) =>
  Number(
    (BigInt(value) * BigInt(numerator) * BigInt(2) + BigInt(denominator)) /
      (BigInt(denominator) * BigInt(2)),
  );
export function splitFee(total: number, count: 3 | 4) {
  return Array.from(
    { length: count },
    (_, i) => Math.floor(total / count) + (i < total % count ? 1 : 0),
  );
}
export function taxSplit(total: number, bps = 1800) {
  const gst = roundRatio(total, bps, 10000 + bps);
  return { total, taxable: total - gst, gst };
}
export const activeEvents = (events: Event[]) =>
  events.filter(
    (e) =>
      e.kind !== "reversal" &&
      !events.some((r) => r.kind === "reversal" && r.originalId === e.id),
  );
export function financials(student: Student, today: Day = todayInIndia()) {
  const events = activeEvents(student.events);
  const paid = events.reduce(
    (a, e) => a + (e.kind === "allocation" ? e.amount : 0),
    0,
  );
  const payouts = events.reduce(
    (a, e) => a + (e.kind === "payout" ? e.amount : 0),
    0,
  );
  const withdrawal = events.find((e) => e.kind === "withdrawal");
  const withdrawn = withdrawal?.kind === "withdrawal" ? withdrawal : null;
  let retained = withdrawn
    ? withdrawn.earned
    : student.plan.gross - student.plan.discount;
  let credited = paid - payouts;
  const instalments = student.plan.instalments.map((i) => {
    const charge = withdrawn ? Math.min(retained, i.amount) : i.amount;
    retained -= charge;
    const allocated = withdrawn
      ? Math.max(0, Math.min(credited, charge))
      : events.reduce(
          (a, e) =>
            a +
            (e.kind === "allocation" && e.instalmentId === i.id ? e.amount : 0),
          0,
        );
    if (withdrawn) credited -= allocated;
    const balance = Math.max(0, charge - allocated);
    const daysOverdue = balance ? Math.max(0, daysBetween(i.due, today)) : 0;
    return { ...i, charge, paid: allocated, balance, daysOverdue };
  });
  return {
    paid,
    payouts,
    withdrawn,
    instalments,
    outstanding: instalments.reduce((a, i) => a + i.balance, 0),
    overdue: instalments.reduce(
      (a, i) => a + (i.daysOverdue ? i.balance : 0),
      0,
    ),
    refundable: withdrawn ? Math.max(0, paid - payouts - withdrawn.earned) : 0,
  };
}
export function refundQuote(student: Student, on: Day) {
  const totalDays = daysBetween(student.plan.start, student.plan.end) + 1;
  if (totalDays < 1) throw new Error("Course end must follow course start.");
  const usedDays = Math.max(
    0,
    Math.min(totalDays, daysBetween(student.plan.start, on) + 1),
  );
  const total = student.plan.gross - student.plan.discount;
  const earned = roundRatio(total, usedDays, totalDays);
  const f = financials(student);
  return {
    on,
    totalDays,
    usedDays,
    earned: moneySchema.parse(earned),
    unearned: moneySchema.parse(total - earned),
    refund: moneySchema.parse(Math.max(0, f.paid - f.payouts - earned)),
    earnedDue: moneySchema.parse(Math.max(0, earned - f.paid + f.payouts)),
    due: addDays(on, 10),
  };
}
export function monthlyCollections(students: Student[], month: string) {
  return students.reduce(
    (total, s) =>
      total +
      s.events.reduce((n, e) => {
        if (!e.at.startsWith(month)) return n;
        if (e.kind === "allocation") return n + e.amount;
        if (e.kind === "payout") return n - e.amount;
        if (e.kind === "reversal") {
          const original = s.events.find((p) => p.id === e.originalId);
          if (original?.kind === "allocation") return n - original.amount;
          if (original?.kind === "payout") return n + original.amount;
        }
        return n;
      }, 0),
    0,
  );
}
export const rupees = (paise: number, locale = "en") =>
  new Intl.NumberFormat(locale === "hi" ? "hi-IN" : "en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: paise % 100 ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(paise / 100);
export const dateLabel = (date: string, locale = "en") =>
  new Intl.DateTimeFormat(locale === "hi" ? "hi-IN" : "en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date(date + "T00:00:00Z"));
