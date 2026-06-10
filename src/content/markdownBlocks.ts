/**
 * Parses the legal Markdown into a flat list of typed blocks for native (React
 * Native) rendering — the in-app counterpart to the HTML `markdownLite` renderer
 * used for the printable docs. Supports the subset our legal docs use: ATX
 * headings, paragraphs, unordered/ordered list items, blockquotes, and rules.
 * Inline markers (**bold**, `code`, [text](url)) are flattened to plain text.
 */

export type Block =
  | { type: 'heading'; level: 1 | 2 | 3; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list-item'; ordered: boolean; text: string }
  | { type: 'quote'; text: string }
  | { type: 'rule' };

/** Flatten inline Markdown markers to plain display text. */
export function stripInline(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '$1') // links → label
    .replace(/\*\*([^*]+)\*\*/g, '$1') // bold
    .replace(/`([^`]+)`/g, '$1'); // code
}

export function parseMarkdownBlocks(md: string): Block[] {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let para: string[] = [];
  let quote: string[] = [];

  const flushPara = (): void => {
    if (para.length) {
      blocks.push({ type: 'paragraph', text: stripInline(para.join(' ')) });
      para = [];
    }
  };
  const flushQuote = (): void => {
    if (quote.length) {
      blocks.push({ type: 'quote', text: stripInline(quote.join(' ')) });
      quote = [];
    }
  };
  const flushAll = (): void => {
    flushPara();
    flushQuote();
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (line === '') {
      flushAll();
      continue;
    }
    if (/^---+$/.test(line)) {
      flushAll();
      blocks.push({ type: 'rule' });
      continue;
    }
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      flushAll();
      blocks.push({
        type: 'heading',
        level: heading[1]!.length as 1 | 2 | 3,
        text: stripInline(heading[2]!),
      });
      continue;
    }
    const quoteLine = /^>\s?(.*)$/.exec(line);
    if (quoteLine) {
      flushPara();
      quote.push(quoteLine[1]!);
      continue;
    }
    const ol = /^\d+\.\s+(.*)$/.exec(line);
    if (ol) {
      flushAll();
      blocks.push({ type: 'list-item', ordered: true, text: stripInline(ol[1]!) });
      continue;
    }
    const ul = /^[-*]\s+(.*)$/.exec(line);
    if (ul) {
      flushAll();
      blocks.push({ type: 'list-item', ordered: false, text: stripInline(ul[1]!) });
      continue;
    }
    flushQuote();
    para.push(line);
  }
  flushAll();
  return blocks;
}
