# Project collaboration and active workspaces

Current CoFi projects can now add collaborators without sharing a founder's wallet, Circle credentials, or unrestricted API secrets. Every signed-in account has an active workspace, and the existing campaign, treasury, commerce, grant-evidence, and developer surfaces resolve that project through the same server-side preference.

## Invitation lifecycle

1. An owner or admin chooses an email and one of four non-owner roles.
2. Current stores a project-scoped email digest, a masked display value, and a hash of a random invitation secret.
3. Invitation secrets are returned once in a seven-day link and cannot be recovered from the database.
4. The recipient signs into a Current account using the invited email.
5. Current verifies the link secret and matching email before creating membership.
6. Acceptance makes the joined project active without transferring wallet authority.

Creating a new invitation for the same project and email revokes older pending links. Administrators can revoke pending invitations. Used, expired, and revoked links cannot be accepted.

## Roles

- `owner`: immutable workspace owner with full project administration.
- `admin`: team management and operational access, but cannot alter the owner or appoint/remove another admin.
- `operator`: campaign and settlement operations without member administration.
- `analyst`: workspace review access while fund operations remain blocked.
- `developer`: project context for integration work; API credentials remain separately permissioned and revocable.

The owner cannot be downgraded or removed through the collaboration API. Users cannot change their own role or remove themselves through the administrative endpoint. Existing members cannot accept a link that would silently replace their role.

## Privacy and auditability

Raw invited emails are not stored in the invitation table or returned by the API. Member changes emit audit events with actor, project, action, resource, and bounded metadata. Invitation history exposes only masked email, role, lifecycle state, and timestamps.
