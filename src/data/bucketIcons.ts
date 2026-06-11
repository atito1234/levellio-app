/**
 * Curated bucket icon set — simple, single-tint vector glyphs (24×24 viewBox)
 * consistent with the app's flat style. Pure data: each icon is one or more SVG
 * path strings rendered filled in the bucket's accent color. No emoji, no
 * third-party icon fonts.
 */
export interface BucketIcon {
  id: string;
  /** Accessible name (used in pickers / screen readers). */
  name: string;
  /** SVG path "d" strings, drawn filled, in a 0 0 24 24 viewBox. */
  paths: string[];
}

export const DEFAULT_BUCKET_ICON_ID = 'target';

export const BUCKET_ICONS: readonly BucketIcon[] = [
  { id: 'target', name: 'Target', paths: ['M12 2a10 10 0 100 20 10 10 0 000-20zm0 4a6 6 0 110 12 6 6 0 010-12zm0 4a2 2 0 100 4 2 2 0 000-4z'] },
  { id: 'star', name: 'Star', paths: ['M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.8 5.9 20.4l1.4-6.8L2.2 9l6.9-.7z'] },
  { id: 'flame', name: 'Flame', paths: ['M12 2c1 3.5-1.5 4.5-1.5 7 0 1 .7 1.8 1.5 1.8s1.5-.8 1.5-1.8c1.6 1.4 2.5 3.2 2.5 5.2a4 4 0 11-8 0c0-3.6 3-5.4 4-12.2z'] },
  { id: 'heart', name: 'Heart', paths: ['M12 20.5S3.5 14.7 3.5 8.9A4.4 4.4 0 0112 6a4.4 4.4 0 018.5 2.9c0 5.8-8.5 11.6-8.5 11.6z'] },
  { id: 'dumbbell', name: 'Dumbbell', paths: ['M3 9h2v6H3zM5 10.5h2v3H5zM17 10.5h2v3h-2zM19 9h2v6h-2zM7 11h10v2H7z'] },
  { id: 'leaf', name: 'Leaf', paths: ['M5 13C5 7 10 4 19 4c0 9-4.5 13.5-10.5 13.5A3.5 3.5 0 015 14zM7 18c2-3 4-5 7-6.5C11 12 9 14.5 8.5 18z'] },
  { id: 'drop', name: 'Water drop', paths: ['M12 3c4 5 6 8.2 6 11.2a6 6 0 11-12 0C6 11.2 8 8 12 3z'] },
  { id: 'sun', name: 'Sun', paths: ['M12 8a4 4 0 100 8 4 4 0 000-8z', 'M11 2h2v3h-2zM11 19h2v3h-2zM2 11h3v2H2zM19 11h3v2h-3zM4.2 5.6l1.4-1.4 2.1 2.1-1.4 1.4zM16.3 17.7l1.4-1.4 2.1 2.1-1.4 1.4zM5.6 19.8l-1.4-1.4 2.1-2.1 1.4 1.4zM17.7 7.7l-1.4-1.4 2.1-2.1 1.4 1.4z'] },
  { id: 'moon', name: 'Moon', paths: ['M14 3a9 9 0 100 18A7.2 7.2 0 0114 3z'] },
  { id: 'bulb', name: 'Idea', paths: ['M12 3a6 6 0 00-3.6 10.8c.6.5 1 1.1 1.1 1.7l.1.5h4.8l.1-.5c.1-.6.5-1.2 1.1-1.7A6 6 0 0012 3z', 'M9.5 18h5v1.5a2 2 0 01-2 2h-1a2 2 0 01-2-2z'] },
  { id: 'book', name: 'Book', paths: ['M6 3h12a1 1 0 011 1v15a1 1 0 01-1 1H7a2 2 0 01-2-2V4a1 1 0 011-1zm1 2v11h10V5zm0 13h10v1H7z'] },
  { id: 'pencil', name: 'Writing', paths: ['M4 16.5L14 6.5l3.5 3.5L7.5 20H4zM15.2 5.3l1.8-1.8a1 1 0 011.4 0l2.1 2.1a1 1 0 010 1.4l-1.8 1.8z'] },
  { id: 'palette', name: 'Creativity', paths: ['M12 3a9 9 0 00-.5 18 1.8 1.8 0 001.6-2.7c-.5-.9.2-2 1.2-2H16a4 4 0 004-4c0-5-3.8-9.3-8-9.3z', 'M7 10a1.3 1.3 0 110 2.6A1.3 1.3 0 017 10zM11 7a1.3 1.3 0 110 2.6A1.3 1.3 0 0111 7zM16 8.5a1.3 1.3 0 110 2.6 1.3 1.3 0 010-2.6z'] },
  { id: 'music', name: 'Music', paths: ['M10 4l9-1.5V14a3 3 0 11-2-2.8V6.2l-5 .9V17a3 3 0 11-2-2.8z'] },
  { id: 'coin', name: 'Finance', paths: ['M12 3a9 9 0 100 18 9 9 0 000-18zm0 3.5c.5 0 1 .4 1 1v.3c1 .2 1.8.8 2 1.7l-1.8.5c-.1-.4-.6-.7-1.2-.7-.7 0-1.1.3-1.1.7 0 .5.5.6 1.5.9 1.4.3 2.6.8 2.6 2.3 0 1.1-.8 1.9-2 2.1v.4a1 1 0 11-2 0v-.4c-1.1-.2-2-.9-2.2-2l1.9-.4c.1.5.6.9 1.3.9.8 0 1.2-.3 1.2-.8 0-.5-.5-.6-1.6-.9-1.2-.3-2.5-.8-2.5-2.2 0-1 .8-1.8 1.9-2v-.4c0-.6.5-1 1-1z'] },
  { id: 'briefcase', name: 'Work', paths: ['M9 4h6a2 2 0 012 2v1h3a1 1 0 011 1v10a2 2 0 01-2 2H4a2 2 0 01-2-2V8a1 1 0 011-1h3V6a2 2 0 012-2zm0 3h6V6H9z'] },
  { id: 'people', name: 'Relationships', paths: ['M8 5a3 3 0 100 6 3 3 0 000-6zM16 5a3 3 0 100 6 3 3 0 000-6zM3 19a5 5 0 0110 0v1H3zM13.5 14.2A6.9 6.9 0 0121 19v1h-6v-1c0-1.9-.6-3.6-1.5-4.8z'] },
  { id: 'home', name: 'Home', paths: ['M12 3l9 8h-2.5v9H14v-5h-4v5H5.5v-9H3z'] },
  { id: 'plant', name: 'Growth', paths: ['M11 21v-6c-3 0-5-2-5-6 4 0 5 2 5 4 .3-3 2-5 6-5 0 4-2 6-5 6v7z', 'M8 21h8v1.5H8z'] },
  { id: 'clock', name: 'Time', paths: ['M12 3a9 9 0 100 18 9 9 0 000-18zm1 4v5l3.5 2-1 1.7L11 13V7z'] },
  { id: 'compass', name: 'Explore', paths: ['M12 3a9 9 0 100 18 9 9 0 000-18zm3.8 5.2l-2 5-5 2 2-5z'] },
  { id: 'check', name: 'Tasks', paths: ['M5 4h11l3 3v13a1 1 0 01-1 1H5a1 1 0 01-1-1V5a1 1 0 011-1zm5.2 12.5l6-6-1.5-1.4-4.5 4.5-2-2L7.7 14z'] },
];

export function getBucketIcon(id: string): BucketIcon {
  return BUCKET_ICONS.find((i) => i.id === id) ?? BUCKET_ICONS[0]!;
}

export function isValidBucketIconId(id: string): boolean {
  return BUCKET_ICONS.some((i) => i.id === id);
}
