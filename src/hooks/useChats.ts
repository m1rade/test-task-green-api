import { useCallback, useEffect, useState } from 'react'
import { getErrorMessage, type GreenApi } from '@/api/greenApi'
import type { Chat } from '@/types/Api'

interface ChatsState {
  /** Which api instance and reload produced this result */
  api: GreenApi | null
  reloadKey: number
  chats: Chat[] | null
  error: string | null
}

/** Loads the chat list for the current session; reloads when api changes */
export function useChats(api: GreenApi | null) {
  const [reloadKey, setReloadKey] = useState(0)
  const [state, setState] = useState<ChatsState>({ api: null, reloadKey: 0, chats: null, error: null })

  useEffect(() => {
    if (!api) return

    const controller = new AbortController()
    api.getChats(undefined, controller.signal).then((result) => {
      if (controller.signal.aborted) return
      setState({
        api,
        reloadKey,
        chats: result.ok ? (result.data ?? []) : null,
        error: result.ok ? null : getErrorMessage(result.error),
      })
    })
    return () => controller.abort()
  }, [api, reloadKey])

  const reload = useCallback(() => setReloadKey((key) => key + 1), [])

  const updateChats = (update: (chats: Chat[]) => Chat[]) => {
    setState((prev) => {
      if (!prev.chats) return prev
      const chats = update(prev.chats)
      return chats === prev.chats ? prev : { ...prev, chats }
    })
  }

  /** A new message arrived in a chat that isn't open; unknown chats are added on top */
  const incrementUnread = (chatId: string) => {
    updateChats((chats) => {
      if (!chats.some((chat) => chat.id === chatId)) {
        const type = chatId.endsWith('@g.us') ? 'group' : 'user'
        return [{ id: chatId, name: '', type, archive: false, unreadCount: 1 }, ...chats]
      }
      return chats.map((chat) => (chat.id === chatId ? { ...chat, unreadCount: chat.unreadCount + 1 } : chat))
    })
  }

  /** The chat was opened: its messages are no longer new */
  const clearUnread = (chatId: string) => {
    updateChats((chats) => {
      if (!chats.some((chat) => chat.id === chatId && chat.unreadCount > 0)) return chats
      return chats.map((chat) => (chat.id === chatId ? { ...chat, unreadCount: 0 } : chat))
    })
  }

  // A result from a previous session or an earlier load is stale
  const isCurrent = state.api === api && state.reloadKey === reloadKey

  return {
    chats: isCurrent ? state.chats : null,
    error: isCurrent ? state.error : null,
    isLoading: Boolean(api) && !isCurrent,
    reload,
    incrementUnread,
    clearUnread,
  }
}
