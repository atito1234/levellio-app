/**
 * Local persistence for the user's checklists (per-uid). On-device only
 * (KeyValueStore seam) — personal to the user.
 */
import type { KeyValueStore } from '@/services/storage';
import type { BucketColorId } from '@/lib/buckets';
import type { Checklist, ChecklistItem } from '@/lib/checklist';

const checklistsKey = (uid: string) => `levellio:checklists:${uid}`;

const COLORS: BucketColorId[] = ['violet', 'teal', 'gold', 'rose', 'sky', 'lime', 'slate'];

function normItem(raw: unknown): ChecklistItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as ChecklistItem;
  if (typeof r.id !== 'string' || typeof r.label !== 'string') return null;
  return { id: r.id, label: r.label, ...(typeof r.questId === 'string' ? { questId: r.questId } : {}) };
}

function normalize(raw: unknown): Checklist[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((c): c is Checklist => Boolean(c) && typeof (c as Checklist).id === 'string')
    .map((c, i) => ({
      id: c.id,
      title: typeof c.title === 'string' ? c.title : '',
      emoji: typeof c.emoji === 'string' ? c.emoji : '✅',
      colorId: COLORS.includes(c.colorId) ? c.colorId : 'violet',
      items: Array.isArray(c.items) ? c.items.map(normItem).filter((x): x is ChecklistItem => Boolean(x)) : [],
      recurring: c.recurring !== false,
      createdAt: typeof c.createdAt === 'number' ? c.createdAt : 0,
      order: typeof c.order === 'number' ? c.order : i,
      checkedItemIds: Array.isArray(c.checkedItemIds) ? c.checkedItemIds.filter((x): x is string => typeof x === 'string') : [],
      ...(typeof c.checkedDay === 'string' ? { checkedDay: c.checkedDay } : {}),
      ...(typeof c.lastCheckoutDate === 'string' ? { lastCheckoutDate: c.lastCheckoutDate } : {}),
      checkoutStreak: typeof c.checkoutStreak === 'number' ? c.checkoutStreak : 0,
      ...(c.archived === true ? { archived: true } : {}),
      ...(typeof c.date === 'string' ? { date: c.date } : {}),
      ...(typeof c.goalId === 'string' ? { goalId: c.goalId } : {}),
      ...(typeof c.bucketId === 'string' ? { bucketId: c.bucketId } : {}),
      ...(typeof c.projectId === 'string' ? { projectId: c.projectId } : {}),
    }));
}

export class ChecklistStore {
  constructor(private readonly store: KeyValueStore) {}

  async load(uid: string): Promise<Checklist[]> {
    const raw = await this.store.getItem(checklistsKey(uid));
    if (!raw) return [];
    try {
      return normalize(JSON.parse(raw));
    } catch {
      return [];
    }
  }

  async save(uid: string, checklists: Checklist[]): Promise<void> {
    await this.store.setItem(checklistsKey(uid), JSON.stringify(checklists));
  }
}
