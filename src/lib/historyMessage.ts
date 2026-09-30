import type { HistoryMessage } from '@/types/Api'
import type { ChatMessage } from '@/types/Message'
import { formatPhone, phoneFromChatId } from './phone'

/** Shown for messages without text: media, stickers, polls, etc. */
const TYPE_LABELS: Record<string, string> = {
  imageMessage: '📷 Фото',
  videoMessage: '🎥 Видео',
  audioMessage: '🎤 Аудио',
  documentMessage: '📄 Документ',
  stickerMessage: 'Стикер',
  locationMessage: '📍 Геолокация',
  contactMessage: '👤 Контакт',
  pollMessage: '📊 Опрос',
}

function getText(message: HistoryMessage): string {
  if (message.textMessage) return message.textMessage
  const label = TYPE_LABELS[message.typeMessage] ?? 'Сообщение не поддерживается'
  const details = message.caption || message.fileName
  return details ? `${label}: ${details}` : label
}

function getSenderName(message: HistoryMessage): string | undefined {
  if (message.type !== 'incoming') return undefined
  if (message.senderName) return message.senderName
  const phone = message.senderId ? phoneFromChatId(message.senderId) : null
  return phone ? formatPhone(phone) : message.senderId
}

export function historyToChatMessage(message: HistoryMessage, isGroup: boolean): ChatMessage {
  return {
    id: message.idMessage,
    direction: message.type,
    text: getText(message),
    timestamp: message.timestamp,
    status: message.type === 'outgoing' ? (message.statusMessage ?? 'sent') : undefined,
    senderName: isGroup ? getSenderName(message) : undefined,
  }
}

/**
 * History from the server (newest first) merged with local messages:
 * server versions win, local-only ones (pending, failed, not yet in history) are kept.
 * Result is sorted oldest first, as shown in the chat.
 */
export function mergeHistory(history: HistoryMessage[], local: ChatMessage[], isGroup: boolean): ChatMessage[] {
  const fromServer = history
    // Reactions are attached to other messages, not separate bubbles
    .filter((message) => message.typeMessage !== 'reactionMessage')
    .map((message) => historyToChatMessage(message, isGroup))
  const serverIds = new Set(fromServer.map((message) => message.id))
  const localOnly = local.filter((message) => !serverIds.has(message.id))

  return [...fromServer, ...localOnly].sort((a, b) => a.timestamp - b.timestamp)
}
