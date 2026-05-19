import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { AccountDockItem } from '../AccountDockItem';

const mockSignOut = jest.fn();
const mockGetSession = jest.fn();
const mockOnAuthStateChange = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
      onAuthStateChange: (...args: unknown[]) => mockOnAuthStateChange(...args),
      signOut: (...args: unknown[]) => mockSignOut(...args),
    },
  },
}));

beforeEach(() => {
  mockSignOut.mockReset().mockResolvedValue({ error: null });
  mockGetSession.mockReset().mockResolvedValue({
    data: { session: { user: { id: 'u1', email: 'alice@example.com' } } },
  });
  mockOnAuthStateChange.mockReset().mockImplementation(() => ({
    data: { subscription: { unsubscribe: () => {} } },
  }));
});

describe('AccountDockItem', () => {
  it('renders avatar with email initial', async () => {
    render(<AccountDockItem />);
    expect(await screen.findByRole('button', { name: /conta/i })).toHaveTextContent('A');
  });

  it('renders nothing when no session', async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: null } });
    const { container } = render(<AccountDockItem />);
    // Flush the useSession effect's microtask chain inside act() so React
    // commits the post-getSession setState before we assert.
    await act(async () => {
      await Promise.resolve();
    });
    expect(container.querySelector('button')).toBeNull();
  });

  it('opens popover on click and shows email + logout', async () => {
    render(<AccountDockItem />);
    const trigger = await screen.findByRole('button', { name: /conta/i });
    await userEvent.click(trigger);
    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sair/i })).toBeInTheDocument();
  });

  it('closes popover on Escape', async () => {
    render(<AccountDockItem />);
    const trigger = await screen.findByRole('button', { name: /conta/i });
    await userEvent.click(trigger);
    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByText('alice@example.com')).not.toBeInTheDocument();
  });

  it('calls supabase.auth.signOut on Sair click', async () => {
    render(<AccountDockItem />);
    const trigger = await screen.findByRole('button', { name: /conta/i });
    await userEvent.click(trigger);
    await userEvent.click(screen.getByRole('button', { name: /sair/i }));
    expect(mockSignOut).toHaveBeenCalled();
  });

  it('closes popover on outside click', async () => {
    render(
      <div>
        <span data-testid="outside">outside</span>
        <AccountDockItem />
      </div>,
    );
    const trigger = await screen.findByRole('button', { name: /conta/i });
    await userEvent.click(trigger);
    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
    await userEvent.click(screen.getByTestId('outside'));
    expect(screen.queryByText('alice@example.com')).not.toBeInTheDocument();
  });

  it('toggles popover closed when avatar clicked twice', async () => {
    render(<AccountDockItem />);
    const trigger = await screen.findByRole('button', { name: /conta/i });
    await userEvent.click(trigger);
    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
    await userEvent.click(trigger);
    expect(screen.queryByText('alice@example.com')).not.toBeInTheDocument();
  });

  it('reflects open state via aria-expanded', async () => {
    render(<AccountDockItem />);
    const trigger = await screen.findByRole('button', { name: /conta/i });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });

  it('renders fallback initial "?" when session email is missing', async () => {
    mockGetSession.mockResolvedValueOnce({
      data: { session: { user: { id: 'u1', email: null } } },
    });
    render(<AccountDockItem />);
    const trigger = await screen.findByRole('button', { name: /conta/i });
    expect(trigger).toHaveTextContent('?');
  });

  it('closes popover before signOut resolves (no UI lag)', async () => {
    let resolveSignOut: ((_value: { error: null }) => void) | undefined;
    mockSignOut.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveSignOut = resolve;
      }),
    );
    render(<AccountDockItem />);
    const trigger = await screen.findByRole('button', { name: /conta/i });
    await userEvent.click(trigger);
    await userEvent.click(screen.getByRole('button', { name: /sair/i }));
    expect(screen.queryByText('alice@example.com')).not.toBeInTheDocument();
    resolveSignOut?.({ error: null });
  });

  it('returns focus to avatar trigger when Escape closes the popover', async () => {
    render(<AccountDockItem />);
    const trigger = await screen.findByRole('button', { name: /conta/i });
    await userEvent.click(trigger);
    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(trigger).toHaveFocus();
  });
});
