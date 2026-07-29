# Current CoFi Motion Storyboard

## Global rules

- Marketing choreography uses GSAP and ScrollTrigger where scroll progress
  controls narrative state.
- Application motion uses CSS and small route timelines.
- Canvas loops pause outside the viewport.
- Each timeline must return a cleanup function.
- Media is decorative and carries no required text.
- Reduced-motion alternatives are specified per scene.

## Scene 0 — Navigation

- **Initial:** navigation is 18px above its settled position, opacity 0.
- **Final:** floating navigation at 24px from viewport top, opacity 1.
- **Trigger:** page ready.
- **Timeline:** 0–0.55s.
- **Transform:** `translateY(-18px)` to `0`.
- **Opacity:** 0 to 1.
- **Easing:** `out`.
- **Scroll behavior:** shadow increases after 40px; header hides by 80px while
  scrolling down and returns when direction reverses.
- **Mobile:** fixed compact bar with menu.
- **Reduced motion:** visible immediately.

## Scene 1 — Hero source becomes a network

- **Initial:** text-free `currentdes-start` poster; one blue source object,
  current lines dormant.
- **Final:** identities connect, embedded wallets form, activated wallets turn
  green.
- **Trigger:** autoplay after poster is ready.
- **Timeline:** 0–6s seamless loop.
- **Media:** optimized hero WebM plus MP4 fallback.
- **Camera:** fixed.
- **Text entrance:** headline lines reveal from vertical masks between 0.15 and
  1.1s; copy and actions follow from 0.75 to 1.35s.
- **Layering:** video, ocean shade, copy, navigation, proof rail.
- **Exit:** media scales to 1.03 and darkens over final 20% of hero scroll.
- **Mobile:** dedicated crop or poster with lightweight canvas current.
- **Reduced motion:** poster and final network paths.

## Scene 2 — Live network proof

- **Initial:** numbers at their previous known values; logo rail offscreen.
- **Final:** verified totals visible; logo current moving.
- **Trigger:** section 20% visible.
- **Timeline:** 0–1.6s for counters; rail continuous.
- **Transforms:** number columns rise through a mask.
- **Opacity:** labels 0 to 1.
- **Easing:** `out`; rail linear.
- **Exit:** no special exit.
- **Mobile:** two-by-two metric grid and static partner wrap.
- **Reduced motion:** final values and static logos.

## Scene 3 — "What is Current CoFi?" title gate

- **Initial:** deep-ocean panel; title lines clipped below.
- **Final:** full title visible, source node glowing below.
- **Trigger:** section top reaches 70% viewport.
- **Timeline:** first 12% of pinned scroll progress.
- **Transform:** title `translateY(115%)` to `0`.
- **Opacity:** 1 throughout after mask begins.
- **Easing:** scroll-scrubbed.
- **Pinning:** title container becomes part of the 100vh sticky stage.
- **Exit:** title reduces opacity to .15 as phase copy takes priority.
- **Mobile:** title remains static above the phase sequence.
- **Reduced motion:** title followed by three static panels.

## Scene 4 — Pinned current phase 01: Fund

- **Initial:** project/source node only.
- **Final:** USDC and project-token particles enter the source reserve.
- **Trigger:** pinned progress 0.12–0.36.
- **Timeline:** scrubbed.
- **Elements:** source, token particles, reserve meter, phase 01 copy.
- **Transforms:** particles follow cubic paths; reserve expands 0 to 100%.
- **Opacity:** phase copy 0 to 1 to .15.
- **Mask:** reserve ring uses radial clip.
- **Camera:** stationary with subtle 1% parallax.
- **Easing:** path linear, copy `out`.
- **Exit:** token paths converge into source.
- **Mobile:** one 80vh static-sticky phase.
- **Reduced motion:** source plus funded amount.

## Scene 5 — Pinned current phase 02: Claim

- **Initial:** funded source and unactivated identity nodes.
- **Final:** identity-bound links create embedded wallets; cyan paths connect.
- **Trigger:** pinned progress 0.36–0.66.
- **Timeline:** scrubbed.
- **Elements:** identity nodes, claim links, wallet outlines, sponsored-gas
  indicator, phase 02 copy.
- **Transforms:** paths draw from source; wallet outlines scale .75 to 1.
- **Opacity:** link chips 0 to 1; old phase copy fades through mask.
- **Easing:** paths linear; nodes `out`.
- **Exit:** claimed wallets remain in the network.
- **Mobile:** simplified six-node network.
- **Reduced motion:** static before/after comparison.

## Scene 6 — Pinned current phase 03: Activate

- **Initial:** wallets cyan; referrals hidden.
- **Final:** successful wallets turn green and fork referral branches.
- **Trigger:** pinned progress 0.66–1.
- **Timeline:** scrubbed.
- **Elements:** activation events, referral tree, retention pulse, phase 03 copy.
- **Transforms:** endpoint pulse scale 1 to 1.12 to 1; branch paths reveal.
- **Opacity:** activation labels 0 to 1.
- **Easing:** `current`.
- **Exit:** complete network scales to .94 and dissolves into the next light
  scene.
- **Mobile:** limited referral depth.
- **Reduced motion:** final network plus activation count.

## Scene 7 — Possibility currents

- **Initial:** central sentence clipped; action rails outside viewport.
- **Final:** sentence visible; two rails move in opposite directions.
- **Trigger:** 25% visible.
- **Timeline:** 0–1.1s entry; 24s continuous rails.
- **Elements:** Fund, Send, Claim, Activate, Refer, Retain, Pay, Integrate.
- **Transforms:** character groups rise 60px; rails translate ±50%.
- **Opacity:** 0 to 1.
- **Easing:** entry `out`, rail linear.
- **Mobile:** one horizontal swipe rail.
- **Reduced motion:** wrapped word list.

## Scene 8 — Walletless claim product reveal

- **Initial:** link exists as a cyan line; phone/account shells are outlines.
- **Final:** recipient signs in, wallet forms, token lands, balance updates.
- **Trigger:** section center reaches 60% viewport.
- **Timeline:** 0–4.8s; may repeat once, not infinitely.
- **Elements:** claim card, identity icon, wallet, token, success state.
- **Transforms:** link travels left to right; wallet scales .85 to 1; token
  follows path.
- **Opacity:** each state crossfades with mask.
- **Camera:** no movement.
- **Mobile:** the real claim interface becomes the visual.
- **Reduced motion:** completed claim state.

## Scene 9 — Campaign and attribution split

- **Initial:** campaign source at center.
- **Final:** recipient branches populate an attribution funnel.
- **Trigger:** section enters.
- **Timeline:** scroll progress across 140vh.
- **Elements:** recipient import, delivery channels, opened, wallet-created,
  claimed, activated, retained stages.
- **Transforms:** current branches follow stage columns.
- **Opacity:** stages reveal sequentially.
- **Easing:** `current`.
- **Pinning:** visual sticky on desktop; copy scrolls.
- **Mobile:** vertical funnel, no pin.
- **Reduced motion:** fully populated funnel.

## Scene 10 — Developer and agent current

- **Initial:** API request in code panel.
- **Final:** claim link, wallet event, and signed webhook response.
- **Trigger:** 35% visible.
- **Timeline:** 0–3.6s.
- **Elements:** code cursor, API pipe, agent guardrail, recipient node, webhook.
- **Transforms:** request packet follows a fixed path.
- **Opacity:** response lines reveal.
- **Easing:** packet linear; panels `out`.
- **Mobile:** tap-to-step static states.
- **Reduced motion:** all states visible.

## Scene 11 — `$CURRENT` fee loop

- **Initial:** a product fee enters in USDC.
- **Final:** fee is allocated to operations/gas and a buyback reserve; batched
  purchase routes `$CURRENT` to burn, lock, and liquidity.
- **Trigger:** pinned section begins.
- **Timeline:** three phases across 250vh.
- **Elements:** fee source, reserve, execution threshold, market adapter,
  `$CURRENT` object, burn/lock/liquidity endpoints.
- **Transforms:** USDC particles flow; reserve gauge fills; purchase burst
  expands; `$CURRENT` paths split.
- **Opacity:** each label appears only during its phase.
- **Easing:** linear flow, `out` state changes.
- **Pinning:** desktop only.
- **Mobile:** stacked three-step diagram.
- **Reduced motion:** static transparent allocation diagram.

## Scene 12 — Ecosystem constellation

- **Initial:** project cards are distributed around a dark field.
- **Final:** the selected project connects to Current CoFi and displays campaign
  metrics.
- **Trigger:** section visible and user selection.
- **Timeline:** 0.65s selection transition.
- **Transforms:** selected card moves to center and scales 1.04; current path
  redraws.
- **Opacity:** inactive cards .55; selected 1.
- **Easing:** `out`.
- **Mobile:** horizontal snap cards.
- **Reduced motion:** selected border only.

## Scene 13 — Final call to action

- **Initial:** thin horizontal current.
- **Final:** current opens into a broad water surface behind the headline.
- **Trigger:** 35% visible.
- **Timeline:** 0–1.2s.
- **Transforms:** mask scaleX 0 to 1; headline rises 50px.
- **Opacity:** 0 to 1.
- **Easing:** `out`.
- **Exit:** none.
- **Mobile:** simple cyan line reveal.
- **Reduced motion:** static surface.

## Application route transition

- **Initial:** active view fully visible.
- **Cover:** a 2px cyan current travels left to right and widens to a deep-ocean
  mask.
- **Reveal:** next view enters as the mask contracts toward its signature
  visual.
- **Trigger:** sidebar or application navigation.
- **Timeline:** 0–0.38s.
- **Transforms:** line `scaleX(0)` to `scaleX(1)`; mask `scaleY(.01)` to `1` to
  `.01`.
- **Opacity:** next page 0 to 1 during final 140ms.
- **Easing:** `in-out`.
- **Mobile:** 0.3s directional wipe.
- **Reduced motion:** 0.12s opacity swap.

## Application page signatures

### Overview

- Live network current updates recent activity nodes.
- Metric values rise once on entry.

### Create link

- Preview current updates as the form changes.
- Confirmation sends one particle into the recipient wallet.

### Campaign builder

- Step progress behaves like a current filling a channel.
- Validation blocks appear as interruptions in the line.

### Recipients

- Status node animates once when a recipient changes state.
- CSV upload progress fills a current rather than a generic spinner.

### Referrals

- Branch diagram reacts to selected source.
- Suspicious branch is marked with a visible interruption.

### Analytics

- Funnel paths reveal once; filters update with a 220ms crossfade.

### `$CURRENT`

- Fee reserve and buyback threshold update without re-running the full
  marketing animation.

### Developers

- Code example and response can be stepped manually.

### API keys and webhooks

- Creation and revocation use clear status transitions; no decorative ambient
  loop.

### AI agents

- Spending boundaries are visible rings; rejected actions stop at the boundary.

### Settings

- Minimal motion: focus, save, confirmation, and destructive-action feedback.

## Motion QA

- No long task on the main thread during scroll.
- No duplicate ScrollTriggers after navigation.
- No video decoding when offscreen.
- Canvas DPR capped at 1.5 on mobile and 2 on desktop.
- Animation frame loop pauses when document is hidden.
- No scroll hijacking.
- No essential content inside canvas.
- No more than one pinned cinematic scene active at a time.
- Route transition does not run on browser back if reduced motion is active.
