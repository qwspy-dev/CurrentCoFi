"use client";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
const surface = {
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
function claimDestination(baseUrl, token, referralCode) {
    const url = new URL(baseUrl);
    url.searchParams.set("claim", token);
    if (referralCode)
        url.searchParams.set("ref", referralCode);
    url.hash = "/claim";
    return url.toString();
}
function tokenFromClaimUrl(value) {
    if (!value)
        return "";
    try {
        return new URL(value).searchParams.get("claim") ?? "";
    }
    catch {
        return "";
    }
}
export function CurrentClaimEmbed({ token, claimUrl, referralCode, baseUrl = "https://www.currentco.finance", preview, accent = "#22e4d5", compact = false, onOpen, }) {
    const resolvedToken = token || tokenFromClaimUrl(claimUrl);
    const [data, setData] = useState(preview ?? null);
    const [state, setState] = useState(preview ? "ready" : resolvedToken ? "loading" : "error");
    const destination = useMemo(() => resolvedToken ? claimDestination(baseUrl, resolvedToken, referralCode) : claimUrl ?? baseUrl, [baseUrl, claimUrl, referralCode, resolvedToken]);
    useEffect(() => {
        if (preview || !resolvedToken)
            return;
        const controller = new AbortController();
        fetch(`${baseUrl.replace(/\/+$/, "")}/api/v1/links/resolve`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ token: resolvedToken }),
            signal: controller.signal,
        }).then(async (response) => {
            const payload = await response.json();
            if (!response.ok || !payload.ok || !payload.data)
                throw new Error(payload.error?.message);
            setData(payload.data);
            setState("ready");
        }).catch((error) => {
            if (error instanceof DOMException && error.name === "AbortError")
                return;
            setState("error");
        });
        return () => controller.abort();
    }, [baseUrl, preview, resolvedToken]);
    return _jsxs("section", { style: { ...surface, padding: compact ? 18 : 24 }, "aria-label": "Current CoFi claim", children: [_jsx("div", { "aria-hidden": "true", style: { position: "absolute", inset: 0, background: `radial-gradient(circle at 80% 10%,${accent}25,transparent 42%)` } }), _jsxs("div", { style: { position: "relative" }, children: [_jsxs("div", { style: { alignItems: "center", display: "flex", gap: 9 }, children: [_jsx("span", { style: { background: `linear-gradient(145deg,${accent},#0868b7)`, borderRadius: 11, display: "grid", fontWeight: 800, height: 34, placeItems: "center", width: 34 }, children: "C" }), _jsxs("div", { children: [_jsx("b", { style: { display: "block", fontSize: 12 }, children: data?.project.name ?? "Current CoFi" }), _jsx("small", { style: { color: "#83aab6", fontSize: 9 }, children: "Walletless Arc claim" })] })] }), state === "loading" && _jsx("p", { style: { color: "#9ab5be", fontSize: 12, margin: "35px 0" }, children: "Reading the current\u2026" }), state === "error" && _jsx("p", { role: "alert", style: { color: "#ffb9c2", fontSize: 12, margin: "35px 0" }, children: "This claim is unavailable." }), state === "ready" && data && _jsxs(_Fragment, { children: [_jsxs("small", { style: { color: "#83aab6", display: "block", fontSize: 9, letterSpacing: ".08em", marginTop: compact ? 25 : 42, textTransform: "uppercase" }, children: [data.sender, " sent you"] }), _jsxs("strong", { style: { display: "block", fontSize: compact ? 28 : 38, letterSpacing: "-.045em", margin: "8px 0" }, children: [data.amount, " ", data.asset] }), _jsx("p", { style: { color: "#9ab5be", fontSize: 11, lineHeight: 1.5, margin: "0 0 22px" }, children: data.message || "Open your funded account without a wallet or gas." }), _jsx("button", { type: "button", disabled: !data.claimable, onClick: () => onOpen ? onOpen(destination) : window.location.assign(destination), style: { background: data.claimable ? "#fff" : "#53656c", border: 0, borderRadius: 11, color: "#07141d", cursor: data.claimable ? "pointer" : "not-allowed", fontSize: 11, fontWeight: 750, height: 44, width: "100%" }, children: data.claimable ? "Claim — no gas required" : "Claim unavailable" })] })] })] });
}
export function CurrentReferralLink({ claimUrl, referralCode, children = "Open reward", className, }) {
    const href = useMemo(() => {
        const url = new URL(claimUrl);
        url.searchParams.set("ref", referralCode);
        return url.toString();
    }, [claimUrl, referralCode]);
    return _jsx("a", { className: className, href: href, rel: "noreferrer", children: children });
}
//# sourceMappingURL=index.js.map