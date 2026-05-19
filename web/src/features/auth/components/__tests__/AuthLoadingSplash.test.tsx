import { render, screen } from '@testing-library/react';

import { AuthLoadingSplash } from '../AuthLoadingSplash';

describe('AuthLoadingSplash', () => {
  it('renders a status region', () => {
    render(<AuthLoadingSplash />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('has accessible label "Carregando"', () => {
    render(<AuthLoadingSplash />);
    expect(screen.getByRole('status')).toHaveAccessibleName(/carregando/i);
  });
});
