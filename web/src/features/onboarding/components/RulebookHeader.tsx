import styles from './RulebookHeader.module.css';

export interface RulebookHeaderProps {
  emoji: string;
  label: 'Manhã' | 'Meio' | 'Noite';
  headerId: string;
}

export function RulebookHeader({ emoji, label, headerId }: RulebookHeaderProps) {
  return (
    <div id={headerId} className={styles.header}>
      {emoji} {label}
    </div>
  );
}
