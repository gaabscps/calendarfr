import { AccountDockItem, AuthLoadingSplash, AuthPage, useSession } from '@/features/auth';
import { DailyPage } from '@/features/daily-page';
import { Dock } from '@/shared/components/Dock';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Round-trip validation: rejects regex matches that are not real dates
 * ('2026-02-30', '2026-13-99'). Same pattern as usePageNavigation.goToDate.
 */
function readInitialDateFromUrl(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const raw = new URLSearchParams(window.location.search).get('date');
  if (!raw || !ISO_DATE_RE.test(raw)) return undefined;
  const [y, m, d] = raw.split('-').map(Number);
  if (y === undefined || m === undefined || d === undefined) return undefined;
  const utc = new Date(Date.UTC(y, m - 1, d));
  const roundTrip = `${String(utc.getUTCFullYear()).padStart(4, '0')}-${String(utc.getUTCMonth() + 1).padStart(2, '0')}-${String(utc.getUTCDate()).padStart(2, '0')}`;
  return roundTrip === raw ? raw : undefined;
}

export function App() {
  const { session, loading } = useSession();
  if (loading) return <AuthLoadingSplash />;
  if (!session) return <AuthPage />;

  const initialDate = readInitialDateFromUrl();
  return (
    <>
      <DailyPage {...(initialDate ? { initialDate } : {})} />
      <Dock aria-label="Account dock">
        <AccountDockItem />
      </Dock>
    </>
  );
}
