// Bootstrap: load plan + revision, render, wire header, comments, revisions, diff.

import { $ } from "./dom.js";
import { store, on, openComments } from "./store.js";
import * as api from "./api.js";
import { renderPlan } from "./render-plan.js";
import { initComments, mergeAndLoad } from "./comments.js";
import { buildFeedback, openCopyModal, closeCopyModal } from "./feedback.js";
import { initRevisions, updatePill } from "./revisions.js";
import { renderDiff, onExitDiff } from "./diff.js";
import { emit } from "./store.js";

const POLL_MS = 3000;

const els = {
  planScroll: $("#plan-scroll"),
  planCol: $("#plan-col"),
  emptyPlan: $("#empty-plan"),
  crumbSlug: $("#crumb-slug"),
  revPill: $("#rev-pill"),
  statusPill: $("#status-pill"),
  statusDot: $("#status-dot"),
  statusText: $("#status-text"),
  sendBtn: $("#send-feedback"),
  openCount: $("#open-count"),
  commentList: $("#comment-list"),
  countEl: $("#comments-count"),
  filterBtn: $("#filter-btn"),
  overlayRoot: $("#overlay-root"),
};

let toastTimer = null;
function showToast(msg) {
  clearTimeout(toastTimer);
  let t = $(".toast");
  if (t) t.remove();
  t = document.createElement("div");
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
  els.crumbSlug.textContent = store.slug || "—";
  updatePill(`rev ${store.currentRev}`);
}

function updateStatus() {
  const open = openComments();
  els.openCount.textContent = String(open.length);
  els.sendBtn.disabled = open.length === 0;
  if (open.length) {
    els.statusDot.style.background = "#ffffe3";
    els.statusText.textContent = `${open.length} comment${open.length > 1 ? "s" : ""} to send`;
  } else {
    els.statusDot.style.background = "#6d8196";
    els.statusText.textContent = "Ready for review";
  }
}

// ---- Loading -------------------------------------------------------------

async function loadRevision(rev) {
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
  store.compareBase = fromRev;
  await renderDiff(els.planCol, store.slug, fromRev, toRev);
  updatePill(`rev ${fromRev} → ${toRev}`);
}

// ---- Polling for new revisions ------------------------------------------

let lastLatest = 0;
async function poll() {
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

async function showPicker() {
  const plans = await api.listPlans().catch(() => []);
  els.emptyPlan.hidden = false;
  const sub = $("#empty-plan-sub");
  if (plans.length) {
    sub.innerHTML = "Open a plan:";
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
  els.sendBtn.addEventListener("click", () =>
    openCopyModal(els.overlayRoot, showToast)
  );
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

  initRevisions(
    { revPill: els.revPill, overlayRoot: els.overlayRoot },
    {
      onSelect: (rev) => loadRevision(rev),
      onCompare: (from, to) => showCompare(from, to),
    }
  );
  onExitDiff(() => loadRevision(store.currentRev));

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
    lastLatest = store.manifest.latest;
    setInterval(poll, POLL_MS);
  } catch (err) {
    els.emptyPlan.hidden = false;
    $("#empty-plan-sub").textContent = `Could not load plan "${slug}": ${err.message}`;
  }
}

main();
