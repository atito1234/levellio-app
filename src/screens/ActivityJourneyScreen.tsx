import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pill, ScreenContainer, ScreenHeader, StatTile, type PillTone } from '@/components';
import { DotGrid, Sparkline } from '@/components/charts';
import { A, radii, shadows, spacing, typography } from '@/theme';
import { useGame } from '@/state/GameContext';
import { useActivityLog } from '@/state/useActivityLog';
import { useLinks } from '@/state/LinksContext';
import { sessionsOf } from '@/lib/analytics';
import { activityDayCells, activityJourney, activityWeeklyAdherence, HABIT_DAYS, type JourneyStatus } from '@/lib/journey';
import { SOLIDIFY_DAYS } from '@/lib/activityStreak';
import { rippleForQuest } from '@/lib/habitCapacity';
import { getCapacity, type CapacityId } from '@/lib/compounding';
import { CATEGORY_META } from '@/lib/categories';
import { dayKey } from '@/lib/dates';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ActivityJourney'>;

// Shared analytics palette (src/theme/analytics.ts).
const { ink: INK, muted: MUTED, card: CARD, bg: BG, violet: VIOLET, teal: TEAL, track: TRACK } = A;

/** Habit-journey status → the matching Pill tone. */
const STATUS_TONE: Record<JourneyStatus, PillTone> = {
  graduated: 'gold',
  solidified: 'teal',
  building: 'violet',
  new: 'neutral',
};

export function ActivityJourneyScreen({ route, navigation }: Props) {
  const { t } = useTranslation('activityJourney');
  const { activityId } = route.params;
  const { quests } = useGame();
  const { events, ready } = useActivityLog();
  const { neighborsOf, chainOf, addLink, removeLink } = useLinks();
  const [pickerOpen, setPickerOpen] = useState(false);

  const linkedIds = neighborsOf(activityId).filter((id) => quests.some((q) => q.id === id));
  const chainCaps = useMemo(() => {
    const set = new Set<CapacityId>();
    for (const qid of chainOf(activityId)) {
      const q = quests.find((x) => x.id === qid);
      if (q) rippleForQuest(q).forEach((d) => set.add(d.capacityId));
    }
    return [...set].sort((a, b) => getCapacity(a).order - getCapacity(b).order);
  }, [chainOf, activityId, quests]);
  const linkable = quests.filter((q) => q.id !== activityId && !linkedIds.includes(q.id));
  const titleFor = (id: string) => quests.find((q) => q.id === id)?.title ?? t('activityFallback');

  const data = useMemo(() => {
    const sessions = sessionsOf(events);
    const today = dayKey(new Date());
    const fromQuest = quests.find((q) => q.id === activityId)?.title;
    const fromSession = [...sessions].reverse().find((s) => s.activityId === activityId)?.title;
    const title = fromQuest ?? fromSession ?? t('activityFallback');
    return {
      title,
      journey: activityJourney(sessions, activityId, title, today),
      cells: activityDayCells(sessions, activityId, today, 35),
      adherence: activityWeeklyAdherence(sessions, activityId, today, 8),
    };
  }, [events, quests, activityId, t]);

  const j = data.journey;
  const statusLabel = t(`status.${j.status}`);
  const hasHistory = j.totalDays > 0;
  const solidPct = (SOLIDIFY_DAYS / HABIT_DAYS) * 100;

  return (
    <ScreenContainer backgroundColor={BG}>
      <ScreenHeader
        title={data.title}
        onBack={() => navigation.goBack()}
        backLabel={t('a11yBack')}
        right={<Pill tone={STATUS_TONE[j.status]} label={statusLabel} />}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {!ready ? (
          <Text style={styles.empty}>{t('loading')}</Text>
        ) : !hasHistory ? (
          <View style={styles.card}>
            <Text style={styles.empty}>{t('emptyHistory')}</Text>
          </View>
        ) : (
          <>
            {/* Progress toward automatic, with Day 21 / 66 markers. */}
            <View style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.cardTitle}>{t('automatic.title')}</Text>
                <Text style={styles.bigPct}>{t('automatic.pct', { value: j.progressPct })}</Text>
              </View>
              <View style={styles.track}>
                <View style={[styles.trackFill, { width: `${Math.max(2, j.progressPct)}%` }]} />
                <View style={[styles.tick, { left: `${solidPct}%` }]} />
              </View>
              <View style={styles.markerRow}>
                <Text style={styles.marker}>{t('automatic.dayMarker', { n: 1 })}</Text>
                <Text style={[styles.marker, styles.markerMid]}>{t('automatic.dayMarker', { n: SOLIDIFY_DAYS })}</Text>
                <Text style={styles.marker}>{t('automatic.dayMarker', { n: HABIT_DAYS })}</Text>
              </View>
              <Text style={styles.cardSub}>
                {j.graduated
                  ? t('automatic.graduated')
                  : t('automatic.building', { streak: j.currentStreak, days: HABIT_DAYS })}
              </Text>
            </View>

            {/* Real consistency — the user's own weekly trajectory. */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{t('consistency.title')}</Text>
              <Text style={styles.cardSub}>{t('consistency.sub')}</Text>
              <View style={styles.curveWrap}>
                <Sparkline values={data.adherence} color={VIOLET} />
              </View>
            </View>

            {/* Past days — real completion grid. */}
            <View style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.cardTitle}>{t('pastDays.title')}</Text>
                <Text style={styles.cardSub}>{t('pastDays.closed', { done: data.cells.filter((c) => c.done).length, total: data.cells.length })}</Text>
              </View>
              <DotGrid cells={data.cells} />
            </View>

            {/* Honest stat row. */}
            <View style={styles.statsRow}>
              <StatTile value={`${j.currentStreak}`} label={t('stats.dayStreak')} tint={TEAL} />
              <StatTile value={`${j.totalDays}`} label={t('stats.daysClosed')} />
              <StatTile value={`${j.daysSinceStart}`} label={t('stats.daysOnPath')} tint={VIOLET} />
            </View>

            {/* Your chain — explicit links that power the same ripple. */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{t('chain.title')}</Text>
              <Text style={styles.cardSub}>{t('chain.sub')}</Text>
              {linkedIds.length === 0 ? (
                <Text style={styles.chainEmpty}>{t('chain.empty')}</Text>
              ) : (
                <View style={styles.chainList}>
                  {linkedIds.map((id) => (
                    <View key={id} style={styles.chainRow}>
                      <Pressable onPress={() => navigation.push('ActivityJourney', { activityId: id })} accessibilityRole="button" accessibilityLabel={t('chain.a11yOpen', { title: titleFor(id) })} style={styles.chainMain}>
                        <Text style={styles.chainTitle} numberOfLines={1}>🔗 {titleFor(id)}</Text>
                      </Pressable>
                      <Pressable onPress={() => void removeLink(activityId, id)} accessibilityRole="button" accessibilityLabel={t('chain.a11yUnlink', { title: titleFor(id) })} hitSlop={8}>
                        <Text style={styles.chainRemove}>✕</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
              {chainCaps.length > 0 && linkedIds.length > 0 && (
                <Text style={styles.chainCaps}>{t('chain.powers', { caps: chainCaps.map((c) => getCapacity(c).name).join(' · ') })}</Text>
              )}
              <Pressable onPress={() => setPickerOpen(true)} accessibilityRole="button" accessibilityLabel={t('chain.a11yLinkAnother')} disabled={linkable.length === 0} style={[styles.linkBtn, linkable.length === 0 && styles.linkBtnOff]}>
                <Text style={styles.linkBtnText}>{t('chain.linkButton')}</Text>
              </Pressable>
            </View>

            <View style={styles.actions}>
              <Pressable onPress={() => navigation.navigate('Ripple', { questId: activityId })} accessibilityRole="button" accessibilityLabel={t('actions.a11yDoNow')} style={styles.cta}>
                <Text style={styles.ctaText}>{t('actions.doNow')}</Text>
              </Pressable>
              <Pressable onPress={() => navigation.navigate('Connections', { questId: activityId })} accessibilityRole="button" accessibilityLabel={t('actions.a11yConnects')} style={styles.secondary}>
                <Text style={styles.secondaryText}>{t('actions.connects')}</Text>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>

      <Modal visible={pickerOpen} animationType="slide" transparent onRequestClose={() => setPickerOpen(false)}>
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheet}>
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>{t('picker.title')}</Text>
              <Pressable onPress={() => setPickerOpen(false)} accessibilityRole="button" accessibilityLabel={t('picker.a11yDone')} hitSlop={12}>
                <Text style={styles.sheetDone}>{t('picker.done')}</Text>
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetListContent}>
              {linkable.length === 0 ? (
                <Text style={styles.empty}>{t('picker.empty')}</Text>
              ) : (
                linkable.map((q) => (
                  <Pressable
                    key={q.id}
                    onPress={() => {
                      void addLink(activityId, q.id);
                      setPickerOpen(false);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={t('picker.a11yLink', { title: q.title })}
                    style={styles.sheetRow}
                  >
                    <Text style={styles.sheetRowIcon}>{CATEGORY_META[q.category].icon}</Text>
                    <Text style={styles.sheetRowTitle} numberOfLines={1}>{q.title}</Text>
                    <Text style={styles.sheetRowAdd}>＋</Text>
                  </Pressable>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xl },

  card: { backgroundColor: CARD, borderRadius: radii.xl, padding: spacing.lg, gap: spacing.sm, ...shadows.md },
  cardTitle: { ...typography.title, color: INK, fontWeight: '800' },
  cardSub: { ...typography.caption, color: MUTED },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bigPct: { ...typography.title, color: VIOLET, fontWeight: '800' },

  track: { height: 10, borderRadius: 5, backgroundColor: TRACK, overflow: 'visible', marginTop: 4 },
  trackFill: { height: 10, borderRadius: 5, backgroundColor: VIOLET },
  tick: { position: 'absolute', top: -3, width: 2, height: 16, backgroundColor: MUTED, opacity: 0.5 },
  markerRow: { flexDirection: 'row', justifyContent: 'space-between' },
  marker: { ...typography.caption, color: MUTED, fontSize: 10 },
  markerMid: { marginLeft: -20 },

  curveWrap: { marginTop: spacing.xs },

  statsRow: { flexDirection: 'row', gap: spacing.sm, backgroundColor: CARD, borderRadius: radii.xl, paddingVertical: spacing.lg, ...shadows.md },

  actions: { gap: spacing.sm },
  cta: { backgroundColor: VIOLET, borderRadius: 999, paddingVertical: spacing.md, alignItems: 'center' },
  ctaText: { ...typography.label, color: '#FFFFFF', fontWeight: '800' },
  secondary: { alignItems: 'center', paddingVertical: spacing.sm },
  secondaryText: { ...typography.label, color: VIOLET, fontWeight: '700' },

  chainEmpty: { ...typography.body, color: MUTED },
  chainList: { gap: spacing.sm },
  chainRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: BG, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  chainMain: { flex: 1 },
  chainTitle: { ...typography.body, color: INK, fontWeight: '600' },
  chainRemove: { ...typography.label, color: MUTED, fontWeight: '800' },
  chainCaps: { ...typography.caption, color: TEAL, fontWeight: '700' },
  linkBtn: { alignSelf: 'flex-start', backgroundColor: '#EDE9FE', borderRadius: 999, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, marginTop: spacing.xs },
  linkBtnOff: { opacity: 0.4 },
  linkBtnText: { ...typography.label, color: VIOLET, fontWeight: '800' },

  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(31,41,55,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: BG, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, padding: spacing.lg, maxHeight: '80%', gap: spacing.md },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { ...typography.heading, color: INK },
  sheetDone: { ...typography.label, color: VIOLET, fontWeight: '800' },
  sheetListContent: { gap: spacing.sm, paddingBottom: spacing.md },
  sheetRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: CARD, borderRadius: radii.lg, padding: spacing.md, borderWidth: 1, borderColor: TRACK },
  sheetRowIcon: { fontSize: 18 },
  sheetRowTitle: { ...typography.body, color: INK, flex: 1, fontWeight: '600' },
  sheetRowAdd: { fontSize: 20, color: VIOLET, fontWeight: '800' },

  empty: { ...typography.body, color: MUTED, textAlign: 'center' },
});
