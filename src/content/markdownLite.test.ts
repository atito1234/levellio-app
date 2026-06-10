import { renderHtmlDocument, renderMarkdown } from '@/content/markdownLite';

describe('renderMarkdown', () => {
  it('renders ATX headings by level', () => {
    expect(renderMarkdown('# Title')).toBe('<h1>Title</h1>');
    expect(renderMarkdown('## Section')).toBe('<h2>Section</h2>');
    expect(renderMarkdown('### Sub')).toBe('<h3>Sub</h3>');
  });

  it('groups consecutive lines into a paragraph and splits on blank lines', () => {
    expect(renderMarkdown('one\ntwo\n\nthree')).toBe('<p>one two</p>\n<p>three</p>');
  });

  it('renders unordered and ordered lists', () => {
    expect(renderMarkdown('- a\n- b')).toBe('<ul><li>a</li><li>b</li></ul>');
    expect(renderMarkdown('1. first\n2. second')).toBe('<ol><li>first</li><li>second</li></ol>');
  });

  it('renders horizontal rules', () => {
    expect(renderMarkdown('---')).toBe('<hr />');
  });

  it('applies inline bold, code and links', () => {
    expect(renderMarkdown('a **b** c')).toBe('<p>a <strong>b</strong> c</p>');
    expect(renderMarkdown('use `npm test`')).toBe('<p>use <code>npm test</code></p>');
    expect(renderMarkdown('[site](https://x.io)')).toBe('<p><a href="https://x.io">site</a></p>');
  });

  it('renders blockquotes', () => {
    expect(renderMarkdown('> note one\n> note two')).toBe(
      '<blockquote><p>note one note two</p></blockquote>',
    );
  });

  it('escapes HTML to prevent injection', () => {
    expect(renderMarkdown('a <script>alert(1)</script>')).toBe(
      '<p>a &lt;script&gt;alert(1)&lt;/script&gt;</p>',
    );
    expect(renderMarkdown('Tom & Jerry')).toBe('<p>Tom &amp; Jerry</p>');
  });

  it('transitions cleanly between blocks', () => {
    const md = '# H\n\nintro\n\n- one\n- two\n\n---\n\nend';
    expect(renderMarkdown(md)).toBe(
      '<h1>H</h1>\n<p>intro</p>\n<ul><li>one</li><li>two</li></ul>\n<hr />\n<p>end</p>',
    );
  });
});

describe('renderHtmlDocument', () => {
  it('wraps a body in a self-contained, titled HTML page', () => {
    const doc = renderHtmlDocument('Privacy Policy', '<h1>Privacy</h1>');
    expect(doc.startsWith('<!doctype html>')).toBe(true);
    expect(doc).toContain('<title>Privacy Policy</title>');
    expect(doc).toContain('<h1>Privacy</h1>');
    expect(doc).toContain('<style>');
  });

  it('escapes the title', () => {
    expect(renderHtmlDocument('A & B', '')).toContain('<title>A &amp; B</title>');
  });
});
