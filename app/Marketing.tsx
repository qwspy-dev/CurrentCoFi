"use client";

import {
  ArrowRight, ArrowUpRight, BadgeCheck, Braces, Check, CheckCircle2,
  Fingerprint, Menu, Network, Pause, Play, Sparkles, Users, Wallet, X,
} from "lucide-react";
import {
  useCallback, useEffect, useLayoutEffect, useRef, useState,
} from "react";
import type { CSSProperties, ReactNode } from "react";
import { currentApi } from "@/lib/api/client";
import type { View } from "./CurrentApp";

type NetworkProofState = {
  schemaVersion: string;
  product: string;
  network: string;
  configured: boolean;
  valueStatus: string;
  dataMode: string;
  asOf: string;
  totals: {
    projects: number; campaigns: number; recipientsTargeted: number; confirmedClaims: number;
    fundedWallets: number; activatedUsers: number; activationEvents: number;
    usdcClaimedAtomic: string; projectTokenCampaigns: number;
  };
  rates: { claimRate: number; activationRate: number };
  activity: Array<{ date: string; campaigns: number; claims: number; activations: number }>;
  sources: Array<{ metric: string; record: string; rule: string }>;
  privacy: string;
  digest: string;
};

function formatAtomic(value: string) {
  const numeric = Number(value) / 1_000_000;
  return numeric.toLocaleString(undefined, { maximumFractionDigits: 6 });
}


function Brand({ light = false, onClick }: { light?: boolean; onClick?: () => void }) {
  return (
    <button className={`cofi-brand ${light ? "is-light" : ""}`} onClick={onClick} aria-label="Current CoFi home">
      <span className="cofi-glyph" aria-hidden="true"><i/><i/><i/></span>
      <span>current</span><em>cofi</em>
    </button>
  );
}

function Button({
  children, tone = "blue", onClick, disabled = false, type = "button"
}: {
  children: ReactNode; tone?: "blue" | "cyan" | "dark" | "light" | "ghost";
  onClick?: () => void; disabled?: boolean; type?: "button" | "submit";
}) {
  return <button className={`cofi-button tone-${tone}`} onClick={onClick} disabled={disabled} type={type}>{children}</button>;
}

function Eyebrow({ children, light = false }: { children: ReactNode; light?: boolean }) {
  return <div className={`eyebrow ${light ? "light" : ""}`}>{children}</div>;
}

function FluidCanvas({ mode = "network", className = "" }: { mode?: "network" | "branches" | "orbit"; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0, width = 0, height = 0, active = true;
    const resize = () => {
      const b = canvas.getBoundingClientRect();
      width = b.width; height = b.height;
      const dpr = Math.min(devicePixelRatio || 1, innerWidth < 768 ? 1.25 : 1.75);
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const paths = Array.from({ length: mode === "branches" ? 14 : 10 }, (_, i) => ({
      y: .12 + (i / (mode === "branches" ? 15 : 11)) * .76,
      speed: .018 + (i % 5) * .006,
      offset: (i * .173) % 1,
    }));
    const point = (p: number, i: number, t: number) => {
      const sy = height * .5, ey = height * paths[i].y;
      const sx = mode === "orbit" ? width * .5 : width * .1;
      const ex = mode === "orbit" ? width * (.5 + Math.cos(i * .63) * .39) : width * .93;
      const wave = Math.sin(t * .00035 + i * .8) * height * .035;
      const inv = 1 - p;
      const c1x = mode === "orbit" ? width * .55 : width * .34;
      const c2x = mode === "orbit" ? ex - width * .08 : width * .68;
      return {
        x: inv ** 3 * sx + 3 * inv ** 2 * p * c1x + 3 * inv * p ** 2 * c2x + p ** 3 * ex,
        y: inv ** 3 * sy + 3 * inv ** 2 * p * (sy + wave) + 3 * inv * p ** 2 * (ey - wave) + p ** 3 * ey,
      };
    };
    const draw = (t: number) => {
      if (!active) return;
      ctx.clearRect(0, 0, width, height);
      const glow = ctx.createRadialGradient(width * .55, height * .5, 0, width * .55, height * .5, width * .62);
      glow.addColorStop(0, "rgba(37,232,225,.15)"); glow.addColorStop(.55, "rgba(23,59,255,.06)"); glow.addColorStop(1, "rgba(2,7,19,0)");
      ctx.fillStyle = glow; ctx.fillRect(0, 0, width, height);
      paths.forEach((path, i) => {
        ctx.beginPath();
        for (let s = 0; s <= 60; s++) {
          const q = point(s / 60, i, t);
          if (s) ctx.lineTo(q.x, q.y);
          else ctx.moveTo(q.x, q.y);
        }
        const grad = ctx.createLinearGradient(0, 0, width, 0);
        grad.addColorStop(0, "rgba(37,232,225,.04)");
        grad.addColorStop(.6, "rgba(37,232,225,.30)");
        grad.addColorStop(1, i % 3 === 0 ? "rgba(32,214,107,.55)" : "rgba(23,59,255,.42)");
        ctx.strokeStyle = grad; ctx.lineWidth = i % 4 === 0 ? 1.4 : .8; ctx.stroke();
        for (let k = 0; k < 3; k++) {
          const p = reduce ? .75 : (path.offset + k / 3 + t * .001 * path.speed) % 1;
          const q = point(p, i, t);
          const green = i % 3 === 0 && p > .78;
          ctx.shadowBlur = 12; ctx.shadowColor = green ? "#20D66B" : "#25E8E1";
          ctx.fillStyle = green ? "#20D66B" : "#25E8E1";
          ctx.beginPath(); ctx.arc(q.x, q.y, 1.5 + (i % 3) * .4, 0, Math.PI * 2); ctx.fill();
        }
      });
      ctx.shadowBlur = 0;
      if (!reduce) frame = requestAnimationFrame(draw);
    };
    const observer = new IntersectionObserver(([entry]) => {
      active = entry.isIntersecting;
      if (active && !reduce) frame = requestAnimationFrame(draw);
      else cancelAnimationFrame(frame);
    });
    resize(); observer.observe(canvas); draw(0);
    addEventListener("resize", resize);
    const visibility = () => { active = !document.hidden; if (active && !reduce) frame = requestAnimationFrame(draw); };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      cancelAnimationFrame(frame); observer.disconnect(); removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [mode]);
  return <canvas className={`fluid-canvas ${className}`} ref={canvasRef} aria-hidden="true"/>;
}

function useNetworkProof() {
  const [proof,setProof]=useState<NetworkProofState|null>(null);
  const [error,setError]=useState<string|null>(null);
  const refresh=useCallback(()=>currentApi.get<NetworkProofState>("/network-proof").then(setProof).catch(reason=>setError(reason instanceof Error?reason.message:"Network proof is temporarily unavailable.")),[]);
  useEffect(()=>{let active=true;currentApi.get<NetworkProofState>("/network-proof").then(value=>{if(active)setProof(value)}).catch(reason=>{if(active)setError(reason instanceof Error?reason.message:"Network proof is temporarily unavailable.")});return()=>{active=false}},[]);
  return {proof,error,refresh};
}

export default function Marketing({ go }: { go: (v: View) => void }) {
  const root = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState(false);
  const [motionPaused, setMotionPaused] = useState(false);
  const {proof}=useNetworkProof();
  const proofNumber=(value:number|undefined)=>value===undefined?"—":value.toLocaleString();

  useLayoutEffect(() => {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !root.current) return;
    let active = true;
    let revert: (() => void) | undefined;

    // Keep the cinematic runtime on the marketing route. Claim, account and
    // project surfaces should not download GSAP just to render product UI.
    void Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(([gsapModule, scrollTriggerModule]) => {
      if (!active || !root.current) return;
      const gsap = gsapModule.default;
      gsap.registerPlugin(scrollTriggerModule.ScrollTrigger);
      const context = gsap.context(() => {
        gsap.from("[data-hero-line]", { yPercent: 115, duration: 1.05, stagger: .09, ease: "power4.out" });
        gsap.from("[data-hero-rest]", { y: 24, opacity: 0, duration: .72, stagger: .08, delay: .55, ease: "power3.out" });
        gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((element) => {
          gsap.from(element, {
            y: 64, opacity: 0, duration: .9, ease: "power3.out",
            scrollTrigger: { trigger: element, start: "top 82%", once: true }
          });
        });
        if (matchMedia("(min-width: 769px)").matches) {
          const phases = gsap.utils.toArray<HTMLElement>(".story-phase");
          const nodes = gsap.utils.toArray<HTMLElement>(".story-node");
          const story = gsap.timeline({
            scrollTrigger: { trigger: ".story-scroll", start: "top top", end: "+=240%", scrub: 1, pin: ".story-stage" }
          });
          phases.forEach((phase, i) => {
            story.to(phases, { opacity: (_, target) => target === phase ? 1 : 0, y: (_, target) => target === phase ? 0 : 18, duration: .35 }, i * .65);
            story.to(nodes.slice(0, 4 + i * 4), { opacity: 1, scale: 1, stagger: .02, duration: .3 }, i * .65);
          });
        }
        gsap.to(".fee-orbit-inner", {
          rotate: 360, ease: "none",
          scrollTrigger: { trigger: ".token-story", start: "top bottom", end: "bottom top", scrub: 1.2 }
        });
      }, root);
      revert = () => context.revert();
    }).catch(() => undefined);

    return () => {
      active = false;
      revert?.();
    };
  }, []);

  return (
    <div className="site" ref={root}>
      <header className="marketing-nav">
        <Brand light onClick={() => go("home")}/>
        <nav aria-label="Main navigation">
          <a href="#network">Network</a><a href="#product">Product</a>
          <a href="#developers">Developers</a><a href="#current">$CURRENT</a>
        </nav>
        <div className="nav-actions">
          <button className="nav-text" onClick={() => go("overview")}>Sign in</button>
          <Button tone="light" onClick={() => go("new-campaign")}>Launch a current <ArrowUpRight size={15}/></Button>
          <button className="menu-trigger" aria-label="Open navigation" onClick={() => setMenu(!menu)}>{menu ? <X/> : <Menu/>}</button>
        </div>
      </header>
      {menu && <div className="mobile-ocean-menu">
        {["Network","Product","Developers","$CURRENT"].map(item => <a key={item} href={`#${item === "$CURRENT" ? "current" : item.toLowerCase()}`} onClick={() => setMenu(false)}>{item}<ArrowUpRight/></a>)}
        <Button tone="cyan" onClick={() => go("new-campaign")}>Launch a current <ArrowRight/></Button>
      </div>}

      <main>
        <section className="cinematic-hero">
          <div className="hero-media" aria-hidden="true">
            <video className="hero-video" autoPlay muted playsInline loop poster="/media/currentdes-start.jpg" style={{opacity: motionPaused ? 0 : 1}}>
              <source src="/media/currentdes-hero.mp4" type="video/mp4"/>
            </video>
            <div className="hero-shade"/>
          </div>
          <div className="hero-copy-new">
            <Eyebrow light><Sparkles/> THE ACTIVATION LAYER FOR ARC</Eyebrow>
            <h1><span><b data-hero-line>Turn any audience</b></span><span><b data-hero-line>into active</b></span><span className="cyan"><b data-hero-line>token users.</b></span></h1>
            <p data-hero-rest>Distribute USDC or your project token to anyone. No wallet, gas, or crypto knowledge required. Every claim creates a funded account and a measurable user.</p>
            <div className="hero-actions" data-hero-rest>
              <Button tone="cyan" onClick={() => go("new-campaign")}>Create a distribution <ArrowRight/></Button>
              <button className="experience-link" onClick={() => go("claim")}><span><Play/></span>Experience a claim</button>
            </div>
          </div>
          <div className="hero-bottom" data-hero-rest>
            <div><strong>{proofNumber(proof?.totals.fundedWallets)}</strong><span>verified wallets funded</span></div>
            <div><strong>{proofNumber(proof?.totals.campaigns)}</strong><span>testnet currents</span></div>
            <div><strong>{proof?`${proof.rates.activationRate}%`:"—"}</strong><span>verified activation rate</span></div>
            <button aria-label={motionPaused ? "Play hero animation" : "Pause hero animation"} onClick={() => setMotionPaused(!motionPaused)}>{motionPaused ? <Play/> : <Pause/>}</button>
          </div>
        </section>

        <section className="proof-section" id="network">
          <Eyebrow>VERIFIED ARC TESTNET</Eyebrow>
          <div className="proof-number" data-reveal><small>Confirmed test USDC claimed · no monetary value</small><strong>{proof?`${formatAtomic(proof.totals.usdcClaimedAtomic)} USDC`:"Verifying…"}</strong></div>
          <div className="proof-grid" data-reveal>
            <div><b>{proofNumber(proof?.totals.fundedWallets)}</b><span>confirmed funded wallets</span></div>
            <div><b>{proofNumber(proof?.totals.activatedUsers)}</b><span>distinct activated users</span></div>
            <div><b>{proofNumber(proof?.totals.campaigns)}</b><span>recorded testnet campaigns</span></div>
            <div><b>0</b><span>gas required to claim</span></div>
          </div>
          <div className="network-proof-cta" data-reveal><div><BadgeCheck/><span><b>Verified-records-only</b><small>Replay the product loop, inspect the source rules, or open the complete Circle reviewer dossier.</small></span></div><div className="network-proof-cta-actions"><Button tone="ghost" onClick={()=>go("reviewer-demo")}>Verified replay <Play/></Button><Button tone="ghost" onClick={()=>go("grant-dossier")}>Grant dossier <BadgeCheck/></Button><Button tone="blue" onClick={()=>go("network-proof")}>Network proof <ArrowUpRight/></Button></div></div>
        </section>

        <section className="story-scroll" id="product">
          <div className="story-stage">
            <div className="story-title"><Eyebrow light>YOU SCROLL, VALUE FLOWS</Eyebrow><h2>What is<br/><em>Current CoFi?</em></h2></div>
            <div className="story-visual">
              <FluidCanvas mode="network"/>
              <div className="story-source"><span>C</span><small>PROJECT SOURCE</small></div>
              <div className="story-nodes">{Array.from({length:12},(_,i)=><span className={`story-node n-${i}`} key={i}>{i > 7 ? <Wallet/> : <Users/>}</span>)}</div>
            </div>
            <div className="story-copy">
              <article className="story-phase">
                <span>01 / 03</span><h3>Fund the current.</h3>
                <p>Deposit USDC or any supported project token into a fully funded distribution.</p>
              </article>
              <article className="story-phase">
                <span>02 / 03</span><h3>Reach beyond wallets.</h3>
                <p>Assign value to emails, social identities, game accounts, QR codes, or private links.</p>
              </article>
              <article className="story-phase">
                <span>03 / 03</span><h3>Activate real users.</h3>
                <p>Create embedded wallets, sponsor every claim, attribute referrals, and measure retention.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="possibilities">
          <Eyebrow>ONE PROTOCOL, MANY CURRENTS</Eyebrow>
          <h2 data-reveal>Move value through<br/>the communities that create it.</h2>
          <div className="word-current">
            {["Token launches","Social payments","Game rewards","Bounties","Referrals","Agent payments","Event drops","Community payroll"].map(x=><span key={x}>{x}<i/></span>)}
          </div>
        </section>

        <section className="claim-feature">
          <div className="claim-feature-copy" data-reveal>
            <Eyebrow>WALLETLESS CLAIMS</Eyebrow>
            <h2>A funded account appears when the value arrives.</h2>
            <p>Recipients open a link, sign in, and claim. Current CoFi verifies identity, creates the embedded wallet, sponsors gas, and records the activation.</p>
            <ul><li><Check/>USDC and project tokens</li><li><Check/>Email, social, game account, QR, or link</li><li><Check/>Expiration, recovery, and refunds</li></ul>
            <Button tone="dark" onClick={() => go("claim")}>Experience the claim <ArrowRight/></Button>
          </div>
          <div className="claim-device-scene" data-reveal>
            <FluidCanvas mode="network"/>
            <div className="claim-phone">
              <div className="phone-sensor"/><span className="mini-project">T</span>
              <small>Tidebreak sent you</small><strong>2,500 TIDE</strong><em>≈ $42.80</em>
              <div className="identity-chip"><Fingerprint/>Claim with your social identity</div>
              <button>Claim — no gas required</button>
            </div>
            <span className="claim-event event-one"><Wallet/>Wallet created</span>
            <span className="claim-event event-two"><CheckCircle2/>User activated</span>
          </div>
        </section>

        <section className="surface-section">
          <div className="surface-heading" data-reveal><Eyebrow>THE OPERATING LAYER</Eyebrow><h2>Distribution is only the beginning.</h2></div>
          <div className="surface-grid">
            <article className="surface-card dark" data-reveal>
              <span>01</span><Network/><h3>Campaigns + attribution</h3><p>Import recipients, branch referral currents, define activation events, and see exactly which sources create retained users.</p>
              <div className="mini-funnel">{["Targeted","Opened","Wallet","Claimed","Active"].map((x,i)=><span key={x} style={{"--w":`${100-i*13}%`} as CSSProperties}><b>{x}</b></span>)}</div>
            </article>
            <article className="surface-card water" id="developers" data-reveal>
              <span>02</span><Braces/><h3>Built for software and agents</h3><p>One API for distributions, claims, referrals, activation events, webhooks, and policy-bound autonomous rewards.</p>
              <pre><code><i>const</i> current = <i>await</i> cofi.distributions.create({"{"}<br/>  asset: <b>&quot;USDC&quot;</b>, recipients: audience,<br/>  walletless: <b>true</b>, attribution: <b>true</b><br/>{"}"})</code></pre>
              <Button tone="dark" onClick={() => go("developers")}>Explore the developer layer <ArrowRight/></Button>
            </article>
          </div>
        </section>

        <section className="token-story" id="current">
          <div className="token-copy-new" data-reveal>
            <Eyebrow light>THE PRODUCT FEE CURRENT</Eyebrow>
            <h2>Every product fee reinforces <em>$CURRENT.</em></h2>
            <p>A transparent portion of Current CoFi fees accumulates in USDC and purchases `$CURRENT` from the market in efficient batches. Projects also lock `$CURRENT` to access larger distribution currents, advanced attribution, promotion, and sponsored claims.</p>
            <div className="allocation-row"><span><b>35%</b>Buyback reserve</span><span><b>25%</b>Gas sponsorship</span><span><b>20%</b>Liquidity</span><span><b>20%</b>Operations</span></div>
            <Button tone="cyan" onClick={() => go("token")}>View the transparent current <ArrowRight/></Button>
          </div>
          <div className="fee-orbit" data-reveal>
            <FluidCanvas mode="orbit"/>
            <div className="fee-orbit-inner"><span className="current-coin">$C</span><i/><i/><i/></div>
            <span className="orbit-label l-a">USDC fees</span><span className="orbit-label l-b">market buy</span><span className="orbit-label l-c">burn · lock · liquidity</span>
          </div>
        </section>

        <section className="roadmap-scene">
          <div data-reveal><Eyebrow>THE CURRENT EXPANDS</Eyebrow><h2>One distribution layer.<br/>An entire community economy.</h2></div>
          <div className="roadmap-current" data-reveal>
            {[["Live","Token + USDC distribution"],["Live","Merchant checkout"],["Live","Milestone escrow"],["Live","Subscriptions"],["Live","Cross-chain USDC"]].map(([time,title],i)=><article key={title}><span>{i+1}</span><small>{time}</small><h3>{title}</h3></article>)}
          </div>
        </section>

        <section className="final-current">
          <FluidCanvas mode="branches"/>
          <div data-reveal><Eyebrow light>THE NEXT AUDIENCE IS ALREADY WAITING</Eyebrow><h2>Start the current.</h2><p>Turn an offchain community into funded wallets, active users, and measurable growth.</p><Button tone="cyan" onClick={() => go("new-campaign")}>Create a distribution <ArrowRight/></Button></div>
        </section>
      </main>
      <footer className="site-footer"><Brand/><p>Walletless distribution and activation infrastructure for the Arc economy.</p><div><button onClick={()=>go("developers")}>Developers</button><button onClick={()=>go("token")}>$CURRENT</button><a href="#product">Product</a></div><small>© 2026 Current CoFi · Testnet experience</small></footer>
    </div>
  );
}

