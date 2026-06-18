// Render a plan markdown string into the design's card layout.
// Each top-level `## ` heading becomes a section card; the body primitives
// (callouts, flow steps, file trees, code blocks, tables, tasks) are mapped to
// the styled components from Plan Review.dc.html.

import { el, escapeHtml, clear } from "./dom.js";
import { highlight } from "./highlight.js";

const marked = window.marked;

const inline = (text) => marked.parseInline(text || "");

// Map a section title to its right-aligned category label.
function labelFor(title) {
  const t = title.toLowerCase();
  if (t.includes("overview") || t.includes("what we")) return "OVERVIEW";
  if (t.includes("approach")) return "APPROACH";
  if (t.includes("architecture") || t.includes("flow")) return "ARCHITECTURE";
  if (t.includes("file")) return "FILES";
  if (t.includes("implement") || t.includes("wiring") || t.includes("code")) return "IMPLEMENTATION";
  if (t.includes("security") || t.includes("token") || t.includes("auth")) return "SECURITY";
  if (t.includes("tradeoff") || t.includes("trade-off") || t.includes("decision")) return "TRADEOFFS";
  if (t.includes("task") || t.includes("step") || t.includes("ship")) return "TASKS";
  if (t.includes("test") || t.includes("verif")) return "VERIFICATION";
  return "SECTION";
}

// "01 — Overview" -> { num: "01", title: "Overview" }
function splitHeading(text, fallbackIndex) {
  const m = text.match(/^\s*(\d{1,2})\s*[—\-–.:]\s*(.+)$/);
  if (m) return { num: m[1].padStart(2, "0"), title: m[2].trim() };
  return { num: String(fallbackIndex).padStart(2, "0"), title: text.trim() };
}

function isAlert(blockquote) {
  const text = blockquote.text || "";
  const m = text.match(/^\s*\[!(\w+)\]\s*([^\n]*)\n?([\s\S]*)$/);
  if (!m) return null;
  const kind = m[1].toUpperCase();
  const cls = kind === "WARN" || kind === "WARNING" || kind === "CAUTION" || kind === "IMPORTANT" ? "warn" : "note";
  return { cls, title: m[2].trim(), body: m[3].trim() };
}

function renderCallout(alert) {
  return el("div", { class: `callout ${alert.cls}` }, [
    el("span", { class: "ico", text: alert.cls === "warn" ? "!" : "i" }),
    el("div", {}, [
      alert.title && el("div", { class: "ttl", html: inline(alert.title) }),
      el("div", { class: "txt", html: inline(alert.body) }),
    ]),
  ]);
}

function renderFlow(listToken) {
  const flow = el("div", { class: "flow" });
  listToken.items.forEach((item) => {
    const raw = item.text || "";
    const m = raw.match(/^\*\*(.+?)\*\*\s*[—\-–:]?\s*([\s\S]*)$/);
    const title = m ? m[1] : raw;
    const rest = m ? m[2] : "";
    flow.append(
      el("div", { class: "flow-step" }, [
        el("div", { class: "flow-rail" }, [
          el("div", { class: "flow-num" }),
          el("div", { class: "flow-line" }),
        ]),
        el("div", { class: "flow-content" }, [
          el("div", { class: "ttl", html: inline(title) }),
          rest && el("div", { class: "txt", html: inline(rest) }),
        ]),
      ])
    );
  });
  // number the circles
  flow.querySelectorAll(".flow-num").forEach((n, i) => (n.textContent = i + 1));
  return flow;
}

function renderTree(code) {
  const lines = code.split("\n");
  const html = lines
    .map((line) => {
      const parts = line.split(/\s{2,}/);
      let left = parts[0] || "";
      const anno = parts.slice(1).join(" ").trim();
      // bold the trailing path token in the left side
      left = escapeHtml(left).replace(/([\w.\-/]+\/?)(\s*)$/, '<span class="t-name">$1</span>$2');
      let annoHtml = "";
      if (anno) {
        let cls = "t-same";
        if (anno.startsWith("+")) cls = "t-new";
        else if (anno.startsWith("~")) cls = "t-mod";
        annoHtml = `          <span class="${cls}">${escapeHtml(anno)}</span>`;
      }
      return left + annoHtml;
    })
    .join("\n");
  return el("pre", { class: "tree", html });
}

function renderCode(token) {
  const info = (token.lang || "").trim();
  const sp = info.indexOf(" ");
  const lang = sp === -1 ? info : info.slice(0, sp);
  const file = sp === -1 ? "" : info.slice(sp + 1).trim();

  if (lang === "tree") return renderTree(token.text);

  const block = el("div", { class: "code-block" });
  if (file || lang) {
    block.append(
      el("div", { class: "code-head" }, [
        el("span", { class: "code-file", text: file || lang }),
        lang && file && el("span", { class: "code-lang", text: lang }),
      ])
    );
  }
  block.append(el("pre", {}, [el("code", { html: highlight(token.text) })]));
  return block;
}

function renderTable(token) {
  const wrap = el("div", { class: "card-table-wrap" });
  const table = el("table", { class: "card-table" });
  const thead = el("thead");
  const htr = el("tr");
  token.header.forEach((cell) => htr.append(el("th", { html: inline(cell.text) })));
  thead.append(htr);
  const tbody = el("tbody");
  token.rows.forEach((row) => {
    const tr = el("tr");
    row.forEach((cell, i) => {
      let text = cell.text;
      let chip = false;
      if (i === 0 && /\(chosen\)|\*\*chosen\*\*/i.test(text)) {
        chip = true;
        text = text.replace(/\s*\(chosen\)\s*/i, "").replace(/\s*\*\*chosen\*\*\s*/i, "").trim();
      }
      const td = el("td", { html: inline(text) });
      if (chip) td.append(el("span", { class: "chosen-chip", text: "Chosen" }));
      tr.append(td);
    });
    tbody.append(tr);
  });
  table.append(thead, tbody);
  wrap.append(table);
  return wrap;
}

function renderTasks(listToken) {
  const ul = el("ul", { class: "tasks" });
  listToken.items.forEach((item) => {
    let text = item.text || "";
    let time = "";
    const tm = text.match(/`?(~?\s*\d+\s*(?:m|min|h|hr|hrs)?)`?\s*$/i);
    if (tm && /[\dmh]/i.test(tm[1])) {
      time = tm[1].replace(/`/g, "").trim();
      text = text.slice(0, tm.index).trim();
    }
    const label = el("label", { class: "task" }, [
      el("input", { type: "checkbox", class: "cc-task" }),
      el("span", { class: "task-text", html: inline(text) }),
      time && el("span", { class: "task-time", text: time }),
    ]);
    if (listToken.items.length && item.checked) label.querySelector("input").checked = true;
    ul.append(label);
  });
  return ul;
}

function renderBodyToken(token, sectionLabel) {
  switch (token.type) {
    case "paragraph":
      return el("p", { html: inline(token.text) });
    case "blockquote": {
      const alert = isAlert(token);
      if (alert) return renderCallout(alert);
      return el("blockquote", { html: marked.parse(token.text) });
    }
    case "code":
      return renderCode(token);
    case "table":
      return renderTable(token);
    case "list": {
      if (token.items.some((it) => it.task)) return renderTasks(token);
      if (sectionLabel === "ARCHITECTURE" && token.ordered) return renderFlow(token);
      const ulol = el(token.ordered ? "ol" : "ul");
      token.items.forEach((it) => ulol.append(el("li", { html: inline(it.text) })));
      return ulol;
    }
    case "space":
      return null;
    case "html":
      return null; // ignore raw HTML / comments
    default:
      return el("div", { html: marked.parse(token.raw || "") });
  }
}

/** Detect a meta blockquote like "repo `x` · complexity `Medium` · ...". */
function renderMeta(token) {
  if (token.type !== "blockquote") return null;
  const text = (token.text || "").trim();
  if (!text.includes("·") && !/`/.test(text)) return null;
  if (/^\[!/.test(text)) return null;
  const chips = text.split("·").map((part) => {
    const m = part.trim().match(/^([\w\s]+?)\s*`?([^`]+)`?$/);
    const label = m ? m[1].trim() : "";
    const value = m ? m[2].trim() : part.trim();
    return el("span", { class: "chip" }, [label && el("b", { text: label }), value]);
  });
  return el("div", { class: "plan-meta" }, chips);
}

/**
 * Render markdown into `container`. Returns nothing.
 */
export function renderPlan(container, markdown) {
  clear(container);
  const tokens = marked.lexer(markdown || "");

  const frag = document.createDocumentFragment();
  frag.append(el("div", { class: "plan-eyebrow", text: "IMPLEMENTATION PLAN" }));

  let i = 0;
  // Title (first H1)
  while (i < tokens.length && !(tokens[i].type === "heading" && tokens[i].depth === 1)) i++;
  if (i < tokens.length) {
    frag.append(el("h1", { class: "plan-title", html: inline(tokens[i].text) }));
    i++;
  }

  // Optional meta + lede before first H2
  while (i < tokens.length && !(tokens[i].type === "heading" && tokens[i].depth === 2)) {
    const t = tokens[i];
    const meta = renderMeta(t);
    if (meta) frag.append(meta);
    else if (t.type === "paragraph") {
      frag.append(el("div", { class: "draft-notice" }, [
        el("span", { class: "ico", text: "i" }),
        el("div", {}, [el("div", { class: "txt", html: inline(t.text) })]),
      ]));
    }
    i++;
  }

  // Section cards
  const sections = el("div", { class: "sections" });
  let cardIndex = 0;
  while (i < tokens.length) {
    const head = tokens[i];
    if (head.type === "heading" && head.depth === 2) {
      cardIndex++;
      const { num, title } = splitHeading(head.text, cardIndex);
      const label = labelFor(title);
      const body = el("div", { class: "card-body" });
      i++;
      while (i < tokens.length && !(tokens[i].type === "heading" && tokens[i].depth === 2)) {
        const node = renderBodyToken(tokens[i], label);
        if (node) body.append(node);
        i++;
      }
      const card = el("section", { class: "card", dataset: { section: title } }, [
        el("div", { class: "card-head" }, [
          el("span", { class: "card-num", text: num }),
          el("h2", { class: "card-title", html: inline(title) }),
          el("span", { class: "card-label", text: label }),
        ]),
        body,
      ]);
      sections.append(card);
    } else {
      i++;
    }
  }
  frag.append(sections);
  container.append(frag);
}
