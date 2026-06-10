/**
 * Verifies the self-contained store-screenshot templates. There is no browser
 * in CI, so we execute art.js + app.js in a sandboxed DOM stub and assert that
 * every screen assembles at both export sizes and embeds the real recreated
 * SVG art. Also guards the ported art geometry (tier/stage fallbacks, palette).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';

/* eslint-disable @typescript-eslint/no-explicit-any */

interface StubEl {
  tagName: string;
  className: string;
  innerHTML: string;
  style: { _props: Record<string, string>; setProperty(k: string, v: string): void };
  appendChild(child: StubEl): void;
}

function makeSandbox(search: string): any {
  const created: StubEl[] = [];
  const newEl = (tag: string): StubEl => ({
    tagName: tag,
    className: '',
    innerHTML: '',
    style: {
      _props: {},
      setProperty(k: string, v: string) {
        this._props[k] = v;
      },
    },
    appendChild() {},
  });
  const body = newEl('body');
  const appended: StubEl[] = [];
  body.appendChild = (child: StubEl) => {
    appended.push(child);
  };
  const ctx: any = {
    URLSearchParams,
    console,
    document: {
      _title: '',
      createElement: (tag: string) => {
        const e = newEl(tag);
        created.push(e);
        return e;
      },
      body,
      get title() {
        return this._title;
      },
      set title(v: string) {
        this._title = v;
      },
    },
    location: { search },
    __appended: appended,
  };
  ctx.window = ctx;
  return ctx;
}

function loadInto(ctx: any): void {
  const dir = __dirname;
  const art = readFileSync(join(dir, 'art.js'), 'utf8');
  const app = readFileSync(join(dir, 'app.js'), 'utf8');
  vm.createContext(ctx);
  vm.runInContext(art, ctx);
  vm.runInContext(app, ctx);
}

const SCREENS = ['onboarding', 'dashboard', 'celebrate', 'character', 'premium'] as const;

describe('store screenshot templates', () => {
  it.each(SCREENS)('renders the %s screen with embedded SVG art (App Store size)', (screen) => {
    const ctx = makeSandbox('');
    loadInto(ctx);
    ctx.window.Levellio.render(screen);
    const root = ctx.__appended[0] as StubEl;
    expect(root).toBeDefined();
    expect(root.className).toBe('canvas');
    expect(root.style._props['--w']).toBe('1290px');
    expect(root.style._props['--h']).toBe('2796px');
    expect(root.innerHTML).toContain('<svg');
    expect(root.innerHTML).toContain('class="caption"');
    expect(root.innerHTML).toContain('class="phone"');
  });

  it('honours the Play export size via ?size=play', () => {
    const ctx = makeSandbox('?size=play');
    loadInto(ctx);
    ctx.window.Levellio.render('dashboard');
    const root = ctx.__appended[0] as StubEl;
    expect(root.style._props['--w']).toBe('1080px');
    expect(root.style._props['--h']).toBe('1920px');
  });

  it('shows screen-specific value-prop copy and UI', () => {
    const ctx = makeSandbox('');
    loadInto(ctx);
    ctx.window.Levellio.render('dashboard');
    const html = (ctx.__appended[0] as StubEl).innerHTML;
    expect(html).toContain('Today’s quests');
    expect(html).toContain('Level 7');
    expect(html).toContain('Morning workout');
  });
});

describe('ported art (art.js)', () => {
  const ctx = makeSandbox('');
  loadInto(ctx);
  const A = ctx.window.LevellioArt;

  it('renders heroes with the locked palette and tier gear', () => {
    const luminary = A.hero('luminary', 'female', 100);
    expect(luminary).toContain('<svg');
    expect(luminary).toContain('#16C8A8'); // teal hoodie
    expect(luminary).toContain('#FFB23E'); // gold gear
    expect(luminary).toContain('#6C4CF1'); // violet cape
    // Luminary has more elements (cape + gear + aura) than a bare novice.
    const novice = A.hero('novice', 'female', 100);
    expect(luminary.length).toBeGreaterThan(novice.length);
  });

  it('falls back to novice/neutral for unknown hero inputs', () => {
    const bogus = A.hero('wizard' as any, 'alien' as any, 100);
    expect(bogus).toContain('Neutral hero, Novice tier');
  });

  it('renders all wisp stages, evolving in detail', () => {
    expect(A.wisp('spark', 100)).toContain('<svg');
    expect(A.wisp('phoenixling', 100).length).toBeGreaterThan(A.wisp('spark', 100).length);
    expect(A.wisp('bogus' as any, 100)).toContain('Wisp companion: Spark');
  });

  it('renders the app mark using teal + gold chevrons', () => {
    const m = A.mark(100, true);
    expect(m).toContain('#16C8A8');
    expect(m).toContain('#FFB23E');
  });
});
