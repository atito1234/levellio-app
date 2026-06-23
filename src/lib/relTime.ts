/**
 * Localized wrapper around community.timeAgo: supplies the translated "just now"
 * label and the active locale for the date fallback. Keeps the pure timeAgo
 * formatter English-by-default while call sites stay terse.
 */
import type { TFunction } from 'i18next';
import { timeAgo } from './community';

export function relTime(ts: number, t: TFunction, locale: string): string {
  return timeAgo(ts, Date.now(), { justNow: t('common:time.justNow'), locale });
}
