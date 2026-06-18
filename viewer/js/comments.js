// Comment layer: text selection -> bubble -> composer -> sidebar, plus the
// CSS Custom Highlight API rendering. Ported from Plan Review.dc.html.
import { el, clear } from "./dom.js";
import { store, emit, on } from "./store.js";
import { saveComments } from "./api.js";
let refs;
let ranges = {};
let pendingRange = null;
let selState = null;
let composerEl = null;
let bubbleEl = null;
let uid = 0;
let saveTimer;
export function initComments(elements) {
    refs = elements;
    document.addEventListener("mouseup", (e) => {
        const target = e.target;
        if (target?.closest("[data-cc-ui]"))
            return;
        if (target?.closest(".composer"))
            return;
        handleSelection();
    });
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            closeBubble();
            closeComposer();
        }
    });
    refs.filterBtn.addEventListener("click", () => {
        store.filter = store.filter === "all" ? "open" : "all";
        renderSidebar();
    });
    on("plan:rendered", () => {
        resolveRanges();
        refreshHighlights();
    });
}
// ---- Loading / persistence ----------------------------------------------
const lsKey = (slug, rev) => `vp:${slug}:${rev}`;
export function setComments(list) {
    store.comments = list;
    uid = store.comments.reduce((m, c) => Math.max(m, parseInt(c.id.replace(/\D/g, ""), 10) || 0), 0);
    resolveRanges();
    renderSidebar();
    refreshHighlights();
}
/** Merge server comments with any locally cached ones (local wins on id). */
export function mergeAndLoad(serverComments) {
    const byId = new Map();
    serverComments.forEach((c) => byId.set(c.id, c));
    readLocal().forEach((c) => byId.set(c.id, c));
    setComments(Array.from(byId.values()));
}
function readLocal() {
    if (!store.slug)
        return [];
    try {
        return JSON.parse(localStorage.getItem(lsKey(store.slug, store.currentRev)) ?? "[]");
    }
    catch {
        return [];
    }
}
function persist() {
    if (!store.slug)
        return;
    const slug = store.slug;
    const rev = store.currentRev;
    try {
        localStorage.setItem(lsKey(slug, rev), JSON.stringify(store.comments));
    }
    catch {
        /* localStorage may be unavailable */
    }
    clearTimeout(saveTimer);
    const snapshot = store.comments.slice();
    saveTimer = setTimeout(() => {
        saveComments(slug, rev, snapshot).catch(() => {
            /* sidecar save is best-effort; localStorage already holds the data */
        });
    }, 600);
}
function changed() {
    persist();
    renderSidebar();
    refreshHighlights();
    emit("comments:changed");
}
// ---- Selection -> bubble -------------------------------------------------
function handleSelection() {
    if (composerEl)
        return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount)
        return closeBubble();
    const range = sel.getRangeAt(0);
    if (!refs.planColEl.contains(range.commonAncestorContainer))
        return closeBubble();
    const text = sel.toString().trim();
    if (text.length < 2)
        return closeBubble();
    const rect = range.getBoundingClientRect();
    pendingRange = range.cloneRange();
    selState = { bx: rect.left + rect.width / 2, by: rect.top - 8, by2: rect.bottom + 10, quote: text };
    showBubble();
}
function showBubble() {
    closeBubble();
    if (!selState)
        return;
    bubbleEl = el("div", { class: "sel-bubble" }, [
        el("button", { type: "button", onMousedown: openComposer }, [el("span", { class: "plus", text: "+" }), " Comment"]),
    ]);
    bubbleEl.style.left = selState.bx + "px";
    bubbleEl.style.top = selState.by + "px";
    refs.overlayRoot.append(bubbleEl);
}
function closeBubble() {
    if (bubbleEl)
        bubbleEl.remove();
    bubbleEl = null;
    selState = null;
}
// ---- Composer ------------------------------------------------------------
function openComposer(e) {
    e.preventDefault();
    if (!selState)
        return;
    const s = selState;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const left = Math.min(Math.max(s.bx - 154, 14), vw - 322);
    const top = Math.min(s.by2, vh - 230);
    const quote = s.quote;
    closeBubble();
    const textarea = el("textarea", { placeholder: "Tell Claude Code what to change here…" });
    const addBtn = el("button", { class: "btn-add", type: "button", text: "Add comment" });
    addBtn.disabled = true;
    textarea.addEventListener("input", () => {
        addBtn.disabled = !textarea.value.trim();
    });
    addBtn.addEventListener("click", () => addComment(quote, textarea.value));
    composerEl = el("div", { class: "composer", "data-cc-ui": "" }, [
        el("div", { class: "composer-quote", text: quote }),
        textarea,
        el("div", { class: "composer-actions" }, [
            el("button", { class: "btn-ghost", type: "button", text: "Cancel", onClick: closeComposer }),
            addBtn,
        ]),
    ]);
    composerEl.style.left = left + "px";
    composerEl.style.top = top + "px";
    refs.overlayRoot.append(composerEl);
    setTimeout(() => textarea.focus(), 0);
}
function closeComposer() {
    if (composerEl)
        composerEl.remove();
    composerEl = null;
    pendingRange = null;
}
function addComment(quote, body) {
    const trimmed = body.trim();
    if (!trimmed || !pendingRange)
        return;
    const id = "c" + ++uid;
    ranges[id] = pendingRange;
    const section = sectionOf(pendingRange);
    store.comments = [...store.comments, { id, section, quote, body: trimmed, status: "open" }];
    store.activeId = id;
    pendingRange = null;
    closeComposer();
    changed();
}
// ---- Range helpers -------------------------------------------------------
function findRange(quote) {
    const walk = document.createTreeWalker(refs.planColEl, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walk.nextNode())) {
        const val = n.nodeValue ?? "";
        const i = val.indexOf(quote);
        if (i >= 0) {
            const r = document.createRange();
            r.setStart(n, i);
            r.setEnd(n, i + quote.length);
            return r;
        }
    }
    return null;
}
function sectionOf(range) {
    let node = range.startContainer;
    if (node.nodeType === 3)
        node = node.parentElement;
    const sec = node instanceof Element ? node.closest("[data-section]") : null;
    return sec ? sec.getAttribute("data-section") ?? "Plan" : "Plan";
}
function resolveRanges() {
    ranges = {};
    store.comments.forEach((c) => {
        const r = findRange(c.quote);
        if (r)
            ranges[c.id] = r;
    });
}
function refreshHighlights() {
    if (!window.CSS || !CSS.highlights)
        return;
    const open = store.comments.filter((c) => c.status !== "resolved");
    const rs = open.map((c) => ranges[c.id]).filter((r) => Boolean(r));
    try {
        CSS.highlights.set("cc-comment", new Highlight(...rs));
    }
    catch {
        /* unsupported */
    }
    const active = store.activeId ? ranges[store.activeId] : undefined;
    try {
        CSS.highlights.set("cc-active", active ? new Highlight(active) : new Highlight());
    }
    catch {
        /* unsupported */
    }
}
// ---- Sidebar -------------------------------------------------------------
function jump(id) {
    const r = ranges[id];
    const plan = refs.planScrollEl;
    store.activeId = id;
    if (r) {
        const rr = r.getBoundingClientRect();
        const pr = plan.getBoundingClientRect();
        plan.scrollTo({ top: plan.scrollTop + (rr.top - pr.top) - 150, behavior: "smooth" });
    }
    renderSidebar();
    refreshHighlights();
}
function toggleResolve(id) {
    store.comments = store.comments.map((c) => c.id === id ? { ...c, status: c.status === "resolved" ? "open" : "resolved" } : c);
    changed();
}
function deleteComment(id) {
    delete ranges[id];
    store.comments = store.comments.filter((c) => c.id !== id);
    if (store.activeId === id)
        store.activeId = null;
    changed();
}
function renderSidebar() {
    const list = refs.listEl;
    clear(list);
    const all = store.comments;
    const visible = store.filter === "open" ? all.filter((c) => c.status !== "resolved") : all;
    refs.filterBtn.textContent = store.filter === "open" ? "Open only" : "All";
    refs.countEl.textContent = String(all.length);
    if (visible.length === 0) {
        list.append(el("div", { class: "comments-empty" }, [
            el("div", { class: "ico", text: "”" }),
            el("div", { class: "ttl", text: "No comments yet" }),
            el("div", { class: "sub" }, [
                "Select any text in the plan — like ",
                el("mark", { text: "this passage" }),
                " — to leave a comment for Claude Code.",
            ]),
        ]));
        emit("comments:changed");
        return;
    }
    visible.forEach((c) => {
        const idx = all.indexOf(c) + 1;
        const resolved = c.status === "resolved";
        const quoteShort = c.quote.length > 96 ? c.quote.slice(0, 96) + "…" : c.quote;
        const children = [
            el("div", { class: "comment-top" }, [
                el("span", { class: "comment-section", text: c.section }),
                resolved ? el("span", { class: "comment-resolved-tag", text: "RESOLVED" }) : null,
                el("span", { class: "comment-num", text: "#" + idx }),
            ]),
            el("div", { class: "comment-quote", text: quoteShort }),
            el("div", { class: "comment-body", text: c.body }),
            el("div", { class: "comment-actions" }, [
                el("button", {
                    class: "btn-resolve",
                    text: resolved ? "Reopen" : "Resolve",
                    onClick: (e) => {
                        e.stopPropagation();
                        toggleResolve(c.id);
                    },
                }),
                el("button", {
                    class: "btn-delete",
                    text: "Delete",
                    onClick: (e) => {
                        e.stopPropagation();
                        deleteComment(c.id);
                    },
                }),
            ]),
        ];
        const cls = "comment" + (resolved ? " resolved" : "") + (c.id === store.activeId ? " active" : "");
        list.append(el("div", { class: cls, onClick: () => jump(c.id) }, children));
    });
    emit("comments:changed");
}
