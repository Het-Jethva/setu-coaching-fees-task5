import postgres from "postgres";
export type Tx = postgres.TransactionSql;
let connection: ReturnType<typeof postgres> | undefined;
export function db() {
  if (!process.env.DATABASE_URL)
    throw new Error(
      "DATABASE_URL is missing. Configure PostgreSQL and run npm run db:migrate.",
    );
  connection ??= postgres(process.env.DATABASE_URL, {
    max: 5,
    prepare: false,
    idle_timeout: 20,
    connect_timeout: 10,
  });
  return connection;
}
export class AppError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function demand(
  condition: unknown,
  message: string,
  status = 400,
): asserts condition {
  if (!condition) throw new AppError(message, status);
}
