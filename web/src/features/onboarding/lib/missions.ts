import type { MissionDef, MissionId } from '../types.js';

export const MISSIONS: readonly MissionDef[] = [
  {
    id: 'M-INTENTION',
    group: 'Manhã',
    label: 'Defina a intenção do dia',
    emoji: '🌅',
  },
  {
    id: 'M-MOOD',
    group: 'Manhã',
    label: 'Escolha seu humor',
    emoji: '🌅',
  },
  {
    id: 'M-PRIORITY',
    group: 'Meio',
    label: 'Anote uma prioridade',
    emoji: '☀️',
  },
  {
    id: 'M-FORMAT',
    group: 'Meio',
    label: 'Use a barra flutuante (negrito/itálico)',
    emoji: '☀️',
  },
  {
    id: 'M-CHECK',
    group: 'Meio',
    label: 'Marque uma prioridade como feita',
    emoji: '☀️',
  },
  {
    id: 'M-WRITE',
    group: 'Meio',
    label: 'Escreva na agenda ou em notas',
    emoji: '☀️',
  },
  {
    id: 'M-GRATITUDE',
    group: 'Noite',
    label: 'Registre uma linha de gratidão',
    emoji: '🌙',
  },
];

export const MISSION_IDS: readonly MissionId[] = MISSIONS.map((m) => m.id);

export function getMissionsByGroup(group: 'Manhã' | 'Meio' | 'Noite'): MissionDef[] {
  return MISSIONS.filter((m) => m.group === group);
}

export const MISSIONS_BY_GROUP = {
  Manhã: getMissionsByGroup('Manhã'),
  Meio: getMissionsByGroup('Meio'),
  Noite: getMissionsByGroup('Noite'),
} as const;
