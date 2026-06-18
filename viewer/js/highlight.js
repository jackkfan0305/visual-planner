// Minimal, safe single-pass syntax highlighter for code blocks.
// Tokenizes in one pass so keywords inside strings/comments are never mis-colored.
import { escapeHtml } from "./dom.js";
const KEYWORDS = new Set([
    "import", "from", "export", "const", "let", "var", "function", "return",
    "class", "new", "await", "async", "if", "else", "for", "while", "switch",
    "case", "break", "continue", "type", "interface", "extends", "implements",
    "public", "private", "protected", "static", "true", "false", "null",
    "undefined", "this", "default", "throw", "try", "catch", "finally",
]);
const TOKEN_RE = /(\/\/[^\n]*|#[^\n]*|\/\*[\s\S]*?\*\/)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)/g;
export function highlight(code) {
    let out = "";
    let last = 0;
    let m;
    TOKEN_RE.lastIndex = 0;
    while ((m = TOKEN_RE.exec(code))) {
        if (m.index > last)
            out += escapeHtml(code.slice(last, m.index));
        const full = m[0];
        const comment = m[1];
        const str = m[2];
        const num = m[3];
        const ident = m[4];
        if (comment)
            out += `<span class="tok-com">${escapeHtml(comment)}</span>`;
        else if (str)
            out += `<span class="tok-str">${escapeHtml(str)}</span>`;
        else if (num)
            out += `<span class="tok-num">${escapeHtml(num)}</span>`;
        else if (ident) {
            const after = code.slice(m.index + full.length);
            if (KEYWORDS.has(ident))
                out += `<span class="tok-kw">${escapeHtml(ident)}</span>`;
            else if (/^\s*\(/.test(after))
                out += `<span class="tok-fn">${escapeHtml(ident)}</span>`;
            else
                out += escapeHtml(ident);
        }
        else
            out += escapeHtml(full);
        last = m.index + full.length;
    }
    if (last < code.length)
        out += escapeHtml(code.slice(last));
    return out;
}
