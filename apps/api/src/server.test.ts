import { afterEach, describe, expect, it } from "vitest";

import { buildServer } from "./server.js";

const servers: ReturnType<typeof buildServer>[] = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()));
});

describe("API", () => {
  it("reports service health", async () => {
    const server = buildServer();
    servers.push(server);

    const response = await server.inject({
      method: "GET",
      url: "/health",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      service: "current-cofi-api",
      status: "ok",
    });
  });

  it("exposes the supported Arc network", async () => {
    const server = buildServer();
    servers.push(server);

    const response = await server.inject({
      method: "GET",
      url: "/v1/network",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      chainId: 5_042_002,
      environment: "arc-testnet",
      usdcAddress: "0x3600000000000000000000000000000000000000",
    });
  });
});
