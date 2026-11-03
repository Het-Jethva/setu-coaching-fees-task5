import { readFileSync, appendFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { parseEnv } from "node:util";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
const local = parseEnv(readFileSync(".env.local", "utf8"));
if (!local.OPENROUTER_API_KEY) throw new Error("Configure the ignored local OpenRouter key first.");
const cron = local.CRON_SECRET || randomBytes(32).toString("hex");
if (!local.CRON_SECRET) appendFileSync(".env.local", `\nCRON_SECRET=${cron}\n`);
const cli = join(process.env.APPDATA, "npm/node_modules/vercel/dist/index.js");
for (const [name, value] of Object.entries({ OPENROUTER_API_KEY: local.OPENROUTER_API_KEY, CRON_SECRET: cron })) {
  const result = spawnSync(process.execPath, [cli, "env", "add", name, "production", "--yes"], { input: value, encoding: "utf8", windowsHide: true });
  if (result.status !== 0) throw new Error(`Could not set ${name}. Review the existing Vercel variable without exposing its value.`);
  process.stdout.write(`${name} configured in production secrets.\n`);
}
