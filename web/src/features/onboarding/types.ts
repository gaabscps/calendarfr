export type MissionId =
  | 'M-INTENTION'
  | 'M-MOOD'
  | 'M-PRIORITY'
  | 'M-FORMAT'
  | 'M-CHECK'
  | 'M-WRITE'
  | 'M-GRATITUDE'
  | 'M-NAVIGATE';

export type OnboardingStatus = 'pending' | 'in_progress' | 'completed' | 'dismissed';

export interface OnboardingState {
  schemaVersion: 1;
  status: OnboardingStatus;
  missionsCompleted: Record<MissionId, string | null>;
  completedAt: string | null;
  completedOnDate: string | null;
}

export interface MissionDef {
  id: MissionId;
  group: 'Manhã' | 'Meio' | 'Noite';
  label: string;
  emoji: string;
}
