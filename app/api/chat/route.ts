import {
  createUIMessageStreamResponse,
  createUIMessageStream,
  streamText,
  convertToModelMessages,
  stepCountIs,
} from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { tools } from './tools'

const SYSTEM_PROMPT =
  'You are a data analyst for CipherCross\'s LinkedIn outreach pipeline. ' +
  'You help the CEO and SDR team analyze A/B tests, campaign conversion rates, and message hook performance. ' +
  'Use the provided tools to query the database. Do not guess data. ' +
  'If a tool fails, explain why and suggest what the user can try instead.'

export async function POST(req: Request) {
  const { messages } = await req.json()

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      const result = streamText({
        model: anthropic('claude-3-5-sonnet-20241022'),
        system: SYSTEM_PROMPT,
        messages: await convertToModelMessages(messages),
        tools,
        stopWhen: stepCountIs(5),
      })
      writer.merge(result.toUIMessageStream())
    },
    onError: (err) => `I encountered an error: ${String(err)}`,
  })

  return createUIMessageStreamResponse({ stream })
}
