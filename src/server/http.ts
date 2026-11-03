import { z } from "zod";
import { unstable_rethrow } from "next/navigation";
import { AppError, demand } from "./db";
export async function body<T extends z.ZodType>(
  request: Request,
  schema: T,
): Promise<z.output<T>> {
  const origin = request.headers.get("origin");
  demand(
    origin && origin === new URL(request.url).origin,
    "This action must originate from the application.",
    403,
  );
  const text = await request.text();
  demand(text.length <= 250_000, "Request is too large.", 413);
  return schema.parse(JSON.parse(text));
}
export function failure(error: unknown) {
  unstable_rethrow(error);
  if (error instanceof AppError)
    return Response.json({ error: error.message }, { status: error.status });
  if (error instanceof z.ZodError || error instanceof SyntaxError)
    return Response.json(
      { error: "Some input is invalid. Check the fields and try again." },
      { status: 400 },
    );
  process.stderr.write(
    JSON.stringify({
      event: "request_failed",
      kind: error instanceof Error ? error.name : "unknown",
      message: error instanceof Error ? error.message : "unknown",
    }) + "\n",
  );
  return Response.json(
    {
      error:
        "The request could not be completed. Try again, or check the server configuration.",
    },
    { status: 500 },
  );
}
export const json = (data: unknown) =>
  Response.json(data, { headers: { "Cache-Control": "no-store" } });
