import { screen } from '@testing-library/react';

import { PaperSheet } from './PaperSheet';

import { renderWithProviders } from '@/test-utils';

describe('PaperSheet (integration)', () => {
  it('renderiza dentro de Router + GlobalStyles sem warnings', () => {
    renderWithProviders(<PaperSheet>conteúdo</PaperSheet>);
    expect(screen.getByText('conteúdo')).toBeInTheDocument();
  });

  it('renderiza com data-paper-sheet quando usa renderWithProviders', () => {
    renderWithProviders(<PaperSheet>integração</PaperSheet>);
    const el = screen.getByText('integração').closest('[data-paper-sheet="true"]');
    expect(el).toBeInTheDocument();
  });
});
