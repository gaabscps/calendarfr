/**
 * Heurística local keyword→emoji para sugerir energy de uma hora a partir
 * do texto do slot. Síncrona, zero deps, determinística.
 *
 * First-match wins: a ordem das regras define a prioridade. Regras mais
 * específicas devem vir antes das mais gerais.
 *
 * Nota sobre \b e caracteres acentuados: \b não reconhece caracteres
 * acentuados como parte de palavras em JS (sem flag /u). Para palavras
 * que começam com letras acentuadas (ex: "Reunião"), usamos lookahead/
 * lookbehind ou simplesmente removemos o \b do início do padrão,
 * pois o /i já cobre o case-insensitive.
 */

interface Rule {
  readonly match: RegExp;
  readonly emoji: string;
}

const RULES: readonly Rule[] = [
  // \b antes de 'r' funciona pois 'r' não é acentuado; o problema é \b
  // antes de caractere acentuado. Para "reunião", o \b antes de 'r' é OK.
  { match: /\b(reuni[ãa]o|meeting|call|1:1|daily|standup)\b/i, emoji: '🤝' },
  {
    match: /\b(foc[ao]|deep ?work|coding|implement|debug|refator)/i,
    emoji: '🎯',
  },
  { match: /\b(almo[çc]o|jantar|caf[ée]|lanche)/i, emoji: '🍕' },
  { match: /\b(exerc[íi]cio|gym|corrida|treino|yoga|muscula[çc][ãa]o)\b/i, emoji: '💪' },
  { match: /\b(cansad[oa]|exausto|sono|sonolent[oa])\b/i, emoji: '😴' },
  { match: /\b(pausa|descanso|break|relax)\b/i, emoji: '☕' },
  { match: /\b(estud[oa]|leitura|li[çc][ãa]o|aprender)\b/i, emoji: '🤔' },
  { match: /\b(sobrecarga|overwhelm|estress|caos)\b/i, emoji: '🤯' },
];

/**
 * Remove tags HTML simples para análise textual.
 * O texto da agenda já é sanitizado em rich-text-line, então não precisamos
 * lidar com casos adversariais — apenas com `<b>`, `<i>`, `<u>`, `<s>`.
 */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

/**
 * Retorna o emoji sugerido para o texto, ou null se nenhuma regra casou.
 * Texto é stripped de HTML e matched case-insensitive.
 */
export function suggestEnergy(text: string): string | null {
  if (!text || text.trim() === '') return null;
  const plain = stripHtml(text);
  for (const rule of RULES) {
    if (rule.match.test(plain)) return rule.emoji;
  }
  return null;
}
