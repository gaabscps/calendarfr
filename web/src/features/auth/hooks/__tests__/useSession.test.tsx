import { act, renderHook, waitFor } from '@testing-library/react';

import { useSession } from '../useSession';

// Mock sessions only carry { user: { id, email } } — typing as Session would
// force every test to fabricate app_metadata/user_metadata/aud/created_at,
// adding no real safety. The tests assert on shape, not on Session conformance.
type Listener = (_event: string, _session: unknown) => void;

const mockGetSession = jest.fn();
const mockOnAuthStateChange = jest.fn();
const mockUnsubscribe = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
      onAuthStateChange: (...args: unknown[]) => mockOnAuthStateChange(...args),
    },
  },
}));

beforeEach(() => {
  mockGetSession.mockReset();
  mockOnAuthStateChange.mockReset();
  mockUnsubscribe.mockReset();
  mockOnAuthStateChange.mockImplementation(() => ({
    data: { subscription: { unsubscribe: mockUnsubscribe } },
  }));
});

describe('useSession', () => {
  it('starts with loading=true and resolves to session=null when no cached session', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    const { result } = renderHook(() => useSession());
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.session).toBeNull();
  });

  it('resolves to cached session when present', async () => {
    const fakeSession = { user: { id: 'u1', email: 'a@b.com' } };
    mockGetSession.mockResolvedValue({ data: { session: fakeSession } });
    const { result } = renderHook(() => useSession());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.session).toEqual(fakeSession);
  });

  it('updates state on SIGNED_IN event', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    let listener: Listener | undefined;
    mockOnAuthStateChange.mockImplementation((cb: Listener) => {
      listener = cb;
      return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
    });
    const { result } = renderHook(() => useSession());
    await waitFor(() => expect(result.current.loading).toBe(false));
    const newSession = { user: { id: 'u2', email: 'b@c.com' } };
    act(() => listener?.('SIGNED_IN', newSession));
    expect(result.current.session).toEqual(newSession);
  });

  it('clears state on SIGNED_OUT event', async () => {
    const fakeSession = { user: { id: 'u1', email: 'a@b.com' } };
    mockGetSession.mockResolvedValue({ data: { session: fakeSession } });
    let listener: Listener | undefined;
    mockOnAuthStateChange.mockImplementation((cb: Listener) => {
      listener = cb;
      return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
    });
    const { result } = renderHook(() => useSession());
    await waitFor(() => expect(result.current.session).toEqual(fakeSession));
    act(() => listener?.('SIGNED_OUT', null));
    expect(result.current.session).toBeNull();
  });

  it('unsubscribes on unmount', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    const { unmount } = renderHook(() => useSession());
    await waitFor(() => expect(mockOnAuthStateChange).toHaveBeenCalled());
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it('still resolves loading=false when getSession rejects', async () => {
    mockGetSession.mockRejectedValue(new Error('network'));
    let listener: Listener | undefined;
    mockOnAuthStateChange.mockImplementation((cb: Listener) => {
      listener = cb;
      return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
    });
    const { result } = renderHook(() => useSession());
    act(() => listener?.('INITIAL_SESSION', null));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.session).toBeNull();
  });

  it('does not update state after unmount when getSession resolves late', async () => {
    let resolveGetSession: ((_value: { data: { session: null } }) => void) | undefined;
    mockGetSession.mockReturnValue(
      new Promise((resolve) => {
        resolveGetSession = resolve;
      }),
    );
    const { result, unmount } = renderHook(() => useSession());
    unmount();
    act(() => resolveGetSession?.({ data: { session: null } }));
    await new Promise((r) => setTimeout(r, 0));
    expect(result.current.loading).toBe(true);
  });

  it('handles TOKEN_REFRESHED event idempotently (state stays consistent)', async () => {
    const fakeSession = { user: { id: 'u1', email: 'a@b.com' } };
    mockGetSession.mockResolvedValue({ data: { session: fakeSession } });
    let listener: Listener | undefined;
    mockOnAuthStateChange.mockImplementation((cb: Listener) => {
      listener = cb;
      return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
    });
    const { result } = renderHook(() => useSession());
    await waitFor(() => expect(result.current.session).toEqual(fakeSession));
    act(() => listener?.('TOKEN_REFRESHED', fakeSession));
    expect(result.current.session).toEqual(fakeSession);
    expect(result.current.loading).toBe(false);
  });

  it('handles USER_UPDATED event (e.g. email changed) by replacing session', async () => {
    const oldSession = { user: { id: 'u1', email: 'old@b.com' } };
    const newSession = { user: { id: 'u1', email: 'new@b.com' } };
    mockGetSession.mockResolvedValue({ data: { session: oldSession } });
    let listener: Listener | undefined;
    mockOnAuthStateChange.mockImplementation((cb: Listener) => {
      listener = cb;
      return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
    });
    const { result } = renderHook(() => useSession());
    await waitFor(() => expect(result.current.session).toEqual(oldSession));
    act(() => listener?.('USER_UPDATED', newSession));
    expect(result.current.session).toEqual(newSession);
  });

  it('INITIAL_SESSION and getSession resolving with same session do not flicker', async () => {
    const fakeSession = { user: { id: 'u1', email: 'a@b.com' } };
    mockGetSession.mockResolvedValue({ data: { session: fakeSession } });
    let listener: Listener | undefined;
    mockOnAuthStateChange.mockImplementation((cb: Listener) => {
      listener = cb;
      return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
    });
    const renders: boolean[] = [];
    const { result } = renderHook(() => {
      const s = useSession();
      renders.push(s.loading);
      return s;
    });
    act(() => listener?.('INITIAL_SESSION', fakeSession));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.session).toEqual(fakeSession);
    expect(renders.filter((l) => l === true).length).toBeLessThanOrEqual(2);
  });
});
