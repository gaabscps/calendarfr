import { useOnboardingState } from '../hooks/useOnboardingState.js';
import { setReadonlyVisible } from '../lib/readonlyController.js';

import { HelpButton } from './HelpButton.js';

export function HelpButtonContainer() {
  const { state, reopen } = useOnboardingState();

  function handleClick(): void {
    if (state.status === 'completed') {
      setReadonlyVisible(true);
    } else if (state.status === 'dismissed' || state.status === 'pending') {
      reopen();
    }
  }

  return <HelpButton onClick={handleClick} />;
}
