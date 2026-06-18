// Shared mutable app state + a tiny event bus.

export const store = {
  slug: null,
  manifest: null, // { slug, title, latest, revisions: [...] }
  currentRev: null, // number currently displayed
  markdown: "", // markdown of currentRev
  comments: [], // [{ id, section, quote, body, status }]
  filter: "all", // "all" | "open"
  activeId: null, // highlighted comment id
  tone: "detailed", // "detailed" | "concise"
  compareBase: null, // rev number to diff against, or null when not comparing
};

const bus = new EventTarget();

export function on(type, fn) {
  bus.addEventListener(type, fn);
}

export function emit(type, detail) {
  bus.dispatchEvent(new CustomEvent(type, { detail }));
}

/** Open (unresolved) comments only. */
export function openComments() {
  return store.comments.filter((c) => c.status !== "resolved");
}
