import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the Current CoFi product and core message", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>Current CoFi/i);
  assert.match(html, /Turn any audience/);
  assert.match(html, /token users/);
  assert.match(html, /Create a distribution/);
  assert.match(html, /THE ACTIVATION LAYER FOR ARC/);
  assert.match(html, /currentdes-hero\.mp4/);
});

test("keeps the production metadata and API integration boundary", async () => {
  const [layout, app, client, authClient, session, vercel] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/CurrentApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/api/client.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/auth/circle-wallet.ts", import.meta.url), "utf8"),
    readFile(new URL("../server/auth/session.ts", import.meta.url), "utf8"),
    readFile(new URL("../vercel.json", import.meta.url), "utf8"),
  ]);
  assert.match(layout, /Current CoFi/);
  assert.match(layout, /Walletless USDC and project-token distribution/);
  assert.match(app, /currentApi\.health/);
  assert.match(app, /Foundation live/);
  assert.match(app, /Circle credentials are the final activation switch/);
  assert.match(client, /\/api\/v1/);
  assert.match(authClient, /ARC-TESTNET/);
  assert.match(authClient, /accountType: "SCA"/);
  assert.match(session, /HttpOnly/);
  assert.match(session, /AES-GCM/);
  assert.match(vercel, /api\/\*\*\/\*\.ts/);
});
