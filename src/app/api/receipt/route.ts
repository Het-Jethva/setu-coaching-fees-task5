import { actor } from "@/server/access";
import { getReceipts, studentsFor } from "@/server/store";
import { demand } from "@/server/db";
import { escapeMarkup } from "@/server/reporting";
import { activeEvents, dateLabel, rupees, taxSplit } from "@/domain/money";
import { failure } from "@/server/http";
export async function GET(req: Request) {
  try {
    const a = await actor(),
      id = new URL(req.url).searchParams.get("id");
    const r = (await getReceipts(a)).find((r) => r.id === id);
    demand(r, "Receipt is outside your access.", 403);
    const s = (await studentsFor(a)).find((s) => s.id === r.studentId);
    demand(s, "Student is outside your access.", 403);
    const t = taxSplit(r.amount, s.plan.taxBps),
      allocated = activeEvents(s.events).reduce(
        (n, e) =>
          n + (e.kind === "allocation" && e.receiptId === r.id ? e.amount : 0),
        0,
      );
    const text = (s: string) => escapeMarkup(s);
    return new Response(
      `<!doctype html><html lang="${a.locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Setu fee receipt</title><style>body{font:16px system-ui;color:#1c292c;max-width:640px;margin:64px auto;padding:24px;line-height:1.6}h1{color:#115e59}table{width:100%;border-collapse:collapse}td{padding:12px 0;border-bottom:1px solid #dce5e2}td:last-child{text-align:right}small{color:#526663}</style></head><body><h1>Setu</h1><h2>${a.locale === "hi" ? "फीस रसीद" : "Fee receipt"}</h2><p>${text(s.name)} · ${text(s.id)}<br>${text(s.batch)} · ${text(s.centre)}<br>${text(dateLabel(r.at.slice(0, 10), a.locale))}</p><small>Receipt ${text(r.id)}<br>Reference ${text(r.reference)}</small><table><tr><td>Taxable value / कर योग्य राशि</td><td>${text(rupees(t.taxable))}</td></tr><tr><td>GST included (${s.plan.taxBps / 100}%) / जीएसटी</td><td>${text(rupees(t.gst))}</td></tr><tr><td><strong>Total received / कुल प्राप्त</strong></td><td><strong>${text(rupees(r.amount))}</strong></td></tr><tr><td>Currently allocated / आवंटित</td><td>${text(rupees(allocated))}</td></tr><tr><td>Unallocated / अनावंटित</td><td>${text(rupees(r.amount - allocated))}</td></tr></table><p><small>Synthetic demo receipt. GST rate is an assignment assumption. This is not a tax invoice or a real payment. Financial corrections remain visible in the ledger. Use your browser's Print command to save a PDF.</small></p></body></html>`,
      {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
          "Content-Security-Policy":
            "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'",
        },
      },
    );
  } catch (e) {
    return failure(e);
  }
}
