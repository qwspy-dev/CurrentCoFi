# Current CoFi Design System

## 1. Brand premise

Current CoFi is a financial-current network. Projects are sources, identities
are destinations, claims create wallets, successful actions become green
activation nodes, referrals create branches, and product fees flow toward
`$CURRENT`.

The visual system must feel:

- Cinematic on the public protocol site.
- Calm and exact inside the operational application.
- Fluid without looking organic or playful.
- Technical without resembling a generic developer startup.
- Premium without hiding usability behind effects.

## 2. Typography

### Families

- **Display:** Space Grotesk Variable.
- **Interface and body:** Inter Variable.
- **Data and code:** IBM Plex Mono.
- **Fallbacks:** `Arial, Helvetica, sans-serif` and `ui-monospace, monospace`.

### Roles

| Token | Desktop | Mobile | Weight | Line height | Tracking |
|---|---:|---:|---:|---:|---:|
| `display-hero` | clamp(72px, 8.2vw, 132px) | 52px | 500 | .91 | -.065em |
| `display-scene` | clamp(64px, 7vw, 112px) | 46px | 500 | .94 | -.055em |
| `display-section` | clamp(48px, 5vw, 78px) | 38px | 500 | .98 | -.045em |
| `heading-xl` | 44px | 34px | 550 | 1.02 | -.035em |
| `heading-lg` | 32px | 28px | 600 | 1.08 | -.025em |
| `heading-md` | 24px | 22px | 600 | 1.15 | -.018em |
| `heading-sm` | 18px | 17px | 600 | 1.2 | -.012em |
| `body-lg` | 20px | 18px | 400 | 1.55 | -.012em |
| `body` | 16px | 16px | 400 | 1.55 | -.006em |
| `body-sm` | 14px | 14px | 400 | 1.5 | 0 |
| `caption` | 12px | 12px | 550 | 1.4 | .01em |
| `eyebrow` | 11px | 10px | 650 | 1 | .16em |
| `data-xl` | 56px | 40px | 500 | 1 | -.045em |
| `data` | 15px | 14px | 500 | 1.2 | -.015em |
| `code` | 13px | 12px | 450 | 1.7 | -.01em |

Display headlines may use soft masks and line clipping. Body copy must never
be split per character.

## 3. Color system

### Brand signals

| Token | Value | Purpose |
|---|---|---|
| `signal-blue` | `#173BFF` | Protocol actions, active controls, `$CURRENT` |
| `flow-cyan` | `#25E8E1` | Value moving through a current |
| `activation-green` | `#20D66B` | Settled, verified, activated, successful |

### Ocean scale

| Token | Value |
|---|---|
| `ocean-950` | `#020713` |
| `ocean-900` | `#04101F` |
| `ocean-850` | `#06192B` |
| `ocean-800` | `#08243A` |
| `ocean-700` | `#0D3854` |
| `ocean-500` | `#28789B` |
| `ocean-300` | `#82BECD` |
| `ocean-150` | `#CDE5E9` |
| `ocean-075` | `#EAF4F5` |
| `ocean-025` | `#F7FAFA` |

### Ink and neutral

| Token | Value |
|---|---|
| `ink-950` | `#07141D` |
| `ink-700` | `#344B57` |
| `ink-500` | `#6B7E86` |
| `ink-350` | `#96A8AE` |
| `line` | `#D9E6E8` |
| `surface` | `#FFFFFF` |

### State

| State | Foreground | Background |
|---|---|---|
| Success | `#087A3C` | `#E7F8ED` |
| Warning | `#8A5B00` | `#FFF3CF` |
| Danger | `#B52D3A` | `#FDEBED` |
| Info | `#173BFF` | `#EAEEFF` |
| Pending | `#596C75` | `#EEF3F4` |

### Usage constraints

- Blue, cyan, and green must not cover equal amounts of a scene.
- Cyan represents motion, never a generic decorative fill.
- Green appears only after a successful or verified state.
- Dark backgrounds use cyan at 70–90% brightness and green at 70–85%.
- All body copy must meet WCAG AA contrast.
- Thin current lines may be decorative and are exempt only when no information
  depends on them.

## 4. Gradients

- **Hero ocean:** `linear-gradient(135deg, #020713 0%, #06192B 54%, #082E48 100%)`.
- **Flow bloom:** `radial-gradient(circle, rgba(37,232,225,.24), transparent 64%)`.
- **Activation bloom:** `radial-gradient(circle, rgba(32,214,107,.18), transparent 64%)`.
- **Light water:** `linear-gradient(180deg, #FFFFFF 0%, #EAF4F5 100%)`.
- **Protocol field:** `linear-gradient(135deg, #04101F, #020713 68%)`.

Do not use multi-color rainbow gradients.

## 5. Spacing

Base unit: 4px.

`space-1` 4, `space-2` 8, `space-3` 12, `space-4` 16,
`space-5` 20, `space-6` 24, `space-8` 32, `space-10` 40,
`space-12` 48, `space-16` 64, `space-20` 80, `space-24` 96,
`space-30` 120, `space-36` 144, `space-48` 192.

### Section rhythm

- Cinematic marketing scene: 120–192px vertical padding desktop.
- Standard marketing scene: 96–144px desktop, 72–96px mobile.
- Application view: 28–40px outer padding desktop, 16–20px mobile.
- Panel padding: 24–32px desktop, 18–22px mobile.
- Dense row height: 56px.
- Comfortable row height: 68px.

## 6. Grid and containers

- Marketing maximum: 1360px.
- Marketing reading width: 720px.
- Application maximum: 1480px.
- Documentation reading width: 820px.
- Desktop grid: 12 columns, 24px gutter.
- Tablet grid: 8 columns, 20px gutter.
- Mobile grid: 4 columns, 16px gutter.
- Marketing page gutter: 24px mobile, 40px tablet, 64px desktop.
- Application page gutter: 16px mobile, 24px tablet, 32px desktop.

## 7. Breakpoints

- `xs`: 390px target.
- `sm`: 560px.
- `md`: 768px.
- `lg`: 1024px.
- `xl`: 1280px.
- `2xl`: 1440px.

Required QA viewports:

- 1440×900.
- 1280×800.
- 768×1024.
- 390×844.

## 8. Radii and borders

- Buttons: 999px marketing, 12px application.
- Inputs: 12px.
- Application panels: 18px.
- Large cinematic media masks: 28–36px only when a boundary is necessary.
- Mobile sheets: 24px top corners.
- Standard border: 1px solid `line`.
- Dark border: 1px solid `rgba(255,255,255,.12)`.

Avoid placing every section in a rounded card.

## 9. Shadows

- Navigation: `0 12px 40px rgba(2,7,19,.10)`.
- Application panel: `0 12px 35px rgba(7,20,29,.06)`.
- Floating confirmation: `0 24px 70px rgba(2,7,19,.18)`.
- Cyan glow: `0 0 32px rgba(37,232,225,.22)`.
- Green glow: `0 0 30px rgba(32,214,107,.20)`.

Glow cannot substitute for hierarchy.

## 10. Image and video ratios

- Desktop hero: 16:9 master, cover crop.
- Mobile hero: 4:5 or 9:16 dedicated crop.
- Ecosystem feature: 4:3.
- App interface preview: 16:10.
- Social card: 1200×630.
- Square protocol object: 1:1.

All media containers reserve their ratio before loading.

## 11. Component language

### Marketing buttons

- Height: 52px.
- Horizontal padding: 22–26px.
- Space Grotesk/Inter 14px, weight 600.
- Primary: white on blue or dark ink on cyan.
- Secondary: transparent with a 1px high-contrast border.
- Arrow translates 3px on hover.

### Application buttons

- Height: 40px standard, 48px primary form action.
- Radius: 12px.
- No glow.
- Disabled states retain readable labels.

### Inputs

- Height: 48px.
- 1px neutral border.
- Focus ring: 2px blue at 25% opacity plus 1px blue border.
- Error text appears below, never solely through border color.

### Panels

- White or deep-ocean surface.
- One border, minimal shadow.
- Header uses a title, supporting state, and at most two actions.
- Data visualizations must be labeled.

### Tables

- Sticky column headers on desktop.
- Rows convert to priority cards or detail drawers on mobile.
- Status uses text plus color.

### Status current

- Targeted: grey node.
- Opened: blue outline.
- Wallet created: cyan node.
- Claimed: cyan filled node.
- Activated: green node.
- Refunded/failed: red interruption mark.

## 12. Motion principles

1. Motion explains where value went.
2. A scene has one dominant timeline.
3. UI status motion completes in under 500ms.
4. Marketing scenes may last 800–1,400ms or be scroll-linked.
5. Continuous ambient loops pause when offscreen.
6. Route transitions never prevent clicking for more than 750ms.
7. Transform and opacity are preferred.
8. Layout properties are not animated when an equivalent transform exists.
9. Large blur animations are avoided on mobile.
10. Every motion has a reduced-motion equivalent.

### Timing tokens

- `instant`: 100ms.
- `micro`: 160ms.
- `control`: 220ms.
- `panel`: 360ms.
- `route-app`: 380ms.
- `route-marketing`: 680ms.
- `scene-enter`: 900ms.
- `hero-enter`: 1,200ms.

### Easing

- `standard`: `cubic-bezier(.4,0,.2,1)`.
- `out`: `cubic-bezier(.22,1,.36,1)`.
- `in-out`: `cubic-bezier(.65,0,.35,1)`.
- `current`: `cubic-bezier(.45,.05,.2,1)`.
- Continuous paths: linear.

## 13. Reduced motion

When `prefers-reduced-motion: reduce`:

- Hero video becomes the poster image.
- Scroll pinning becomes static stacked sections.
- Route wipe becomes a 120ms opacity swap.
- Counters display final values immediately.
- Marquees become wrapped static lists.
- Canvas particles stop; paths remain visible.
- No auto-advancing app carousel.
- Status confirmations retain a brief opacity change for clarity.

## 14. Accessibility

- Keyboard focus is always visible.
- All icon-only controls have accessible names.
- Claim status is announced through an ARIA live region.
- Animations never communicate the only version of a state change.
- Touch targets are at least 44×44px.
- Text remains selectable over media.
- Video is muted, decorative, and excluded from the accessibility tree.
- Color is never the only status indicator.

## 15. Static-composition acceptance

Before motion is added:

- Hero must read clearly over the poster image.
- Every section must have a deliberate focal point.
- No section may depend on particles or glow to feel complete.
- All required application pages must be usable with animation disabled.
- Mobile claim, campaign creation, and recipient management must work without
  horizontal page scrolling.
- The marketing page must remain recognizable as Current CoFi with all videos
  paused.
