export type MissionId =
  | 'M-INTENTION'
  | 'M-MOOD'
  | 'M-PRIORITY'
  | 'M-FORMAT'
  | 'M-CHECK'
  | 'M-WRITE'
  | 'M-GRATITUDE';

export type OnboardingStatus = 'pending' | 'in_progress' | 'completed' | 'dismissed';

export interface OnboardingState {
  schemaVersion: 2;
  progressByDate: Record<string, Record<MissionId, string | null>>;
  completedAt: string | null;
  completedOnDate: string | null;
  status: OnboardingStatus;
}

export interface MissionDef {
  id: MissionId;
  group: 'Manhã' | 'Meio' | 'Noite';
  label: string;
  emoji: string;
}
