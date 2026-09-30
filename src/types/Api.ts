import type { NotificationBody } from "./Notifications"

export type InstanceState =
  | 'notAuthorized'
  | 'authorized'
  | 'blocked'
  | 'starting'
  | 'suspended'
  | 'pendingPassword'

export interface GetStateInstanceResponse {
  stateInstance: InstanceState
}

export interface SendMessageRequest {
  /** "79991234567@c.us" — see toChatId in lib/phone */
  chatId: string
  message: string
}

/** Either chatId ("79991234567@c.us") or the legacy numeric phoneNumber */
export type CheckWhatsappRequest = { chatId: string } | { phoneNumber: number }

export interface CheckWhatsappResponse {
  existsWhatsapp: boolean
  chatId?: string
  username?: string
  /** Empty string if hidden by the user's privacy settings */
  phoneNumber?: string
  fromCache?: boolean
}

export type ChatType = 'user' | 'group' | 'bot' | 'channel'

export interface Chat {
  id: string
  name: string
  type: ChatType
  archive: boolean
  unreadCount: number
  ephemeralExpiration?: number
  ephemeralSettingTimestamp?: number
  newChatId?: string
}

/** Sorted by last activity, newest first */
export type GetChatsResponse = Chat[]

export interface SendMessageResponse {
  idMessage: string
}

export interface ReceiveNotificationResponse {
  receiptId: number
  body: NotificationBody
}

export interface DeleteNotificationResponse {
  result: boolean
  reason: string
}

export interface GetChatHistoryRequest {
  chatId: string
  /** Default on the server: 100 */
  count?: number
}

interface HistoryMessageBase {
  idMessage: string
  /** Unix time in seconds */
  timestamp: number
  /** textMessage, extendedTextMessage, imageMessage, videoMessage, documentMessage, ... */
  typeMessage: string
  chatId: string
  /** Text of textMessage / extendedTextMessage */
  textMessage?: string
  /** Caption of media messages */
  caption?: string
  fileName?: string
}

export interface IncomingHistoryMessage extends HistoryMessageBase {
  type: 'incoming'
  senderId?: string
  senderName?: string
}

export interface OutgoingHistoryMessage extends HistoryMessageBase {
  type: 'outgoing'
  statusMessage?: 'sent' | 'delivered' | 'read' | 'failed' | 'noAccount'
  sendByApi?: boolean
}

export type HistoryMessage = IncomingHistoryMessage | OutgoingHistoryMessage

/** Newest message first */
export type GetChatHistoryResponse = HistoryMessage[]
