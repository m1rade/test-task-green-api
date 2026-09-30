import { useEffect, useRef } from 'react'
import { MessageBubble } from '@/components/MessageBubble'
import { MessageInput } from '@/components/MessageInput'
import type { ChatMessage } from '@/types/Message'
import s from './ChatWindow.module.css'

interface ChatWindowProps {
  /** "79991234567@c.us" */
  chatId: string
  /** Contact name or formatted phone shown in the header */
  title: string
  messages: ChatMessage[]
  /** History is being loaded for the first time */
  isLoading?: boolean
  /** History failed to load */
  error?: string | null
  onRetry?: () => void
  onSendMessage: (text: string) => void
}

export function ChatWindow({ title, messages, isLoading = false, error, onRetry, onSendMessage }: ChatWindowProps) {
  const messagesRef = useRef<HTMLDivElement>(null)

  // Keep the newest message in view
  useEffect(() => {
    const container = messagesRef.current
    if (container) container.scrollTop = container.scrollHeight
  }, [messages])

  return (
    <section className={s.chatWindow}>
      <header className={s.header}>
        <h2 className={s.title}>{title}</h2>
      </header>

      <div className={s.messages} ref={messagesRef} role="log" aria-label={`Переписка: ${title}`}>
        {error && (
          <div className={s.notice + ' ' + s.noticeError} role="alert">
            <span>Не удалось загрузить историю: {error}</span>
            {onRetry && (
              <button className={s.retryBtn} type="button" onClick={onRetry}>
                Повторить
              </button>
            )}
          </div>
        )}
        {isLoading && messages.length === 0 ? (
          <p className={s.notice} aria-busy="true">
            Загрузка сообщений…
          </p>
        ) : messages.length === 0 ? (
          !error && <p className={s.notice}>Сообщений пока нет. Напишите первым</p>
        ) : (
          messages.map((message, index) => (
            <MessageBubble
              key={message.id}
              message={message}
              isFirstInGroup={
                index === 0 ||
                messages[index - 1].direction !== message.direction ||
                messages[index - 1].senderName !== message.senderName
              }
            />
          ))
        )}
      </div>

      <MessageInput onSend={onSendMessage} />
    </section>
  )
}
