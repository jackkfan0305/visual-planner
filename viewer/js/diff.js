// Line-level unified diff between two revisions (LCS-based).
import { el, escapeHtml } from "./dom.js";
import { getRevision } from "./api.js";
import { store } from "./store.js";
/** Compute an LCS line diff -> array of { type, text }. */
export function diffLines(aText, bText) {
    const a = aText.split("\n");
    const b = bText.split("\n");
    const n = a.length;
    const m = b.length;
    const dp = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
    for (let i = n - 1; i >= 0; i--) {
        for (let j = m - 1; j >= 0; j--) {
            dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
        }
    }
    const out = [];
    let i = 0;
    let j = 0;
    while (i < n && j < m) {
        if (a[i] === b[j]) {
            out.push({ type: "ctx", text: a[i] });
            i++;
            j++;
        }
        else if (dp[i + 1][j] >= dp[i][j + 1]) {
            out.push({ type: "del", text: a[i] });
            i++;
        }
        else {
            out.push({ type: "add", text: b[j] });
            j++;
        }
    }
    while (i < n)
        out.push({ type: "del", text: a[i++] });
    while (j < m)
        out.push({ type: "add", text: b[j++] });
    return out;
}
/** Collapse long runs of unchanged context into hunk separators. */
function withHunks(lines, context = 3) {
    const keep = new Array(lines.length).fill(false);
    lines.forEach((l, i) => {
        if (l.type !== "ctx") {
            for (let k = Math.max(0, i - context); k <= Math.min(lines.length - 1, i + context); k++)
                keep[k] = true;
        }
    });
    const result = [];
    let gap = false;
    for (let i = 0; i < lines.length; i++) {
        if (keep[i]) {
            result.push(lines[i]);
            gap = false;
        }
        else if (!gap) {
            result.push({ type: "hunk", text: "⋯" });
            gap = true;
        }
    }
    return result;
}
const GUTTER = { add: "+", del: "−", ctx: " ", hunk: "" };
const CLS = { add: "diff-add", del: "diff-del", ctx: "diff-ctx", hunk: "diff-hunk" };
export async function renderDiff(container, slug, fromRev, toRev) {
    const [aText, bText] = await Promise.all([getRevision(slug, fromRev), getRevision(slug, toRev)]);
    const lines = withHunks(diffLines(aText, bText));
    const banner = el("div", { class: "diff-banner" }, [
        "Comparing ",
        el("b", { text: `rev ${fromRev}` }),
        " → ",
        el("b", { text: `rev ${toRev}` }),
        el("button", { class: "exit", text: "Exit diff", onClick: () => exitDiff() }),
    ]);
    const changes = lines.filter((l) => l.type === "add" || l.type === "del").length;
    let bodyNode;
    if (changes === 0) {
        bodyNode = el("div", { class: "diff-empty", text: "No differences between these revisions." });
    }
    else {
        const html = lines
            .map((l) => `<span class="diff-line ${CLS[l.type]}"><span class="gutter">${GUTTER[l.type]}</span>${escapeHtml(l.text)}</span>`)
            .join("");
        bodyNode = el("pre", { class: "diff-pre cc-scroll", html });
    }
    container.replaceChildren(banner, bodyNode);
}
let exitCb = null;
export function onExitDiff(fn) {
    exitCb = fn;
}
function exitDiff() {
    store.compareBase = null;
    if (exitCb)
        exitCb();
}
