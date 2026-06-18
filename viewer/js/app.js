// Bootstrap: load plan + revision, render, wire header, comments, revisions, diff.
import { $ } from "./dom.js";
import { store, on, openComments } from "./store.js";
import * as api from "./api.js";
import { renderPlan } from "./render-plan.js";
import { initComments, mergeAndLoad } from "./comments.js";
import { openCopyModal } from "./feedback.js";
import { initRevisions, updatePill } from "./revisions.js";
import { renderDiff, onExitDiff } from "./diff.js";
import { emit } from "./store.js";
const POLL_MS = 3000;
function must(sel) {
    const node = $(sel);
    if (!node)
        throw new Error(`Missing required element: ${sel}`);
    return node;
}
const els = {
    planScroll: must("#plan-scroll"),
    planCol: must("#plan-col"),
    emptyPlan: must("#empty-plan"),
    crumbSlug: must("#crumb-slug"),
    revPill: must("#rev-pill"),
    statusDot: must("#status-dot"),
    statusText: must("#status-text"),
    sendBtn: must("#send-feedback"),
    openCount: must("#open-count"),
    commentList: must("#comment-list"),
    countEl: must("#comments-count"),
    filterBtn: must("#filter-btn"),
    overlayRoot: must("#overlay-root"),
};
let toastTimer;
function showToast(msg) {
    clearTimeout(toastTimer);
    $(".toast")?.remove();
    const t = document.createElement("div");
    t.className = "toast";
    t.textContent = msg;
    els.overlayRoot.append(t);
    toastTimer = setTimeout(() => t.remove(), 2000);
}
// ---- Rendering -----------------------------------------------------------
function renderCurrentPlan() {
    renderPlan(els.planCol, store.markdown);
    emit("plan:rendered");
}
function updateHeader() {
    els.crumbSlug.textContent = store.slug ?? "—";
    updatePill(`rev ${store.currentRev}`);
}
function updateStatus() {
    const open = openComments();
    els.openCount.textContent = String(open.length);
    els.sendBtn.disabled = open.length === 0;
    if (open.length) {
        els.statusDot.style.background = "#ffffe3";
        els.statusText.textContent = `${open.length} comment${open.length > 1 ? "s" : ""} to send`;
    }
    else {
        els.statusDot.style.background = "#6d8196";
        els.statusText.textContent = "Ready for review";
    }
}
// ---- Loading -------------------------------------------------------------
async function loadRevision(rev) {
    if (!store.slug)
        return;
    store.compareBase = null;
    store.currentRev = rev;
    store.markdown = await api.getRevision(store.slug, rev);
    renderCurrentPlan();
    updateHeader();
    const serverComments = await api.getComments(store.slug, rev).catch(() => []);
    mergeAndLoad(serverComments);
    updateStatus();
}
async function loadPlan(slug) {
    store.slug = slug;
    store.manifest = await api.getManifest(slug);
    await loadRevision(store.manifest.latest);
}
async function showCompare(fromRev, toRev) {
    if (!store.slug)
        return;
    store.compareBase = fromRev;
    await renderDiff(els.planCol, store.slug, fromRev, toRev);
    updatePill(`rev ${fromRev} → ${toRev}`);
}
// ---- Polling for new revisions ------------------------------------------
let lastLatest = 0;
async function poll() {
    if (!store.slug)
        return;
    try {
        const manifest = await api.getManifest(store.slug);
        if (manifest.latest > lastLatest && lastLatest !== 0) {
            store.manifest = manifest;
            showToast(`New revision: rev ${manifest.latest}`);
        }
        else {
            store.manifest = manifest;
        }
        lastLatest = manifest.latest;
    }
    catch {
        /* server may be momentarily unavailable */
    }
}
// ---- Empty / picker state ------------------------------------------------
async function showPicker() {
    const plans = await api.listPlans().catch(() => []);
    els.emptyPlan.hidden = false;
    const sub = $("#empty-plan-sub");
    if (sub && plans.length) {
        sub.textContent = "Open a plan:";
        const wrap = document.createElement("div");
        wrap.style.cssText = "margin-top:14px;display:flex;flex-direction:column;gap:8px;align-items:center;";
        plans.forEach((p) => {
            const a = document.createElement("a");
            a.href = `/?plan=${encodeURIComponent(p.slug)}`;
            a.textContent = `${p.title}  (rev ${p.latest})`;
            a.style.cssText = "color:#6d8196;font:600 13px 'JetBrains Mono';text-decoration:none;";
            wrap.append(a);
        });
        els.emptyPlan.append(wrap);
    }
}
// ---- Wire up -------------------------------------------------------------
function wireHeader() {
    els.sendBtn.addEventListener("click", () => openCopyModal(els.overlayRoot, showToast));
    on("comments:changed", () => updateStatus());
}
async function main() {
    initComments({
        planScrollEl: els.planScroll,
        planColEl: els.planCol,
        listEl: els.commentList,
        overlayRoot: els.overlayRoot,
        filterBtn: els.filterBtn,
        countEl: els.countEl,
    });
    initRevisions({ revPill: els.revPill, overlayRoot: els.overlayRoot }, { onSelect: (rev) => void loadRevision(rev), onCompare: (from, to) => void showCompare(from, to) });
    onExitDiff(() => void loadRevision(store.currentRev));
    wireHeader();
    const params = new URLSearchParams(location.search);
    const slug = params.get("plan");
    if (!slug) {
        await showPicker();
        return;
    }
    els.emptyPlan.hidden = true;
    try {
        await loadPlan(slug);
        lastLatest = store.manifest?.latest ?? 0;
        setInterval(() => void poll(), POLL_MS);
    }
    catch (err) {
        els.emptyPlan.hidden = false;
        const sub = $("#empty-plan-sub");
        if (sub)
            sub.textContent = `Could not load plan "${slug}": ${err instanceof Error ? err.message : String(err)}`;
    }
}
void main();
