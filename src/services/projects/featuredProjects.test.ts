import { FEATURED_PROJECTS } from './featuredProjects';
import { isValidInviteCode, normalizeInviteCode } from '@/lib/projects';

describe('featured project seeds', () => {
  it('have unique, stable ids', () => {
    const ids = FEATURED_PROJECTS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  // Guards against the bug where seed codes (e.g. "MALARIA") contained letters the
  // join input used to strip, making them un-typeable and un-joinable.
  it('every invite code is typeable and valid (survives normalization unchanged)', () => {
    for (const p of FEATURED_PROJECTS) {
      expect(isValidInviteCode(p.inviteCode)).toBe(true);
      expect(normalizeInviteCode(p.inviteCode)).toBe(p.inviteCode.toUpperCase());
    }
  });

  it('invite codes are unique across featured projects', () => {
    const codes = FEATURED_PROJECTS.map((p) => normalizeInviteCode(p.inviteCode));
    expect(new Set(codes).size).toBe(codes.length);
  });
});
