import type { ToolCall } from '../../llm/client';

/**
 * Parse tool calls emitted as plain text (non-native function calling). Some
 * models produce:
 *
 *   <tool_call>get_daily_summary
 *   <arg_key>startDate</arg_key>
 *   <arg_value>2026-09-03</arg_value>
 *   <arg_key>endDate</arg_key>
 *   <arg_value>2026-09-05</arg_value>
 *   </tool_call>
 *
 * This converts those blocks into the same `ToolCall[]` shape as native calls so
 * the rest of the agent loop is unchanged.
 */
export function parseTextToolCalls(content: string | null): ToolCall[] {
  if (!content) return [];

  const calls: ToolCall[] = [];
  const blockRegex = /<tool_call>([\s\S]*?)<\/tool_call>/g;
  let blockMatch: RegExpExecArray | null;

  while ((blockMatch = blockRegex.exec(content)) !== null) {
    const block = blockMatch[1];

    // Function name is the first word of the block.
    const nameMatch = block.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)/);
    if (!nameMatch) continue;

    const args: Record<string, unknown> = {};
    const argRegex = /<arg_key>([^<]+)<\/arg_key>\s*<arg_value>([\s\S]*?)<\/arg_value>/g;
    let argMatch: RegExpExecArray | null;

    while ((argMatch = argRegex.exec(block)) !== null) {
      args[argMatch[1].trim()] = coerceArgValue(argMatch[2]);
    }

    calls.push({
      id: `text-${calls.length}-${Math.random().toString(36).slice(2, 8)}`,
      type: 'function',
      function: { name: nameMatch[1], arguments: JSON.stringify(args) },
    });
  }

  return calls;
}

/** Convert a raw string arg into a typed value (number/boolean/string). */
function coerceArgValue(value: string): unknown {
  const trimmed = value.trim();
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  return trimmed;
}
