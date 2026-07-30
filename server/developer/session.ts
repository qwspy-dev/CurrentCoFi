import { getOrCreatePersonalProject, persistSessionAccount } from "../accounts/repository.js";
import { sessionFromRequest } from "../auth/session.js";

export async function developerSession(request: Request) {
  const session = await sessionFromRequest(request);
  const account = await persistSessionAccount(session);
  const project = await getOrCreatePersonalProject(account.userId, session.displayName);
  return { session, account, project };
}
