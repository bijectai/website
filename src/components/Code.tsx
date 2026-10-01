// Hand-tokenized code for the homepage's short snippets. Each line is a list
// of [kind, text] pairs; a highlighter library would be overkill for a dozen
// fixed lines, and spelling the tokens out keeps the palette deliberate:
// greys for syntax, the brand green reserved for the verdict.
export type TokenKind = "plain" | "kw" | "str" | "com" | "verdict";
export type CodeLine = [TokenKind, string][];

export function Code({ lines, label }: { lines: CodeLine[]; label?: string }) {
  return (
    <pre className="code" aria-label={label}>
      <code>
        {lines.map((line, i) => (
          <span className="code-line" key={i}>
            {line.map(([kind, text], j) =>
              kind === "plain" ? text : (
                <span className={`tok-${kind}`} key={j}>
                  {text}
                </span>
              ),
            )}
            {"\n"}
          </span>
        ))}
      </code>
    </pre>
  );
}
