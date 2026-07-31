export type CurrentRecipient = {
  identityType: "email" | "wallet" | "x" | "game" | "custom";
  identity: string;
  amount: string;
};

export type CreateDistributionInput = {
  name: string;
  tokenAddress?: string;
  recipients: CurrentRecipient[];
  expiresInHours?: number;
  activationEvent?: string;
  referralReward?: string;
  mode?: "allowlist" | "identity-bound";
};

export type CreatedDistribution = {
  id: string;
  status: string;
  name: string;
  asset: { address: string; symbol: string; name: string; decimals: number };
  recipientCount: number;
  totalAmount: string;
  totalAmountAtomic: string;
  merkleRoot: string;
  claimMode: "allowlist" | "identity-bound";
  expiresAt: string;
  links: Array<{
    identity: string;
    identityType: string;
    amount: string;
    claimUrl: string;
  }>;
};

export type ActivationInput = {
  externalEventId: string;
  eventType: string;
  distributionId: string;
  walletAddress: `0x${string}`;
  occurredAt?: string;
  payload?: Record<string, unknown>;
};

export type ActivationResult = {
  id?: string;
  duplicate: boolean;
  status: "accepted";
  attributedReferrals?: number;
  createdAt?: string;
};

export type IdentityAttestationInput = {
  externalEventId: string;
  distributionId: string;
  identityType: "x" | "game" | "custom";
  identity: string;
  walletAddress: `0x${string}`;
  provider?: string;
  expiresInMinutes?: number;
  evidence?: {
    method?: string;
    provider?: string;
    verifiedAt?: string;
    scope?: string;
  };
};

export type IdentityAttestationResult = {
  id: string;
  duplicate: boolean;
  status: "verified" | "consumed" | "expired";
  identityType: string;
  walletAddress: string;
  expiresAt: string;
  createdAt?: string;
};

export type DeveloperAnalytics = {
  totals: { campaigns: number; recipients: number; claims: number; activations: number };
  campaigns: Array<{
    id: string;
    name: string;
    status: string;
    recipientCount: number;
    claims: number;
    activations: number;
  }>;
};

export type EvidenceReport = {
  id: string;
  publicSlug: string;
  schemaVersion: string;
  digest: string;
  distributionId: string | null;
  readinessScore: number;
  snapshot: Record<string, unknown>;
  createdAt: string;
};

export type EvidenceReportSummary = Omit<EvidenceReport, "snapshot"> & {
  project: { name: string; slug: string };
  totals: { campaigns: number; recipients: number; claims: number; activations: number };
};

export type CreatePilotInput = {
  partnerName: string;
  partnerWebsite?: string;
  useCase: string;
  integrationMode?: "hosted-links" | "react-embed" | "server-sdk" | "agent-api";
  targetRecipients?: number;
  targetClaimRate?: number;
  targetActivationRate?: number;
  requestedIntegrations?: string[];
  dueAt?: string;
  notes?: string;
};

export type PilotRecord = {
  id: string;
  publicSlug: string;
  partnerName: string;
  partnerWebsite: string | null;
  useCase: string;
  status: "onboarding" | "ready" | "live" | "measuring" | "complete";
  integrationMode: string;
  requestedIntegrations: string[];
  targets: { recipients: number; claimRate: number; activationRate: number };
  readinessScore: number;
  targetMet: boolean;
  milestones: Array<{ id: string; label: string; passed: boolean; evidence: string }>;
  campaign: {
    id: string;
    name: string;
    status: string;
    recipientCount: number;
    fundingTxHash: string | null;
    claims: number;
    activations: number;
    claimRate: number;
    activationRate: number;
  } | null;
  attestation: {
    signerName: string;
    signerRole: string;
    statement: string;
    digest: string;
    attestedAt: string;
  } | null;
  dueAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type CurrentEnvelope<T> = {
  ok: boolean;
  data?: T;
  error?: { code: string; message: string; details?: unknown };
  meta?: { requestId: string; timestamp: string; version: string };
};

export class CurrentError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly requestId?: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "CurrentError";
  }
}

export type CurrentOptions = {
  apiKey: string;
  signingSecret: string;
  baseUrl?: string;
  fetch?: typeof globalThis.fetch;
};

function normalizeBaseUrl(value: string) {
  return value.replace(/\/+$/, "");
}

function base64Url(bytes: ArrayBuffer) {
  let binary = "";
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

async function signature(secret: string, timestamp: string, body: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return base64Url(await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${body}`),
  ));
}

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = await response.json() as CurrentEnvelope<T>;
  if (!response.ok || !payload.ok || payload.data === undefined) {
    throw new CurrentError(
      payload.error?.code ?? "CURRENT_REQUEST_FAILED",
      payload.error?.message ?? `Current CoFi returned HTTP ${response.status}.`,
      response.status,
      payload.meta?.requestId,
      payload.error?.details,
    );
  }
  return payload.data;
}

export class Current {
  private readonly apiKey: string;
  private readonly signingSecret: string;
  private readonly baseUrl: string;
  private readonly request: typeof globalThis.fetch;

  readonly distributions = {
    create: (input: CreateDistributionInput) => this.signedPost<CreatedDistribution>(
      "/api/v1/developer/distributions",
      input,
    ),
  };

  readonly activations = {
    submit: (input: ActivationInput) => this.signedPost<ActivationResult>(
      "/api/v1/developer/activations",
      {
        ...input,
        occurredAt: input.occurredAt ?? new Date().toISOString(),
        payload: input.payload ?? {},
      },
    ),
  };

  readonly identities = {
    attest: (input: IdentityAttestationInput) => this.signedPost<IdentityAttestationResult>(
      "/api/v1/developer/identity-attestations",
      input,
    ),
  };

  readonly analytics = {
    get: () => this.get<DeveloperAnalytics>("/api/v1/developer/analytics"),
  };

  readonly evidence = {
    list: () => this.get<{ reports: EvidenceReportSummary[] }>("/api/v1/developer/evidence"),
    create: (input: { distributionId?: string } = {}) => this.signedPost<EvidenceReport>(
      "/api/v1/developer/evidence",
      input,
    ),
  };

  readonly pilots = {
    list: () => this.get<{ pilots: PilotRecord[] }>("/api/v1/developer/pilots"),
    create: (input: CreatePilotInput) => this.signedPost<PilotRecord>(
      "/api/v1/developer/pilots",
      input,
    ),
    update: (pilotId: string, input: {
      distributionId?: string | null;
      notes?: string;
      dueAt?: string | null;
      requestedIntegrations?: string[];
    }) => this.signedPost<PilotRecord>(
      "/api/v1/developer/pilots",
      { action: "update", pilotId, ...input },
    ),
  };

  constructor(options: CurrentOptions) {
    if (!options.apiKey || !options.signingSecret) {
      throw new Error("Current requires apiKey and signingSecret.");
    }
    this.apiKey = options.apiKey;
    this.signingSecret = options.signingSecret;
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? "https://www.currentco.finance");
    this.request = options.fetch ?? globalThis.fetch;
  }

  private async get<T>(path: string) {
    const response = await this.request(`${this.baseUrl}${path}`, {
      headers: {
        accept: "application/json",
        authorization: `Bearer ${this.apiKey}`,
      },
    });
    return parseResponse<T>(response);
  }

  private async signedPost<T>(path: string, value: unknown) {
    const body = JSON.stringify(value);
    const timestamp = Date.now().toString();
    const signed = await signature(this.signingSecret, timestamp, body);
    const response = await this.request(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${this.apiKey}`,
        "content-type": "application/json",
        "x-current-signature": signed,
        "x-current-timestamp": timestamp,
      },
      body,
    });
    return parseResponse<T>(response);
  }
}

export async function verifyCurrentWebhook(input: {
  secret: string;
  timestamp: string;
  signature: string;
  rawBody: string;
  toleranceMs?: number;
}) {
  const timestamp = Number(input.timestamp);
  if (!Number.isFinite(timestamp) || Math.abs(Date.now() - timestamp) > (input.toleranceMs ?? 300_000)) {
    return false;
  }
  const expected = await signature(input.secret, input.timestamp, input.rawBody);
  if (expected.length !== input.signature.length) return false;
  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) {
    difference |= expected.charCodeAt(index) ^ input.signature.charCodeAt(index);
  }
  return difference === 0;
}
