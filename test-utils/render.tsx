import { render } from '@testing-library/react';
import type { RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';

import { GlobalStyles } from '@/shared/components/theme';

export * from '@testing-library/react';
export { userEvent };

interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  route?: string;
}

export function renderWithProviders(
  ui: ReactNode,
  { route = '/', ...options }: RenderWithProvidersOptions = {},
) {
  return render(
    <MemoryRouter
      initialEntries={[route]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <>
        <GlobalStyles />
        {ui}
      </>
    </MemoryRouter>,
    options,
  );
}
