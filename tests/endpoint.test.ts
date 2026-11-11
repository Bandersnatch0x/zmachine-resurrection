import { describe, expect, it } from "vitest";
import {
  ENDPOINT_QUERY_KEY,
  ENDPOINT_STORAGE_KEY,
  httpUrl,
  pickEndpoint,
} from "../src/frontend/endpoint";

const BASE = "https://demo.example/page/";

describe("runtime endpoint resolution", () => {
  it("prefers the query parameter, then storage, then the build variable", () => {
    expect(
      pickEndpoint(
        [
          { origin: "query", value: "/api/a" },
          { origin: "storage", value: "https://b.example/i" },
          { origin: "env", value: "https://c.example/i" },
        ],
        BASE,
      ),
    ).toEqual({ endpoint: "https://demo.example/api/a", origin: "query", invalid: null });

    expect(
      pickEndpoint(
        [
          { origin: "query", value: null },
          { origin: "storage", value: "https://b.example/i" },
          { origin: "env", value: "https://c.example/i" },
        ],
        BASE,
      ),
    ).toEqual({ endpoint: "https://b.example/i", origin: "storage", invalid: null });

    expect(
      pickEndpoint(
        [
          { origin: "query", value: "" },
          { origin: "storage", value: "   " },
          { origin: "env", value: "https://c.example/i" },
        ],
        BASE,
      ),
    ).toEqual({ endpoint: "https://c.example/i", origin: "env", invalid: null });
  });

  it("resolves a relative path against the page so the dev route still works", () => {
    expect(pickEndpoint([{ origin: "env", value: "/api/interpret" }], BASE)).toEqual({
      endpoint: "https://demo.example/api/interpret",
      origin: "env",
      invalid: null,
    });
  });

  it("rejects anything that is not http(s) and reports the offending value", () => {
    for (const value of ["javascript:alert(1)", "ftp://example.com/i", "data:text/plain,x"]) {
      expect(pickEndpoint([{ origin: "query", value }], BASE)).toEqual({
        endpoint: null,
        origin: "none",
        invalid: value,
      });
    }
  });

  it("rejects a query endpoint on an unlisted host and falls through", () => {
    expect(pickEndpoint([{ origin: "query", value: "https://evil.example/i" }], BASE)).toEqual({
      endpoint: null,
      origin: "none",
      invalid: "https://evil.example/i",
    });

    expect(
      pickEndpoint(
        [
          { origin: "query", value: "https://evil.example/i" },
          { origin: "storage", value: "https://proxy.example/i" },
        ],
        BASE,
      ),
    ).toEqual({
      endpoint: "https://proxy.example/i",
      origin: "storage",
      invalid: "https://evil.example/i",
    });
  });

  it("allows a listed host for the query endpoint", () => {
    const allowed = new Set(["proxy.example"]);
    expect(
      pickEndpoint([{ origin: "query", value: "https://proxy.example/i" }], BASE, allowed),
    ).toEqual({ endpoint: "https://proxy.example/i", origin: "query", invalid: null });
  });

  it("returns no endpoint when every candidate is blank", () => {
    expect(
      pickEndpoint(
        [
          { origin: "query", value: null },
          { origin: "storage", value: undefined },
          { origin: "env", value: "" },
        ],
        BASE,
      ),
    ).toEqual({ endpoint: null, origin: "none", invalid: null });
  });

  it("keeps the query and storage keys stable", () => {
    expect(ENDPOINT_QUERY_KEY).toBe("endpoint");
    expect(ENDPOINT_STORAGE_KEY).toBe("interpret-endpoint");
  });

  it("httpUrl returns the absolute href for accepted schemes only", () => {
    expect(httpUrl("https://x.example/i", BASE)).toBe("https://x.example/i");
    expect(httpUrl("mailto:a@b.c", BASE)).toBeNull();
  });
});
