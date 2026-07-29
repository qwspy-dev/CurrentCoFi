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

