/**
 * App feature flags. Keep these as plain constants so flipping one is a trivial,
 * reviewable change.
 */

/**
 * Photo/video uploads (post media + story creation) require Firebase Storage,
 * which needs the Blaze plan. Flip to `true` after the Blaze upgrade — every media
 * affordance reads this flag and is shown-but-disabled until then.
 */
export const MEDIA_UPLOADS_ENABLED = false;

/**
 * During the alpha, everyone is a "founding member" and gets Levellio Plus for
 * free. Set to `false` at launch (alongside turning on real billing) so Plus
 * perks become paid. Core habit-building + community always stay free regardless.
 */
export const FOUNDING_FREE = true;
