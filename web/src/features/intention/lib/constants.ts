/**
 * UI cap pra intention. O server NÃO valida tamanho (evita rejeição silenciosa);
 * o client garante o limite no input e trimma antes de salvar.
 */
export const MAX_INTENTION_LENGTH = 40;

/**
 * Exemplos rotativos de palavra do dia. Rotacionam como placeholder no input
 * vazio (a cada PLACEHOLDER_ROTATION_MS), ensinando por padrão visual o que
 * escrever sem texto educativo prolixo.
 */
export const INTENTION_EXAMPLES = ['foco', 'calma', 'presença', 'coragem', 'leveza'] as const;

/** Intervalo de rotação do placeholder de exemplo. */
export const PLACEHOLDER_ROTATION_MS = 3000;

/** Microcopy de explicação — usado como tooltip (title nativo) e ARIA description. */
export const INTENTION_HELP = 'Uma palavra pra ancorar o dia. Funciona melhor pela manhã.';

/** Label visível no chip vazio. ✨ sinaliza "ritual/intencional" sem ser cute demais. */
export const INTENTION_EMPTY_LABEL = '✨ palavra do dia';
