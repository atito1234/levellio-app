import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PrimaryButton, ScreenContainer } from '@/components';
import { colors, radii, spacing, typography } from '@/theme';
import { parseMarkdownBlocks, type Block } from '@/content/markdownBlocks';
import { getLegalDoc } from '@/content/legalContent';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Legal'>;

/** Renders a bundled legal document (Privacy / Terms) in-app, offline. */
export function LegalScreen({ route, navigation }: Props) {
  const { t } = useTranslation('common');
  const doc = getLegalDoc(route.params?.doc ?? 'privacy');
  const blocks = useMemo(() => parseMarkdownBlocks(doc.markdown), [doc.markdown]);

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.headerTitle} accessibilityRole="header">
          {doc.title}
        </Text>
        <PrimaryButton label={t('action.close')} variant="ghost" onPress={() => navigation.goBack()} />
      </View>
      <ScrollView
        showsVerticalScrollIndicator
        contentContainerStyle={styles.content}
        accessibilityLabel={t('documentA11y', { title: doc.title })}
      >
        {blocks.map((block, i) => (
          <BlockView key={i} block={block} />
        ))}
      </ScrollView>
    </ScreenContainer>
  );
}

function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case 'heading':
      return (
        <Text
          accessibilityRole="header"
          style={block.level === 1 ? styles.h1 : block.level === 2 ? styles.h2 : styles.h3}
        >
          {block.text}
        </Text>
      );
    case 'list-item':
      return (
        <View style={styles.li}>
          <Text style={styles.bullet}>{block.ordered ? '•' : '•'}</Text>
          <Text style={styles.liText}>{block.text}</Text>
        </View>
      );
    case 'quote':
      return (
        <View style={styles.quote}>
          <Text style={styles.quoteText}>{block.text}</Text>
        </View>
      );
    case 'rule':
      return <View style={styles.rule} />;
    case 'paragraph':
    default:
      return <Text style={styles.p}>{block.text}</Text>;
  }
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  headerTitle: { ...typography.heading, color: colors.textPrimary, flex: 1 },
  content: { gap: spacing.sm, paddingBottom: spacing.xl },
  h1: { ...typography.heading, color: colors.textPrimary, marginTop: spacing.md },
  h2: { ...typography.title, color: colors.textPrimary, marginTop: spacing.md },
  h3: { ...typography.body, fontWeight: '700', color: colors.textPrimary, marginTop: spacing.sm },
  p: { ...typography.body, color: colors.textSecondary },
  li: { flexDirection: 'row', gap: spacing.sm, paddingLeft: spacing.sm },
  bullet: { ...typography.body, color: colors.identity },
  liText: { ...typography.body, color: colors.textSecondary, flex: 1 },
  quote: {
    borderLeftWidth: 3,
    borderLeftColor: colors.identity,
    backgroundColor: colors.violetSoft,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
  },
  quoteText: { ...typography.caption, color: colors.textSecondary },
  rule: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
});
