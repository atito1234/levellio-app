import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer } from '@/components';
import { spacing, typography } from '@/theme';
import { useProjects } from '@/state/ProjectsContext';
import { isValidInviteCode, normalizeInviteCode } from '@/lib/projects';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'JoinProject'>;

const INK = '#1F2937';
const BG = '#F7F6F2';
const CARD = '#FFFFFF';
const VIOLET = '#6C4CF1';
const MUTED = '#5A5A72';
const TRACK = '#ECEAE4';
const ERR = '#C0202C';

export function JoinProjectScreen({ route, navigation }: Props) {
  const { joinByCode } = useProjects();
  const [code, setCode] = useState(normalizeInviteCode(route.params?.code ?? ''));
  const [shareFeed, setShareFeed] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const valid = isValidInviteCode(code);

  const join = async () => {
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    const project = await joinByCode(code, shareFeed);
    setBusy(false);
    if (project) navigation.replace('ProjectDetail', { projectId: project.id });
    else setError('No project found for that code. Double-check it with whoever invited you.');
  };

  return (
    <ScreenContainer backgroundColor={BG}>
      <View style={styles.topbar}>
        <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Close" hitSlop={12}>
          <Text style={styles.chevron}>‹</Text>
        </Pressable>
        <Text style={styles.title} accessibilityRole="header">
          Join a project
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.lead}>Enter the invite code someone shared with you.</Text>

        <TextInput
          value={code}
          onChangeText={(t) => setCode(normalizeInviteCode(t))}
          placeholder="CODE"
          placeholderTextColor={MUTED}
          style={styles.codeInput}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={6}
          accessibilityLabel="Invite code"
        />

        <View style={styles.consent}>
          <View style={{ flex: 1 }}>
            <Text style={styles.consentTitle}>Share my activity</Text>
            <Text style={styles.consentBody}>
              Let members see the habits you complete for this project (name + time). Your contributions count toward
              the goal either way.
            </Text>
          </View>
          <Switch value={shareFeed} onValueChange={setShareFeed} accessibilityLabel="Share my activity in this project" />
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable
          onPress={() => void join()}
          disabled={!valid || busy}
          accessibilityRole="button"
          accessibilityLabel="Join project"
          style={[styles.cta, (!valid || busy) && styles.ctaOff]}
        >
          <Text style={styles.ctaText}>Join project</Text>
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm },
  chevron: { fontSize: 30, lineHeight: 30, color: INK, width: 28 },
  title: { ...typography.heading, color: INK },
  content: { gap: spacing.md, paddingBottom: spacing.xl },
  lead: { ...typography.body, color: MUTED },
  codeInput: {
    ...typography.heading,
    color: INK,
    backgroundColor: CARD,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: TRACK,
    textAlign: 'center',
    letterSpacing: 8,
  },
  consent: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: CARD, borderRadius: 16, padding: spacing.md },
  consentTitle: { ...typography.label, color: INK, fontWeight: '700' },
  consentBody: { ...typography.caption, color: MUTED, marginTop: 2 },
  error: { ...typography.caption, color: ERR },
  cta: { backgroundColor: VIOLET, borderRadius: 999, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.sm },
  ctaOff: { opacity: 0.4 },
  ctaText: { ...typography.label, color: '#FFFFFF', fontWeight: '800' },
});
