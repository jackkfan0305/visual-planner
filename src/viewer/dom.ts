// Tiny DOM helpers — no framework.

export type Child = Node | string | number | false | null | undefined;

export type AttrValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | EventListener
  | Record<string, string>;

export interface Attrs {
  [key: string]: AttrValue;
}

/** Create an element with attrs/props and children. */
export function el(tag: string, attrs: Attrs = {}, children: Child | Child[] = []): HTMLElement {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === "class") node.className = String(v);
    else if (k === "html") node.innerHTML = String(v);
    else if (k === "text") node.textContent = String(v);
    else if (k === "dataset") Object.assign(node.dataset, v as Record<string, string>);
    else if (k.startsWith("on") && typeof v === "function") {
      node.addEventListener(k.slice(2).toLowerCase(), v as EventListener);
    } else node.setAttribute(k, String(v));
  }
  const kids = Array.isArray(children) ? children : [children];
  for (const c of kids) {
    if (c == null || c === false) continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
}

/** Escape HTML special characters for safe text interpolation. */
export function escapeHtml(s: string | number): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return String(s).replace(/[&<>"']/g, (c) => map[c] ?? c);
}

export function $<T extends Element = Element>(sel: string, root: ParentNode = document): T | null {
  return root.querySelector<T>(sel);
}

export function $$<T extends Element = Element>(sel: string, root: ParentNode = document): T[] {
  return Array.from(root.querySelectorAll<T>(sel));
}

/** Remove all children of a node. */
export function clear(node: Node): void {
  while (node.firstChild) node.removeChild(node.firstChild);
}
