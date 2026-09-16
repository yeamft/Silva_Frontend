/** Simulated latency. Replace callers with real fetch when the API exists. */
export function mockDelay(ms = 280): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function newId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function isoNow(): string {
  return new Date().toISOString();
}
