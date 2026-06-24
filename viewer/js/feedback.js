// Build the copy-pasteable feedback prompt and the "Send feedback" modal.
// Ported from buildFeedback() in Plan Review.dc.html, augmented with a
// self-contained header that tells Claude Code which files to write.
import { el } from "./dom.js";
import { store, openComments } from "./store.js";
function revFile(rev) {
    return `.plans/${store.slug}/rev-${String(rev).padStart(3, "0")}.md`;
}
function nextRev() {
    return (store.manifest?.latest ?? store.currentRev) + 1;
}
/** The instruction header that makes the pasted prompt self-driving. */
function header(openCount, reorderCount) {
    const cur = store.currentRev;
    const next = nextRev();
    const parts = [];
    if (openCount)
        parts.push(`left ${openCount} comment(s) on specific passages`);
    if (reorderCount)
        parts.push(`reordered the tasks in ${reorderCount} section(s)`);
    return (`I reviewed the implementation plan at \`${revFile(cur)}\` and ${parts.join(" and ")}. ` +
        `Please revise the plan to address everything below.\n\n` +
        `Save the revised plan as \`${revFile(next)}\` (do not overwrite the current revision), then ` +
        `append the new revision to \`.plans/${store.slug}/plan.json\` with a one-line "what changed" summary ` +
        `(bump "latest" to ${next}).\n\n`);
}
/** Reordered task lists captured from drag-and-drop, in store order. */
function reorderBlocks() {
    return Object.values(store.taskReorders);
}
function reorderDetail(reorders) {
    let s = "";
    reorders.forEach((r, i) => {
        s += `── Task reorder ${i + 1}  ·  [${r.section}] ──\n`;
        s += `Rewrite the task list in this section so the items appear in exactly this order:\n`;
        r.current.forEach((t, j) => {
            s += `${j + 1}. ${t}\n`;
        });
        s += `\n`;
    });
    return s;
}
export function buildFeedback() {
    const open = openComments();
    const reorders = reorderBlocks();
    if (!open.length && !reorders.length)
        return "";
    if (store.tone === "concise") {
        let s = `Revise \`${revFile(store.currentRev)}\` into \`${revFile(nextRev())}\`:\n\n`;
        if (open.length) {
            s += `Address these comments:\n`;
            open.forEach((c, i) => {
                const q = c.quote.length > 90 ? c.quote.slice(0, 90) + "…" : c.quote;
                s += `${i + 1}. [${c.section}] "${q}"\n   → ${c.body}\n\n`;
            });
        }
        if (reorders.length) {
            s += `Reorder these task lists:\n`;
            reorders.forEach((r) => {
                s += `• [${r.section}] new order: ${r.current.map((t, j) => `${j + 1}) ${t}`).join("  ")}\n`;
            });
            s += `\n`;
        }
        s += `Keep the same structure and update plan.json with a "what changed" note.`;
        return s;
    }
    let s = header(open.length, reorders.length);
    if (open.length) {
        s += `Each comment quotes the exact passage it refers to, followed by the change I want.\n\n`;
        open.forEach((c, i) => {
            s += `── Comment ${i + 1}  ·  [${c.section}] ──\n`;
            s += `Quoted from the plan:\n> ${c.quote}\n\n`;
            s += `My feedback:\n${c.body}\n\n`;
        });
    }
    if (reorders.length) {
        s += reorderDetail(reorders);
    }
    s +=
        `When you respond:\n` +
            `• Apply each change directly to the new revision.\n` +
            `• Keep the existing section structure, headings, code blocks and diagrams (visual-planner plan format).\n` +
            (reorders.length ? `• Reorder only the listed task items — keep their wording unchanged.\n` : "") +
            `• Add a short "What changed in this revision" summary at the top noting how you addressed each item.\n` +
            `• If any feedback is unclear or conflicts with a constraint, ask before proceeding.`;
    return s;
}
let modalEl = null;
export function openCopyModal(overlayRoot, showToast) {
    const open = openComments();
    const reorderCount = Object.keys(store.taskReorders).length;
    if (!open.length && !reorderCount)
        return;
    closeCopyModal();
    const summaryBits = [];
    if (open.length)
        summaryBits.push(`${open.length} comment(s)`);
    if (reorderCount)
        summaryBits.push(`${reorderCount} task reorder(s)`);
    const summary = summaryBits.join(" + ");
    const pre = el("pre", { class: "modal-pre", text: buildFeedback() });
    const toneBtn = (tone, label) => el("button", {
        class: store.tone === tone ? "on" : "",
        text: label,
        type: "button",
        onClick: () => {
            store.tone = tone;
            pre.textContent = buildFeedback();
            modal.querySelectorAll(".tone-toggle button").forEach((b) => b.classList.toggle("on", (b.textContent ?? "").toLowerCase() === store.tone));
        },
    });
    const copyBtn = el("button", { class: "btn-copy", type: "button", text: "Copy to clipboard" });
    copyBtn.addEventListener("click", () => {
        try {
            void navigator.clipboard.writeText(buildFeedback());
        }
        catch {
            /* clipboard may be blocked; user can select manually */
        }
        showToast("Copied — paste into Claude Code");
    });
    const modal = el("div", { class: "modal", "data-cc-ui": "", onClick: (e) => e.stopPropagation() }, [
        el("div", { class: "modal-head" }, [
            el("div", {}, [
                el("div", { class: "ttl", text: "Send feedback to Claude Code" }),
                el("div", {
                    class: "sub",
                    text: `${summary} · copy this and paste it into your Claude Code session`,
                }),
            ]),
            el("button", { class: "modal-close", type: "button", text: "✕", onClick: closeCopyModal }),
        ]),
        pre,
        el("div", { class: "modal-foot" }, [
            el("span", { class: "note", text: "Claude Code revises the plan, you review again — repeat." }),
            el("div", { class: "tone-toggle" }, [toneBtn("detailed", "Detailed"), toneBtn("concise", "Concise")]),
            copyBtn,
        ]),
    ]);
    modalEl = el("div", { class: "modal-backdrop", "data-cc-ui": "", onClick: closeCopyModal }, [modal]);
    overlayRoot.append(modalEl);
}
export function closeCopyModal() {
    if (modalEl)
        modalEl.remove();
    modalEl = null;
}
