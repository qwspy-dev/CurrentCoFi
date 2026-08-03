import { circleConfigured } from "../../../server/circle/client.js";
import { getServerConfig } from "../../../server/config.js";
import { ok, withApi } from "../../../server/http.js";

export default withApi((request) => {
  const config = getServerConfig();
  const appleFirebaseConfig = config.APPLE_FIREBASE_API_KEY &&
    config.APPLE_FIREBASE_AUTH_DOMAIN &&
    config.APPLE_FIREBASE_PROJECT_ID &&
    config.APPLE_FIREBASE_APP_ID
    ? {
        apiKey: config.APPLE_FIREBASE_API_KEY,
        authDomain: config.APPLE_FIREBASE_AUTH_DOMAIN,
        projectId: config.APPLE_FIREBASE_PROJECT_ID,
        ...(config.APPLE_FIREBASE_STORAGE_BUCKET ? { storageBucket: config.APPLE_FIREBASE_STORAGE_BUCKET } : {}),
        ...(config.APPLE_FIREBASE_MESSAGING_SENDER_ID ? { messagingSenderId: config.APPLE_FIREBASE_MESSAGING_SENDER_ID } : {}),
        appId: config.APPLE_FIREBASE_APP_ID,
      }
    : null;
  return ok(request, {
    configured: circleConfigured(),
    appId: config.CIRCLE_APP_ID ?? null,
    methods: {
      google: Boolean(config.CIRCLE_API_KEY && config.CIRCLE_APP_ID && config.GOOGLE_OAUTH_CLIENT_ID),
      email: Boolean(
        config.CIRCLE_API_KEY &&
        config.CIRCLE_APP_ID &&
        config.CIRCLE_EMAIL_OTP_ENABLED,
      ),
      apple: Boolean(config.CIRCLE_API_KEY && config.CIRCLE_APP_ID && appleFirebaseConfig),
      facebook: Boolean(config.CIRCLE_API_KEY && config.CIRCLE_APP_ID && config.FACEBOOK_APP_ID),
    },
    googleClientId: config.GOOGLE_OAUTH_CLIENT_ID ?? null,
    facebookAppId: config.FACEBOOK_APP_ID ?? null,
    appleFirebaseConfig,
    linkedIdentities: {
      x: Boolean(config.X_OAUTH_CLIENT_ID && config.X_OAUTH_CLIENT_SECRET),
      discord: Boolean(config.DISCORD_OAUTH_CLIENT_ID && config.DISCORD_OAUTH_CLIENT_SECRET),
      telegram: Boolean(config.TELEGRAM_BOT_USERNAME && config.TELEGRAM_BOT_TOKEN),
    },
    network: "ARC-TESTNET",
    accountType: "SCA",
  });
}, ["GET"]);
