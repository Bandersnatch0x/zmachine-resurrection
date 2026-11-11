import { describe, expect, it, vi } from "vitest";
import { interpretApiPlugin } from "../vite.api-plugin";

interface Captured {
  status: number;
  body: string;
}

function callMiddleware(
  handler: (request: unknown, response: unknown, next: () => void) => void,
  request: { url: string; method: string; body?: string },
): Promise<Captured> {
  return new Promise((resolve) => {
    const listeners = new Map<string, (chunk?: unknown) => void>();
    const incoming = {
      url: request.url,
      method: request.method,
      on(event: string, listener: (chunk?: unknown) => void) {
        listeners.set(event, listener);
        return incoming;
      },
    };
    const response = {
      statusCode: 0,
      headers: {} as Record<string, string>,
      setHeader(name: string, value: string) {
        response.headers[name] = value;
      },
      end(body: string) {
        resolve({ status: response.statusCode, body });
      },
    };

    handler(incoming, response, () => resolve({ status: 0, body: "next" }));

    if (request.body !== undefined) {
      listeners.get("data")?.(Buffer.from(request.body, "utf8"));
    }
    listeners.get("end")?.();
  });
}

function middlewareOf(): (request: unknown, response: unknown, next: () => void) => void {
  let middleware: ((request: unknown, response: unknown, next: () => void) => void) | null = null;
  const plugin = interpretApiPlugin();
  const configure = plugin.configureServer;
  if (typeof configure !== "function") {
    throw new Error("plugin does not configure a dev server");
  }
  configure.call(
    {} as never,
    {
      middlewares: {
        use(handler: (request: unknown, response: unknown, next: () => void) => void) {
          middleware = handler;
        },
      },
    } as never,
  );
  if (middleware === null) {
    throw new Error("plugin registered no middleware");
  }
  return middleware;
}

describe("dev interpret middleware", () => {
  it("passes unrelated routes through", async () => {
    const result = await callMiddleware(middlewareOf(), { url: "/index.html", method: "GET" });
    expect(result.body).toBe("next");
  });

  it("rejects non-POST requests to the route", async () => {
    const result = await callMiddleware(middlewareOf(), { url: "/api/interpret", method: "GET" });
    expect(result.status).toBe(405);
  });

  it("rejects a body that is not JSON", async () => {
    const result = await callMiddleware(middlewareOf(), {
      url: "/api/interpret",
      method: "POST",
      body: "not json",
    });
    expect(result.status).toBe(400);
  });

  it("answers 503 without a key in the process environment", async () => {
    vi.stubEnv("LLM_API_KEY", "");
    try {
      const result = await callMiddleware(middlewareOf(), {
        url: "/api/interpret",
        method: "POST",
        body: JSON.stringify({ input: "go north" }),
      });
      expect(result.status).toBe(503);
      expect(JSON.parse(result.body)).toEqual({ error: "model not configured" });
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
