import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, typography } from '@/theme';
import { useStories } from '@/state/StoriesContext';
import { relTime } from '@/lib/relTime';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'StoryViewer'>;

const STORY_MS = 5000;

/** Full-screen tap-through story viewer with timed progress bars. */
export function StoryViewerScreen({ route, navigation }: Props) {
  const { t, i18n } = useTranslation('common');
  const { uid } = route.params;
  const { storiesFor } = useStories();
  const stories = storiesFor(uid);
  const [index, setIndex] = useState(0);
  const progress = useRef(new Animated.Value(0)).current;

  const current = stories[index];

  useEffect(() => {
    if (!current) {
      navigation.goBack();
      return;
    }
    progress.setValue(0);
    const anim = Animated.timing(progress, { toValue: 1, duration: STORY_MS, useNativeDriver: false });
    anim.start(({ finished }) => {
      if (finished) {
        if (index < stories.length - 1) setIndex((i) => i + 1);
        else navigation.goBack();
      }
    });
    return () => anim.stop();
  }, [index, current, stories.length, navigation, progress]);

  if (!current) return <View style={styles.root} />;

  const prev = () => setIndex((i) => Math.max(0, i - 1));
  const next = () => (index < stories.length - 1 ? setIndex((i) => i + 1) : navigation.goBack());

  return (
    <View style={styles.root}>
      {current.media.type === 'image' ? (
        <Image source={{ uri: current.media.url }} style={styles.media} resizeMode="contain" />
      ) : (
        <View style={[styles.media, styles.videoFallback]}>
          <Text style={styles.videoText}>🎬</Text>
        </View>
      )}

      {/* Progress segments. */}
      <View style={styles.progressRow}>
        {stories.map((s, i) => (
          <View key={s.id} style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width:
                    i < index
                      ? '100%'
                      : i === index
                        ? progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] })
                        : '0%',
                },
              ]}
            />
          </View>
        ))}
      </View>

      <View style={styles.header}>
        <Text style={styles.name}>{current.displayName}</Text>
        <Text style={styles.time}>{relTime(current.createdAt, t, i18n.language)}</Text>
        <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel={t('action.close')} hitSlop={12} style={styles.close}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
      </View>

      {/* Tap zones. */}
      <Pressable style={styles.left} onPress={prev} />
      <Pressable style={styles.right} onPress={next} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  media: { ...StyleSheet.absoluteFillObject },
  videoFallback: { alignItems: 'center', justifyContent: 'center' },
  videoText: { fontSize: 64 },
  progressRow: { flexDirection: 'row', gap: 4, paddingTop: spacing.xxl, paddingHorizontal: spacing.md },
  progressTrack: { flex: 1, height: 3, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.3)', overflow: 'hidden' },
  progressFill: { height: 3, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  name: { ...typography.label, color: '#FFFFFF', fontWeight: '800' },
  time: { ...typography.caption, color: 'rgba(255,255,255,0.8)', flex: 1 },
  close: { padding: spacing.xs },
  closeText: { ...typography.title, color: '#FFFFFF' },
  left: { position: 'absolute', left: 0, top: 80, bottom: 0, width: '35%' },
  right: { position: 'absolute', right: 0, top: 80, bottom: 0, width: '65%' },
});
