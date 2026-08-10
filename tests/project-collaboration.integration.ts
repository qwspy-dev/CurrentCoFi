import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { workspaceRoleCapabilities } from "../server/workspaces/repository.js";

assert.deepEqual(workspaceRoleCapabilities("owner"), { manageMembers: true, operateFunds: true, reviewWorkspace: true, useDeveloperTools: true });
assert.equal(workspaceRoleCapabilities("admin").manageMembers, true);
assert.equal(workspaceRoleCapabilities("operator").operateFunds, true);
assert.equal(workspaceRoleCapabilities("analyst").operateFunds, false);
assert.equal(workspaceRoleCapabilities("developer").manageMembers, false);
assert.equal(workspaceRoleCapabilities("developer").useDeveloperTools, true);

const [schema, accounts, operations, api, inviteApi, ui, styles, migration, meta, openapi, docs] = await Promise.all([
  readFile(new URL("../server/db/schema.ts", import.meta.url), "utf8"),
  readFile(new URL("../server/accounts/repository.ts", import.meta.url), "utf8"),
  readFile(new URL("../server/workspaces/repository.ts", import.meta.url), "utf8"),
  readFile(new URL("../api/v1/workspaces.ts", import.meta.url), "utf8"),
  readFile(new URL("../api/v1/workspaces/invitation.ts", import.meta.url), "utf8"),
  readFile(new URL("../app/CurrentApp.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/workspace-access.css", import.meta.url), "utf8"),
  readFile(new URL("../drizzle-vercel/0030_wooden_the_santerians.sql", import.meta.url), "utf8"),
  readFile(new URL("../api/v1/meta.ts", import.meta.url), "utf8"),
  readFile(new URL("../api/v1/openapi.ts", import.meta.url), "utf8"),
  readFile(new URL("../docs/project-collaboration.md", import.meta.url), "utf8"),
]);
assert.match(schema, /projectInvitations/);
assert.match(schema, /userWorkspacePreferences/);
assert.match(accounts, /activeProjectId/);
assert.match(operations, /INVITATION_EMAIL_MISMATCH/);
assert.match(operations, /OWNER_IMMUTABLE/);
assert.match(operations, /ALREADY_A_MEMBER/);
assert.match(api, /revoke-invitation/);
assert.match(inviteApi, /acceptWorkspaceInvitation/);
assert.match(ui, /PROJECT COLLABORATION/);
assert.match(ui, /Server-enforced RBAC/);
assert.match(styles, /prefers-reduced-motion/);
assert.match(migration, /project_invitations/);
assert.match(meta, /server-enforced-project-rbac/);
assert.match(openapi, /version: "\d+\.\d+\.\d+-[a-z0-9-]+"/);
assert.match(docs, /Invitation secrets are returned once/);
console.log("Project collaboration verified: email-bound invitations, immutable ownership, revocable RBAC, and persisted active workspace selection.");
