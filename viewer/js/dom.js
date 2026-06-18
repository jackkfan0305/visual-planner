// Tiny DOM helpers — no framework.
/** Create an element with attrs/props and children. */
export function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
        if (v == null || v === false)
            continue;
        if (k === "class")
            node.className = String(v);
        else if (k === "html")
            node.innerHTML = String(v);
        else if (k === "text")
            node.textContent = String(v);
        else if (k === "dataset")
            Object.assign(node.dataset, v);
        else if (k.startsWith("on") && typeof v === "function") {
            node.addEventListener(k.slice(2).toLowerCase(), v);
        }
        else
            node.setAttribute(k, String(v));
    }
    const kids = Array.isArray(children) ? children : [children];
    for (const c of kids) {
        if (c == null || c === false)
            continue;
        node.append(c instanceof Node ? c : document.createTextNode(String(c)));
    }
    return node;
}
/** Escape HTML special characters for safe text interpolation. */
export function escapeHtml(s) {
    const map = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
    };
    return String(s).replace(/[&<>"']/g, (c) => map[c] ?? c);
}
export function $(sel, root = document) {
    return root.querySelector(sel);
}
export function $$(sel, root = document) {
    return Array.from(root.querySelectorAll(sel));
}
/** Remove all children of a node. */
export function clear(node) {
    while (node.firstChild)
        node.removeChild(node.firstChild);
}
