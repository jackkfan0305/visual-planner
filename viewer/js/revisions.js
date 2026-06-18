// Revision dropdown menu + compare toggle. The pill in the header opens this.

import { el } from "./dom.js";
import { store } from "./store.js";

let menuEl = null;
let cbs = {};

export function initRevisions(elements, callbacks) {
  cbs = callbacks; // { onSelect(rev), onCompare(fromRev, toRev) }
  elements.revPill.addEventListener("click", (e) => {
    e.stopPropagation();
    if (menuEl) closeMenu();
    else openMenu(elements.overlayRoot);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });
}

export function updatePill(label) {
  const node = document.getElementById("rev-pill-label");
  if (node) node.textContent = label;
}

function openMenu(overlayRoot) {
  const manifest = store.manifest;
  if (!manifest) return;
  const revs = manifest.revisions.slice().sort((a, b) => b.rev - a.rev);

  const list = el("div", { class: "rev-list" });
  revs.forEach((r) => {
    const isCurrent = r.rev === store.currentRev;
    list.append(
      el("button", { class: "rev-item" + (isCurrent ? " current" : ""), type: "button", onClick: () => select(r.rev) }, [
        el("span", { class: "dot", text: isCurrent ? "●" : "○" }),
        el("div", {}, [
          el("div", { class: "name", text: `rev ${r.rev}${isCurrent ? " · current" : r.rev === 1 ? " · initial plan" : ""}` }),
          r.summary && el("div", { class: "desc", text: r.summary }),
        ]),
      ])
    );
  });

  const canCompare = store.currentRev > 1;
  const compareBtn = el("button", {
    class: "rev-compare-btn" + (store.compareBase != null ? " on" : ""),
    type: "button",
    text: store.compareBase != null ? "Comparing…" : "Compare with previous",
    disabled: canCompare ? null : "true",
    onClick: () => {
      if (store.compareBase != null) {
        cbs.onSelect(store.currentRev); // exit diff
      } else {
        const base = store.currentRev - 1;
        cbs.onCompare(base, store.currentRev);
      }
      closeMenu();
    },
  });

  const menu = el("div", { class: "rev-menu", "data-cc-ui": "", onClick: (e) => e.stopPropagation() }, [
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

function select(rev) {
  closeMenu();
  if (rev !== store.currentRev || store.compareBase != null) cbs.onSelect(rev);
}

function closeMenu() {
  if (menuEl) menuEl.remove();
  menuEl = null;
}
