import { isAiConfigured } from '../../config';
import {
  chatCompletion,
  type ChatMessage,
  type ToolCall,
} from '../../llm/client';
import { resolveChatModelCandidates } from '../../llm/models';
import { runWithModelFallback } from '../../llm/fallback';
import { HttpError } from '../../server/middleware/httpError';
import { buildSystemPrompt } from './systemPrompt';
import { calorieFetch } from './calorieClient';
import { tools } from './tools';
import { parseTextToolCalls } from './textToolCalls';

const MAX_TOOL_ITERATIONS = 5;

export interface ChatResult {
  reply: string;
  usedFallback: boolean;
}

/**
 * Heuristic: does this reply suggest the model couldn't find the conversation
 * context the user is referring to (rather than giving a real answer)? Used to
 * decide whether to widen the context window. Kept conservative to avoid false
 * positives on legitimate answers about missing nutrition data.
 */
function isContextFailure(reply: string): boolean {
  const r = reply.toLowerCase();
  return [
    "i don't recall",
    "i can't recall",
    "i don't remember",
    "i can't remember",
    "i don't have that information",
    "i don't have information about",
    "i couldn't find",
    "i can't find",
    "you haven't mentioned",
    "you didn't mention",
    "you haven't told me",
    "no record of",
    "i don't have a record",
    "that wasn't mentioned",
  ].some((phrase) => r.includes(phrase));
}

/**
 * Load the user's saved memories from the calorie service. Returns the contents
 * as strings (most recent first, capped) — an empty array if unavailable.
 */
async function loadMemories(token: string): Promise<string[]> {
  try {
    const data = await calorieFetch(token, '/memory');
    const list = Array.isArray(data?.memories) ? data.memories : [];
    return list
      .map((m: { content?: unknown }) => (typeof m?.content === 'string' ? m.content : ''))
      .filter(Boolean)
      .slice(0, 30);
  } catch (err) {
    // Fail fast on auth errors; ignore transient/unavailable memory endpoint.
    if (err instanceof HttpError && err.status === 401) throw err;
    return [];
  }
}

/**
 * Runs the conversational agent. Executes tool calls against the calorie service
 * (using the user's forwarded access token) and returns the natural-language reply.
 *
 * Context windowing: the model can only meaningfully "recall" the last 30
 * messages. We first try with the most recent 15; if the model signals it can't
 * find the referenced context, we retry with the wider 30-message window, and if
 * it still can't, we return a clear "I can only recall the last 30 messages"
 * message instead of a misleading answer.
 */
export async function handleChat(
  token: string,
  history: { role: 'user' | 'assistant'; content: string }[],
): Promise<ChatResult> {
  if (!isAiConfigured()) {
    return {
      reply:
        'I can\'t connect to the AI model because OPENAI_API_KEY is not set in ai-services/.env. ' +
        'Add your key and restart the service to enable conversational features.',
      usedFallback: true,
    };
  }

  const memories = await loadMemories(token);
  const system = buildSystemPrompt(memories);

  // Hard cap: the model only ever sees the last 30 messages.
  const context = history.slice(-30);
  const candidates = await resolveChatModelCandidates();

  const tryWindow = (window: { role: 'user' | 'assistant'; content: string }[]) => {
    const baseMessages: ChatMessage[] = [
      { role: 'system', content: system },
      ...window.map((m) => ({ role: m.role, content: m.content })),
    ];
    return runWithModelFallback(candidates, (model) => runChatWithModel(token, baseMessages, model));
  };

  // First attempt: the most recent 15 messages.
  let result = await tryWindow(context.slice(-15));

  // If the model couldn't find the referenced context, retry with a wider window.
  if (isContextFailure(result.reply) && context.length > 15) {
    result = await tryWindow(context);
  }

  // Still unable to answer from conversation context — be honest about the limit.
  if (isContextFailure(result.reply)) {
    return {
      reply:
        "I can only recall the last 30 messages in this conversation, so I don't have the earlier context you're referring to. Could you re-share the details you'd like me to use?",
      usedFallback: false,
    };
  }

  return result;
}

async function runChatWithModel(
  token: string,
  baseMessages: ChatMessage[],
  model: string,
): Promise<ChatResult> {
  const messages: ChatMessage[] = [...baseMessages];

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const response = await chatCompletion({
      model,
      messages,
      tools: tools.map((t) => t.definition),
      toolChoice: 'auto',
      temperature: 0.2,
    });

    const nativeCalls = response.message.tool_calls ?? [];

    // Some free models (e.g. Gemini via OpenRouter) emit tool calls as raw text
    // (`<tool_call>name<arg_key>…<arg_value>…</tool_call>`) instead of the native
    // `tool_calls` array. Detect that format and convert it to real tool calls.
    const textCalls = nativeCalls.length === 0 ? parseTextToolCalls(response.message.content) : [];

    if (nativeCalls.length === 0 && textCalls.length === 0) {
      return { reply: response.message.content ?? 'Sorry, I had trouble answering that.', usedFallback: false };
    }

    // Native function-calling path — the model understands the `tool` role.
    if (nativeCalls.length > 0) {
      messages.push({
        role: 'assistant',
        content: response.message.content,
        tool_calls: nativeCalls,
      });

      for (const call of nativeCalls) {
        const result = await executeTool(token, call);
        messages.push({ role: 'tool', tool_call_id: call.id, content: result });
      }
      continue;
    }

    // Text tool-call path — the model does NOT understand the native `tool` role,
    // so execute the tools now and ask for a plain-text summary in one follow-up.
    const results: string[] = [];
    for (const call of textCalls) {
      results.push(await executeTool(token, call));
    }

    const summary = await chatCompletion({
      model,
      messages: [
        ...messages,
        {
          role: 'user',
          content:
            `Tool results:\n${results.join('\n')}\n\n` +
            `Now answer the user's request using only these results. Do not call any more tools.`,
        },
      ],
      toolChoice: 'none',
      temperature: 0.2,
    });

    return { reply: summary.message.content ?? 'Here is your summary.', usedFallback: false };
  }

  const final = await chatCompletion({
    model,
    messages,
    toolChoice: 'none',
    temperature: 0.2,
  });
  return { reply: final.message.content ?? 'Here is your summary.', usedFallback: false };
}

async function executeTool(token: string, call: ToolCall): Promise<string> {
  const tool = tools.find((t) => t.definition.function.name === call.function.name);
  if (!tool) return JSON.stringify({ error: `Unknown tool: ${call.function.name}` });

  try {
    const args = JSON.parse(call.function.arguments || '{}');
    const result = await tool.run(token, args);
    return JSON.stringify(result);
  } catch (err) {
    // Auth failures (401 from the calorie service) must bubble up so the route
    // can return 401 and the client can refresh/redirect — never turn them into
    // a normal chat reply.
    if (err instanceof HttpError && err.status === 401) throw err;
    const message = err instanceof Error ? err.message : 'Tool execution failed';
    return JSON.stringify({ error: message });
  }
}
