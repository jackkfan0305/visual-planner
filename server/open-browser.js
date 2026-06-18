"use strict";

/** Open a URL in the OS default browser. Best-effort; never throws. */
const { spawn } = require("child_process");

function openBrowser(url) {
  const platform = process.platform;
  let command;
  let args;

  if (platform === "darwin") {
    command = "open";
    args = [url];
  } else if (platform === "win32") {
    command = "cmd";
    args = ["/c", "start", "", url];
  } else {
    command = "xdg-open";
    args = [url];
  }

  try {
    const child = spawn(command, args, { stdio: "ignore", detached: true });
    child.on("error", () => {
      /* browser launch is best-effort; the URL is printed regardless */
    });
    child.unref();
  } catch {
    /* ignore — caller prints the URL */
  }
}

module.exports = { openBrowser };
