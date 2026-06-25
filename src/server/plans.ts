/**
 * Plan store: all disk access for plans lives here.
 *
 * Layout (relative to the project root the server was launched in):
 *   .plans/<slug>/plan.json
 *   .plans/<slug>/rev-001.md
 *   .plans/<slug>/rev-002.md
 *   .plans/<slug>/rev-002.comments.json   (optional, written by the viewer)
 */

import * as fs from "fs";
import * as path from "path";

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

export interface Comment {
  id: string;
  section: string;
  quote: string;
  body: string;
  status: string;
}

export interface PlanSummary {
  slug: string;
  title: string;
  latest: number;
}

// Dot-prefixed so it reads as tooling state (like `.claude`) and can be ignored
// via Git's local exclude file. Plans live under the *current project root*
// (process.cwd()), so a git worktree naturally gets its own `.plans/`.
export const PLANS_DIR_NAME = ".plans";
export const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;

/** Absolute path to the .plans/ directory for a given project root. */
export function plansDir(root: string): string {
  return path.join(root, PLANS_DIR_NAME);
}

/** Validate a slug and return the absolute, contained plan directory. Throws on traversal. */
export function planDir(root: string, slug: string): string {
  if (typeof slug !== "string" || !SLUG_RE.test(slug)) {
    throw new Error(`Invalid plan slug: ${slug}`);
  }
  const base = plansDir(root);
  const dir = path.resolve(base, slug);
  if (dir !== path.join(base, slug)) {
    throw new Error(`Path traversal rejected for slug: ${slug}`);
  }
  return dir;
}

/** Zero-padded revision file name, e.g. 2 -> "rev-002.md". */
export function revFileName(rev: number | string): string {
  const n = Number(rev);
  if (!Number.isInteger(n) || n < 1 || n > 999) {
    throw new Error(`Invalid revision number: ${rev}`);
  }
  return `rev-${String(n).padStart(3, "0")}.md`;
}

/** Comments sidecar file name for a revision, e.g. 2 -> "rev-002.comments.json". */
export function commentsFileName(rev: number | string): string {
  return revFileName(rev).replace(/\.md$/, ".comments.json");
}

function readJsonSafe<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as T;
  } catch {
    return fallback;
  }
}

/** Read a plan's manifest, or null if missing/unparseable. */
export function readManifest(root: string, slug: string): Manifest | null {
  const dir = planDir(root, slug);
  const manifest = readJsonSafe<Manifest | null>(path.join(dir, "plan.json"), null);
  if (!manifest) return null;
  if (!Array.isArray(manifest.revisions)) manifest.revisions = [];
  if (!manifest.latest) {
    manifest.latest =
      manifest.revisions.reduce((m, r) => Math.max(m, r.rev || 0), 0) || 1;
  }
  return manifest;
}

/** List every plan that has a plan.json manifest. */
export function listPlans(root: string): PlanSummary[] {
  const base = plansDir(root);
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(base, { withFileTypes: true });
  } catch {
    return [];
  }
  const plans: PlanSummary[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || !SLUG_RE.test(entry.name)) continue;
    const manifest = readManifest(root, entry.name);
    if (manifest) {
      plans.push({
        slug: manifest.slug || entry.name,
        title: manifest.title || entry.name,
        latest: manifest.latest || manifest.revisions.length || 1,
      });
    }
  }
  plans.sort((a, b) => a.slug.localeCompare(b.slug));
  return plans;
}

/** Read the raw markdown for a revision. Throws if the file is missing. */
export function readRevision(root: string, slug: string, rev: number | string): string {
  const dir = planDir(root, slug);
  return fs.readFileSync(path.join(dir, revFileName(rev)), "utf8");
}

/** Read the comments sidecar for a revision (or [] if none). */
export function readComments(root: string, slug: string, rev: number | string): Comment[] {
  const dir = planDir(root, slug);
  return readJsonSafe<Comment[]>(path.join(dir, commentsFileName(rev)), []);
}

/** Write the comments sidecar for a revision. */
export function writeComments(
  root: string,
  slug: string,
  rev: number | string,
  comments: Comment[]
): string {
  if (!Array.isArray(comments)) throw new Error("comments must be an array");
  const dir = planDir(root, slug);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, commentsFileName(rev));
  fs.writeFileSync(file, JSON.stringify(comments, null, 2) + "\n", "utf8");
  return file;
}
