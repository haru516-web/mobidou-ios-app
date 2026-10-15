/**
 * Runs `run` now, and again after each of `delays` (ms) for as long as it answers something other than 'ok'.
 * Returns a function that stops it. Used while something the app depends on is not there yet (a new player's
 * server account is made a moment after the first Mobby is chosen), instead of polling for as long as the app is open.
 */
export function retryUntilOk(
  run: () => Promise<'ok' | 'offline'>,
  delays: readonly number[],
  timers: { set: (callback: () => void, ms: number) => unknown; clear: (handle: unknown) => void } = { set: (callback, ms) => setTimeout(callback, ms), clear: handle => clearTimeout(handle as ReturnType<typeof setTimeout>) },
): () => void {
  let stopped = false;
  let handle: unknown;
  const attempt = (index: number) => {
    void run().then(result => {
      if (stopped || result === 'ok' || index >= delays.length) return;
      handle = timers.set(() => attempt(index + 1), delays[index]);
    }, () => {
      if (stopped || index >= delays.length) return;
      handle = timers.set(() => attempt(index + 1), delays[index]);
    });
  };
  attempt(0);
  return () => { stopped = true; if (handle !== undefined) timers.clear(handle); };
}
