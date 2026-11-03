import {
  createHash,
  randomBytes,
  randomInt,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import { cookies } from "next/headers";
import { actorSchema, type Actor } from "@/domain/model";
import { db, demand } from "./db";
import { seedWorkspace, passwordHash } from "./seed";
import { personRow } from "./store";

const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: 172800,
} satisfies Parameters<Awaited<ReturnType<typeof cookies>>["set"]>[2];
export async function workspace() {
  const token = (await cookies()).get("setu_demo")?.value;
  demand(token, "Start your private demo first.", 401);
  const row = (
    await db()`SELECT id FROM workspaces WHERE token_hash=${hash(token)} AND expires_at>now()`
  )[0];
  demand(row, "This demo expired. Start a new demo.", 401);
  return String(row.id);
}
export async function startDemo() {
  try {
    return { workspace: await workspace() };
  } catch {
    /* An expired visitor gets a fresh isolated workspace. */
  }
  const id = randomUUID(),
    token = randomBytes(32).toString("hex");
  await db().begin(async (tx) => {
    await tx`INSERT INTO workspaces(id,token_hash) VALUES(${id},${hash(token)})`;
    await seedWorkspace(tx, id);
  });
  (await cookies()).set("setu_demo", token, cookieOptions);
  return { workspace: id };
}
export async function actor(): Promise<Actor> {
  const token = (await cookies()).get("setu_session")?.value;
  demand(token, "Sign in to continue.", 401);
  const rows =
    await db()`SELECT p.id,p.name,p.role,p.centres,p.consent,p.locale,p.workspace FROM sessions s JOIN people p ON p.workspace=s.workspace AND p.id=s.person_id JOIN workspaces w ON w.id=p.workspace WHERE s.token_hash=${hash(token)} AND s.expires_at>now() AND w.expires_at>now()`;
  demand(rows[0], "Your session expired. Sign in again.", 401);
  return actorSchema.parse(rows[0]);
}
async function issueSession(workspaceId: string, person: string) {
  const token = randomBytes(32).toString("hex");
  await db()`INSERT INTO sessions(token_hash,workspace,person_id,expires_at) VALUES(${hash(token)},${workspaceId},${person},now()+interval '12 hours')`;
  (await cookies()).set("setu_session", token, {
    ...cookieOptions,
    maxAge: 43200,
  });
}
export async function staffLogin(id: string, password: string) {
  const w = await workspace();
  const valid = await db().begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(hashtext(${`login:${w}`}))`;
    const attempts =
      await tx`SELECT count(*)::int AS n FROM auth_attempts WHERE workspace=${w} AND at>now()-interval '15 minutes'`;
    demand(
      Number(attempts[0]?.n) < 30,
      "Too many login attempts. Try again in 15 minutes.",
      429,
    );
    const person = (
      await tx`SELECT password_hash FROM people WHERE workspace=${w} AND id=${id} AND role='accounts'`
    )[0];
    const supplied = passwordHash(password, w + id);
    await tx`INSERT INTO auth_attempts(workspace) VALUES(${w})`;
    return Boolean(
      person &&
      typeof person.password_hash === "string" &&
      person.password_hash.length === supplied.length &&
      timingSafeEqual(Buffer.from(person.password_hash), Buffer.from(supplied)),
    );
  });
  demand(valid, "Account or password is incorrect.", 401);
  await issueSession(w, id);
  return { signedIn: true };
}
export async function requestOtp(id: string) {
  const w = await workspace(),
    code = String(randomInt(100000, 1000000)),
    challenge = randomUUID();
  await db().begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(hashtext(${`otp:${w}`}))`;
    const count =
      await tx`SELECT count(*)::int AS n FROM otp_challenges WHERE workspace=${w} AND created_at>now()-interval '15 minutes'`;
    demand(
      Number(count[0]?.n) < 10,
      "Too many codes requested. Try again in 15 minutes.",
      429,
    );
    const person =
      await tx`SELECT id FROM people WHERE workspace=${w} AND id=${id} AND role='parent'`;
    demand(person[0], "Use a demo parent ID, such as PARENT-01.", 400);
    await tx`INSERT INTO otp_challenges(id,workspace,person_id,code_hash,expires_at) VALUES(${challenge},${w},${id},${hash(challenge + code)},now()+interval '5 minutes')`;
  });
  return { challenge, demoCode: code, expiresIn: 300 };
}
export async function verifyOtp(challenge: string, code: string) {
  const w = await workspace();
  const result = await db().begin(async (tx) => {
    const row = (
      await tx`SELECT * FROM otp_challenges WHERE workspace=${w} AND id=${challenge} FOR UPDATE`
    )[0];
    demand(
      row &&
        !row.consumed &&
        new Date(row.expires_at).getTime() > Date.now() &&
        Number(row.attempts) < 5,
      "Code expired or too many attempts. Request a new code.",
      401,
    );
    await tx`UPDATE otp_challenges SET attempts=attempts+1 WHERE id=${challenge}`;
    if (row.code_hash !== hash(challenge + code))
      return { valid: false, person: "" };
    await tx`UPDATE otp_challenges SET consumed=true WHERE id=${challenge}`;
    return { valid: true, person: String(row.person_id) };
  });
  demand(
    result.valid,
    "Incorrect code. Check the demo inbox and try again.",
    401,
  );
  await issueSession(w, result.person);
  return { signedIn: true };
}
export async function signOut() {
  const token = (await cookies()).get("setu_session")?.value;
  if (token) await db()`DELETE FROM sessions WHERE token_hash=${hash(token)}`;
  (await cookies()).delete("setu_session");
}
export async function consent(a: Actor, granted: boolean) {
  demand(a.role === "parent", "Parent consent requires a parent session.", 403);
  await db().begin(async (tx) => {
    await tx`SELECT id FROM students WHERE workspace=${a.workspace} AND parent_id=${a.id} ORDER BY id FOR UPDATE`;
    await tx`UPDATE people SET consent=${granted} WHERE workspace=${a.workspace} AND id=${a.id}`;
    await tx`INSERT INTO consent_events(id,workspace,person_id,granted) VALUES(${randomUUID()},${a.workspace},${a.id},${granted})`;
  });
}
export async function language(a: Actor, locale: "en" | "hi") {
  await db()`UPDATE people SET locale=${locale} WHERE workspace=${a.workspace} AND id=${a.id}`;
}
export async function reviewerAccounts() {
  const w = await workspace();
  return personRow
    .array()
    .parse(
      await db()`SELECT id,name,role,centres,consent,locale FROM people WHERE workspace=${w}`,
    );
}
