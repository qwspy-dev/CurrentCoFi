import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { persistSessionAccount, getOrCreatePersonalProject } from "../server/accounts/repository.js";
import { createClaimLink, resolveClaimLink } from "../server/claims/links.js";
import { getDb } from "../server/db/client.js";
import { users } from "../server/db/schema.js";
import type { CurrentSession } from "../server/auth/session.js";

const marker = crypto.randomUUID().replaceAll("-", "");
const session: CurrentSession = {
  version: 1,
  circleUserId: `integration-${marker}`,
  userToken: "integration-user-token",
  refreshToken: "integration-refresh-token",
  deviceId: `integration-device-${marker}`,
  provider: "google",
  displayName: "Claim Integration",
  email: `claim-${marker}@current.invalid`,
  wallets: [{
    id: `wallet-${marker}`,
    address: `0x${marker.padEnd(40, "0").slice(0, 40)}`,
    blockchain: "ARC-TESTNET",
    state: "LIVE",
    accountType: "SCA",
  }],
  issuedAt: Date.now(),
};

const account = await persistSessionAccount(session);
try {
  const project = await getOrCreatePersonalProject(account.userId, session.displayName);
  const created = await createClaimLink({
    userId: account.userId,
    displayName: session.displayName,
    projectId: project.id,
    amount: "25.50",
    message: "Integration current",
    expiresInHours: 24,
    refundAddress: session.wallets[0].address,
    origin: "https://www.currentco.finance",
  });
  assert.equal(created.status, "awaiting_funding");
  assert.equal(created.amount, "25.5");
  const token = new URL(created.claimUrl).searchParams.get("claim");
  assert.ok(token);
  const preview = await resolveClaimLink(token);
  assert.equal(preview.amount, "25.5");
  assert.equal(preview.asset, "USDC");
  assert.equal(preview.message, "Integration current");
  assert.equal(preview.claimable, false);
  await assert.rejects(() => resolveClaimLink(`${token}tampered`));
  console.log("Claim link persistence, resolution, and tamper rejection passed.");
} finally {
  await getDb().delete(users).where(eq(users.id, account.userId));
}
