# <Plan title — what we're building>

> repo `<owner/name>` · complexity `<Low|Medium|High>` · touches `<N>` files · est `<~Xh>`

<!--
  VISUAL-PLANNER PLAN FORMAT
  --------------------------
  This is a normal Markdown file. The viewer renders each `## ` heading below as a
  card, so keep one logical topic per section. Everything here is standard Markdown,
  which means the file is also perfectly readable on its own and easy for Claude to
  reference later (e.g. @.plans/<slug>/rev-001.md).

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
  - Task lists `- [ ] ...` render as a drag-to-reorder list: each row has a 3-dot grip handle
    and a fixed position number (1, 2, 3 …) on the left that stays put as the reviewer drags
    rows to re-sequence the work. Author tasks in the order you recommend. A trailing time
    token like `~30m` is accepted but no longer displayed.

  Section layout is only a suggestion. The sections below (Overview, Approach, Architecture,
  Affected files, Implementation, Security, Test plan, Tradeoffs, Tasks ...) are a starting
  point — add, remove, reorder, or rename any of them to fit the work. Only keep the sections
  that earn their place.

  Delete this comment block in real plans, or keep it — the viewer ignores HTML comments.
-->

## 01 — Overview

<One or two short paragraphs: what exists today, what we are adding, and the scope
boundary. Reference concrete things with inline `code`.>

## 02 — Approach

<!--
  APPROACH SECTION — write it detailed AND easy to understand. Follow this guidance:
  1. Open with ONE plain-language sentence stating the chosen strategy (the "what", no jargon).
  2. Then explain HOW it works, walking through it in the order a reader would reason about
     it. Use short paragraphs or a short bullet list — never one dense block.
  3. State the KEY DECISION explicitly and justify it against the obvious alternative
     (point back to the Tradeoffs table rather than repeating it).
  4. The first time a non-obvious term, constraint, or assumption appears, define it inline
     in one clause so a reader new to this area is never lost.
  5. Ground every claim in concrete references — real files, functions, and `code` from this
     repo — not abstract prose.
  Goal: thorough enough that an engineer could defend the design, skimmable enough that a
  newcomer understands both WHAT we're doing and WHY in one read.
-->

<One-sentence plain-language summary of the strategy.>

<Then: how it works, step by step, in short readable paragraphs or bullets. Name the key
decision and why it beats the obvious alternative. Define non-obvious terms inline. Reference
real files and functions.>

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

## 08 — Test plan

<How every feature above gets verified. Cover the layers that apply — unit, integration,
end-to-end, and manual checks — and tie each test back to a feature so nothing ships
unverified.>

| Area | What to verify | How | Type |
| --- | --- | --- | --- |
| **<Feature / unit>** | The behavior or invariant that must hold | Test name, command, or steps | Unit |
| **<Integration point>** | Components work together as specified | … | Integration |
| **<Critical user flow>** | The end-to-end path a user takes | … | E2E |
| **<Edge case / failure>** | Invalid input, limits, auth failure handled correctly | … | Manual |

- [ ] Happy path verified for every feature in this plan
- [ ] Edge cases & error handling verified (invalid input, empty/limit values, auth failures)
- [ ] Regression: existing related behavior still works

> [!NOTE] Definition of done
> Every feature in this plan has at least one test here, and the suite is green before the
> tasks below are checked off.

## 09 — Tasks

- [ ] First concrete step `~15m`
- [ ] Second concrete step `~30m`
- [ ] Third concrete step `~40m`
