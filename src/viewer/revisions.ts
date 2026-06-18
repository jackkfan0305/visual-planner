// Revision dropdown menu + compare toggle. The pill in the header opens this.

import { el } from "./dom.js";
import { store } from "./store.js";

export interface RevisionRefs {
  revPill: HTMLElement;
  overlayRoot: HTMLElement;
}

export interface RevisionCallbacks {
  onSelect: (rev: number) => void;
  onCompare: (fromRev: number, toRev: number) => void;
}

let menuEl: HTMLElement | null = null;
let cbs: RevisionCallbacks;

export function initRevisions(refs: RevisionRefs, callbacks: RevisionCallbacks): void {
  cbs = callbacks;
  refs.revPill.addEventListener("click", (e) => {
    e.stopPropagation();
    if (menuEl) closeMenu();
    else openMenu(refs.overlayRoot);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });
}

export function updatePill(label: string): void {
  const node = document.getElementById("rev-pill-label");
  if (node) node.textContent = label;
}

function openMenu(overlayRoot: HTMLElement): void {
  const manifest = store.manifest;
  if (!manifest) return;
  const revs = manifest.revisions.slice().sort((a, b) => b.rev - a.rev);

  const list = el("div", { class: "rev-list" });
  revs.forEach((r) => {
    const isCurrent = r.rev === store.currentRev;
    const suffix = isCurrent ? " · current" : r.rev === 1 ? " · initial plan" : "";
    list.append(
      el("button", { class: "rev-item" + (isCurrent ? " current" : ""), type: "button", onClick: () => select(r.rev) }, [
        el("span", { class: "dot", text: isCurrent ? "●" : "○" }),
        el("div", {}, [
          el("div", { class: "name", text: `rev ${r.rev}${suffix}` }),
          r.summary ? el("div", { class: "desc", text: r.summary }) : null,
        ]),
      ])
    );
  });

  const canCompare = store.currentRev > 1;
  const comparing = store.compareBase != null;
  const compareBtn = el("button", {
    class: "rev-compare-btn" + (comparing ? " on" : ""),
    type: "button",
    text: comparing ? "Comparing…" : "Compare with previous",
    onClick: () => {
      if (comparing) cbs.onSelect(store.currentRev);
      else cbs.onCompare(store.currentRev - 1, store.currentRev);
      closeMenu();
    },
  }) as HTMLButtonElement;
  compareBtn.disabled = !canCompare;

  const menu = el("div", { class: "rev-menu", "data-cc-ui": "", onClick: (e: Event) => e.stopPropagation() }, [
    el("div", { class: "rev-menu-hdr", text: "REVISION HISTORY" }),
    list,
    el("div", { class: "rev-menu-foot" }, [
      compareBtn,
      el("span", { class: "hint", text: "Each revision is produced by Claude Code from your feedback." }),
    ]),
  ]);

  const overlay = el("div", { class: "rev-overlay", "data-cc-ui": "", onClick: closeMenu });
  menuEl = el("div", {}, [overlay, menu]);
  overlayRoot.append(menuEl);
}

function select(rev: number): void {
  closeMenu();
  if (rev !== store.currentRev || store.compareBase != null) cbs.onSelect(rev);
}

function closeMenu(): void {
  if (menuEl) menuEl.remove();
  menuEl = null;
}
