"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Loader2,
  MessageSquare,
  Plus,
  Send,
  Sparkles,
  Trash2,
} from "lucide-react"
import type {
  AiErrorResponse,
  ConversationMessage,
  ConversationSummary,
  SelectedConversation,
  SendMessageResponse,
} from "@/features/ai/types"
import { Button } from "@/shared/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog"
import { cn } from "@/lib/utils"

const MAX_MESSAGE_LENGTH = 2_000
const SUGGESTED_QUESTIONS = [
  "How can I increase my income?",
  "Analyze my expenses and budget limits",
  "What should I prepare for next month?",
]

type AIAnalyticsProps = {
  readOnly?: boolean
  conversations: ConversationSummary[]
  selectedConversation?: SelectedConversation
}

function isSendMessageResponse(value: unknown): value is SendMessageResponse {
  if (!value || typeof value !== "object") return false
  const response = value as Partial<SendMessageResponse>
  return (
    !!response.conversation &&
    typeof response.conversation.id === "string" &&
    typeof response.conversation.title === "string" &&
    typeof response.conversation.createdAt === "string" &&
    typeof response.conversation.updatedAt === "string" &&
    Array.isArray(response.messages) &&
    response.messages.length === 2 &&
    response.messages.every(
      (message) =>
        !!message &&
        typeof message.id === "string" &&
        (message.role === "USER" || message.role === "ASSISTANT") &&
        typeof message.content === "string" &&
        typeof message.createdAt === "string"
    )
  )
}

function getSafeError(value: unknown, fallback: string) {
  if (!value || typeof value !== "object") return fallback
  const response = value as Partial<AiErrorResponse>
  return typeof response.error === "string" && response.error ? response.error : fallback
}

function sortConversations(conversations: ConversationSummary[]) {
  return [...conversations].sort(
    (left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt)
  )
}

export function AIAnalytics({
  readOnly = false,
  conversations: initialConversations,
  selectedConversation,
}: AIAnalyticsProps) {
  const router = useRouter()
  const [conversations, setConversations] = useState(initialConversations)
  const [activeConversation, setActiveConversation] = useState<
    ConversationSummary | undefined
  >(selectedConversation)
  const [messages, setMessages] = useState<ConversationMessage[]>(
    selectedConversation?.messages ?? []
  )
  const [message, setMessage] = useState("")
  const [pendingMessage, setPendingMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ConversationSummary | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const messageAreaRef = useRef<HTMLDivElement>(null)
  const composerRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messageAreaRef.current?.scrollTo({
      top: messageAreaRef.current.scrollHeight,
      behavior: "smooth",
    })
  }, [messages, pendingMessage])

  const navigateToConversation = (conversationId?: string) => {
    setError(null)
    router.push(
      conversationId
        ? `/dashboard/assistant?conversation=${encodeURIComponent(conversationId)}`
        : "/dashboard/assistant"
    )
  }

  const sendMessage = async (suggestedMessage?: string) => {
    const content = (suggestedMessage ?? message).trim()
    if (readOnly || isLoading) return
    if (!content) {
      setError("Message cannot be empty")
      composerRef.current?.focus()
      return
    }
    if (content.length > MAX_MESSAGE_LENGTH) {
      setError(`Message must be ${MAX_MESSAGE_LENGTH.toLocaleString("en-US")} characters or fewer`)
      composerRef.current?.focus()
      return
    }

    setError(null)
    setIsLoading(true)
    setPendingMessage(content)

    try {
      const response = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          ...(activeConversation ? { conversationId: activeConversation.id } : {}),
        }),
      })
      const responseBody: unknown = await response.json()

      if (!response.ok) {
        setError(getSafeError(responseBody, "Unable to send message. Please try again."))
        return
      }
      if (!isSendMessageResponse(responseBody)) {
        setError("The assistant returned an invalid response. Please try again.")
        return
      }

      const wasNewConversation = !activeConversation
      setMessages((current) => [...current, ...responseBody.messages])
      setActiveConversation(responseBody.conversation)
      setConversations((current) =>
        sortConversations([
          responseBody.conversation,
          ...current.filter(
            (conversation) => conversation.id !== responseBody.conversation.id
          ),
        ])
      )
      setMessage("")

      if (wasNewConversation) {
        router.replace(
          `/dashboard/assistant?conversation=${encodeURIComponent(
            responseBody.conversation.id
          )}`,
          { scroll: false }
        )
      } else {
        router.refresh()
      }
    } catch {
      setError("Unable to reach the assistant. Please try again.")
    } finally {
      setPendingMessage(null)
      setIsLoading(false)
      requestAnimationFrame(() => composerRef.current?.focus())
    }
  }

  const deleteConversation = async () => {
    if (!deleteTarget || isDeleting) return
    setIsDeleting(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/gemini/conversations/${encodeURIComponent(deleteTarget.id)}`,
        { method: "DELETE" }
      )
      const responseBody: unknown = await response.json()
      if (!response.ok) {
        setError(getSafeError(responseBody, "Unable to delete conversation."))
        return
      }

      setConversations((current) =>
        current.filter((conversation) => conversation.id !== deleteTarget.id)
      )
      const deletedSelectedConversation = activeConversation?.id === deleteTarget.id
      setDeleteTarget(null)

      if (deletedSelectedConversation) {
        setActiveConversation(undefined)
        setMessages([])
        setMessage("")
        router.replace("/dashboard/assistant")
      } else {
        router.refresh()
      }
    } catch {
      setError("Unable to delete conversation. Please try again.")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="grid min-h-[38rem] overflow-hidden rounded-xl border border-border bg-surface shadow-sm shadow-black/10 md:h-[calc(100dvh-15rem)] md:max-h-[52rem] md:grid-cols-[17rem_minmax(0,1fr)]">
      <aside className="hidden min-h-0 border-r border-border bg-sidebar md:flex md:flex-col">
        <div className="border-b border-border p-3">
          <Button className="w-full" onClick={() => navigateToConversation()} disabled={readOnly}>
            <Plus />
            New conversation
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2" aria-label="Conversations">
          {conversations.length ? (
            <div className="space-y-1">
              {conversations.map((conversation) => {
                const isActive = conversation.id === activeConversation?.id
                return (
                  <div
                    key={conversation.id}
                    className={cn(
                      "group flex items-center gap-1 rounded-lg border border-transparent",
                      isActive && "border-accent/25 bg-accent/10"
                    )}
                  >
                    <button
                      type="button"
                      className="min-w-0 flex-1 px-3 py-2.5 text-left text-sm text-text-secondary outline-none hover:text-text-primary focus-visible:ring-2 focus-visible:ring-ring/40"
                      onClick={() => navigateToConversation(conversation.id)}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <span className="block truncate text-text-primary">
                        {conversation.title}
                      </span>
                      <span className="mt-0.5 block text-xs text-text-muted">
                        {new Date(conversation.updatedAt).toLocaleDateString()}
                      </span>
                    </button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="mr-1 text-text-muted hover:text-destructive"
                      onClick={() => setDeleteTarget(conversation)}
                      aria-label={`Delete ${conversation.title}`}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="px-3 py-6 text-center text-sm text-text-muted">
              No conversations yet
            </p>
          )}
        </div>
      </aside>

      <section className="flex min-h-0 min-w-0 flex-col">
        <div className="flex items-center gap-2 border-b border-border bg-sidebar p-3 md:hidden">
          <label htmlFor="conversation-select" className="sr-only">
            Selected conversation
          </label>
          <select
            id="conversation-select"
            className="app-select min-w-0 flex-1"
            value={activeConversation?.id ?? ""}
            onChange={(event) => navigateToConversation(event.target.value || undefined)}
            disabled={readOnly}
          >
            <option value="">New conversation</option>
            {conversations.map((conversation) => (
              <option key={conversation.id} value={conversation.id}>
                {conversation.title}
              </option>
            ))}
          </select>
          <Button
            type="button"
            size="icon"
            onClick={() => navigateToConversation()}
            disabled={readOnly}
            aria-label="New conversation"
          >
            <Plus />
          </Button>
          {activeConversation && (
            <Button
              type="button"
              variant="destructive"
              size="icon"
              onClick={() => setDeleteTarget(activeConversation)}
              aria-label={`Delete ${activeConversation.title}`}
            >
              <Trash2 />
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3 border-b border-border px-4 py-3 sm:px-5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent/12 text-accent">
            <Sparkles className="size-5" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate font-semibold text-text-primary">
              {activeConversation?.title ?? "New conversation"}
            </h2>
            <p className="text-xs text-text-muted">
              Financial context is refreshed for each response
            </p>
          </div>
        </div>

        <div
          ref={messageAreaRef}
          className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-6"
          aria-live="polite"
        >
          {!messages.length && !pendingMessage && (
            <div className="mx-auto flex h-full max-w-xl flex-col items-center justify-center py-10 text-center">
              <div className="mb-4 flex size-12 items-center justify-center rounded-xl border border-accent/20 bg-accent/10 text-accent">
                <MessageSquare className="size-6" />
              </div>
              <h3 className="app-section-title">Start a financial conversation</h3>
              <p className="mt-2 max-w-md text-sm leading-6 text-text-secondary">
                Ask about your projects, income, subscriptions, expenses, or budget limits.
                The assistant uses only your CRM data.
              </p>
              {!readOnly && (
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  {SUGGESTED_QUESTIONS.map((suggestion) => (
                    <Button
                      key={suggestion}
                      variant="outline"
                      size="sm"
                      onClick={() => sendMessage(suggestion)}
                      disabled={isLoading}
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          )}

          {messages.map((item) => (
            <article
              key={item.id}
              className={cn(
                "flex",
                item.role === "USER" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[88%] rounded-xl px-4 py-3 text-sm leading-6 sm:max-w-[78%]",
                  item.role === "USER"
                    ? "bg-accent text-accent-foreground"
                    : "border border-border bg-surface-elevated text-text-primary"
                )}
              >
                <div className="whitespace-pre-wrap break-words">{item.content}</div>
              </div>
            </article>
          ))}

          {pendingMessage && (
            <>
              <div className="flex justify-end">
                <div className="max-w-[88%] rounded-xl bg-accent px-4 py-3 text-sm leading-6 text-accent-foreground sm:max-w-[78%]">
                  <div className="whitespace-pre-wrap break-words">{pendingMessage}</div>
                </div>
              </div>
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-xl border border-border bg-surface-elevated px-4 py-3 text-sm text-text-secondary">
                  <Loader2 className="size-4 animate-spin" />
                  Analyzing your finances…
                </div>
              </div>
            </>
          )}
        </div>

        <div className="border-t border-border bg-sidebar p-3 sm:p-4">
          {readOnly ? (
            <p className="rounded-lg border border-warning/25 bg-warning/8 px-4 py-3 text-sm text-warning" role="note">
              AI conversations are disabled in the public demo.
            </p>
          ) : (
            <div className="space-y-2">
              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
              <div className="flex items-end gap-2">
                <label htmlFor="assistant-message" className="sr-only">
                  Message the financial assistant
                </label>
                <textarea
                  ref={composerRef}
                  id="assistant-message"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault()
                      void sendMessage()
                    }
                  }}
                  placeholder="Ask about your finances…"
                  rows={2}
                  maxLength={MAX_MESSAGE_LENGTH}
                  disabled={isLoading}
                  className="app-field h-auto min-h-12 resize-none py-3 leading-5"
                />
                <Button
                  type="button"
                  size="icon-lg"
                  className="mb-0.5"
                  onClick={() => void sendMessage()}
                  disabled={isLoading || !message.trim()}
                  aria-label="Send message"
                >
                  {isLoading ? <Loader2 className="animate-spin" /> : <Send />}
                </Button>
              </div>
              <div className="flex justify-between gap-3 text-xs text-text-muted">
                <span>Enter to send · Shift+Enter for a new line</span>
                <span>{message.length.toLocaleString("en-US")}/{MAX_MESSAGE_LENGTH.toLocaleString("en-US")}</span>
              </div>
            </div>
          )}
        </div>
      </section>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete conversation?</DialogTitle>
            <DialogDescription>
              This permanently deletes the conversation and all of its messages.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={isDeleting}>Cancel</Button>
            </DialogClose>
            <Button variant="destructive" onClick={() => void deleteConversation()} disabled={isDeleting}>
              {isDeleting && <Loader2 className="animate-spin" />}
              Delete conversation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
