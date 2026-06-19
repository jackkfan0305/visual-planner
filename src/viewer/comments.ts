// Comment layer: text selection -> bubble -> composer -> sidebar, plus the
// CSS Custom Highlight API rendering. Ported from Plan Review.dc.html.

import { el, clear, type Child } from "./dom.js";
import { store, emit, on, type Comment } from "./store.js";
import { saveComments } from "./api.js";

export interface CommentRefs {
  planScrollEl: HTMLElement;
  planColEl: HTMLElement;
  listEl: HTMLElement;
  overlayRoot: HTMLElement;
  filterBtn: HTMLElement;
  countEl: HTMLElement;
}

interface SelState {
  bx: number;
  by: number;
  by2: number;
  quote: string;
}

let refs: CommentRefs;
let ranges: Record<string, Range> = {};
let pendingRange: Range | null = null;
let selState: SelState | null = null;
let composerEl: HTMLElement | null = null;
let bubbleEl: HTMLElement | null = null;
let uid = 0;
let saveTimer: ReturnType<typeof setTimeout> | undefined;

export function initComments(elements: CommentRefs): void {
  refs = elements;

  document.addEventListener("mouseup", (e) => {
    const target = e.target as Element | null;
    if (target?.closest("[data-cc-ui]")) return;
    if (target?.closest(".composer")) return;
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

const lsKey = (slug: string, rev: number): string => `vp:${slug}:${rev}`;

export function setComments(list: Comment[]): void {
  store.comments = list;
  uid = store.comments.reduce((m, c) => Math.max(m, parseInt(c.id.replace(/\D/g, ""), 10) || 0), 0);
  resolveRanges();
  renderSidebar();
  refreshHighlights();
}

/** Merge server comments with any locally cached ones (local wins on id). */
export function mergeAndLoad(serverComments: Comment[]): void {
  const byId = new Map<string, Comment>();
  serverComments.forEach((c) => byId.set(c.id, c));
  readLocal().forEach((c) => byId.set(c.id, c));
  setComments(Array.from(byId.values()));
}

function readLocal(): Comment[] {
  if (!store.slug) return [];
  try {
    return JSON.parse(localStorage.getItem(lsKey(store.slug, store.currentRev)) ?? "[]") as Comment[];
  } catch {
    return [];
  }
}

function persist(): void {
  if (!store.slug) return;
  const slug = store.slug;
  const rev = store.currentRev;
  try {
    localStorage.setItem(lsKey(slug, rev), JSON.stringify(store.comments));
  } catch {
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

function changed(): void {
  persist();
  renderSidebar();
  refreshHighlights();
  emit("comments:changed");
}

// ---- Selection -> bubble -------------------------------------------------

function handleSelection(): void {
  if (composerEl) return;
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || !sel.rangeCount) return closeBubble();
  const range = sel.getRangeAt(0);
  if (!refs.planColEl.contains(range.commonAncestorContainer)) return closeBubble();
  const text = sel.toString().trim();
  if (text.length < 2) return closeBubble();
  const rect = range.getBoundingClientRect();
  pendingRange = range.cloneRange();
  selState = { bx: rect.left + rect.width / 2, by: rect.top - 8, by2: rect.bottom + 10, quote: text };
  showBubble();
}

function showBubble(): void {
  const s = selState;
  closeBubble();
  if (!s) return;
  selState = s;
  bubbleEl = el("div", { class: "sel-bubble" }, [
    el("button", { type: "button", onMousedown: openComposer }, [el("span", { class: "plus", text: "+" }), " Comment"]),
  ]);
  bubbleEl.style.left = s.bx + "px";
  bubbleEl.style.top = s.by + "px";
  refs.overlayRoot.append(bubbleEl);
}

function closeBubble(): void {
  if (bubbleEl) bubbleEl.remove();
  bubbleEl = null;
  selState = null;
}

// ---- Composer ------------------------------------------------------------

function openComposer(e: Event): void {
  e.preventDefault();
  if (!selState) return;
  const s = selState;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const left = Math.min(Math.max(s.bx - 154, 14), vw - 322);
  const top = Math.min(s.by2, vh - 230);
  const quote = s.quote;
  closeBubble();

  const textarea = el("textarea", { placeholder: "Tell Claude Code what to change here…" }) as HTMLTextAreaElement;
  const addBtn = el("button", { class: "btn-add", type: "button", text: "Add comment" }) as HTMLButtonElement;
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

function closeComposer(): void {
  if (composerEl) composerEl.remove();
  composerEl = null;
  pendingRange = null;
}

function addComment(quote: string, body: string): void {
  const trimmed = body.trim();
  if (!trimmed || !pendingRange) return;
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

function findRange(quote: string): Range | null {
  const walk = document.createTreeWalker(refs.planColEl, NodeFilter.SHOW_TEXT);
  let n: Node | null;
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

function sectionOf(range: Range): string {
  let node: Node | null = range.startContainer;
  if (node.nodeType === 3) node = node.parentElement;
  const sec = node instanceof Element ? node.closest("[data-section]") : null;
  return sec ? sec.getAttribute("data-section") ?? "Plan" : "Plan";
}

function resolveRanges(): void {
  ranges = {};
  store.comments.forEach((c) => {
    const r = findRange(c.quote);
    if (r) ranges[c.id] = r;
  });
}

function refreshHighlights(): void {
  if (!window.CSS || !CSS.highlights) return;
  const open = store.comments.filter((c) => c.status !== "resolved");
  const rs = open.map((c) => ranges[c.id]).filter((r): r is Range => Boolean(r));
  try {
    CSS.highlights.set("cc-comment", new Highlight(...rs));
  } catch {
    /* unsupported */
  }
  const active = store.activeId ? ranges[store.activeId] : undefined;
  try {
    CSS.highlights.set("cc-active", active ? new Highlight(active) : new Highlight());
  } catch {
    /* unsupported */
  }
}

// ---- Sidebar -------------------------------------------------------------

function jump(id: string): void {
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

function toggleResolve(id: string): void {
  store.comments = store.comments.map((c) =>
    c.id === id ? { ...c, status: c.status === "resolved" ? "open" : "resolved" } : c
  );
  changed();
}

function deleteComment(id: string): void {
  delete ranges[id];
  store.comments = store.comments.filter((c) => c.id !== id);
  if (store.activeId === id) store.activeId = null;
  if (editingId === id) editingId = null;
  changed();
}

let editingId: string | null = null;
function startEdit(id: string): void {
  editingId = id;
  renderSidebar();
}
function cancelEdit(): void {
  editingId = null;
  renderSidebar();
}
function saveEdit(id: string, value: string): void {
  const body = value.trim();
  if (!body) return;
  store.comments = store.comments.map((c) => (c.id === id ? { ...c, body } : c));
  editingId = null;
  changed();
}

function renderSidebar(): void {
  const list = refs.listEl;
  clear(list);

  const all = store.comments;
  const visible = store.filter === "open" ? all.filter((c) => c.status !== "resolved") : all;

  refs.filterBtn.textContent = store.filter === "open" ? "Open only" : "All";
  refs.countEl.textContent = String(all.length);

  if (visible.length === 0) {
    list.append(
      el("div", { class: "comments-empty" }, [
        el("div", { class: "ico", text: "”" }),
        el("div", { class: "ttl", text: "No comments yet" }),
        el("div", { class: "sub" }, [
          "Select any text in the plan — like ",
          el("mark", { text: "this passage" }),
          " — to leave a comment for Claude Code.",
        ]),
      ])
    );
    emit("comments:changed");
    return;
  }

  visible.forEach((c) => {
    const idx = all.indexOf(c) + 1;
    const resolved = c.status === "resolved";
    const quoteShort = c.quote.length > 96 ? c.quote.slice(0, 96) + "…" : c.quote;
    const editing = c.id === editingId;
    let bodyNode: Child;
    let actionsNode: Child;
    if (editing) {
      const ta = el("textarea", {
        class: "comment-edit",
        style:
          "width:100%;min-height:64px;resize:vertical;background:var(--code-bg);border:1px solid var(--border-strong);border-radius:8px;padding:9px;color:var(--text);font:400 13px/1.5 var(--font-sans);outline:none;",
      }) as HTMLTextAreaElement;
      ta.value = c.body;
      ta.addEventListener("click", (e) => e.stopPropagation());
      setTimeout(() => ta.focus(), 0);
      bodyNode = ta;
      actionsNode = el("div", { class: "comment-actions" }, [
        el("button", {
          class: "btn-resolve",
          text: "Save",
          onClick: (e: Event) => {
            e.stopPropagation();
            saveEdit(c.id, ta.value);
          },
        }),
        el("button", {
          class: "btn-ghost",
          text: "Cancel",
          onClick: (e: Event) => {
            e.stopPropagation();
            cancelEdit();
          },
        }),
      ]);
    } else {
      bodyNode = el("div", { class: "comment-body", text: c.body });
      actionsNode = el("div", { class: "comment-actions" }, [
        el("button", {
          class: "btn-resolve",
          text: "Edit",
          onClick: (e: Event) => {
            e.stopPropagation();
            startEdit(c.id);
          },
        }),
        el("button", {
          class: "btn-resolve",
          text: resolved ? "Reopen" : "Resolve",
          onClick: (e: Event) => {
            e.stopPropagation();
            toggleResolve(c.id);
          },
        }),
        el("button", {
          class: "btn-delete",
          text: "Delete",
          onClick: (e: Event) => {
            e.stopPropagation();
            deleteComment(c.id);
          },
        }),
      ]);
    }
    const children: Child[] = [
      el("div", { class: "comment-top" }, [
        el("span", { class: "comment-section", text: c.section }),
        resolved ? el("span", { class: "comment-resolved-tag", text: "RESOLVED" }) : null,
        el("span", { class: "comment-num", text: "#" + idx }),
      ]),
      el("div", { class: "comment-quote", text: quoteShort }),
      bodyNode,
      actionsNode,
    ];
    const cls = "comment" + (resolved ? " resolved" : "") + (c.id === store.activeId ? " active" : "");
    list.append(el("div", { class: cls, onClick: editing ? null : () => jump(c.id) }, children));
  });

  emit("comments:changed");
}
