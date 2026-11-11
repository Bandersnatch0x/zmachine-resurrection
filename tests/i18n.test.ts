import { describe, expect, it } from "vitest";
import { detectLocale, fill, nextLocale, say, t, text } from "../src/i18n";
import type { Text } from "../src/i18n";
import { createSession } from "../src/session/session";
import { helpSections } from "../src/ui/help";
import { INITIAL_STATE, observe, runTurn } from "../src/zmachine";

describe("locale detection", () => {
  it("follows the query, then storage, then English", () => {
    expect(detectLocale("?lang=zh", "en")).toBe("zh");
    expect(detectLocale("?lang=en", "zh")).toBe("en");
    expect(detectLocale("", "zh")).toBe("zh");
    expect(detectLocale("", null)).toBe("en");
  });

  it("ignores unknown values at either source", () => {
    expect(detectLocale("?lang=fr", "zh")).toBe("zh");
    expect(detectLocale("?lang=fr", "de")).toBe("en");
    expect(detectLocale("", "ZH")).toBe("en");
  });
});

describe("text lookup", () => {
  it("returns the active locale", () => {
    expect(t("en", text("Cell", "牢房"))).toBe("Cell");
    expect(t("zh", text("Cell", "牢房"))).toBe("牢房");
  });

  it("falls back to English when the active value is missing or empty", () => {
    expect(t("zh", { en: "Cell" } as Text)).toBe("Cell");
    expect(t("zh", { en: "Cell", zh: "" })).toBe("Cell");
  });
});

describe("locale toggle", () => {
  it("alternates between English and Chinese", () => {
    expect(nextLocale("en")).toBe("zh");
    expect(nextLocale("zh")).toBe("en");
  });
});

describe("template fill", () => {
  it("replaces known placeholders and leaves unknown ones intact", () => {
    expect(fill("{a} of {b}", { a: "one", b: 2 })).toBe("one of 2");
    expect(fill("{a} and {missing}", { a: "one" })).toBe("one and {missing}");
  });

  it("localizes before filling", () => {
    expect(say("zh", text("{moves} moves", "{moves} 步"), { moves: 3 })).toBe("3 步");
  });
});

describe("help sections", () => {
  it("lists the six reference sections in English", () => {
    const sections = helpSections("en");

    expect(sections.map((section) => section.title)).toEqual([
      "What this is",
      "Goal",
      "Typed commands",
      "Natural language",
      "Meta commands",
      "Why the model cannot cheat",
    ]);
    expect(sections[2]?.rows.map((row) => row.term)).toEqual([
      "LOOK",
      "INVENTORY",
      "WAIT",
      "NORTH/SOUTH/EAST/WEST",
      "TAKE",
      "DROP",
      "LIGHT LAMP",
      "EXTINGUISH LAMP",
      "OPEN",
    ]);
    expect(sections[3]?.rows.map((row) => row.term)).toContain("take the key and go north");
    expect(sections[5]?.paragraphs).toHaveLength(1);
  });

  it("renders the same six sections in Chinese", () => {
    const sections = helpSections("zh");

    expect(sections).toHaveLength(6);
    expect(sections.map((section) => section.title)).toEqual([
      "这是什么",
      "目标",
      "键入命令",
      "自然语言",
      "元命令",
      "模型为什么不能作弊",
    ]);
    expect(sections[2]?.rows[0]).toEqual({ term: "LOOK", description: "查看当前房间。" });
    expect(sections[4]?.rows.map((row) => row.term)).toEqual([
      "SAVE",
      "RESTORE",
      "REPLAY",
      "HELP",
      "ENDPOINT [url]",
    ]);
  });
});

describe("localized game text", () => {
  it("projects room, items, and door state in the requested locale", () => {
    const en = observe(INITIAL_STATE);
    const zh = observe(INITIAL_STATE, "zh");

    expect(en.room.title).toBe("Cell");
    expect(zh.room.title).toBe("牢房");
    expect(en.visibleItems).toEqual(["brass key"]);
    expect(zh.visibleItems).toEqual(["黄铜钥匙"]);
    expect(zh.carriedItems).toEqual(["黄铜灯（亮着）", "笔记本"]);
    expect(zh.doors).toEqual([{ id: "hatch", state: "上锁" }]);
  });

  it("runs a turn in the requested locale and defaults to English", () => {
    expect(runTurn(INITIAL_STATE, { kind: "look" }).output[0]).toContain(
      "north. You see: brass key.",
    );
    expect(runTurn(INITIAL_STATE, { kind: "look" }, "zh").output[0]).toContain(
      "。你看见：黄铜钥匙。",
    );
    expect(runTurn(INITIAL_STATE, { kind: "take", noun: "key" }, "zh").output).toEqual([
      "已拾取：黄铜钥匙。",
    ]);
    expect(runTurn(INITIAL_STATE, { kind: "open", noun: "hatch" }, "zh").output).toEqual([
      "你从这里够不到舱门。",
    ]);
  });

  it("replays a session log in the requested locale", () => {
    const session = createSession();
    session.commit({ input: "take key", commands: [{ kind: "take", noun: "key" }] });

    expect(session.replayAll("zh")[0]?.output).toEqual(["已拾取：黄铜钥匙。"]);
    expect(session.describe("zh")[0]).toContain("牢房");
    expect(session.describe()[0]).toContain("Cell");
  });
});
