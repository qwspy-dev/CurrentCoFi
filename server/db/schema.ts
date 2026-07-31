import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

export const distributionStatus = pgEnum("distribution_status", [
  "draft", "awaiting_funding", "active", "paused", "completed", "expired", "refunded", "cancelled",
]);
export const claimStatus = pgEnum("claim_status", [
  "available", "authorizing", "submitted", "confirmed", "failed", "expired", "refunded",
]);
export const memberRole = pgEnum("member_role", ["owner", "admin", "operator", "analyst", "developer"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: text("username").notNull(),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  status: text("status").default("active").notNull(),
  ...timestamps,
}, (table) => [uniqueIndex("users_username_unique").on(table.username)]);

export const identities = pgTable("identities", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  provider: text("provider").notNull(),
  providerSubjectHash: text("provider_subject_hash").notNull(),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
  ...timestamps,
}, (table) => [
  uniqueIndex("identities_provider_subject_unique").on(table.provider, table.providerSubjectHash),
  index("identities_user_idx").on(table.userId),
]);

export const wallets = pgTable("wallets", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  circleWalletId: text("circle_wallet_id"),
  address: text("address").notNull(),
  chainCode: text("chain_code").default("ARC-TESTNET").notNull(),
  walletType: text("wallet_type").default("SCA").notNull(),
  status: text("status").default("active").notNull(),
  ...timestamps,
}, (table) => [
  uniqueIndex("wallets_chain_address_unique").on(table.chainCode, table.address),
  index("wallets_user_idx").on(table.userId),
]);

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  logoUrl: text("logo_url"),
  websiteUrl: text("website_url"),
  status: text("status").default("active").notNull(),
  settings: jsonb("settings").$type<Record<string, unknown>>().default({}).notNull(),
  ...timestamps,
}, (table) => [uniqueIndex("projects_slug_unique").on(table.slug)]);

export const projectMembers = pgTable("project_members", {
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  role: memberRole("role").default("operator").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("project_members_unique").on(table.projectId, table.userId),
  index("project_members_user_idx").on(table.userId),
]);

export const tokens = pgTable("tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
  chainCode: text("chain_code").default("ARC-TESTNET").notNull(),
  contractAddress: text("contract_address").notNull(),
  symbol: text("symbol").notNull(),
  name: text("name").notNull(),
  decimals: integer("decimals").notNull(),
  verified: boolean("verified").default(false).notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
  ...timestamps,
}, (table) => [
  uniqueIndex("tokens_chain_contract_unique").on(table.chainCode, table.contractAddress),
  index("tokens_project_idx").on(table.projectId),
]);

export const distributions = pgTable("distributions", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  creatorUserId: uuid("creator_user_id").references(() => users.id, { onDelete: "set null" }),
  tokenId: uuid("token_id").references(() => tokens.id, { onDelete: "restrict" }).notNull(),
  kind: text("kind").notNull(),
  status: distributionStatus("status").default("draft").notNull(),
  name: text("name").notNull(),
  totalAmountAtomic: numeric("total_amount_atomic", { precision: 78, scale: 0 }).notNull(),
  claimedAmountAtomic: numeric("claimed_amount_atomic", { precision: 78, scale: 0 }).default("0").notNull(),
  recipientCount: integer("recipient_count").default(1).notNull(),
  merkleRoot: text("merkle_root"),
  vaultAddress: text("vault_address"),
  fundingTxHash: text("funding_tx_hash"),
  refundAddress: text("refund_address").notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  rules: jsonb("rules").$type<Record<string, unknown>>().default({}).notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
  ...timestamps,
}, (table) => [
  index("distributions_project_status_idx").on(table.projectId, table.status),
  index("distributions_expires_idx").on(table.expiresAt),
]);

export const allocations = pgTable("allocations", {
  id: uuid("id").primaryKey().defaultRandom(),
  distributionId: uuid("distribution_id").references(() => distributions.id, { onDelete: "cascade" }).notNull(),
  identityType: text("identity_type").notNull(),
  identityHash: text("identity_hash"),
  walletAddress: text("wallet_address"),
  claimSecretHash: text("claim_secret_hash"),
  amountAtomic: numeric("amount_atomic", { precision: 78, scale: 0 }).notNull(),
  merkleIndex: integer("merkle_index"),
  status: claimStatus("status").default("available").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  ...timestamps,
}, (table) => [
  index("allocations_distribution_status_idx").on(table.distributionId, table.status),
  index("allocations_identity_idx").on(table.identityType, table.identityHash),
]);

export const claims = pgTable("claims", {
  id: uuid("id").primaryKey().defaultRandom(),
  allocationId: uuid("allocation_id").references(() => allocations.id, { onDelete: "cascade" }).notNull(),
  claimantUserId: uuid("claimant_user_id").references(() => users.id, { onDelete: "set null" }),
  destinationWalletId: uuid("destination_wallet_id").references(() => wallets.id, { onDelete: "set null" }),
  status: claimStatus("status").default("authorizing").notNull(),
  transactionHash: text("transaction_hash"),
  failureCode: text("failure_code"),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
  ...timestamps,
}, (table) => [
  uniqueIndex("claims_allocation_unique").on(table.allocationId),
  index("claims_claimant_idx").on(table.claimantUserId),
]);

export const referralCodes = pgTable("referral_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  distributionId: uuid("distribution_id").references(() => distributions.id, { onDelete: "cascade" }).notNull(),
  referrerUserId: uuid("referrer_user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  code: text("code").notNull(),
  ...timestamps,
}, (table) => [
  uniqueIndex("referral_codes_code_unique").on(table.code),
  uniqueIndex("referral_codes_distribution_referrer_unique").on(table.distributionId, table.referrerUserId),
]);

export const referrals = pgTable("referrals", {
  id: uuid("id").primaryKey().defaultRandom(),
  distributionId: uuid("distribution_id").references(() => distributions.id, { onDelete: "cascade" }).notNull(),
  referrerUserId: uuid("referrer_user_id").references(() => users.id, { onDelete: "set null" }),
  referredUserId: uuid("referred_user_id").references(() => users.id, { onDelete: "set null" }),
  code: text("code").notNull(),
  status: text("status").default("pending").notNull(),
  rewardAmountAtomic: numeric("reward_amount_atomic", { precision: 78, scale: 0 }).default("0").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
  ...timestamps,
}, (table) => [
  index("referrals_distribution_code_idx").on(table.distributionId, table.code),
  uniqueIndex("referrals_distribution_users_unique").on(
    table.distributionId,
    table.referrerUserId,
    table.referredUserId,
  ),
  index("referrals_referrer_idx").on(table.referrerUserId),
]);

export const activationEvents = pgTable("activation_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  distributionId: uuid("distribution_id").references(() => distributions.id, { onDelete: "set null" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  externalEventId: text("external_event_id").notNull(),
  eventType: text("event_type").notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("activation_events_project_external_unique").on(table.projectId, table.externalEventId),
  index("activation_events_distribution_type_idx").on(table.distributionId, table.eventType),
]);

export const apiKeys = pgTable("api_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  prefix: text("prefix").notNull(),
  secretHash: text("secret_hash").notNull(),
  signingSecretCiphertext: text("signing_secret_ciphertext").notNull(),
  kind: text("kind").default("project").notNull(),
  permissions: jsonb("permissions").$type<string[]>().default([]).notNull(),
  policies: jsonb("policies").$type<Record<string, unknown>>().default({}).notNull(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  ...timestamps,
}, (table) => [
  uniqueIndex("api_keys_prefix_unique").on(table.prefix),
  index("api_keys_project_idx").on(table.projectId),
]);

export const agentActions = pgTable("agent_actions", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  apiKeyId: uuid("api_key_id").references(() => apiKeys.id, { onDelete: "set null" }),
  reviewedByUserId: uuid("reviewed_by_user_id").references(() => users.id, { onDelete: "set null" }),
  kind: text("kind").default("reward_distribution").notNull(),
  status: text("status").default("proposed").notNull(),
  riskLevel: text("risk_level").default("low").notNull(),
  amountAtomic: numeric("amount_atomic", { precision: 78, scale: 0 }).default("0").notNull(),
  assetAddress: text("asset_address"),
  idempotencyKey: text("idempotency_key").notNull(),
  requestPayload: jsonb("request_payload").$type<Record<string, unknown>>().notNull(),
  policyDecision: jsonb("policy_decision").$type<Record<string, unknown>>().notNull(),
  result: jsonb("result").$type<Record<string, unknown>>().default({}).notNull(),
  failureCode: text("failure_code"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  executedAt: timestamp("executed_at", { withTimezone: true }),
  ...timestamps,
}, (table) => [
  uniqueIndex("agent_actions_key_idempotency_unique").on(table.apiKeyId, table.idempotencyKey),
  index("agent_actions_project_status_idx").on(table.projectId, table.status, table.createdAt),
  index("agent_actions_key_created_idx").on(table.apiKeyId, table.createdAt),
]);

export const crosschainFundingIntents = pgTable("crosschain_funding_intents", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  distributionId: uuid("distribution_id").references(() => distributions.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  sourceChain: text("source_chain").notNull(),
  sourceDomain: integer("source_domain").notNull(),
  sourceUsdcAddress: text("source_usdc_address").notNull(),
  destinationChain: text("destination_chain").default("ARC-TESTNET").notNull(),
  destinationDomain: integer("destination_domain").default(26).notNull(),
  destinationAddress: text("destination_address").notNull(),
  amountAtomic: numeric("amount_atomic", { precision: 78, scale: 0 }).notNull(),
  protocolFeeAtomic: numeric("protocol_fee_atomic", { precision: 78, scale: 0 }).default("0").notNull(),
  forwardFeeAtomic: numeric("forward_fee_atomic", { precision: 78, scale: 0 }).default("0").notNull(),
  totalBurnAtomic: numeric("total_burn_atomic", { precision: 78, scale: 0 }).notNull(),
  transport: text("transport").default("cctp-v2-forward").notNull(),
  status: text("status").default("created").notNull(),
  idempotencyKey: text("idempotency_key").notNull(),
  sourceWalletId: text("source_wallet_id"),
  sourceChallengeId: text("source_challenge_id"),
  sourceTransactionHash: text("source_transaction_hash"),
  destinationTransactionHash: text("destination_transaction_hash"),
  campaignFundingTransactionHash: text("campaign_funding_transaction_hash"),
  messageHash: text("message_hash"),
  evidence: jsonb("evidence").$type<Record<string, unknown>>().default({}).notNull(),
  failureCode: text("failure_code"),
  ...timestamps,
}, (table) => [
  uniqueIndex("crosschain_funding_project_key_unique").on(table.projectId, table.idempotencyKey),
  index("crosschain_funding_distribution_idx").on(table.distributionId, table.createdAt),
  index("crosschain_funding_status_idx").on(table.status, table.updatedAt),
]);

export const identityAttestations = pgTable("identity_attestations", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  distributionId: uuid("distribution_id").references(() => distributions.id, { onDelete: "cascade" }).notNull(),
  allocationId: uuid("allocation_id").references(() => allocations.id, { onDelete: "cascade" }).notNull(),
  verifierKeyId: uuid("verifier_key_id").references(() => apiKeys.id, { onDelete: "set null" }),
  identityType: text("identity_type").notNull(),
  identityHash: text("identity_hash").notNull(),
  walletAddress: text("wallet_address").notNull(),
  externalEventId: text("external_event_id").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
  ...timestamps,
}, (table) => [
  uniqueIndex("identity_attestations_project_event_unique").on(table.projectId, table.externalEventId),
  index("identity_attestations_claim_idx").on(
    table.allocationId,
    table.walletAddress,
    table.expiresAt,
  ),
  index("identity_attestations_distribution_idx").on(table.distributionId, table.createdAt),
]);

export const webhookEndpoints = pgTable("webhook_endpoints", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  url: text("url").notNull(),
  secretHash: text("secret_hash").notNull(),
  secretCiphertext: text("secret_ciphertext").notNull(),
  events: jsonb("events").$type<string[]>().default([]).notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  ...timestamps,
}, (table) => [index("webhook_endpoints_project_idx").on(table.projectId)]);

export const webhookDeliveries = pgTable("webhook_deliveries", {
  id: uuid("id").primaryKey().defaultRandom(),
  endpointId: uuid("endpoint_id").references(() => webhookEndpoints.id, { onDelete: "cascade" }).notNull(),
  eventType: text("event_type").notNull(),
  eventId: text("event_id").notNull(),
  status: text("status").default("pending").notNull(),
  attempts: integer("attempts").default(0).notNull(),
  nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }),
  responseStatus: integer("response_status"),
  responseError: text("response_error"),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  ...timestamps,
}, (table) => [
  uniqueIndex("webhook_deliveries_endpoint_event_unique").on(table.endpointId, table.eventId),
  index("webhook_deliveries_retry_idx").on(table.status, table.nextAttemptAt),
]);

export const idempotencyKeys = pgTable("idempotency_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  scope: text("scope").notNull(),
  keyHash: text("key_hash").notNull(),
  requestHash: text("request_hash").notNull(),
  responseStatus: integer("response_status"),
  responseBody: jsonb("response_body"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("idempotency_keys_scope_key_unique").on(table.scope, table.keyHash),
  index("idempotency_keys_expiry_idx").on(table.expiresAt),
]);

export const auditEvents = pgTable("audit_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorType: text("actor_type").notNull(),
  actorId: text("actor_id"),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  resourceType: text("resource_type").notNull(),
  resourceId: text("resource_id"),
  requestId: text("request_id"),
  ipHash: text("ip_hash"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("audit_events_project_created_idx").on(table.projectId, table.createdAt),
  index("audit_events_resource_idx").on(table.resourceType, table.resourceId),
]);

export const evidenceReports = pgTable("evidence_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  distributionId: uuid("distribution_id").references(() => distributions.id, { onDelete: "set null" }),
  createdByUserId: uuid("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
  createdByKeyId: uuid("created_by_key_id").references(() => apiKeys.id, { onDelete: "set null" }),
  publicSlug: text("public_slug").notNull(),
  schemaVersion: text("schema_version").default("current-evidence-v1").notNull(),
  digest: text("digest").notNull(),
  snapshot: jsonb("snapshot").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("evidence_reports_public_slug_unique").on(table.publicSlug),
  index("evidence_reports_project_created_idx").on(table.projectId, table.createdAt),
  index("evidence_reports_distribution_idx").on(table.distributionId, table.createdAt),
]);

export const pilotEngagements = pgTable("pilot_engagements", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  distributionId: uuid("distribution_id").references(() => distributions.id, { onDelete: "set null" }),
  ownerUserId: uuid("owner_user_id").references(() => users.id, { onDelete: "set null" }),
  publicSlug: text("public_slug").notNull(),
  partnerName: text("partner_name").notNull(),
  partnerWebsite: text("partner_website"),
  useCase: text("use_case").notNull(),
  status: text("status").default("onboarding").notNull(),
  integrationMode: text("integration_mode").default("hosted-links").notNull(),
  targetRecipients: integer("target_recipients").default(100).notNull(),
  targetClaimRateBps: integer("target_claim_rate_bps").default(5000).notNull(),
  targetActivationRateBps: integer("target_activation_rate_bps").default(2500).notNull(),
  requestedIntegrations: jsonb("requested_integrations").$type<string[]>().default([]).notNull(),
  successCriteria: jsonb("success_criteria").$type<Record<string, unknown>>().default({}).notNull(),
  notes: text("notes"),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  dueAt: timestamp("due_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  ...timestamps,
}, (table) => [
  uniqueIndex("pilot_engagements_public_slug_unique").on(table.publicSlug),
  index("pilot_engagements_project_status_idx").on(table.projectId, table.status),
  index("pilot_engagements_distribution_idx").on(table.distributionId),
]);

export const pilotAttestations = pgTable("pilot_attestations", {
  id: uuid("id").primaryKey().defaultRandom(),
  pilotId: uuid("pilot_id").references(() => pilotEngagements.id, { onDelete: "cascade" }).notNull(),
  signerName: text("signer_name").notNull(),
  signerRole: text("signer_role").notNull(),
  statement: text("statement").notNull(),
  digest: text("digest").notNull(),
  proof: jsonb("proof").$type<Record<string, unknown>>().default({}).notNull(),
  attestedAt: timestamp("attested_at", { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("pilot_attestations_pilot_unique").on(table.pilotId),
  uniqueIndex("pilot_attestations_digest_unique").on(table.digest),
]);

export const tokenEconomyActions = pgTable("token_economy_actions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
  kind: text("kind").notNull(),
  reference: text("reference").notNull(),
  amountAtomic: numeric("amount_atomic", { precision: 78, scale: 0 }).notNull(),
  durationDays: integer("duration_days"),
  contractActionId: text("contract_action_id").notNull(),
  status: text("status").default("created").notNull(),
  approvalChallengeId: text("approval_challenge_id"),
  executionChallengeId: text("execution_challenge_id"),
  transactionHash: text("transaction_hash"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
  ...timestamps,
}, (table) => [
  uniqueIndex("token_economy_contract_action_unique").on(table.contractActionId),
  index("token_economy_project_kind_idx").on(table.projectId, table.kind),
  index("token_economy_status_idx").on(table.status),
]);
