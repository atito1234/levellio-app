/**
 * Bridges the pure {@link weekdaysLabel} formatter to i18n: builds its localized
 * options from the `common` namespace. Pass any component's `t` — the keys are
 * namespace-qualified, so the bound namespace doesn't matter.
 */
import type { TFunction } from 'i18next';
import type { WeekdaysLabelOpts } from './recurrence';

export function recurrenceLabelOpts(t: TFunction): WeekdaysLabelOpts {
  return {
    dayNames: t('common:weekdaysAbbr', { returnObjects: true }) as string[],
    everyDay: t('common:recurrence.everyDay'),
    weekdays: t('common:recurrence.weekdays'),
    weekends: t('common:recurrence.weekends'),
  };
}
