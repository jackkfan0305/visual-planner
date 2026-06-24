---
description: Open the visual plan viewer in the browser to review a plan and leave comments. Use when the user runs /visual-planner:plan-view.
argument-hint: [slug]
disable-model-invocation: true
---

# Open the plan viewer

Launch the local viewer server (it serves the browser UI and reads the `.plans/` folder)
and open the plan in the user's browser.

Plan to open: **$ARGUMENTS** (a plan slug; may be empty).

## Steps

1. **Resolve the slug.** If `$ARGUMENTS` is empty, list the directories under `.plans/` and:
   - if exactly one plan exists, use it;
   - if several exist, ask the user which slug to open (or open the picker by launching
     with no `--plan`).

2. **Start the server in the background** from the current project directory so it can find
   `.plans/`. Use the launcher (on PATH while the plugin is enabled), falling back to node:

   ```bash
   visual-planner --plan "<slug>" || node "${CLAUDE_PLUGIN_ROOT}/server/server.js" --plan "<slug>"
   ```

   Run it as a background process so this session stays interactive. The server prints a
   line like `[visual-planner] open: http://localhost:4517/?plan=<slug>` and opens the
   browser automatically. If the port is busy it auto-increments.

3. **Report the URL** to the user (copy it from the server output) in case the browser did
   not open on its own, and remind them:
   > Highlight any sentence, code line, or step to leave a comment. When you're done, click
   > **Send feedback**, copy the prompt, and paste it back here to generate the next revision.

## Notes

- The server is read-mostly: it serves the viewer and the plan files, and lets the viewer
  save comments to a sidecar JSON. The actual revision is produced by Claude Code from the
  feedback prompt (or via `/visual-planner:plan-revise`).
- Leave the server running while the user reviews; it polls for new revision files so plans
  you write appear live in the revision dropdown.
- Requires Node.js on PATH.
