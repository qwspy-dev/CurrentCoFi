import { z } from "zod";

const environmentSchema = z.object({
  API_HOST: z.string().min(1).default("127.0.0.1"),
  API_PORT: z.coerce.number().int().min(1).max(65_535).default(3001),
  ARC_NETWORK: z.literal("arc-testnet").default("arc-testnet"),
  ARC_TESTNET_RPC_URL: z.string().url().default("https://rpc.testnet.arc.io"),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

export type AppEnvironment = z.infer<typeof environmentSchema>;

export function readEnvironment(
  source: NodeJS.ProcessEnv = process.env,
): AppEnvironment {
  return environmentSchema.parse(source);
}
