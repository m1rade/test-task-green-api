import { useEffect, useRef, useState } from 'react'
import { getErrorMessage, type GreenApi } from '@/api/greenApi'
import { mergeHistory } from '@/lib/historyMessage'
import { createLocalId } from '@/lib/localId'
import { applyEvent, type ChatEvent } from '@/lib/notifications'
import type { ChatMessage } from '@/types/Message'

/** Messages loaded when a chat is opened */
const HISTORY_COUNT = 100

export interface HistoryStatus {
  isLoading: boolean
  error: string | null
}

const NO_MESSAGES: ChatMessage[] = []
const IDLE_STATUS: HistoryStatus = { isLoading: false, error: null }

export function useChatMessages(api: GreenApi | null) {
  const [messagesByChat, setMessagesByChat] = useState<Record<string, ChatMessage[]>>({})
  const [historyStatus, setHistoryStatus] = useState<Record<string, HistoryStatus>>({})
  /** Only the history of the last opened chat matters — the previous request is cancelled */
  const historyRequestRef = useRef<AbortController | null>(null)

  useEffect(() => () => historyRequestRef.current?.abort(), [])

  const setStatus = (chatId: string, status: HistoryStatus) => {
    setHistoryStatus((prev) => ({ ...prev, [chatId]: status }))
  }

  const updateMessage = (chatId: string, id: string, patch: Partial<ChatMessage>) => {
    setMessagesByChat((prev) => {
      if (!prev[chatId]) return prev
      return {
        ...prev,
        [chatId]: prev[chatId].map((message) => (message.id === id ? { ...message, ...patch } : message)),
      }
    })
  }

  const loadHistory = async (chatId: string) => {
    if (!api) return

    historyRequestRef.current?.abort()
    const controller = new AbortController()
    historyRequestRef.current = controller

    setStatus(chatId, { isLoading: true, error: null })
    const result = await api.getChatHistory({ chatId, count: HISTORY_COUNT }, controller.signal)
    if (controller.signal.aborted) return

    if (!result.ok) {
      setStatus(chatId, { isLoading: false, error: getErrorMessage(result.error) })
      return
    }

    const isGroup = chatId.endsWith('@g.us')
    setMessagesByChat((prev) => ({
      ...prev,
      [chatId]: mergeHistory(result.data ?? [], prev[chatId] ?? [], isGroup),
    }))
    setStatus(chatId, IDLE_STATUS)
  }

  const sendMessage = async (chatId: string, text: string) => {
    if (!api) return

    // Show the message right away; replace the local id once Green API accepts it
    const localId = createLocalId()
    const pending: ChatMessage = {
      id: localId,
      direction: 'outgoing',
      text,
      timestamp: Math.floor(Date.now() / 1000),
      status: 'pending',
    }
    setMessagesByChat((prev) => ({ ...prev, [chatId]: [...(prev[chatId] ?? []), pending] }))

    const result = await api.sendMessage({ chatId, message: text })

    if (result.ok) {
      updateMessage(chatId, localId, { id: result.data.idMessage, status: 'sent' })
    } else {
      updateMessage(chatId, localId, { status: 'failed', error: getErrorMessage(result.error) })
    }
  }

  /** Applies a notification from receiveNotification */
  const applyChatEvent = (event: ChatEvent) => {
    setMessagesByChat((prev) => {
      // The chat may still be loading its history: start the list, mergeHistory keeps the message
      const messages = prev[event.chatId] ?? NO_MESSAGES
      const next = applyEvent(messages, event)
      return next === messages ? prev : { ...prev, [event.chatId]: next }
    })
  }

  /** Forget everything, e.g. on logout */
  const reset = () => {
    historyRequestRef.current?.abort()
    historyRequestRef.current = null
    setMessagesByChat({})
    setHistoryStatus({})
  }

  return {
    getMessages: (chatId: string) => messagesByChat[chatId] ?? NO_MESSAGES,
    getHistoryStatus: (chatId: string) => historyStatus[chatId] ?? IDLE_STATUS,
    loadHistory,
    sendMessage,
    reset,
    applyChatEvent,
  }
}
