import { describe, expect, it } from "vitest";
import { validateRiskReply } from "../src/server/risk";
describe("AI evidence boundary", () => {
  it("rejects the unsupported signals observed in a real free-model response", () => {
    const captured = {
      students: [
        {
          id: "case-0",
          risk: "low",
          signals: ["attendance_falling", "test_scores_falling"],
        },
      ],
    };
    expect(() =>
      validateRiskReply(captured, [{ id: "case-0", allowedSignals: [] }]),
    ).toThrow("unsupported evidence");
  });
  it("rejects high risk without evidence and duplicate identities", () => {
    expect(() =>
      validateRiskReply(
        { students: [{ id: "case-0", risk: "high", signals: [] }] },
        [{ id: "case-0", allowedSignals: [] }],
      ),
    ).toThrow("unsupported evidence");
    expect(() =>
      validateRiskReply(
        {
          students: [
            { id: "case-0", risk: "low", signals: [] },
            { id: "case-0", risk: "low", signals: [] },
          ],
        },
        [
          { id: "case-0", allowedSignals: [] },
          { id: "case-1", allowedSignals: [] },
        ],
      ),
    ).toThrow("duplicate");
  });
  it("accepts a complete response with only observed supporting facts", () => {
    const response = {
      students: [
        { id: "case-0", risk: "high", signals: ["missed_payments"] },
        { id: "case-1", risk: "low", signals: [] },
      ],
    };
    expect(
      validateRiskReply(response, [
        { id: "case-0", allowedSignals: ["missed_payments"] },
        { id: "case-1", allowedSignals: [] },
      ]),
    ).toEqual(response);
  });
});
