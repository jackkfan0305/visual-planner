"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.openBrowser = openBrowser;
const child_process_1 = require("child_process");
/** Open a URL in the OS default browser. Best-effort; never throws. */
function openBrowser(url) {
    const platform = process.platform;
    let command;
    let args;
    if (platform === "darwin") {
        command = "open";
        args = [url];
    }
    else if (platform === "win32") {
        command = "cmd";
        args = ["/c", "start", "", url];
    }
    else {
        command = "xdg-open";
        args = [url];
    }
    try {
        const child = (0, child_process_1.spawn)(command, args, { stdio: "ignore", detached: true });
        child.on("error", () => {
            /* browser launch is best-effort; the URL is printed regardless */
        });
        child.unref();
    }
    catch {
        /* ignore — caller prints the URL */
    }
}
