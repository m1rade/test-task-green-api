import type { InstanceState } from "./Api";

interface MessageData {
  typeMessage: string
  textMessageData?: { textMessage: string }
  extendedTextMessageData?: { text: string }
  fileMessageData?: { caption?: string; fileName?: string }
}

interface SenderData {
  chatId: string
  sender: string
  senderName?: string
  chatName?: string
}

interface InstanceData {
  idInstance: number
  wid: string
  typeInstance: string
}

export interface OutgoingMessageReceived {
  typeWebhook: 'outgoingMessageReceived'
  idMessage: string
  timestamp: number
  instanceData: InstanceData
  senderData: SenderData
  messageData: MessageData
}

export interface StateInstanceChanged {
  typeWebhook: 'stateInstanceChanged'
  instanceData: InstanceData
  timestamp: number
  stateInstance: InstanceState
}

export type NotificationBody = OutgoingMessageReceived | StateInstanceChanged
