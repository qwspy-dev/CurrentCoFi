import { describe, expect, it } from "vitest";

import {
  ARC_TESTNET_CHAIN_ID,
  ARC_TESTNET_USDC_ADDRESS,
  parseArcEnvironment,
} from "./arc.js";

describe("Arc configuration", () => {
  it("uses the official Arc Testnet identifiers", () => {
    expect(ARC_TESTNET_CHAIN_ID).toBe(5_042_002);
    expect(ARC_TESTNET_USDC_ADDRESS).toBe(
      "0x3600000000000000000000000000000000000000",
    );
  });

  it("defaults to testnet", () => {
    expect(parseArcEnvironment(undefined)).toBe("arc-testnet");
  });

  it("fails closed for mainnet", () => {
    expect(() => parseArcEnvironment("arc-mainnet")).toThrow(
      "Arc mainnet is not publicly available",
    );
  });
});
