const KEY = 'soe_save_count';

export function incSaveCount(): number {
  try {
    const n = Number(localStorage.getItem(KEY) ?? '0') + 1;
    localStorage.setItem(KEY, String(n));
    return n;
  } catch {
    return 1;
  }
}

export function messageForSave(n: number): string {
  if (n === 1)  return 'Encrypted! Your key never leaves your browser.';
  if (n === 5)  return 'You’re building a rhythm. Want a daily nudge?';
  if (n === 10) return 'Patterns emerge over time—try adding a tag next.';
  return 'Encrypted and saved securely 🗝️';
}
