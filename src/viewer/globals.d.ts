// Ambient types for the `marked` UMD global loaded via <script> in index.html.
// We use marked's own published types (type-only import, fully erased at compile
// time — no runtime dependency is added) and only expose the synchronous subset
// of the API the viewer actually calls.

import type { TokensList } from "marked";

declare global {
  interface Window {
    marked: {
      lexer(src: string): TokensList;
      parse(src: string): string;
      parseInline(src: string): string;
    };
  }
}

export {};
