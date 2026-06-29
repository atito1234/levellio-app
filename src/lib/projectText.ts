/**
 * Localized display text for projects. Featured/seeded projects (stable ids like
 * "proj-malaria") have their title/summary/region/unit/reward translated in the
 * `featured` namespace; member-created projects have no keys, so we fall back to
 * the values stored on the project. Keeps content data id/colour-only and looks
 * up labels at render time.
 */
import type { TFunction } from 'i18next';
import type { Project } from './projects';

export type ProjectText = Pick<Project, 'title' | 'summary' | 'region' | 'unit' | 'reward'>;

/** Resolve a project's user-facing strings, preferring `featured` translations. */
export function localizeProject(
  t: TFunction,
  project: Pick<Project, 'id'> & ProjectText,
): ProjectText {
  const field = (name: keyof ProjectText, fallback: string): string =>
    t(`featured:${project.id}.${name}`, { defaultValue: fallback }) as string;
  return {
    title: field('title', project.title),
    summary: field('summary', project.summary),
    region: field('region', project.region),
    unit: field('unit', project.unit),
    reward: field('reward', project.reward),
  };
}

/**
 * Localized title for a featured project's suggested habit (by index), falling back
 * to the English title stored on the seed for member-created projects.
 */
export function localizeFeaturedHabit(
  t: TFunction,
  projectId: string,
  index: number,
  fallback: string,
): string {
  return t(`featured:${projectId}.habits.${index}`, { defaultValue: fallback }) as string;
}
