---
name: plan
description: Generate a detailed implementation plan as a local Markdown file you can review in the browser. Use when the user runs /visual-planner:plan or asks to "plan" a feature with the visual planner.
argument-hint: <feature description>
disable-model-invocation: false
---

# Create a visual plan

The user wants a reviewable implementation plan for: **$ARGUMENTS**

Produce revision 1 of a plan, saved as a local Markdown file the user can open in the
browser viewer and iterate on.

## Steps

1. **Research first.** Understand the request against the actual codebase before writing.
   Search for existing implementations, patterns, and files that the plan should reuse or
   touch. A good plan names real files and real functions, not placeholders.

2. **Pick a slug.** Derive a short, kebab-case slug from the feature (lowercase letters,
   digits, hyphens only), e.g. `add-google-oauth`. This is the plan's folder name.

3. **Resolve the plugin root.** In Claude Code, use `${CLAUDE_PLUGIN_ROOT}`. In Codex, use this
   skill file's source path: the plugin root is two directories above `skills/plan/SKILL.md`.

4. **Read the format.** Read `<plugin-root>/templates/plan-template.md` and follow
   its conventions exactly. Each `## ` heading becomes a card in the viewer. Use the
   primitives the viewer understands: `> [!NOTE]` / `> [!WARN]` callouts, fenced code
   blocks with a file path in the info string (e.g. ```` ```ts lib/auth.ts ````), a
   ```` ```tree ```` block for the affected-files map, a numbered list under an
   "Architecture" section for the flow diagram, Markdown tables (mark the chosen row with
   `(chosen)` in its first cell), and `- [ ]` task lists (append `~30m`-style estimates). Task
   lists render in the viewer as a drag-to-reorder list with a 3-dot grip handle — not
   checkboxes — so author tasks in the order you recommend executing them.

5. **Write the plan** to `.plans/<slug>/rev-001.md`. Make it genuinely detailed and specific
   to this codebase: Overview, Approach, Architecture, Affected files, Implementation
   (with real code), Security (if relevant), a **Test plan**, Tradeoffs, and Tasks. Keep it
   scannable.

   For the **Approach** section specifically, write it to be *detailed yet easy to understand*:
   open with one plain-language sentence naming the chosen strategy, then explain how it works
   step by step in short paragraphs or bullets (not one dense block), state the key decision and
   why it beats the obvious alternative, define any non-obvious term or constraint inline the
   first time it appears, and ground every claim in real files and functions. Aim for thorough
   enough to defend the design but skimmable enough that a newcomer grasps both the *what* and
   the *why* in a single read. The **Test plan** goes right before Tasks and must be rigorous: lay out how every
   feature in the plan is verified — unit, integration, end-to-end, and manual checks — tying
   each test back to a feature so nothing ships unverified. Note that this section layout is
   only a suggestion: add, remove, reorder, or rename sections to fit the work, and only keep
   the ones that earn their place.

6. **Write the manifest** `.plans/<slug>/plan.json`:
   ```json
   {
     "slug": "<slug>",
     "title": "<plan title>",
     "branch": "<current git branch, if any>",
     "createdAt": "<ISO-8601 timestamp>",
     "latest": 1,
     "revisions": [
       { "rev": 1, "file": "rev-001.md", "summary": "Initial plan", "createdAt": "<ISO-8601>" }
     ]
   }
   ```

7. **Keep plans out of git.** Plans are local working artifacts, not source to commit. Ensure
   the project root `.gitignore` ignores the plans directory: if a `.gitignore` exists and does
   not already contain a `.plans/` rule, append a line `.plans/` (under a brief comment like
   `# visual-planner local plans`); if no `.gitignore` exists, create one containing `.plans/`.
   Do this once — skip if the rule is already present. (`.plans/` lives in the current project
   root, so each git worktree keeps its own copy.)

8. **Open it in the browser automatically.** Don't make the user run a separate command —
   start the viewer in the background from the current project directory so the plan shows up
   immediately. Use the launcher if it is on PATH, falling back to node with the resolved
   plugin root:

   ```bash
   visual-planner --plan "<slug>" || node "<plugin-root>/server/server.js" --plan "<slug>"
   ```

   Run it as a **background process** so the session stays interactive. The server prints a
   line like `[visual-planner] open: http://localhost:4517/?plan=<slug>` and opens the browser
   automatically (the port auto-increments if busy).

9. **Report the link.** Copy the printed URL into your reply so the user always has it, even if
   the browser didn't open on its own:
   > Your plan is ready and open in the browser: **http://localhost:<port>/?plan=<slug>**
   > Highlight any text to leave comments, then click **Send feedback** to get a prompt you
   > paste back here for the next revision. (In Claude Code, reopen anytime with
   > `/visual-planner:plan-view <slug>`; in Codex, ask to open the visual plan viewer.)

## Notes

- Create the `.plans/<slug>/` directory if it does not exist.
- Use 3-digit zero-padded revision numbers (`rev-001.md`).
- Do not start implementing the feature — this command only produces the plan.
- If the user already has a plan with the same slug, pick a more specific slug rather than
  overwriting it.
