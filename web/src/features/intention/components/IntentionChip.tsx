/**
 * IntentionChip — chip handwritten que mostra (e edita) a "palavra do dia".
 *
 * UX:
 *  - Vazio: chip tracejado "✨ palavra do dia" — convida sem competir.
 *  - Hover/focus: tooltip nativo explica o quê + quando ("Funciona melhor pela manhã.").
 *  - Click → input inline editável. Placeholder ROTACIONA entre exemplos
 *    (foco → calma → presença…) ensinando o que escrever por padrão visual.
 *  - Enter / blur commitam (trim, max 40 chars). Esc cancela.
 *  - Preenchido: palavra em Caveat, sem borda — parece escrito no papel.
 *
 * a11y:
 *  - Botão tem aria-label que cobre o estado (vazio vs preenchido).
 *  - Tooltip via `title` nativo — também acessível via screen reader.
 *  - Input tem maxLength + aria-label próprio.
 *
 * Empty string ⇒ salva como null (sem intenção). Permite "limpar" via input vazio.
 */

import { useCallback, useEffect, useId, useRef, useState } from 'react';

import {
  INTENTION_EMPTY_LABEL,
  INTENTION_EXAMPLES,
  INTENTION_HELP,
  MAX_INTENTION_LENGTH,
  PLACEHOLDER_ROTATION_MS,
} from '../lib/constants.js';

import styles from './IntentionChip.module.css';

export interface IntentionChipProps {
  /** Intenção atual, ou null se não definida. */
  value: string | null;
  /** Emitido com a nova intenção (null = limpou). */
  onChange: (next: string | null) => void;
}

export function IntentionChip({ value, onChange }: IntentionChipProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<string>(value ?? '');
  const [exampleIndex, setExampleIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  // Mantém draft em sync quando o `value` externo muda enquanto NÃO editando
  // (ex: troca de data). Editing tem prioridade sobre value externo.
  useEffect(() => {
    if (!isEditing) setDraft(value ?? '');
  }, [value, isEditing]);

  // Focus + select all ao entrar em edição.
  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  // Rotação do placeholder de exemplo — apenas quando editando E draft vazio.
  // Para de rodar assim que usuário digita algo (mantém o foco neles).
  useEffect(() => {
    if (!isEditing || draft.length > 0) return;
    const id = setInterval(() => {
      setExampleIndex((prev) => (prev + 1) % INTENTION_EXAMPLES.length);
    }, PLACEHOLDER_ROTATION_MS);
    return () => clearInterval(id);
  }, [isEditing, draft.length]);

  const commit = useCallback(() => {
    const trimmed = draft.trim().slice(0, MAX_INTENTION_LENGTH);
    const next = trimmed.length === 0 ? null : trimmed;
    if (next !== value) onChange(next);
    setIsEditing(false);
  }, [draft, value, onChange]);

  const cancel = useCallback(() => {
    setDraft(value ?? '');
    setIsEditing(false);
  }, [value]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        commit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancel();
      }
    },
    [commit, cancel],
  );

  if (isEditing) {
    const placeholder = `ex: ${INTENTION_EXAMPLES[exampleIndex] ?? 'foco'}`;
    return (
      <div className={styles.wrapper}>
        <label htmlFor={inputId} className={styles.visuallyHidden}>
          Palavra do dia
        </label>
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          className={styles.input}
          value={draft}
          maxLength={MAX_INTENTION_LENGTH}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={commit}
          aria-label="Palavra do dia"
          title={INTENTION_HELP}
        />
      </div>
    );
  }

  const label =
    value !== null ? `Palavra do dia: ${value}. Clique para editar.` : 'Adicionar palavra do dia';

  return (
    <div className={styles.wrapper}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setIsEditing(true)}
        aria-label={label}
        title={INTENTION_HELP}
        data-empty={value === null}
      >
        {value ?? INTENTION_EMPTY_LABEL}
      </button>
    </div>
  );
}
