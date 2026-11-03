import { actor } from "@/server/access";
import { snapshot } from "@/server/store";
import { failure, json } from "@/server/http";
export async function GET() {
  try {
    return json(await snapshot(await actor()));
  } catch (e) {
    return failure(e);
  }
}
