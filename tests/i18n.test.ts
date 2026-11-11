import { describe, expect, it } from "vitest";
import { detectLocale, fill, nextLocale, say, t, text } from "../src/i18n";
import type { Text } from "../src/i18n";

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
