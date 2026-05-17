let value = false;
const listeners = new Set<() => void>();

export function getReadonlyVisible(): boolean {
  return value;
}

export function setReadonlyVisible(next: boolean): void {
  if (value === next) return;
  value = next;
  listeners.forEach((fn) => fn());
}

export function subscribeReadonlyVisible(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
