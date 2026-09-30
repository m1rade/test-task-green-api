import { useEffect, useEffectEvent } from 'react'
import type { GreenApi, GreenApiError } from '@/api/greenApi'
import { getRetryDelay, sleep, waitForOnline } from '@/lib/sleep'
import type { NotificationBody } from '@/types/Notifications'

/** Seconds the server holds each receiveNotification request while the queue is empty */
const RECEIVE_TIMEOUT = 5

export interface NotificationErrorInfo {
  error: GreenApiError
  /** false when polling has stopped for good (wrong or revoked credentials) */
  willRetry: boolean
  /** Pause before the next attempt; null while waiting for the network to come back */
  retryInMs: number | null
}

interface UseNotificationsOptions {
  /** Called for every notification; it is deleted from the queue afterwards, even if this throws */
  onSuccess: (body: NotificationBody) => void | Promise<void>
  /** Called when receiveNotification fails */
  onError?: (info: NotificationErrorInfo) => void
}

export function useNotifications(api: GreenApi | null, { onSuccess, onError }: UseNotificationsOptions) {
  const handleNotification = useEffectEvent(onSuccess)
  const handleError = useEffectEvent((info: NotificationErrorInfo) => onError?.(info))

  useEffect(() => {
    if (!api) return

    const abortController = new AbortController()

    const poll = async () => {
      // Consecutive failed requests; the pause grows with each one
      let failures = 0

      while (!abortController.signal.aborted) {
        const res = await api.receiveNotification(RECEIVE_TIMEOUT, abortController.signal)
        if (abortController.signal.aborted) return

        if (!res.ok) {
          if (res.error.status === 401 || res.error.status === 403) {
            handleError({ error: res.error, willRetry: false, retryInMs: null })
            return
          }

          failures += 1

          // No network: wait until the browser is back online instead of retrying blindly
          if (res.error.kind === 'network' && !navigator.onLine) {
            handleError({ error: res.error, willRetry: true, retryInMs: null })
            await waitForOnline(abortController.signal)
            continue
          }

          // 429 Too Many Requests, network hiccups, timeouts, 5xx: back off and retry
          const retryInMs = getRetryDelay(failures, res.error.status === 429)
          handleError({ error: res.error, willRetry: true, retryInMs })
          await sleep(retryInMs, abortController.signal)
          continue
        }

        failures = 0

        if (res.data == null) continue

        try {
          await handleNotification(res.data.body)
        } catch (cause) {
          // A broken handler must not block the queue: the notification is still deleted below
          console.error('Failed to handle notification', res.data.body, cause)
        }

        // Delete even if the handler stopped polling (e.g. logout on notAuthorized):
        // the notification is processed, and left in the queue it would come back after the next login
        await api.deleteNotification(res.data.receiptId)
        if (abortController.signal.aborted) return
      }
    }

    poll()

    return () => abortController.abort()
  }, [api])
}
