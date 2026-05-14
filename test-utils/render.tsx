import { render } from '@testing-library/react';
import type { RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';

import { UndoQueueProvider } from '@/features/undo-delete';
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
  // Wrapper definido aqui (e passado via `options.wrapper`) garante que
  // `rerender()` retornado pelo RTL re-monte com os mesmos providers — a
  // assinatura padrão de `render(<Tree/>)` perde wrapper no rerender.
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter
        initialEntries={[route]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <UndoQueueProvider>
          <GlobalStyles />
          {children}
        </UndoQueueProvider>
      </MemoryRouter>
    );
  }
  return render(ui, { ...options, wrapper: Wrapper });
}
