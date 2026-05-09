/**
 * Badge CSS: .badge, .badge-pass, .badge-warn, .badge-fail, .badge-neutral.
 */
export const BADGES_CSS = `
.badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.4;
}
.badge-pass {
  background: var(--status-pass);
  color: white;
}
.badge-warn {
  background: var(--status-warn);
  color: white;
}
.badge-fail {
  background: var(--status-fail);
  color: white;
}
.badge-neutral {
  background: var(--border);
  color: var(--fg);
}`;
