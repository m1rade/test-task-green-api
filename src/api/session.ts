import type { Credentials } from '@/types/Credentials'

const STORAGE_KEY = 'green-api-credentials'

type Listener = () => void
const listeners = new Set<Listener>()

function notify() {
  listeners.forEach((listener) => listener())
}

function isCredentials(value: unknown): value is Credentials {
  if (typeof value !== 'object' || value === null) return false
  const { apiUrl, idInstance, apiTokenInstance } = value as Record<string, unknown>
  return typeof apiUrl === 'string' && typeof idInstance === 'string' && typeof apiTokenInstance === 'string'
}

// Parsed value is cached by the raw string, so repeated reads return
// the same object — required by useSyncExternalStore
let cachedRaw: string | null = null
let cachedCredentials: Credentials | null = null

/** Returns saved credentials, or null if there are none or they are corrupted */
export function loadCredentials(): Credentials | null {
  let raw: string | null
  try {
    raw = sessionStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }

  if (raw === cachedRaw) return cachedCredentials

  cachedRaw = raw
  cachedCredentials = null
  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw)
      if (isCredentials(parsed)) cachedCredentials = parsed
    } catch {
      // Corrupted value: treat as logged out
    }
  }
  return cachedCredentials
}

export function saveCredentials(credentials: Credentials): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(credentials))
  } catch {
    // Storage unavailable or full: nothing to persist to
  }
  notify()
}

export function clearCredentials(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // Storage unavailable: nothing to remove
  }
  notify()
}

/** Calls the listener whenever credentials are saved or cleared */
export function subscribeToCredentials(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
