import { actor } from "@/server/access";
import { exportLedger } from "@/server/reporting";
import { failure } from "@/server/http";
export async function GET(req: Request) {
  try {
    const u = new URL(req.url),
      format = u.searchParams.get("format") === "xml" ? "xml" : "csv";
    const content = await exportLedger(
      await actor(),
      format,
      u.searchParams.get("centre"),
      u.searchParams.get("batch"),
    );
    return new Response(content, {
      headers: {
        "Content-Type":
          format === "xml"
            ? "application/xml; charset=utf-8"
            : "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="setu-vouchers.${format}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return failure(e);
  }
}
