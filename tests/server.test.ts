import { describe, expect, it } from "vitest";
import { handleInterpret } from "../api/interpret";
import { callProvider, extractJsonObject, readProviderConfig } from "../api/provider";
import { isInterpretRequestBody } from "../api/contract";

function replyWith(content: string): typeof fetch {
  return () =>
    Promise.resolve(
      new Response(JSON.stringify({ choices: [{ message: { content } }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
}

describe("server handler", () => {
  it("accepts only a single bounded input string", () => {
    expect(isInterpretRequestBody({ input: "go north" })).toBe(true);
    expect(isInterpretRequestBody({ input: "  " })).toBe(false);
    expect(isInterpretRequestBody({ input: "go", moves: 3 })).toBe(false);
    expect(isInterpretRequestBody({ input: 42 })).toBe(false);
    expect(isInterpretRequestBody(null)).toBe(false);
    expect(isInterpretRequestBody({ input: "x".repeat(201) })).toBe(false);
  });

  it("answers 503 when no key is configured", async () => {
    const result = await handleInterpret({ input: "go north" }, { env: {} });
    expect(result.status).toBe(503);
    expect(result.body).toEqual({ error: "model not configured" });
  });

  it("answers 400 for a malformed request", async () => {
    const result = await handleInterpret({ prompt: "go north" }, { env: { LLM_API_KEY: "k" } });
    expect(result.status).toBe(400);
  });

  it("returns validated commands and drops state-like extras", async () => {
    const result = await handleInterpret(
      { input: "go north" },
      {
        env: { LLM_API_KEY: "test-key", LLM_API_URL: "https://example.invalid/v1" },
        fetchImpl: replyWith(
          'Sure! {"commands":[{"kind":"go","direction":"north","location":"vault"}],"claim":"you are in the vault"}',
        ),
      },
    );
    expect(result.status).toBe(422);
  });

  it("returns a clean intent for a well-formed provider reply", async () => {
    const result = await handleInterpret(
      { input: "go north" },
      {
        env: { LLM_API_KEY: "test-key" },
        fetchImpl: replyWith(
          '```json\n{"commands":[{"kind":"go","direction":"north"}],"claim":"the corridor is open"}\n```',
        ),
      },
    );
    expect(result.status).toBe(200);
    expect(result.body).toEqual({
      commands: [{ kind: "go", direction: "north" }],
      claims: ["the corridor is open"],
    });
  });

  it("answers 502 when the provider fails", async () => {
    const result = await handleInterpret(
      { input: "go north" },
      {
        env: { LLM_API_KEY: "test-key" },
        fetchImpl: () => Promise.reject(new Error("socket closed")),
      },
    );
    expect(result.status).toBe(502);
    expect(result.body).toEqual({ error: "socket closed" });
  });

  it("never sends the key to the browser", async () => {
    let seenAuthorization: string | null = null;
    const spy: typeof fetch = (url, init) => {
      const headers = new Headers(init?.headers);
      seenAuthorization = headers.get("Authorization");
      expect(String(url)).toBe("https://example.invalid/v1/chat");
      return Promise.resolve(
        new Response(JSON.stringify({ choices: [{ message: { content: '{"commands":[{"kind":"look"}]}' } }] }), {
          status: 200,
        }),
      );
    };

    const result = await handleInterpret(
      { input: "look around" },
      {
        env: {
          LLM_API_KEY: "secret-from-env",
          LLM_API_URL: "https://example.invalid/v1/chat",
        },
        fetchImpl: spy,
      },
    );

    expect(result.status).toBe(200);
    expect(seenAuthorization).toBe("Bearer secret-from-env");
    expect(JSON.stringify(result.body)).not.toContain("secret-from-env");
  });
});

describe("provider adapter", () => {
  it("extracts the first balanced JSON object from prose and fences", () => {
    expect(extractJsonObject('```json\n{"commands":[{"kind":"wait"}]}\n```')).toEqual({
      commands: [{ kind: "wait" }],
    });
    expect(extractJsonObject('Here you go: {"a":{"b":"}"}} trailing')).toEqual({ a: { b: "}" } });
    expect(extractJsonObject("no json here")).toBeNull();
    expect(extractJsonObject('{"broken": ')).toBeNull();
  });

  it("reads a provider config only when a key exists", () => {
    expect(readProviderConfig({})).toBeNull();
    expect(readProviderConfig({ LLM_API_KEY: "  " })).toBeNull();
    expect(readProviderConfig({ LLM_API_KEY: "k" })).toEqual({
      url: "https://api.openai.com/v1/chat/completions",
      key: "k",
      model: "gpt-4o-mini",
    });
  });

  it("sends a zero-temperature request and returns parsed JSON", async () => {
    let body: unknown = null;
    const result = await callProvider(
      { url: "https://example.invalid/v1", key: "k", model: "m" },
      "go north",
      (_url, init) => {
        body = JSON.parse(String(init?.body));
        return Promise.resolve(
          new Response(
            JSON.stringify({
              choices: [{ message: { content: '{"commands":[{"kind":"go","direction":"north"}]}' } }],
            }),
            { status: 200 },
          ),
        );
      },
    );

    expect(result).toEqual({ commands: [{ kind: "go", direction: "north" }] });
    expect(body).toMatchObject({ model: "m", temperature: 0 });
  });

  it("rejects a provider reply with no message or no JSON", async () => {
    await expect(
      callProvider({ url: "u", key: "k", model: "m" }, "x", () =>
        Promise.resolve(new Response(JSON.stringify({}), { status: 200 })),
      ),
    ).rejects.toThrow("no message");

    await expect(
      callProvider({ url: "u", key: "k", model: "m" }, "x", () =>
        Promise.resolve(
          new Response(JSON.stringify({ choices: [{ message: { content: "sorry" } }] }), {
            status: 200,
          }),
        ),
      ),
    ).rejects.toThrow("no JSON");
  });
});
