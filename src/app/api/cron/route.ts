import { centres, actorSchema } from "@/domain/model";
import { db, demand } from "@/server/db";
import { runReminders } from "@/server/enrollment";
import { failure, json } from "@/server/http";
export const maxDuration = 60;
export async function GET(req: Request) {
  try {
    demand(
      process.env.CRON_SECRET &&
        req.headers.get("authorization") ===
          `Bearer ${process.env.CRON_SECRET}`,
      "Scheduler authorization is required.",
      401,
    );
    const workspaces =
      await db()`SELECT id FROM workspaces WHERE expires_at>now() ORDER BY created_at LIMIT 100`;
    let sent = 0;
    for (const w of workspaces)
      sent += (
        await runReminders(
          actorSchema.parse({
            id: "central",
            workspace: w.id,
            role: "accounts",
            name: "Scheduler",
            centres,
            consent: false,
            locale: "en",
          }),
        )
      ).sent;
    await db()`DELETE FROM workspaces WHERE expires_at<now()`;
    return json({ workspaces: workspaces.length, sent });
  } catch (e) {
    return failure(e);
  }
}
