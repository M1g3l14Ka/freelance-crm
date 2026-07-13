import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { AiProviderError, AiProviderTimeoutError } from "@/lib/ai/errors"

vi.mock("server-only", () => ({}))

import { generateAssistantReply } from "@/lib/ai/provider"

const originalApiKey = process.env.GEMINI_API_KEY
const testApiKey = "test-api-key-that-must-stay-private"
const fetchMock = vi.fn<typeof fetch>()

const requestInput = {
  financialContext: "Owned financial context",
  history: [
    { user: "First question", assistant: "First answer" },
    { user: "Second question", assistant: "Second answer" },
  ],
  currentMessage: "Current question",
}

function providerResponse(candidates: unknown, status = 200) {
  return new Response(JSON.stringify({ candidates }), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

function successfulResponse(text = "Assistant answer") {
  return providerResponse([{ content: { parts: [{ text }] } }])
}

function transientResponse(status: number) {
  return new Response(null, { status })
}

async function advanceRetryDelay(delayMs: number) {
  await vi.advanceTimersByTimeAsync(delayMs)
}

describe("Gemini provider", () => {
  beforeEach(() => {
    process.env.GEMINI_API_KEY = testApiKey
    fetchMock.mockReset()
    vi.stubGlobal("fetch", fetchMock)
    vi.spyOn(console, "error").mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    if (originalApiKey === undefined) {
      delete process.env.GEMINI_API_KEY
    } else {
      process.env.GEMINI_API_KEY = originalApiKey
    }
  })

  it("rejects a missing API key without calling fetch", async () => {
    delete process.env.GEMINI_API_KEY

    await expect(generateAssistantReply(requestInput)).rejects.toBeInstanceOf(
      AiProviderError
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("keeps the API key out of the URL and sends it through the header", async () => {
    fetchMock.mockResolvedValue(successfulResponse())

    await generateAssistantReply(requestInput)

    expect(fetchMock).toHaveBeenCalledOnce()
    const call = fetchMock.mock.calls[0]
    expect(call).toBeDefined()
    if (!call) throw new Error("Expected a provider request")
    const [requestUrl, requestOptions] = call
    const headers = new Headers(requestOptions?.headers)

    expect(String(requestUrl)).not.toContain(testApiKey)
    expect(String(requestUrl)).not.toContain("?key=")
    expect(headers.get("x-goog-api-key")).toBe(testApiKey)
    expect(headers.get("Content-Type")).toBe("application/json")
  })

  it("serializes conversation history, the current message, and the output bound", async () => {
    fetchMock.mockResolvedValue(successfulResponse())

    await generateAssistantReply(requestInput)

    const call = fetchMock.mock.calls[0]
    expect(call).toBeDefined()
    if (!call) throw new Error("Expected a provider request")
    const requestBody: unknown = JSON.parse(String(call[1]?.body))

    expect(requestBody).toMatchObject({
      contents: [
        { role: "user", parts: [{ text: "First question" }] },
        { role: "model", parts: [{ text: "First answer" }] },
        { role: "user", parts: [{ text: "Second question" }] },
        { role: "model", parts: [{ text: "Second answer" }] },
        { role: "user", parts: [{ text: "Current question" }] },
      ],
      generationConfig: { maxOutputTokens: 2048 },
    })
    expect(requestBody).not.toMatchObject({
      generationConfig: { temperature: expect.anything() },
    })
  })

  it("returns multiple text parts across candidates in their original order", async () => {
    fetchMock.mockResolvedValue(
      providerResponse([
        {
          content: {
            parts: [{ text: "  First section  " }, { text: "Second section" }],
          },
        },
        { content: { parts: [{ text: "\nThird section\n" }] } },
      ])
    )

    await expect(generateAssistantReply(requestInput)).resolves.toBe(
      "First section\nSecond section\nThird section"
    )
  })

  it("ignores non-text and empty parts safely", async () => {
    fetchMock.mockResolvedValue(
      providerResponse([
        {
          content: {
            parts: [
              { inlineData: { mimeType: "image/png", data: "ignored" } },
              null,
              { text: "   " },
              { text: "Usable text" },
              { text: 42 },
            ],
          },
        },
      ])
    )

    await expect(generateAssistantReply(requestInput)).resolves.toBe("Usable text")
  })

  it("returns a provider error when the response has no usable text", async () => {
    fetchMock.mockResolvedValue(
      providerResponse([{ content: { parts: [{ inlineData: {} }, { text: " " }] } }])
    )

    await expect(generateAssistantReply(requestInput)).rejects.toBeInstanceOf(
      AiProviderError
    )
  })

  it("returns a provider error for a non-success HTTP response", async () => {
    fetchMock.mockResolvedValue(new Response("provider details", { status: 400 }))

    await expect(generateAssistantReply(requestInput)).rejects.toBeInstanceOf(
      AiProviderError
    )
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it.each([503, 429])("retries HTTP %i once and returns the successful response", async (status) => {
    vi.useFakeTimers()
    vi.spyOn(Math, "random").mockReturnValue(0)
    fetchMock
      .mockResolvedValueOnce(transientResponse(status))
      .mockResolvedValueOnce(successfulResponse("Recovered response"))

    const providerRequest = generateAssistantReply(requestInput)
    const result = expect(providerRequest).resolves.toBe("Recovered response")

    await advanceRetryDelay(750)
    await result
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("stops repeated 503 responses after three total attempts", async () => {
    vi.useFakeTimers()
    vi.spyOn(Math, "random").mockReturnValue(0)
    fetchMock.mockResolvedValue(transientResponse(503))

    const providerRequest = generateAssistantReply(requestInput)
    const rejection = expect(providerRequest).rejects.toBeInstanceOf(AiProviderError)

    await advanceRetryDelay(750)
    await advanceRetryDelay(1_500)
    await rejection
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it("does not retry a 403 response", async () => {
    fetchMock.mockResolvedValue(transientResponse(403))

    await expect(generateAssistantReply(requestInput)).rejects.toBeInstanceOf(
      AiProviderError
    )
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it("does not retry invalid response content", async () => {
    fetchMock.mockResolvedValue(
      providerResponse([{ content: { parts: [{ inlineData: {} }] } }])
    )

    await expect(generateAssistantReply(requestInput)).rejects.toBeInstanceOf(
      AiProviderError
    )
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it("retries a temporary network failure and returns the successful response", async () => {
    vi.useFakeTimers()
    vi.spyOn(Math, "random").mockReturnValue(0)
    fetchMock
      .mockRejectedValueOnce(new TypeError("temporary network failure"))
      .mockResolvedValueOnce(successfulResponse("Network recovered"))

    const providerRequest = generateAssistantReply(requestInput)
    const result = expect(providerRequest).resolves.toBe("Network recovered")

    await advanceRetryDelay(750)
    await result
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("uses one overall 25-second deadline across attempts and retry delays", async () => {
    vi.useFakeTimers()
    vi.spyOn(Math, "random").mockReturnValue(0)
    fetchMock.mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          setTimeout(() => resolve(transientResponse(503)), 24_500)
        })
    )

    const providerRequest = generateAssistantReply(requestInput)
    const rejection = expect(providerRequest).rejects.toBeInstanceOf(
      AiProviderTimeoutError
    )

    await vi.advanceTimersByTimeAsync(25_000)
    await rejection
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it("aborts a request after 25 seconds and returns a timeout error", async () => {
    vi.useFakeTimers()
    fetchMock.mockImplementation(
      (_request, options) =>
        new Promise<Response>((_resolve, reject) => {
          options?.signal?.addEventListener(
            "abort",
            () => reject(new Error("request aborted")),
            { once: true }
          )
        })
    )

    const providerRequest = generateAssistantReply(requestInput)
    const rejection = expect(providerRequest).rejects.toBeInstanceOf(
      AiProviderTimeoutError
    )

    await vi.advanceTimersByTimeAsync(25_000)
    await rejection
  })

  it("does not expose raw provider errors", async () => {
    vi.useFakeTimers()
    vi.spyOn(Math, "random").mockReturnValue(0)
    const rawProviderMessage = "raw provider internals and secret details"
    fetchMock.mockRejectedValue(new Error(rawProviderMessage))

    const providerRequest = generateAssistantReply(requestInput)
    const capturedError = providerRequest.catch(
      (providerError: unknown) => providerError
    )
    await advanceRetryDelay(750)
    await advanceRetryDelay(1_500)
    const error = await capturedError

    expect(error).toBeInstanceOf(AiProviderError)
    expect(error).toMatchObject({
      message: "The assistant is temporarily unavailable. Please try again.",
    })
    expect(JSON.stringify(error)).not.toContain(rawProviderMessage)
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain(
      rawProviderMessage
    )
  })
})
