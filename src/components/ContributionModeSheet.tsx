import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { spacing, typography } from '@/theme';
import { captureLocationSafely } from '@/services/sensors/deviceContext';
import { detectContributionMode, hasGeofence, type ContributionMode, type Project } from '@/lib/projects';

const INK = '#1F2937';
const CARD = '#FFFFFF';
const VIOLET = '#6C4CF1';
const TEAL = '#16C8A8';
const MUTED = '#5A5A72';
const TRACK = '#ECEAE4';

/**
 * Asks how a project-linked completion was done: On-site (on the ground, at the
 * project) vs From anywhere (for your own sake — it still helps). When location
 * is enabled and a linked project has a pin, GPS pre-selects the likely answer.
 */
export function ContributionModeSheet({
  visible,
  projects,
  locationEnabled,
  onChoose,
  onClose,
}: {
  visible: boolean;
  projects: Project[];
  locationEnabled: boolean;
  onChoose: (mode: ContributionMode) => void;
  onClose: () => void;
}) {
  const [suggested, setSuggested] = useState<ContributionMode | null>(null);
  const [detecting, setDetecting] = useState(false);
  const canGeolocate = locationEnabled && projects.some(hasGeofence);

  useEffect(() => {
    if (!visible) {
      setSuggested(null);
      setDetecting(false);
      return;
    }
    let active = true;
    if (canGeolocate) {
      setDetecting(true);
      captureLocationSafely(true)
        .then((sample) => {
          if (!active) return;
          setSuggested(detectContributionMode(sample, projects));
        })
        .finally(() => active && setDetecting(false));
    }
    return () => {
      active = false;
    };
  }, [visible, canGeolocate, projects]);

  const Option = ({ mode, emoji, title, body }: { mode: ContributionMode; emoji: string; title: string; body: string }) => {
    const on = suggested === mode;
    return (
      <Pressable
        onPress={() => onChoose(mode)}
        accessibilityRole="button"
        accessibilityLabel={`${title}. ${body}${on ? '. Suggested.' : ''}`}
        style={[styles.option, on && styles.optionOn]}
      >
        <Text style={styles.optionEmoji}>{emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.optionTitle}>
            {title}
            {on ? '  · suggested' : ''}
          </Text>
          <Text style={styles.optionBody}>{body}</Text>
        </View>
      </Pressable>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>How did you do this?</Text>
          <Text style={styles.sub}>Both count toward the project — this just shows how.</Text>
          {detecting && (
            <View style={styles.detecting}>
              <ActivityIndicator color={VIOLET} />
              <Text style={styles.detectingText}>Checking your location…</Text>
            </View>
          )}
          <Option mode="onsite" emoji="📍" title="On-site" body="On the ground, at the project." />
          <Option mode="remote" emoji="🌍" title="From anywhere" body="For my own goal — it still helps." />
          <Pressable onPress={onClose} accessibilityRole="button" style={styles.skip} hitSlop={8}>
            <Text style={styles.skipText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(31,41,55,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: CARD, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.lg, gap: spacing.sm },
  title: { ...typography.heading, color: INK },
  sub: { ...typography.caption, color: MUTED },
  detecting: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
  detectingText: { ...typography.caption, color: MUTED },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#F7F6F2',
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: TRACK,
  },
  optionOn: { borderColor: TEAL, backgroundColor: '#EAFBF6' },
  optionEmoji: { fontSize: 28 },
  optionTitle: { ...typography.title, color: INK, fontWeight: '800' },
  optionBody: { ...typography.caption, color: MUTED },
  skip: { alignItems: 'center', paddingVertical: spacing.sm, marginTop: spacing.xs },
  skipText: { ...typography.label, color: MUTED, fontWeight: '700' },
});
