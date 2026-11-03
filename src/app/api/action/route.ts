import { actionSchema } from "@/domain/model";
import { actor, consent, language } from "@/server/access";
import {
  allocateReceipt,
  completeCheckout,
  createCheckout,
  previewWithdrawal,
  recordPayout,
  reverse,
  runReminders,
  withdraw,
} from "@/server/enrollment";
import { confirmImport, previewImport } from "@/server/academics";
import { assessBatch, dismiss } from "@/server/risk";
import { body, failure, json } from "@/server/http";
export const maxDuration = 60;
export async function POST(req: Request) {
  try {
    const b = await body(req, actionSchema),
      a = await actor();
    switch (b.action) {
      case "consent":
        await consent(a, b.granted);
        return json({ saved: true });
      case "language":
        await language(a, b.locale);
        return json({ saved: true });
      case "checkout":
        return json(await createCheckout(a, b));
      case "completeCheckout":
        return json(await completeCheckout(a, b.checkoutId, b.outcome));
      case "allocate":
        return json(await allocateReceipt(a, b));
      case "refundPreview":
        return json(await previewWithdrawal(a, b.studentId, b.on));
      case "withdraw":
        return json(await withdraw(a, b.studentId, b.on, b.version));
      case "payout":
        return json(await recordPayout(a, b.studentId, b.amount, b.requestId));
      case "reverse":
        return json(await reverse(a, b.studentId, b.eventId, b.reason));
      case "runReminders":
        return json(await runReminders(a));
      case "previewImport":
        return json(await previewImport(a, b.batch, b.kind, b.csv));
      case "confirmImport":
        return json(await confirmImport(a, b.previewId));
      case "assess":
        return json(await assessBatch(a, b.batch));
      case "dismiss":
        return json(await dismiss(a, b.studentId, b.hash));
      default: {
        const exhaustive: never = b;
        return exhaustive;
      }
    }
  } catch (e) {
    return failure(e);
  }
}
