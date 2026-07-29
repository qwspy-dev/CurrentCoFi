"use client";

import {
  Activity, ArrowLeft, ArrowRight, ArrowUpRight, BarChart3, Bell, Bot,
  Braces, Check, CheckCircle2, ChevronDown, CircleDollarSign, Clock3, Code2,
  Copy, Download, Eye, Fingerprint, Gauge, Gift,
  Globe2, HelpCircle, KeyRound, Layers3, Link2, Lock, LogOut, Menu,
  MoreHorizontal, Network, Pause, Play, Plus, Radio, RefreshCw, Search,
  Settings, ShieldCheck, SlidersHorizontal, Sparkles, Target,
  TestTube2, TrendingUp, Upload, Users, Wallet, Webhook, X, Zap
} from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

type View =
  | "home" | "claim" | "overview" | "create" | "onboarding" | "campaigns"
  | "new-campaign" | "recipients" | "referrals" | "analytics" | "token"
  | "developers" | "api-keys" | "webhooks" | "agents" | "settings" | "states";

type ClaimStep = "ready" | "auth" | "creating" | "success";

const campaigns = [
  { name: "Tidebreak Genesis", asset: "TIDE", status: "Live", progress: 82, claimed: "8,241 / 10,000", activation: "63.8%", value: "$84.2K" },
  { name: "Founders Current", asset: "USDC", status: "Live", progress: 78, claimed: "1,174 / 1,500", activation: "71.2%", value: "$23.5K" },
  { name: "Agent Week", asset: "FLOW", status: "Scheduled", progress: 0, claimed: "0 / 5,000", activation: "—", value: "$50.0K" },
  { name: "Creator Cohort 01", asset: "USDC", status: "Ended", progress: 93, claimed: "742 / 800", activation: "58.4%", value: "$14.8K" },
];

const recipientRows = [
  { user: "Mara Chen", id: "@marachain", amount: "2,500 TIDE", state: "Activated", source: "X referral", time: "2m ago" },
  { user: "Noah Williams", id: "noah@prism.xyz", amount: "25 USDC", state: "Claimed", source: "Email list", time: "8m ago" },
  { user: "Amina Yusuf", id: "@amina.builds", amount: "2,500 TIDE", state: "Activated", source: "Discord", time: "14m ago" },
  { user: "Kaito Labs", id: "player_8d4f", amount: "2,500 TIDE", state: "Opened", source: "Direct", time: "21m ago" },
  { user: "Jules Park", id: "jules@openplay.gg", amount: "25 USDC", state: "Pending", source: "Partner", time: "34m ago" },
];

const appNav = [
  { label: "Workspace", items: [
    ["overview", "Overview", Gauge], ["onboarding", "Project setup", Globe2],
    ["create", "Create link", Link2],
    ["campaigns", "Campaigns", Layers3], ["recipients", "Recipients", Users],
    ["referrals", "Referrals", Network], ["analytics", "Analytics", BarChart3],
  ]},
  { label: "Protocol", items: [
    ["token", "$CURRENT", CircleDollarSign], ["developers", "Developers", Code2],
    ["agents", "AI agents", Bot],
  ]},
] as const;

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
  children: React.ReactNode; tone?: "blue" | "cyan" | "dark" | "light" | "ghost";
  onClick?: () => void; disabled?: boolean; type?: "button" | "submit";
}) {
  return <button className={`cofi-button tone-${tone}`} onClick={onClick} disabled={disabled} type={type}>{children}</button>;
}

function Eyebrow({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return <div className={`eyebrow ${light ? "light" : ""}`}>{children}</div>;
}

function Status({ children, tone = "cyan" }: { children: React.ReactNode; tone?: "cyan" | "green" | "grey" | "red" | "blue" }) {
  return <span className={`status status-${tone}`}><i/>{children}</span>;
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

function Marketing({ go }: { go: (v: View) => void }) {
  const root = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState(false);
  const [motionPaused, setMotionPaused] = useState(false);

  useLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !root.current) return;
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
    return () => context.revert();
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
            <div><strong>8,241</strong><span>wallets funded</span></div>
            <div><strong>18</strong><span>project currents</span></div>
            <div><strong>63.8%</strong><span>activated users</span></div>
            <button aria-label={motionPaused ? "Play hero animation" : "Pause hero animation"} onClick={() => setMotionPaused(!motionPaused)}>{motionPaused ? <Play/> : <Pause/>}</button>
          </div>
        </section>

        <section className="proof-section" id="network">
          <Eyebrow>LIVE NETWORK</Eyebrow>
          <div className="proof-number" data-reveal><small>Assets distributed</small><strong>$128,604,218</strong></div>
          <div className="proof-grid" data-reveal>
            <div><b>42,814</b><span>funded wallets</span></div>
            <div><b>31,207</b><span>activated users</span></div>
            <div><b>184</b><span>live campaigns</span></div>
            <div><b>0</b><span>gas required to claim</span></div>
          </div>
          <div className="partner-current" aria-label="Built for projects, games, communities, creators, and agents">
            {[["T","Tidebreak"],["O","Openplay"],["N","Noma"],["K","Kairo"],["V","Vessel"],["A","Axiom"],["F","Flux"]].map(([mark,name]) => <span key={name}><i>{mark}</i>{name}</span>)}
          </div>
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
              <div className="mini-funnel">{["Targeted","Opened","Wallet","Claimed","Active"].map((x,i)=><span key={x} style={{"--w":`${100-i*13}%`} as React.CSSProperties}><b>{x}</b></span>)}</div>
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
            {[["Now","Token + USDC distribution"],["Next","Merchant checkout"],["Next","Milestone escrow"],["Next","Subscriptions"],["Later","Cross-chain USDC"]].map(([time,title],i)=><article key={title}><span>{i+1}</span><small>{time}</small><h3>{title}</h3></article>)}
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

function ClaimView({ go }: { go: (v: View) => void }) {
  const [step,setStep] = useState<ClaimStep>("ready");
  const claim = () => setStep("auth");
  const authenticate = () => {
    setStep("creating");
    setTimeout(() => setStep("success"), 1800);
  };
  return (
    <main className="claim-route">
      <FluidCanvas mode="network"/>
      <header><Brand light onClick={()=>go("home")}/><span><ShieldCheck/>Secured on Arc testnet</span></header>
      <section className="claim-shell" aria-live="polite">
        {step === "ready" && <>
          <span className="claim-brand-avatar">T</span><small>Tidebreak sent you</small><h1>2,500 <em>TIDE</em></h1><p className="claim-usd">≈ $42.80</p>
          <blockquote>Welcome to the Tidebreak Genesis current.</blockquote>
          <div className="claim-meta"><span><Clock3/>Expires in 6 days</span><span><Zap/>Gas sponsored</span></div>
          <Button tone="blue" onClick={claim}>Claim your tokens <ArrowRight/></Button><p className="claim-note">No wallet or payment required.</p>
        </>}
        {step === "auth" && <>
          <button className="claim-back" onClick={()=>setStep("ready")}><ArrowLeft/>Back</button><span className="claim-brand-avatar"><Fingerprint/></span><small>CREATE YOUR CURRENT ACCOUNT</small><h2>Claim with an identity you already use.</h2>
          <p className="auth-copy">Your embedded wallet is created automatically in the background.</p>
          <button className="auth-provider" onClick={authenticate}><b>G</b>Continue with Google</button>
          <button className="auth-provider" onClick={authenticate}><b>@</b>Continue with email</button>
          <button className="auth-provider" onClick={authenticate}><b>𝕏</b>Continue with X</button>
        </>}
        {step === "creating" && <div className="creating-state"><span className="creating-orbit"><i/><i/><Wallet/></span><small>CREATING YOUR EMBEDDED WALLET</small><h2>Opening your current…</h2><div className="creating-steps"><span className="done"><Check/>Identity verified</span><span><RefreshCw/>Creating wallet</span><span>Delivering 2,500 TIDE</span></div></div>}
        {step === "success" && <div className="success-state"><span className="success-ripple"><Check/></span><small>CLAIM COMPLETE</small><h2>You’re funded.</h2><p>2,500 TIDE has arrived in your new Current CoFi account.</p><div className="success-balance"><span>TIDE balance</span><b>2,500.00</b><small>≈ $42.80</small></div><Button tone="blue" onClick={()=>go("overview")}>Open your account <ArrowRight/></Button></div>}
      </section>
      <div className="claim-trust"><span><Lock/>Identity bound</span><span><Wallet/>Embedded wallet</span><span><Zap/>No gas needed</span></div>
    </main>
  );
}

function MetricCard({label,value,change,icon:Icon}:{label:string;value:string;change?:string;icon:typeof Activity}) {
  return <article className="metric-card-new"><span><Icon/></span><small>{label}</small><strong>{value}</strong>{change&&<em><TrendingUp/>{change}</em>}</article>;
}

function PageHero({eyebrow,title,copy,mode="network",children}:{eyebrow:string;title:string;copy:string;mode?:"network"|"branches"|"orbit";children?:React.ReactNode}) {
  return <section className="app-page-hero"><FluidCanvas mode={mode}/><div><Eyebrow light>{eyebrow}</Eyebrow><h1>{title}</h1><p>{copy}</p>{children}</div></section>;
}

function CampaignTable() {
  return <div className="data-panel"><div className="panel-head"><div><h3>Campaign currents</h3><p>Live distribution and activation performance</p></div><button><SlidersHorizontal/>Filter</button></div><div className="campaign-table">
    <div className="table-head"><span>Campaign</span><span>Asset</span><span>Status</span><span>Claims</span><span>Activation</span><span>Value</span><span/></div>
    {campaigns.map(c=><div className="table-row" key={c.name}><span className="campaign-name"><i>{c.name[0]}</i><b>{c.name}</b></span><span>{c.asset}</span><Status tone={c.status==="Live"?"green":c.status==="Scheduled"?"blue":"grey"}>{c.status}</Status><span>{c.claimed}<small className="row-progress"><i style={{width:`${c.progress}%`}}/></small></span><span>{c.activation}</span><b>{c.value}</b><button aria-label={`Open ${c.name}`}><MoreHorizontal/></button></div>)}
  </div></div>;
}

function Overview({go}:{go:(v:View)=>void}) {
  return <><PageHero eyebrow="LIVE WORKSPACE" title="Value is flowing." copy="Monitor distribution, wallet creation, activation, and the currents that bring users back."><Button tone="cyan" onClick={()=>go("new-campaign")}>Create distribution <ArrowRight/></Button></PageHero>
    <div className="metric-grid-new"><MetricCard label="Assets distributed" value="$128.6K" change="+18.4%" icon={CircleDollarSign}/><MetricCard label="Wallets created" value="10,157" change="+22.1%" icon={Wallet}/><MetricCard label="Activated users" value="7,842" change="+12.8%" icon={Activity}/><MetricCard label="Cost per activation" value="$2.18" change="-8.2%" icon={Target}/></div>
    <div className="overview-grid"><CampaignTable/><div className="data-panel activity-panel"><div className="panel-head"><div><h3>Live current</h3><p>Most recent network events</p></div><Radio/></div>{recipientRows.slice(0,4).map((r,i)=><div className="activity-row" key={r.user}><span className={`activity-node a-${i}`}><i/></span><div><b>{r.user}</b><p>{r.state} · {r.amount}</p></div><time>{r.time}</time></div>)}</div></div></>;
}

function CreateLink() {
  const [asset,setAsset]=useState("USDC"); const [amount,setAmount]=useState("25"); const [created,setCreated]=useState(false);
  return <><PageHero eyebrow="PERSONAL CURRENT" title="Send value before a wallet exists." copy="Create one private, identity-bound, or open link for USDC or any supported project token."/>
    <div className="form-preview-grid"><form className="form-panel" onSubmit={e=>{e.preventDefault();setCreated(true)}}><div className="panel-head"><div><h3>Create an asset link</h3><p>Funds remain recoverable until claimed.</p></div><Status tone="blue">Arc testnet</Status></div>
      <label>Asset<div className="asset-options">{["USDC","TIDE","$CURRENT"].map(x=><button type="button" className={asset===x?"selected":""} onClick={()=>setAsset(x)} key={x}>{x}</button>)}</div></label>
      <label>Amount<div className="amount-input"><input value={amount} onChange={e=>setAmount(e.target.value)} inputMode="decimal"/><span>{asset}</span></div></label>
      <div className="two-fields"><label>Recipient rule<select><option>Anyone with the private link</option><option>Verified email</option><option>Verified X identity</option></select></label><label>Expiration<select><option>7 days</option><option>24 hours</option><option>30 days</option></select></label></div>
      <label>Message<textarea defaultValue="A little value for your next current."/></label>
      <div className="fee-summary"><span>Distribution <b>{amount} {asset}</b></span><span>Sponsored gas <b>$0.02</b></span><span>Current CoFi fee <b>$0.00</b></span></div>
      <Button tone="blue" type="submit">Fund and create link <ArrowRight/></Button></form>
      <aside className="live-link-preview"><FluidCanvas/><Eyebrow light>LIVE PREVIEW</Eyebrow><span className="preview-token">{asset[0]}</span><small>You’re sending</small><strong>{amount || "0"} {asset}</strong><p>A little value for your next current.</p><button>Claim — no gas required</button>{created&&<div className="created-toast"><CheckCircle2/>Link copied to clipboard</div>}</aside></div></>;
}

function ProjectOnboarding({go}:{go:(v:View)=>void}) {
  const [step,setStep]=useState(1);
  return <><PageHero eyebrow="PROJECT ONBOARDING" title="Connect your source." copy="Create the organization, verify the token, fund gas sponsorship, and invite the people who operate your currents."/>
    <div className="onboarding-shell"><div className="onboarding-progress">{["Project","Token","Team","Review"].map((x,i)=><span className={step>=i+1?"active":""} key={x}><i>{step>i+1?<Check/>:i+1}</i>{x}</span>)}</div>
      <div className="form-panel onboarding-card"><Eyebrow>STEP {step} OF 4</Eyebrow><h2>{["Tell us about the project","Connect the project token","Invite the operating team","Review the source"][step-1]}</h2>
        {step===1&&<div className="field-grid"><label>Project name<input defaultValue="Tidebreak"/></label><label>Website<input defaultValue="https://tidebreak.xyz"/></label><label className="full">Description<textarea defaultValue="A community-owned strategy world built on Arc."/></label></div>}
        {step===2&&<div className="field-grid"><label className="full">Token contract<input defaultValue="0x2f...9B41"/></label><label>Symbol<input defaultValue="TIDE"/></label><label>Decimals<input defaultValue="18"/></label></div>}
        {step===3&&<div className="field-grid"><label className="full">Invite by email<input placeholder="builder@project.xyz"/></label><div className="team-invite full"><span>MC</span><div><b>Mara Chen</b><small>Owner · Full access</small></div><Status tone="green">Ready</Status></div></div>}
        {step===4&&<div className="review-stack"><span><CheckCircle2/><b>Project identity</b><small>Tidebreak</small></span><span><CheckCircle2/><b>Token verified</b><small>TIDE · 18 decimals</small></span><span><CheckCircle2/><b>Team permissions</b><small>1 owner</small></span></div>}
        <div className="form-actions"><Button tone="ghost" disabled={step===1} onClick={()=>setStep(Math.max(1,step-1))}>Back</Button><Button tone="blue" onClick={()=>step<4?setStep(step+1):go("new-campaign")}>{step<4?"Continue":"Create first campaign"} <ArrowRight/></Button></div>
      </div></div></>;
}

function Campaigns({go}:{go:(v:View)=>void}) {
  return <><PageHero eyebrow="CAMPAIGN NETWORK" title="Every current, one operating view." copy="Fund, publish, pause, recover, and compare distribution performance across the entire organization." mode="branches"><Button tone="cyan" onClick={()=>go("new-campaign")}>New campaign <Plus/></Button></PageHero><div className="campaign-summary-grid"><MetricCard label="Live currents" value="2" icon={Radio}/><MetricCard label="Unclaimed value" value="$18.4K" icon={Gift}/><MetricCard label="Gas remaining" value="$684" icon={Zap}/><MetricCard label="$CURRENT locked" value="42.5K" icon={Lock}/></div><CampaignTable/></>;
}

function CampaignBuilder({go}:{go:(v:View)=>void}) {
  const [step,setStep]=useState(1); const [mode,setMode]=useState("Identity-bound");
  const labels=["Purpose","Asset","Recipients","Attribution","Fund"];
  return <><PageHero eyebrow="CAMPAIGN BUILDER" title="Design the current." copy="Every campaign is fully funded, measurable, recoverable, and ready for recipients without wallets." mode="branches"/>
    <div className="builder-shell"><aside>{labels.map((x,i)=><button className={step===i+1?"active":step>i+1?"done":""} onClick={()=>setStep(i+1)} key={x}><i>{step>i+1?<Check/>:i+1}</i><span>{x}<small>{["Choose the outcome","Select what flows","Define the audience","Measure activation","Review and publish"][i]}</small></span></button>)}</aside>
      <form className="builder-panel" onSubmit={e=>{e.preventDefault(); if(step<5)setStep(step+1); else go("campaigns")}}>
        <Eyebrow>STEP {step} / 5</Eyebrow>
        <h2>{["What should this current accomplish?","What value will move?","Who receives it?","What counts as activation?","Fund and publish"][step-1]}</h2>
        {step===1&&<div className="choice-cards">{[["Launch allocation",Gift],["User acquisition",Target],["Community rewards",Users],["Agent payments",Bot]].map(([x,I])=>{const Icon=I as typeof Gift;return <button type="button" key={String(x)}><Icon/><b>{String(x)}</b><small>Build a measurable {String(x).toLowerCase()} current.</small></button>})}</div>}
        {step===2&&<div className="field-grid"><label>Asset<select><option>TIDE — Project token</option><option>USDC</option><option>$CURRENT</option></select></label><label>Total allocation<input defaultValue="250000"/></label><label>Reward per person<input defaultValue="2500"/></label><label>Sponsored gas budget<input defaultValue="85 USDC"/></label></div>}
        {step===3&&<><div className="mode-tabs">{["Identity-bound","Private links","Public pool","Allowlist"].map(x=><button type="button" className={mode===x?"active":""} onClick={()=>setMode(x)} key={x}>{x}</button>)}</div><div className="upload-drop"><Upload/><h3>Drop a recipient CSV</h3><p>Email, X handle, game ID, wallet, or custom identity.</p><Button tone="ghost">Browse file</Button></div></>}
        {step===4&&<div className="activation-builder"><label><span>Activation event</span><select><option>Completed project onboarding</option><option>Played 3 matches</option><option>Made first purchase</option><option>Custom signed event</option></select></label><label><span>Referral reward</span><select><option>5 USDC per activated referral</option><option>250 TIDE per activated referral</option><option>No referral reward</option></select></label><div className="event-code"><Webhook/><code>activation.completed</code><Status tone="green">Signed webhook</Status></div></div>}
        {step===5&&<div className="fund-review"><div><small>REWARDS</small><b>250,000 TIDE</b></div><div><small>RECIPIENTS</small><b>100</b></div><div><small>SPONSORED GAS</small><b>85 USDC</b></div><div><small>CURRENT COFI FEE</small><b>2,500 TIDE</b></div><div><small>$CURRENT LOCK</small><b>5,000 CURRENT · 30d</b></div></div>}
        <div className="form-actions"><Button tone="ghost" disabled={step===1} onClick={()=>setStep(step-1)}>Back</Button><Button tone="blue" type="submit">{step===5?"Fund and publish":"Continue"} <ArrowRight/></Button></div>
      </form>
      <aside className="builder-receipt"><Eyebrow>CAMPAIGN CURRENT</Eyebrow><div className="receipt-source"><span>T</span><b>Tidebreak Genesis</b></div><FluidCanvas mode="branches"/><div className="receipt-stats"><span><small>Recipients</small><b>100</b></span><span><small>Potential reach</small><b>4.8K</b></span><span><small>Fully funded</small><b className="green">Yes</b></span></div></aside>
    </div></>;
}

function Recipients() {
  const [uploaded,setUploaded]=useState(false);
  return <><PageHero eyebrow="RECIPIENT CURRENT" title="From targeted identity to active user." copy="Inspect every delivery state, resolve interruptions, resend links, and export the complete activation record." mode="branches"><Button tone="cyan" onClick={()=>setUploaded(true)}>Upload recipients <Upload/></Button></PageHero>
    {uploaded&&<div className="upload-result"><CheckCircle2/><div><b>tidebreak_genesis.csv validated</b><small>2,000 valid · 14 duplicates removed · 3 identities need review</small></div><Button tone="ghost">Review issues</Button></div>}
    <div className="data-panel"><div className="panel-head"><div><h3>Recipient network</h3><p>2,017 identities across 4 campaigns</p></div><div className="table-actions"><label><Search/><input placeholder="Search identity"/></label><button><Download/>Export</button></div></div><div className="recipient-table"><div className="table-head"><span>Recipient</span><span>Amount</span><span>Status</span><span>Source</span><span>Updated</span><span/></div>{recipientRows.map(r=><div className="table-row" key={r.user}><span className="recipient-name"><i>{r.user.split(" ").map(x=>x[0]).join("")}</i><b>{r.user}<small>{r.id}</small></b></span><b>{r.amount}</b><Status tone={r.state==="Activated"?"green":r.state==="Claimed"?"cyan":r.state==="Opened"?"blue":"grey"}>{r.state}</Status><span>{r.source}</span><time>{r.time}</time><button><MoreHorizontal/></button></div>)}</div></div></>;
}

function Referrals() {
  return <><PageHero eyebrow="ATTRIBUTION NETWORK" title="See which currents create retained users." copy="Every claim keeps its source. Every activation moves credit through the referral tree." mode="branches"/>
    <div className="referral-top"><div><small>ATTRIBUTED ACTIVATIONS</small><strong>2,842</strong><em><TrendingUp/>+18.2% this week</em></div><div><small>REWARDS EARNED</small><strong>$14,208</strong><span>1,884 referrals settled</span></div><div className="referral-visual"><FluidCanvas mode="branches"/><span className="ref-root">T</span>{["MC","AY","NW","JP","KL"].map((x,i)=><span className={`ref-node r-${i}`} key={x}>{x}</span>)}</div></div>
    <div className="analysis-grid"><div className="data-panel"><div className="panel-head"><div><h3>Conversion current</h3><p>Genesis campaign · Last 30 days</p></div><Status tone="green">Healthy</Status></div><div className="conversion-current">{[["Links opened","12,420","100%"],["Accounts created","9,884","79.6%"],["Assets claimed","8,241","66.4%"],["Users activated","6,381","51.4%"],["Retained · 30d","4,102","33.0%"]].map(([l,v,p])=><div key={l}><span><b>{l}</b><small>{v}</small></span><i><b style={{width:p}}/></i><em>{p}</em></div>)}</div></div>
      <div className="data-panel"><div className="panel-head"><div><h3>Top referral sources</h3><p>Ranked by activated users</p></div><button>View all</button></div>{[["1","Mara Chen","@marachain","482","71.8%"],["2","Amina Yusuf","@amina.builds","394","69.2%"],["3","Tidebreak DAO","Discord","318","62.4%"],["4","Openplay","Partner","207","58.1%"]].map(x=><div className="leader-row" key={x[1]}><b>{x[0]}</b><i>{x[1][0]}</i><span><strong>{x[1]}</strong><small>{x[2]}</small></span><em>{x[3]} active</em><Status tone="green">{x[4]}</Status></div>)}</div></div></>;
}

function Analytics() {
  const bars=[42,58,49,67,72,61,84,76,91,87,96,78];
  return <><PageHero eyebrow="CAMPAIGN INTELLIGENCE" title="Find where the current accelerates—or breaks." copy="Compare acquisition sources, claim conversion, activation cost, retention, and the exact point where users leave."/>
    <div className="metric-grid-new"><MetricCard label="Claim conversion" value="66.4%" change="+4.2%" icon={Gift}/><MetricCard label="Activation rate" value="51.4%" change="+7.1%" icon={Activity}/><MetricCard label="30d retention" value="33.0%" change="+2.4%" icon={RefreshCw}/><MetricCard label="Campaign ROI" value="3.8×" change="+0.6×" icon={TrendingUp}/></div>
    <div className="analysis-grid"><div className="data-panel chart-panel"><div className="panel-head"><div><h3>Claims and activations</h3><p>Last 12 weeks</p></div><select><option>All campaigns</option></select></div><div className="bar-chart-new">{bars.map((h,i)=><span key={i}><i style={{height:`${h}%`}}/><b style={{height:`${h*.68}%`}}/><small>W{i+1}</small></span>)}</div><div className="chart-key"><span><i/>Claims</span><span><i/>Activations</span></div></div>
      <div className="data-panel"><div className="panel-head"><div><h3>Source quality</h3><p>Cost and retention by channel</p></div></div>{[["X referrals","$1.84","42.8%"],["Discord","$2.02","39.1%"],["Partner apps","$2.26","36.4%"],["Email list","$2.81","28.7%"],["Public link","$3.42","18.2%"]].map((x,i)=><div className="quality-row" key={x[0]}><span className={`source-icon s-${i}`}><Network/></span><b>{x[0]}</b><span><small>CPA</small>{x[1]}</span><span><small>30d retention</small>{x[2]}</span></div>)}</div></div></>;
}

function TokenDashboard() {
  return <><PageHero eyebrow="TRANSPARENT PRODUCT ECONOMICS" title="$CURRENT follows product demand." copy="Watch product fees enter the reserve, batch into market purchases, and route toward burn, project locks, and protocol-owned liquidity." mode="orbit"><Button tone="cyan">View contract <ArrowUpRight/></Button></PageHero>
    <div className="token-metrics-new"><div><small>Product fees generated</small><strong>$284,620</strong><span>All time</span></div><div><small>USDC awaiting buyback</small><strong>$18,420</strong><span>74% to threshold</span></div><div><small>$CURRENT purchased</small><strong>4.82M</strong><span>$96.4K market value</span></div><div><small>Project locks</small><strong>18.7M</strong><span>38 active projects</span></div></div>
    <div className="token-dashboard-grid"><div className="data-panel fee-flow-panel"><div className="panel-head"><div><h3>Fee allocation current</h3><p>Verified product revenue routing</p></div><Status tone="green">Live</Status></div><div className="fee-flow-graphic"><div className="fee-source"><CircleDollarSign/><b>Product fees</b><strong>$284.6K</strong></div><div className="fee-paths">{[["Buyback reserve","35%","#25E8E1"],["Gas sponsorship","25%","#173BFF"],["Protocol liquidity","20%","#20D66B"],["Operations","20%","#6B7E86"]].map(([x,p,c])=><span key={x} style={{"--c":c} as React.CSSProperties}><i/><b>{x}</b><em>{p}</em></span>)}</div></div></div>
      <div className="data-panel"><div className="panel-head"><div><h3>Project lock demand</h3><p>Largest active locks</p></div></div>{[["Tidebreak","5.2M","84 days"],["Openplay","3.8M","112 days"],["Noma Agents","2.4M","64 days"],["Kairo","1.9M","29 days"]].map(x=><div className="lock-row" key={x[0]}><i>{x[0][0]}</i><b>{x[0]}</b><span>{x[1]} CURRENT</span><small>{x[2]}</small></div>)}</div></div></>;
}

function Developers({go}:{go:(v:View)=>void}) {
  return <><PageHero eyebrow="CURRENT COFI API" title="One integration. Every activation current." copy="Create distributions, generate walletless links, submit signed activation events, reward referrals, and let agents move value inside explicit boundaries."><div className="hero-button-row"><Button tone="cyan" onClick={()=>go("api-keys")}>Create API key <ArrowRight/></Button><Button tone="ghost">Read documentation <ArrowUpRight/></Button></div></PageHero>
    <div className="developer-grid"><article><Braces/><h3>Distribution API</h3><p>Create private, identity-bound, public, allowlist, and action-based campaigns.</p><code>POST /v1/distributions</code></article><article><Webhook/><h3>Signed webhooks</h3><p>Receive wallet, claim, activation, referral, refund, and gas-budget events.</p><code>activation.completed</code></article><article><Bot/><h3>Agent tools</h3><p>Let autonomous software reward users under asset, amount, and policy limits.</p><code>cofi.send_reward()</code></article><article><Layers3/><h3>Embeddable UI</h3><p>Place claim, referral, balance, and campaign components inside your own app.</p><code>&lt;CofiClaim /&gt;</code></article></div>
    <div className="quickstart-panel"><div><Eyebrow>THREE-MINUTE QUICKSTART</Eyebrow><h2>Create a walletless USDC current.</h2><ol><li><span>1</span>Install the SDK</li><li><span>2</span>Create a project key</li><li><span>3</span>Generate the distribution</li></ol></div><pre><code><i>import</i> {"{ Current }"} <i>from</i> <b>&quot;@currentcofi/sdk&quot;</b>;<br/><br/><i>const</i> cofi = <i>new</i> Current({"{"} apiKey {"}"});<br/><br/><i>const</i> drop = <i>await</i> cofi.distributions.create({"{"}<br/>  asset: <b>&quot;USDC&quot;</b>,<br/>  amount: <b>&quot;25.00&quot;</b>,<br/>  identity: recipient.email,<br/>  sponsorGas: <b>true</b><br/>{"}"});</code></pre></div></>;
}

function ApiKeys() {
  const [created,setCreated]=useState(false);
  return <><PageHero eyebrow="DEVELOPER ACCESS" title="Keys with deliberate boundaries." copy="Create environment-specific credentials, assign narrow scopes, monitor usage, and revoke access immediately."/><div className="settings-shell"><div className="settings-tabs"><button>General</button><button className="active">API keys</button><button>Webhooks</button><button>Team</button></div><div className="settings-panel"><div className="panel-head"><div><h3>Project API keys</h3><p>Keys are shown once. Store them securely.</p></div><Button tone="blue" onClick={()=>setCreated(true)}>Create key <Plus/></Button></div>{created&&<div className="secret-reveal"><KeyRound/><div><b>Production key created</b><code>cofi_live_7Kp9••••••••••4eQ2</code><small>Copy this key now. It will not be shown again.</small></div><button><Copy/></button></div>}{[["Production","cofi_live_••••••••4eQ2","Distributions · Claims · Analytics","2m ago"],["Staging","cofi_test_••••••••6kL8","All testnet scopes","1d ago"],["Analytics readonly","cofi_ro_••••••••1xP7","Analytics · Recipients","14d ago"]].map((x,i)=><div className="key-row-new" key={x[0]}><span className={`key-symbol k-${i}`}><KeyRound/></span><div><b>{x[0]}</b><code>{x[1]}</code></div><span>{x[2]}</span><time>Used {x[3]}</time><button><MoreHorizontal/></button></div>)}</div></div></>;
}

function WebhooksView() {
  return <><PageHero eyebrow="EVENT DELIVERY" title="Every important state, delivered." copy="Signed webhooks keep games, communities, launchpads, and autonomous agents synchronized with the current."/><div className="settings-shell"><div className="settings-tabs"><button>General</button><button>API keys</button><button className="active">Webhooks</button><button>Team</button></div><div className="settings-panel"><div className="panel-head"><div><h3>Webhook endpoints</h3><p>Signed with your project secret.</p></div><Button tone="blue">Add endpoint <Plus/></Button></div><div className="webhook-endpoint"><span><Webhook/></span><div><b>Production events</b><code>https://api.tidebreak.xyz/cofi/webhooks</code></div><Status tone="green">Healthy</Status><button><MoreHorizontal/></button><div className="endpoint-meta"><span><small>EVENTS</small>8 subscribed</span><span><small>SUCCESS RATE</small>99.98%</span><span><small>LAST DELIVERY</small>18s ago</span></div></div><h3 className="section-subtitle">Recent deliveries</h3>{[["claim.completed","Tidebreak Genesis","200","18s"],["activation.completed","Tidebreak Genesis","200","46s"],["wallet.created","Founders Current","200","2m"],["campaign.gas_low","Agent Week","200","8m"]].map(x=><div className="delivery-row-new" key={x[0]+x[3]}><i/><code>{x[0]}</code><span>{x[1]}</span><Status tone="green">{x[2]}</Status><time>{x[3]} ago</time><button><Eye/></button></div>)}</div></div></>;
}

function Agents() {
  const [paused,setPaused]=useState(false);
  return <><PageHero eyebrow="POLICY-BOUND AGENT NETWORK" title="Let software move value without losing control." copy="Agents create claims, reward completed work, and pay other agents inside explicit asset, amount, recipient, and approval boundaries." mode="orbit"><Button tone="cyan">Create agent <Plus/></Button></PageHero>
    <div className="agent-grid-new">{[["Reward Router","Campaign agent","$1,284 / $5,000",Bot],["Quest Verifier","Action oracle","1,842 events",CheckCircle2],["Community Scout","Growth agent","426 rewards",Network]].map(([name,role,metric,I],i)=>{const Icon=I as typeof Bot;return <article key={String(name)}><div className="agent-head"><span><Icon/></span><Status tone={i===0&&paused?"grey":"green"}>{i===0&&paused?"Paused":"Online"}</Status><button><MoreHorizontal/></button></div><h3>{String(name)}</h3><p>{String(role)}</p><strong>{String(metric)}</strong><small>{i===0?"Daily spend":"Last 30 days"}</small><div className="agent-boundaries"><span><Check/>USDC + TIDE</span><span><Check/>Max $50 / reward</span><span><Check/>Human approval over $250</span></div>{i===0&&<button className="agent-pause" onClick={()=>setPaused(!paused)}>{paused?<Play/>:<Pause/>}{paused?"Resume agent":"Pause agent"}</button>}</article>})}</div>
    <div className="data-panel guardrail-panel"><div className="panel-head"><div><h3>Network guardrails</h3><p>Applied before any agent action reaches a wallet or contract.</p></div><Status tone="green">Enforced</Status></div><div className="guardrail-grid">{[["Daily network limit","$18,000",Gauge],["Approval threshold","$250",ShieldCheck],["Approved assets","3",CircleDollarSign],["Active policy sets","6",SlidersHorizontal]].map(([x,v,I])=>{const Icon=I as typeof Gauge;return <div key={String(x)}><span><Icon/></span><b>{String(v)}</b><small>{String(x)}</small></div>})}</div></div></>;
}

function SettingsView() {
  const [saved,setSaved]=useState(false);
  return <><PageHero eyebrow="ORGANIZATION CONTROL" title="A calm center for the whole network." copy="Manage identity, project branding, members, security, notifications, billing, and network preferences."/><div className="settings-shell"><div className="settings-tabs"><button className="active">General</button><button>Members</button><button>Security</button><button>Billing</button><button>Notifications</button></div><form className="settings-panel" onSubmit={e=>{e.preventDefault();setSaved(true)}}><div className="panel-head"><div><h3>Organization profile</h3><p>Public details used across claims and campaigns.</p></div>{saved&&<Status tone="green">Changes saved</Status>}</div><div className="profile-uploader"><span>T</span><div><b>Project mark</b><small>SVG, PNG, or WebP · 2MB maximum</small></div><Button tone="ghost">Replace image</Button></div><div className="field-grid"><label>Organization name<input defaultValue="Tidebreak Labs"/></label><label>Current username<div className="input-prefix"><span>current.co/</span><input defaultValue="tidebreak"/></div></label><label>Website<input defaultValue="https://tidebreak.xyz"/></label><label>Default network<select><option>Arc testnet</option></select></label><label className="full">Description<textarea defaultValue="The team building Tidebreak and its community economy."/></label></div><div className="form-actions"><Button tone="ghost">Discard</Button><Button tone="blue" type="submit">Save changes</Button></div><div className="danger-zone"><div><b>Delete organization</b><p>Removes offchain data after all campaigns and balances are settled.</p></div><button>Delete</button></div></form></div></>;
}

function StateLab({go}:{go:(v:View)=>void}) {
  return <><PageHero eyebrow="SYSTEM STATES" title="Every interruption has a clear next step." copy="Loading, empty, expired, unavailable, and failure states are designed as carefully as the ideal path."/><div className="state-grid">{[
    ["Loading current","Confirming on Arc testnet",<RefreshCw className="spin" key="a"/>],
    ["Nothing is flowing yet","Create your first distribution to begin.",<Radio key="b"/>],
    ["Claim expired","The unclaimed value is ready to return to its sender.",<Clock3 key="c"/>],
    ["Gas budget is low","Add 25 USDC to keep walletless claims open.",<Zap key="d"/>],
    ["Current interrupted","We could not confirm the transaction. Your funds have not moved.",<X key="e"/>],
    ["Campaign paused","Existing balances remain secured until the project resumes.",<Pause key="f"/>]
  ].map(([title,copy,icon],i)=><article key={String(title)}><span className={`state-icon st-${i}`}>{icon}</span><h3>{String(title)}</h3><p>{String(copy)}</p><Button tone={i===4?"ghost":"dark"} onClick={()=>i===1?go("new-campaign"):undefined}>{i===0?"View transaction":i===1?"Create distribution":i===2?"Return funds":i===3?"Add gas budget":i===4?"Try again":"View campaign"}</Button></article>)}</div></>;
}

function Sidebar({view,go,open,setOpen}:{view:View;go:(v:View)=>void;open:boolean;setOpen:(v:boolean)=>void}) {
  return <><aside className={`app-sidebar ${open?"open":""}`}><div className="sidebar-top"><Brand light onClick={()=>go("home")}/><button aria-label="Close navigation" onClick={()=>setOpen(false)}><X/></button></div><div className="project-switch"><span>T</span><div><b>Tidebreak</b><small>Arc testnet</small></div><ChevronDown/></div><nav>{appNav.map(section=><div key={section.label}><small>{section.label}</small>{section.items.map(([id,label,I])=>{const Icon=I;return <button className={view===id?"active":""} onClick={()=>{go(id as View);setOpen(false)}} key={id}><Icon/>{label}{id==="campaigns"&&<em>4</em>}</button>})}</div>)}</nav><div className="sidebar-bottom"><button onClick={()=>go("api-keys")}><KeyRound/>API keys</button><button onClick={()=>go("webhooks")}><Webhook/>Webhooks</button><button onClick={()=>go("settings")}><Settings/>Settings</button><button onClick={()=>go("states")}><HelpCircle/>System states</button><div className="user-card"><span>MC</span><div><b>Mara Chen</b><small>Owner</small></div><LogOut/></div></div></aside>{open&&<button className="sidebar-shade" aria-label="Close navigation" onClick={()=>setOpen(false)}/>}</>;
}

function AppShell({view,go}:{view:View;go:(v:View)=>void}) {
  const [open,setOpen]=useState(false);
  let page:React.ReactNode;
  switch(view){
    case "overview":page=<Overview go={go}/>;break;
    case "create":page=<CreateLink/>;break;
    case "onboarding":page=<ProjectOnboarding go={go}/>;break;
    case "campaigns":page=<Campaigns go={go}/>;break;
    case "new-campaign":page=<CampaignBuilder go={go}/>;break;
    case "recipients":page=<Recipients/>;break;
    case "referrals":page=<Referrals/>;break;
    case "analytics":page=<Analytics/>;break;
    case "token":page=<TokenDashboard/>;break;
    case "developers":page=<Developers go={go}/>;break;
    case "api-keys":page=<ApiKeys/>;break;
    case "webhooks":page=<WebhooksView/>;break;
    case "agents":page=<Agents/>;break;
    case "settings":page=<SettingsView/>;break;
    default:page=<StateLab go={go}/>;
  }
  return <div className="app-shell"><Sidebar view={view} go={go} open={open} setOpen={setOpen}/><main className="app-main-new"><div className="testnet-strip"><TestTube2/>Arc testnet environment · Balances have no monetary value.<button>Network status <ArrowUpRight/></button></div><header className="app-topbar"><button className="mobile-sidebar-button" onClick={()=>setOpen(true)} aria-label="Open navigation"><Menu/></button><div><span>WORKSPACE /</span><b>{view.replace("-"," ")}</b></div><div><button aria-label="Search"><Search/></button><button aria-label="Notifications"><Bell/></button><Button tone="blue" onClick={()=>go("new-campaign")}>New current <Plus/></Button></div></header><div className="app-view" key={view}>{page}</div></main></div>;
}

export default function CurrentApp() {
  const [view,setView] = useState<View>("home");
  const [transition,setTransition] = useState(false);
  useEffect(()=>{
    const fromHash=()=>{const value=location.hash.replace("#/","") as View;if(value)setView(value)};
    fromHash(); addEventListener("hashchange",fromHash); return()=>removeEventListener("hashchange",fromHash);
  },[]);
  const go=(next:View)=>{
    if(next===view)return;
    setTransition(true);
    setTimeout(()=>{setView(next); location.hash=`/${next}`; scrollTo({top:0,behavior:"instant" as ScrollBehavior}); setTimeout(()=>setTransition(false),120)},260);
  };
  return <><div className={`route-current ${transition?"active":""}`} aria-hidden="true"><i/></div>{view==="home"?<Marketing go={go}/>:view==="claim"?<ClaimView go={go}/>:<AppShell view={view} go={go}/>}</>;
}
