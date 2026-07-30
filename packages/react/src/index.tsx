"use client";

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";

export type CurrentClaimPreview = {
  amount: string;
  asset: string;
  claimable: boolean;
  expiresAt: string | null;
  message: string;
  project: { name: string; logoUrl: string | null };
  sender: string;
  status: string;
};

type ClaimEnvelope = {
  ok: boolean;
  data?: CurrentClaimPreview;
  error?: { message: string };
};

export type CurrentClaimEmbedProps = {
  token?: string;
  claimUrl?: string;
  referralCode?: string;
  baseUrl?: string;
  preview?: CurrentClaimPreview;
  accent?: string;
  compact?: boolean;
  onOpen?: (url: string) => void;
};

const surface: CSSProperties = {
  background: "linear-gradient(145deg,#061b2b,#03101e)",
  border: "1px solid rgba(34,228,213,.28)",
  borderRadius: 22,
  boxShadow: "0 24px 70px rgba(2,14,25,.2)",
  color: "#fff",
  fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
  overflow: "hidden",
  padding: 24,
  position: "relative",
};

function claimDestination(baseUrl: string, token: string, referralCode?: string) {
  const url = new URL(baseUrl);
  url.searchParams.set("claim", token);
  if (referralCode) url.searchParams.set("ref", referralCode);
  url.hash = "/claim";
  return url.toString();
}

function tokenFromClaimUrl(value?: string) {
  if (!value) return "";
  try {
    return new URL(value).searchParams.get("claim") ?? "";
  } catch {
    return "";
  }
}

export function CurrentClaimEmbed({
  token,
  claimUrl,
  referralCode,
  baseUrl = "https://www.currentco.finance",
  preview,
  accent = "#22e4d5",
  compact = false,
  onOpen,
}: CurrentClaimEmbedProps) {
  const resolvedToken = token || tokenFromClaimUrl(claimUrl);
  const [data, setData] = useState<CurrentClaimPreview | null>(preview ?? null);
  const [state, setState] = useState<"loading" | "ready" | "error">(
    preview ? "ready" : resolvedToken ? "loading" : "error",
  );
  const destination = useMemo(
    () => resolvedToken ? claimDestination(baseUrl, resolvedToken, referralCode) : claimUrl ?? baseUrl,
    [baseUrl, claimUrl, referralCode, resolvedToken],
  );
  useEffect(() => {
    if (preview || !resolvedToken) return;
    const controller = new AbortController();
    fetch(`${baseUrl.replace(/\/+$/, "")}/api/v1/links/resolve`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: resolvedToken }),
      signal: controller.signal,
    }).then(async (response) => {
      const payload = await response.json() as ClaimEnvelope;
      if (!response.ok || !payload.ok || !payload.data) throw new Error(payload.error?.message);
      setData(payload.data);
      setState("ready");
    }).catch((error: unknown) => {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setState("error");
    });
    return () => controller.abort();
  }, [baseUrl, preview, resolvedToken]);
  return <section style={{...surface,padding:compact?18:24}} aria-label="Current CoFi claim">
    <div aria-hidden="true" style={{position:"absolute",inset:0,background:`radial-gradient(circle at 80% 10%,${accent}25,transparent 42%)`}}/>
    <div style={{position:"relative"}}>
      <div style={{alignItems:"center",display:"flex",gap:9}}>
        <span style={{background:`linear-gradient(145deg,${accent},#0868b7)`,borderRadius:11,display:"grid",fontWeight:800,height:34,placeItems:"center",width:34}}>C</span>
        <div><b style={{display:"block",fontSize:12}}>{data?.project.name ?? "Current CoFi"}</b><small style={{color:"#83aab6",fontSize:9}}>Walletless Arc claim</small></div>
      </div>
      {state==="loading"&&<p style={{color:"#9ab5be",fontSize:12,margin:"35px 0"}}>Reading the current…</p>}
      {state==="error"&&<p role="alert" style={{color:"#ffb9c2",fontSize:12,margin:"35px 0"}}>This claim is unavailable.</p>}
      {state==="ready"&&data&&<>
        <small style={{color:"#83aab6",display:"block",fontSize:9,letterSpacing:".08em",marginTop:compact?25:42,textTransform:"uppercase"}}>{data.sender} sent you</small>
        <strong style={{display:"block",fontSize:compact?28:38,letterSpacing:"-.045em",margin:"8px 0"}}>{data.amount} {data.asset}</strong>
        <p style={{color:"#9ab5be",fontSize:11,lineHeight:1.5,margin:"0 0 22px"}}>{data.message || "Open your funded account without a wallet or gas."}</p>
        <button type="button" disabled={!data.claimable} onClick={()=>onOpen?onOpen(destination):window.location.assign(destination)} style={{background:data.claimable?"#fff":"#53656c",border:0,borderRadius:11,color:"#07141d",cursor:data.claimable?"pointer":"not-allowed",fontSize:11,fontWeight:750,height:44,width:"100%"}}>{data.claimable?"Claim — no gas required":"Claim unavailable"}</button>
      </>}
    </div>
  </section>;
}

export function CurrentReferralLink({
  claimUrl,
  referralCode,
  children = "Open reward",
  className,
}: {
  claimUrl: string;
  referralCode: string;
  children?: ReactNode;
  className?: string;
}) {
  const href = useMemo(() => {
    const url = new URL(claimUrl);
    url.searchParams.set("ref", referralCode);
    return url.toString();
  }, [claimUrl, referralCode]);
  return <a className={className} href={href} rel="noreferrer">{children}</a>;
}
