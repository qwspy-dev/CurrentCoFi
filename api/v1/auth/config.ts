import { circleConfigured } from "../../../server/circle/client.js";
import { getServerConfig } from "../../../server/config.js";
import { ok, withApi } from "../../../server/http.js";

export default withApi((request) => {
  const config = getServerConfig();
  return ok(request, {
    configured: circleConfigured(),
    appId: config.CIRCLE_APP_ID ?? null,
    methods: {
      google: Boolean(config.CIRCLE_API_KEY && config.CIRCLE_APP_ID && config.GOOGLE_OAUTH_CLIENT_ID),
      email: Boolean(config.CIRCLE_API_KEY && config.CIRCLE_APP_ID),
      apple: false,
      facebook: false,
    },
    googleClientId: config.GOOGLE_OAUTH_CLIENT_ID ?? null,
    network: "ARC-TESTNET",
    accountType: "SCA",
  });
}, ["GET"]);
