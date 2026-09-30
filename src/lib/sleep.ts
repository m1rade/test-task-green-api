/**
 * Waits for `ms` milliseconds. Resolves early (without throwing) if the signal
 * is aborted, so polling loops can simply re-check `signal.aborted` afterwards.
 */
export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted) return resolve()

    const done = () => {
      clearTimeout(timer)
      signal?.removeEventListener('abort', done)
      resolve()
    }
    const timer = setTimeout(done, ms)
    signal?.addEventListener('abort', done, { once: true })
  })
}

/** Resolves when the browser reports it is back online, or when the signal is aborted */
export function waitForOnline(signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted || navigator.onLine) return resolve()

    const done = () => {
      window.removeEventListener('online', done)
      signal?.removeEventListener('abort', done)
      resolve()
    }
    window.addEventListener('online', done, { once: true })
    signal?.addEventListener('abort', done, { once: true })
  })
}

/** Pause before the next receiveNotification after `failures` errors in a row */
export function getRetryDelay(failures: number, isRateLimited: boolean): number {
  const base = isRateLimited ? 5_000 : 2_000
  const max = 60_000
  return Math.min(max, base * 2 ** (failures - 1))
}