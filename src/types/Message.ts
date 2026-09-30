export type MessageDirection = 'incoming' | 'outgoing'

/**
 * pending — not yet accepted by Green API;
 * the rest mirror outgoingMessageStatus from notifications
 */
export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed' | 'noAccount'

export interface ChatMessage {
  /** idMessage from Green API, or a local id while pending */
  id: string
  direction: MessageDirection
  text: string
  timestamp: number
  /** Only for outgoing messages */
  status?: MessageStatus
  error?: string
  senderName?: string
}
