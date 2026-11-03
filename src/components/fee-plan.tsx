"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Notice } from "@/components/shared";
import type { Controller } from "@/components/types";
import { daySchema, type Student } from "@/domain/model";
import { rupees, splitFee } from "@/domain/money";
import { amountInput } from "@/lib/client";

export function FeePlanEditor({ c, s }: { c: Controller; s: Student }) {
  const [open, setOpen] = useState(false);
  const [gross, setGross] = useState(String(s.plan.gross / 100));
  const [discount, setDiscount] = useState(String(s.plan.discount / 100));
  const [tax, setTax] = useState(String(s.plan.taxBps / 100));
  const [start, setStart] = useState(String(s.plan.start));
  const [end, setEnd] = useState(String(s.plan.end));
  const [count, setCount] = useState<3 | 4>(
    s.plan.instalments.length === 3 ? 3 : 4,
  );
  const [dues, setDues] = useState(
    s.plan.instalments.map((i) => String(i.due)),
  );
  const locked =
    s.events.length > 0 || c.data.receipts.some((r) => r.studentId === s.id);
  const total = Number(gross) - Number(discount);
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          disabled={locked}
          onClick={() => setOpen(true)}
        >
          Edit fee plan
        </Button>
        {locked && (
          <small className="muted">
            Plan protected after financial activity
          </small>
        )}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit {s.name}&apos;s fee plan</DialogTitle>
            <DialogDescription>
              Save the agreed fee and dates before collecting money. A revision
              is kept, and pending payment links are replaced.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void c.run(async () => {
                const dates = daySchema
                  .array()
                  .safeParse([
                    start,
                    end,
                    ...Array.from({ length: count }, (_, i) => dues[i] ?? ""),
                  ]);
                if (!dates.success)
                  throw new Error(
                    "Choose a valid course date and a due date for every instalment.",
                  );
                await c.act({
                  action: "configurePlan",
                  studentId: s.id,
                  gross: amountInput(gross),
                  discount: amountInput(discount),
                  taxBps: Math.round(Number(tax) * 100),
                  start: daySchema.parse(start),
                  end: daySchema.parse(end),
                  dues: Array.from({ length: count }, (_, i) =>
                    daySchema.parse(dues[i] ?? ""),
                  ),
                });
                setOpen(false);
              });
            }}
            className="flex flex-col gap-5"
          >
            <FieldGroup className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="plan-gross">
                  Course fee (₹, GST included)
                </FieldLabel>
                <Input
                  id="plan-gross"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={gross}
                  onChange={(e) => setGross(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="plan-discount">
                  Fixed discount (₹)
                </FieldLabel>
                <Input
                  id="plan-discount"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="plan-gst">Demo GST (%)</FieldLabel>
                <Input
                  id="plan-gst"
                  type="number"
                  min="0"
                  max="50"
                  step="0.01"
                  required
                  value={tax}
                  onChange={(e) => setTax(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="plan-count">Instalments</FieldLabel>
                <NativeSelect
                  id="plan-count"
                  value={count}
                  onChange={(e) => {
                    setCount(e.target.value === "3" ? 3 : 4);
                    setDues((old) => [
                      old[0] ?? "",
                      old[1] ?? "",
                      old[2] ?? "",
                      old[3] || end,
                    ]);
                  }}
                >
                  <NativeSelectOption value="3">
                    3 instalments
                  </NativeSelectOption>
                  <NativeSelectOption value="4">
                    4 instalments
                  </NativeSelectOption>
                </NativeSelect>
              </Field>
              <Field>
                <FieldLabel htmlFor="plan-start">Course starts</FieldLabel>
                <Input
                  id="plan-start"
                  type="date"
                  required
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="plan-end">Course ends</FieldLabel>
                <Input
                  id="plan-end"
                  type="date"
                  required
                  min={start}
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                />
              </Field>
              {Array.from({ length: count }, (_, i) => (
                <Field key={i}>
                  <FieldLabel htmlFor={`plan-due-${i}`}>
                    Instalment {i + 1} due
                  </FieldLabel>
                  <Input
                    id={`plan-due-${i}`}
                    type="date"
                    required
                    min={start}
                    max={end}
                    value={dues[i] ?? ""}
                    onChange={(e) =>
                      setDues((old) =>
                        Array.from({ length: 4 }, (_, j) =>
                          j === i ? e.target.value : (old[j] ?? ""),
                        ),
                      )
                    }
                  />
                </Field>
              ))}
            </FieldGroup>
            {Number.isFinite(total) && total > 0 && (
              <p className="text-sm">
                Agreed total: <strong>{rupees(Math.round(total * 100))}</strong>
                . Instalments:{" "}
                {splitFee(Math.round(total * 100), count)
                  .map((n) => rupees(n))
                  .join(" · ")}
                . The first instalments receive any rounding paise.
              </p>
            )}
            {c.error && <Notice error message={c.error} />}
            <Button type="submit" disabled={c.busy}>
              {c.busy ? "Saving…" : "Save fee plan"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
