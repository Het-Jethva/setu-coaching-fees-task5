import { describe, expect, it } from "vitest";
import { studentSchema, daySchema, eventSchema } from "../src/domain/model";
import {
  addDays,
  financials,
  refundQuote,
  splitFee,
  taxSplit,
  monthlyCollections,
} from "../src/domain/money";
function student(paid = 6_000_000) {
  return studentSchema.parse({
    id: "STU-TEST",
    name: "Fictional student",
    centre: "Central",
    batch: "JEE 2027 Morning",
    parentId: "PARENT-01",
    plan: {
      gross: 12_000_000,
      discount: 0,
      taxBps: 1800,
      start: "2026-01-01",
      end: "2026-04-10",
      instalments: splitFee(12_000_000, 4).map((amount, i) => ({
        id: `I${i}`,
        amount,
        due: addDays("2026-01-01", i * 25),
      })),
    },
    events: paid
      ? [
          {
            id: "payment",
            at: "2026-01-01T00:00:00.000Z",
            kind: "allocation",
            amount: paid,
            receiptId: "receipt",
            instalmentId: "I0",
          },
        ]
      : [],
    attendance: [],
    tests: [],
    risk: null,
  });
}
describe("fee policy", () => {
  it("conserves every paise when splitting discounted fees", () => {
    for (let total = 0; total < 1000; total++)
      for (const count of [3, 4]) {
        const parts = splitFee(total, count === 3 ? 3 : 4);
        expect(parts.reduce((a, b) => a + b, 0)).toBe(total);
        expect(Math.max(...parts) - Math.min(...parts)).toBeLessThanOrEqual(1);
      }
  });
  it("conserves GST-inclusive totals and deterministic rounding", () => {
    for (const total of [1, 7, 11800, 3000000, 99999999]) {
      const split = taxSplit(total);
      expect(split.taxable + split.gst).toBe(total);
      expect(Number.isInteger(split.gst)).toBe(true);
    }
    expect(taxSplit(11800)).toEqual({
      total: 11800,
      taxable: 10000,
      gst: 1800,
    });
  });
  it("uses the approved 25-of-100-day example", () => {
    expect(refundQuote(student(), daySchema.parse("2026-01-25"))).toMatchObject(
      {
        usedDays: 25,
        totalDays: 100,
        earned: 3000000,
        refund: 3000000,
        due: "2026-02-04",
      },
    );
  });
  it("handles before-start, first-day, last-day, and after-end withdrawal", () => {
    expect(refundQuote(student(), daySchema.parse("2025-12-31")).earned).toBe(
      0,
    );
    expect(refundQuote(student(), daySchema.parse("2026-01-01")).earned).toBe(
      120000,
    );
    expect(refundQuote(student(), daySchema.parse("2026-04-10")).earned).toBe(
      12000000,
    );
    expect(refundQuote(student(), daySchema.parse("2026-05-10")).earned).toBe(
      12000000,
    );
  });
  it("keeps unpaid earned fees due instead of inventing a refund", () => {
    const q = refundQuote(student(1000000), daySchema.parse("2026-01-25"));
    expect(q.refund).toBe(0);
    expect(q.earnedDue).toBe(2000000);
  });
  it("rebuckets withdrawn fees without simultaneous debt and credit", () => {
    const s = student();
    const q = refundQuote(s, daySchema.parse("2026-01-25"));
    s.events.push(
      eventSchema.parse({
        ...q,
        id: "withdraw",
        kind: "withdrawal",
        at: "2026-01-25T00:00:00.000Z",
      }),
    );
    const f = financials(s, daySchema.parse("2026-01-25"));
    expect(f.outstanding).toBe(0);
    expect(f.refundable).toBe(3000000);
    s.events.push(
      eventSchema.parse({
        id: "payout",
        kind: "payout",
        at: "2026-01-25T00:00:00.000Z",
        amount: 1000000,
        withdrawalId: "withdraw",
      }),
    );
    expect(financials(s).refundable).toBe(2000000);
  });
  it("preserves original entries while a reversal reopens balances", () => {
    const s = student(3000000);
    s.events.push(
      eventSchema.parse({
        id: "reverse",
        at: "2026-02-01T00:00:00.000Z",
        kind: "reversal",
        originalId: "payment",
        reason: "Incorrect allocation",
      }),
    );
    expect(s.events).toHaveLength(2);
    expect(financials(s).paid).toBe(0);
    expect(monthlyCollections([s], "2026-01")).toBe(3000000);
    expect(monthlyCollections([s], "2026-02")).toBe(-3000000);
  });
  it("treats the due day as current and the next day as overdue", () => {
    const s = student(0);
    expect(financials(s, daySchema.parse("2026-01-01")).overdue).toBe(0);
    expect(financials(s, daySchema.parse("2026-01-02")).overdue).toBe(3000000);
  });
  it("counts leap calendar days rather than elapsed local hours", () => {
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29");
    expect(addDays("2024-02-28", 2)).toBe("2024-03-01");
  });
});
