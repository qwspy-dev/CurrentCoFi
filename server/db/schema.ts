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

export const userWorkspacePreferences = pgTable("user_workspace_preferences", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  activeProjectId: uuid("active_project_id").references(() => projects.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("user_workspace_preferences_project_idx").on(table.activeProjectId)]);

export const projectInvitations = pgTable("project_invitations", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  invitedByUserId: uuid("invited_by_user_id").references(() => users.id, { onDelete: "set null" }),
  acceptedByUserId: uuid("accepted_by_user_id").references(() => users.id, { onDelete: "set null" }),
  emailHash: text("email_hash").notNull(),
  maskedEmail: text("masked_email").notNull(),
  tokenHash: text("token_hash").notNull(),
  role: memberRole("role").default("operator").notNull(),
  status: text("status").default("pending").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  ...timestamps,
}, (table) => [
  uniqueIndex("project_invitations_token_unique").on(table.tokenHash),
  index("project_invitations_project_status_idx").on(table.projectId, table.status, table.createdAt),
  index("project_invitations_email_status_idx").on(table.emailHash, table.status, table.expiresAt),
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

export const walletTransfers = pgTable("wallet_transfers", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  circleWalletId: text("circle_wallet_id").notNull(),
  fromAddress: text("from_address").notNull(),
  toAddress: text("to_address").notNull(),
  tokenAddress: text("token_address").notNull(),
  symbol: text("symbol").notNull(),
  name: text("name").notNull(),
  decimals: integer("decimals").notNull(),
  amountAtomic: numeric("amount_atomic", { precision: 78, scale: 0 }).notNull(),
  status: text("status").default("authorizing").notNull(),
  challengeId: text("challenge_id").notNull(),
  transactionHash: text("transaction_hash"),
  receiptNumber: text("receipt_number").notNull(),
  note: text("note"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  ...timestamps,
}, (table) => [
  uniqueIndex("wallet_transfers_challenge_unique").on(table.challengeId),
  uniqueIndex("wallet_transfers_receipt_unique").on(table.receiptNumber),
  uniqueIndex("wallet_transfers_transaction_unique").on(table.transactionHash),
  index("wallet_transfers_user_created_idx").on(table.userId, table.createdAt),
  index("wallet_transfers_status_idx").on(table.status, table.updatedAt),
]);

export const walletSwaps = pgTable("wallet_swaps", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  circleWalletId: text("circle_wallet_id").notNull(),
  walletAddress: text("wallet_address").notNull(),
  tokenInAddress: text("token_in_address").notNull(),
  tokenInSymbol: text("token_in_symbol").notNull(),
  tokenInName: text("token_in_name").notNull(),
  tokenInDecimals: integer("token_in_decimals").notNull(),
  amountInAtomic: numeric("amount_in_atomic", { precision: 78, scale: 0 }).notNull(),
  usdcOutAtomic: numeric("usdc_out_atomic", { precision: 78, scale: 0 }).notNull(),
  routerAddress: text("router_address").notNull(),
  adapterAddress: text("adapter_address").notNull(),
  status: text("status").default("authorizing").notNull(),
  phase: text("phase").default("approval").notNull(),
  approvalChallengeId: text("approval_challenge_id"),
  settlementChallengeId: text("settlement_challenge_id"),
  approvalTransactionHash: text("approval_transaction_hash"),
  settlementTransactionHash: text("settlement_transaction_hash"),
  settlementDeadline: timestamp("settlement_deadline", { withTimezone: true }),
  receiptNumber: text("receipt_number").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  ...timestamps,
}, (table) => [
  uniqueIndex("wallet_swaps_receipt_unique").on(table.receiptNumber),
  uniqueIndex("wallet_swaps_approval_challenge_unique").on(table.approvalChallengeId),
  uniqueIndex("wallet_swaps_settlement_challenge_unique").on(table.settlementChallengeId),
  uniqueIndex("wallet_swaps_settlement_transaction_unique").on(table.settlementTransactionHash),
  index("wallet_swaps_user_created_idx").on(table.userId, table.createdAt),
  index("wallet_swaps_status_idx").on(table.status, table.updatedAt),
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

export const payrollSchedules = pgTable("payroll_schedules", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  creatorUserId: uuid("creator_user_id").references(() => users.id, { onDelete: "set null" }),
  tokenId: uuid("token_id").references(() => tokens.id, { onDelete: "restrict" }).notNull(),
  name: text("name").notNull(),
  status: text("status").default("active").notNull(),
  cadenceDays: integer("cadence_days").notNull(),
  nextRunAt: timestamp("next_run_at", { withTimezone: true }).notNull(),
  claimExpiresHours: integer("claim_expires_hours").default(168).notNull(),
  refundAddress: text("refund_address").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
  ...timestamps,
}, (table) => [
  index("payroll_schedules_project_status_idx").on(table.projectId, table.status, table.nextRunAt),
  index("payroll_schedules_due_idx").on(table.status, table.nextRunAt),
]);

export const payrollMembers = pgTable("payroll_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  scheduleId: uuid("schedule_id").references(() => payrollSchedules.id, { onDelete: "cascade" }).notNull(),
  identityType: text("identity_type").notNull(),
  identityHash: text("identity_hash").notNull(),
  identityCiphertext: text("identity_ciphertext").notNull(),
  maskedIdentity: text("masked_identity").notNull(),
  displayName: text("display_name").notNull(),
  role: text("role"),
  amountAtomic: numeric("amount_atomic", { precision: 78, scale: 0 }).notNull(),
  status: text("status").default("active").notNull(),
  ...timestamps,
}, (table) => [
  uniqueIndex("payroll_members_schedule_identity_unique").on(table.scheduleId, table.identityHash),
  index("payroll_members_schedule_status_idx").on(table.scheduleId, table.status),
]);

export const payrollRuns = pgTable("payroll_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  scheduleId: uuid("schedule_id").references(() => payrollSchedules.id, { onDelete: "cascade" }).notNull(),
  distributionId: uuid("distribution_id").references(() => distributions.id, { onDelete: "set null" }),
  cycleAt: timestamp("cycle_at", { withTimezone: true }).notNull(),
  status: text("status").default("ready").notNull(),
  memberCount: integer("member_count").notNull(),
  totalAmountAtomic: numeric("total_amount_atomic", { precision: 78, scale: 0 }).notNull(),
  preparedAt: timestamp("prepared_at", { withTimezone: true }),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
  ...timestamps,
}, (table) => [
  uniqueIndex("payroll_runs_schedule_cycle_unique").on(table.scheduleId, table.cycleAt),
  uniqueIndex("payroll_runs_distribution_unique").on(table.distributionId),
  index("payroll_runs_schedule_status_idx").on(table.scheduleId, table.status, table.cycleAt),
]);

export const bounties = pgTable("bounties", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  creatorUserId: uuid("creator_user_id").references(() => users.id, { onDelete: "set null" }),
  distributionId: uuid("distribution_id").references(() => distributions.id, { onDelete: "restrict" }).notNull(),
  publicSlug: text("public_slug").notNull(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  category: text("category").notNull(),
  status: text("status").default("awaiting_funding").notNull(),
  submissionDeadline: timestamp("submission_deadline", { withTimezone: true }).notNull(),
  claimTokenCiphertext: text("claim_token_ciphertext").notNull(),
  awardedSubmissionId: uuid("awarded_submission_id"),
  awardedAt: timestamp("awarded_at", { withTimezone: true }),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
  ...timestamps,
}, (table) => [
  uniqueIndex("bounties_public_slug_unique").on(table.publicSlug),
  uniqueIndex("bounties_distribution_unique").on(table.distributionId),
  index("bounties_project_status_idx").on(table.projectId, table.status, table.createdAt),
  index("bounties_deadline_idx").on(table.status, table.submissionDeadline),
]);

export const bountySubmissions = pgTable("bounty_submissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  bountyId: uuid("bounty_id").references(() => bounties.id, { onDelete: "cascade" }).notNull(),
  displayName: text("display_name").notNull(),
  contactType: text("contact_type").notNull(),
  contactHash: text("contact_hash").notNull(),
  contactCiphertext: text("contact_ciphertext").notNull(),
  maskedContact: text("masked_contact").notNull(),
  workUrl: text("work_url").notNull(),
  workSummary: text("work_summary").notNull(),
  proofDigest: text("proof_digest").notNull(),
  status: text("status").default("submitted").notNull(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
  ...timestamps,
}, (table) => [
  uniqueIndex("bounty_submissions_bounty_contact_unique").on(table.bountyId, table.contactHash),
  index("bounty_submissions_bounty_status_idx").on(table.bountyId, table.status, table.createdAt),
]);

export const giveaways = pgTable("giveaways", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  creatorUserId: uuid("creator_user_id").references(() => users.id, { onDelete: "set null" }),
  distributionId: uuid("distribution_id").references(() => distributions.id, { onDelete: "restrict" }).notNull(),
  publicSlug: text("public_slug").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: text("status").default("awaiting_funding").notNull(),
  entryDeadline: timestamp("entry_deadline", { withTimezone: true }).notNull(),
  maxEntries: integer("max_entries").default(1000).notNull(),
  claimTokenCiphertext: text("claim_token_ciphertext").notNull(),
  randomnessCiphertext: text("randomness_ciphertext").notNull(),
  randomnessCommitment: text("randomness_commitment").notNull(),
  entrySetDigest: text("entry_set_digest"),
  drawDigest: text("draw_digest"),
  revealedRandomness: text("revealed_randomness"),
  winnerEntryId: uuid("winner_entry_id"),
  drawnAt: timestamp("drawn_at", { withTimezone: true }),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
  ...timestamps,
}, (table) => [
  uniqueIndex("giveaways_public_slug_unique").on(table.publicSlug),
  uniqueIndex("giveaways_distribution_unique").on(table.distributionId),
  index("giveaways_project_status_idx").on(table.projectId, table.status, table.createdAt),
  index("giveaways_deadline_idx").on(table.status, table.entryDeadline),
]);

export const giveawayEntries = pgTable("giveaway_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  giveawayId: uuid("giveaway_id").references(() => giveaways.id, { onDelete: "cascade" }).notNull(),
  displayName: text("display_name").notNull(),
  identityType: text("identity_type").notNull(),
  identityHash: text("identity_hash").notNull(),
  identityCiphertext: text("identity_ciphertext").notNull(),
  maskedIdentity: text("masked_identity").notNull(),
  referralCode: text("referral_code").notNull(),
  referredByCode: text("referred_by_code"),
  entryDigest: text("entry_digest").notNull(),
  status: text("status").default("entered").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
  ...timestamps,
}, (table) => [
  uniqueIndex("giveaway_entries_identity_unique").on(table.giveawayId, table.identityHash),
  uniqueIndex("giveaway_entries_referral_unique").on(table.giveawayId, table.referralCode),
  index("giveaway_entries_status_idx").on(table.giveawayId, table.status, table.createdAt),
  index("giveaway_entries_referred_idx").on(table.giveawayId, table.referredByCode),
]);

export const publicDrops = pgTable("public_drops", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  creatorUserId: uuid("creator_user_id").references(() => users.id, { onDelete: "set null" }),
  distributionId: uuid("distribution_id").references(() => distributions.id, { onDelete: "restrict" }).notNull(),
  publicSlug: text("public_slug").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: text("status").default("awaiting_funding").notNull(),
  claimAmountAtomic: numeric("claim_amount_atomic", { precision: 78, scale: 0 }).notNull(),
  maxClaims: integer("max_claims").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
  ...timestamps,
}, (table) => [
  uniqueIndex("public_drops_slug_unique").on(table.publicSlug),
  uniqueIndex("public_drops_distribution_unique").on(table.distributionId),
  index("public_drops_project_status_idx").on(table.projectId, table.status, table.createdAt),
]);

export const publicDropSlots = pgTable("public_drop_slots", {
  id: uuid("id").primaryKey().defaultRandom(),
  dropId: uuid("drop_id").references(() => publicDrops.id, { onDelete: "cascade" }).notNull(),
  allocationId: uuid("allocation_id").references(() => allocations.id, { onDelete: "restrict" }).notNull(),
  position: integer("position").notNull(),
  claimTokenCiphertext: text("claim_token_ciphertext").notNull(),
  displayName: text("display_name"),
  identityType: text("identity_type"),
  identityHash: text("identity_hash"),
  identityCiphertext: text("identity_ciphertext"),
  maskedIdentity: text("masked_identity"),
  referralCode: text("referral_code"),
  referredByCode: text("referred_by_code"),
  reservedAt: timestamp("reserved_at", { withTimezone: true }),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
  ...timestamps,
}, (table) => [
  uniqueIndex("public_drop_slots_allocation_unique").on(table.allocationId),
  uniqueIndex("public_drop_slots_position_unique").on(table.dropId, table.position),
  uniqueIndex("public_drop_slots_identity_unique").on(table.dropId, table.identityHash),
  uniqueIndex("public_drop_slots_referral_unique").on(table.dropId, table.referralCode),
  index("public_drop_slots_available_idx").on(table.dropId, table.identityHash, table.position),
]);

export const discoveryInteractions = pgTable("discovery_interactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  resourceType: text("resource_type").notNull(),
  resourceId: uuid("resource_id").notNull(),
  visitorHash: text("visitor_hash").notNull(),
  eventType: text("event_type").notNull(),
  dayBucket: text("day_bucket").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("discovery_interactions_daily_unique").on(table.resourceType, table.resourceId, table.visitorHash, table.eventType, table.dayBucket),
  index("discovery_interactions_resource_idx").on(table.resourceType, table.resourceId, table.eventType),
  index("discovery_interactions_project_day_idx").on(table.projectId, table.dayBucket),
]);

export const communityTreasuries = pgTable("community_treasuries", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  ownerUserId: uuid("owner_user_id").references(() => users.id, { onDelete: "set null" }),
  publicSlug: text("public_slug").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  treasuryAddress: text("treasury_address").notNull(),
  status: text("status").default("active").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
  ...timestamps,
}, (table) => [
  uniqueIndex("community_treasuries_project_unique").on(table.projectId),
  uniqueIndex("community_treasuries_slug_unique").on(table.publicSlug),
  index("community_treasuries_owner_idx").on(table.ownerUserId, table.createdAt),
]);

export const treasuryBudgets = pgTable("treasury_budgets", {
  id: uuid("id").primaryKey().defaultRandom(),
  treasuryId: uuid("treasury_id").references(() => communityTreasuries.id, { onDelete: "cascade" }).notNull(),
  tokenId: uuid("token_id").references(() => tokens.id, { onDelete: "restrict" }).notNull(),
  category: text("category").notNull(),
  limitAtomic: numeric("limit_atomic", { precision: 78, scale: 0 }).notNull(),
  periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
  periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
  status: text("status").default("active").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
  ...timestamps,
}, (table) => [
  index("treasury_budgets_treasury_status_idx").on(table.treasuryId, table.status, table.periodEnd),
]);

export const treasuryProposals = pgTable("treasury_proposals", {
  id: uuid("id").primaryKey().defaultRandom(),
  treasuryId: uuid("treasury_id").references(() => communityTreasuries.id, { onDelete: "cascade" }).notNull(),
  budgetId: uuid("budget_id").references(() => treasuryBudgets.id, { onDelete: "set null" }),
  creatorUserId: uuid("creator_user_id").references(() => users.id, { onDelete: "set null" }),
  tokenId: uuid("token_id").references(() => tokens.id, { onDelete: "restrict" }).notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  recipientAddress: text("recipient_address").notNull(),
  amountAtomic: numeric("amount_atomic", { precision: 78, scale: 0 }).notNull(),
  status: text("status").default("pending").notNull(),
  approvalsRequired: integer("approvals_required").default(1).notNull(),
  approvalCount: integer("approval_count").default(0).notNull(),
  transferId: uuid("transfer_id").references(() => walletTransfers.id, { onDelete: "set null" }),
  transactionHash: text("transaction_hash"),
  proofUrl: text("proof_url"),
  executedAt: timestamp("executed_at", { withTimezone: true }),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
  ...timestamps,
}, (table) => [
  uniqueIndex("treasury_proposals_transfer_unique").on(table.transferId),
  index("treasury_proposals_treasury_status_idx").on(table.treasuryId, table.status, table.createdAt),
  index("treasury_proposals_budget_idx").on(table.budgetId, table.createdAt),
]);

export const treasuryApprovals = pgTable("treasury_approvals", {
  id: uuid("id").primaryKey().defaultRandom(),
  proposalId: uuid("proposal_id").references(() => treasuryProposals.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  decision: text("decision").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("treasury_approvals_proposal_user_unique").on(table.proposalId, table.userId),
  index("treasury_approvals_proposal_idx").on(table.proposalId, table.createdAt),
]);

export const escrowAgreements = pgTable("escrow_agreements", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  clientUserId: uuid("client_user_id").references(() => users.id, { onDelete: "set null" }),
  tokenId: uuid("token_id").references(() => tokens.id, { onDelete: "restrict" }).notNull(),
  name: text("name").notNull(),
  status: text("status").default("awaiting_funding").notNull(),
  clientAddress: text("client_address").notNull(),
  providerAddress: text("provider_address").notNull(),
  refundAddress: text("refund_address").notNull(),
  arbitratorAddress: text("arbitrator_address").notNull(),
  contractDealId: text("contract_deal_id").notNull(),
  contractAddress: text("contract_address"),
  termsHash: text("terms_hash").notNull(),
  totalAmountAtomic: numeric("total_amount_atomic", { precision: 78, scale: 0 }).notNull(),
  releasedAmountAtomic: numeric("released_amount_atomic", { precision: 78, scale: 0 }).default("0").notNull(),
  refundedAmountAtomic: numeric("refunded_amount_atomic", { precision: 78, scale: 0 }).default("0").notNull(),
  milestoneCount: integer("milestone_count").notNull(),
  nextMilestone: integer("next_milestone").default(0).notNull(),
  fundingTransactionHash: text("funding_transaction_hash"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
  ...timestamps,
}, (table) => [
  uniqueIndex("escrow_agreements_contract_deal_unique").on(table.contractDealId),
  index("escrow_agreements_project_status_idx").on(table.projectId, table.status, table.createdAt),
  index("escrow_agreements_client_idx").on(table.clientUserId, table.createdAt),
]);

export const escrowMilestones = pgTable("escrow_milestones", {
  id: uuid("id").primaryKey().defaultRandom(),
  agreementId: uuid("agreement_id").references(() => escrowAgreements.id, { onDelete: "cascade" }).notNull(),
  position: integer("position").notNull(),
  title: text("title").notNull(),
  amountAtomic: numeric("amount_atomic", { precision: 78, scale: 0 }).notNull(),
  dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
  status: text("status").default("pending").notNull(),
  proofHash: text("proof_hash"),
  submissionTransactionHash: text("submission_transaction_hash"),
  settlementTransactionHash: text("settlement_transaction_hash"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  settledAt: timestamp("settled_at", { withTimezone: true }),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
  ...timestamps,
}, (table) => [
  uniqueIndex("escrow_milestones_agreement_position_unique").on(table.agreementId, table.position),
  index("escrow_milestones_status_due_idx").on(table.status, table.dueAt),
]);

export const merchantAccounts = pgTable("merchant_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  ownerUserId: uuid("owner_user_id").references(() => users.id, { onDelete: "set null" }),
  displayName: text("display_name").notNull(),
  slug: text("slug").notNull(),
  description: text("description"),
  logoUrl: text("logo_url"),
  settlementAddress: text("settlement_address").notNull(),
  status: text("status").default("active").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
  ...timestamps,
}, (table) => [
  uniqueIndex("merchant_accounts_project_unique").on(table.projectId),
  uniqueIndex("merchant_accounts_slug_unique").on(table.slug),
  index("merchant_accounts_owner_idx").on(table.ownerUserId, table.createdAt),
]);

export const checkoutLinks = pgTable("checkout_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  merchantId: uuid("merchant_id").references(() => merchantAccounts.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  slug: text("slug").notNull(),
  amountAtomic: numeric("amount_atomic", { precision: 78, scale: 0 }).notNull(),
  currency: text("currency").default("USDC").notNull(),
  status: text("status").default("active").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  successUrl: text("success_url"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
  ...timestamps,
}, (table) => [
  uniqueIndex("checkout_links_slug_unique").on(table.slug),
  index("checkout_links_merchant_status_idx").on(table.merchantId, table.status, table.createdAt),
]);

export const checkoutPayments = pgTable("checkout_payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  checkoutId: uuid("checkout_id").references(() => checkoutLinks.id, { onDelete: "restrict" }).notNull(),
  customerUserId: uuid("customer_user_id").references(() => users.id, { onDelete: "set null" }),
  customerWalletId: text("customer_wallet_id"),
  customerAddress: text("customer_address").notNull(),
  merchantAddress: text("merchant_address").notNull(),
  amountAtomic: numeric("amount_atomic", { precision: 78, scale: 0 }).notNull(),
  status: text("status").default("created").notNull(),
  paymentChallengeId: text("payment_challenge_id"),
  paymentTransactionHash: text("payment_transaction_hash"),
  refundChallengeId: text("refund_challenge_id"),
  refundTransactionHash: text("refund_transaction_hash"),
  receiptNumber: text("receipt_number").notNull(),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  refundedAt: timestamp("refunded_at", { withTimezone: true }),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
  ...timestamps,
}, (table) => [
  uniqueIndex("checkout_payments_receipt_unique").on(table.receiptNumber),
  index("checkout_payments_checkout_status_idx").on(table.checkoutId, table.status, table.createdAt),
  index("checkout_payments_customer_idx").on(table.customerUserId, table.createdAt),
]);

export const checkoutSplits = pgTable("checkout_splits", {
  id: uuid("id").primaryKey().defaultRandom(),
  checkoutId: uuid("checkout_id").references(() => checkoutLinks.id, { onDelete: "cascade" }).notNull(),
  position: integer("position").notNull(),
  kind: text("kind").notNull(),
  label: text("label").notNull(),
  recipientAddress: text("recipient_address"),
  basisPoints: integer("basis_points").notNull(),
  status: text("status").default("active").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
  ...timestamps,
}, (table) => [
  uniqueIndex("checkout_splits_checkout_position_unique").on(table.checkoutId, table.position),
  index("checkout_splits_checkout_status_idx").on(table.checkoutId, table.status),
]);

export const checkoutSettlementReceipts = pgTable("checkout_settlement_receipts", {
  id: uuid("id").primaryKey().defaultRandom(),
  paymentId: uuid("payment_id").references(() => checkoutPayments.id, { onDelete: "cascade" }).notNull(),
  splitId: uuid("split_id").references(() => checkoutSplits.id, { onDelete: "set null" }),
  position: integer("position").notNull(),
  kind: text("kind").notNull(),
  label: text("label").notNull(),
  recipientAddress: text("recipient_address").notNull(),
  basisPoints: integer("basis_points").notNull(),
  amountAtomic: numeric("amount_atomic", { precision: 78, scale: 0 }).notNull(),
  transactionHash: text("transaction_hash").notNull(),
  settledAt: timestamp("settled_at", { withTimezone: true }).notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
  ...timestamps,
}, (table) => [
  uniqueIndex("checkout_settlement_receipts_payment_position_unique").on(table.paymentId, table.position),
  index("checkout_settlement_receipts_recipient_idx").on(table.recipientAddress, table.settledAt),
]);

export const socialPaymentRequests = pgTable("social_payment_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  creatorUserId: uuid("creator_user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  recipientUserId: uuid("recipient_user_id").references(() => users.id, { onDelete: "set null" }),
  slug: text("slug").notNull(),
  kind: text("kind").notNull(),
  title: text("title").notNull(),
  note: text("note"),
  recipientAddress: text("recipient_address").notNull(),
  amountAtomic: numeric("amount_atomic", { precision: 78, scale: 0 }).notNull(),
  paidAmountAtomic: numeric("paid_amount_atomic", { precision: 78, scale: 0 }).default("0").notNull(),
  currency: text("currency").default("USDC").notNull(),
  status: text("status").default("active").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
  ...timestamps,
}, (table) => [
  uniqueIndex("social_payment_requests_slug_unique").on(table.slug),
  index("social_payment_requests_creator_idx").on(table.creatorUserId, table.createdAt),
  index("social_payment_requests_recipient_idx").on(table.recipientUserId, table.createdAt),
  index("social_payment_requests_status_idx").on(table.status, table.expiresAt),
]);

export const socialPaymentShares = pgTable("social_payment_shares", {
  id: uuid("id").primaryKey().defaultRandom(),
  requestId: uuid("request_id").references(() => socialPaymentRequests.id, { onDelete: "cascade" }).notNull(),
  publicTokenHash: text("public_token_hash").notNull(),
  label: text("label"),
  amountAtomic: numeric("amount_atomic", { precision: 78, scale: 0 }).notNull(),
  status: text("status").default("open").notNull(),
  payerUserId: uuid("payer_user_id").references(() => users.id, { onDelete: "set null" }),
  payerWalletId: text("payer_wallet_id"),
  payerAddress: text("payer_address"),
  paymentChallengeId: text("payment_challenge_id"),
  transactionHash: text("transaction_hash"),
  receiptNumber: text("receipt_number").notNull(),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
  ...timestamps,
}, (table) => [
  uniqueIndex("social_payment_shares_token_unique").on(table.publicTokenHash),
  uniqueIndex("social_payment_shares_receipt_unique").on(table.receiptNumber),
  uniqueIndex("social_payment_shares_transaction_unique").on(table.transactionHash),
  index("social_payment_shares_request_status_idx").on(table.requestId, table.status, table.createdAt),
  index("social_payment_shares_payer_idx").on(table.payerUserId, table.createdAt),
]);

export const subscriptionPlans = pgTable("subscription_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  merchantId: uuid("merchant_id").references(() => merchantAccounts.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  slug: text("slug").notNull(),
  amountAtomic: numeric("amount_atomic", { precision: 78, scale: 0 }).notNull(),
  currency: text("currency").default("USDC").notNull(),
  intervalDays: integer("interval_days").notNull(),
  status: text("status").default("active").notNull(),
  successUrl: text("success_url"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
  ...timestamps,
}, (table) => [
  uniqueIndex("subscription_plans_slug_unique").on(table.slug),
  index("subscription_plans_merchant_status_idx").on(table.merchantId, table.status, table.createdAt),
]);

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  planId: uuid("plan_id").references(() => subscriptionPlans.id, { onDelete: "restrict" }).notNull(),
  subscriberUserId: uuid("subscriber_user_id").references(() => users.id, { onDelete: "set null" }),
  subscriberWalletId: text("subscriber_wallet_id"),
  subscriberAddress: text("subscriber_address").notNull(),
  merchantAddress: text("merchant_address").notNull(),
  status: text("status").default("authorizing").notNull(),
  cycleCount: integer("cycle_count").default(0).notNull(),
  currentPeriodStart: timestamp("current_period_start", { withTimezone: true }),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
  ...timestamps,
}, (table) => [
  uniqueIndex("subscriptions_plan_subscriber_unique").on(table.planId, table.subscriberAddress),
  index("subscriptions_plan_status_idx").on(table.planId, table.status, table.createdAt),
  index("subscriptions_subscriber_idx").on(table.subscriberUserId, table.createdAt),
]);

export const subscriptionPayments = pgTable("subscription_payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  subscriptionId: uuid("subscription_id").references(() => subscriptions.id, { onDelete: "restrict" }).notNull(),
  periodNumber: integer("period_number").notNull(),
  amountAtomic: numeric("amount_atomic", { precision: 78, scale: 0 }).notNull(),
  status: text("status").default("created").notNull(),
  challengeId: text("challenge_id"),
  transactionHash: text("transaction_hash"),
  receiptNumber: text("receipt_number").notNull(),
  dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
  ...timestamps,
}, (table) => [
  uniqueIndex("subscription_payments_subscription_period_unique").on(table.subscriptionId, table.periodNumber),
  uniqueIndex("subscription_payments_receipt_unique").on(table.receiptNumber),
  index("subscription_payments_status_due_idx").on(table.status, table.dueAt),
]);

export const subscriptionNotices = pgTable("subscription_notices", {
  id: uuid("id").primaryKey().defaultRandom(),
  subscriptionId: uuid("subscription_id").references(() => subscriptions.id, { onDelete: "cascade" }).notNull(),
  periodNumber: integer("period_number").notNull(),
  kind: text("kind").notNull(),
  status: text("status").default("open").notNull(),
  dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
  acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
  ...timestamps,
}, (table) => [
  uniqueIndex("subscription_notices_cycle_kind_unique").on(table.subscriptionId, table.periodNumber, table.kind),
  index("subscription_notices_status_due_idx").on(table.status, table.dueAt),
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
  availableAt: timestamp("available_at", { withTimezone: true }),
  status: claimStatus("status").default("available").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  ...timestamps,
}, (table) => [
  index("allocations_distribution_status_idx").on(table.distributionId, table.status),
  index("allocations_identity_idx").on(table.identityType, table.identityHash),
]);

export const campaignDeliveries = pgTable("campaign_deliveries", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  distributionId: uuid("distribution_id").references(() => distributions.id, { onDelete: "cascade" }).notNull(),
  allocationId: uuid("allocation_id").references(() => allocations.id, { onDelete: "cascade" }).notNull(),
  identityType: text("identity_type").notNull(),
  maskedIdentity: text("masked_identity").notNull(),
  recipientCiphertext: text("recipient_ciphertext"),
  claimUrlCiphertext: text("claim_url_ciphertext").notNull(),
  channel: text("channel").default("unassigned").notNull(),
  status: text("status").default("ready").notNull(),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  providerMessageId: text("provider_message_id"),
  attemptCount: integer("attempt_count").default(0).notNull(),
  lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  failedAt: timestamp("failed_at", { withTimezone: true }),
  failureCode: text("failure_code"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
  ...timestamps,
}, (table) => [
  uniqueIndex("campaign_deliveries_allocation_unique").on(table.allocationId),
  index("campaign_deliveries_project_status_idx").on(table.projectId, table.status, table.createdAt),
  index("campaign_deliveries_distribution_idx").on(table.distributionId, table.createdAt),
  index("campaign_deliveries_provider_message_idx").on(table.providerMessageId),
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

export const campaignDestinationClicks = pgTable("campaign_destination_clicks", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  distributionId: uuid("distribution_id").references(() => distributions.id, { onDelete: "cascade" }).notNull(),
  allocationId: uuid("allocation_id").references(() => allocations.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  destinationOrigin: text("destination_origin").notNull(),
  openCount: integer("open_count").default(1).notNull(),
  firstOpenedAt: timestamp("first_opened_at", { withTimezone: true }).defaultNow().notNull(),
  lastOpenedAt: timestamp("last_opened_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("campaign_destination_clicks_allocation_unique").on(table.allocationId),
  index("campaign_destination_clicks_project_idx").on(table.projectId, table.lastOpenedAt),
  index("campaign_destination_clicks_distribution_idx").on(table.distributionId, table.lastOpenedAt),
]);

export const vestingBatches = pgTable("vesting_batches", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  creatorUserId: uuid("creator_user_id").references(() => users.id, { onDelete: "set null" }),
  distributionId: uuid("distribution_id").references(() => distributions.id, { onDelete: "restrict" }).notNull(),
  publicSlug: text("public_slug").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  status: text("status").default("awaiting_funding").notNull(),
  cliffAt: timestamp("cliff_at", { withTimezone: true }).notNull(),
  releaseCount: integer("release_count").notNull(),
  intervalDays: integer("interval_days").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
  ...timestamps,
}, (table) => [
  uniqueIndex("vesting_batches_distribution_unique").on(table.distributionId),
  uniqueIndex("vesting_batches_slug_unique").on(table.publicSlug),
  index("vesting_batches_project_status_idx").on(table.projectId, table.status, table.createdAt),
]);

export const vestingSchedules = pgTable("vesting_schedules", {
  id: uuid("id").primaryKey().defaultRandom(),
  batchId: uuid("batch_id").references(() => vestingBatches.id, { onDelete: "cascade" }).notNull(),
  displayName: text("display_name").notNull(),
  identityType: text("identity_type").notNull(),
  identityHash: text("identity_hash").notNull(),
  identityCiphertext: text("identity_ciphertext").notNull(),
  maskedIdentity: text("masked_identity").notNull(),
  accessTokenHash: text("access_token_hash").notNull(),
  accessTokenCiphertext: text("access_token_ciphertext").notNull(),
  totalAmountAtomic: numeric("total_amount_atomic", { precision: 78, scale: 0 }).notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
  ...timestamps,
}, (table) => [
  uniqueIndex("vesting_schedules_batch_identity_unique").on(table.batchId, table.identityHash),
  uniqueIndex("vesting_schedules_access_unique").on(table.accessTokenHash),
  index("vesting_schedules_batch_idx").on(table.batchId, table.createdAt),
]);

export const vestingTranches = pgTable("vesting_tranches", {
  id: uuid("id").primaryKey().defaultRandom(),
  scheduleId: uuid("schedule_id").references(() => vestingSchedules.id, { onDelete: "cascade" }).notNull(),
  allocationId: uuid("allocation_id").references(() => allocations.id, { onDelete: "cascade" }).notNull(),
  position: integer("position").notNull(),
  unlockAt: timestamp("unlock_at", { withTimezone: true }).notNull(),
  amountAtomic: numeric("amount_atomic", { precision: 78, scale: 0 }).notNull(),
  claimTokenCiphertext: text("claim_token_ciphertext").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
  ...timestamps,
}, (table) => [
  uniqueIndex("vesting_tranches_allocation_unique").on(table.allocationId),
  uniqueIndex("vesting_tranches_schedule_position_unique").on(table.scheduleId, table.position),
  index("vesting_tranches_schedule_unlock_idx").on(table.scheduleId, table.unlockAt),
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

export const campaignQualityPolicies = pgTable("campaign_quality_policies", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  distributionId: uuid("distribution_id").references(() => distributions.id, { onDelete: "cascade" }).notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  reviewThreshold: integer("review_threshold").default(45).notNull(),
  holdThreshold: integer("hold_threshold").default(70).notNull(),
  burstWindowMinutes: integer("burst_window_minutes").default(10).notNull(),
  burstReferralCount: integer("burst_referral_count").default(8).notNull(),
  minimumAccountAgeMinutes: integer("minimum_account_age_minutes").default(60).notNull(),
  minimumActivationDelaySeconds: integer("minimum_activation_delay_seconds").default(30).notNull(),
  action: text("action").default("review").notNull(),
  updatedByUserId: uuid("updated_by_user_id").references(() => users.id, { onDelete: "set null" }),
  ...timestamps,
}, (table) => [
  uniqueIndex("campaign_quality_policies_distribution_unique").on(table.distributionId),
  index("campaign_quality_policies_project_idx").on(table.projectId, table.updatedAt),
]);

export const participantQualityAssessments = pgTable("participant_quality_assessments", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  distributionId: uuid("distribution_id").references(() => distributions.id, { onDelete: "cascade" }).notNull(),
  referralId: uuid("referral_id").references(() => referrals.id, { onDelete: "cascade" }).notNull(),
  subjectUserId: uuid("subject_user_id").references(() => users.id, { onDelete: "set null" }),
  score: integer("score").notNull(),
  band: text("band").notNull(),
  decision: text("decision").notNull(),
  signals: jsonb("signals").$type<Array<{ id: string; weight: number; evidence: string }>>().default([]).notNull(),
  policySnapshot: jsonb("policy_snapshot").$type<Record<string, unknown>>().default({}).notNull(),
  evaluatedAt: timestamp("evaluated_at", { withTimezone: true }).defaultNow().notNull(),
  ...timestamps,
}, (table) => [
  uniqueIndex("participant_quality_referral_unique").on(table.referralId),
  index("participant_quality_project_decision_idx").on(table.projectId, table.decision, table.evaluatedAt),
  index("participant_quality_distribution_idx").on(table.distributionId, table.evaluatedAt),
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

export const agentSettlementHandoffs = pgTable("agent_settlement_handoffs", {
  id: uuid("id").primaryKey().defaultRandom(),
  actionId: uuid("action_id").references(() => agentActions.id, { onDelete: "cascade" }).notNull(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  distributionId: uuid("distribution_id").references(() => distributions.id, { onDelete: "cascade" }).notNull(),
  reviewerUserId: uuid("reviewer_user_id").references(() => users.id, { onDelete: "set null" }),
  status: text("status").default("awaiting_settlement").notNull(),
  approvalChallengeId: text("approval_challenge_id"),
  fundingChallengeId: text("funding_challenge_id"),
  transactionHash: text("transaction_hash"),
  failureCode: text("failure_code"),
  evidence: jsonb("evidence").$type<Record<string, unknown>>().default({}).notNull(),
  settledAt: timestamp("settled_at", { withTimezone: true }),
  ...timestamps,
}, (table) => [
  uniqueIndex("agent_settlement_action_unique").on(table.actionId),
  uniqueIndex("agent_settlement_distribution_unique").on(table.distributionId),
  index("agent_settlement_project_status_idx").on(table.projectId, table.status, table.createdAt),
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

export const gatewayFundingIntents = pgTable("gateway_funding_intents", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  distributionId: uuid("distribution_id").references(() => distributions.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  sourceChain: text("source_chain").notNull(),
  sourceDomain: integer("source_domain").notNull(),
  sourceUsdcAddress: text("source_usdc_address").notNull(),
  destinationAddress: text("destination_address").notNull(),
  amountAtomic: numeric("amount_atomic", { precision: 78, scale: 0 }).notNull(),
  maxFeeAtomic: numeric("max_fee_atomic", { precision: 78, scale: 0 }).default("0").notNull(),
  status: text("status").default("created").notNull(),
  idempotencyKey: text("idempotency_key").notNull(),
  sourceWalletId: text("source_wallet_id"),
  sourceWalletAddress: text("source_wallet_address"),
  walletChallengeId: text("wallet_challenge_id"),
  approvalChallengeId: text("approval_challenge_id"),
  depositChallengeId: text("deposit_challenge_id"),
  signChallengeId: text("sign_challenge_id"),
  mintChallengeId: text("mint_challenge_id"),
  depositTransactionHash: text("deposit_transaction_hash"),
  transferId: text("transfer_id"),
  mintTransactionHash: text("mint_transaction_hash"),
  campaignFundingTransactionHash: text("campaign_funding_transaction_hash"),
  typedData: jsonb("typed_data").$type<Record<string, unknown>>(),
  evidence: jsonb("evidence").$type<Record<string, unknown>>().default({}).notNull(),
  failureCode: text("failure_code"),
  ...timestamps,
}, (table) => [
  uniqueIndex("gateway_funding_project_key_unique").on(table.projectId, table.idempotencyKey),
  index("gateway_funding_distribution_idx").on(table.distributionId, table.createdAt),
  index("gateway_funding_status_idx").on(table.status, table.updatedAt),
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

export const pilotInvitations = pgTable("pilot_invitations", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  createdByUserId: uuid("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
  publicSlug: text("public_slug").notNull(),
  name: text("name").notNull(),
  summary: text("summary").notNull(),
  status: text("status").default("active").notNull(),
  integrationMode: text("integration_mode").default("hosted-links").notNull(),
  requestedIntegrations: jsonb("requested_integrations").$type<string[]>().default([]).notNull(),
  targetRecipients: integer("target_recipients").default(100).notNull(),
  maxApplications: integer("max_applications").default(25).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  ...timestamps,
}, (table) => [
  uniqueIndex("pilot_invitations_public_slug_unique").on(table.publicSlug),
  index("pilot_invitations_project_status_idx").on(table.projectId, table.status, table.createdAt),
]);

export const pilotApplications = pgTable("pilot_applications", {
  id: uuid("id").primaryKey().defaultRandom(),
  invitationId: uuid("invitation_id").references(() => pilotInvitations.id, { onDelete: "cascade" }).notNull(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  pilotId: uuid("pilot_id").references(() => pilotEngagements.id, { onDelete: "set null" }),
  publicSlug: text("public_slug").notNull(),
  organizationName: text("organization_name").notNull(),
  websiteUrl: text("website_url"),
  applicantName: text("applicant_name").notNull(),
  applicantRole: text("applicant_role").notNull(),
  contactHash: text("contact_hash").notNull(),
  contactCiphertext: text("contact_ciphertext").notNull(),
  statusSecretHash: text("status_secret_hash").notNull(),
  useCase: text("use_case").notNull(),
  audienceDescription: text("audience_description").notNull(),
  expectedRecipients: integer("expected_recipients").default(100).notNull(),
  integrationMode: text("integration_mode").default("hosted-links").notNull(),
  requestedIntegrations: jsonb("requested_integrations").$type<string[]>().default([]).notNull(),
  readiness: jsonb("readiness").$type<Record<string, unknown>>().default({}).notNull(),
  status: text("status").default("submitted").notNull(),
  reviewNotes: text("review_notes"),
  reviewedByUserId: uuid("reviewed_by_user_id").references(() => users.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  ...timestamps,
}, (table) => [
  uniqueIndex("pilot_applications_public_slug_unique").on(table.publicSlug),
  uniqueIndex("pilot_applications_invite_contact_unique").on(table.invitationId, table.contactHash),
  index("pilot_applications_project_status_idx").on(table.projectId, table.status, table.createdAt),
  index("pilot_applications_invitation_idx").on(table.invitationId, table.createdAt),
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

export const serviceIncidents = pgTable("service_incidents", {
  id: uuid("id").primaryKey().defaultRandom(),
  incidentKey: text("incident_key").notNull(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  severity: text("severity").default("minor").notNull(),
  status: text("status").default("investigating").notNull(),
  affectedComponents: jsonb("affected_components").$type<string[]>().default([]).notNull(),
  createdByUserId: uuid("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
  acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  latestUpdateAt: timestamp("latest_update_at", { withTimezone: true }).defaultNow().notNull(),
  ...timestamps,
}, (table) => [
  uniqueIndex("service_incidents_key_unique").on(table.incidentKey),
  index("service_incidents_status_started_idx").on(table.status, table.startedAt),
]);

export const incidentUpdates = pgTable("incident_updates", {
  id: uuid("id").primaryKey().defaultRandom(),
  incidentId: uuid("incident_id").references(() => serviceIncidents.id, { onDelete: "cascade" }).notNull(),
  status: text("status").notNull(),
  message: text("message").notNull(),
  createdByUserId: uuid("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("incident_updates_incident_created_idx").on(table.incidentId, table.createdAt)]);
