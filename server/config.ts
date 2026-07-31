export const ARC_TESTNET = {
  network: "ARC-TESTNET",
  chainId: 5_042_002,
  circleChainCode: "ARC-TESTNET",
  gatewayDomain: 26,
  usdcAddress: "0x3600000000000000000000000000000000000000",
  explorerUrl: "https://testnet.arcscan.app",
} as const;

export type ServerConfig = {
  NODE_ENV: "development" | "test" | "production";
  DATABASE_URL?: string;
  CIRCLE_API_KEY?: string;
  CIRCLE_APP_ID?: string;
  CIRCLE_ENTITY_SECRET?: string;
  GOOGLE_OAUTH_CLIENT_ID?: string;
  CIRCLE_EMAIL_OTP_ENABLED: boolean;
  CURRENT_COFI_INTERNAL_SECRET?: string;
  CLAIM_SIGNING_SECRET?: string;
  CURRENT_CLAIM_AUTHORIZER_PRIVATE_KEY?: `0x${string}`;
  CURRENT_CLAIM_VAULT_ADDRESS?: `0x${string}`;
  CURRENT_CAMPAIGN_VAULT_ADDRESS?: `0x${string}`;
  CURRENT_TOKEN_ADDRESS?: `0x${string}`;
  CURRENT_LOCK_VAULT_ADDRESS?: `0x${string}`;
  CURRENT_FEE_ROUTER_ADDRESS?: `0x${string}`;
  CURRENT_ACCESS_MANAGER_ADDRESS?: `0x${string}`;
  CURRENT_BUYBACK_GOVERNOR_ADDRESS?: `0x${string}`;
  CURRENT_TESTNET_EXCHANGE_ADAPTER_ADDRESS?: `0x${string}`;
  CURRENT_GOVERNANCE_GUARDIAN_ADDRESS?: `0x${string}`;
  CURRENT_PROTOCOL_DEPLOYER_PRIVATE_KEY?: `0x${string}`;
  ARC_RPC_URL: string;
};

function optional(name: string) {
  const value = process.env[name]?.trim();
  return value || undefined;
}

function secret(name: string) {
  const value = optional(name);
  if (value && value.length < 32) throw new Error(`${name} must contain at least 32 characters.`);
  return value;
}

function enabled(name: string) {
  return optional(name)?.toLowerCase() === "true";
}

let cachedConfig: ServerConfig | undefined;

export function getServerConfig(): ServerConfig {
  if (!cachedConfig) {
    const rawEnvironment = process.env.NODE_ENV;
    const NODE_ENV = rawEnvironment === "production" || rawEnvironment === "test"
      ? rawEnvironment
      : "development";
    const ARC_RPC_URL = optional("ARC_RPC_URL") ?? "https://rpc.testnet.arc.network";
    new URL(ARC_RPC_URL);
    cachedConfig = {
      NODE_ENV,
      ARC_RPC_URL,
      DATABASE_URL: optional("DATABASE_URL"),
      CIRCLE_API_KEY: optional("CIRCLE_API_KEY"),
      CIRCLE_APP_ID: optional("CIRCLE_APP_ID"),
      CIRCLE_ENTITY_SECRET: optional("CIRCLE_ENTITY_SECRET"),
      GOOGLE_OAUTH_CLIENT_ID: optional("GOOGLE_OAUTH_CLIENT_ID"),
      CIRCLE_EMAIL_OTP_ENABLED: enabled("CIRCLE_EMAIL_OTP_ENABLED"),
      CURRENT_COFI_INTERNAL_SECRET: secret("CURRENT_COFI_INTERNAL_SECRET"),
      CLAIM_SIGNING_SECRET: secret("CLAIM_SIGNING_SECRET"),
      CURRENT_CLAIM_AUTHORIZER_PRIVATE_KEY: optional("CURRENT_CLAIM_AUTHORIZER_PRIVATE_KEY") as `0x${string}` | undefined,
      CURRENT_CLAIM_VAULT_ADDRESS: optional("CURRENT_CLAIM_VAULT_ADDRESS") as `0x${string}` | undefined,
      CURRENT_CAMPAIGN_VAULT_ADDRESS: optional("CURRENT_CAMPAIGN_VAULT_ADDRESS") as `0x${string}` | undefined,
      CURRENT_TOKEN_ADDRESS: optional("CURRENT_TOKEN_ADDRESS") as `0x${string}` | undefined,
      CURRENT_LOCK_VAULT_ADDRESS: optional("CURRENT_LOCK_VAULT_ADDRESS") as `0x${string}` | undefined,
      CURRENT_FEE_ROUTER_ADDRESS: optional("CURRENT_FEE_ROUTER_ADDRESS") as `0x${string}` | undefined,
      CURRENT_ACCESS_MANAGER_ADDRESS: optional("CURRENT_ACCESS_MANAGER_ADDRESS") as `0x${string}` | undefined,
      CURRENT_BUYBACK_GOVERNOR_ADDRESS: optional("CURRENT_BUYBACK_GOVERNOR_ADDRESS") as `0x${string}` | undefined,
      CURRENT_TESTNET_EXCHANGE_ADAPTER_ADDRESS: optional("CURRENT_TESTNET_EXCHANGE_ADAPTER_ADDRESS") as `0x${string}` | undefined,
      CURRENT_GOVERNANCE_GUARDIAN_ADDRESS: optional("CURRENT_GOVERNANCE_GUARDIAN_ADDRESS") as `0x${string}` | undefined,
      CURRENT_PROTOCOL_DEPLOYER_PRIVATE_KEY: optional("CURRENT_PROTOCOL_DEPLOYER_PRIVATE_KEY") as `0x${string}` | undefined,
    };
  }
  return cachedConfig;
}

export function getPublicConfig() {
  const config = getServerConfig();
  return {
    environment: config.NODE_ENV,
    apiVersion: "v1",
    appName: "Current CoFi",
    chain: { ...ARC_TESTNET, rpcUrl: config.ARC_RPC_URL },
    capabilities: {
      foundationApi: true,
      persistence: Boolean(config.DATABASE_URL),
      embeddedWallets: Boolean(config.CIRCLE_API_KEY && config.CIRCLE_APP_ID),
      googleLogin: Boolean(config.CIRCLE_API_KEY && config.CIRCLE_APP_ID && config.GOOGLE_OAUTH_CLIENT_ID),
      emailLogin: Boolean(
        config.CIRCLE_API_KEY &&
        config.CIRCLE_APP_ID &&
        config.CIRCLE_EMAIL_OTP_ENABLED,
      ),
      identityClaims: Boolean(config.CLAIM_SIGNING_SECRET),
      productionMutations: Boolean(config.DATABASE_URL && config.CLAIM_SIGNING_SECRET),
      arcSettlement: Boolean(
        config.CURRENT_CLAIM_VAULT_ADDRESS &&
        config.CURRENT_CAMPAIGN_VAULT_ADDRESS &&
        config.CURRENT_CLAIM_AUTHORIZER_PRIVATE_KEY,
      ),
      currentEconomy: Boolean(
        config.CURRENT_TOKEN_ADDRESS &&
        config.CURRENT_LOCK_VAULT_ADDRESS &&
        config.CURRENT_FEE_ROUTER_ADDRESS
      ),
      currentGovernance: Boolean(
        config.CURRENT_ACCESS_MANAGER_ADDRESS &&
        config.CURRENT_BUYBACK_GOVERNOR_ADDRESS &&
        config.CURRENT_TESTNET_EXCHANGE_ADAPTER_ADDRESS
      ),
      crosschainFunding: Boolean(
        config.DATABASE_URL &&
        config.CIRCLE_API_KEY &&
        config.CIRCLE_APP_ID &&
        config.CURRENT_CAMPAIGN_VAULT_ADDRESS
      ),
    },
  };
}

export function getReadiness() {
  const config = getServerConfig();
  return {
    foundation: true,
    database: Boolean(config.DATABASE_URL),
    circle: Boolean(config.CIRCLE_API_KEY && config.CIRCLE_APP_ID),
    internalAuth: Boolean(config.CURRENT_COFI_INTERNAL_SECRET),
    claimSigning: Boolean(config.CLAIM_SIGNING_SECRET),
    arcSettlement: Boolean(
      config.CURRENT_CLAIM_VAULT_ADDRESS &&
      config.CURRENT_CAMPAIGN_VAULT_ADDRESS &&
      config.CURRENT_CLAIM_AUTHORIZER_PRIVATE_KEY,
    ),
    currentEconomy: Boolean(
      config.CURRENT_TOKEN_ADDRESS &&
      config.CURRENT_LOCK_VAULT_ADDRESS &&
      config.CURRENT_FEE_ROUTER_ADDRESS
    ),
    currentGovernance: Boolean(
      config.CURRENT_ACCESS_MANAGER_ADDRESS &&
      config.CURRENT_BUYBACK_GOVERNOR_ADDRESS &&
      config.CURRENT_TESTNET_EXCHANGE_ADAPTER_ADDRESS
    ),
    crosschainFunding: Boolean(
      config.DATABASE_URL &&
      config.CIRCLE_API_KEY &&
      config.CIRCLE_APP_ID &&
      config.CURRENT_CAMPAIGN_VAULT_ADDRESS
    ),
  };
}
