import type { ChatMessage, MessageStatus } from '@/types/Message'
import s from './MessageBubble.module.css'

interface MessageBubbleProps {
  message: ChatMessage
  /** First message in a row from the same side — gets the tail */
  isFirstInGroup?: boolean
}

const timeFormatter = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' })

const STATUS_LABELS: Record<MessageStatus, string> = {
  pending: 'Отправляется',
  sent: 'Отправлено',
  delivered: 'Доставлено',
  read: 'Прочитано',
  failed: 'Не отправлено',
  noAccount: 'У получателя нет WhatsApp',
}

function StatusIcon({ status }: { status: MessageStatus }) {
  const common = {
    width: 16,
    height: 11,
    viewBox: '0 0 16 11',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }

  switch (status) {
    case 'pending':
      return (
        <svg {...common} viewBox="0 0 11 11" width={11}>
          <circle cx="5.5" cy="5.5" r="4.5" />
          <path d="M5.5 3v2.5l1.5 1" />
        </svg>
      )
    case 'sent':
      return (
        <svg {...common}>
          <path d="m3 5.5 2.5 2.5L11 2.5" />
        </svg>
      )
    case 'delivered':
    case 'read':
      return (
        <svg {...common}>
          <path d="m1 5.5 2.5 2.5L9 2.5M7.5 8 13 2.5" />
        </svg>
      )
    case 'failed':
    case 'noAccount':
      return (
        <svg {...common} viewBox="0 0 12 12" width={12} height={12}>
          <circle cx="6" cy="6" r="5" />
          <path d="M6 3.5v3M6 8.5v.01" />
        </svg>
      )
  }
}

export function MessageBubble({ message, isFirstInGroup = false }: MessageBubbleProps) {
  const isOutgoing = message.direction === 'outgoing'
  const time = timeFormatter.format(message.timestamp * 1000)
  const status = isOutgoing ? message.status : undefined
  const isError = status === 'failed' || status === 'noAccount'
  const statusText = status ? message.error || STATUS_LABELS[status] : undefined

  const className = [
    s.bubble,
    isOutgoing ? s.outgoing : s.incoming,
    isFirstInGroup && s.withTail,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={[s.row, isOutgoing ? s.rowOutgoing : s.rowIncoming, isFirstInGroup && s.rowFirst].filter(Boolean).join(' ')}>
      <div className={className}>
        {message.senderName && !isOutgoing && isFirstInGroup && (
          <span className={s.sender}>{message.senderName}</span>
        )}
        <span className={s.text}>{message.text}</span>
        {/* Invisible copy of the meta reserves room so the text never runs under it */}
        <span className={s.metaSpacer} aria-hidden="true">
          {time}
          {status && <span className={s.statusSpacer} />}
        </span>
        <span className={s.meta}>
          <time dateTime={new Date(message.timestamp * 1000).toISOString()}>{time}</time>
          {status && (
            <span
              className={s.status + ' ' + (status === 'read' ? s.statusRead : isError ? s.statusError : '')}
              title={statusText}
              aria-label={statusText}
              role="img"
            >
              <StatusIcon status={status} />
            </span>
          )}
        </span>
      </div>
      {isError && <p className={s.error}>{statusText}</p>}
    </div>
  )
}
