# <Plan title — what we're building>

> repo `<owner/name>` · complexity `<Low|Medium|High>` · touches `<N>` files · est `<~Xh>`

<!--
  VISUAL-PLANNER PLAN FORMAT
  --------------------------
  This is a normal Markdown file. The viewer renders each `## ` heading below as a
  card, so keep one logical topic per section. Everything here is standard Markdown,
  which means the file is also perfectly readable on its own and easy for Claude to
  reference later (e.g. @plans/<slug>/rev-001.md).

  Conventions the viewer understands (all optional):
  - `## NN — Section Name`  -> card with number badge NN and a category label derived
    from the section name (Overview, Approach, Architecture, Files, Implementation,
    Security, Tradeoffs, Tasks ...). The "NN — " prefix is optional.
  - Callouts:   `> [!NOTE] ...`  and  `> [!WARN] ...`  render as info / warning boxes.
  - Code block with a file path in the info string renders a filename header + lang chip:
        ```ts lib/auth.ts
        ...code...
        ```
  - A fenced ```tree block renders as an annotated file tree. Use these markers at the
    end of a line:  `+ new`,  `~ <note>` (modified),  `· unchanged`.
  - A numbered list under an "Architecture" / "Flow" section renders as a step diagram.
  - Markdown tables render styled. Mark the chosen row with `**chosen**` (or `(chosen)`)
    in its first cell to get a CHOSEN chip.
  - Task lists `- [ ] ...` render as checkboxes. Append a time estimate token like
    `~30m` at the end of a task to show a time chip.

  Delete this comment block in real plans, or keep it — the viewer ignores HTML comments.
-->

## 01 — Overview

<One or two short paragraphs: what exists today, what we are adding, and the scope
boundary. Reference concrete things with inline `code`.>

## 02 — Approach

<The strategy and the key decision. Why this approach over the obvious alternative.>

> [!NOTE] One thing worth calling out
> A supporting detail, constraint, or gotcha that informs the approach.

## 03 — Architecture

<One line describing the flow, then the numbered steps.>

1. **First step** — what happens.
2. **Second step** — what happens.
3. **Third step** — what happens.

## 04 — Affected files

```tree
app/
├─ feature/
│  └─ thing.ts          + new
├─ layout.ts            ~ wire in the provider
lib/
└─ db.ts                · unchanged
```

## 05 — Implementation

<Short framing sentence, then the core code.>

```ts lib/example.ts
export function example() {
  // the important wiring
}
```

## 06 — Security

<Anything touching auth, secrets, input handling, or data exposure.>

> [!WARN] Do not skip this
> A concrete must-do before shipping.

## 07 — Tradeoffs

| Option | Pro | Con |
| --- | --- | --- |
| **Chosen option** `(chosen)` | The upside | The cost |
| Alternative | Its upside | Why we passed |

## 08 — Tasks

- [ ] First concrete step `~15m`
- [ ] Second concrete step `~30m`
- [ ] Third concrete step `~40m`
