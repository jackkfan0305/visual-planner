---
description: Generate a detailed implementation plan as a local Markdown file you can review in the browser. Use when the user runs /visual-planner:plan or asks to "plan" a feature with the visual planner.
argument-hint: <feature description>
disable-model-invocation: true
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

3. **Read the format.** Read `${CLAUDE_PLUGIN_ROOT}/templates/plan-template.md` and follow
   its conventions exactly. Each `## ` heading becomes a card in the viewer. Use the
   primitives the viewer understands: `> [!NOTE]` / `> [!WARN]` callouts, fenced code
   blocks with a file path in the info string (e.g. ```` ```ts lib/auth.ts ````), a
   ```` ```tree ```` block for the affected-files map, a numbered list under an
   "Architecture" section for the flow diagram, Markdown tables (mark the chosen row with
   `(chosen)` in its first cell), and `- [ ]` task lists (append `~30m`-style estimates).

4. **Write the plan** to `plans/<slug>/rev-001.md`. Make it genuinely detailed and specific
   to this codebase: Overview, Approach, Architecture, Affected files, Implementation
   (with real code), Security (if relevant), a **Test plan**, Tradeoffs, and Tasks. Keep it
   scannable. The **Test plan** goes right before Tasks and must be rigorous: lay out how every
   feature in the plan is verified — unit, integration, end-to-end, and manual checks — tying
   each test back to a feature so nothing ships unverified. Note that this section layout is
   only a suggestion: add, remove, reorder, or rename sections to fit the work, and only keep
   the ones that earn their place.

5. **Write the manifest** `plans/<slug>/plan.json`:
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

6. **Tell the user** the plan is ready and how to review it:
   > Run `/visual-planner:plan-view <slug>` to open it in the browser, highlight any text
   > to leave comments, then click **Send feedback** to get a prompt you paste back here
   > for the next revision.

## Notes

- Create the `plans/<slug>/` directory if it does not exist.
- Use 3-digit zero-padded revision numbers (`rev-001.md`).
- Do not start implementing the feature — this command only produces the plan.
- If the user already has a plan with the same slug, pick a more specific slug rather than
  overwriting it.
