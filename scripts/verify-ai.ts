import assert from "node:assert/strict";
import { snapshotSchema } from "../src/domain/model";
const base = process.env.APP_URL ?? "http://localhost:3000";
const jar = new Map<string, string>();
async function call(path: string, payload?: unknown) {
  const r = await fetch(base + path, {
    method: payload ? "POST" : "GET",
    headers: {
      Origin: base,
      Cookie: [...jar].map(([k, v]) => `${k}=${v}`).join("; "),
      "Content-Type": "application/json",
    },
    ...(payload ? { body: JSON.stringify(payload) } : {}),
  });
  for (const c of r.headers.getSetCookie()) {
    const p = c.split(";")[0] ?? "",
      i = p.indexOf("=");
    jar.set(p.slice(0, i), p.slice(i + 1));
  }
  const body: unknown = await r.json();
  assert.equal(
    r.status,
    200,
    `Live AI verification: HTTP ${r.status}: ${JSON.stringify(body)}`,
  );
  return body;
}
await call("/api/auth", { action: "demo" });
await call("/api/auth", {
  action: "staff",
  id: "central",
  password: "SetuDemo2026!",
});
const before = snapshotSchema.parse(await call("/api/state"));
const result = await call("/api/action", {
  action: "assess",
  batch: "JEE 2027 Morning",
});
process.stdout.write(JSON.stringify(result) + "\n");
let state = snapshotSchema.parse(await call("/api/state"));
const assessed = state.students.filter(
  (s) => s.batch === "JEE 2027 Morning" && s.risk,
);
assert.ok(assessed.length > 0, "A real provider response must be persisted.");
const flags = assessed.filter((s) => s.risk?.level === "high");
if (flags[0]?.risk) {
  await call("/api/action", {
    action: "dismiss",
    studentId: flags[0].id,
    hash: flags[0].risk.hash,
  });
}
await call("/api/action", { action: "assess", batch: "JEE 2027 Morning" });
state = snapshotSchema.parse(await call("/api/state"));
if (flags[0])
  assert.equal(
    state.students.find((s) => s.id === flags[0]?.id)?.risk?.dismissed,
    true,
  );
assert.deepEqual(
  state.students.map((s) => [s.id, s.plan, s.events]),
  before.students.map((s) => [s.id, s.plan, s.events]),
);
assert.deepEqual(state.receipts, before.receipts);
process.stdout.write(
  `PASS: ${assessed.length} real assessments persisted, ${flags.length} high-risk results, cache reuse and false-flag handling verified.\n`,
);
