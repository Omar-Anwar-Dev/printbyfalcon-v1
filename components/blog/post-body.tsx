/**
 * Sprint 13 — minimal markdown-flavored renderer for blog post bodies.
 *
 * No external markdown library — keeps the bundle small + dependency surface
 * tight. Supports: H2 (`## `), H3 (`### `), bullet lists (`- `), bold (`**`),
 * inline links (`[text](href)`), simple tables, code spans (` `` `), and
 * paragraphs separated by blank lines.
 *
 * Intentionally narrow: posts authored in `lib/blog/posts.ts` follow the
 * same restricted markdown subset. If a post needs more (images, embeds,
 * MDX components), promote the post to a real MDX file + bundler integration.
 */

import { Link } from '@/lib/i18n/routing';

type Props = {
  body: string;
  isAr: boolean;
};

type ParsedNode =
  | { kind: 'h2'; text: string }
  | { kind: 'h3'; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'table'; header: string[]; rows: string[][] };

function parseMarkdown(input: string): ParsedNode[] {
  const lines = input.split(/\r?\n/);
  const nodes: ParsedNode[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();

    if (!line) {
      i++;
      continue;
    }

    if (line.startsWith('## ')) {
      nodes.push({ kind: 'h2', text: line.slice(3).trim() });
      i++;
      continue;
    }

    if (line.startsWith('### ')) {
      nodes.push({ kind: 'h3', text: line.slice(4).trim() });
      i++;
      continue;
    }

    // Lists.
    if (line.startsWith('- ')) {
      const items: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('- ')) {
        items.push(lines[i].trim().slice(2).trim());
        i++;
      }
      nodes.push({ kind: 'list', items });
      continue;
    }

    // Tables (`| col | col |` followed by `|---|---|`).
    if (line.startsWith('|') && i + 1 < lines.length) {
      const next = lines[i + 1].trim();
      if (/^\|[\s|:-]+\|$/.test(next)) {
        const header = line
          .split('|')
          .slice(1, -1)
          .map((c) => c.trim());
        i += 2;
        const rows: string[][] = [];
        while (i < lines.length && lines[i].trim().startsWith('|')) {
          rows.push(
            lines[i]
              .trim()
              .split('|')
              .slice(1, -1)
              .map((c) => c.trim()),
          );
          i++;
        }
        nodes.push({ kind: 'table', header, rows });
        continue;
      }
    }

    // Paragraph: gather until blank line.
    const para: string[] = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trim().startsWith('## ') &&
      !lines[i].trim().startsWith('### ') &&
      !lines[i].trim().startsWith('- ') &&
      !lines[i].trim().startsWith('|')
    ) {
      para.push(lines[i].trim());
      i++;
    }
    nodes.push({ kind: 'paragraph', text: para.join(' ') });
  }

  return nodes;
}

/**
 * Render inline markdown (bold + links + code spans) for a single string.
 * Returns React children (string + spans).
 */
function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  // Pattern matches: **bold**, [text](href), `code`.
  const re = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)]+)\)|`([^`]+)`/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    if (match[1]) {
      parts.push(<strong key={`b${key++}`}>{match[1]}</strong>);
    } else if (match[2] && match[3]) {
      const href = match[3];
      const linkText = match[2];
      // Internal links route through next-intl's `Link`; external get a plain
      // anchor with rel/target.
      if (href.startsWith('/')) {
        // Strip the locale prefix if present — the next-intl Link adds it.
        const cleanedHref = href.replace(/^\/(?:ar|en)/, '') || '/';
        parts.push(
          <Link
            key={`a${key++}`}
            href={cleanedHref}
            className="text-accent-strong underline underline-offset-2 hover:text-accent"
          >
            {linkText}
          </Link>,
        );
      } else {
        parts.push(
          <a
            key={`a${key++}`}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-strong underline underline-offset-2 hover:text-accent"
          >
            {linkText}
          </a>,
        );
      }
    } else if (match[4]) {
      parts.push(
        <code
          key={`c${key++}`}
          className="rounded bg-paper-hover px-1 py-0.5 font-mono text-[0.9em]"
        >
          {match[4]}
        </code>,
      );
    }
    last = re.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export function BlogPostBody({ body, isAr }: Props) {
  const nodes = parseMarkdown(body);
  return (
    <div
      className="prose prose-neutral max-w-none [&_a]:no-underline"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {nodes.map((node, idx) => {
        switch (node.kind) {
          case 'h2':
            return (
              <h2
                key={idx}
                className="mt-10 border-b border-border pb-2 text-xl font-bold tracking-tight text-foreground sm:text-2xl"
              >
                {renderInline(node.text)}
              </h2>
            );
          case 'h3':
            return (
              <h3
                key={idx}
                className="mt-6 text-lg font-semibold tracking-tight text-foreground"
              >
                {renderInline(node.text)}
              </h3>
            );
          case 'paragraph':
            return (
              <p
                key={idx}
                className="my-4 text-base leading-relaxed text-foreground/85"
              >
                {renderInline(node.text)}
              </p>
            );
          case 'list':
            return (
              <ul
                key={idx}
                className="my-4 list-disc space-y-1.5 ps-6 text-base leading-relaxed text-foreground/85"
              >
                {node.items.map((item, i) => (
                  <li key={i}>{renderInline(item)}</li>
                ))}
              </ul>
            );
          case 'table':
            return (
              <div key={idx} className="my-6 overflow-x-auto">
                <table className="w-full border-collapse border border-border text-sm">
                  <thead className="bg-paper">
                    <tr>
                      {node.header.map((cell, i) => (
                        <th
                          key={i}
                          className="border border-border px-3 py-2 text-start font-semibold"
                        >
                          {renderInline(cell)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {node.rows.map((row, ri) => (
                      <tr key={ri}>
                        {row.map((cell, ci) => (
                          <td
                            key={ci}
                            className="border border-border px-3 py-2 text-start"
                          >
                            {renderInline(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
        }
      })}
    </div>
  );
}
