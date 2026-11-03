import { readFile } from "node:fs/promises";
import { db } from "../src/server/db";
await db().unsafe(
  await readFile(new URL("../db/001_initial.sql", import.meta.url), "utf8"),
);
process.stdout.write("PostgreSQL schema is ready.\n");
await db().end();
