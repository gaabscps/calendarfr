import { useOnboardingState } from '../hooks/useOnboardingState.js';

import { CompletionStamp } from './CompletionStamp.js';

export interface CompletionStampContainerProps {
  date: string;
}

export function CompletionStampContainer({ date }: CompletionStampContainerProps) {
  const { state } = useOnboardingState();
  return <CompletionStamp completedOnDate={state.completedOnDate} currentDate={date} />;
}
