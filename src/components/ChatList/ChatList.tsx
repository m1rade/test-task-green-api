import type { Chat } from '@/types/Api'
import { ChatListItem } from './ChatListItem'
import s from './ChatList.module.css'

interface ChatListProps {
  chats: Chat[] | null
  isLoading?: boolean
  error?: string | null
  activeChatId?: string | null
  onChatSelect: (chatId: string) => void
  onNewChatClick?: () => void
  onRetry?: () => void
  onLogoutClick?: () => void
}

function NewChatIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 11.5a8.4 8.4 0 0 1-12.3 7.5L3 21l2-5.7A8.5 8.5 0 1 1 21 11.5Z" />
      <path d="M12 8v7M8.5 11.5h7" />
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5M21 12H9" />
    </svg>
  )
}

export function ChatList({
  chats,
  isLoading = false,
  error,
  activeChatId,
  onChatSelect,
  onNewChatClick,
  onRetry,
  onLogoutClick,
}: ChatListProps) {
  return (
    <section className={s.chatList}>
      <header className={s.header}>
        <h1 className={s.title}>WhatsApp через GREEN-API</h1>
        <div className={s.actions}>
          {onNewChatClick && (
            <button
              className={s.iconBtn}
              type="button"
              onClick={onNewChatClick}
              aria-label="Новый чат"
              title="Новый чат"
            >
              <NewChatIcon />
            </button>
          )}
          <button className={s.logoutBtn} type="button"
            aria-label='Выйти'
            title='Выйти'
            onClick={onLogoutClick}>
            <LogoutIcon />
            Выйти
          </button>
        </div>
      </header>

      <div className={s.scroll}>
        {isLoading ? (
          <ul className={s.list} aria-busy="true" aria-label="Загрузка чатов">
            {Array.from({ length: 8 }, (_, index) => (
              <li key={index} className={s.skeleton}>
                <span className={s.skeletonAvatar} />
                <span className={s.skeletonLines}>
                  <span className={s.skeletonLine} />
                  <span className={s.skeletonLine} />
                </span>
              </li>
            ))}
          </ul>
        ) : error ? (
          <div className={s.state}>
            <p className={s.error} role="alert">
              {error}
            </p>
            {onRetry && (
              <button className={s.retryBtn} type="button" onClick={onRetry}>
                Повторить
              </button>
            )}
          </div>
        ) : !chats?.length ? (
          <div className={s.state}>
            <p className={s.empty}>Чатов пока нет. Начните новый по номеру телефона</p>
          </div>
        ) : (
          <ul className={s.list} aria-label="Чаты">
            {chats.map((chat) => (
              <ChatListItem
                key={chat.id}
                chat={chat}
                isActive={chat.id === activeChatId}
                onClick={onChatSelect}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
