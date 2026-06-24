"use strict";
/**
 * Plan store: all disk access for plans lives here.
 *
 * Layout (relative to the project root the server was launched in):
 *   .plans/<slug>/plan.json
 *   .plans/<slug>/rev-001.md
 *   .plans/<slug>/rev-002.md
 *   .plans/<slug>/rev-002.comments.json   (optional, written by the viewer)
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SLUG_RE = exports.PLANS_DIR_NAME = void 0;
exports.plansDir = plansDir;
exports.planDir = planDir;
exports.revFileName = revFileName;
exports.commentsFileName = commentsFileName;
exports.readManifest = readManifest;
exports.listPlans = listPlans;
exports.readRevision = readRevision;
exports.readComments = readComments;
exports.writeComments = writeComments;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// Dot-prefixed so it reads as tooling state (like `.claude`) and is easy to
// gitignore. Plans live under the *current project root* (process.cwd()), so a
// git worktree naturally gets its own `.plans/` separate from the main checkout.
exports.PLANS_DIR_NAME = ".plans";
exports.SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;
/** Absolute path to the .plans/ directory for a given project root. */
function plansDir(root) {
    return path.join(root, exports.PLANS_DIR_NAME);
}
/** Validate a slug and return the absolute, contained plan directory. Throws on traversal. */
function planDir(root, slug) {
    if (typeof slug !== "string" || !exports.SLUG_RE.test(slug)) {
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
    }
    catch {
        return fallback;
    }
}
/** Read a plan's manifest, or null if missing/unparseable. */
function readManifest(root, slug) {
    const dir = planDir(root, slug);
    const manifest = readJsonSafe(path.join(dir, "plan.json"), null);
    if (!manifest)
        return null;
    if (!Array.isArray(manifest.revisions))
        manifest.revisions = [];
    if (!manifest.latest) {
        manifest.latest =
            manifest.revisions.reduce((m, r) => Math.max(m, r.rev || 0), 0) || 1;
    }
    return manifest;
}
/** List every plan that has a plan.json manifest. */
function listPlans(root) {
    const base = plansDir(root);
    let entries;
    try {
        entries = fs.readdirSync(base, { withFileTypes: true });
    }
    catch {
        return [];
    }
    const plans = [];
    for (const entry of entries) {
        if (!entry.isDirectory() || !exports.SLUG_RE.test(entry.name))
            continue;
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
function readRevision(root, slug, rev) {
    const dir = planDir(root, slug);
    return fs.readFileSync(path.join(dir, revFileName(rev)), "utf8");
}
/** Read the comments sidecar for a revision (or [] if none). */
function readComments(root, slug, rev) {
    const dir = planDir(root, slug);
    return readJsonSafe(path.join(dir, commentsFileName(rev)), []);
}
/** Write the comments sidecar for a revision. */
function writeComments(root, slug, rev, comments) {
    if (!Array.isArray(comments))
        throw new Error("comments must be an array");
    const dir = planDir(root, slug);
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, commentsFileName(rev));
    fs.writeFileSync(file, JSON.stringify(comments, null, 2) + "\n", "utf8");
    return file;
}
