import { cn } from "@/lib/utils";

// Lays out a question written as plain text so it is quick to read:
//   first short line(s)        -> a small topic label ("Computer & Speed · Typing Test")
//   "Question:" / "Task:" ...  -> a small section label
//   “quoted” or ( ) text       -> a highlighted box (text to translate, messages)
//   • or 1. lines              -> a list
//   the rest                   -> the question itself, in bold
// "Response: Written answer." style notes are dropped: the answer box says it.
type Block =
  | { kind: "label"; text: string }
  | { kind: "quote"; text: string }
  | { kind: "list"; items: string[]; ordered: boolean }
  | { kind: "text"; text: string; muted?: boolean }
  | { kind: "data"; lines: string[] };

const LABEL = /^(question|task|measures|the customer wrote|the internal system shows)\s*:?$/i;
const NOTE = /^(response:\s*)?written (answer|response)\.?$/i;
const QUOTE = /^[“"(]/;
const BULLET = /^•\s*/;
const NUMBERED = /^\d+\.\s+/;

function isHeadingLine(line: string) {
  return (
    line.length <= 40 &&
    !/[?.:,]$/.test(line) &&
    !QUOTE.test(line) &&
    !BULLET.test(line) &&
    !NUMBERED.test(line)
  );
}

export function parseQuestion(prompt: string) {
  const lines = prompt.split("\n").map((l) => l.trim());
  // Topic: the first short line(s) before the real content.
  const topic: string[] = [];
  let i = 0;
  // A short first line followed by a blank line is a topic, even with "?"
  // ("Why This Position?").
  if (
    lines.length > 2 &&
    lines[0].length <= 40 &&
    lines[1] === "" &&
    lines.slice(2).some(Boolean)
  ) {
    topic.push(lines[0]);
    i = 1;
  }
  while (i < lines.length && (lines[i] === "" || isHeadingLine(lines[i])) && topic.length < 2) {
    if (lines[i]) topic.push(lines[i]);
    i++;
    if (topic.length && lines[i] && !isHeadingLine(lines[i])) break;
  }
  // A lone short line is the whole question (e.g. "Anything you would like to mention").
  if (i >= lines.length)
    return { topic: [] as string[], blocks: [{ kind: "text", text: topic.join(" ") }] as Block[] };

  const blocks: Block[] = [];
  let text: string[] = [];
  const flush = () => {
    // Text after "Measures" is a note about the question, not the question.
    const prev = blocks.at(-1);
    const muted = prev?.kind === "label" && /^measures$/i.test(prev.text);
    if (text.length) blocks.push({ kind: "text", text: text.join(" "), muted });
    text = [];
  };
  for (; i < lines.length; i++) {
    const line = lines[i];
    if (!line) {
      flush();
      continue;
    }
    if (NOTE.test(line)) continue;
    if (LABEL.test(line)) {
      flush();
      blocks.push({ kind: "label", text: line.replace(/:$/, "") });
    } else if (QUOTE.test(line)) {
      flush();
      blocks.push({ kind: "quote", text: line });
    } else if (BULLET.test(line) || NUMBERED.test(line)) {
      flush();
      const ordered = NUMBERED.test(line);
      const item = line.replace(ordered ? NUMBERED : BULLET, "");
      const last = blocks.at(-1);
      if (last?.kind === "list" && last.ordered === ordered) last.items.push(item);
      else blocks.push({ kind: "list", items: [item], ordered });
    } else if (text.length === 0 && /^[\p{L}\p{N}][^:]{0,40}:\s/u.test(line)) {
      // "이름: 김민수" style data lines: grouped in one box.
      flush();
      const last = blocks.at(-1);
      if (last?.kind === "data") last.lines.push(line);
      else blocks.push({ kind: "data", lines: [line] });
    } else {
      text.push(line);
    }
  }
  flush();
  // Only quoted text (e.g. a video question in quotes): that is the question.
  if (!blocks.some((b) => b.kind === "text"))
    return {
      topic,
      blocks: blocks.map((b) =>
        b.kind === "quote"
          ? ({ kind: "text", text: b.text.replace(/^[“"]|[”"]$/g, "") } as Block)
          : b,
      ),
    };
  return { topic, blocks };
}

export function QuestionText({
  number,
  prompt,
  className,
  ...rest
}: {
  number?: number;
  prompt: string;
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>) {
  const { topic, blocks } = parseQuestion(prompt);
  // Consecutive "key: value" lines (customer data) render as one data box.
  return (
    <div className={cn("space-y-3", className)} {...rest}>
      <div className="flex flex-wrap items-center gap-2">
        {number !== undefined ? (
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-wm-blue text-xs font-extrabold text-white">
            {number}
          </span>
        ) : null}
        {topic.length ? (
          <span className="rounded-full bg-wm-tint px-2.5 py-1 text-xs font-bold text-wm-blue">
            {topic.join(" · ")}
          </span>
        ) : null}
      </div>
      {blocks.map((b, i) =>
        b.kind === "label" ? (
          <p key={i} className="text-xs font-extrabold tracking-wide text-wm-caption uppercase">
            {b.text}
          </p>
        ) : b.kind === "quote" ? (
          <p
            key={i}
            className="rounded-2xl border-s-4 border-wm-blue bg-wm-mist px-4 py-3 text-[15px] leading-relaxed font-medium text-wm-ink"
          >
            {b.text}
          </p>
        ) : b.kind === "data" ? (
          <dl key={i} className="space-y-1 rounded-2xl bg-wm-mist px-4 py-3 text-[15px]">
            {b.lines.map((line, j) => {
              const at = line.indexOf(":");
              return (
                <div key={j} className="flex flex-wrap gap-x-2">
                  <dt className="font-medium text-wm-slate">{line.slice(0, at + 1)}</dt>
                  <dd className="m-0 font-bold text-wm-ink">{line.slice(at + 1).trim()}</dd>
                </div>
              );
            })}
          </dl>
        ) : b.kind === "list" ? (
          b.ordered ? (
            <ol
              key={i}
              className="list-decimal space-y-1 ps-6 text-[15px] font-semibold text-wm-ink"
            >
              {b.items.map((it, j) => (
                <li key={j}>{it}</li>
              ))}
            </ol>
          ) : (
            <ul key={i} className="list-disc space-y-1 ps-6 text-[15px] font-semibold text-wm-ink">
              {b.items.map((it, j) => (
                <li key={j}>{it}</li>
              ))}
            </ul>
          )
        ) : (
          <p
            key={i}
            className={cn(
              "leading-snug",
              b.muted ? "text-sm font-medium text-wm-slate" : "text-base font-bold text-wm-ink",
            )}
          >
            {b.text}
          </p>
        ),
      )}
    </div>
  );
}
