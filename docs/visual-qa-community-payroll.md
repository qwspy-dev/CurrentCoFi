# Community payroll visual QA

Verified August 3, 2026 against the local production-style build.

## Desktop — 1440 × 900

- Community payroll is visible in the primary workspace navigation.
- Hero hierarchy, four proof metrics, custody boundary, signed-out state, and primary action fit without clipping.
- Creation dialog preserves a single visual hierarchy across schedule configuration, roster entry, and settlement disclosure.
- Background blur and dialog contrast keep the modal legible without losing workspace context.

## Mobile — 390 × 844

- Dialog becomes a deliberate full-height sheet rather than a compressed desktop modal.
- Schedule fields and contributor fields collapse to one column.
- The sheet scrolls vertically; controls remain full-width and readable.
- No desktop sidebar or horizontal form layout is forced into the viewport.

## Runtime inspection

- Page rendered meaningful content with no Vite/Next error overlay.
- Browser console contained only normal development analytics and React DevTools notices.
- No application exceptions were detected.

## Evidence captures

- `qa-payroll-desktop.png`
- `qa-payroll-create-desktop.png`
- `qa-payroll-create-mobile.png`

These captures are local QA artifacts and are intentionally excluded from the release commit.
