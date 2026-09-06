import { renderMarkdown } from './markdown';

/** A single data point the AI can describe in a chart block. */
export interface ChartPoint {
  label: string;
  value: number;
}
export interface BarPoint extends ChartPoint {
  color?: string;
  target?: number;
}
export interface DonutPoint extends ChartPoint {
  color: string;
}

/** Chart specifications the AI may return inside a `chart` code fence. */
export type ChartSpec =
  | { type: 'line'; color?: string; data: ChartPoint[] }
  | { type: 'bar'; data: BarPoint[] }
  | { type: 'donut'; data: DonutPoint[] };

/** A parsed assistant message: text (already HTML) and/or charts, in order. */
export type ChatSegment =
  | { kind: 'text'; html: string }
  | { kind: 'chart'; chart: ChartSpec };

const CHART_FENCE = /```chart\s*\n?([\s\S]*?)```/g;

const FALLBACK_COLORS = ['#e5232b', '#0a0a0a', '#8a8a8a', '#ff5a60', '#4a4a4a'];

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function toString(value: unknown): string {
  return typeof value === 'string' ? value : String(value ?? '');
}

function parseChartSpec(json: string): ChartSpec | null {
  try {
    const obj: unknown = JSON.parse(json);
    if (!obj || typeof obj !== 'object') return null;
    const record = obj as Record<string, unknown>;
    const type = record.type;
    const rawData = Array.isArray(record.data) ? record.data : [];

    if (type === 'line') {
      return {
        type,
        color: typeof record.color === 'string' ? record.color : undefined,
        data: rawData.map((d) => ({
          label: toString((d as Record<string, unknown>)?.label),
          value: toNumber((d as Record<string, unknown>)?.value),
        })),
      };
    }
    if (type === 'bar') {
      return {
        type,
        data: rawData.map((d) => {
          const item = d as Record<string, unknown>;
          return {
            label: toString(item?.label),
            value: toNumber(item?.value),
            target: item?.target != null ? toNumber(item.target) : undefined,
            color: typeof item?.color === 'string' ? item.color : undefined,
          };
        }),
      };
    }
    if (type === 'donut') {
      return {
        type,
        data: rawData.map((d, i) => {
          const item = d as Record<string, unknown>;
          return {
            label: toString(item?.label),
            value: toNumber(item?.value),
            color:
              typeof item?.color === 'string'
                ? item.color
                : FALLBACK_COLORS[i % FALLBACK_COLORS.length],
          };
        }),
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Split an assistant reply into text segments and chart segments.
 *
 * The AI is asked to put charts in a fenced code block labelled `chart`
 * containing JSON. Everything else is parsed as Markdown. Chart blocks are
 * extracted first so `marked` never sees them.
 */
export function parseAssistantContent(raw: string): ChatSegment[] {
  const segments: ChatSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  CHART_FENCE.lastIndex = 0;

  while ((match = CHART_FENCE.exec(raw)) !== null) {
    const before = raw.slice(lastIndex, match.index);
    if (before.trim()) segments.push({ kind: 'text', html: renderMarkdown(before) });

    const chart = parseChartSpec(match[1]);
    if (chart) segments.push({ kind: 'chart', chart });

    lastIndex = match.index + match[0].length;
  }

  const after = raw.slice(lastIndex);
  if (after.trim()) segments.push({ kind: 'text', html: renderMarkdown(after) });

  if (segments.length === 0) {
    segments.push({ kind: 'text', html: renderMarkdown(raw) });
  }
  return segments;
}
