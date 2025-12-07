Title: Vendor Dashboard Tooltip System

Overview

This system adds accessible, animated tooltips across vendor dashboard actionable elements. Tooltips are triggered by hover/focus on desktop and tap on touch devices.

Usage

- Add `data-tooltip="..."` to any `a` or `button` (or elements with `role="button"`).
- If `data-tooltip` is not provided, the handler falls back to `aria-label` or `title`.

Behavior

- Delay: 300ms before showing on hover/touch.
- Animation: CSS-driven fade in/out (200ms) in `client/src/index.css` via `.vendor-tooltip`.
- Positioning: Intelligent placement above or below the target, constrained to viewport.
- Accessibility: `role="tooltip"`, `aria-describedby` applied while visible.
- Mobile: Tap reveals tooltip (300ms delay), hides after ~1200ms or next interaction.

Maintenance

- Styling changes: Edit `.vendor-tooltip` in `client/src/index.css`.
- Timing changes: Update delays in `VendorDashboard.tsx` effect.
- Tests: `client/src/pages/__tests__/VendorTooltip.test.tsx` cover hover delay, ARIA, and hide behavior.

Notes

- Works with all modern browsers. Layout relies on standard CSS variables already defined for dashboard themes.

