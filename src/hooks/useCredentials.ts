import { useSyncExternalStore } from 'react'
import { loadCredentials, subscribeToCredentials } from '@/api/session'

/** Current credentials from session storage; re-renders on save/clear */
export function useCredentials() {
  return useSyncExternalStore(subscribeToCredentials, loadCredentials)
}
