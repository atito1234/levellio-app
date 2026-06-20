import React, { useEffect, useRef } from 'react';
import { Alert, Animated, Easing, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { HeroAvatar } from '@/components/HeroAvatar';
import { PressableScale } from '@/components/PressableScale';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { colors, radii, spacing, typography } from '@/theme';
import { useStories } from '@/state/StoriesContext';
import { useGame } from '@/state/GameContext';
import { uploadMedia } from '@/services/firebase/storage';
import { MEDIA_UPLOADS_ENABLED } from '@/config/features';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

/** Instagram-style stories rail. The "Add" tile is gated by MEDIA_UPLOADS_ENABLED. */
export function StoriesRail() {
  const { t } = useTranslation(['stories', 'common']);
  const navigation = useNavigation<Nav>();
  const { groups, myUid, addStory } = useStories();
  const { character } = useGame();
  const reduced = useReducedMotion();

  const others = groups.filter((g) => g.uid !== myUid);

  // Gentle looping pulse on the "+" to invite the first story.
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 900, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reduced, pulse]);

  const onAdd = async () => {
    if (!MEDIA_UPLOADS_ENABLED) {
      Alert.alert(t('stories:comingSoon.title'), t('stories:comingSoon.body'));
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], quality: 0.6, videoMaxDuration: 60 });
    const asset = res.canceled ? null : res.assets[0];
    if (!asset || !myUid) return;
    const url = await uploadMedia(asset.uri, `users/${myUid}/stories/${Date.now()}`);
    await addStory({ url, type: asset.type === 'video' ? 'video' : 'image' });
  };

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
      {/* Add to your story (disabled until media is enabled). */}
      <PressableScale onPress={() => void onAdd()} accessibilityRole="button" accessibilityLabel={t('stories:addYourStory')} style={styles.tile}>
        <View style={[styles.ring, !MEDIA_UPLOADS_ENABLED && styles.ringMuted]}>
          <HeroAvatar presentation={character?.presentation ?? 'neutral'} tier={character?.tier ?? 'novice'} kitId={character?.kitId} size={56} />
          <Animated.View
            style={[
              styles.plus,
              { transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] }) }] },
            ]}
          >
            <Text style={styles.plusText}>+</Text>
          </Animated.View>
        </View>
        <Text style={styles.label} numberOfLines={1}>{t('stories:yourStory')}</Text>
      </PressableScale>

      {others.map((g) => (
        <PressableScale key={g.uid} onPress={() => navigation.navigate('StoryViewer', { uid: g.uid })} accessibilityRole="button" style={styles.tile}>
          <View style={[styles.ring, styles.ringActive]}>
            <HeroAvatar presentation={g.presentation ?? 'neutral'} tier="novice" size={56} />
          </View>
          <Text style={styles.label} numberOfLines={1}>{g.displayName}</Text>
        </PressableScale>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  rail: { gap: spacing.md, paddingVertical: spacing.xs, paddingRight: spacing.lg },
  tile: { alignItems: 'center', width: 72, gap: 4 },
  ring: { width: 66, height: 66, borderRadius: 999, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.border, overflow: 'visible' },
  ringActive: { borderColor: colors.identity },
  ringMuted: { opacity: 0.55 },
  plus: { position: 'absolute', bottom: -2, right: -2, width: 22, height: 22, borderRadius: 999, backgroundColor: colors.identity, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.surface },
  plusText: { ...typography.label, color: colors.textOnBrand, fontWeight: '800', lineHeight: 18 },
  label: { ...typography.caption, color: colors.textSecondary, maxWidth: 72 },
});
