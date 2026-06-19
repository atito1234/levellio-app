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
