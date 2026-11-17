---
name: rtl-hebrew
description: Use when building React, HTML, or JSX interfaces that include Hebrew text, RTL layouts, or bilingual Hebrew/English content. Triggers include: text alignment issues, mirrored layouts, mixed LTR/RTL content, dir attribute, text-align right, CSS logical properties, RTL avatars, RTL forms, or any UI with Hebrew content.
---

# RTL Hebrew UI Skill

## Overview

Hebrew is RTL (right-to-left). Incorrect RTL handling causes mirrored layouts, broken text alignment, and misplaced UI elements. This skill covers patterns for React/JSX and plain HTML.

---

## Core Rules

1. **Root direction**: Set `dir="rtl"` on the outermost container or `<html>` tag.
2. **Never use `text-align: right` as a substitute for RTL** — use `dir` + logical CSS properties.
3. **Mixed content** (Hebrew + English numbers/URLs): wrap with `<bdi>` or `dir="ltr"` inline spans.
4. **Tailwind**: use logical utilities (`ps-`/`pe-`, `ms-`/`me-`, `start-`/`end-`) for spacing. Use `rtl:` variants only for things with no logical equivalent (e.g. flipping an icon).
5. **Flexbox rows flip automatically** under `dir="rtl"`: the first child sits on the right. Do not add `flex-row-reverse` as well, or the order flips back to LTR.

---

## Quick Reference

| Goal | HTML | Tailwind/CSS |
|------|------|--------------|
| Full RTL container | `<div dir="rtl">` | `direction: rtl` |
| RTL page | `<html dir="rtl" lang="he">` | — |
| Force LTR inline | `<span dir="ltr">` | `direction: ltr` |
| RTL-aware padding | — | `ps-4` / `pe-4` (start/end) |
| Flip directional icon | — | `rtl:-scale-x-100` |
| Hebrew font | `font-family: 'Heebo', sans-serif` | `font-['Heebo']` |

---

## Patterns

### 1. RTL React Component Wrapper

```jsx
export default function HebrewLayout({ children }) {
  return (
    <div dir="rtl" lang="he" className="font-['Heebo']">
      {children}
    </div>
  );
}
```

### 2. Bilingual Mixed Content

```jsx
// Hebrew label + LTR value (e.g. email, URL, number)
<p dir="rtl">
  כתובת אימייל: <span dir="ltr">user@example.com</span>
</p>
```

### 3. RTL Avatar with Name (common bug area)

```jsx
// WRONG (when no ancestor sets dir) — avatar stays on the left
<div className="flex items-center gap-2">
  <img src={avatar} />
  <span>{name}</span>
</div>

// CORRECT — set dir="rtl" on the container (or once on <html>)
<div className="flex items-center gap-2" dir="rtl">
  <img src={avatar} />
  <span>{name}</span>
</div>
```

### 4. RTL Form Fields

```jsx
<input
  dir="rtl"
  placeholder="הכנס שם..."
  className="w-full p-2 border rounded"
/>
```

### 5. RTL Navigation / Sidebar

```jsx
<nav dir="rtl" className="flex gap-4">
  <a href="/dashboard">לוח בקרה</a>
  <a href="/settings">הגדרות</a>
</nav>
```

### 6. Logical CSS Properties (preferred over physical)

```css
/* Instead of margin-left / margin-right */
margin-inline-start: 1rem;  /* = left in LTR, right in RTL */
margin-inline-end: 1rem;

/* Instead of padding-left / padding-right */
padding-inline-start: 1rem;
```

In Tailwind: `ps-4` = `padding-inline-start`, `pe-4` = `padding-inline-end`.

---

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Using `text-align: right` globally | Use `dir="rtl"` on container; text aligns automatically |
| Numbers, emails, URLs jumble inside Hebrew | Wrap in `<bdi>` (unknown direction) or `<span dir="ltr">` |
| Icons mirror incorrectly | Add `rtl:-scale-x-100` to arrows/chevrons only (not logos or checkmarks) |
| Forgot `lang="he"` | Add to `<html>` or root div for correct font rendering and a11y |
| Flexbox row order broken | `dir="rtl"` already reverses the row; remove any extra `flex-row-reverse` |
| Input placeholder RTL misaligned | Add `dir="rtl"` directly on `<input>` |
| Tailwind `ml-`/`mr-` breaks in RTL | Replace with `ps-`/`pe-` logical variants |

---

## Hebrew Font Stack (Google Fonts)

```html
<link href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;700&display=swap" rel="stylesheet">
```

```css
font-family: 'Heebo', 'Arial Hebrew', sans-serif;
```

---

## Testing RTL

- Toggle `dir="ltr"` ↔ `dir="rtl"` — layout should mirror cleanly.
- Check: icons, avatars, badges, dropdowns, modals — all should flip.
- Mixed content: emails, dates, IDs must remain LTR inside RTL context.
