---
name: Setu coaching fees
description: Clear fee statements and a precise accounts workspace.
colors:
  primary: "#115e59"
  paper: "#ffffff"
  ink: "#1c292c"
  soft-surface: "#f3f7f6"
  selected-surface: "#e7f1ee"
  muted-ink: "#5c6b6a"
  rule: "#dce5e2"
  input-stroke: "#cbd8d4"
  focus: "#217970"
  destructive: "#a33123"
  attention: "#935c00"
typography:
  headline:
    fontFamily: '"Manrope Variable", "Noto Sans Devanagari Variable", sans-serif'
    fontSize: "30px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  title:
    fontFamily: '"Manrope Variable", "Noto Sans Devanagari Variable", sans-serif'
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "-0.02em"
  body:
    fontFamily: '"Manrope Variable", "Noto Sans Devanagari Variable", sans-serif'
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.6
  amount:
    fontFamily: '"Manrope Variable", "Noto Sans Devanagari Variable", sans-serif'
    fontSize: "44px"
    fontWeight: 650
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  caption:
    fontFamily: '"Manrope Variable", "Noto Sans Devanagari Variable", sans-serif'
    fontSize: "12px"
  label:
    fontFamily: '"Manrope Variable", "Noto Sans Devanagari Variable", sans-serif'
    fontSize: "13px"
  data:
    fontFamily: '"Manrope Variable", "Noto Sans Devanagari Variable", sans-serif'
    fontSize: "14px"
rounded:
  sm: "6.24px"
  md: "8.32px"
  lg: "10.4px"
  panel: "12px"
spacing:
  tight: "8px"
  compact: "12px"
  control: "16px"
  group: "20px"
  panel: "24px"
  section: "28px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.paper}"
    rounded: "{rounded.lg}"
    height: "32px"
    padding: "0 10px"
  button-outline:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    height: "32px"
    padding: "0 10px"
  input:
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    height: "32px"
    padding: "4px 10px"
  section-panel:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "24px"
  badge-secondary:
    backgroundColor: "{colors.selected-surface}"
    textColor: "{colors.primary}"
    height: "20px"
    padding: "2px 8px"
---

# Design System: Setu coaching fees

## Overview

**Creative North Star: "The Clear Fee Statement"**

Setu is a restrained operating interface. White surfaces, quiet rules, teal actions, and precise amounts give financial records a familiar reading order. The English and Hindi interfaces share the same structure; language changes do not change the visual hierarchy.

The system uses open sections and compact tables rather than decorative dashboard widgets. Staff views accommodate dense records, while parent views give the next payment room to stand apart. Both retain the same typography, controls, and status language.

**Key Characteristics:**

- A light, paper-like surface with one primary action color.
- Self-hosted Latin and Devanagari type in a shared sans-serif stack.
- Tabular money, labelled exceptions, and thin dividing rules.
- Flat content surfaces and visible keyboard focus.

## Colors

The palette combines deep teal with softly tinted neutral surfaces. The frontmatter records the effective light-theme values from `src/app/globals.css`; generated shadcn defaults are overridden there.

### Primary

- **Deep teal** (`primary`): primary buttons, links, selection, attendance presence, and the brand mark.
- **Pale teal** (`selected-surface`): selected navigation and secondary badges, paired with deep teal text.

### Neutral

- **Paper** (`paper`): content panels, forms, headers, and dialogs.
- **Ink** (`ink`): headings, amounts, and primary text.
- **Soft surface** (`soft-surface`): portal canvas, sidebar, table headers, and quiet hover states.
- **Muted ink** (`muted-ink`): secondary descriptions and inactive tabs. Keep this opaque token for small text rather than reducing the main foreground's opacity.
- **Rule** (`rule`): section boundaries and table dividers.
- **Input stroke** (`input-stroke`): field outlines.

Semantic colors remain separate from decoration: **attention amber** marks overdue values; **destructive red** marks errors, absences, and high-risk review states. **Focus teal** supplies the keyboard focus border and ring.

**The Exception Rule.** Amber and red communicate a named state; ordinary actions use teal.

## Typography

**Display and body font:** Manrope Variable, followed by Noto Sans Devanagari Variable and a sans-serif fallback. Both font packages are served locally with swap and Unicode-range subsets. No separate decorative or monospace face is used.

The shared type has clear weight steps and gently tightened Latin headings. Hindi headings use normal tracking and a 1.45 line height so matras remain open; Hindi amounts relax tracking to -0.015em. Amounts, strong values, and definition-list values use tabular numerals. Policy paragraphs are limited to a readable measure of 70 characters.

### Hierarchy

- **Headline:** the frontmatter headline style; narrow account pages reduce it to 28px. Parent introductions use a 24px heading.
- **Title:** the frontmatter title style for section headings and student identity.
- **Body:** the frontmatter body style for prose. Tables use the 14px data role, with 12px headers and supporting annotations.
- **Amount:** the frontmatter amount style; the parent amount reduces to 40px on phones. Account metrics use 28px on wide screens and 24px at narrower breakpoints.
- **Labels:** 13px labels and 12px captions keep compact controls and metadata legible. Parent tabs use 12px on phones, retaining full contrast.

The stylesheet owns this hierarchy through `--type-*` role tokens. Use those roles when extending a screen rather than adding unrelated one-off text sizes. Balanced headings and pretty-wrapped paragraphs preserve readable line endings.

**The Stable Numerals Rule.** Monetary values keep tabular numerals so amounts align and remain easy to compare.

## Layout

Accounts use a two-column shell with a 220px sticky navigation rail, reducing to 196px below 1200px. The main content starts with 36px vertical and 38px horizontal padding. At 800px the rail becomes horizontally scrolling navigation; metrics change from four columns to two. At 520px, headings stack and content padding becomes 26px by 16px.

The parent portal has a 940px maximum content width. Its soft canvas supports white statement and record panels. On phones, content padding is 26px by 14px; the payment section stacks, and its action takes the available width. Parent summary values change from four columns to two.

Related content uses tight gaps; panels use the frontmatter panel spacing and open sections use larger separation. Wide tables scroll inside their own wrapper. Long ledger and operations tab lists also scroll within their container. Attendance uses seven columns on wide screens and four on phones.

## Elevation & Depth

Content panels are flat, separated by a thin rule and white fill. They do not use repeated ambient shadows. Default selected tabs retain shadcn's small state shadow, while line tabs use an underline. Dialogs use a thin ring above a lightly dimmed backdrop; the backdrop blur serves focus on the interrupted task.

Reduced-motion preferences shorten animation and transition durations. Dialog entry and exit remain brief, using the primitive's 100ms fade and scale treatment.

**The Flat Content Rule.** Content boundaries use rules and tonal surfaces; elevation belongs to an active overlay or control state.

## Shapes

Controls have gently curved corners. The effective base radius is 0.65rem; the frontmatter records its derived small, medium, and large values at the normal 16px root size. Main content panels and parent statements use a separate 12px corner. Badges use pill corners, while student initials use a circular avatar. Keep those compact identity and status forms distinct from larger containers.

## Components

### Buttons

Compact, labelled actions use the shared shadcn Base UI button. Primary buttons are deep teal with white text. Outline buttons use paper and a rule; secondary buttons use pale teal; ghost buttons gain a soft surface on hover. Destructive actions use a pale red treatment with red text.

The default control height is 32px, with explicit smaller and larger variants. At the phone breakpoint, buttons, inputs, and native selects have a 42px minimum height. Hover changes the surface, keyboard focus adds a focus-colored border and 3px translucent ring, and disabled controls reduce opacity and block interaction.

### Inputs / Fields

Fields have visible labels, a subtle stroke, a transparent fill over the containing surface, and the same control corner. Focus uses the shared ring. Invalid states use the destructive border and ring. Native selects retain native option menus and a small chevron. Group related fields and descriptions through the shared field primitives.

### Navigation

Account navigation uses left-aligned icon-and-label buttons; the active item has a pale teal surface and teal text. Parent record navigation uses line tabs. Inactive tabs use muted ink, active tabs use ink, and an underline reinforces selection. Mobile navigation and long tab lists scroll without widening the page.

### Badges

Status badges are small pills with a 20px height. Secondary badges use pale teal, exception badges use a restrained red tint, and neutral states use an outline. A text label always states what the color means.

### Containers and tables

Content panels use paper, a rule, and the panel corner, with 24px padding that contracts on phones. Tables have soft header fills, thin row rules, and 15px by 12px cell padding. Supporting identifiers sit below the primary value in muted ink. Numeric summaries use an open row bounded by horizontal rules rather than separate floating tiles.

### Parent statement

The statement combines child identity, a divider, the due amount and date, a clearly named payment action, and a short receipt assurance. Its white surface and larger amount create hierarchy without decorative imagery. Long fee schedules remain in the record section below it.

### Dialogs and feedback

Dialogs provide a title, description, close control, and a focused task. They handle payment, corrections, fee-plan editing, and refund confirmation. Success and failure feedback stays within the shared alert language. Loading uses skeletons; empty lists explain the current state and recovery.

## Do's and Don'ts

### Do:

- **Do** use the effective custom light-theme tokens from this file and the stylesheet.
- **Do** keep small secondary text opaque and use muted ink for inactive tabs.
- **Do** keep monetary values tabular and align comparable amounts.
- **Do** preserve visible labels, keyboard focus, and readable Hindi when composing new controls.
- **Do** let wide data scroll within its own container on phones.

### Don't:

- **Don't** use amber or red as a general brand accent.
- **Don't** replace the restrained statement and table language with decorative gradients or repeated shadows.
- **Don't** use the generated dark-theme defaults as evidence of a reviewed dark mode.
- **Don't** add decorative widgets or imagery that compete with a financial task.
