import { addLink, areLinked, cluster, neighbors, normalizeLinks, pruneLinks, removeLink } from './links';

describe('links graph', () => {
  it('adds an undirected link both ways', () => {
    const m = addLink({}, 'a', 'b');
    expect(areLinked(m, 'a', 'b')).toBe(true);
    expect(areLinked(m, 'b', 'a')).toBe(true);
    expect(neighbors(m, 'a')).toEqual(['b']);
  });

  it('ignores self-links and duplicates', () => {
    let m = addLink({}, 'a', 'a');
    expect(m).toEqual({});
    m = addLink(addLink({}, 'a', 'b'), 'a', 'b');
    expect(neighbors(m, 'a')).toEqual(['b']);
  });

  it('keeps neighbour lists sorted and unique', () => {
    const m = addLink(addLink({}, 'a', 'c'), 'a', 'b');
    expect(neighbors(m, 'a')).toEqual(['b', 'c']);
  });

  it('removes a link both ways and drops empties', () => {
    const m = removeLink(addLink({}, 'a', 'b'), 'a', 'b');
    expect(m).toEqual({});
  });

  it('computes the whole connected chain', () => {
    let m = addLink({}, 'a', 'b');
    m = addLink(m, 'b', 'c');
    m = addLink(m, 'x', 'y'); // separate chain
    expect(cluster(m, 'a')).toEqual(['a', 'b', 'c']);
    expect(cluster(m, 'x')).toEqual(['x', 'y']);
    expect(cluster(m, 'lonely')).toEqual(['lonely']);
  });

  it('normalizes asymmetric/dirty data into a symmetric map', () => {
    const m = normalizeLinks({ links: { a: ['b', 'a', 7], b: [] } });
    expect(areLinked(m, 'a', 'b')).toBe(true);
    expect(areLinked(m, 'b', 'a')).toBe(true);
  });

  it('prunes links to ids that no longer exist', () => {
    const m = pruneLinks(addLink(addLink({}, 'a', 'b'), 'a', 'gone'), new Set(['a', 'b']));
    expect(neighbors(m, 'a')).toEqual(['b']);
    expect(m.gone).toBeUndefined();
  });
});
