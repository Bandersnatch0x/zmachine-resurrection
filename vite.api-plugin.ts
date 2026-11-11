import type { Connect, Plugin } from "vite";
import { handleInterpret } from "./api/interpret";

const ROUTE = "/api/interpret";

function readBody(request: Connect.IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });
    request.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(new Error("body is not JSON"));
      }
    });
    request.on("error", reject);
  });
}

/**
 * Development-only model bridge. The key lives in the dev server's process
 * environment and never reaches the browser bundle.
 */
export function interpretApiPlugin(): Plugin {
  return {
    name: "zmachine-interpret-api",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (request.url !== ROUTE) {
          next();
          return;
        }
        if (request.method !== "POST") {
          response.statusCode = 405;
          response.setHeader("Content-Type", "application/json");
          response.end(JSON.stringify({ error: "use POST" }));
          return;
        }

        void (async () => {
          let body: unknown;
          try {
            body = await readBody(request);
          } catch {
            response.statusCode = 400;
            response.setHeader("Content-Type", "application/json");
            response.end(JSON.stringify({ error: "body is not JSON" }));
            return;
          }

          const result = await handleInterpret(body, {
            env: {
              LLM_API_KEY: process.env.LLM_API_KEY,
              LLM_API_URL: process.env.LLM_API_URL,
              LLM_MODEL: process.env.LLM_MODEL,
            },
          });
          response.statusCode = result.status;
          response.setHeader("Content-Type", "application/json");
          response.end(JSON.stringify(result.body));
        })();
      });
    },
  };
}
