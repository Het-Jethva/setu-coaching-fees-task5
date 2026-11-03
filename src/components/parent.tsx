"use client";

import { useState } from "react";
import { z } from "zod";
import { ArrowUpRight, CheckCircle2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { type Student, type Locale } from "@/domain/model";
import { dateLabel, financials, rupees, taxSplit } from "@/domain/money";
import { copy } from "@/lib/i18n";
import type { Controller, PayTarget } from "@/components/types";
import { Nothing, Notice } from "@/components/shared";
import { amountInput } from "@/lib/client";

export function Consent({ c }: { c: Controller }) {
  const [agreed, setAgreed] = useState(false),
    t = copy[c.data.actor.locale];
  return (
    <section className="consent-panel">
      <ShieldCheck className="feature-icon" />
      <h1>{t.consentTitle}</h1>
      <p>{t.consentBody}</p>
      <FieldGroup>
        <Field orientation="horizontal">
          <Checkbox
            id="consent"
            checked={agreed}
            onCheckedChange={(v) => setAgreed(v === true)}
          />
          <FieldLabel htmlFor="consent">{t.consentAgree}</FieldLabel>
        </Field>
        <Button
          size="lg"
          disabled={!agreed || c.busy}
          onClick={() =>
            c.run(async () => {
              await c.act({ action: "consent", granted: true });
            })
          }
        >
          {t.consentAction}
        </Button>
      </FieldGroup>
    </section>
  );
}

export function ParentPortal({
  c,
  onPay,
  onPolicy,
}: {
  c: Controller;
  onPay: (t: PayTarget) => void;
  onPolicy: () => void;
}) {
  const [id, setId] = useState("STU-0587"),
    locale = c.data.actor.locale,
    t = copy[locale];
  const s = c.data.students.find((s) => s.id === id) ?? c.data.students[0];
  if (!s)
    return (
      <Nothing
        title="No linked students"
        description="This account has no linked students. Use another demo parent ID."
      />
    );
  const f = financials(s, c.data.today),
    next = f.instalments.find((i) => i.balance > 0),
    now = f.instalments
      .filter((i) => i.due <= c.data.today)
      .reduce((a, i) => a + i.balance, 0);
  return (
    <div className="parent-content">
      <div className="parent-intro">
        <div>
          <h1>{t.hello}</h1>
          <p>{t.portal}</p>
        </div>
        {c.data.students.length > 1 && (
          <NativeSelect
            aria-label={t.chooseChild}
            value={s.id}
            onChange={(e) => setId(e.target.value)}
          >
            {c.data.students.map((s) => (
              <NativeSelectOption key={s.id} value={s.id}>
                {s.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        )}
      </div>
      <section className="parent-statement">
        <div className="student-heading">
          <div className="student-avatar">
            {s.name
              .split(" ")
              .map((n) => n[0])
              .slice(0, 2)
              .join("")}
          </div>
          <div>
            <h2>{s.name}</h2>
            <p>
              {s.batch} <span>·</span> {s.centre}
            </p>
          </div>
          <Badge variant="outline">{s.id}</Badge>
        </div>
        <Separator />
        <div className="payment-focus">
          <div>
            <p>
              {f.withdrawn
                ? t.refundRemaining
                : now > 0
                  ? t.dueNow
                  : next
                    ? t.future
                    : t.allClear}
            </p>
            <div className="parent-amount">
              {rupees(
                f.withdrawn ? f.refundable : now || next?.balance || 0,
                locale,
              )}
            </div>
            {next && !f.withdrawn && (
              <div className="due-line">
                <span>
                  {t.due} {dateLabel(next.due, locale)}
                </span>
                {next.daysOverdue > 0 && (
                  <Badge variant="destructive">
                    {next.daysOverdue} {t.daysOverdue}
                  </Badge>
                )}
              </div>
            )}
            {f.withdrawn && (
              <Badge variant="outline">
                {t.withdrawn} {dateLabel(f.withdrawn.on, locale)}
              </Badge>
            )}
          </div>
          {next && !f.withdrawn ? (
            <Button
              size="lg"
              onClick={() => onPay({ studentId: s.id, instalmentId: next.id })}
            >
              {t.pay} {rupees(next.balance, locale)}
              <ArrowUpRight data-icon="inline-end" />
            </Button>
          ) : (
            <CheckCircle2 className="paid-check" aria-label={t.paid} />
          )}
        </div>
        <p className="statement-note">
          <ShieldCheck />
          {t.safe}
        </p>
      </section>
      <Tabs defaultValue="fees">
        <TabsList variant="line" className="portal-tabs">
          <TabsTrigger value="fees">{t.fees}</TabsTrigger>
          <TabsTrigger value="attendance">{t.attendance}</TabsTrigger>
          <TabsTrigger value="results">{t.results}</TabsTrigger>
          <TabsTrigger value="receipts">{t.receipts}</TabsTrigger>
        </TabsList>
        <TabsContent value="fees">
          <section className="section-panel">
            <div className="section-heading">
              <h2>{t.fees}</h2>
              <button className="text-link" onClick={onPolicy}>
                {t.policy}
              </button>
            </div>
            <div className="plan-summary">
              <div>
                <span>{t.courseFee}</span>
                <strong>{rupees(s.plan.gross, locale)}</strong>
              </div>
              <div>
                <span>{t.discount}</span>
                <strong>{rupees(s.plan.discount, locale)}</strong>
              </div>
              <div>
                <span>{t.paidToDate}</span>
                <strong>{rupees(f.paid, locale)}</strong>
              </div>
              <div>
                <span>{t.remaining}</span>
                <strong>{rupees(f.outstanding, locale)}</strong>
              </div>
            </div>
            <Instalments c={c} s={s} onPay={onPay} />
          </section>
        </TabsContent>
        <TabsContent value="attendance">
          <Academics s={s} locale={locale} kind="attendance" />
        </TabsContent>
        <TabsContent value="results">
          <Academics s={s} locale={locale} kind="tests" />
        </TabsContent>
        <TabsContent value="receipts">
          <Receipts c={c} s={s} />
        </TabsContent>
      </Tabs>
      <Button
        variant="ghost"
        disabled={c.busy}
        onClick={() =>
          c.run(async () => {
            await c.act({ action: "consent", granted: false });
          })
        }
      >
        {t.changeConsent}
      </Button>
    </div>
  );
}

export function Instalments({
  c,
  s,
  onPay,
}: {
  c: Controller;
  s: Student;
  onPay: (t: PayTarget) => void;
}) {
  const t = copy[c.data.actor.locale];
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t.instalment}</TableHead>
          <TableHead>{t.due}</TableHead>
          <TableHead>{t.paid}</TableHead>
          <TableHead>{t.balance}</TableHead>
          <TableHead>{t.status}</TableHead>
          <TableHead>
            <span className="sr-only">{t.pay}</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {financials(s, c.data.today).instalments.map((i, n) => (
          <TableRow key={i.id}>
            <TableCell>
              {t.instalment} {n + 1}
              <small className="cell-note">{rupees(i.charge)}</small>
            </TableCell>
            <TableCell>{dateLabel(i.due, c.data.actor.locale)}</TableCell>
            <TableCell>{rupees(i.paid)}</TableCell>
            <TableCell>
              <strong>{rupees(i.balance)}</strong>
            </TableCell>
            <TableCell>
              <Badge
                variant={
                  i.balance === 0
                    ? "secondary"
                    : i.daysOverdue
                      ? "destructive"
                      : "outline"
                }
              >
                {i.balance === 0
                  ? t.paid
                  : i.daysOverdue
                    ? t.overdue
                    : i.paid
                      ? t.partial
                      : t.upcoming}
              </Badge>
            </TableCell>
            <TableCell>
              {i.balance > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPay({ studentId: s.id, instalmentId: i.id })}
                >
                  {t.pay}
                  <ArrowUpRight data-icon="inline-end" />
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function Receipts({ c, s }: { c: Controller; s: Student }) {
  const t = copy[c.data.actor.locale],
    receipts = c.data.receipts.filter((r) => r.studentId === s.id);
  return (
    <section className="section-panel">
      <h2>{t.receipts}</h2>
      {!receipts.length ? (
        <Nothing title={t.noReceipts} description={t.receiptHelp} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.date}</TableHead>
              <TableHead>{t.paid}</TableHead>
              <TableHead>GST</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {receipts.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  {dateLabel(r.at.slice(0, 10), c.data.actor.locale)}
                  <small className="cell-note">
                    {r.reference.slice(0, 22)}
                  </small>
                </TableCell>
                <TableCell>{rupees(r.amount)}</TableCell>
                <TableCell>
                  {rupees(taxSplit(r.amount, s.plan.taxBps).gst)}
                </TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    render={
                      <a
                        href={`/api/receipt?id=${encodeURIComponent(r.id)}`}
                        target="_blank"
                        rel="noreferrer"
                      />
                    }
                    nativeButton={false}
                  >
                    {t.viewReceipt}
                    <ArrowUpRight data-icon="inline-end" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  );
}

export function Academics({
  s,
  locale,
  kind,
}: {
  s: Student;
  locale: Locale;
  kind: "attendance" | "tests";
}) {
  const t = copy[locale],
    present = s.attendance.filter((a) => a.present).length;
  return (
    <section className="section-panel">
      <div className="section-heading">
        <h2>{kind === "attendance" ? t.attendance : t.results}</h2>
        {kind === "attendance" && s.attendance.length > 0 && (
          <Badge variant="secondary">
            {Math.round((present / s.attendance.length) * 100)}% · {present}/
            {s.attendance.length}
          </Badge>
        )}
      </div>
      {kind === "attendance" ? (
        !s.attendance.length ? (
          <Nothing title={t.attendance} description={t.noAttendance} />
        ) : (
          <div className="attendance-grid">
            {s.attendance.slice(-28).map((a) => (
              <div key={a.date} data-present={a.present}>
                <span>{dateLabel(a.date, locale)}</span>
                <strong>{a.present ? t.present : t.absent}</strong>
              </div>
            ))}
          </div>
        )
      ) : !s.tests.length ? (
        <Nothing title={t.noResults} description={t.resultsHelp} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.results}</TableHead>
              <TableHead>{t.date}</TableHead>
              <TableHead>{t.marks}</TableHead>
              <TableHead>%</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {s.tests.map((r) => (
              <TableRow key={r.name + r.date}>
                <TableCell>{r.name}</TableCell>
                <TableCell>{dateLabel(r.date, locale)}</TableCell>
                <TableCell>
                  {r.marks}/{r.maximum}
                </TableCell>
                <TableCell>
                  <strong>{Math.round((r.marks / r.maximum) * 100)}%</strong>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  );
}

export function Checkout({
  c,
  target,
  onClose,
}: {
  c: Controller;
  target: PayTarget;
  onClose: () => void;
}) {
  const s = c.data.students.find((s) => s.id === target.studentId),
    t = copy[c.data.actor.locale];
  const i =
    s &&
    financials(s, c.data.today).instalments.find(
      (i) => i.id === target.instalmentId,
    );
  const [amount, setAmount] = useState(String((i?.balance ?? 0) / 100)),
    [checkout, setCheckout] = useState<string | null>(null),
    [outcome, setOutcome] = useState("");
  const [receiptId, setReceiptId] = useState("");
  if (!s || !i) return null;
  const finish = (status: "success" | "failure" | "pending") =>
    c.run(async () => {
      if (!checkout) return;
      const result = z
        .object({ status: z.string(), receiptId: z.string().optional() })
        .parse(
          await c.act({
            action: "completeCheckout",
            checkoutId: checkout,
            outcome: status,
          }),
        );
      setOutcome(result.status);
      setReceiptId(result.receiptId ?? "");
    });
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {outcome === "success" ? t.recorded : t.pay}
          </DialogTitle>
          <DialogDescription>
            {s.name} · {target.instalmentId.split("-").at(-1)}
          </DialogDescription>
        </DialogHeader>
        {c.error && <Notice error message={c.error} />}
        {outcome === "success" ? (
          <div className="payment-complete">
            <CheckCircle2 />
            <h3>{t.recorded}</h3>
            <p>{t.safe}</p>
            <Button
              render={
                <a
                  href={`/api/receipt?id=${encodeURIComponent(receiptId)}`}
                  target="_blank"
                  rel="noreferrer"
                />
              }
              nativeButton={false}
            >
              {t.viewReceipt}
            </Button>
            <Button variant="outline" onClick={onClose}>
              Close / बंद करें
            </Button>
          </div>
        ) : (
          <>
            <Alert>
              <AlertTitle>{t.mock}</AlertTitle>
              <AlertDescription>
                {dateLabel(i.due, c.data.actor.locale)} · {t.balance}{" "}
                {rupees(i.balance)}
              </AlertDescription>
            </Alert>
            {!checkout ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  c.run(async () => {
                    const result = z.object({ checkoutId: z.string() }).parse(
                      await c.act({
                        action: "checkout",
                        studentId: s.id,
                        instalmentId: i.id,
                        amount: amountInput(amount),
                      }),
                    );
                    setCheckout(result.checkoutId);
                  });
                }}
              >
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="pay-amount">{t.amount}</FieldLabel>
                    <Input
                      id="pay-amount"
                      inputMode="decimal"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                    />
                  </Field>
                  <Button type="submit" disabled={c.busy}>
                    {t.continue}
                  </Button>
                  <Button
                    variant="link"
                    render={
                      <a
                        href={`/pay?student=${encodeURIComponent(s.id)}&instalment=${encodeURIComponent(i.id)}`}
                      />
                    }
                    nativeButton={false}
                  >
                    Open payment link / भुगतान लिंक
                  </Button>
                </FieldGroup>
              </form>
            ) : (
              <div className="flex flex-col gap-3">
                <strong>{rupees(amountInput(amount))}</strong>
                {outcome === "failure" ? (
                  <>
                    <Notice
                      error
                      message="Demo payment failed. No fees were marked paid."
                    />
                    <Button
                      onClick={() => {
                        setCheckout(null);
                        setOutcome("");
                      }}
                    >
                      Try a new payment
                    </Button>
                  </>
                ) : (
                  <>
                    {outcome === "pending" && (
                      <Notice message="Payment is pending. The balance is unchanged until success is confirmed." />
                    )}
                    <Button disabled={c.busy} onClick={() => finish("success")}>
                      {t.success}
                    </Button>
                    <Button
                      variant="outline"
                      disabled={c.busy}
                      onClick={() => finish("failure")}
                    >
                      {t.failure}
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={c.busy}
                      onClick={() => finish("pending")}
                    >
                      {t.pending}
                    </Button>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function Policy({ locale }: { locale: Locale }) {
  return (
    <div className="policy-copy">
      {locale === "hi" ? (
        <>
          <p>
            फीस में डेमो जीएसटी दर 18% शामिल है। निश्चित छूट के बाद कुल फीस 3 या
            4 किस्तों में बाँटी जाती है।
          </p>
          <p>
            उपयोग की गई फीस = छूट के बाद कुल फीस × उपयोग किए दिन ÷ पाठ्यक्रम के
            कुल दिन। छोड़ने का दिन उपयोग किया दिन है।
          </p>
          <p>
            प्राप्त भुगतान में से उपयोग की गई फीस घटाकर ही वापसी बनती है। बची
            हुई वापसी से अधिक भुगतान नहीं होगा। अनुपयोगी फीस रद्द होती है; उपयोग
            की गई बकाया फीस देय रहती है।
          </p>
          <p>
            छोड़ने की तिथि से 10 कैलेंडर दिनों के भीतर वापसी देय है। कोई
            अतिरिक्त रद्दीकरण शुल्क नहीं है। डेमो भुगतान अलग से दर्ज होता है।
          </p>
          <p>
            ₹1.2 लाख के 100-दिन पाठ्यक्रम में 25 दिन उपयोग और ₹60,000 प्राप्त
            होने पर वापसी ₹30,000 है।
          </p>
        </>
      ) : (
        <>
          <p>
            Fees include GST at the configurable demo rate of 18%. Apply the
            fixed discount before splitting the total into three or four
            instalments.
          </p>
          <p>
            <strong>
              Earned fees = discounted course total × used calendar days ÷ total
              course days.
            </strong>{" "}
            The withdrawal day counts as used. Before course start, earned fees
            are zero; after course end, the full fee is earned.
          </p>
          <p>
            Refund collected money above earned fees, after earlier payouts.
            Cancel unearned fees. Unpaid earned fees remain due. No additional
            cancellation charge applies.
          </p>
          <p>
            A refund is due within ten calendar days of withdrawal. Staff
            confirm the calculation and record the mock payout separately.
          </p>
          <p>
            Example: a ₹1.2 lakh, 100-day course with 25 days used earns
            ₹30,000. If ₹60,000 was collected, ₹30,000 is refundable.
          </p>
        </>
      )}
      <Separator />
      <small>
        This is a published demo policy based on explicitly agreed assignment
        assumptions. Production tax treatment, refund rules, identity
        verification, and legal compliance require the client's approval.
      </small>
    </div>
  );
}
