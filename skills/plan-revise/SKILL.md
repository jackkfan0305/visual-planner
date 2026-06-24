---
description: Apply review comments to a plan and produce the next revision. Use when the user runs /visual-planner:plan-revise, or pastes back feedback from the viewer.
argument-hint: [slug]
disable-model-invocation: true
---

# Revise a plan from comments

Produce the next revision of a plan by applying the review comments left in the viewer.

Plan to revise: **$ARGUMENTS** (a plan slug; may be empty — infer it if only one plan exists
or if the user just pasted feedback that names the plan file).

## Steps

1. **Resolve the plan.** Read `.plans/<slug>/plan.json` to find the latest revision number `N`
   and its file `rev-00N.md`.

2. **Gather the comments.** Read the sidecar `.plans/<slug>/rev-00N.comments.json` (written by
   the viewer). Each entry is `{ id, section, quote, body, status }`. Address every comment
   whose `status` is not `"resolved"`. If the user pasted a feedback prompt instead, use that
   as the source of changes.

3. **Apply the changes** to a *new* revision. Read `rev-00N.md`, apply each comment's
   requested change to the relevant passage, and write the result to `rev-00(N+1).md`. Keep
   the existing section structure, headings, code blocks, tables and diagrams (the
   visual-planner plan format — see `${CLAUDE_PLUGIN_ROOT}/templates/plan-template.md`).

4. **Add a change summary.** At the top of the new revision (right after the title/meta), add
   a short callout summarizing what changed, e.g.:
   ```
   > [!NOTE] What changed in rev N+1
   > - Addressed the comment on <section>: <one line>.
   ```

5. **Update the manifest** `.plans/<slug>/plan.json`: bump `latest` to `N+1` and append a
   revision entry with a one-line `summary` of the changes and the current `createdAt`.

6. **Make sure it's open in the browser.** If the viewer is already running it picks up the new
   revision automatically (it polls). If you're not sure it's running, start it in the
   background so the user sees the result without running a separate command:

   ```bash
   visual-planner --plan "<slug>" || node "${CLAUDE_PLUGIN_ROOT}/server/server.js" --plan "<slug>"
   ```

   (Launching again when a server is already up is harmless — the port auto-increments if
   busy.) Run it as a background process.

7. **Report the link.** Always include the URL in your reply:
   > Revision N+1 is ready and open in the browser: **http://localhost:<port>/?plan=<slug>**
   > Switch to the latest revision and use **Compare with previous** to see the diff.

## Notes

- Never overwrite an existing revision — always write the next number.
- The pasted feedback may include **task reorder** blocks ("Rewrite the task list in this
  section so the items appear in exactly this order: ..."). When present, reorder the matching
  `- [ ]` items in that section to the listed sequence and leave their wording and estimates
  unchanged. (Reorders live only in the pasted prompt, not in the comments sidecar.)
- If a comment is unclear or conflicts with a constraint, ask the user before proceeding
  rather than guessing.
- Use 3-digit zero-padded revision numbers.
