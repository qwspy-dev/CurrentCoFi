"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { W3SSdk } from "@circle-fin/w3s-pw-web-sdk";
import { currentApi } from "@/lib/api/client";

export type AuthConfig = {
  configured: boolean;
  appId: string | null;
  googleClientId: string | null;
  methods: { google: boolean; email: boolean; apple: boolean; facebook: boolean };
  network: "ARC-TESTNET";
  accountType: "SCA";
};

type LoginResult = {
  userToken: string;
  encryptionKey: string;
  refreshToken: string;
  oAuthInfo?: {
    provider?: string;
    socialUserInfo?: { email?: string; name?: string };
  };
};

export type CurrentAccount = {
  authenticated: true;
  circleUserId: string;
  provider: string;
  displayName: string;
  email?: string;
  accountId?: string;
  username?: string;
  wallets: Array<{
    id: string;
    address: string;
    blockchain: string;
    state: string;
    accountType: string;
  }>;
};

type AuthState = "loading" | "ready" | "redirecting" | "verifying" | "creating-wallet" | "authenticated" | "unavailable" | "error";

const STORAGE_PREFIX = "current.circle.";
const AUTH_SESSION_KEY = `${STORAGE_PREFIX}challengeAuth`;

function messageFrom(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null) {
    const details = error as { code?: string | number; message?: unknown; error?: unknown };
    const message = typeof details.message === "string"
      ? details.message
      : typeof details.error === "string"
        ? details.error
        : null;
    if (message) return details.code ? `[${details.code}] ${message}` : message;
  }
  return "Wallet onboarding could not be completed.";
}

export function useCircleWalletAuth() {
  const sdkRef = useRef<W3SSdk | null>(null);
  const configRef = useRef<AuthConfig | null>(null);
  const loginCallbackRef = useRef<NonNullable<Parameters<W3SSdk["updateConfigs"]>[1]> | null>(null);
  const [config, setConfig] = useState<AuthConfig | null>(null);
  const [account, setAccount] = useState<CurrentAccount | null>(null);
  const [state, setState] = useState<AuthState>("loading");
  const [error, setError] = useState<string | null>(null);

  const createSession = useCallback(async (result: LoginResult, deviceId: string, provider: "google" | "email") => {
    sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify({
      userToken: result.userToken,
      encryptionKey: result.encryptionKey,
    }));
    const initialized = await currentApi.post<{
      initialized: boolean;
      challengeId: string | null;
      wallets: CurrentAccount["wallets"];
    }>("/auth/initialize", { userToken: result.userToken });

    const finish = async () => {
      const profile = {
        displayName: result.oAuthInfo?.socialUserInfo?.name ?? (provider === "email" ? "Current member" : "Current user"),
        email: result.oAuthInfo?.socialUserInfo?.email,
      };
      const session = await currentApi.post<CurrentAccount>("/auth/session", {
        userToken: result.userToken,
        refreshToken: result.refreshToken,
        deviceId,
        provider,
        profile,
      });
      setAccount(session);
      setState("authenticated");
      for (const key of ["deviceToken", "deviceEncryptionKey", "otpToken"]) {
        localStorage.removeItem(`${STORAGE_PREFIX}${key}`);
      }
    };

    if (!initialized.challengeId) {
      await finish();
      return;
    }
    setState("creating-wallet");
    const sdk = sdkRef.current;
    if (!sdk) throw new Error("Circle wallet SDK is not ready.");
    sdk.setAuthentication({ userToken: result.userToken, encryptionKey: result.encryptionKey });
    await new Promise<void>((resolve, reject) => {
      sdk.execute(initialized.challengeId as string, (challengeError, challengeResult) => {
        if (challengeError || challengeResult?.status === "FAILED") {
          reject(new Error(challengeError?.message ?? "Wallet creation was not approved."));
          return;
        }
        resolve();
      });
    });
    await finish();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const initialize = async () => {
      try {
        const nextConfig = await currentApi.get<AuthConfig>("/auth/config");
        if (cancelled) return;
        configRef.current = nextConfig;
        setConfig(nextConfig);
        if (!nextConfig.configured || !nextConfig.appId) {
          setState("unavailable");
          return;
        }
        const circleSdkModule = await import("@circle-fin/w3s-pw-web-sdk");
        const storedDeviceToken = localStorage.getItem(`${STORAGE_PREFIX}deviceToken`) ?? "";
        const storedDeviceEncryptionKey = localStorage.getItem(`${STORAGE_PREFIX}deviceEncryptionKey`) ?? "";
        const storedOtpToken = localStorage.getItem(`${STORAGE_PREFIX}otpToken`) ?? undefined;
        const storedProvider = (localStorage.getItem(`${STORAGE_PREFIX}provider`) ?? "google") as "google" | "email";
        const onLoginComplete = (loginError: unknown, rawResult?: unknown) => {
          if (cancelled) return;
          if (loginError || !rawResult) {
            setError(messageFrom(loginError));
            setState("error");
            return;
          }
          const result = rawResult as LoginResult;
          const deviceId = localStorage.getItem(`${STORAGE_PREFIX}deviceId`);
          if (!deviceId) {
            setError("This browser lost its secure device identifier. Please try again.");
            setState("error");
            return;
          }
          setState("verifying");
          void createSession(result, deviceId, storedProvider).catch((sessionError) => {
            setError(messageFrom(sessionError));
            setState("error");
          });
        };
        loginCallbackRef.current = onLoginComplete;
        const sdk = new circleSdkModule.W3SSdk({
          appSettings: { appId: nextConfig.appId },
          loginConfigs: storedDeviceToken && storedDeviceEncryptionKey ? {
            deviceToken: storedDeviceToken,
            deviceEncryptionKey: storedDeviceEncryptionKey,
            otpToken: storedOtpToken,
            ...(nextConfig.googleClientId ? {
              google: {
                clientId: nextConfig.googleClientId,
                redirectUri: window.location.origin,
                selectAccountPrompt: true,
              },
            } : {}),
          } : undefined,
        }, onLoginComplete);
        sdkRef.current = sdk;
        try {
          const session = await currentApi.get<CurrentAccount>("/auth/session");
          if (!cancelled) {
            setAccount(session);
            setState("authenticated");
          }
        } catch {
          if (!cancelled) setState("ready");
        }
      } catch (initializationError) {
        if (!cancelled) {
          setError(messageFrom(initializationError));
          setState("error");
        }
      }
    };
    void initialize();
    return () => { cancelled = true; };
  }, [createSession]);

  const deviceId = useCallback(async () => {
    const existing = localStorage.getItem(`${STORAGE_PREFIX}deviceId`);
    if (existing) return existing;
    const value = await sdkRef.current?.getDeviceId();
    if (!value) throw new Error("Could not create a secure device session.");
    localStorage.setItem(`${STORAGE_PREFIX}deviceId`, value);
    return value;
  }, []);

  const configureSdk = useCallback((tokens: {
    deviceToken: string;
    deviceEncryptionKey: string;
    otpToken?: string;
  }) => {
    const nextConfig = configRef.current;
    const sdk = sdkRef.current;
    if (!nextConfig?.appId || !sdk) throw new Error("Circle wallet SDK is not ready.");
    localStorage.setItem(`${STORAGE_PREFIX}deviceToken`, tokens.deviceToken);
    localStorage.setItem(`${STORAGE_PREFIX}deviceEncryptionKey`, tokens.deviceEncryptionKey);
    if (tokens.otpToken) localStorage.setItem(`${STORAGE_PREFIX}otpToken`, tokens.otpToken);
    sdk.updateConfigs({
      appSettings: { appId: nextConfig.appId },
      loginConfigs: {
        ...tokens,
        ...(nextConfig.googleClientId ? {
          google: {
            clientId: nextConfig.googleClientId,
            redirectUri: window.location.origin,
            selectAccountPrompt: true,
          },
        } : {}),
      },
    }, loginCallbackRef.current ?? undefined);
    return sdk;
  }, []);

  const startGoogle = useCallback(async () => {
    try {
      if (!configRef.current?.methods.google) throw new Error("Google login is waiting for its Circle and Google configuration.");
      setError(null);
      setState("redirecting");
      const id = await deviceId();
      const tokens = await currentApi.post<{ deviceToken: string; deviceEncryptionKey: string }>("/auth/device-token", { deviceId: id });
      localStorage.setItem(`${STORAGE_PREFIX}provider`, "google");
      const sdk = configureSdk(tokens);
      await sdk.performLogin("Google" as Parameters<W3SSdk["performLogin"]>[0]);
    } catch (loginError) {
      setError(messageFrom(loginError));
      setState("error");
    }
  }, [configureSdk, deviceId]);

  const startEmail = useCallback(async (email: string) => {
    try {
      if (!configRef.current?.methods.email) throw new Error("Email login is waiting for its Circle configuration.");
      setError(null);
      setState("verifying");
      const id = await deviceId();
      const tokens = await currentApi.post<{ deviceToken: string; deviceEncryptionKey: string; otpToken: string }>("/auth/email-token", { deviceId: id, email });
      localStorage.setItem(`${STORAGE_PREFIX}provider`, "email");
      const sdk = configureSdk(tokens);
      sdk.verifyOtp();
    } catch (emailError) {
      setError(messageFrom(emailError));
      setState("error");
    }
  }, [configureSdk, deviceId]);

  const signOut = useCallback(async () => {
    await currentApi.delete("/auth/session");
    sessionStorage.removeItem(AUTH_SESSION_KEY);
    setAccount(null);
    setState(configRef.current?.configured ? "ready" : "unavailable");
  }, []);

  const executeChallenge = useCallback(async (challengeId: string) => {
    const sdk = sdkRef.current;
    if (!sdk) throw new Error("Circle wallet approval is not ready.");
    const rawAuth = sessionStorage.getItem(AUTH_SESSION_KEY);
    if (!rawAuth) {
      throw new Error("For your security, sign in again before approving this wallet action.");
    }
    const auth = JSON.parse(rawAuth) as { userToken?: string; encryptionKey?: string };
    if (!auth.userToken || !auth.encryptionKey) {
      throw new Error("Your secure wallet session has expired. Sign in again to continue.");
    }
    sdk.setAuthentication({ userToken: auth.userToken, encryptionKey: auth.encryptionKey });
    return new Promise<{
      status: string;
      type: string;
      data?: { signature?: string; txHash?: string; signedTransaction?: string };
    }>((resolve, reject) => {
      sdk.execute(challengeId, (challengeError, challengeResult) => {
        if (challengeError || challengeResult?.status === "FAILED") {
          reject(new Error(challengeError?.message ?? "The wallet action was not approved."));
          return;
        }
        if (!challengeResult) {
          reject(new Error("Circle did not return the wallet approval result."));
          return;
        }
        resolve(challengeResult);
      });
    });
  }, []);

  return { config, account, state, error, startGoogle, startEmail, signOut, executeChallenge };
}
