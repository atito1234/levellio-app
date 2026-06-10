import { parseMarkdownBlocks, stripInline } from '@/content/markdownBlocks';

describe('stripInline', () => {
  it('flattens links, bold and code to plain text', () => {
    expect(stripInline('see [the site](https://x.io)')).toBe('see the site');
    expect(stripInline('a **bold** word')).toBe('a bold word');
    expect(stripInline('run `npm test`')).toBe('run npm test');
  });
});

describe('parseMarkdownBlocks', () => {
  it('parses headings by level', () => {
    expect(parseMarkdownBlocks('# A')).toEqual([{ type: 'heading', level: 1, text: 'A' }]);
    expect(parseMarkdownBlocks('### C')).toEqual([{ type: 'heading', level: 3, text: 'C' }]);
  });

  it('groups paragraph lines and splits on blank lines', () => {
    expect(parseMarkdownBlocks('one\ntwo\n\nthree')).toEqual([
      { type: 'paragraph', text: 'one two' },
      { type: 'paragraph', text: 'three' },
    ]);
  });

  it('parses ordered and unordered list items', () => {
    expect(parseMarkdownBlocks('- a\n1. b')).toEqual([
      { type: 'list-item', ordered: false, text: 'a' },
      { type: 'list-item', ordered: true, text: 'b' },
    ]);
  });

  it('parses blockquotes and rules', () => {
    expect(parseMarkdownBlocks('> note')).toEqual([{ type: 'quote', text: 'note' }]);
    expect(parseMarkdownBlocks('---')).toEqual([{ type: 'rule' }]);
  });

  it('handles a realistic legal snippet end-to-end', () => {
    const md = '# Title\n\n**Effective date: June 10, 2026**\n\n## 1. Section\n\n- point one\n- point two';
    const blocks = parseMarkdownBlocks(md);
    expect(blocks[0]).toEqual({ type: 'heading', level: 1, text: 'Title' });
    expect(blocks[1]).toEqual({ type: 'paragraph', text: 'Effective date: June 10, 2026' });
    expect(blocks).toContainEqual({ type: 'list-item', ordered: false, text: 'point one' });
  });
});
