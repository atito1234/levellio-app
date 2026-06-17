/**
 * Seed the curated "featured 5" community projects into Firestore. Run once
 * against your Firebase project after enabling Firestore + Auth.
 *
 *   EXPO_PUBLIC_FIREBASE_API_KEY=... \
 *   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=... \
 *   EXPO_PUBLIC_FIREBASE_PROJECT_ID=... \
 *   EXPO_PUBLIC_FIREBASE_APP_ID=... \
 *   node --import tsx scripts/seedProjects.ts
 *
 * Idempotent: writes each featured project by its stable id, so re-running just
 * refreshes the content. Members/contributions are NOT touched.
 */
import { initializeApp } from 'firebase/app';
import { doc, getFirestore, setDoc } from 'firebase/firestore';
import { FEATURED_PROJECTS } from '../src/services/projects/featuredProjects';

const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

async function main(): Promise<void> {
  if (!config.apiKey || !config.projectId) {
    throw new Error('Set EXPO_PUBLIC_FIREBASE_* env vars before running the seed.');
  }
  const db = getFirestore(initializeApp(config));
  const now = Date.now();
  for (const seed of FEATURED_PROJECTS) {
    await setDoc(
      doc(db, 'projects', seed.id),
      {
        title: seed.title,
        emoji: seed.emoji,
        colorId: seed.colorId,
        region: seed.region,
        summary: seed.summary,
        unit: seed.unit,
        weeklyGoal: seed.weeklyGoal,
        featured: true,
        ownerUid: 'levellio',
        inviteCode: seed.inviteCode,
        suggestedHabits: seed.suggestedHabits,
        reward: seed.reward,
        memberCount: 0,
        createdAt: now,
      },
      { merge: true },
    );
    // eslint-disable-next-line no-console
    console.log(`seeded ${seed.id} (${seed.title})`);
  }
  // eslint-disable-next-line no-console
  console.log(`Done — ${FEATURED_PROJECTS.length} featured projects.`);
}

void main();
