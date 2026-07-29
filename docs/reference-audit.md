# Current CoFi — Superfluid Reference Audit

## Purpose

This document translates the design and motion principles observed on
`https://superfluid.org/` into an original, implementation-ready direction for
Current CoFi.

It does **not** authorize copying Superfluid's branding, wording, proprietary
media, logo, custom font, application cards, or exact compositions. The target
is an original Current CoFi system based on financial currents, walletless
distribution, identity activation, USDC, project tokens, referrals, and the
`$CURRENT` economic loop.

This phase contains research and specifications only. No frontend
implementation is part of this phase.

---

## 1. Material inspected

### Live reference

- Superfluid homepage at desktop and mobile viewport widths.
- Initial hero, fixed navigation, live statistics, trust strip, pinned
  scrollytelling sequence, possibilities ticker, benefits sequence, app
  ecosystem, governance section, and footer.
- Responsive behavior at approximately 1280×720 and 390×844.
- Computed typography, section heights, media types, sticky containers,
  transitions, and animation-bearing elements.

### Existing Current CoFi project

- Existing Next/vinext application structure.
- Current marketing page and all application views.
- Existing canvas-based current animation.
- Existing blue/cyan/green palette.
- Existing generated Current CoFi artwork and video assets.
- Current navigation, claim prototype, campaign tools, developer views, and
  `$CURRENT` views.

### Existing Current CoFi visual assets

| Asset | Current role | Audit finding |
|---|---|---|
| `public/og.png` | Social preview | Strong visual direction, but text is baked into the image and should not be used as responsive page copy. |
| `public/media/currentdes-start.jpg` | Opening frame | Useful as a video poster or reduced-motion hero. It has clean negative space and a single source node. |
| `public/media/currentdes-poster.jpg` | Completed network frame | Strong representation of offchain identities becoming funded wallets. Suitable as the end state of a hero story. |
| `public/media/currentdes-hero.mp4` | Generated hero animation | Candidate for the desktop hero after loop, compression, text-stability, and seam QA. |
| `public/media/currentdes-ambient-loop.mp4` | Ambient motion | Candidate for section backgrounds or route transitions after visual QA. |

The generated Current CoFi media already gives the redesign an original asset
base. Superfluid's green liquid should not be reused or recreated literally.

---

## 2. Reference page and section structure

The Superfluid homepage is approximately 9,200–9,600 pixels tall depending on
viewport. It uses seven primary scenes rather than a series of interchangeable
cards.

### Scene 1 — Full-viewport hero

- Height: one viewport; approximately 744 pixels on the observed desktop and
  844 pixels on the observed mobile viewport.
- Fixed white navigation floats 20 pixels from the top.
- Desktop uses a large, bottom-anchored looping WebM fluid animation.
- Mobile removes the heavy desktop video and uses a dedicated static mobile
  composition.
- Hero copy is centered and layered above the media.
- The visual occupies most of the viewport; text does not sit inside a bordered
  product card.
- Primary and secondary calls to action are visible without scrolling.

### Scene 2 — Proof and scale

- Approximately 840–930 pixels tall.
- A very large live monetary counter acts as the section's visual center.
- Supporting recipient count and a repeating trust-logo strip establish proof.
- White background creates a strong visual reset after the cinematic hero.

### Scene 3 — "What is Superfluid" pinned scrollytelling

- Dark green-black background.
- Desktop section observed at roughly 3,024 pixels tall; mobile roughly 3,720
  pixels.
- A 100vh sticky child remains fixed while the page scrolls through three
  content phases.
- Large masked heading occupies the top of the scene.
- A canvas occupies roughly 930×720 on the observed desktop layout.
- Progress changes from 01/03 to 02/03 to 03/03.
- Copy changes while the main visual remains spatially stable.
- A numeric stream total increments continuously to reinforce the product
  concept.

### Scene 4 — Possibilities

- Approximately 445 pixels on mobile and 760 pixels on desktop.
- Large statement followed by horizontally repeating action words.
- Text is split into individual characters for controlled reveal and motion.
- Repetition creates rhythm without adding more imagery.

### Scene 5 — Benefits

- Long-form feature explanation with another three-step progression.
- Desktop uses a sticky presentation region; the observed sticky panel is
  approximately 648 pixels tall.
- The content explains product infrastructure rather than repeating marketing
  claims.
- Large typography and sparse diagrams replace conventional icon cards.

### Scene 6 — Apps ecosystem

- Large heading in the brand accent color.
- Product/app entries include image, short description, metrics, and a single
  action.
- The section proves that the protocol supports an ecosystem rather than a
  single experience.

### Scene 7 — Governance and footer

- Final oversized ecosystem statement and supporting visual.
- A direct governance action.
- Footer is visually substantial, with categorized navigation and clear legal
  links.

---

## 3. Current CoFi content architecture derived from the reference

Current CoFi should preserve the reference's scene-based pacing while using its
own product story.

### Public marketing page

1. **Hero — "Turn audiences into active token users"**
   - Current CoFi generated animation as the dominant scene.
   - Real HTML headline and actions layered above the media.
   - Immediate routes to create a campaign and experience a claim.

2. **Network proof**
   - Total assets distributed.
   - Wallets created.
   - Activated users.
   - Campaigns completed.
   - Pilot/project logo current.

3. **Pinned "What is Current CoFi?" sequence**
   - Phase 01: fund with USDC or a project token.
   - Phase 02: distribute to identities that do not yet have wallets.
   - Phase 03: turn claims into measurable activations and retained users.
   - The animated network must evolve with those phases.

4. **Distribution possibilities**
   - Social payments.
   - Token launch allocations.
   - Community rewards.
   - Game rewards.
   - Bounties.
   - Referral campaigns.
   - Agent payments.
   - Event drops.

5. **Core platform capabilities**
   - Project-token and USDC distribution.
   - Walletless identity-bound claims.
   - Sponsored gas and embedded wallets.
   - Campaign referrals and attribution.
   - Expiration, recovery, and refunds.
   - SDK, API, webhooks, and agent access.

6. **Product surfaces**
   - Recipient claim experience.
   - Project campaign console.
   - Developer platform.
   - AI agent controls.

7. **`$CURRENT` economic current**
   - Product fee enters the fee router.
   - Allocated USDC accumulates.
   - Market purchases execute in batches.
   - Purchased `$CURRENT` is burned, locked, or used for liquidity according to
     visible rules.
   - Projects lock `$CURRENT` for larger campaigns, enhanced attribution,
     promotion, gas sponsorship, and access to the distribution network.

8. **Ecosystem and roadmap**
   - Project integrations.
   - Token communities.
   - Games.
   - Creators.
   - AI agents.
   - Merchant checkout, escrow, subscriptions, recurring payments, and
     cross-chain USDC are presented as expansion modules rather than the main
     hook.

9. **Final activation**
   - Create a distribution.
   - Experience a claim.
   - Read developer documentation.

### Application surfaces that must remain complete

- Overview.
- Personal asset-link creator.
- Walletless claim flow.
- Social login and embedded wallet onboarding.
- Recipient account and balances.
- Project onboarding.
- Campaign list and campaign builder.
- Recipient upload, validation, and management.
- Referral and attribution dashboard.
- Campaign analytics.
- `$CURRENT` token activity dashboard.
- Developer portal.
- API key management.
- Webhook management and delivery logs.
- AI agent creation and permissions.
- Account, organization, security, and billing settings.
- Loading, empty, success, expired, already-claimed, insufficient-funds,
  paused-campaign, failed-transaction, and unavailable-service states.

---

## 4. Visual hierarchy

### Reference principles

- One dominant idea per viewport.
- Headlines are architectural elements, not card titles.
- Major headings reach approximately 117 pixels on desktop and 53 pixels on
  mobile.
- The "What is" title reaches approximately 166 pixels on desktop and 71 pixels
  on mobile.
- Supporting copy remains modest, usually 16–20 pixels, allowing the visual and
  headline to lead.
- Strong alternation between bright neutral scenes and near-black brand scenes.
- Section labels are small and functional; they do not compete with headings.
- Proof is displayed as large numbers rather than explanatory paragraphs.

### Current CoFi translation

- Hero headline must occupy the left or center-left visual field while the
  current animation expands across the right and lower field.
- The core network animation is the hero, not a secondary dashboard mockup
  inside a glass card.
- Application UI should appear later as proof of utility.
- Large statistics should use monospaced or tabular numerals to avoid width
  changes while counting.
- Product pages should use one signature current visualization per page rather
  than repeating the same particles behind every panel.
- Dense operational pages should prioritize hierarchy and clarity over
  cinematic spectacle.

---

## 5. Typography system observed

### Reference

- Primary family: GT Walsheim Pro.
- Observed weights: 400, 500, and 700.
- Body: 16px / 24px.
- Hero heading: 117px / 117px, weight 500 on desktop.
- Mobile hero heading: approximately 53px / 53px.
- Large section heading: 166px / 166px desktop; approximately 71px mobile.
- Tight display tracking with a neutral geometric-grotesk body.
- Buttons use medium weight and compact labels.

### What to extract

- Warm geometric letterforms rather than a sterile enterprise sans.
- Near-1.0 line height for display type.
- Medium rather than extra-bold display weight.
- Large type that is allowed to crop or pass through masks.

### What not to copy

- Do not use GT Walsheim Pro without an appropriate license.
- Do not duplicate Superfluid's exact sizes on equivalent sections.
- Do not reproduce its word stacking or headline line breaks.

### Recommended direction for the next phase

The design-system phase should evaluate a licensed or open alternative with:

- A distinctive geometric display face.
- A highly readable UI sans for operational screens.
- Tabular numerals.
- A true variable font to support fluid weight transitions.

Candidate families to evaluate later include Space Grotesk, Manrope, Geist,
Satoshi if appropriately licensed, and a more expressive display face reserved
for the marketing scenes. Final selection belongs in
`docs/design-system.md`, not this audit.

---

## 6. Color and contrast system

### Reference

- Hero: desaturated slate-to-pale-aqua gradient.
- Signature accent: high-energy acid green.
- Deep scene: approximately `#001A1A`.
- Main text on light backgrounds: approximately `#000F00`.
- White navigation creates a hard contrast layer over the hero.
- Accent is used sparingly for key headings, coins, live data, and actions.
- Dark sections use very high text contrast and avoid translucent card stacks.

### Current CoFi source palette

The current project defines:

- Electric blue: `#0000FF`.
- Cyan: `#00FFFF`.
- Activation green: `#009000`.
- Near-black/navy: `#02020C`.

These exact saturated colors are too intense when used as large flat
backgrounds. They should remain signal colors, surrounded by a wider tonal
system:

- Ink navy for cinematic backgrounds.
- Deep ocean blue for spatial depth.
- Muted blue-grey for secondary copy.
- Pale water tint for light scenes.
- Electric blue for protocol/action.
- Cyan for value in motion.
- Green only for successful activation, settlement, and verified completion.

The final palette tokens and accessibility pairs belong in the design-system
phase.

---

## 7. Spacing and layout system

### Reference measurements

- Floating desktop header maximum width: approximately 1,360 pixels.
- Header outer gutter: 20 pixels.
- Header height: approximately 64 pixels on mobile.
- Main desktop content width: approximately 1,160–1,280 pixels.
- Desktop section top padding frequently reaches 144 pixels.
- Mobile horizontal gutter: 20 pixels.
- Hero copy is constrained even when the visual spans the full viewport.
- Large sections intentionally use 700–1,000+ pixels of vertical space.
- Pinned scrollytelling uses 3–5 viewport heights rather than a normal content
  block.

### Current CoFi translation

- Marketing container target: 1,280–1,360 pixels.
- Operational application container target: 1,440 pixels where dense tables
  require it.
- Mobile content gutter: 20 pixels; 16 pixels only inside dense app panels.
- Tablet should recompose scenes, not simply scale desktop.
- Hero must reserve media aspect ratio before load to avoid layout shift.
- Long pinned scenes must be shortened or replaced on mobile to prevent
  excessive scroll fatigue.

---

## 8. Image and media treatment

### Reference

- The homepage does not depend on stock photography.
- Hero uses a custom pre-rendered WebM, anchored to the bottom of the viewport.
- Mobile swaps the desktop video for a purpose-built still.
- A second tiny looping WebM animates the token/coin.
- A canvas creates the central pinned story.
- SVG handles lightweight lines, dividers, logos, and diagrams.
- Media generally has no visible card frame; it is integrated into the scene.

### Current CoFi direction

- Use `currentdes-hero.mp4` only after loop-seam and text-distortion QA.
- Ideally produce WebM and MP4 versions from a text-free master.
- Overlay all readable product copy in HTML.
- Use `currentdes-start.jpg` as the poster and reduced-motion fallback.
- Use `currentdes-poster.jpg` as the completed network state or social preview.
- Build a dedicated mobile crop rather than shrinking the desktop video.
- Use canvas or a shader for interactive currents that respond to scroll.
- Use video when the effect is cinematic but non-interactive.
- Use CSS/SVG for compact status lines and microinteractions.

---

## 9. Navigation behavior

### Desktop reference

- Navigation is fixed and centered.
- White rounded container floats 20 pixels below the top edge.
- Maximum width leaves consistent outer breathing room.
- Logo left, grouped dropdown navigation center, primary contact action right.
- Header changes shadow and top/opacity values through a 300ms transition.
- Dropdown arrows rotate over approximately 200ms.
- Standard hover transitions use approximately 150ms and a Material-like
  `cubic-bezier(0.4, 0, 0.2, 1)`.

### Mobile reference

- The header remains fixed.
- Logo, direct contact action, and 40×40 menu button remain visible.
- Desktop navigation collapses to zero visual footprint.
- Desktop hero video is removed.
- A dedicated mobile hero image is used.

### Current CoFi translation

- Desktop: logo, Product, Solutions, Developers, `$CURRENT`, and Launch a
  current.
- Mobile: logo, one primary action, and menu.
- The menu should open as a full-height ocean panel or large sheet with a
  choreographed current reveal.
- Application navigation remains separate from marketing navigation.
- Route changes in the application should use a brief current wipe, not a full
  cinematic page reload.

---

## 10. Motion inventory

Durations marked "estimated" are based on observed behavior and computed
styles. Exact source timelines were not copied.

### A. Fixed navigation

- **Trigger:** initial page load and scroll direction/state.
- **Start:** slightly elevated, low shadow.
- **End:** stable at 20–40px top offset with stronger shadow when content
  scrolls beneath it.
- **Duration:** 300ms.
- **Easing:** `cubic-bezier(0.4, 0, 0.2, 1)`.
- **Layers:** header above all hero media.
- **Mobile:** same fixed behavior, simplified content.

### B. Hero cinematic loop

- **Trigger:** autoplay when permitted.
- **Start/end:** visually matching loop frames.
- **Duration:** reference uses a looping WebM; Current CoFi target should be
  5–7 seconds.
- **Motion:** continuous fluid expansion and circulation.
- **Camera:** fixed.
- **Mask:** hero overflow clips media to viewport.
- **Mobile:** replace with still or much lighter loop.
- **Reduced motion:** poster image.

### C. Hero copy entrance

- **Trigger:** page ready.
- **Start:** text masked 110% below baseline; actions at 0 opacity and 12–18px
  down.
- **End:** natural position and full opacity.
- **Duration:** 700–1,000ms for headline, 450–650ms for supporting elements.
- **Easing:** expressive ease such as `cubic-bezier(0.22, 1, 0.36, 1)`.
- **Stagger:** 70–120ms.
- **Do not:** apply the same entrance to every page element.

### D. Live proof counter

- **Trigger:** enters viewport.
- **Start:** previous/zero value depending on data source.
- **End:** current total.
- **Duration:** 1,200–2,000ms for first reveal, then live incremental updates.
- **Typography:** tabular numerals.
- **Reduced motion:** display final value immediately.

### E. Trust/logo current

- **Trigger:** continuous when visible.
- **Motion:** horizontal linear movement with duplicated content.
- **Duration:** estimated 24–36 seconds per full cycle.
- **Easing:** linear.
- **Mask:** edge fade to background.
- **Mobile:** same concept at slower apparent speed.

### F. Dark-section heading reveal

- **Trigger:** scrollytelling section enters.
- **Start:** headline lines clipped vertically.
- **End:** full line visible.
- **Duration:** approximately 15–20% of section entry progress.
- **Easing:** scroll-linked; no time-based bounce.
- **Exit:** title remains spatially anchored while the content sequence begins.

### G. Three-phase pinned story

- **Trigger:** scroll through a 3–5 viewport-height scene.
- **Container:** 100vh sticky child at top 0.
- **Observed desktop scene:** roughly 3,024px.
- **Observed mobile scene:** roughly 3,720px.
- **Phase 1:** source and first explanation visible.
- **Phase 2:** visual flow advances and copy changes.
- **Phase 3:** redistribution/scale state completes.
- **Transition between phases:** 350–650ms equivalent scroll progress.
- **Visual:** canvas/WebGL remains fixed while state evolves.
- **Copy:** uses masks or spatial slides rather than a generic fade.
- **Mobile:** vertical composition; shorter copy and simplified visual density.
- **Reduced motion:** three static panels with no pinning.

### H. Continuous stream total

- **Trigger:** pinned scene active.
- **Motion:** number rises continuously with scroll/time.
- **Purpose:** converts an abstract protocol into visible activity.
- **Current CoFi equivalent:** assets distributed, wallets funded, or users
  activated.
- **Reduced motion:** one fixed verified metric.

### I. Flow/coin movement in pinned scene

- **Trigger:** phase progress.
- **Motion:** lines extend through masks; particles or coins follow paths.
- **Path:** cubic curves, not straight connector lines.
- **Layering:** background field, paths, moving value, endpoint glow, copy.
- **Duration:** scroll-linked; individual path traversals approximately
  1.2–2.4 seconds.
- **Easing:** near-linear for value movement, smooth ease for endpoint pulses.

### J. Possibilities character reveal

- **Trigger:** section enters.
- **Structure:** text split per character.
- **Start:** characters offset vertically or scaled to approximately 0.9.
- **End:** full-size natural baseline.
- **Duration:** observed CSS transitions around 500ms with delayed sequencing.
- **Use:** one signature sentence only.
- **Do not:** split normal body copy into characters.

### K. Repeating action ticker

- **Trigger:** continuous when visible.
- **Motion:** horizontal rails move in opposite or offset directions.
- **Duration:** estimated 18–30 seconds.
- **Easing:** linear.
- **Current CoFi words:** Fund, Send, Claim, Activate, Refer, Retain, Pay,
  Integrate.

### L. Benefits progression

- **Trigger:** scroll.
- **Container:** sticky desktop panel.
- **Phases:** 01/03, 02/03, 03/03.
- **Start/end:** each phase enters through a mask or directional slide.
- **Duration:** approximately one viewport of scroll per phase.
- **Mobile:** stacked static sections or shorter sticky sequence.

### M. Ecosystem/application cards

- **Trigger:** section entry and horizontal navigation.
- **Start:** selected card emphasized; adjacent cards partially visible.
- **Interaction:** horizontal track movement or snap.
- **Duration:** 500–800ms.
- **Easing:** `cubic-bezier(0.22, 1, 0.36, 1)`.
- **Mobile:** horizontal swipe with snap points.

### N. Button and link interaction

- **Trigger:** hover, focus, press.
- **Duration:** approximately 150ms.
- **Motion:** background/foreground inversion, compact arrow translation,
  minimal scale.
- **Press:** 0.98 scale maximum.
- **Do not:** add large hover elevation to every control.

### O. Mobile menu

- **Trigger:** 40×40 menu button.
- **Start:** panel clipped or translated above/right; links offset.
- **End:** full navigation panel with sequential links.
- **Duration:** 450–650ms panel, 300–450ms links.
- **Easing:** `cubic-bezier(0.22, 1, 0.36, 1)`.
- **Close:** reverse with shorter duration.

### P. Current CoFi route transition

- **Not copied from reference; required by the new product.**
- **Trigger:** marketing-to-app and application route changes.
- **Start:** active page visible.
- **Middle:** thin cyan current sweeps across the viewport and widens into an
  ocean-blue mask.
- **End:** next page resolves as the mask contracts into its signature visual.
- **Target duration:** 550–750ms marketing; 280–420ms inside the application.
- **Mobile:** 280–450ms simple directional wipe.
- **Reduced motion:** immediate route swap with 120ms opacity change.

---

## 11. Likely technology used by the reference

Observed evidence:

- Next.js application with Turbopack-generated chunks.
- Tailwind-style utility classes.
- Custom locally served WOFF2 typefaces.
- Pre-rendered WebM for the hero.
- Separate mobile raster fallback.
- A large HTML canvas inside the pinned "What is" sequence.
- SVG for lightweight diagrams and separators.
- Sticky CSS containers for long scrollytelling.
- JavaScript-driven counters and scroll progress.

Likely but not confirmed from the rendered surface:

- Custom WebGL, Three.js, or React Three Fiber for the canvas scene.
- GSAP/ScrollTrigger, Motion, or an equivalent internal scroll-progress system
  for choreography.

Current CoFi should choose technology by effect rather than reproducing the
reference stack:

- CSS transitions for controls and simple masks.
- GSAP plus ScrollTrigger for the public scrollytelling.
- Canvas 2D for dense current paths where shaders are unnecessary.
- React Three Fiber only for a scene requiring depth, refraction, or true
  camera movement.
- Video for the pre-rendered hero.

---

## 12. Desktop and mobile differences

| Area | Desktop | Mobile |
|---|---|---|
| Header | Full navigation and contact action | Logo, contact action, 40×40 menu |
| Hero media | Large looping WebM | Dedicated static mobile image |
| Hero heading | ~117px, single architectural block | ~53px, two lines |
| "What is" heading | ~166px | ~71px |
| Pinned story | Horizontal split, canvas ~930×720 | Vertical split, longer scene |
| Scene length | Dense but wide | More vertical space; approximately 700px longer for the pinned story |
| Ecosystem cards | Wide presentation/carousel | Swipeable or stacked |
| Navigation menus | Hover/click dropdowns | Full menu surface |
| Performance | Full cinematic media | Reduced media complexity |

Current CoFi must not treat tablet and mobile as scaled desktop. In particular:

- Claim links are mobile-first.
- Campaign management is desktop-first but fully functional on mobile.
- Hero media requires a dedicated 9:16 or 4:5 composition.
- Pinned sequences need a shortened mobile timeline.
- Data tables should turn into prioritized rows or detail drawers.

---

## 13. Required custom asset plan

### Assets already available

- Current CoFi generated start frame.
- Current CoFi generated completed network frame.
- Hero MP4.
- Ambient MP4.
- Existing social card.

### Assets required before final implementation

1. **Text-free hero master**
   - 16:9, minimum 1920×1080.
   - 5–7 second seamless loop.
   - Fixed camera.
   - Source node, identity nodes, wallet nodes, blue/cyan current, green
     activation.
   - WebM and MP4 delivery formats.

2. **Mobile hero master**
   - 9:16 or 4:5.
   - Simplified node count.
   - Focal current kept clear of headline and primary action.

3. **Reduced-motion hero still**
   - Text-free.
   - Same crop and focal point as the animated hero.

4. **Three-phase network scene**
   - Fund state.
   - Walletless claim state.
   - Activation/referral state.
   - Prefer real-time canvas paths with custom icon sprites.

5. **Page signature loops**
   - Claim: one current enters a newly formed wallet.
   - Campaign builder: one source branches into recipient lanes.
   - Recipients: nodes change from targeted to opened to funded to activated.
   - Referrals: currents fork into attributable branches.
   - Analytics: an animated funnel/current with measurable loss points.
   - `$CURRENT`: fee stream enters a reserve, batches, purchases, and routes to
     burn/lock/liquidity.
   - Developers: API request becomes a claim link and webhook response.
   - Agents: bounded agent current with visible spending guardrails.

6. **Small protocol objects**
   - USDC coin.
   - Generic project token.
   - `$CURRENT` token.
   - Identity node.
   - Embedded wallet.
   - Claim link.
   - Referral branch.
   - Agent key.

No Superfluid media, coin designs, screenshots, or app artwork should be used.

---

## 14. Elements that should not be imitated

- Superfluid name, logo, green droplet/liquid identity, or acid-green brand
  ownership.
- "Earn Every Second" or equivalent syntax.
- "You scroll, we stream" phrasing.
- Exact hero composition.
- Exact white floating navigation proportions.
- GT Walsheim Pro without licensing.
- Exact three-part copy, metrics, app list, or governance framing.
- Superfluid's proprietary WebM, mobile hero images, canvas imagery, token coin,
  or illustrations.
- Exact sticky section lengths.
- Exact oversized heading line breaks.
- Exact application carousel.
- Any interaction that exists only to mimic the reference rather than explain
  Current CoFi.

---

## 15. Current project gaps discovered

### Marketing

- The existing hero canvas is attractive but reads as a network visualization,
  not a cinematic water-current scene.
- The generated video assets are present but not currently driving the main
  experience.
- The marketing page is composed mainly from conventional sections and cards;
  it lacks pinned narrative scenes.
- Existing motion is mostly ambient, continuous, and evenly distributed rather
  than choreographed by section.
- The hero currently contains a broad visual gradient and line field but does
  not exploit the generated source-to-wallet story.

### Application

- All major requested surfaces exist in prototype form.
- Views are switched through local component state rather than route-aware page
  architecture.
- Pages do not yet have individual signature current scenes.
- Transitions between views are immediate aside from a smooth scroll reset.
- The design relies heavily on small cards, pills, and dashboard conventions.
- The interface needs a consistent motion hierarchy: page transition, page
  signature scene, status microinteraction, and control feedback.

### Typography and encoding

- Current project uses Inter and Manrope.
- The existing metadata and mock data contain visible mojibake characters such
  as `â€”` and `â—`; these must be corrected.
- Display typography is clean but not yet distinctive enough for the requested
  art direction.

### Performance and architecture

- The existing canvas correctly cleans up `requestAnimationFrame` and resize
  listeners.
- Future scrollytelling must also clean up ScrollTriggers and timelines on
  unmount.
- Cinematic video and canvas should not run simultaneously when offscreen.
- Route-level motion must not block application input.

---

## 16. Implementation implications for later phases

The redesign should be treated as two related systems:

### A. Cinematic protocol website

- Art-directed scenes.
- Large display typography.
- Hero video.
- Scroll-controlled current animation.
- Masked section transitions.
- Public protocol and `$CURRENT` narrative.

### B. Operational Current CoFi application

- Faster, calmer, more information-dense.
- Each page receives one meaningful visual motif.
- Motion communicates status and causality.
- No persistent heavy shader behind tables or forms.
- Route transitions remain brief.
- Claim flow remains mobile-first and exceptionally clear.

The visual connection between both systems is the current:

1. A project becomes a source.
2. Value forms a current.
3. Identities become nodes.
4. Claims create wallets.
5. Successful activity turns green.
6. Referrals create branches.
7. Product fees flow toward `$CURRENT` purchases.

That sequence is Current CoFi's original visual language.

---

## 17. Phase-one acceptance decision

The reference is suitable for Current CoFi because its design system makes an
invisible financial mechanism feel physical and continuous. The most valuable
principles to carry forward are:

- One cinematic hero asset.
- Alternating light and deep-ocean scenes.
- Oversized, carefully masked typography.
- Long pinned stories with real state changes.
- Live proof through moving numbers.
- Product concepts visualized as flows.
- Separate desktop and mobile media strategies.
- Restrained application UI after the cinematic marketing experience.

The redesign should **not** become "Superfluid in blue." Its own recognizable
idea is a financial current that converts offchain identities into funded
wallets, active users, referral branches, and visible protocol demand.

The next authorized phase is `docs/design-system.md`, followed by
`docs/motion-storyboard.md`. Static implementation should not begin until both
documents are complete.
