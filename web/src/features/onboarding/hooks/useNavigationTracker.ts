import { useEffect, useRef, useState } from 'react';

export function useNavigationTracker(date: string): boolean {
  const prevDate = useRef<string | null>(null);
  const [navOccurred, setNavOccurred] = useState<boolean>(false);

  useEffect(() => {
    if (prevDate.current !== null && prevDate.current !== date) {
      setNavOccurred(true);
    }
    prevDate.current = date;
  }, [date]);

  return navOccurred;
}
