import type { CSSProperties } from 'react'
import { formatPhone, phoneFromChatId } from '@/lib/phone'
import type { Chat } from '@/types/Api'
import s from './ChatListItem.module.css'
import { getInitials } from '@/lib/initials'
import { hueFromId } from '@/lib/hueFromId'

interface ChatListItemProps {
  chat: Chat
  isActive: boolean
  onClick: (chatId: string) => void
}

function PersonIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-3.3 0-8 1.7-8 5v1h16v-1c0-3.3-4.7-5-8-5Z" />
    </svg>
  )
}

function GroupIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm7.5 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM9 13c-2.7 0-7 1.3-7 4v2h14v-2c0-2.7-4.3-4-7-4Zm7.5 0c-.4 0-.8 0-1.3.1 1.1.8 1.8 2 1.8 3.9v2h5v-2c0-2.5-3.5-4-5.5-4Z" />
    </svg>
  )
}

export function ChatListItem({ chat, isActive, onClick }: ChatListItemProps) {
  const phone = phoneFromChatId(chat.id)
  const formattedPhone = phone ? formatPhone(phone) : null
  const title = chat.name || formattedPhone || 'Без имени'
  const subtitle = chat.type === 'group' ? 'Группа' : chat.name && formattedPhone ? formattedPhone : ''
  const initials = chat.type === 'user' ? getInitials(chat.name) : ''

  return (
    <li>
      <button
        className={s.item + (isActive ? ' ' + s.active : '')}
        type="button"
        onClick={() => onClick(chat.id)}
        aria-current={isActive ? 'true' : undefined}
      >
        <span className={s.avatar} style={{ '--avatar-hue': hueFromId(chat.id) } as CSSProperties}>
          {initials || (chat.type === 'group' ? <GroupIcon /> : <PersonIcon />)}
        </span>

        <span className={s.body}>
          <span className={s.row}>
            <span className={s.title}>{title}</span>
          </span>
          {chat.unreadCount > 0 ? (
            <span className={s.row}>
              <span className={s.subtitle + ' ' + s.newMessage}>
                Новое сообщение +{chat.unreadCount > 99 ? '99' : chat.unreadCount}
              </span>
            </span>
          ) : (
            subtitle && (
              <span className={s.row}>
                <span className={s.subtitle}>{subtitle}</span>
              </span>
            )
          )}
        </span>
      </button>
    </li>
  )
}
