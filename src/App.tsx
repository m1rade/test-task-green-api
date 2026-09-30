import { createGreenApi, getErrorMessage } from '@/api/greenApi'
import { clearCredentials } from '@/api/session'
import { ChatList } from '@/components/ChatList'
import { ChatWindow } from '@/components/ChatWindow'
import { LoginForm } from '@/components/LoginForm'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useChatMessages } from '@/hooks/useChatMessages'
import { useChats } from '@/hooks/useChats'
import { useCredentials } from '@/hooks/useCredentials'
import { useNotifications } from '@/hooks/useNotifications'
import { notificationToEvent } from '@/lib/notifications'
import { formatPhone, phoneFromChatId, toChatId } from '@/lib/phone'
import { useMemo, useState } from 'react'
import './App.css'
import { PhoneForm } from './components/PhoneForm'
import type { Chat } from './types/Api'
import type { NotificationBody } from './types/Notifications'

function App() {
  const credentials = useCredentials()
  const [activeChatId, setActiveChatId] = useState<string | null>(null)

  const api = useMemo(() => {
    return credentials ? createGreenApi(credentials) : null
  }, [credentials])

  const {
    chats,
    isLoading: isChatsLoading,
    error: chatsError,
    reload: reloadChats,
    incrementUnread,
    clearUnread,
  } = useChats(api)
  const { getMessages, getHistoryStatus, loadHistory, sendMessage, reset: resetMessages, applyChatEvent } = useChatMessages(api)


  // A chat opened by phone number appears in getChats only after the first
  // message. Put it on top
  const visibleChats = useMemo<Chat[] | null>(() => {
    if (!chats || !activeChatId || chats.some((chat) => chat.id === activeChatId)) return chats
    return [{ id: activeChatId, name: '', type: 'user', archive: false, unreadCount: 0 }, ...chats]
  }, [chats, activeChatId])

  const activeChat = visibleChats?.find((chat) => chat.id === activeChatId)
  const activePhone = activeChatId ? phoneFromChatId(activeChatId) : null
  const activeChatTitle = activeChat?.name || (activePhone ? formatPhone(activePhone) : activeChatId ?? '')

  const handleLogout = () => {
    setActiveChatId(null)
    resetMessages()
    clearCredentials()
  }

  useNotifications(api, {
    onSuccess: (body: NotificationBody) => {
      const event = notificationToEvent(body)
      if (!event) return

      switch (event.type) {
        case 'auth':
          if (event.data.stateInstance === 'notAuthorized') handleLogout()
          return

        case 'message':
          if (event.chatId === activeChatId) {
            applyChatEvent(event)
            return
          }
          // Other chats: only a counter in the list, the message comes with the history when the chat is opened
          incrementUnread(event.chatId)
          return
      }
    },
  })

  const openChat = (chatId: string) => {
    setActiveChatId(chatId)
    clearUnread(chatId)
    loadHistory(chatId)
  }

  const handleSendMessage = (text: string) => {
    if (activeChatId) sendMessage(activeChatId, text)
  }

  const handleRetryHistory = () => {
    if (activeChatId) loadHistory(activeChatId)
  }

  /** Returns an error message for PhoneForm, or nothing if the chat was opened */
  const handleStartChat = async (phone: string) => {
    if (!api) return 'Сессия истекла. Войдите заново'

    const chatId = toChatId(phone)
    const result = await api.checkWhatsapp({ chatId })

    if (!result.ok) {
      // Monthly check quota is exhausted on the Developer plan,
      // but sending may still work — don't block the user
      if (result.error.kind === 'http' && result.error.status === 466) {
        openChat(chatId)
        return
      }
      return getErrorMessage(result.error)
    }

    if (!result.data.existsWhatsapp) {
      return 'Этот номер не зарегистрирован в WhatsApp'
    }

    openChat(chatId)
  }

  const activeHistory = activeChatId ? getHistoryStatus(activeChatId) : null

  return (
    <>
      <ThemeToggle />
      {!credentials ? <div className='auth-container'>
      <LoginForm />
      </div>
        :
        <div className='main-container'>
          <div className='sidebar'>
            <ChatList
              chats={visibleChats}
              isLoading={isChatsLoading}
              error={chatsError}
              activeChatId={activeChatId}
              onChatSelect={openChat}
              onNewChatClick={() => setActiveChatId(null)}
              onRetry={reloadChats}
              onLogoutClick={handleLogout}
            />
          </div>
          <div className='chat-window'>
            {activeChatId ? (
              <ChatWindow
                key={activeChatId}
                chatId={activeChatId}
                title={activeChatTitle}
                messages={getMessages(activeChatId)}
                isLoading={activeHistory?.isLoading}
                error={activeHistory?.error}
                onRetry={handleRetryHistory}
                onSendMessage={handleSendMessage}
              />
            ) : (
              <div className='chat-window-empty'>
                <p className='chat-placeholder'>Выберите чат или введите номер, чтобы начать переписку</p>
                <PhoneForm onSubmit={handleStartChat} />
              </div>
            )}
          </div>
        </div>
      }
    </>
  )
}

export default App
