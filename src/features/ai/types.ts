export type ConversationSummary = {
  id: string
  title: string
  createdAt: string
  updatedAt: string
}

export type ConversationMessage = {
  id: string
  role: "USER" | "ASSISTANT"
  content: string
  createdAt: string
}

export type SelectedConversation = ConversationSummary & {
  messages: ConversationMessage[]
}

export type SendMessageResponse = {
  conversation: ConversationSummary
  messages: ConversationMessage[]
}

export type AiErrorResponse = {
  error: string
  code: string
}
