import { ArrowGoTo } from '../assets/ArrowGoTo.js';
import type { MissionId } from '../types.js';

import styles from './QuestActionButton.module.css';

export interface QuestActionButtonProps {
  missionId: MissionId;
  missionLabel: string;
  onClick: () => void;
}

export function QuestActionButton({ missionLabel, onClick }: QuestActionButtonProps) {
  return (
    <button
      type="button"
      aria-label={`Ir para missão: ${missionLabel}`}
      onClick={onClick}
      className={styles.button}
    >
      <ArrowGoTo />
    </button>
  );
}
