#!/usr/bin/env node
"use strict";

/**
 * visual-planner viewer server.
 *
 * Zero external dependencies — only Node built-ins. Serves the static viewer
 * (viewer/) and a small JSON API over the plans/ directory in the project root.
 *
 * Usage:
 *   node server/server.js [--plan <slug>] [--port <n>] [--root <dir>] [--no-open]
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const plans = require("./plans");
const { openBrowser } = require("./open-browser");

const PLUGIN_ROOT = path.resolve(__dirname, "..");
const VIEWER_DIR = path.join(PLUGIN_ROOT, "viewer");
const DEFAULT_PORT = 4517;
const MAX_PORT_TRIES = 20;

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const opts = { root: process.cwd(), port: DEFAULT_PORT, plan: null, open: true };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--plan") opts.plan = argv[++i] || null;
    else if (arg === "--port") opts.port = parseInt(argv[++i], 10) || DEFAULT_PORT;
    else if (arg === "--root") opts.root = path.resolve(argv[++i] || ".");
    else if (arg === "--no-open") opts.open = false;
    else if (arg === "--help" || arg === "-h") opts.help = true;
  }
  return opts;
}

// ---------------------------------------------------------------------------
// Static file serving
// ---------------------------------------------------------------------------

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
};

function serveStatic(reqPath, res) {
  // Map "/" to index.html; prevent path traversal out of VIEWER_DIR.
  const rel = reqPath === "/" ? "/index.html" : reqPath;
  const filePath = path.join(VIEWER_DIR, path.normalize(rel));
  if (!filePath.startsWith(VIEWER_DIR)) return sendError(res, 403, "Forbidden");

  fs.readFile(filePath, (err, data) => {
    if (err) return sendError(res, 404, "Not found");
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(data);
  });
}

// ---------------------------------------------------------------------------
// Response helpers
// ---------------------------------------------------------------------------

function sendJson(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(data);
}

function sendText(res, status, text) {
  res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(text);
}

function sendError(res, status, message) {
  sendJson(res, status, { error: message });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 5 * 1024 * 1024) reject(new Error("Body too large"));
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

// ---------------------------------------------------------------------------
// API routing
// ---------------------------------------------------------------------------

// Routes:
//   GET  /api/plans
//   GET  /api/plans/:slug
//   GET  /api/plans/:slug/rev/:n
//   GET  /api/plans/:slug/comments?rev=n
//   POST /api/plans/:slug/comments?rev=n
async function handleApi(req, res, url, root) {
  const parts = url.pathname.split("/").filter(Boolean); // ["api","plans",...]

  try {
    if (parts.length === 2) {
      // /api/plans
      return sendJson(res, 200, { plans: plans.listPlans(root) });
    }

    const slug = parts[2];

    if (parts.length === 3) {
      // /api/plans/:slug
      const manifest = plans.readManifest(root, slug);
      if (!manifest) return sendError(res, 404, "Plan not found");
      return sendJson(res, 200, manifest);
    }

    if (parts.length === 5 && parts[3] === "rev") {
      // /api/plans/:slug/rev/:n
      const md = plans.readRevision(root, slug, parts[4]);
      return sendText(res, 200, md);
    }

    if (parts.length === 4 && parts[3] === "comments") {
      const rev = url.searchParams.get("rev");
      if (req.method === "GET") {
        return sendJson(res, 200, { comments: plans.readComments(root, slug, rev) });
      }
      if (req.method === "POST") {
        const body = await readBody(req);
        const parsed = JSON.parse(body || "{}");
        const comments = Array.isArray(parsed) ? parsed : parsed.comments || [];
        const file = plans.writeComments(root, slug, rev, comments);
        return sendJson(res, 200, { ok: true, file: path.relative(root, file) });
      }
    }

    return sendError(res, 404, "Unknown API route");
  } catch (err) {
    return sendError(res, 400, err.message || "Request failed");
  }
}

// ---------------------------------------------------------------------------
// Server bootstrap
// ---------------------------------------------------------------------------

function createServer(root) {
  return http.createServer((req, res) => {
    const url = new URL(req.url, "http://localhost");
    if (url.pathname.startsWith("/api/")) {
      handleApi(req, res, url, root);
    } else {
      serveStatic(url.pathname, res);
    }
  });
}

function listenWithRetry(server, port, triesLeft, onListening) {
  server.once("error", (err) => {
    if (err.code === "EADDRINUSE" && triesLeft > 0) {
      listenWithRetry(server, port + 1, triesLeft - 1, onListening);
    } else {
      console.error(`[visual-planner] failed to start: ${err.message}`);
      process.exit(1);
    }
  });
  server.listen(port, "127.0.0.1", () => onListening(port));
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    console.log("Usage: visual-planner [--plan <slug>] [--port <n>] [--root <dir>] [--no-open]");
    return;
  }

  const server = createServer(opts.root);
  listenWithRetry(server, opts.port, MAX_PORT_TRIES, (port) => {
    const query = opts.plan ? `/?plan=${encodeURIComponent(opts.plan)}` : "/";
    const urlStr = `http://localhost:${port}${query}`;
    console.log(`[visual-planner] serving plans from ${path.join(opts.root, "plans")}`);
    console.log(`[visual-planner] open: ${urlStr}`);
    if (opts.open) openBrowser(urlStr);
  });
}

if (require.main === module) main();

module.exports = { createServer, parseArgs };
