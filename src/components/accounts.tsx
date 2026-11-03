"use client";

import { useState } from "react";
import { z } from "zod";
import {
  Upload,
  ArrowUpRight,
  ArrowLeft,
  LoaderCircle,
  ChevronRight,
  FileText,
  Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldLabel,
  FieldGroup,
  FieldDescription,
} from "@/components/ui/field";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableCell,
  TableBody,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { batches, batchCentre, type Student, daySchema } from "@/domain/model";
import {
  activeEvents,
  dateLabel,
  financials,
  monthlyCollections,
  rupees,
} from "@/domain/money";
import type { Controller, PayTarget } from "@/components/types";
import { Nothing, Notice } from "@/components/shared";
import { Instalments, Receipts, Academics } from "@/components/parent";
import { amountInput } from "@/lib/client";
import { FeePlanEditor } from "@/components/fee-plan";

export function AccountsOverview({
  c,
  listOnly,
  onStudent,
}: {
  c: Controller;
  listOnly: boolean;
  onStudent: (id: string) => void;
}) {
  const [centre, setCentre] = useState(""),
    [batch, setBatch] = useState(""),
    [search, setSearch] = useState(""),
    [page, setPage] = useState(0);
  const filtered = c.data.students.filter(
    (s) =>
      (!centre || s.centre === centre) &&
      (!batch || s.batch === batch) &&
      `${s.name} ${s.id}`.toLowerCase().includes(search.toLowerCase()),
  );
  const fs = filtered.map((s) => ({
    student: s,
    ...financials(s, c.data.today),
  }));
  const total = fs.reduce((n, f) => n + f.outstanding, 0),
    overdue = fs.reduce((n, f) => n + f.overdue, 0),
    refunds = fs.reduce((n, f) => n + f.refundable, 0),
    net = monthlyCollections(filtered, c.data.today.slice(0, 7));
  const ages = [
    { name: "Not yet due", min: 0, max: 0 },
    { name: "1–30 days", min: 1, max: 30 },
    { name: "31–60 days", min: 31, max: 60 },
    { name: "61–90 days", min: 61, max: 90 },
    { name: "Over 90 days", min: 91, max: Infinity },
  ].map((b) => ({
    ...b,
    amount: fs.reduce(
      (n, f) =>
        n +
        f.instalments.reduce(
          (a, i) =>
            a +
            (i.daysOverdue >= b.min && i.daysOverdue <= b.max ? i.balance : 0),
          0,
        ),
      0,
    ),
  }));
  const displayed = [...fs]
    .sort(
      (a, b) =>
        b.overdue - a.overdue || a.student.name.localeCompare(b.student.name),
    )
    .slice(page * 10, page * 10 + 10);
  const exportQuery = new URLSearchParams({
    ...(centre && { centre }),
    ...(batch && { batch }),
  });
  return (
    <div className="flex flex-col gap-7">
      <div className="page-heading">
        <div>
          <h1>{listOnly ? "Students & fees" : "The full picture."}</h1>
          <p>
            {listOnly
              ? "Find a student. Follow every rupee."
              : `Dues across ${c.data.actor.centres.length} centres, as of ${dateLabel(c.data.today)}.`}
          </p>
        </div>
        <div className="heading-actions">
          <Button
            variant="outline"
            render={<a href={`/api/export?format=csv&${exportQuery}`} />}
            nativeButton={false}
          >
            <FileText data-icon="inline-start" />
            Export CSV
          </Button>
          <Button
            render={<a href={`/api/export?format=xml&${exportQuery}`} />}
            nativeButton={false}
          >
            Tally XML
            <ArrowUpRight data-icon="inline-end" />
          </Button>
        </div>
      </div>
      <FieldGroup className="filter-fields">
        <Field>
          <FieldLabel htmlFor="centre">Centre</FieldLabel>
          <NativeSelect
            id="centre"
            value={centre}
            onChange={(e) => {
              setCentre(e.target.value);
              setBatch("");
              setPage(0);
            }}
            className="w-full"
          >
            <NativeSelectOption value="">
              All assigned centres
            </NativeSelectOption>
            {c.data.actor.centres.map((n) => (
              <NativeSelectOption key={n}>{n}</NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel htmlFor="batch">Batch</FieldLabel>
          <NativeSelect
            id="batch"
            value={batch}
            onChange={(e) => {
              setBatch(e.target.value);
              setPage(0);
            }}
            className="w-full"
          >
            <NativeSelectOption value="">All batches</NativeSelectOption>
            {batches
              .filter(
                (b) =>
                  c.data.actor.centres.includes(batchCentre(b)) &&
                  (!centre || batchCentre(b) === centre),
              )
              .map((b) => (
                <NativeSelectOption key={b}>{b}</NativeSelectOption>
              ))}
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel htmlFor="search">Find a student</FieldLabel>
          <Input
            id="search"
            placeholder="Name or student ID"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
          />
        </Field>
      </FieldGroup>
      <section className="metrics-row" aria-label="Fee summary">
        <div>
          <span>Outstanding fees</span>
          <strong>{rupees(total)}</strong>
          <small>Includes future instalments</small>
        </div>
        <div>
          <span>Overdue fees</span>
          <strong className="attention">{rupees(overdue)}</strong>
          <small>Unpaid after the due date</small>
        </div>
        <div>
          <span>Net collections this month</span>
          <strong>{rupees(net)}</strong>
          <small>Allocated payments less refunds</small>
        </div>
        <div>
          <span>Refunds awaiting payout</span>
          <strong>{rupees(refunds)}</strong>
          <small>Confirmed withdrawals</small>
        </div>
      </section>
      {!listOnly && (
        <section className="ageing-section">
          <div>
            <h2>Where dues stand</h2>
            <p>Unpaid balance by days overdue</p>
          </div>
          <div className="ageing-bars">
            {ages.map((b) => (
              <div key={b.name}>
                <div>
                  <span>{b.name}</span>
                  <strong>{rupees(b.amount)}</strong>
                </div>
                <div className="age-track">
                  <div
                    style={{
                      width: `${total ? (b.amount / total) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      <section className="section-panel">
        <div className="section-heading">
          <div>
            <h2>{listOnly ? "Student ledgers" : "Dues that need attention"}</h2>
            <p>{filtered.length} students in this view</p>
          </div>
          <Badge variant="outline">{dateLabel(c.data.today)}</Badge>
        </div>
        {!displayed.length ? (
          <Nothing
            title="No matching students"
            description="Try another name, centre, or batch."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Centre / batch</TableHead>
                <TableHead>Outstanding</TableHead>
                <TableHead>Overdue</TableHead>
                <TableHead>Follow-up</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayed.map((f) => (
                <TableRow key={f.student.id}>
                  <TableCell>
                    <button
                      className="student-link"
                      onClick={() => onStudent(f.student.id)}
                    >
                      {f.student.name}
                    </button>
                    <small className="cell-note">{f.student.id}</small>
                  </TableCell>
                  <TableCell>
                    {f.student.centre}
                    <small className="cell-note">{f.student.batch}</small>
                  </TableCell>
                  <TableCell>
                    <strong>{rupees(f.outstanding)}</strong>
                  </TableCell>
                  <TableCell>
                    {f.overdue ? (
                      <>
                        <strong className="attention">
                          {rupees(f.overdue)}
                        </strong>
                        <small className="cell-note">
                          {Math.max(...f.instalments.map((i) => i.daysOverdue))}{" "}
                          days
                        </small>
                      </>
                    ) : (
                      <Badge variant="secondary">Up to date</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <RiskBadge s={f.student} />
                  </TableCell>
                  <TableCell>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label={`Open ${f.student.name}'s ledger`}
                      onClick={() => onStudent(f.student.id)}
                    >
                      <ChevronRight />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <div className="pagination">
          <span>
            {filtered.length ? page * 10 + 1 : 0}–
            {Math.min((page + 1) * 10, filtered.length)} of {filtered.length}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={(page + 1) * 10 >= filtered.length}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </section>
    </div>
  );
}

export function RiskBadge({ s }: { s: Student }) {
  return !s.risk ? (
    <span className="muted">Not assessed</span>
  ) : (
    <Badge
      variant={
        s.risk.dismissed
          ? "outline"
          : s.risk.level === "high"
            ? "destructive"
            : "secondary"
      }
    >
      {s.risk.dismissed
        ? "Dismissed"
        : `${s.risk.level[0]?.toUpperCase()}${s.risk.level.slice(1)} risk`}
    </Badge>
  );
}

export function StudentLedger({
  c,
  student: s,
  onBack,
  onPay,
}: {
  c: Controller;
  student: Student;
  onBack: () => void;
  onPay: (t: PayTarget) => void;
}) {
  const [tab, setTab] = useState("fees"),
    [reverseId, setReverseId] = useState(""),
    [reason, setReason] = useState("");
  const f = financials(s, c.data.today),
    reversed = new Set(
      s.events.flatMap((e) => (e.kind === "reversal" ? [e.originalId] : [])),
    );
  return (
    <div className="flex flex-col gap-6">
      <Button variant="ghost" className="w-fit" onClick={onBack}>
        <ArrowLeft data-icon="inline-start" />
        Back to workspace
      </Button>
      <div className="page-heading">
        <div>
          <h1>{s.name}</h1>
          <p>
            {s.id} · {s.batch} · {s.centre}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <RiskBadge s={s} />
          {f.withdrawn && <Badge variant="outline">Withdrawn</Badge>}
        </div>
      </div>
      <section className="metrics-row">
        <div>
          <span>Agreed course fees</span>
          <strong>{rupees(s.plan.gross - s.plan.discount)}</strong>
          <small>
            {rupees(s.plan.discount)} discount · GST {s.plan.taxBps / 100}%
            included
          </small>
        </div>
        <div>
          <span>Collected</span>
          <strong>{rupees(f.paid)}</strong>
          <small>Net active payment allocations</small>
        </div>
        <div>
          <span>Outstanding</span>
          <strong>{rupees(f.outstanding)}</strong>
          <small>{rupees(f.overdue)} overdue</small>
        </div>
        <div>
          <span>Refund awaiting payout</span>
          <strong>{rupees(f.refundable)}</strong>
          <small>{rupees(f.payouts)} already returned</small>
        </div>
      </section>
      <Tabs value={tab} onValueChange={(v) => setTab(String(v))}>
        <TabsList variant="line" className="ledger-tabs">
          <TabsTrigger value="fees">Fee ledger</TabsTrigger>
          <TabsTrigger value="activity">Payments & corrections</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="tests">Test results</TabsTrigger>
          <TabsTrigger value="refund">Withdrawal & refund</TabsTrigger>
        </TabsList>
        <TabsContent value="fees">
          <section className="section-panel">
            <div className="section-heading">
              <h2>Instalments</h2>
              <span className="muted">
                {dateLabel(s.plan.start)} to {dateLabel(s.plan.end)}
              </span>
            </div>
            <div className="mb-4">
              <FeePlanEditor key={s.id} c={c} s={s} />
            </div>
            <Instalments c={c} s={s} onPay={onPay} />
          </section>
          <Allocate c={c} s={s} />
          <Receipts c={c} s={s} />
        </TabsContent>
        <TabsContent value="activity">
          <section className="section-panel">
            <h2>Financial history</h2>
            <p>
              Posted records stay visible. Corrections create a linked reversal.
            </p>
            {!s.events.length ? (
              <Nothing
                title="No financial activity yet"
                description="Record a demo payment from an instalment to begin."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Activity</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...s.events].reverse().map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>{dateLabel(e.at.slice(0, 10))}</TableCell>
                      <TableCell>
                        {e.kind === "allocation"
                          ? "Payment allocated"
                          : e.kind === "payout"
                            ? "Refund paid"
                            : e.kind === "withdrawal"
                              ? "Withdrawal confirmed"
                              : "Correction recorded"}
                        <small className="cell-note">
                          {e.kind === "reversal"
                            ? e.reason
                            : e.kind === "withdrawal"
                              ? `Earned ${rupees(e.earned)}; cancelled ${rupees(e.unearned)}`
                              : e.id.slice(0, 22)}
                        </small>
                      </TableCell>
                      <TableCell>
                        {"amount" in e ? rupees(e.amount) : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {reversed.has(e.id) ? "Reversed" : "Posted"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {(e.kind === "allocation" || e.kind === "payout") &&
                          !reversed.has(e.id) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setReverseId(e.id);
                                setReason("");
                              }}
                            >
                              Record correction
                            </Button>
                          )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </section>
        </TabsContent>
        <TabsContent value="attendance">
          <Academics s={s} kind="attendance" locale="en" />
        </TabsContent>
        <TabsContent value="tests">
          <Academics s={s} kind="tests" locale="en" />
        </TabsContent>
        <TabsContent value="refund">
          <Refund c={c} s={s} />
        </TabsContent>
      </Tabs>
      <Dialog
        open={Boolean(reverseId)}
        onOpenChange={(v) => {
          if (!v) setReverseId("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record a financial correction</DialogTitle>
            <DialogDescription>
              The original record remains visible. This adds a reversal with
              your reason.
            </DialogDescription>
          </DialogHeader>
          {c.error && <Notice error message={c.error} />}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              c.run(async () => {
                await c.act({
                  action: "reverse",
                  studentId: s.id,
                  eventId: reverseId,
                  reason,
                });
                setReverseId("");
              }, "Correction recorded. The original financial entry remains visible.");
            }}
          >
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="reason">Reason for correction</FieldLabel>
                <Input
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  minLength={3}
                  maxLength={300}
                  required
                />
              </Field>
              <Button variant="destructive" disabled={c.busy} type="submit">
                Record reversal
              </Button>
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function Allocate({ c, s }: { c: Controller; s: Student }) {
  const active = activeEvents(s.events),
    list = c.data.receipts
      .filter((r) => r.studentId === s.id)
      .map((r) => ({
        ...r,
        free:
          r.amount -
          active.reduce(
            (n, e) =>
              n +
              (e.kind === "allocation" && e.receiptId === r.id ? e.amount : 0),
            0,
          ),
      }))
      .filter((r) => r.free > 0);
  const dues = financials(s, c.data.today).instalments.filter(
    (i) => i.balance > 0,
  );
  const [receiptId, setReceiptId] = useState(""),
    [instalmentId, setInstalmentId] = useState(""),
    [amount, setAmount] = useState("");
  const receipt = list.find((r) => r.id === receiptId) ?? list[0],
    inst = dues.find((i) => i.id === instalmentId) ?? dues[0];
  if (!receipt) return null;
  return (
    <section className="section-panel">
      <h2>Unallocated money</h2>
      <p>Received money needs an explicit match to an instalment.</p>
      {!inst ? (
        <Notice
          message={`${rupees(receipt.free)} remains unallocated. This student has no outstanding instalment.`}
        />
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            c.run(async () => {
              await c.act({
                action: "allocate",
                studentId: s.id,
                receiptId: receipt.id,
                instalmentId: inst.id,
                amount: amountInput(
                  amount || String(Math.min(receipt.free, inst.balance) / 100),
                ),
                requestId: crypto.randomUUID(),
              });
              setAmount("");
            }, "Payment allocated to the selected instalment.");
          }}
        >
          <FieldGroup className="filter-fields">
            <Field>
              <FieldLabel htmlFor="receipt">Receipt</FieldLabel>
              <NativeSelect
                id="receipt"
                value={receipt.id}
                onChange={(e) => setReceiptId(e.target.value)}
              >
                {list.map((r) => (
                  <NativeSelectOption key={r.id} value={r.id}>
                    {r.reference.slice(0, 24)} · {rupees(r.free)} free
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <Field>
              <FieldLabel htmlFor="instalment">Instalment</FieldLabel>
              <NativeSelect
                id="instalment"
                value={inst.id}
                onChange={(e) => setInstalmentId(e.target.value)}
              >
                {dues.map((i) => (
                  <NativeSelectOption key={i.id} value={i.id}>
                    {dateLabel(i.due)} · {rupees(i.balance)}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <Field>
              <FieldLabel htmlFor="allocate-amount">Allocate (₹)</FieldLabel>
              <Input
                id="allocate-amount"
                inputMode="decimal"
                value={amount}
                placeholder={String(Math.min(receipt.free, inst.balance) / 100)}
                onChange={(e) => setAmount(e.target.value)}
              />
            </Field>
            <Button type="submit" disabled={c.busy}>
              Allocate money
            </Button>
          </FieldGroup>
        </form>
      )}
    </section>
  );
}

export function Refund({ c, s }: { c: Controller; s: Student }) {
  const [on, setOn] = useState(String(c.data.today)),
    [quote, setQuote] = useState<z.infer<typeof quoteSchema> | null>(null),
    [amount, setAmount] = useState("");
  const f = financials(s, c.data.today);
  return (
    <section className="section-panel refund-panel">
      <div>
        <h2>
          {f.withdrawn ? "Withdrawal recorded" : "Calculate a pro-rata refund"}
        </h2>
        <p>
          Use the published calendar-day policy. Preview before confirming a
          withdrawal.
        </p>
      </div>
      {f.withdrawn ? (
        <>
          <dl className="refund-breakdown">
            <div>
              <dt>Withdrawal date</dt>
              <dd>{dateLabel(f.withdrawn.on)}</dd>
            </div>
            <div>
              <dt>Course days used</dt>
              <dd>
                {f.withdrawn.usedDays}/{f.withdrawn.totalDays}
              </dd>
            </div>
            <div>
              <dt>Earned fees</dt>
              <dd>{rupees(f.withdrawn.earned)}</dd>
            </div>
            <div>
              <dt>Unearned fees cancelled</dt>
              <dd>{rupees(f.withdrawn.unearned)}</dd>
            </div>
            <div>
              <dt>Refund awaiting payout</dt>
              <dd>{rupees(f.refundable)}</dd>
            </div>
            <div>
              <dt>Payout deadline</dt>
              <dd>
                {dateLabel(f.withdrawn.due)}
                {f.refundable > 0 && f.withdrawn.due < c.data.today && (
                  <Badge variant="destructive">Overdue</Badge>
                )}
              </dd>
            </div>
          </dl>
          {f.refundable > 0 && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                c.run(async () => {
                  await c.act({
                    action: "payout",
                    studentId: s.id,
                    amount: amountInput(amount || String(f.refundable / 100)),
                    requestId: crypto.randomUUID(),
                  });
                  setAmount("");
                }, "Mock refund payout recorded.");
              }}
            >
              <FieldGroup className="inline-fields">
                <Field>
                  <FieldLabel htmlFor="payout">Mock payout (₹)</FieldLabel>
                  <Input
                    id="payout"
                    inputMode="decimal"
                    value={amount}
                    placeholder={String(f.refundable / 100)}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </Field>
                <Button disabled={c.busy} type="submit">
                  Record refund paid
                </Button>
              </FieldGroup>
            </form>
          )}
        </>
      ) : (
        <>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              c.run(async () =>
                setQuote(
                  quoteSchema.parse(
                    await c.act({
                      action: "refundPreview",
                      studentId: s.id,
                      on: daySchema.parse(on),
                    }),
                  ),
                ),
              );
            }}
          >
            <FieldGroup className="inline-fields">
              <Field>
                <FieldLabel htmlFor="withdrawal-date">
                  Withdrawal date
                </FieldLabel>
                <Input
                  id="withdrawal-date"
                  type="date"
                  max={c.data.today}
                  value={on}
                  onChange={(e) => {
                    setOn(e.target.value);
                    setQuote(null);
                  }}
                  required
                />
              </Field>
              <Button type="submit" variant="outline" disabled={c.busy}>
                Calculate refund
              </Button>
            </FieldGroup>
          </form>
          {quote && (
            <>
              <dl className="refund-breakdown">
                <div>
                  <dt>Course days used</dt>
                  <dd>
                    {quote.usedDays}/{quote.totalDays}
                  </dd>
                </div>
                <div>
                  <dt>Earned fees</dt>
                  <dd>{rupees(quote.earned)}</dd>
                </div>
                <div>
                  <dt>Unearned fees to cancel</dt>
                  <dd>{rupees(quote.unearned)}</dd>
                </div>
                <div>
                  <dt>Refund eligible</dt>
                  <dd>{rupees(quote.refund)}</dd>
                </div>
                <div>
                  <dt>Earned fees still due</dt>
                  <dd>{rupees(quote.earnedDue)}</dd>
                </div>
                <div>
                  <dt>Refund due by</dt>
                  <dd>{dateLabel(quote.due)}</dd>
                </div>
              </dl>
              <Alert>
                <AlertTitle>Confirming ends this course enrollment</AlertTitle>
                <AlertDescription>
                  Unearned fees and pending reminders are cancelled. The refund
                  payout is recorded separately. Financial history remains
                  visible.
                </AlertDescription>
              </Alert>
              <Button
                variant="destructive"
                disabled={c.busy}
                onClick={() =>
                  c.run(async () => {
                    await c.act({
                      action: "withdraw",
                      studentId: s.id,
                      on: quote.on,
                      version: quote.version,
                    });
                    setQuote(null);
                  }, "Withdrawal confirmed and refund deadline recorded.")
                }
              >
                Confirm withdrawal
              </Button>
            </>
          )}
        </>
      )}
      <p className="muted">
        No additional cancellation charge. GST rate and this policy are explicit
        demo assumptions.
      </p>
    </section>
  );
}

export function Operations({
  c,
  onStudent,
}: {
  c: Controller;
  onStudent: (id: string) => void;
}) {
  const [batch, setBatch] = useState(
    batches.find((b) => c.data.actor.centres.includes(batchCentre(b))) ?? "",
  );
  const unmatched = c.data.receipts
    .map((r) => {
      const s = c.data.students.find((s) => s.id === r.studentId);
      return {
        ...r,
        student: s,
        free:
          r.amount -
          (s
            ? activeEvents(s.events).reduce(
                (n, e) =>
                  n +
                  (e.kind === "allocation" && e.receiptId === r.id
                    ? e.amount
                    : 0),
                0,
              )
            : 0),
      };
    })
    .filter((r) => r.free > 0);
  const refunds = c.data.students
    .map((s) => ({ student: s, ...financials(s, c.data.today) }))
    .filter((f) => f.refundable > 0);
  const tasks = c.data.students.filter(
    (s) => s.risk?.level === "high" && !s.risk.dismissed,
  );
  return (
    <div className="flex flex-col gap-6">
      <div className="page-heading">
        <div>
          <h1>Keep things moving.</h1>
          <p>Resolve exceptions, review reminders, and follow up with care.</p>
        </div>
        <Button
          variant="outline"
          disabled={c.busy}
          onClick={() =>
            c.run(async () => {
              await c.act({ action: "runReminders" });
            })
          }
        >
          <Bell data-icon="inline-start" />
          Run due reminders
        </Button>
      </div>
      <Tabs defaultValue="unmatched">
        <TabsList className="operations-tabs">
          <TabsTrigger value="unmatched">
            Unmatched money ({unmatched.length})
          </TabsTrigger>
          <TabsTrigger value="refunds">Refunds ({refunds.length})</TabsTrigger>
          <TabsTrigger value="reminders">Reminders</TabsTrigger>
          <TabsTrigger value="risk">
            Counsellor follow-up ({tasks.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="unmatched">
          <section className="section-panel">
            <h2>Money awaiting allocation</h2>
            <p>
              Received money stays here until staff explicitly match it to an
              instalment.
            </p>
            {!unmatched.length ? (
              <Nothing
                title="All received money is allocated"
                description="New unmatched payments appear here for review."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Received</TableHead>
                    <TableHead>Unallocated</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unmatched.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        {r.student?.name}
                        <small className="cell-note">{r.studentId}</small>
                      </TableCell>
                      <TableCell>{r.reference.slice(0, 24)}</TableCell>
                      <TableCell>{rupees(r.amount)}</TableCell>
                      <TableCell>
                        <strong>{rupees(r.free)}</strong>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onStudent(r.studentId)}
                        >
                          Review & allocate
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </section>
        </TabsContent>
        <TabsContent value="refunds">
          <section className="section-panel">
            <h2>Refunds awaiting payout</h2>
            {!refunds.length ? (
              <Nothing
                title="No pending refunds"
                description="Confirmed withdrawal refunds appear here until the mock payout is recorded."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Refund remaining</TableHead>
                    <TableHead>Deadline</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {refunds.map((f) => (
                    <TableRow key={f.student.id}>
                      <TableCell>
                        {f.student.name}
                        <small className="cell-note">{f.student.id}</small>
                      </TableCell>
                      <TableCell>{rupees(f.refundable)}</TableCell>
                      <TableCell>
                        {f.withdrawn && dateLabel(f.withdrawn.due)}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onStudent(f.student.id)}
                        >
                          Open refund ledger
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </section>
        </TabsContent>
        <TabsContent value="reminders">
          <section className="section-panel">
            <div className="section-heading">
              <div>
                <h2>Reminder history</h2>
                <p>
                  7 days before, on the due date, then 3, 7, and 14 days after.
                </p>
              </div>
              <Badge variant="secondary">
                {c.data.reminders.filter((r) => r.status === "sent").length}{" "}
                sent
              </Badge>
            </div>
            <Alert>
              <AlertTitle>Demo delivery inbox</AlertTitle>
              <AlertDescription>
                Every send checks the current balance and consent. Full payment
                cancels pending reminders.
              </AlertDescription>
            </Alert>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Message</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...c.data.reminders]
                  .sort(
                    (a, b) =>
                      Number(b.status === "sent") -
                        Number(a.status === "sent") ||
                      a.scheduled.localeCompare(b.scheduled),
                  )
                  .slice(0, 30)
                  .map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        {
                          c.data.students.find((s) => s.id === r.studentId)
                            ?.name
                        }
                        <small className="cell-note">{r.studentId}</small>
                      </TableCell>
                      <TableCell>{dateLabel(r.scheduled)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            r.status === "sent" ? "secondary" : "outline"
                          }
                        >
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="message-cell">
                        {r.body ??
                          "Awaiting scheduled balance and consent check"}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
            <small className="muted">
              Showing 30 stages. Retried jobs cannot send the same stage twice.
            </small>
          </section>
        </TabsContent>
        <TabsContent value="risk">
          <section className="section-panel">
            <div className="section-heading">
              <div>
                <h2>Human follow-up, informed by trends</h2>
                <p>AI flags create call tasks. Staff decide what to do next.</p>
              </div>
              <Badge variant="outline">Free model · On demand</Badge>
            </div>
            <FieldGroup className="inline-fields">
              <Field>
                <FieldLabel htmlFor="risk-batch">Batch to review</FieldLabel>
                <NativeSelect
                  id="risk-batch"
                  value={batch}
                  onChange={(e) => setBatch(e.target.value)}
                >
                  {batches
                    .filter((b) =>
                      c.data.actor.centres.includes(batchCentre(b)),
                    )
                    .map((b) => (
                      <NativeSelectOption key={b}>{b}</NativeSelectOption>
                    ))}
                </NativeSelect>
              </Field>
              <Button
                disabled={c.busy}
                onClick={() =>
                  c.run(async () => {
                    await c.act({ action: "assess", batch });
                  })
                }
              >
                {c.busy && (
                  <LoaderCircle
                    data-icon="inline-start"
                    className="animate-spin"
                  />
                )}
                Assess batch
              </Button>
            </FieldGroup>
            {!c.data.aiConfigured && (
              <Notice message="Live AI assessments are not configured yet. Students remain not assessed until a real response is validated." />
            )}
            <p className="muted">
              Requires two attendance periods and three tests. Up to ten
              students per request. Unchanged evidence reuses its prior
              assessment.
            </p>
            {!tasks.length ? (
              <Nothing
                title="No open counsellor call tasks"
                description="A validated high-risk assessment creates a task here. Missing evidence and provider failures never become low-risk results."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Signals</TableHead>
                    <TableHead>Review</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <button
                          className="student-link"
                          onClick={() => onStudent(s.id)}
                        >
                          {s.name}
                        </button>
                        <small className="cell-note">{s.batch}</small>
                      </TableCell>
                      <TableCell>{s.risk?.reasons.join("; ")}</TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={c.busy}
                          onClick={() =>
                            c.run(async () => {
                              if (s.risk)
                                await c.act({
                                  action: "dismiss",
                                  studentId: s.id,
                                  hash: s.risk.hash,
                                });
                            }, "False flag dismissed. Unchanged evidence will not reopen it.")
                          }
                        >
                          Mark false flag
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Assessment</TableHead>
                  <TableHead>Last assessed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {c.data.students
                  .filter((s) => s.batch === batch)
                  .map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>{s.name}</TableCell>
                      <TableCell>
                        <RiskBadge s={s} />
                      </TableCell>
                      <TableCell>
                        {s.risk
                          ? dateLabel(s.risk.at.slice(0, 10))
                          : "Not assessed"}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </section>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export function BatchUploads({ c }: { c: Controller }) {
  const [batch, setBatch] = useState(
      batches.find((b) => c.data.actor.centres.includes(batchCentre(b))) ?? "",
    ),
    [kind, setKind] = useState<"attendance" | "tests">("attendance"),
    [csv, setCsv] = useState(""),
    [fileName, setFileName] = useState(""),
    [preview, setPreview] = useState<z.infer<typeof previewSchema> | null>(
      null,
    );
  const template = () => {
    const student = c.data.students.find((s) => s.batch === batch);
    const text =
      kind === "attendance"
        ? `student_id,date,status\n${student?.id ?? "STU-0000"},${c.data.today},present\n`
        : `student_id,test_name,date,marks,maximum_marks\n${student?.id ?? "STU-0000"},New practice test,${c.data.today},72,100\n`;
    const url = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `setu-${kind}-template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="flex flex-col gap-6">
      <div className="page-heading">
        <div>
          <h1>Batch updates, together.</h1>
          <p>Publish attendance and test results with one checked upload.</p>
        </div>
        <Button variant="outline" onClick={template}>
          <FileText data-icon="inline-start" />
          Download CSV template
        </Button>
      </div>
      <section className="section-panel">
        <h2>Upload a batch CSV</h2>
        <p>
          Preview every row before confirming. A file with errors changes no
          records.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            c.run(async () => {
              setPreview(
                previewSchema.parse(
                  await c.act({ action: "previewImport", batch, kind, csv }),
                ),
              );
            });
          }}
        >
          <FieldGroup>
            <FieldGroup className="filter-fields">
              <Field>
                <FieldLabel htmlFor="upload-batch">Batch</FieldLabel>
                <NativeSelect
                  id="upload-batch"
                  value={batch}
                  onChange={(e) => {
                    setBatch(e.target.value);
                    setPreview(null);
                  }}
                >
                  {batches
                    .filter((b) =>
                      c.data.actor.centres.includes(batchCentre(b)),
                    )
                    .map((b) => (
                      <NativeSelectOption key={b}>{b}</NativeSelectOption>
                    ))}
                </NativeSelect>
              </Field>
              <Field>
                <FieldLabel htmlFor="upload-kind">Records</FieldLabel>
                <NativeSelect
                  id="upload-kind"
                  value={kind}
                  onChange={(e) => {
                    setKind(
                      e.target.value === "tests" ? "tests" : "attendance",
                    );
                    setPreview(null);
                  }}
                >
                  <NativeSelectOption value="attendance">
                    Attendance
                  </NativeSelectOption>
                  <NativeSelectOption value="tests">
                    Test results
                  </NativeSelectOption>
                </NativeSelect>
              </Field>
            </FieldGroup>
            <Field>
              <FieldLabel htmlFor="csv-file">CSV file</FieldLabel>
              <Input
                id="csv-file"
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  c.run(async () => {
                    if (!file) return;
                    if (file.size > 200000)
                      throw new Error("Use a CSV smaller than 200 KB.");
                    setCsv(await file.text());
                    setFileName(file.name);
                    setPreview(null);
                  });
                }}
              />
              <FieldDescription>
                Up to 500 rows and 200 KB. Use student IDs from the selected
                batch.
              </FieldDescription>
            </Field>
            <Button disabled={c.busy || !csv} type="submit" className="w-fit">
              <Upload data-icon="inline-start" />
              Validate & preview
            </Button>
          </FieldGroup>
        </form>
      </section>
      {preview && (
        <section className="section-panel">
          <div className="section-heading">
            <div>
              <h2>Import preview</h2>
              <p>
                {fileName} · {preview.count} rows · {batch}
              </p>
            </div>
            <Badge
              variant={preview.errors.length ? "destructive" : "secondary"}
            >
              {preview.errors.length
                ? `${preview.errors.length} errors`
                : "Ready to import"}
            </Badge>
          </div>
          {preview.errors.length > 0 && (
            <Alert variant="destructive">
              <AlertTitle>Fix the CSV and upload it again</AlertTitle>
              <AlertDescription>
                <ul>
                  {preview.errors.slice(0, 20).map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
                {preview.errors.length > 20 && (
                  <p>{preview.errors.length - 20} more errors.</p>
                )}
              </AlertDescription>
            </Alert>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                {Object.keys(preview.rows[0] ?? {}).map((k) => (
                  <TableHead key={k}>{k}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {preview.rows.map((r, n) => (
                <TableRow key={n}>
                  {Object.entries(r).map(([key, value]) => (
                    <TableCell key={key}>
                      {typeof value === "boolean"
                        ? value
                          ? "Present"
                          : "Absent"
                        : String(value)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="muted">
            Preview shows up to ten rows. All rows are validated again at
            confirmation.
          </p>
          <Button
            disabled={c.busy || !preview.previewId || preview.errors.length > 0}
            onClick={() =>
              c.run(async () => {
                if (preview.previewId)
                  await c.act({
                    action: "confirmImport",
                    previewId: preview.previewId,
                  });
                setPreview(null);
                setCsv("");
              }, "The complete CSV was imported successfully.")
            }
          >
            Confirm complete import
          </Button>
        </section>
      )}
      <section className="section-panel">
        <h2>Students in this batch</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Attendance records</TableHead>
              <TableHead>Test results</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {c.data.students
              .filter((s) => s.batch === batch)
              .map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{s.id}</TableCell>
                  <TableCell>{s.name}</TableCell>
                  <TableCell>{s.attendance.length}</TableCell>
                  <TableCell>{s.tests.length}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}

export const quoteSchema = z.object({
  on: daySchema,
  usedDays: z.number(),
  totalDays: z.number(),
  earned: z.number(),
  unearned: z.number(),
  refund: z.number(),
  earnedDue: z.number(),
  due: daySchema,
  version: z.string(),
});

export const previewSchema = z.object({
  previewId: z.string().nullable(),
  count: z.number(),
  rows: z.array(z.record(z.string(), z.unknown())),
  errors: z.array(z.string()),
});
