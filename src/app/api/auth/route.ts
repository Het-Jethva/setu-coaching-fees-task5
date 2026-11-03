import { z } from "zod";
import {
  startDemo,
  staffLogin,
  requestOtp,
  verifyOtp,
  signOut,
} from "@/server/access";
import { body, failure, json } from "@/server/http";
const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("demo") }),
  z.object({
    action: z.literal("staff"),
    id: z.string().min(1).max(50),
    password: z.string().min(1).max(200),
  }),
  z.object({ action: z.literal("requestOtp"), id: z.string().min(1).max(50) }),
  z.object({
    action: z.literal("verifyOtp"),
    challenge: z.string().uuid(),
    code: z.string().regex(/^\d{6}$/),
  }),
  z.object({ action: z.literal("logout") }),
]);
export async function POST(req: Request) {
  try {
    const b = await body(req, schema);
    switch (b.action) {
      case "demo":
        return json(await startDemo());
      case "staff":
        return json(await staffLogin(b.id, b.password));
      case "requestOtp":
        return json(await requestOtp(b.id));
      case "verifyOtp":
        return json(await verifyOtp(b.challenge, b.code));
      case "logout":
        await signOut();
        return json({ signedOut: true });
      default: {
        const exhaustive: never = b;
        return exhaustive;
      }
    }
  } catch (e) {
    return failure(e);
  }
}
