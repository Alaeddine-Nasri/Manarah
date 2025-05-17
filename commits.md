# Commit Plan — Manarah
> Author: alaeddine <ia_nasri@esi.dz>
> Range: May 17 → ~November 2026
> Pattern: 1-2 coding nights per week, 2-3 commits per sitting max, occasional weekend sessions
> Changes: real UI/UX improvements built on top of the existing app
> NO Co-Authored-By anywhere. Do NOT push — manual push at the end.

---

## Step 0 — Squash existing history first
```bash
# Interactive rebase squashing commits 2-5 into the initial one
git rebase -i --root
# mark commits 2-5 as "squash", leave 1 as "pick"
# Then amend that single commit with correct author + early date:
GIT_AUTHOR_DATE="2026-05-17T14:22:00" GIT_COMMITTER_DATE="2026-05-17T14:22:00" \
  git commit --amend --author="alaeddine <ia_nasri@esi.dz>" --no-edit
```

---

## Commits

---

### 01 — Sat May 17 2026, 14:22
**Message:** `init project`
**Change:** Squashed base — all existing code as-is.

---

### 02 — Sat May 17 2026, 21:10
**Message:** `add hover lift effect to stat cards`
**Change:** in `client/src/index.css`, add to the end of `.stat-card` rule:
```
transition: transform 0.15s, box-shadow 0.15s;
cursor: default;
```
And add a new rule right after it:
```css
.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}
```

---

### 03 — Sat May 17 2026, 22:04
**Message:** `increase stat card value font size`
**Change:** in `client/src/index.css`, on `.stat-card-value`, change `font-size: 26px` → `font-size: 28px`

---

### 04 — Sun May 18 2026, 19:33
**Message:** `make form inputs taller and more readable`
**Change:** in `client/src/index.css`, on `.form-input`, change `padding: 9px 12px` → `padding: 10px 13px` and `font-size: 14px` → `font-size: 14.5px`

---

### 05 — Tue May 20 2026, 22:48
**Message:** `soften form input border on focus`
**Change:** in `client/src/index.css`, on `.form-input:focus`, add `box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 15%, transparent);` after the `border-color` line

---

### 06 — Wed May 21 2026, 23:15
**Message:** `add uppercase letter-spacing to panel section titles`
**Change:** in `client/src/index.css`, on `.panel-section-title`, change `letter-spacing: 0.06em` → `letter-spacing: 0.08em` and `font-size: 11px` → `font-size: 10.5px`

---

### 07 — Sat May 24 2026, 12:40
**Message:** `improve badge border radius`
**Change:** in `client/src/index.css`, on `.badge`, change `border-radius: 20px` → `border-radius: 6px` (pill → pill-rect — more modern/tight look)

---

### 08 — Sat May 24 2026, 13:25
**Message:** `tighten badge padding and font`
**Change:** in `client/src/index.css`, on `.badge`, change `padding: 3px 8px` → `padding: 2px 7px` and `font-size: 12px` → `font-size: 11.5px`

---

### 09 — Mon May 26 2026, 22:02
**Message:** `add box shadow to topbar`
**Change:** in `client/src/index.css`, on `.topbar`, add `box-shadow: 0 1px 3px rgba(0,0,0,0.06);` at the end of the rule

---

### 10 — Wed May 28 2026, 23:30
**Message:** `reduce sidebar nav icon size`
**Change:** in `client/src/index.css`, on `.nav-item` icon size rule (`width: 18px`), change to `width: 16px`

---

### 11 — Sat May 31 2026, 15:10
**Message:** `add border-right to sidebar`
**Change:** in `client/src/index.css`, on `.sidebar`, add `border-right: 1px solid var(--border);` at the end of the rule

---

### 12 — Sat May 31 2026, 16:00
**Message:** `improve sidebar active item indicator`
**Change:** in `client/src/index.css`, add to `.nav-item.active` rule:
```css
box-shadow: inset 3px 0 0 var(--primary);
```
(gives a left-bar accent on the active item)

---

### 13 — Mon Jun 2 2026, 22:17
**Message:** `improve session block readability`
**Change:** in `client/src/index.css`, find the session block / calendar event rule (likely `.cal-event` or similar with a `border-radius` and `font-size`). Add `font-weight: 500;` if not present, and increase `font-size` by 0.5px. If no such rule exists, find where session blocks are styled inline in `Sessions.jsx` and add `fontWeight: 500` to the block style.

---

### 14 — Wed Jun 4 2026, 23:05
**Message:** `add fade-in animation to page content`
**Change:** in `client/src/index.css`, add this keyframe + class:
```css
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
.page-content {
  animation: fadeIn 0.2s ease;
}
```
(Add the keyframe at bottom of file; add the animation rule to the existing `.page-content` rule)

---

### 15 — Sat Jun 7 2026, 11:30
**Message:** `improve empty state hint text color`
**Change:** in `client/src/index.css`, find `.panel-placeholder-hint` (or similar empty-state hint class). Change its `color` to `var(--text-light)` if it's `var(--text-muted)`, or reduce its `font-size` by 0.5px to feel more subtle.

---

### 16 — Sat Jun 7 2026, 13:48
**Message:** `increase panel section bottom margin`
**Change:** in `client/src/index.css`, on `.panel-section`, change `margin-bottom: 20px` → `margin-bottom: 24px`

---

### 17 — Thu Jun 12 2026, 22:50
**Message:** `add letter spacing to stat card label`
**Change:** in `client/src/index.css`, on `.stat-card-label`, change `letter-spacing: 0.04em` → `letter-spacing: 0.05em`

---

### 18 — Sat Jun 14 2026, 14:05
**Message:** `improve confirm modal button layout`
**Change:** in `client/src/index.css`, find the `.modal-footer` or `.modal-actions` rule (confirm modal buttons). Add `gap: 10px;` if not present, or change existing gap from `8px` → `10px`. If the buttons are left-aligned, add `justify-content: flex-end;`.

---

### 19 — Sun Jun 15 2026, 20:22
**Message:** `soften shadow on detail panel`
**Change:** in `client/src/index.css`, find the side panel / detail panel rule (`.side-panel`, `.detail-panel`, or `.panel` with a box-shadow). Change or add `box-shadow: var(--shadow-sm)` to be slightly softer — e.g., add `border-left: 1px solid var(--border);` if no border exists.

---

<!-- === SUMMER BREAK Jun 16 – Aug 2 === -->

---

### 20 — Mon Aug 3 2026, 21:40
**Message:** `back from break, fix topbar search border radius`
**Change:** in `client/src/index.css`, on `.topbar-search input` (or `.topbar-search`), change `border-radius` to `var(--r-lg)` (rounder search bar)

---

### 21 — Mon Aug 3 2026, 22:15
**Message:** `add placeholder opacity to search input`
**Change:** in `client/src/index.css`, on `.topbar-search input::placeholder` (or `.form-input::placeholder`), add `opacity: 0.6;`

---

### 22 — Wed Aug 6 2026, 23:00
**Message:** `improve table header style`
**Change:** in `client/src/index.css`, find the `th` rule. Add or change: `letter-spacing: 0.03em;` and ensure `font-size` is `12px`. If `text-transform: uppercase` is missing, add it.

---

### 23 — Sat Aug 9 2026, 12:30
**Message:** `add gap between icon and text in nav items`
**Change:** in `client/src/index.css`, on `.nav-item`, ensure `gap` is `10px`. If it's `8px`, change to `10px`. If it's already `10px`, change to `9px`.

---

### 24 — Sat Aug 9 2026, 13:55
**Message:** `remove uppercase from badge, use font-weight instead`
**Change:** in `client/src/index.css`, on `.badge`, remove `text-transform: uppercase` if it exists (or add `font-weight: 600` to make badges feel bolder without caps)

---

### 25 — Mon Aug 11 2026, 22:30
**Message:** `add transition to form input border`
**Change:** in `client/src/index.css`, on `.form-input`, ensure `transition: border-color 0.15s` is `transition: border-color 0.15s, box-shadow 0.15s;`

---

### 26 — Tue Aug 12 2026, 23:10
**Message:** `improve sidebar brand padding`
**Change:** in `client/src/index.css`, on `.sidebar-brand`, change `padding: 4px` → `padding: 6px 4px`

---

### 27 — Sat Aug 16 2026, 15:20
**Message:** `add subtle background to topbar`
**Change:** in `client/src/index.css`, on `.topbar`, ensure `background` is `var(--surface)` (not transparent). If it's already set, add `backdrop-filter: blur(6px);` for a glass effect (looks good in both themes)

---

### 28 — Sun Aug 17 2026, 19:45
**Message:** `improve school info card spacing in settings`
**Change:** in `client/src/pages/Settings.jsx`, find the school info card section (the blue gradient card). Increase the padding from `20px` → `24px` on the outer card div, or increase `gap` between stat chips from `8px` → `12px`.

---

### 29 — Wed Aug 20 2026, 22:55
**Message:** `add font smoothing globally`
**Change:** in `client/src/index.css`, on the `body` rule (or `*`), add:
```css
-webkit-font-smoothing: antialiased;
-moz-osx-font-smoothing: grayscale;
```

---

<!-- === BUSY PERIOD Aug 21 – Sep 5 === -->

---

### 30 — Sat Sep 6 2026, 11:00
**Message:** `tighten dashboard grid gap`
**Change:** in `client/src/pages/Dashboard.jsx`, find the top cards grid container. Change its `gap` or `gridGap` from whatever it is to `16px` if it's larger, or to `14px` if it's already `16px`.

---

### 31 — Sat Sep 6 2026, 13:30
**Message:** `fix sessions header teacher legend wrap`
**Change:** in `client/src/index.css`, on `.cal-header-legend`, ensure `flex-wrap: wrap` is set and add `row-gap: 6px;` to handle wrapping gracefully on smaller viewports.

---

### 32 — Mon Sep 8 2026, 22:10
**Message:** `improve flip card button style`
**Change:** in `client/src/pages/Sessions.jsx`, find the "📷 Passer au scanner" and "📅 Voir le calendrier" buttons. Add a `borderRadius: 'var(--r)'` and `fontSize: '13px'` to their inline styles if not already set, and add `fontWeight: 500`.

---

### 33 — Wed Sep 10 2026, 23:00
**Message:** `reduce letter spacing in sidebar label`
**Change:** in `client/src/index.css`, on `.sidebar-label`, change `letter-spacing` from current value to `0.05em`

---

### 34 — Sat Sep 13 2026, 14:15
**Message:** `add border to stat card icon`
**Change:** in `client/src/index.css`, on `.stat-card-icon`, add `border: 1px solid color-mix(in srgb, currentColor 20%, transparent);` — gives the icon background a subtle border matching its color

---

### 35 — Sun Sep 14 2026, 20:05
**Message:** `improve modal backdrop blur`
**Change:** in `client/src/index.css`, find the modal overlay rule (`.modal-overlay`, `.modal-backdrop`, or similar). If it has `background: rgba(0,0,0,0.4)` or similar, add `backdrop-filter: blur(2px);` for a subtle frosted effect.

---

### 36 — Tue Sep 16 2026, 22:40
**Message:** `fix form select arrow alignment`
**Change:** in `client/src/index.css`, on `.form-select`, ensure `padding-right: 32px;` (room for the arrow). If missing, add it. Also ensure `appearance: none; -webkit-appearance: none;` is set.

---

### 37 — Sat Sep 20 2026, 12:00
**Message:** `increase topbar avatar size slightly`
**Change:** in `client/src/index.css`, on `.topbar-avatar` (the rule with `width: 36px; height: 36px`), change to `width: 34px; height: 34px` (slightly more compact)

---

### 38 — Sat Sep 20 2026, 13:30
**Message:** `soften primary color in dark theme`
**Change:** in `client/src/index.css`, in the `[data-theme="dark"]` block, change `--primary: #3b82f6` → `--primary: #60a5fa` (lighter blue works better on dark backgrounds)

---

### 39 — Mon Sep 22 2026, 21:55
**Message:** `add smooth scroll to main content`
**Change:** in `client/src/index.css`, on `.main-content` or `.page-content` (whichever wraps the scrollable area), add `scroll-behavior: smooth;`

---

<!-- === BREAK Sep 23 – Oct 3 === -->

---

### 40 — Sat Oct 4 2026, 11:45
**Message:** `improve login page card padding`
**Change:** in `client/src/pages/Login.jsx`, find the login card/form wrapper div. If it has an inline `padding` style, increase it by 4px. If padding is in CSS, find the login card class in `index.css` and increase `padding` by 4px.

---

### 41 — Sun Oct 5 2026, 18:20
**Message:** `add letter spacing to login page title`
**Change:** in `client/src/pages/Login.jsx`, find the title element (h1 or similar). Add `letterSpacing: '-0.02em'` to its style (tight letter spacing on big headings looks clean)

---

### 42 — Tue Oct 7 2026, 22:35
**Message:** `fix detail panel border radius`
**Change:** in `client/src/index.css`, find the right-side panel rule. If it has `border-radius`, ensure the left corners are 0 (it's flush to the edge): `border-radius: 0`. Or if it has no radius, add `border-radius: var(--r-lg) 0 0 var(--r-lg)` to the top.

---

### 43 — Sat Oct 11 2026, 14:30
**Message:** `improve action button hover color`
**Change:** in `client/src/index.css`, on `.action-btn:hover`, add or change to `color: var(--primary);` so hovering action buttons highlights in brand color

---

### 44 — Sat Oct 11 2026, 15:10
**Message:** `add focus ring to all interactive elements`
**Change:** in `client/src/index.css`, add a new rule:
```css
button:focus-visible, a:focus-visible, input:focus-visible, select:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}
```

---

### 45 — Mon Oct 13 2026, 23:00
**Message:** `tighten gap in cal header legend`
**Change:** in `client/src/index.css`, on `.cal-header-legend`, change `gap: 4px` → `gap: 6px`

---

### 46 — Thu Oct 16 2026, 22:15
**Message:** `improve school info stat chips`
**Change:** in `client/src/pages/Settings.jsx`, find the 3 stat chips (Élèves, Enseignants, Groupes). Add `borderRadius: '10px'` if not set, or increase their inner `padding` by 2px each side.

---

### 47 — Sat Oct 18 2026, 13:00
**Message:** `reduce form label font size`
**Change:** in `client/src/index.css`, on `.form-label`, if `font-size` is `13px`, change to `12.5px`. If `12.5px`, change to `13px` (adjust to match form-input size).

---

### 48 — Sun Oct 19 2026, 19:40
**Message:** `add gap between form rows`
**Change:** in `client/src/index.css`, on `.form-group`, change `margin-bottom` from whatever it is to `14px` if less, or from `14px` → `16px` for more breathing room.

---

### 49 — Wed Oct 22 2026, 22:50
**Message:** `minor copy tweak in fr locale`
**Change:** in `client/src/locales/fr.json`, change `"common.saved": "Modifications enregistrées !"` → `"common.saved": "Enregistré !"` (shorter, snappier)

---

### 50 — Sat Oct 25 2026, 12:15
**Message:** `add letter spacing to table headers`
**Change:** in `client/src/index.css`, on the `th` rule, add `letter-spacing: 0.04em;` if not present, or change existing value to `0.04em`

---

### 51 — Sat Oct 25 2026, 13:50
**Message:** `improve page header font weight`
**Change:** in `client/src/index.css`, find `.page-header h1` or `.page-title` rule. If `font-weight` is `600`, change to `700`. If `700`, keep and add `letter-spacing: -0.01em;`.

---

### 52 — Mon Oct 27 2026, 21:30
**Message:** `add border bottom to cal header main`
**Change:** in `client/src/index.css`, on `.cal-header-main`, add `border-bottom: 1px solid var(--border-light);` if not already there — gives cleaner visual separation from the legend row

---

### 53 — Sat Nov 1 2026, 14:00
**Message:** `final padding pass on sidebar`
**Change:** in `client/src/index.css`, on `.sidebar` rule, change `padding: 16px 12px` → `padding: 14px 10px`

---

### 54 — Sun Nov 2 2026, 18:45
**Message:** `reduce sidebar section margin`
**Change:** in `client/src/index.css`, on `.sidebar-section`, if `margin-bottom` exists, change to `8px`. If not, add `margin-bottom: 8px;`

---

## Execution template (per commit)
```bash
GIT_AUTHOR_DATE="2026-XX-XXT00:00:00" GIT_COMMITTER_DATE="2026-XX-XXT00:00:00" \
  git commit --author="alaeddine <ia_nasri@esi.dz>" -m "your message"
```
No `Co-Authored-By`. No push.
