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

function must<T extends HTMLElement>(sel: string): T {
  const node = $<T>(sel);
  if (!node) throw new Error(`Missing required element: ${sel}`);
  return node;
}

const els = {
  planScroll: must<HTMLElement>("#plan-scroll"),
  planCol: must<HTMLElement>("#plan-col"),
  emptyPlan: must<HTMLElement>("#empty-plan"),
  crumbSlug: must<HTMLElement>("#crumb-slug"),
  revPill: must<HTMLElement>("#rev-pill"),
  statusDot: must<HTMLElement>("#status-dot"),
  statusText: must<HTMLElement>("#status-text"),
  sendBtn: must<HTMLButtonElement>("#send-feedback"),
  openCount: must<HTMLElement>("#open-count"),
  commentList: must<HTMLElement>("#comment-list"),
  countEl: must<HTMLElement>("#comments-count"),
  filterBtn: must<HTMLElement>("#filter-btn"),
  overlayRoot: must<HTMLElement>("#overlay-root"),
};

let toastTimer: ReturnType<typeof setTimeout> | undefined;
function showToast(msg: string): void {
  clearTimeout(toastTimer);
  $(".toast")?.remove();
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = msg;
  els.overlayRoot.append(t);
  toastTimer = setTimeout(() => t.remove(), 2000);
}

// ---- Rendering -----------------------------------------------------------

function renderCurrentPlan(): void {
  renderPlan(els.planCol, store.markdown);
  emit("plan:rendered");
}

function updateHeader(): void {
  els.crumbSlug.textContent = store.slug ?? "—";
  updatePill(`rev ${store.currentRev}`);
}

function updateStatus(): void {
  const openCount = openComments().length;
  const reorderCount = Object.keys(store.taskReorders).length;
  const total = openCount + reorderCount;
  els.openCount.textContent = String(total);
  els.sendBtn.disabled = total === 0;
  if (total) {
    els.statusDot.style.background = "#ffffe3";
    const bits: string[] = [];
    if (openCount) bits.push(`${openCount} comment${openCount > 1 ? "s" : ""}`);
    if (reorderCount) bits.push(`${reorderCount} task reorder${reorderCount > 1 ? "s" : ""}`);
    els.statusText.textContent = `${bits.join(" + ")} to send`;
  } else {
    els.statusDot.style.background = "#6d8196";
    els.statusText.textContent = "Ready for review";
  }
}

// ---- Loading -------------------------------------------------------------

async function loadRevision(rev: number): Promise<void> {
  if (!store.slug) return;
  store.compareBase = null;
  store.currentRev = rev;
  store.markdown = await api.getRevision(store.slug, rev);
  renderCurrentPlan();
  updateHeader();
  const serverComments = await api.getComments(store.slug, rev).catch(() => []);
  mergeAndLoad(serverComments);
  updateStatus();
}

async function loadPlan(slug: string): Promise<void> {
  store.slug = slug;
  store.manifest = await api.getManifest(slug);
  await loadRevision(store.manifest.latest);
}

async function showCompare(fromRev: number, toRev: number): Promise<void> {
  if (!store.slug) return;
  store.compareBase = fromRev;
  await renderDiff(els.planCol, store.slug, fromRev, toRev);
  updatePill(`rev ${fromRev} → ${toRev}`);
}

// ---- Polling for new revisions ------------------------------------------

let lastLatest = 0;
async function poll(): Promise<void> {
  if (!store.slug) return;
  try {
    const manifest = await api.getManifest(store.slug);
    if (manifest.latest > lastLatest && lastLatest !== 0) {
      store.manifest = manifest;
      showToast(`New revision: rev ${manifest.latest}`);
    } else {
      store.manifest = manifest;
    }
    lastLatest = manifest.latest;
  } catch {
    /* server may be momentarily unavailable */
  }
}

// ---- Empty / picker state ------------------------------------------------

async function showPicker(): Promise<void> {
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

function wireHeader(): void {
  els.sendBtn.addEventListener("click", () => openCopyModal(els.overlayRoot, showToast));
  on("comments:changed", () => updateStatus());
  on("tasks:reordered", () => updateStatus());
}

async function main(): Promise<void> {
  initComments({
    planScrollEl: els.planScroll,
    planColEl: els.planCol,
    listEl: els.commentList,
    overlayRoot: els.overlayRoot,
    filterBtn: els.filterBtn,
    countEl: els.countEl,
  });

  initRevisions(
    { revPill: els.revPill, overlayRoot: els.overlayRoot },
    { onSelect: (rev) => void loadRevision(rev), onCompare: (from, to) => void showCompare(from, to) }
  );
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
  } catch (err) {
    els.emptyPlan.hidden = false;
    const sub = $("#empty-plan-sub");
    if (sub) sub.textContent = `Could not load plan "${slug}": ${err instanceof Error ? err.message : String(err)}`;
  }
}

void main();
