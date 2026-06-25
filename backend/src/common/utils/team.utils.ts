export const TEAM_LABELS = ['A', 'B', 'C', 'D'] as const;

export type TeamLabel = (typeof TEAM_LABELS)[number];

export function teamLabelForIndex(index: number): TeamLabel {
  return TEAM_LABELS[index];
}

export function shuffleAndSplit<T>(items: T[], teamCount: number): T[][] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const teams: T[][] = Array.from({ length: teamCount }, () => []);
  shuffled.forEach((item, index) => {
    teams[index % teamCount].push(item);
  });
  return teams;
}
