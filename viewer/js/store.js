// Shared mutable app state + a tiny event bus.
export const store = {
    slug: null,
    manifest: null,
    currentRev: 0,
    markdown: "",
    comments: [],
    filter: "all",
    activeId: null,
    tone: "detailed",
    compareBase: null,
    taskReorders: {},
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
