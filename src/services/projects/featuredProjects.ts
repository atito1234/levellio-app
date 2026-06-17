/**
 * The curated alpha projects for the Haiti launch. These are the "featured 5"
 * everyone can discover and join. Used to seed the local backend on first run
 * and by scripts/seedProjects.ts to seed Firestore. Plain data, no I/O.
 */
import type { ProjectDraft } from './ProjectsBackend';

/** A featured project plus a stable id + invite code so it's the same everywhere. */
export interface FeaturedProjectSeed extends ProjectDraft {
  id: string;
  inviteCode: string;
}

export const FEATURED_PROJECTS: readonly FeaturedProjectSeed[] = [
  {
    id: 'proj-malaria',
    inviteCode: 'MALARIA',
    title: 'Fort-Liberté Malaria Source Reduction',
    emoji: '🦟',
    colorId: 'teal',
    region: 'Fort-Liberté, Haiti',
    summary:
      'Stop malaria at the source. Drain and clean standing water where mosquitoes breed — every site cleared protects your neighbours.',
    unit: 'sites cleaned',
    weeklyGoal: 60,
    reward: 'Bed nets + larvicide for the most-affected blocks',
    suggestedHabits: [
      { title: 'Clean a standing-water site', category: 'health', contribution: 1 },
      { title: 'Cover a water container', category: 'health', contribution: 1 },
      { title: 'Report a breeding spot', category: 'health', contribution: 1 },
    ],
  },
  {
    id: 'proj-gardens',
    inviteCode: 'HUERTOS',
    title: 'Community Gardens · Huertos',
    emoji: '🌱',
    colorId: 'lime',
    region: 'Ouanaminthe, Haiti',
    summary:
      'Grow food and resilience. Tend shared garden beds so families have fresh vegetables and seedlings to share.',
    unit: 'beds tended',
    weeklyGoal: 40,
    reward: 'Seeds, tools, and a rainwater barrel for the garden',
    suggestedHabits: [
      { title: 'Water the garden', category: 'health', contribution: 1 },
      { title: 'Plant 5 seedlings', category: 'health', contribution: 5 },
      { title: 'Compost food scraps', category: 'health', contribution: 1 },
    ],
  },
  {
    id: 'proj-water',
    inviteCode: 'CLEANH2O',
    title: 'Clean Water Together',
    emoji: '💧',
    colorId: 'sky',
    region: 'Cap-Haïtien, Haiti',
    summary:
      'Safe water, every day. Treat household water and keep collection points clean to cut waterborne illness.',
    unit: 'households treating water',
    weeklyGoal: 80,
    reward: 'Ceramic water filters for participating households',
    suggestedHabits: [
      { title: 'Treat household water', category: 'health', contribution: 1 },
      { title: 'Clean a water collection point', category: 'health', contribution: 2 },
    ],
  },
  {
    id: 'proj-waste',
    inviteCode: 'CLEANUP',
    title: 'Neighbourhood Waste Reduction',
    emoji: '♻️',
    colorId: 'violet',
    region: 'Port-de-Paix, Haiti',
    summary:
      'A cleaner block is a healthier block. Collect, sort, and properly dispose of waste to keep drains and streets clear.',
    unit: 'bags collected',
    weeklyGoal: 50,
    reward: 'Community bins + a monthly collection pickup',
    suggestedHabits: [
      { title: 'Collect a bag of litter', category: 'health', contribution: 1 },
      { title: 'Clear a blocked drain', category: 'health', contribution: 2 },
    ],
  },
  {
    id: 'proj-school',
    inviteCode: 'SCHOOL1',
    title: 'School Kits for Every Child',
    emoji: '🎒',
    colorId: 'rose',
    region: 'Gonaïves, Haiti',
    summary:
      'Keep kids learning. Help children study daily and prepare kits so every child starts the term ready.',
    unit: 'study sessions logged',
    weeklyGoal: 120,
    reward: 'School kits (notebooks, pens, backpacks) for the cohort',
    suggestedHabits: [
      { title: 'Help a child study', category: 'learning', contribution: 1 },
      { title: 'Read aloud for 15 min', category: 'learning', contribution: 1 },
      { title: 'Assemble a school kit', category: 'learning', contribution: 1 },
    ],
  },
];
