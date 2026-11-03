"use client";

import { z } from "zod";
import { moneySchema } from "@/domain/model";

export async function api(path: string, payload?: unknown): Promise<unknown> {
  const response = await fetch(
    path,
    payload
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      : { cache: "no-store" },
  );
  const result: unknown = await response.json();
  if (!response.ok) {
    const e = z.object({ error: z.string() }).safeParse(result);
    throw new Error(
      e.success ? e.data.error : "The request failed. Try again.",
    );
  }
  return result;
}

export const amountInput = (v: string) => {
  if (!/^\d+(\.\d{1,2})?$/.test(v))
    throw new Error("Enter a positive amount with up to two decimal places.");
  const [whole = "0", part = ""] = v.split(".");
  return moneySchema.parse(Number(whole) * 100 + Number(part.padEnd(2, "0")));
};
