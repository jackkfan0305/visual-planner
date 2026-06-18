// Shared mutable app state + a tiny event bus.

export interface Comment {
  id: string;
  section: string;
  quote: string;
  body: string;
  status: string;
}

export interface Revision {
  rev: number;
  file: string;
  summary?: string;
  createdAt?: string;
  addressedComments?: number;
}

export interface Manifest {
  slug: string;
  title: string;
  branch?: string;
  createdAt?: string;
  latest: number;
  revisions: Revision[];
}

export interface PlanSummary {
  slug: string;
  title: string;
  latest: number;
}

export interface Store {
  slug: string | null;
  manifest: Manifest | null;
  currentRev: number;
  markdown: string;
  comments: Comment[];
  filter: "all" | "open";
  activeId: string | null;
  tone: "detailed" | "concise";
  compareBase: number | null;
}

export const store: Store = {
  slug: null,
  manifest: null,
  currentRev: 0,
  markdown: "",
  comments: [],
  filter: "all",
  activeId: null,
  tone: "detailed",
  compareBase: null,
};

const bus = new EventTarget();

export function on(type: string, fn: (e: Event) => void): void {
  bus.addEventListener(type, fn);
}

export function emit(type: string, detail?: unknown): void {
  bus.dispatchEvent(new CustomEvent(type, { detail }));
}

/** Open (unresolved) comments only. */
export function openComments(): Comment[] {
  return store.comments.filter((c) => c.status !== "resolved");
}
