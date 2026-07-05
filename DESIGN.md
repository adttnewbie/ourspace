# OurSpace Design System

## 1. Atmosphere & Identity

OurSpace feels like a private pastel scrapbook that opens straight into a shared memory space. The signature is tactile paper layering: sticky notes, soft tape accents, dotted borders, and cheerful color blocks that stay readable on a small phone.

## 2. Color

### Palette

| Role | Token | Light | Dark | Usage |
| --- | --- | --- | --- | --- |
| Surface/base | `--background` | `#fff8f1` | `#241f25` | App background |
| Surface/card | `--card` | `#fffdf8` | `#2d2730` | Cards and sheets |
| Surface/muted | `--muted` | `#f8eadf` | `#3b3340` | Soft panels |
| Text/primary | `--foreground` | `#332838` | `#fff8f1` | Main text |
| Text/muted | `--muted-foreground` | `#7d6975` | `#d7c7d0` | Secondary text |
| Border/default | `--border` | `#ead8cf` | `#514453` | Card and input borders |
| Accent/primary | `--primary` | `#f16f8f` | `#ff9bb2` | Main actions |
| Accent/mint | `--accent-mint` | `#bfe8d4` | `#5f9f82` | Calm widgets |
| Accent/yellow | `--accent-yellow` | `#ffe89a` | `#d7b948` | Sticky notes |
| Accent/blue | `--accent-blue` | `#b9dcff` | `#6faee8` | Info widgets |
| Accent/lavender | `--accent-lavender` | `#d9c7ff` | `#aa91e6` | Decorative accents |
| Destructive | `--destructive` | `#d94f5c` | `#ff8791` | Dangerous actions |
| Focus | `--ring` | `#332838` | `#fff8f1` | Focus outlines |

### Rules

- Use several pastel accents in balance; never let the app become all pink or all cream.
- Decorative colors must not reduce text contrast.
- Add colors here before using them in code.

## 3. Typography

### Scale

| Level | Size | Weight | Line Height | Tracking | Usage |
| --- | --- | --- | --- | --- | --- |
| Display | 40px | 800 | 1.05 | 0 | Pairing/home hero |
| H1 | 32px | 800 | 1.12 | 0 | Page titles |
| H2 | 24px | 700 | 1.2 | 0 | Section titles |
| H3 | 18px | 700 | 1.35 | 0 | Card titles |
| Body | 16px | 500 | 1.6 | 0 | Default text |
| Body/sm | 14px | 500 | 1.5 | 0 | Secondary text |
| Caption | 12px | 700 | 1.35 | 0.04em | Labels |

### Font Stack

- Primary: `Nunito`, `ui-rounded`, `system-ui`, sans-serif.
- Mono: `ui-monospace`, `SFMono-Regular`, monospace.

## 4. Spacing & Layout

### Base Unit

All spacing derives from 4px.

| Token | Value | Usage |
| --- | --- | --- |
| `--space-1` | 4px | Tight icon gaps |
| `--space-2` | 8px | Compact groups |
| `--space-3` | 12px | Inputs and chips |
| `--space-4` | 16px | Default card padding |
| `--space-5` | 20px | Page side padding |
| `--space-6` | 24px | Comfortable card padding |
| `--space-8` | 32px | Section gaps |

### Grid

- Max app width: 480px for mobile shell.
- Breakpoints: use Tailwind defaults.
- Full-height screens use `min-h-dvh`, never `h-screen`.

## 5. Components

### App Shell

- **Structure**: `main` content above fixed bottom `nav`.
- **States**: active tab, disabled tab, focus-visible.
- **Accessibility**: bottom nav has `aria-label`; disabled future tabs are buttons with `aria-disabled`.
- **Motion**: tap feedback uses transform/opacity only.

### Scrapbook Card

- **Structure**: rounded card with border, soft shadow, optional tape accent.
- **Variants**: white, pink, mint, yellow, blue, lavender.
- **States**: default, hover on interactive cards, empty.
- **Accessibility**: no text over busy decoration.

### Sticky Note

- **Structure**: colored note card with small tape strip and author/date metadata.
- **Variants**: yellow, pink, mint, blue, lavender.
- **States**: empty, editable placeholder.
- **Motion**: small press scale only when interactive.

### Button

- **Structure**: shadcn-style button primitive.
- **Variants**: default, secondary, outline, ghost, destructive.
- **States**: default, hover, active, focus, disabled.
- **Accessibility**: visible focus ring, button text stays readable.

## 6. Motion & Interaction

| Type | Duration | Easing | Usage |
| --- | --- | --- | --- |
| Micro | 150ms | ease-out | Button press |
| Standard | 220ms | ease-out | Card/nav state |
| Emphasis | 420ms | cubic-bezier(0.16, 1, 0.3, 1) | Pairing success later |

Rules:

- Animate only `transform` and `opacity`.
- Respect `prefers-reduced-motion`.
- Motion is gentle and tied to user action.

## 7. Depth & Surface

Strategy: mixed.

| Level | Value | Usage |
| --- | --- | --- |
| Soft | `0 10px 30px rgb(103 74 58 / 0.10)` | Cards |
| Lifted | `0 18px 45px rgb(103 74 58 / 0.16)` | Active surfaces |
| Border | `1px solid var(--border)` | Card/input outlines |

Cards use 20-28px radius for a soft scrapbook feel. Buttons use pill radius.
