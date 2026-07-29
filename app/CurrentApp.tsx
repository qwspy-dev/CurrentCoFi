"use client";

import {
  Activity, ArrowDownLeft, ArrowRight, ArrowUpRight, BarChart3, Bell,
  Bot, Braces, Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight,
  CircleDollarSign, Clock3, Code2, Copy, CreditCard, Database, Download,
  Eye, FileUp, Fingerprint, Gauge, Gift, Globe2, HelpCircle, KeyRound,
  Layers3, Link2, Lock, LogOut, Menu, MoreHorizontal, Network, Plus,
  Radio, RefreshCw, Search, Send, Settings, ShieldCheck, SlidersHorizontal,
  Sparkles, Target, TerminalSquare, TestTube2, TrendingUp, Upload, Users,
  Wallet, Webhook, X, Zap
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type View =
  | "home" | "claim" | "overview" | "create" | "campaigns" | "new-campaign"
  | "recipients" | "referrals" | "analytics" | "token" | "developers"
  | "api-keys" | "webhooks" | "agents" | "settings" | "error";

const campaignRows = [
  { name: "Tidebreak Genesis", asset: "TIDE", status: "Live", claimed: "8,241 / 10,000", activation: "63.8%", value: "$84.2K" },
  { name: "Founders Current", asset: "USDC", status: "Live", claimed: "1,174 / 1,500", activation: "71.2%", value: "$23.5K" },
  { name: "Agent Week", asset: "FLOW", status: "Scheduled", claimed: "0 / 5,000", activation: "—", value: "$50.0K" },
  { name: "Creator Cohort 01", asset: "USDC", status: "Ended", claimed: "742 / 800", activation: "58.4%", value: "$14.8K" },
];

const recipients = [
  { user: "Mara Chen", id: "@marachain", amount: "2,500 TIDE", state: "Activated", source: "X referral", time: "2m ago" },
  { user: "Noah Williams", id: "noah@prism.xyz", amount: "25 USDC", state: "Claimed", source: "Email list", time: "8m ago" },
  { user: "Amina Yusuf", id: "@amina.builds", amount: "2,500 TIDE", state: "Activated", source: "Discord", time: "14m ago" },
  { user: "Kaito Labs", id: "wallet_8d4f", amount: "2,500 TIDE", state: "Opened", source: "Direct", time: "21m ago" },
  { user: "Jules Park", id: "jules@openplay.gg", amount: "25 USDC", state: "Pending", source: "Partner", time: "34m ago" },
];

const navSections = [
  { label: "Workspace", items: [
    ["overview", "Overview", Gauge], ["create", "Create link", Link2],
    ["campaigns", "Campaigns", Layers3], ["recipients", "Recipients", Users],
    ["referrals", "Referrals", Network], ["analytics", "Analytics", BarChart3],
  ]},
  { label: "Protocol", items: [
    ["token", "$CURRENT", CircleDollarSign], ["developers", "Developers", Code2],
    ["agents", "AI agents", Bot],
  ]},
];

function Brand({ light = false }: { light?: boolean }) {
  return (
    <button className={`brand ${light ? "brand-light" : ""}`} aria-label="Current CoFi home">
      <span className="brand-mark"><span /><span /><span /></span>
      <span>current</span><em>cofi</em>
    </button>
  );
}

function Pill({ children, tone = "blue" }: { children: React.ReactNode; tone?: string }) {
  return <span className={`pill pill-${tone}`}>{children}</span>;
}

function Button({
  children, kind = "primary", icon, onClick, type = "button", disabled = false
}: {
  children: React.ReactNode; kind?: "primary" | "secondary" | "ghost" | "dark";
  icon?: React.ReactNode; onClick?: () => void; type?: "button" | "submit"; disabled?: boolean;
}) {
  return (
    <button className={`button button-${kind}`} onClick={onClick} type={type} disabled={disabled}>
      {children}{icon}
    </button>
  );
}

function Metric({ label, value, change, icon }: { label: string; value: string; change?: string; icon?: React.ReactNode }) {
  return (
    <div className="metric-card">
      <div className="metric-label">{label}{icon}</div>
      <div className="metric-value">{value}</div>
      {change && <div className="metric-change"><TrendingUp size={14}/>{change}</div>}
    </div>
  );
}

function WaveField() {
  return (
    <div className="wave-field" aria-hidden="true">
      <div className="orb orb-one" />
      <div className="orb orb-two" />
      <div className="current current-a" />
      <div className="current current-b" />
      <div className="current current-c" />
      <div className="particle p1" /><div className="particle p2" />
      <div className="particle p3" /><div className="particle p4" />
      <div className="particle p5" /><div className="particle p6" />
    </div>
  );
}

function CurrentMap() {
  return (
    <div className="current-map">
      <div className="map-head">
        <span>LIVE ACTIVATION CURRENT</span>
        <span className="live-dot">● 1,284 flowing now</span>
      </div>
      <div className="map-stage">
        <div className="source-node">
          <div className="project-avatar">T</div>
          <strong>Tidebreak</strong><span>10K recipients</span>
        </div>
        <div className="flow-lines">
          {[0,1,2,3,4].map((i) => <span key={i} style={{"--i": i} as React.CSSProperties}/>)}
        </div>
        <div className="audience-cloud">
          {[0,1,2,3,4,5,6,7,8,9,10,11].map((i) => (
            <span key={i} className={i < 8 ? "activated" : ""} style={{"--i": i} as React.CSSProperties}>
              {i < 8 ? <Check size={11}/> : null}
            </span>
          ))}
        </div>
        <div className="map-tag tag-a"><Wallet size={14}/> wallet created</div>
        <div className="map-tag tag-b"><CheckCircle2 size={14}/> user activated</div>
        <div className="map-tag tag-c"><Send size={14}/> 2,500 TIDE</div>
      </div>
      <div className="map-stats">
        <span><b>82.4%</b> claimed</span>
        <span><b>6,381</b> activated</span>
        <span><b>$2.18</b> cost per user</span>
      </div>
    </div>
  );
}

function HeroFilm() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [canAnimate, setCanAnimate] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [motionBlocked, setMotionBlocked] = useState(false);
  const [motionEnabled, setMotionEnabled] = useState(false);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const desktop = window.matchMedia("(min-width: 761px)");
    const connection = (navigator as Navigator & {
      connection?: { saveData?: boolean };
    }).connection;
    const blocked = reducedMotion.matches || Boolean(connection?.saveData);
    setMotionBlocked(desktop.matches && blocked);
    setCanAnimate(desktop.matches && !blocked);
  }, []);

  useEffect(() => {
    if (!canAnimate || !videoRef.current) return;
    const video = videoRef.current;
    const startPlayback = async () => {
      try {
        await video.play();
      } catch {
        setCanAnimate(false);
      }
    };
    void startPlayback();
  }, [canAnimate]);

  return (
    <>
      <div className={`hero-film ${isPlaying ? "hero-film-playing" : ""} ${motionEnabled ? "hero-film-motion-enabled" : ""}`} aria-hidden="true">
        <img
          className="hero-film-poster hero-film-poster-complete"
          src="/media/currentdes-poster.jpg"
          alt=""
          width="1920"
          height="1080"
          fetchPriority="high"
        />
        {canAnimate && (
          <video
            ref={videoRef}
            className="hero-film-video"
            muted
            playsInline
            preload="auto"
            poster="/media/currentdes-start.jpg"
            onPlaying={() => {
              setIsPlaying(true);
            }}
            onEnded={() => setIsPlaying(true)}
          >
            <source src="/media/currentdes-hero.mp4" type="video/mp4" />
          </video>
        )}
        <div className="hero-film-shade" />
      </div>
      {motionBlocked && !motionEnabled && (
        <button
          className="hero-motion-toggle"
          type="button"
          onClick={() => {
            setMotionEnabled(true);
            setMotionBlocked(false);
            setCanAnimate(true);
          }}
        >
          <span aria-hidden="true">▶</span> Play background motion
        </button>
      )}
    </>
  );
}

function Marketing({ go }: { go: (view: View) => void }) {
  return (
    <main className="marketing">
      <section className="hero hero-cinematic">
        <HeroFilm/>
        <nav className="top-nav">
          <Brand light/>
          <div className="nav-links">
            <a href="#product">Product</a><a href="#developers">Developers</a>
            <a href="#token">$CURRENT</a><a href="#network">Network</a>
          </div>
          <div className="nav-actions">
            <button className="text-link" onClick={() => go("overview")}>Sign in</button>
            <Button kind="secondary" onClick={() => go("new-campaign")}>Launch a current <ArrowUpRight size={15}/></Button>
          </div>
        </nav>
        <div className="hero-content hero-background-content">
          <div className="hero-copy">
            <Pill tone="glass"><Sparkles size={13}/> Built for the Arc economy</Pill>
            <h1>Turn any audience into <span>active token users.</span></h1>
            <p>Distribute USDC or your project token to anyone. No wallet, gas, or crypto knowledge required. Every claim creates a funded account and a measurable user.</p>
            <div className="hero-ctas">
              <Button kind="secondary" onClick={() => go("new-campaign")}>Create distribution <ArrowRight size={16}/></Button>
              <button className="watch-link" onClick={() => go("claim")}><span><ArrowRight size={15}/></span> Experience a claim</button>
            </div>
            <div className="hero-proof">
              <div className="avatar-stack"><span>MC</span><span>AY</span><span>NP</span><span>+8k</span></div>
              <p><b>8,241 wallets funded</b><br/>across 18 project currents</p>
            </div>
          </div>
        </div>
        <div className="hero-marquee">
          <span>WALLETLESS CLAIMS</span><i/> <span>PROJECT TOKEN DISTRIBUTION</span><i/>
          <span>USDC PAYMENTS</span><i/> <span>ATTRIBUTED GROWTH</span><i/>
        </div>
      </section>

      <section className="statement" id="product">
        <div className="section-kicker">01 / THE NETWORK</div>
        <h2>Projects have audiences.<br/>We turn them into <span>economies.</span></h2>
        <p>Current CoFi connects identity, wallets, assets, and activation in one programmable flow.</p>
        <div className="flow-steps">
          {[
            ["01", "Fund", "Deposit USDC or your project token.", Database],
            ["02", "Reach", "Send to email, social, link, QR, or API.", Radio],
            ["03", "Claim", "Embedded wallet appears. Gas is sponsored.", Fingerprint],
            ["04", "Activate", "Track actions, referrals, and retention.", Activity],
          ].map(([n,t,d,I]) => {
            const Icon = I as typeof Database;
            return <div className="flow-step" key={String(n)}><span>{String(n)}</span><Icon/><h3>{String(t)}</h3><p>{String(d)}</p></div>
          })}
        </div>
      </section>

      <section className="product-showcase">
        <div className="showcase-copy">
          <div className="section-kicker">02 / DISTRIBUTION</div>
          <h2>One current.<br/>Every channel.</h2>
          <p>Assign rewards before a wallet exists. Current CoFi verifies the recipient, creates the account, sponsors the claim, and returns activation data.</p>
          <ul className="check-list">
            <li><Check/> Any supported Arc token or USDC</li>
            <li><Check/> Identity-bound or open claim links</li>
            <li><Check/> Referral trees and activation events</li>
            <li><Check/> Expiration, recovery, and full attribution</li>
          </ul>
          <Button kind="dark" onClick={() => go("new-campaign")}>Build a campaign <ArrowRight size={16}/></Button>
        </div>
        <div className="phone-cluster">
          <div className="phone phone-back">
            <div className="phone-top"/><div className="mini-balance">$1,284.00</div>
            <div className="mini-wave"/><div className="mini-row"/><div className="mini-row short"/>
          </div>
          <div className="phone phone-front">
            <div className="phone-top"/><div className="claim-project"><span>T</span>Tidebreak</div>
            <p>You received</p><strong>2,500 TIDE</strong><small>≈ $42.50</small>
            <div className="mini-current"><span/><span/><span/></div>
            <button>Claim to Current</button><em>No wallet or gas required</em>
          </div>
          <div className="floating-card fc-one"><CheckCircle2/> Wallet created</div>
          <div className="floating-card fc-two"><Users/> 8,241 claimed</div>
        </div>
      </section>

      <section className="platform-grid" id="developers">
        <article className="platform-card dark-card">
          <div className="section-kicker light">FOR BUILDERS</div>
          <h3>One API.<br/>A million funded wallets.</h3>
          <p>Embed distributions, claims, referral attribution, and activation reporting into games, apps, launchpads, and autonomous agents.</p>
          <div className="code-window">
            <div><i/><i/><i/></div>
            <pre><code><span>await</span> current.campaigns.create({"{"}<br/>
  asset: <b>&quot;TIDE&quot;</b>,<br/>  recipients: audience,<br/>
  onboarding: <b>&quot;embedded&quot;</b>,<br/>  attribution: <b>true</b><br/>{"}"})</code></pre>
          </div>
        </article>
        <article className="platform-card agent-card">
          <div className="section-kicker">FOR AGENTS</div>
          <h3>Give software<br/>a distribution layer.</h3>
          <p>Agents can fund rewards, generate claims, verify outcomes, and read campaign performance under human-controlled permissions.</p>
          <div className="agent-visual">
            <div className="agent-core"><Bot/></div>
            <span className="agent-line l1"/><span className="agent-line l2"/><span className="agent-line l3"/>
            <div className="agent-node n1"><Gift/> Reward</div>
            <div className="agent-node n2"><ShieldCheck/> Verify</div>
            <div className="agent-node n3"><BarChart3/> Measure</div>
          </div>
        </article>
      </section>

      <section className="token-section" id="token">
        <div className="token-orbit"><div className="token-coin">$</div><span/><span/><span/></div>
        <div className="token-copy">
          <div className="section-kicker light">03 / $CURRENT</div>
          <h2>Product fees<br/>return to the current.</h2>
          <p>Projects lock $CURRENT for advanced distribution. A published share of product fees purchases $CURRENT from the market, making protocol usage visible onchain.</p>
          <div className="token-metrics">
            <div><b>$348K</b><span>Product fees</span></div>
            <div><b>18.4M</b><span>$CURRENT locked</span></div>
            <div><b>6.2M</b><span>Purchased</span></div>
          </div>
          <Button kind="secondary" onClick={() => go("token")}>Explore $CURRENT <ArrowRight size={16}/></Button>
        </div>
      </section>

      <section className="final-cta">
        <WaveField/>
        <div className="section-kicker light">START THE FLOW</div>
        <h2>Your audience is already there.<br/>Fund their wallets.</h2>
        <div><Button kind="secondary" onClick={() => go("new-campaign")}>Create your first current <ArrowRight size={16}/></Button></div>
      </section>
      <footer>
        <Brand/><p>Token activation infrastructure for the Arc economy.</p>
        <div><a>Docs</a><a>Brand</a><a>X</a><a>Discord</a><a>Terms</a></div>
        <span>© 2026 Current CoFi</span>
      </footer>
    </main>
  );
}

function ClaimView({ go }: { go: (view: View) => void }) {
  const [stage, setStage] = useState<"claim"|"login"|"processing"|"success">("claim");
  return (
    <main className="claim-screen">
      <WaveField/>
      <header><Brand light/><span className="secure"><ShieldCheck/> Secured on Arc</span></header>
      <section className="claim-card">
        {stage === "claim" && <>
          <div className="claim-avatar">T</div><p className="sent-by">Tidebreak sent you</p>
          <h1>2,500 <span>TIDE</span></h1><div className="claim-value">≈ $42.50 USD</div>
          <div className="claim-message">“Welcome to the genesis current. Your allocation is ready.”</div>
          <div className="claim-detail"><span><Clock3/> Expires in 6 days</span><span><Zap/> Gas sponsored</span></div>
          <Button onClick={() => setStage("login")} icon={<ArrowRight/>}>Claim your tokens</Button>
          <small>No wallet, crypto, or payment required</small>
        </>}
        {stage === "login" && <>
          <button className="back-mini" onClick={() => setStage("claim")}><ChevronLeft/> Back</button>
          <div className="claim-icon"><Fingerprint/></div><h2>Create your Current account</h2>
          <p className="subcopy">Sign in once. Your secure Arc wallet is created automatically.</p>
          <button className="social-button" onClick={() => setStage("processing")}><b className="google-g">G</b> Continue with Google</button>
          <button className="social-button" onClick={() => setStage("processing")}><span>@</span> Continue with email</button>
          <div className="divider"><span>or use an existing wallet</span></div>
          <button className="wallet-button" onClick={() => setStage("processing")}><Wallet/> Connect wallet</button>
        </>}
        {stage === "processing" && <>
          <div className="processing-orb"><span/><span/><Wallet/></div>
          <h2>Creating your account</h2><p className="subcopy">Funding your new wallet with 2,500 TIDE</p>
          <div className="progress-track"><span/></div>
          <div className="process-list">
            <span><Check/> Identity verified</span><span><Check/> Wallet created</span><span className="active"><RefreshCw/> Claiming tokens</span>
          </div>
          <Button onClick={() => setStage("success")}>Finish demo</Button>
        </>}
        {stage === "success" && <>
          <div className="success-rings"><Check/></div><Pill tone="green">CLAIM COMPLETE</Pill>
          <h2>You’re funded.</h2><p className="subcopy">2,500 TIDE is now in your Current account.</p>
          <div className="received-balance"><span>Current balance</span><b>2,500 TIDE</b><em>$42.50</em></div>
          <Button onClick={() => go("overview")} icon={<ArrowRight/>}>Open your account</Button>
          <button className="text-button" onClick={() => setStage("claim")}>Replay claim</button>
        </>}
      </section>
      <div className="claim-trust"><span><Lock/> Private by design</span><span><ShieldCheck/> Wallet you control</span><span><Zap/> Zero gas</span></div>
    </main>
  );
}

function Sidebar({ view, go, open, close }: { view: View; go: (v: View) => void; open: boolean; close: () => void }) {
  return (
    <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
      <div className="sidebar-head"><Brand/><button onClick={close}><X/></button></div>
      <button className="workspace-switch"><span className="project-avatar sm">T</span><span><b>Tidebreak Labs</b><small>Project workspace</small></span><ChevronDown/></button>
      <nav>
        {navSections.map(section => <div className="nav-section" key={section.label}>
          <label>{section.label}</label>
          {section.items.map(([id,label,I]) => {
            const Icon = I as typeof Gauge;
            return <button key={String(id)} className={view === id ? "active" : ""} onClick={() => {go(id as View); close();}}><Icon/>{String(label)}{id === "campaigns" && <em>4</em>}</button>
          })}
        </div>)}
      </nav>
      <div className="sidebar-bottom">
        <button><HelpCircle/> Help center</button><button onClick={() => go("settings")}><Settings/> Settings</button>
        <div className="user-chip"><span>DC</span><div><b>Dylan Current</b><small>dylan@current.fi</small></div><MoreHorizontal/></div>
      </div>
    </aside>
  );
}

function AppHeader({ title, eyebrow, onMenu = () => {} }: { title: string; eyebrow?: string; onMenu?: () => void }) {
  return (
    <header className="app-header">
      <button className="mobile-menu" onClick={onMenu}><Menu/></button>
      <div><small>{eyebrow || "TIDEBREAK LABS"}</small><h1>{title}</h1></div>
      <div className="app-header-actions"><button><Search/></button><button><Bell/><i/></button><Button kind="dark">Fund account <Plus size={15}/></Button></div>
    </header>
  );
}

function Overview({ go }: { go: (v: View) => void }) {
  return <>
    <AppHeader title="Good morning, Dylan." eyebrow="TUESDAY, JULY 28"/>
    <div className="overview-hero">
      <div><Pill tone="glass">NETWORK CURRENT</Pill><h2>8,241 wallets funded.<br/><span>6,381 users activated.</span></h2><p>Your strongest current this week is X referrals, converting at 68.4%.</p></div>
      <div className="mini-flow-visual"><span/><span/><span/><b>+428</b><small>activated today</small></div>
    </div>
    <div className="metric-grid">
      <Metric label="Total distributed" value="$172,480" change="+18.4% this month" icon={<ArrowUpRight/>}/>
      <Metric label="Wallets created" value="8,241" change="+428 this week" icon={<Wallet/>}/>
      <Metric label="Activation rate" value="63.8%" change="+5.2% vs last week" icon={<Activity/>}/>
      <Metric label="Cost per activation" value="$2.18" change="12% more efficient" icon={<Target/>}/>
    </div>
    <div className="dashboard-grid">
      <section className="panel activation-panel">
        <div className="panel-head"><div><small>ACTIVATION FLOW</small><h3>Audience conversion</h3></div><button>This month <ChevronDown/></button></div>
        <div className="funnel">
          {[
            ["Targeted", "14,200", "100%"], ["Opened", "11,840", "83.4%"],
            ["Wallet created", "9,126", "64.3%"], ["Claimed", "8,241", "58.0%"],
            ["Activated", "6,381", "44.9%"],
          ].map(([l,v,p],i)=><div key={l} style={{"--w": p, "--i": i} as React.CSSProperties}><span>{l}</span><b>{v}</b><em>{p}</em></div>)}
        </div>
      </section>
      <section className="panel activity-feed">
        <div className="panel-head"><div><small>LIVE CURRENT</small><h3>Recent activity</h3></div><button><MoreHorizontal/></button></div>
        {recipients.slice(0,4).map((r,i)=><div className="activity-item" key={r.id}><span className={`activity-icon a${i}`}><ArrowDownLeft/></span><div><b>{r.user}</b><small>{r.state.toLowerCase()} {r.amount}</small></div><time>{r.time}</time></div>)}
        <button className="panel-link" onClick={() => go("recipients")}>View all activity <ArrowRight/></button>
      </section>
    </div>
    <section className="panel campaign-table">
      <div className="panel-head"><div><small>CAMPAIGNS</small><h3>Active currents</h3></div><Button kind="secondary" onClick={() => go("new-campaign")}>New campaign <Plus/></Button></div>
      <CampaignTable/>
    </section>
  </>;
}

function CampaignTable() {
  return <div className="table-wrap"><table><thead><tr><th>Campaign</th><th>Asset</th><th>Status</th><th>Claims</th><th>Activation</th><th>Distributed</th><th/></tr></thead><tbody>
    {campaignRows.map(row => <tr key={row.name}><td><span className="campaign-dot"/><b>{row.name}</b></td><td><Pill tone="neutral">{row.asset}</Pill></td><td><Pill tone={row.status === "Live" ? "green" : row.status === "Scheduled" ? "blue" : "neutral"}>{row.status}</Pill></td><td>{row.claimed}</td><td>{row.activation}</td><td><b>{row.value}</b></td><td><MoreHorizontal/></td></tr>)}
  </tbody></table></div>;
}

function CreateLink() {
  const [step, setStep] = useState(1);
  const [asset, setAsset] = useState("USDC");
  return <>
    <AppHeader title="Create asset link" eyebrow="PERSONAL CURRENT"/>
    <div className="form-shell two-col">
      <section className="form-card">
        <div className="stepper"><span className="active">1</span><i/><span className={step>1?"active":""}>2</span><i/><span className={step>2?"active":""}>3</span></div>
        <div className="form-head"><Pill tone="blue">STEP {step} OF 3</Pill><h2>{step===1?"Choose what to send":step===2?"Set claim details":"Review your current"}</h2><p>{step===1?"Send USDC or any supported Arc token.":step===2?"Choose who can claim and when it expires.":"Confirm the asset, recipient, and sponsored costs."}</p></div>
        {step===1 && <div className="form-body">
          <label className="field-label">Asset</label>
          <div className="asset-toggle"><button className={asset==="USDC"?"selected":""} onClick={()=>setAsset("USDC")}><span className="asset usdc">$</span><b>USDC</b><small>USD Coin</small><Check/></button><button className={asset==="TIDE"?"selected":""} onClick={()=>setAsset("TIDE")}><span className="asset tide">T</span><b>TIDE</b><small>Tidebreak</small><Check/></button></div>
          <label className="field-label">Amount</label><div className="amount-input"><input defaultValue="25.00"/><span>{asset}</span></div>
          <div className="balance-line"><span>Available balance</span><b>{asset==="USDC"?"$12,842.44":"4,280,000 TIDE"}</b></div>
        </div>}
        {step===2 && <div className="form-body">
          <label className="field-label">Claim type</label><div className="choice-grid"><button className="selected"><Link2/><b>Private link</b><small>Anyone with the link can claim</small></button><button><Fingerprint/><b>Identity bound</b><small>Only the selected person</small></button></div>
          <label className="field-label">Message</label><textarea defaultValue="A little current for you ✦"/>
          <label className="field-label">Expires</label><div className="select-control">7 days <ChevronDown/></div>
        </div>}
        {step===3 && <div className="review-card">
          <div className="review-asset"><span className={`asset ${asset.toLowerCase()}`}>{asset[0]}</span><div><small>You’re sending</small><b>25.00 {asset}</b></div></div>
          <dl><div><dt>Claim type</dt><dd>Private link</dd></div><div><dt>Expiration</dt><dd>7 days</dd></div><div><dt>Sponsored gas</dt><dd>$0.03</dd></div><div><dt>Current fee</dt><dd>Free</dd></div></dl>
        </div>}
        <div className="form-actions">{step>1?<Button kind="ghost" onClick={()=>setStep(step-1)}><ChevronLeft/> Back</Button>:<span/>}<Button onClick={()=>setStep(Math.min(3,step+1))}>{step===3?"Fund and create":"Continue"} <ArrowRight/></Button></div>
      </section>
      <aside className="live-preview">
        <div className="preview-label"><Eye/> LIVE PREVIEW</div>
        <div className="preview-phone"><div className="phone-top"/><Brand/><span className={`asset ${asset.toLowerCase()}`}>{asset[0]}</span><small>Dylan sent you</small><h3>25.00 {asset}</h3><p>“A little current for you ✦”</p><button>Claim now</button><em>No wallet or gas required</em></div>
      </aside>
    </div>
  </>;
}

function Campaigns({ go }: { go:(v:View)=>void }) {
  return <>
    <AppHeader title="Campaigns" eyebrow="PROJECT DISTRIBUTION"/>
    <div className="toolbar"><div className="search-box"><Search/><input placeholder="Search campaigns"/></div><button className="filter"><SlidersHorizontal/> Filter</button><Button onClick={()=>go("new-campaign")}>New campaign <Plus/></Button></div>
    <div className="campaign-cards">
      {campaignRows.map((r,i)=><article className="campaign-card" key={r.name}>
        <div className="campaign-card-top"><span className={`campaign-symbol s${i}`}>{r.asset[0]}</span><Pill tone={r.status==="Live"?"green":r.status==="Scheduled"?"blue":"neutral"}>{r.status}</Pill><button><MoreHorizontal/></button></div>
        <h3>{r.name}</h3><p>{r.asset} distribution current</p>
        <div className="campaign-progress"><span><i style={{width: i===2?"0%":i===3?"92%":i===1?"78%":"82%"}}/></span><div><b>{r.claimed}</b><em>claims</em></div></div>
        <dl><div><dt>Activation</dt><dd>{r.activation}</dd></div><div><dt>Distributed</dt><dd>{r.value}</dd></div></dl>
        <button className="card-link" onClick={()=>go("analytics")}>Open campaign <ArrowRight/></button>
      </article>)}
    </div>
  </>;
}

function NewCampaign({ go }: { go:(v:View)=>void }) {
  const [step,setStep]=useState(1);
  const steps=["Type","Asset","Audience","Attribution","Fund"];
  return <>
    <AppHeader title="Create campaign" eyebrow="NEW DISTRIBUTION CURRENT"/>
    <div className="campaign-builder">
      <aside className="builder-steps">{steps.map((s,i)=><button className={step===i+1?"active":step>i+1?"done":""} onClick={()=>setStep(i+1)} key={s}><span>{step>i+1?<Check/>:i+1}</span><div><b>{s}</b><small>{["Choose a current","Set rewards","Add recipients","Measure activation","Review and launch"][i]}</small></div></button>)}</aside>
      <section className="builder-main">
        <Pill tone="blue">STEP {step} OF 5</Pill>
        <h2>{["What are you creating?","Choose the reward asset","Who should receive it?","Define activation and attribution","Fund the current"][step-1]}</h2>
        <p>{["Select the distribution format that fits your audience.","Distribute USDC or your project token.","Upload identities or create an open claim.","Track who claimed and who became active.","Review rewards, fees, gas, and $CURRENT access."][step-1]}</p>
        {step===1 && <div className="builder-options">
          <button className="selected"><Gift/><b>Token launch</b><small>Assign a project token to an offchain audience.</small><Check/></button>
          <button><Users/><b>Community rewards</b><small>Reward contributors, members, or players.</small></button>
          <button><Target/><b>Activation campaign</b><small>Reward users after a verified action.</small></button>
          <button><CircleDollarSign/><b>USDC distribution</b><small>Fund grants, incentives, and payouts.</small></button>
        </div>}
        {step===2 && <div className="builder-form"><label>Token contract</label><div className="select-control"><span className="asset tide">T</span><b>TIDE</b><small>0x842...98c1</small><ChevronDown/></div><div className="form-row"><div><label>Total reward pool</label><div className="amount-input"><input defaultValue="25000000"/><span>TIDE</span></div></div><div><label>Reward per recipient</label><div className="amount-input"><input defaultValue="2500"/><span>TIDE</span></div></div></div><div className="info-strip"><Users/> This current can fund <b>10,000 recipients</b></div></div>}
        {step===3 && <div className="upload-zone"><FileUp/><h3>Upload your audience</h3><p>CSV with email, social handle, wallet, or external user ID</p><Button kind="secondary">Choose file <Upload/></Button><small>or drag and drop up to 100,000 recipients</small></div>}
        {step===4 && <div className="builder-form"><label>Activation event</label><div className="select-control">Completed first in-app action <ChevronDown/></div><label>Referral reward</label><div className="toggle-row"><div><b>Reward successful referrals</b><small>Only after the referred user activates</small></div><span className="toggle on"><i/></span></div><div className="form-row"><div><label>Referrer reward</label><div className="amount-input"><input defaultValue="250"/><span>TIDE</span></div></div><div><label>Attribution window</label><div className="select-control">30 days <ChevronDown/></div></div></div></div>}
        {step===5 && <div className="fund-summary"><div className="fund-total"><small>Total to fund</small><b>25,000,000 TIDE</b><span>≈ $425,000</span></div><dl><div><dt>Campaign fee</dt><dd>1.00% · $4,250 USDC</dd></div><div><dt>Sponsored gas reserve</dt><dd>$312 USDC</dd></div><div><dt>$CURRENT lock</dt><dd>250,000 · 60 days</dd></div><div><dt>Expected wallets</dt><dd>10,000</dd></div></dl><div className="buyback-note"><RefreshCw/><span><b>Every fee joins the current</b><small>$1,487.50 of this fee is assigned to $CURRENT market purchases.</small></span></div></div>}
        <div className="form-actions"><Button kind="ghost" disabled={step===1} onClick={()=>setStep(Math.max(1,step-1))}><ChevronLeft/> Back</Button><Button onClick={()=>step===5?go("campaigns"):setStep(step+1)}>{step===5?"Fund and launch":"Continue"} <ArrowRight/></Button></div>
      </section>
      <aside className="builder-summary"><small>CAMPAIGN SUMMARY</small><h3>Tidebreak Genesis</h3><div className="summary-current"><span/><span/><span/></div><dl><div><dt>Type</dt><dd>Token launch</dd></div><div><dt>Asset</dt><dd>TIDE</dd></div><div><dt>Audience</dt><dd>10,000</dd></div><div><dt>Activation</dt><dd>Enabled</dd></div></dl><div className="summary-status"><CheckCircle2/> Fully funded before launch</div></aside>
    </div>
  </>;
}

function Recipients() {
  return <>
    <AppHeader title="Recipients" eyebrow="AUDIENCE MANAGEMENT"/>
    <div className="metric-grid compact"><Metric label="Total recipients" value="14,200" change="+1,842 this month"/><Metric label="Wallets created" value="9,126" change="64.3% conversion"/><Metric label="Activated" value="6,381" change="69.9% of wallets"/><Metric label="Unclaimed" value="5,959" change="$31.4K recoverable"/></div>
    <section className="panel">
      <div className="toolbar table-toolbar"><div className="search-box"><Search/><input placeholder="Search identity or wallet"/></div><button className="filter"><SlidersHorizontal/> Status</button><button className="filter"><Download/> Export</button><Button><Upload/> Upload recipients</Button></div>
      <div className="table-wrap"><table><thead><tr><th><input type="checkbox"/></th><th>Recipient</th><th>Allocation</th><th>Status</th><th>Source</th><th>Last activity</th><th/></tr></thead><tbody>{recipients.map(r=><tr key={r.id}><td><input type="checkbox"/></td><td><div className="recipient-cell"><span>{r.user[0]}</span><div><b>{r.user}</b><small>{r.id}</small></div></div></td><td><b>{r.amount}</b></td><td><Pill tone={r.state==="Activated"?"green":r.state==="Pending"?"neutral":"blue"}>{r.state}</Pill></td><td>{r.source}</td><td>{r.time}</td><td><MoreHorizontal/></td></tr>)}</tbody></table></div>
      <div className="pagination"><span>Showing 1–5 of 14,200</span><div><button><ChevronLeft/></button><button className="active">1</button><button>2</button><button>3</button><button><ChevronRight/></button></div></div>
    </section>
  </>;
}

function Referrals() {
  return <>
    <AppHeader title="Referrals & attribution" eyebrow="GROWTH CURRENT"/>
    <div className="referral-hero"><div><small>ATTRIBUTED ACTIVATIONS</small><b>2,842</b><span><TrendingUp/> +28.4% this month</span></div><div className="referral-stream">{[1,2,3,4,5,6].map(i=><span key={i} style={{"--i":i} as React.CSSProperties}/>)}</div><div><small>REWARDS PAID</small><b>$18,420</b><em>74% after verified activation</em></div></div>
    <div className="dashboard-grid">
      <section className="panel referral-funnel"><div className="panel-head"><div><small>CONVERSION PATH</small><h3>Referral current</h3></div><button>30 days <ChevronDown/></button></div>
        <div className="path-chart">{[["Link clicks","8,240","100%"],["Wallets","5,920","71.8%"],["Claims","4,812","58.4%"],["Activated","2,842","34.5%"],["Retained","2,106","25.5%"]].map((x,i)=><div key={x[0]}><span style={{height:`${130-i*18}px`}}/><b>{x[1]}</b><small>{x[0]}</small><em>{x[2]}</em></div>)}</div>
      </section>
      <section className="panel"><div className="panel-head"><div><small>TOP SOURCES</small><h3>Where users flow from</h3></div><button><MoreHorizontal/></button></div>
        {[["X creators","1,184","68.4%"],["Discord partners","742","61.8%"],["Direct community","518","58.1%"],["Agent campaigns","284","72.3%"]].map((r,i)=><div className="source-row" key={r[0]}><span className={`source-icon c${i}`}><Network/></span><div><b>{r[0]}</b><span><i style={{width:r[2]}}/></span></div><strong>{r[1]}<small>{r[2]}</small></strong></div>)}
      </section>
    </div>
    <section className="panel leaderboard"><div className="panel-head"><div><small>COMMUNITY LEADERS</small><h3>Top referrers</h3></div><Button kind="secondary">Download rewards <Download/></Button></div>
      {[["Mara Chen","@marachain","428","312","$1,248"],["Amina Yusuf","@amina.builds","361","284","$1,136"],["Noah Williams","@noahweb3","294","218","$872"],["CurrentBot","agent_04","221","192","$768"]].map((r,i)=><div className="leader-row" key={r[1]}><b>0{i+1}</b><span className="leader-avatar">{r[0][0]}</span><div><strong>{r[0]}</strong><small>{r[1]}</small></div><span>{r[2]} referrals</span><span>{r[3]} activated</span><em>{r[4]}</em></div>)}
    </section>
  </>;
}

function Analytics() {
  const bars = [32,48,42,67,54,72,63,88,71,92,84,96];
  return <>
    <AppHeader title="Campaign analytics" eyebrow="TIDEBREAK GENESIS"/>
    <div className="analytics-banner"><div><Pill tone="green">LIVE</Pill><h2>Tidebreak Genesis</h2><p>Token launch · 10,000 recipients · TIDE</p></div><div className="banner-actions"><Button kind="secondary">Share report <ArrowUpRight/></Button><Button>Manage campaign <SlidersHorizontal/></Button></div></div>
    <div className="metric-grid"><Metric label="Distributed" value="$84,241" change="8,241 claims"/><Metric label="Wallet conversion" value="77.1%" change="+9.2% benchmark"/><Metric label="Activation" value="63.8%" change="6,381 users"/><Metric label="7 day retention" value="71.4%" change="+12.8% benchmark"/></div>
    <div className="dashboard-grid wide-main">
      <section className="panel chart-panel"><div className="panel-head"><div><small>ACTIVATION OVER TIME</small><h3>Funded wallets becoming users</h3></div><div className="legend"><span className="blue"/>Claims <span className="green"/>Activations</div></div>
        <div className="bar-chart">{bars.map((v,i)=><div key={i}><span className="claims" style={{height:`${v}%`}}/><span className="activations" style={{height:`${v*.68}%`}}/><small>{i+17}</small></div>)}</div>
      </section>
      <section className="panel insight-card"><Pill tone="green"><Sparkles/> CURRENT INSIGHT</Pill><h3>X referrals are your highest-quality source.</h3><p>They activate 18% more often and retain 12 days longer than direct links.</p><button>View source analysis <ArrowRight/></button></section>
    </div>
    <section className="panel"><div className="panel-head"><div><small>CAMPAIGN FUNNEL</small><h3>From audience to retained user</h3></div><button>Compare <ChevronDown/></button></div><div className="horizontal-funnel">{[["Targeted","10,000","100"],["Opened","9,214","92"],["Wallet created","8,726","87"],["Claimed","8,241","82"],["Activated","6,381","64"],["Retained","4,556","46"]].map((x,i)=><div key={x[0]}><span style={{width:`${x[2]}%`}} className={`f${i}`}/><b>{x[1]}</b><small>{x[0]}</small><em>{x[2]}%</em></div>)}</div></section>
  </>;
}

function TokenDashboard() {
  return <>
    <AppHeader title="$CURRENT" eyebrow="PROTOCOL ECONOMY"/>
    <div className="token-app-hero"><div className="token-app-copy"><div className="token-title"><span className="token-logo">$</span><div><small>CURRENT COFI TOKEN</small><h2>$CURRENT</h2></div></div><p>The access and economic layer for Current CoFi’s distribution network.</p><div className="token-price"><b>$0.0842</b><span><TrendingUp/> 8.4%</span></div><Button>Acquire $CURRENT <ArrowUpRight/></Button></div><div className="token-wave"><span/><span/><span/><div><b>18.4M</b><small>locked in the current</small></div></div></div>
    <div className="metric-grid"><Metric label="Product fees" value="$348,241" change="+22.1% this month"/><Metric label="Market purchases" value="$121,884" change="6.2M CURRENT"/><Metric label="Project locks" value="18.4M" change="42 active projects"/><Metric label="Protocol liquidity" value="$842,100" change="+$28K this week"/></div>
    <div className="dashboard-grid">
      <section className="panel"><div className="panel-head"><div><small>FEE CURRENT</small><h3>Where every product fee flows</h3></div><button>This month <ChevronDown/></button></div><div className="fee-donut"><div className="donut"><span>$84.2K<small>allocated</small></span></div><div className="fee-legend"><div><i className="b1"/><span>Market purchases</span><b>35%</b></div><div><i className="b2"/><span>Protocol liquidity</span><b>20%</b></div><div><i className="b3"/><span>Gas sponsorship</span><b>20%</b></div><div><i className="b4"/><span>Operations</span><b>25%</b></div></div></div></section>
      <section className="panel lock-card"><div className="panel-head"><div><small>YOUR ACCESS</small><h3>Project lock</h3></div><Pill tone="blue">GROWTH TIER</Pill></div><div className="lock-balance"><small>Currently locked</small><b>250,000 CURRENT</b><span>Unlocks Sep 28, 2026</span></div><div className="benefits"><span><Check/> Up to 25K recipients</span><span><Check/> Advanced attribution</span><span><Check/> Sponsored discovery</span></div><Button>Manage lock <Lock/></Button></section>
    </div>
    <section className="panel transaction-panel"><div className="panel-head"><div><small>VERIFIABLE ACTIVITY</small><h3>Recent fee purchases</h3></div><a>View on Arc explorer <ArrowUpRight/></a></div>
      {[["Batch #128","$8,420 USDC","102,841 CURRENT","Burned","2h ago"],["Batch #127","$6,184 USDC","76,284 CURRENT","Liquidity","1d ago"],["Batch #126","$9,241 USDC","118,420 CURRENT","Burned","2d ago"]].map(r=><div className="token-tx" key={r[0]}><span className="tx-icon"><RefreshCw/></span><b>{r[0]}</b><span>{r[1]}</span><span>{r[2]}</span><Pill tone={r[3]==="Burned"?"green":"blue"}>{r[3]}</Pill><time>{r[4]}</time></div>)}
    </section>
  </>;
}

function Developers({ go }: { go:(v:View)=>void }) {
  return <>
    <AppHeader title="Developers" eyebrow="BUILD ON THE CURRENT"/>
    <div className="dev-hero"><div><Pill tone="blue"><Code2/> API v1.0</Pill><h2>Turn one API call into<br/>a funded Arc wallet.</h2><p>Build walletless USDC and token distribution into games, apps, communities, launchpads, and autonomous agents.</p><div><Button onClick={()=>go("api-keys")}>Create API key <KeyRound/></Button><Button kind="secondary">Read the docs <ArrowUpRight/></Button></div></div><div className="dev-code"><div className="code-tabs"><span className="active">TypeScript</span><span>cURL</span><span>Python</span></div><pre><code><i>const</i> campaign = <i>await</i> current.campaigns.create({"{"}<br/><br/>  project: <b>&quot;tidebreak&quot;</b>,<br/>  asset: <b>&quot;0x842...98c1&quot;</b>,<br/>  recipients: audience,<br/>  onboarding: {"{"}<br/>    wallet: <b>&quot;embedded&quot;</b>,<br/>    gas: <b>&quot;sponsored&quot;</b><br/>  {"}"},<br/>  attribution: <b>true</b><br/>{"}"});</code></pre><button><Copy/> Copy</button></div></div>
    <div className="dev-feature-grid">{[[Zap,"Distributions API","Create personal claims, mass distributions, and project campaigns."],[Webhook,"Signed webhooks","React to claims, wallets, activation, referrals, and refunds."],[Braces,"TypeScript SDK","Typed methods for every Current CoFi API and contract action."],[Bot,"Agent tools","Restricted APIs, x402 access, and MCP-compatible operations."]].map(([I,t,d])=>{const Icon=I as typeof Zap;return <article key={String(t)}><Icon/><h3>{String(t)}</h3><p>{String(d)}</p><button>Explore <ArrowRight/></button></article>})}</div>
    <section className="panel dev-quickstart"><div><small>QUICKSTART</small><h3>Ship your first claim in five minutes.</h3><p>Create an API key, install the SDK, and send test USDC to an email address with no wallet required.</p></div><div className="quick-steps"><span><b>01</b> Create project key <Check/></span><span><b>02</b> Install @currentcofi/sdk <Copy/></span><span><b>03</b> Create a test claim <ArrowRight/></span></div></section>
  </>;
}

function ApiKeys() {
  return <>
    <AppHeader title="API keys" eyebrow="DEVELOPER SETTINGS"/>
    <div className="settings-layout"><SettingsNav active="API keys"/><section className="settings-main"><div className="settings-title"><div><h2>API keys</h2><p>Authenticate requests to Current CoFi services.</p></div><Button>Create key <Plus/></Button></div><div className="notice"><ShieldCheck/><div><b>Keep production keys private</b><span>Keys can create funded distributions. Restrict permissions and rotate exposed credentials.</span></div></div>
      <div className="key-list">{[["Production key","curr_live_••••••••4f28","Last used 4 minutes ago","Campaigns · Claims · Analytics"],["Testnet key","curr_test_••••••••92ae","Last used yesterday","Full test access"],["Agent restricted","curr_agent_••••••••11cd","Last used 2 hours ago","Claims · Read analytics"]].map((r,i)=><div className="key-row" key={r[0]}><span className={`key-icon k${i}`}><KeyRound/></span><div><b>{r[0]}</b><code>{r[1]}</code></div><span>{r[3]}</span><time>{r[2]}</time><button><MoreHorizontal/></button></div>)}</div>
    </section></div>
  </>;
}

function WebhooksView() {
  return <>
    <AppHeader title="Webhooks" eyebrow="DEVELOPER SETTINGS"/>
    <div className="settings-layout"><SettingsNav active="Webhooks"/><section className="settings-main"><div className="settings-title"><div><h2>Webhooks</h2><p>Receive signed events when funds and users move.</p></div><Button>Add endpoint <Plus/></Button></div>
      <div className="webhook-card"><div><span className="webhook-icon"><Webhook/></span><div><b>Production events</b><code>https://api.tidebreak.xyz/webhooks/current</code></div></div><Pill tone="green">Healthy</Pill><dl><div><dt>Events</dt><dd>claim.completed, user.activated, referral.credited</dd></div><div><dt>Success rate</dt><dd>99.98%</dd></div><div><dt>Last delivery</dt><dd>42 seconds ago</dd></div></dl></div>
      <h3 className="subhead">Recent deliveries</h3>{[["claim.completed","200","182 ms","42s ago"],["user.activated","200","241 ms","3m ago"],["referral.credited","200","194 ms","8m ago"],["campaign.gas_low","200","218 ms","1h ago"]].map(r=><div className="delivery-row" key={r[3]}><span className="event-dot"/><code>{r[0]}</code><Pill tone="green">{r[1]}</Pill><span>{r[2]}</span><time>{r[3]}</time><ChevronRight/></div>)}
    </section></div>
  </>;
}

function SettingsNav({active}:{active:string}) {
  const items=["General","Team","Billing","API keys","Webhooks","Security"];
  return <aside className="settings-nav">{items.map(x=><button className={active===x?"active":""} key={x}>{x}</button>)}</aside>;
}

function Agents() {
  return <>
    <AppHeader title="AI agents" eyebrow="AUTONOMOUS DISTRIBUTION"/>
    <div className="agents-hero"><div><Pill tone="green"><Bot/> AGENT NETWORK ONLINE</Pill><h2>Let software move rewards.<br/>Keep humans in control.</h2><p>Authorize agents to create claims, reward verified work, read campaign data, and request approval for larger distributions.</p></div><Button>Connect agent <Plus/></Button></div>
    <div className="agent-grid">{[["CurrentScout","Community reward agent","Online","$4,218","842"],["QuestFlow","Action verification agent","Online","$2,841","518"],["TreasuryPilot","Campaign funding agent","Paused","$0","0"]].map((r,i)=><article className="agent-card-app" key={r[0]}><div className="agent-card-head"><span className={`agent-avatar ag${i}`}><Bot/></span><Pill tone={r[2]==="Online"?"green":"neutral"}>{r[2]}</Pill><button><MoreHorizontal/></button></div><h3>{r[0]}</h3><p>{r[1]}</p><dl><div><dt>Distributed</dt><dd>{r[3]}</dd></div><div><dt>Claims</dt><dd>{r[4]}</dd></div></dl><div className="agent-perms"><span><Check/> Create claims</span><span><Check/> Read analytics</span><span className={i===2?"off":""}>{i===2?<X/>:<Check/>} Fund campaigns</span></div><button className="card-link">Manage permissions <ArrowRight/></button></article>)}</div>
    <section className="panel permission-panel"><div className="panel-head"><div><small>GLOBAL GUARDRAILS</small><h3>Agent spending controls</h3></div><Button kind="secondary">Edit controls <SlidersHorizontal/></Button></div><div className="guardrails"><div><span><CircleDollarSign/></span><b>$10,000</b><small>Daily network limit</small></div><div><span><Send/></span><b>$250</b><small>Max single claim</small></div><div><span><ShieldCheck/></span><b>$1,000</b><small>Human approval threshold</small></div><div><span><Globe2/></span><b>Arc only</b><small>Approved network</small></div></div></section>
  </>;
}

function SettingsView() {
  return <>
    <AppHeader title="Settings" eyebrow="PROJECT CONFIGURATION"/>
    <div className="settings-layout"><SettingsNav active="General"/><section className="settings-main"><div className="settings-title"><div><h2>Project profile</h2><p>Configure how Tidebreak appears across Current CoFi.</p></div><Button>Save changes</Button></div><div className="profile-row"><span className="project-avatar lg">T</span><div><b>Project logo</b><small>PNG, JPG, or WEBP · Max 2MB</small></div><Button kind="secondary">Change image</Button></div>
      <div className="settings-form"><label>Project name<input defaultValue="Tidebreak Labs"/></label><label>Project slug<div className="input-prefix"><span>current.co/</span><input defaultValue="tidebreak"/></div></label><label className="full">Description<textarea defaultValue="A social game economy powered by TIDE."/></label><label>Project token<input defaultValue="0x842ad51c...98c1"/></label><label>Gas policy<div className="select-control">Sponsored for all claims <ChevronDown/></div></label></div>
      <div className="danger-zone"><div><b>Danger zone</b><p>Pausing the project disables new campaigns and claims.</p></div><Button kind="secondary">Pause project</Button></div>
    </section></div>
  </>;
}

function ErrorState({ go }: { go:(v:View)=>void }) {
  return <div className="full-error"><div className="error-current"><span/><span/><X/></div><Pill tone="neutral">CURRENT INTERRUPTED</Pill><h2>This current can’t be reached.</h2><p>The claim may have expired, been refunded, or the network is temporarily unavailable.</p><div><Button onClick={()=>go("overview")}>Return to dashboard</Button><Button kind="secondary"><RefreshCw/> Try again</Button></div><small>Error CURRENT_LINK_UNAVAILABLE · c_8f21a</small></div>;
}

function AppShell({ view, go }: { view: View; go:(v:View)=>void }) {
  const [menu,setMenu]=useState(false);
  const content = useMemo(() => {
    switch(view) {
      case "overview": return <Overview go={go}/>;
      case "create": return <CreateLink/>;
      case "campaigns": return <Campaigns go={go}/>;
      case "new-campaign": return <NewCampaign go={go}/>;
      case "recipients": return <Recipients/>;
      case "referrals": return <Referrals/>;
      case "analytics": return <Analytics/>;
      case "token": return <TokenDashboard/>;
      case "developers": return <Developers go={go}/>;
      case "api-keys": return <ApiKeys/>;
      case "webhooks": return <WebhooksView/>;
      case "agents": return <Agents/>;
      case "settings": return <SettingsView/>;
      case "error": return <ErrorState go={go}/>;
      default: return <Overview go={go}/>;
    }
  }, [view, go]);
  return <div className="app-shell"><Sidebar view={view} go={go} open={menu} close={()=>setMenu(false)}/>{menu&&<button className="sidebar-backdrop" onClick={()=>setMenu(false)}/>}<main className="app-main">{view==="error"?content:<><div className="testnet-banner"><TestTube2/> Arc testnet workspace <span>Mock data enabled</span><button onClick={()=>go("home")}>View site <ArrowUpRight/></button></div>{view!=="new-campaign"&&view!=="overview"&&view!=="create"&&view!=="campaigns"&&view!=="recipients"&&view!=="referrals"&&view!=="analytics"&&view!=="token"&&view!=="developers"&&view!=="api-keys"&&view!=="webhooks"&&view!=="agents"&&view!=="settings"?null:content}<button className="floating-mobile-menu" onClick={()=>setMenu(true)}><Menu/></button></>}</main></div>;
}

export default function CurrentApp() {
  const [view,setView]=useState<View>("home");
  const go=(v:View)=>{setView(v); window.scrollTo({top:0,behavior:"smooth"});};
  if(view==="home") return <Marketing go={go}/>;
  if(view==="claim") return <ClaimView go={go}/>;
  return <AppShell view={view} go={go}/>;
}
