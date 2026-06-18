"use strict";

/**
 * Plan store: all disk access for plans lives here.
 *
 * Layout (relative to the project root the server was launched in):
 *   plans/<slug>/plan.json
 *   plans/<slug>/rev-001.md
 *   plans/<slug>/rev-002.md
 *   plans/<slug>/rev-002.comments.json   (optional, written by the viewer)
 */

const fs = require("fs");
const path = require("path");

const PLANS_DIR_NAME = "plans";
const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;

/** Absolute path to the plans/ directory for a given project root. */
function plansDir(root) {
  return path.join(root, PLANS_DIR_NAME);
}

/** Validate a slug and return the absolute, contained plan directory. Throws on traversal. */
function planDir(root, slug) {
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
function revFileName(rev) {
  const n = Number(rev);
  if (!Number.isInteger(n) || n < 1 || n > 999) {
    throw new Error(`Invalid revision number: ${rev}`);
  }
  return `rev-${String(n).padStart(3, "0")}.md`;
}

/** Comments sidecar file name for a revision, e.g. 2 -> "rev-002.comments.json". */
function commentsFileName(rev) {
  return revFileName(rev).replace(/\.md$/, ".comments.json");
}

function readJsonSafe(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

/** List every plan that has a plan.json manifest. */
function listPlans(root) {
  const base = plansDir(root);
  let entries;
  try {
    entries = fs.readdirSync(base, { withFileTypes: true });
  } catch {
    return [];
  }
  const plans = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || !SLUG_RE.test(entry.name)) continue;
    const manifest = readManifest(root, entry.name);
    if (manifest) {
      plans.push({
        slug: manifest.slug || entry.name,
        title: manifest.title || entry.name,
        latest: manifest.latest || (manifest.revisions || []).length || 1,
      });
    }
  }
  plans.sort((a, b) => a.slug.localeCompare(b.slug));
  return plans;
}

/** Read a plan's manifest, or null if missing/unparseable. */
function readManifest(root, slug) {
  const dir = planDir(root, slug);
  const manifest = readJsonSafe(path.join(dir, "plan.json"), null);
  if (!manifest) return null;
  if (!Array.isArray(manifest.revisions)) manifest.revisions = [];
  if (!manifest.latest) {
    manifest.latest = manifest.revisions.reduce((m, r) => Math.max(m, r.rev || 0), 0) || 1;
  }
  return manifest;
}

/** Read the raw markdown for a revision. Throws if the file is missing. */
function readRevision(root, slug, rev) {
  const dir = planDir(root, slug);
  const file = path.join(dir, revFileName(rev));
  return fs.readFileSync(file, "utf8");
}

/** Read the comments sidecar for a revision (or [] if none). */
function readComments(root, slug, rev) {
  const dir = planDir(root, slug);
  return readJsonSafe(path.join(dir, commentsFileName(rev)), []);
}

/** Write the comments sidecar for a revision. `comments` must be an array. */
function writeComments(root, slug, rev, comments) {
  if (!Array.isArray(comments)) throw new Error("comments must be an array");
  const dir = planDir(root, slug);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, commentsFileName(rev));
  fs.writeFileSync(file, JSON.stringify(comments, null, 2) + "\n", "utf8");
  return file;
}

module.exports = {
  PLANS_DIR_NAME,
  SLUG_RE,
  plansDir,
  planDir,
  revFileName,
  commentsFileName,
  listPlans,
  readManifest,
  readRevision,
  readComments,
  writeComments,
};
