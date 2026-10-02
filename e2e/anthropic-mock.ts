import { createServer, type Server } from "node:http";
import { EXAMPLE_ROLE } from "../src/lib/question-builder/example";

// A fake Anthropic Messages API for the Question builder test: it answers
// with a finished interview (the example job, under the title asked for) and
// remembers the requests it got.
export const requests: { key: string | undefined; body: string }[] = [];

export function startAnthropicMock(): Promise<Server> {
  const server = createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      requests.push({ key: req.headers["x-api-key"] as string | undefined, body });
      const title = /Job title: (.+)/.exec(body)?.[1]?.trim() ?? "Job";
      res.setHeader("content-type", "application/json");
      res.end(
        JSON.stringify({
          content: [
            {
              type: "tool_use",
              name: "save_interview",
              input: {
                ...EXAMPLE_ROLE,
                title,
                videoSkills: `Which skills do you have as a ${title}?`,
              },
            },
          ],
        }),
      );
    });
  });
  return new Promise((resolve) => server.listen(3198, "127.0.0.1", () => resolve(server)));
}
