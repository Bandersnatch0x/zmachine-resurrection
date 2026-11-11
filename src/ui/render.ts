export type LineKind = "output" | "command" | "system" | "error" | "notice" | "meta";

export interface Line {
  readonly kind: LineKind;
  readonly text: string;
}

export function commandLine(input: string): Line {
  return { kind: "command", text: `> ${input}` };
}

export function systemLine(text: string): Line {
  return { kind: "system", text };
}

export function outputLine(text: string): Line {
  return { kind: "output", text };
}

export function errorLine(text: string): Line {
  return { kind: "error", text };
}

export function noticeLine(text: string): Line {
  return { kind: "notice", text };
}

export function metaLine(text: string): Line {
  return { kind: "meta", text };
}

export function statusText(room: string, moves: number, source: string): string {
  return `state: ${room} · moves: ${moves} · input: ${source}`;
}

export function renderTranscript(lines: readonly Line[], limit: number): readonly Line[] {
  return lines.length <= limit ? lines : lines.slice(lines.length - limit);
}
