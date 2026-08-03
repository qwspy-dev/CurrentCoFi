# Current CoFi Visual QA

## Test matrix

| Viewport | Marketing | Claim flow | App shell | Result |
| --- | --- | --- | --- | --- |
| 1440 × 900 | Inspected | Completed end-to-end | Overview + campaign builder | Pass |
| 1280 × 800 | Inspected | Responsive rules verified | Desktop composition retained | Pass |
| 768 × 1024 | Inspected | Responsive rules verified | Sidebar collapses | Pass |
| 390 × 844 | Inspected | Completed end-to-end | Mobile account inspected | Pass |

The browser reported no horizontal document overflow at any required viewport. No development error overlay remained after the final pass.

## Pass 1 findings

1. The font variables emitted by `next/font` were not resolving in the vinext runtime. The hero headline inherited a 16px system default instead of the intended display scale.
2. The cinematic asset contains its own title treatment. The original crop exposed part of that title beneath the live HTML headline.
3. Inactive copy inside the pinned “What is Current CoFi?” sequence remained visible at low opacity, which made the three scenes look visually stacked.
4. The mobile story inherited desktop pinning even though its layout is intentionally linear.
5. Project onboarding existed as a complete view but did not have a direct entry in the workspace navigation.

## Corrections

1. Replaced runtime-dependent font variables with a stable, premium variable-system stack using Segoe UI Variable, Aptos, Helvetica Neue, and explicit mono fallbacks.
2. Repositioned and cropped the hero film to keep the generated artwork’s current network visible while removing its embedded title from the live composition.
3. Changed inactive story copy to zero opacity and retained a single readable active scene.
4. Limited ScrollTrigger pinning to viewports above 768px. Mobile and reduced-motion layouts remain static and fully readable.
5. Added “Project setup” to the workspace navigation.
6. Switched the mobile hero fallback to the final generated network artwork so the core visual identity remains present without loading the hero film.

## Interaction verification

- Marketing navigation and main calls to action route correctly.
- Walletless claim moves through ready, identity selection, embedded wallet creation, and funded success states.
- “Open your account” reaches the recipient workspace.
- New-current actions reach the complete campaign builder.
- Project setup, personal asset links, campaigns, recipients, referrals, analytics, `$CURRENT`, developer tools, API keys, webhooks, agents, settings, and system states are all addressable from the application.
- Forms, tabs, campaign steps, mock uploads, token locking controls, and settings switches have interactive states.
- Motion respects `prefers-reduced-motion`.

## Final visual assessment

The marketing experience now has a dark cinematic opening, a generated current-network hero film, high-contrast editorial typography, large proof surfaces, a scroll-controlled network story, water-current motion, and restrained light product sections. The application uses the same visual language at a denser operational scale without turning claim or payment actions into an over-animated experience.

## Agent Settlement Gateway pass

## Gateway Unified Balance pass

Validated the funding workspace at 1440×900 and 390×844, plus an authenticated 1440×900 state using deterministic API fixtures.

- Gateway is the primary funding rail while the existing CCTP V2 route remains one click away.
- The signed-out state keeps one clear action and explains the operator/destination account split.
- The authenticated state renders the unified balance, per-domain balances, five-stage settlement record, EOA proof, Gateway transfer proof, explorer link, and next valid action without horizontal overflow.
- Mobile content width equals the 390px viewport; the rail switch, cinematic hero, and account gate remain deliberately composed.
- Browser checks found no framework overlay, console errors, failed resource requests, or blank states.
- The static composition remains legible with motion disabled; all new control states use existing Current CoFi primitives and focus behavior.

Evidence captures: `qa-gateway-desktop.png`, `qa-gateway-mobile.png`, and `qa-gateway-authenticated.png`.

- Inspected the Agents route at 1440 × 900 and 390 × 844 after the settlement-ledger update.
- The page rendered meaningful content with no framework overlay or browser console errors.
- Mobile document width matched the 390px viewport with no horizontal overflow.
- The signed-out boundary remains deliberate and clear; authenticated action cards now reserve responsive space for campaign creation, token approval, vault funding, and the verified Arc receipt.
- The five-metric operator summary collapses from five columns to three and then two columns without changing action priority.
# Security review readiness QA — 2026-07-31

- Desktop 1280×720: verified the security dashboard renders the complete hero, assurance metrics, control plane, and responsive sidebar without horizontal overflow.
- Static resilience: verified the bundled posture keeps review evidence visible when the local development server cannot execute Vercel functions.
- Browser integrity: no framework overlay and no error-level browser logs after render.
- Mobile composition is deliberately defined at 1050px and 700px: the assurance scene collapses to one column, controls move their status below the copy, fund flows stack, and review links become a single-column list.
- Production acceptance requires the live `/api/v1/security` response, security headers, and authenticated `/api/v1/developer/security` boundary to pass after deployment.

## Arc asset trust layer QA — 2026-08-02

- Desktop 1440×900: verified the personal asset-link workspace keeps a strong hierarchy, readable token selection, and a complete claim preview without overflow.
- Mobile 390×844: verified the form and preview deliberately stack, controls remain touch-friendly, and the page stays inside the viewport.
- Reduced motion: verified the same composition remains usable with `prefers-reduced-motion` enabled.
- Browser integrity: no framework overlay or error-level browser logs after render.
- Live Arc integration: reproduced a six-signal USDC contract observation from the public Arc Testnet RPC and generated a stable review digest.
- Evidence captures: `qa-token-trust-create-desktop.png` and `qa-token-trust-create-mobile.png`.

## Continuous asset trust QA — 2026-08-03

- Desktop 1440×900: verified the Asset Trust route presents the monitoring policy, review boundary, and signed-out control plane with a deliberate two-scene composition.
- Mobile 390×844: verified the hero and workspace gate stack cleanly, type remains readable, controls remain touch-friendly, and document overflow is zero.
- Browser integrity: the page contains meaningful content, exposes the expected interactive navigation, and has no framework error overlay or error-level browser logs.
- Live Arc integration: reproduced the official Arc Testnet USDC control baseline through the public RPC with schema `1.1`, stable runtime bytecode, a dedicated control digest, and a separate full review digest.
- Static production build, type checking, linting, the dedicated token-monitor test, the asset-trust test, and all portfolio, social-payment, developer-security, grant, proof, settlement, agent, and observability regressions passed.
- Evidence captures: `qa-asset-trust-desktop.png` and `qa-asset-trust-mobile.png`.

## Identity and access QA — 2026-08-03

- Desktop 1440×900: verified the walletless claim route clearly presents Google, email OTP, Apple, and Facebook without implying that credential-gated methods are live.
- Desktop identity settings: verified the Circle wallet-login layer, community-identity layer, readiness states, and wallet-authority boundary remain scannable inside the existing Current application shell.
- Mobile 390×844: corrected the settings navigation to a one-column composition, verified all identity cards stay inside the viewport, and confirmed zero horizontal overflow.
- Browser integrity: no framework overlay or error-level browser logs appeared during the claim or identity-management render.
- Security verification: lint, TypeScript, production build, encrypted OAuth-state tests, PKCE checks, identity-binding tests, adversarial security tests, and the reproducible audit manifest pass.
- Evidence captures: `qa-identity-claim-desktop.png`, `qa-identity-settings-desktop.png`, and `qa-identity-settings-mobile-final.png`.
