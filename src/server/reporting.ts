import { activeEvents, taxSplit } from "@/domain/money";
import type { Actor } from "@/domain/model";
import { getReceipts, requireAccounts, studentsFor } from "./store";
export const escapeMarkup = (v: string) =>
  v.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[c] ?? c,
  );
const csvCell = (v: string | number) =>
  `"${String(v)
    .replace(/^[=+@\-]/, "'$&")
    .replace(/"/g, '""')}"`;
export async function exportLedger(
  a: Actor,
  format: "xml" | "csv",
  centre: string | null,
  batch: string | null,
) {
  requireAccounts(a);
  const students = (await studentsFor(a)).filter(
    (s) => (!centre || s.centre === centre) && (!batch || s.batch === batch),
  );
  const ids = new Set(students.map((s) => s.id));
  const receipts = (await getReceipts(a)).filter((r) => ids.has(r.studentId));
  const rows = receipts.map((r) => {
    const s = students.find((s) => s.id === r.studentId);
    const tax = taxSplit(r.amount, s?.plan.taxBps);
    const allocated = s
      ? activeEvents(s.events).reduce(
          (n, e) =>
            n +
            (e.kind === "allocation" && e.receiptId === r.id ? e.amount : 0),
          0,
        )
      : 0;
    return {
      id: r.id,
      date: r.at.slice(0, 10),
      studentId: r.studentId,
      student: s?.name ?? "",
      centre: s?.centre ?? "",
      batch: s?.batch ?? "",
      amount: Number(r.amount),
      allocated,
      gst: tax.gst,
      kind: "Receipt",
    };
  });
  for (const s of students)
    for (const e of activeEvents(s.events))
      if (e.kind === "payout")
        rows.push({
          id: e.id,
          date: e.at.slice(0, 10),
          studentId: s.id,
          student: s.name,
          centre: s.centre,
          batch: s.batch,
          amount: -e.amount,
          allocated: -e.amount,
          gst: -taxSplit(e.amount, s.plan.taxBps).gst,
          kind: "Payment",
        });
  if (format === "csv")
    return [
      "voucher_id,date,student_id,student,centre,batch,received_inr,allocated_inr,gst_included_inr,kind",
      ...rows.map((r) =>
        [
          r.id,
          r.date,
          r.studentId,
          r.student,
          r.centre,
          r.batch,
          (r.amount / 100).toFixed(2),
          (r.allocated / 100).toFixed(2),
          (r.gst / 100).toFixed(2),
          r.kind,
        ]
          .map(csvCell)
          .join(","),
      ),
    ].join("\r\n");
  const bank = escapeMarkup(process.env.TALLY_BANK_LEDGER ?? "Bank"),
    fees = escapeMarkup(
      process.env.TALLY_FEES_LEDGER ?? "Student Fees Receivable",
    );
  return `<?xml version="1.0" encoding="UTF-8"?><ENVELOPE><HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER><BODY><IMPORTDATA><REQUESTDESC><REPORTNAME>Vouchers</REPORTNAME></REQUESTDESC><REQUESTDATA>${rows.map((r) => `<TALLYMESSAGE xmlns:UDF="TallyUDF"><VOUCHER VCHTYPE="${r.kind}" ACTION="Create"><DATE>${r.date.replaceAll("-", "")}</DATE><GUID>${escapeMarkup(a.workspace + ":" + r.id)}</GUID><VOUCHERNUMBER>${escapeMarkup("DEMO-" + r.id)}</VOUCHERNUMBER><VOUCHERTYPENAME>${r.kind}</VOUCHERTYPENAME><NARRATION>${escapeMarkup(`Synthetic demo: ${r.studentId}; GST included ${(r.gst / 100).toFixed(2)}; allocated ${(r.allocated / 100).toFixed(2)}`)}</NARRATION><ALLLEDGERENTRIES.LIST><LEDGERNAME>${bank}</LEDGERNAME><ISDEEMEDPOSITIVE>${r.amount >= 0 ? "Yes" : "No"}</ISDEEMEDPOSITIVE><AMOUNT>${(-r.amount / 100).toFixed(2)}</AMOUNT></ALLLEDGERENTRIES.LIST><ALLLEDGERENTRIES.LIST><LEDGERNAME>${fees}</LEDGERNAME><ISDEEMEDPOSITIVE>${r.amount >= 0 ? "No" : "Yes"}</ISDEEMEDPOSITIVE><AMOUNT>${(r.amount / 100).toFixed(2)}</AMOUNT></ALLLEDGERENTRIES.LIST></VOUCHER></TALLYMESSAGE>`).join("")}</REQUESTDATA></IMPORTDATA></BODY></ENVELOPE>`;
}
