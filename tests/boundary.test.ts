import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

const SKIP_DIRECTORIES = new Set([
  "node_modules",
  "dist",
  "coverage",
  ".git",
  ".audit",
  ".agent",
  ".agents",
  ".orchestration",
  ".playwright-cli",
]);

function walk(directory: string): readonly string[] {
  const entries = readdirSync(directory);
  const files: string[] = [];
  for (const entry of entries) {
    if (SKIP_DIRECTORIES.has(entry)) {
      continue;
    }
    const full = join(directory, entry);
    if (statSync(full).isDirectory()) {
      files.push(...walk(full));
    } else if (full.endsWith(".ts")) {
      files.push(full);
    }
  }
  return files;
}

function sourceFiles(directory: string): readonly { path: string; text: string }[] {
  return walk(join(ROOT, directory)).map((path) => ({
    path: relative(ROOT, path).split(sep).join("/"),
    text: readFileSync(path, "utf8"),
  }));
}

const SRC = sourceFiles("src");
const ZMACHINE = SRC.filter((file) => file.path.startsWith("src/zmachine/"));
const UI = SRC.filter((file) => file.path.startsWith("src/ui/") || file.path === "src/main.ts");

function offenders(
  files: readonly { path: string; text: string }[],
  pattern: RegExp,
): readonly string[] {
  return files
    .filter((file) => pattern.test(file.text))
    .map((file) => file.path);
}

describe("purity of the interpreter core", () => {
  it("keeps the deterministic core free of ambient effects", () => {
    const forbidden =
      /\b(?:Date|Math\.random|fetch|window|document|localStorage|performance\.now|setTimeout|setInterval|process\.env)\b/;
    expect(offenders(ZMACHINE, forbidden)).toEqual([]);
  });

  it("keeps the interpreter free of natural language and model output", () => {
    const forbidden = /\b(?:narration|claim|prompt|completion|LLM)\b/i;
    expect(offenders(ZMACHINE, forbidden)).toEqual([]);
  });
});

describe("secret confinement", () => {
  it("never puts a key or an Authorization header in client code", () => {
    const forbidden = /LLM_API_KEY|\bsk-[A-Za-z0-9]|Authorization/i;
    expect(offenders(SRC, forbidden)).toEqual([]);
  });

  it("keeps the key reading inside the dev server and the handler", () => {
    const allowed = new Set(["api/interpret.ts", "api/provider.ts", "vite.api-plugin.ts"]);
    const offendersWithKey = sourceFiles("api")
      .concat(
        walk(ROOT)
          .filter((path) => path.endsWith("vite.api-plugin.ts"))
          .map((path) => ({ path: relative(ROOT, path).split(sep).join("/"), text: readFileSync(path, "utf8") })),
      )
      .filter((file) => /LLM_API_KEY|Authorization/.test(file.text))
      .map((file) => file.path);
    for (const path of offendersWithKey) {
      expect(allowed.has(path)).toBe(true);
    }
  });
});

describe("state authority boundary", () => {
  it("keeps UI code off the mutable world types and the machine", () => {
    const forbidden =
      /\b(?:WorldState|INITIAL_STATE|runTurn|createZMachine|sealSnapshot|Snapshot)\b/;
    expect(offenders(UI, forbidden)).toEqual([]);
  });

  it("keeps the machine barrel from exporting mutable world internals", () => {
    const barrel = SRC.find((file) => file.path === "src/zmachine/index.ts");
    expect(barrel).toBeDefined();
    if (barrel === undefined) {
      return;
    }
    expect(barrel.text).not.toMatch(/\bexport\s*\{[^}]*\bWorldState\b/);
    expect(barrel.text).not.toMatch(/\bexport\s+\*\s+from/);
  });

  it("has no framework, state library, or parser dependency", () => {
    const manifest = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    expect(manifest.dependencies ?? {}).toEqual({});
    const banned = /react|vue|svelte|redux|zustand|mobx|xstate|pinia|ecs|nearley|chevrotain|pegjs|openai|anthropic/i;
    for (const name of Object.keys(manifest.devDependencies ?? {})) {
      expect(banned.test(name)).toBe(false);
    }
  });
});
