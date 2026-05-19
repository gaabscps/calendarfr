import { useEffect, useRef, useState } from 'react';

import { supabase } from '@/lib/supabase';
import { Button } from '@/shared/components/Button';

import { useSession } from '../hooks/useSession.js';

import styles from './AccountDockItem.module.css';

/**
 * Avatar + popover for the active session. Renders nothing if no session.
 * Clicking the avatar toggles a popover with the user's email and a "Sair"
 * button that calls supabase.auth.signOut. Closes on outside click, Escape,
 * and immediately on signOut (no waiting for the network round-trip).
 */
export function AccountDockItem() {
  const { session } = useSession();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  if (!session) return null;

  const email = session.user.email ?? '';
  const initial = email[0]?.toUpperCase() ?? '?';

  const handleSignOut = () => {
    // Close popover synchronously: UI feedback should not wait for network.
    setOpen(false);
    // Fire-and-forget: useSession listens to onAuthStateChange and will react
    // to the SIGNED_OUT event regardless of when this promise resolves.
    void supabase.auth.signOut();
  };

  return (
    <div ref={containerRef} className={styles.container}>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Conta"
        aria-expanded={open}
        className={styles.avatar}
        onClick={() => setOpen((v) => !v)}
      >
        {initial}
      </button>
      {open ? (
        <div className={styles.popover}>
          <span className={styles.email}>{email}</span>
          <Button variant="danger" size="sm" onClick={handleSignOut}>
            Sair
          </Button>
        </div>
      ) : null}
    </div>
  );
}
