import { useId } from 'react';

import { MISSIONS_BY_GROUP } from '../lib/missions.js';
import type { MissionId } from '../types.js';

import { QuestItem } from './QuestItem.js';
import styles from './QuestList.module.css';
import { RulebookHeader } from './RulebookHeader.js';

const GROUP_EMOJIS: Record<'Manhã' | 'Meio' | 'Noite', string> = {
  Manhã: '🌅',
  Meio: '☀️',
  Noite: '🌙',
};

const GROUPS: ('Manhã' | 'Meio' | 'Noite')[] = ['Manhã', 'Meio', 'Noite'];

export interface QuestListProps {
  missionsCompleted: Record<MissionId, string | null>;
  ariaLiveMessage?: string;
}

function QuestGroup({
  group,
  missionsCompleted,
}: {
  group: 'Manhã' | 'Meio' | 'Noite';
  missionsCompleted: Record<MissionId, string | null>;
}) {
  const headerId = useId();
  return (
    <div role="group" aria-labelledby={headerId} className={styles.group}>
      <RulebookHeader emoji={GROUP_EMOJIS[group]} label={group} headerId={headerId} />
      {MISSIONS_BY_GROUP[group].map((mission) => (
        <QuestItem
          key={mission.id}
          mission={mission}
          completed={missionsCompleted[mission.id] !== null}
        />
      ))}
    </div>
  );
}

export function QuestList({ missionsCompleted, ariaLiveMessage }: QuestListProps) {
  return (
    <div className={styles.wrapper}>
      <div role="status" aria-live="polite" className={styles.visuallyHidden}>
        {ariaLiveMessage}
      </div>

      <div role="list" className={styles.list}>
        {GROUPS.map((group) => (
          <QuestGroup key={group} group={group} missionsCompleted={missionsCompleted} />
        ))}
      </div>
    </div>
  );
}
