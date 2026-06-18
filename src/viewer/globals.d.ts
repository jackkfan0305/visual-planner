// Ambient types for the `marked` UMD global loaded via <script> in index.html.
// We only declare the subset of the token shape the renderer consumes.

export {};

declare global {
  interface MarkedListItem {
    text: string;
    task?: boolean;
    checked?: boolean;
  }

  interface MarkedTableCell {
    text: string;
  }

  interface MarkedToken {
    type: string;
    raw?: string;
    text?: string;
    depth?: number;
    lang?: string;
    ordered?: boolean;
    items?: MarkedListItem[];
    header?: MarkedTableCell[];
    rows?: MarkedTableCell[][];
  }

  interface MarkedStatic {
    lexer(src: string): MarkedToken[];
    parse(src: string): string;
    parseInline(src: string): string;
  }

  interface Window {
    marked: MarkedStatic;
  }
}
