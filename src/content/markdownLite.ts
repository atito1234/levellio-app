/**
 * Tiny, dependency-free Markdown → HTML renderer for the legal documents. It
 * supports only the subset used by privacy-policy.md / terms-of-service.md:
 * ATX headings (#..###), paragraphs, unordered (`- `) and ordered (`1. `)
 * lists, horizontal rules (`---`), inline **bold**, `code`, and [text](url).
 * HTML is escaped first, so user-authored Markdown can't inject markup.
 */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Inline formatting, applied to already-escaped text. */
function renderInline(text: string): string {
  let out = escapeHtml(text);
  // `code`
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
  // **bold**
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // [text](url)
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, label: string, url: string) => {
    return `<a href="${url}">${label}</a>`;
  });
  return out;
}

/** Render a Markdown string into an HTML fragment (no <html> wrapper). */
export function renderMarkdown(md: string): string {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const html: string[] = [];
  let para: string[] = [];
  let quote: string[] = [];
  let list: { type: 'ul' | 'ol'; items: string[] } | null = null;

  const flushPara = (): void => {
    if (para.length) {
      html.push(`<p>${renderInline(para.join(' '))}</p>`);
      para = [];
    }
  };
  const flushQuote = (): void => {
    if (quote.length) {
      html.push(`<blockquote><p>${renderInline(quote.join(' '))}</p></blockquote>`);
      quote = [];
    }
  };
  const flushList = (): void => {
    if (list) {
      const items = list.items.map((i) => `<li>${renderInline(i)}</li>`).join('');
      html.push(`<${list.type}>${items}</${list.type}>`);
      list = null;
    }
  };
  const flushAll = (): void => {
    flushPara();
    flushQuote();
    flushList();
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const trimmed = line.trim();

    if (trimmed === '') {
      flushAll();
      continue;
    }
    if (/^---+$/.test(trimmed)) {
      flushAll();
      html.push('<hr />');
      continue;
    }
    const heading = /^(#{1,3})\s+(.*)$/.exec(trimmed);
    if (heading) {
      flushAll();
      const level = heading[1]!.length;
      html.push(`<h${level}>${renderInline(heading[2]!)}</h${level}>`);
      continue;
    }
    const quoteLine = /^>\s?(.*)$/.exec(trimmed);
    if (quoteLine) {
      flushPara();
      flushList();
      quote.push(quoteLine[1]!);
      continue;
    }
    const ol = /^\d+\.\s+(.*)$/.exec(trimmed);
    if (ol) {
      flushPara();
      flushQuote();
      if (!list || list.type !== 'ol') {
        flushList();
        list = { type: 'ol', items: [] };
      }
      list.items.push(ol[1]!);
      continue;
    }
    const ul = /^[-*]\s+(.*)$/.exec(trimmed);
    if (ul) {
      flushPara();
      flushQuote();
      if (!list || list.type !== 'ul') {
        flushList();
        list = { type: 'ul', items: [] };
      }
      list.items.push(ul[1]!);
      continue;
    }
    // Plain text line → part of a paragraph.
    flushList();
    flushQuote();
    para.push(trimmed);
  }
  flushAll();
  return html.join('\n');
}

/** Wrap an HTML fragment in a self-contained, printable HTML document. */
export function renderHtmlDocument(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      :root { color-scheme: light; }
      body {
        font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        line-height: 1.6; color: #1b1b2a; background: #ffffff;
        max-width: 760px; margin: 0 auto; padding: 48px 24px 96px;
      }
      h1 { font-size: 2rem; letter-spacing: -0.02em; }
      h2 { font-size: 1.35rem; margin-top: 2em; }
      h3 { font-size: 1.1rem; margin-top: 1.5em; }
      a { color: #6c4cf1; }
      code { background: #f0f0f6; padding: 1px 6px; border-radius: 5px; }
      hr { border: 0; border-top: 1px solid #e3e3ec; margin: 2em 0; }
      blockquote { margin: 1.5em 0; padding: 12px 18px; border-left: 4px solid #6c4cf1; background: #f5f3ff; border-radius: 0 8px 8px 0; }
      ul, ol { padding-left: 1.4em; }
      li { margin: 0.3em 0; }
      @media print { body { padding: 0; max-width: none; } a { color: inherit; } }
    </style>
  </head>
  <body>
${bodyHtml}
  </body>
</html>
`;
}
