import type { PillarKey } from "./content";

/** Public display content only. No owner ID, private notes or storage paths. */
interface AchievementDisplay {
  id: string;
  title: string;
  description: string;
  icon: string;
  pillar: PillarKey | null;
}

export type AchievementPresentation = AchievementDisplay &
  (
    | { status: "locked"; unlockedAt: null }
    | { status: "unlocked"; unlockedAt: string }
  );
