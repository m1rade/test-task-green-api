import type { ChatMessage } from '@/types/Message'
import type { NotificationBody, StateInstanceChanged } from '@/types/Notifications'

export type ChatEvent = { type: 'message'; chatId: string; message: ChatMessage }
export type AuthEvent = { type: 'auth', data: StateInstanceChanged }
/**
 * App events, independent of the Green API format.
 */
export type AppEvent = ChatEvent | AuthEvent

type NotificationType = NotificationBody['typeWebhook']

type NotificationHandlers = {
  [K in NotificationType]: (body: Extract<NotificationBody, { typeWebhook: K }>) => AppEvent | null
}

const handlers: NotificationHandlers = {
  outgoingMessageReceived: (body) => {
    if (body.messageData.typeMessage !== 'textMessage') return null

    return {
      type: 'message',
      chatId: body.senderData.chatId,
      message: {
        id: body.idMessage,
        timestamp: body.timestamp,
        text: body.messageData.textMessageData?.textMessage ?? '',
        direction: 'outgoing',
        status: 'sent',
      },
    }
  },
  stateInstanceChanged: (body) => {
    return { type: 'auth', data: body }
  }
}

function isSupported(typeWebhook: string): typeWebhook is NotificationType {
  return Object.hasOwn(handlers, typeWebhook)
}

/**
 * Converts a notification into an app event.
 * Returns null for types without a handler and for notifications the handler skips.
 */
export function notificationToEvent(body: NotificationBody): AppEvent | null {
  if (!isSupported(body.typeWebhook)) return null

  const handler = handlers[body.typeWebhook] as (body: NotificationBody) => AppEvent | null
  return handler(body)
}

/** Returns the new message list for a chat after the event, or the same list if nothing changed */
export function applyEvent(messages: ChatMessage[], event: ChatEvent): ChatMessage[] {
  switch (event.type) {
    case 'message':
      // The same notification can arrive again if deleteNotification failed
      if (messages.some((message) => message.id === event.message.id)) return messages
      return [...messages, event.message]
  }
}
