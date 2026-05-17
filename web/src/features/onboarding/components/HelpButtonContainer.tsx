import { useOnboardingState } from '../hooks/useOnboardingState.js';
import { setReadonlyVisible } from '../lib/readonlyController.js';

import { HelpButton } from './HelpButton.js';

export function HelpButtonContainer() {
  const { state, reopen } = useOnboardingState();

  function handleClick(): void {
    if (state.status === 'dismissed' || state.status === 'pending') {
      reopen();
      return;
    }
    // status === 'in_progress' OR 'completed': abre o roteiro em readonly. Necessário porque
    // com a projeção per-day (intersecção persisted ∧ condição) o sticky pode estar escondido
    // mesmo com status global 'in_progress' — basta o dia atual ter 7/7 visíveis. O global
    // 'status' só vira 'completed' UMA vez (primeiro 7/7 da vida) e nunca volta; usá-lo como
    // gating do readonly toggle deixava o "?" mudo em todos os outros dias completos.
    setReadonlyVisible(true);
  }

  return <HelpButton onClick={handleClick} />;
}
