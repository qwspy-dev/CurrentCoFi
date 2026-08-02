import { mcpManifest } from "../../server/developer/mcp-manifest.js";
import { ok, withApi } from "../../server/http.js";

export default withApi((request) => ok(request, mcpManifest(), 200, { "cache-control": "public, max-age=60, stale-while-revalidate=300" }), ["GET"]);
