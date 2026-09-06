import { useState } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { chartAccentColor, chartMutedColor, macroColors } from '../theme';
import { useElementWidth } from './common/useElementWidth';

const GRID_COLOR = '#e5e5e5';
const AXIS_TEXT = '#5c5c5c';
const AXIS_FONT = 11;

/** Pick "nice" tick values for a 0..max axis, always ending at or above `max`. */
function niceTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0];
  const rough = max / count;
  const pow = 10 ** Math.floor(Math.log10(rough));
  const candidates = [1, 2, 2.5, 5, 10].map((m) => m * pow);
  const step = candidates.find((c) => c >= rough) ?? candidates[candidates.length - 1];
  const ticks: number[] = [];
  // Use ceil so the top tick always covers the maximum data value (prevents the
  // peak from being drawn above the plot area into the surrounding UI).
  const tickCount = Math.ceil(max / step);
  for (let i = 0; i <= tickCount; i++) {
    ticks.push(Math.round(i * step * 1000) / 1000);
  }
  return ticks;
}

function compact(n: number): string {
  if (Math.abs(n) >= 1000) return `${Math.round(n / 100) / 10}k`;
  return String(Math.round(n));
}

/** Choose which x labels to show so they never collide. */
function labelIndices(count: number, width: number, minGap = 48): Set<number> {
  const maxLabels = Math.max(2, Math.floor(width / minGap));
  if (count <= maxLabels) return new Set(Array.from({ length: count }, (_, i) => i));
  const step = Math.ceil((count - 1) / (maxLabels - 1));
  const set = new Set<number>();
  for (let i = 0; i < count; i += step) set.add(i);
  set.add(count - 1);
  return set;
}

function Tooltip({ x, y, width, lines }: { x: number; y: number; width: number; lines: string[] }) {
  const boxW = Math.max(...lines.map((l) => l.length)) * 6.5 + 16;
  const boxH = lines.length * 16 + 10;
  const left = Math.min(Math.max(x - boxW / 2, 0), width - boxW);
  const top = Math.max(y - boxH - 10, 0);
  return (
    <g pointerEvents="none">
      <rect x={left} y={top} width={boxW} height={boxH} fill="#0a0a0a" />
      {lines.map((line, i) => (
        <text key={i} x={left + 8} y={top + 17 + i * 16} fontSize={11} fill="#fff" fontWeight={i === 0 ? 600 : 400}>
          {line}
        </text>
      ))}
    </g>
  );
}

export interface LineDatum {
  label: string;
  value: number;
}

/** Responsive line/area chart with gridlines, y-axis and hover values. */
export function LineChart({
  data,
  height = 200,
  color = chartAccentColor,
  valueFormatter = (v) => `${Math.round(v)} kcal`,
}: {
  data: LineDatum[];
  height?: number;
  color?: string;
  valueFormatter?: (v: number) => string;
}) {
  const { ref, width } = useElementWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  if (data.length === 0) return null;

  const pad = { top: 20, right: 12, bottom: 28, left: 40 };
  const plotW = Math.max(width - pad.left - pad.right, 10);
  const plotH = height - pad.top - pad.bottom;
  const rawMax = Math.max(...data.map((d) => d.value), 1);
  const ticks = niceTicks(rawMax);
  const max = ticks[ticks.length - 1] || 1;
  const stepX = data.length > 1 ? plotW / (data.length - 1) : 0;
  const points = data.map((d, i) => ({
    x: pad.left + (data.length > 1 ? i * stepX : plotW / 2),
    y: pad.top + plotH - (d.value / max) * plotH,
    ...d,
  }));
  const path = points.map((p) => `${p.x},${p.y}`).join(' ');
  const area = `${points[0].x},${pad.top + plotH} ${path} ${points[points.length - 1].x},${pad.top + plotH}`;
  const shown = labelIndices(data.length, plotW);

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    let best = 0;
    let bestDist = Infinity;
    points.forEach((p, i) => {
      const d = Math.abs(p.x - x);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    setHover(best);
  };

  return (
    <Box ref={ref} sx={{ width: '100%' }}>
      <svg
        width={width}
        height={height}
        role="img"
        aria-label="Line chart"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
        style={{ display: 'block', overflow: 'visible' }}
      >
        {ticks.map((t) => {
          const y = pad.top + plotH - (t / max) * plotH;
          return (
            <g key={t}>
              <line x1={pad.left} x2={pad.left + plotW} y1={y} y2={y} stroke={GRID_COLOR} strokeWidth={1} />
              <text x={pad.left - 8} y={y + 4} fontSize={AXIS_FONT} fill={AXIS_TEXT} textAnchor="end">
                {compact(t)}
              </text>
            </g>
          );
        })}
        <polygon points={area} fill={color} opacity={0.08} />
        <polyline points={path} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <g key={i}>
            {shown.has(i) && (
              <text x={p.x} y={height - 8} fontSize={AXIS_FONT} fill={AXIS_TEXT} textAnchor="middle">
                {p.label}
              </text>
            )}
            <circle cx={p.x} cy={p.y} r={hover === i ? 5 : 3} fill={hover === i ? '#0a0a0a' : color} />
          </g>
        ))}
        {hover != null && (
          <>
            <line
              x1={points[hover].x}
              x2={points[hover].x}
              y1={pad.top}
              y2={pad.top + plotH}
              stroke="#0a0a0a"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            <Tooltip
              x={points[hover].x}
              y={points[hover].y}
              width={width}
              lines={[points[hover].label, valueFormatter(points[hover].value)]}
            />
          </>
        )}
      </svg>
    </Box>
  );
}

export interface BarDatum {
  label: string;
  value: number;
  color?: string;
  target?: number;
}

/** Responsive vertical bar chart with gridlines, y-axis and hover values. */
export function BarChart({
  data,
  height = 200,
  valueFormatter = (v) => String(Math.round(v)),
}: {
  data: BarDatum[];
  height?: number;
  valueFormatter?: (v: number) => string;
}) {
  const { ref, width } = useElementWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  if (data.length === 0) return null;

  const pad = { top: 20, right: 12, bottom: 28, left: 40 };
  const plotW = Math.max(width - pad.left - pad.right, 10);
  const plotH = height - pad.top - pad.bottom;
  const rawMax = Math.max(...data.map((d) => Math.max(d.value, d.target ?? 0)), 1);
  const ticks = niceTicks(rawMax);
  const max = ticks[ticks.length - 1] || 1;
  const slot = plotW / data.length;
  const barW = Math.min(slot * 0.6, 56);
  const shown = labelIndices(data.length, plotW, 40);

  return (
    <Box ref={ref} sx={{ width: '100%' }}>
      <svg width={width} height={height} role="img" aria-label="Bar chart" style={{ display: 'block', overflow: 'visible' }}>
        {ticks.map((t) => {
          const y = pad.top + plotH - (t / max) * plotH;
          return (
            <g key={t}>
              <line x1={pad.left} x2={pad.left + plotW} y1={y} y2={y} stroke={GRID_COLOR} />
              <text x={pad.left - 8} y={y + 4} fontSize={AXIS_FONT} fill={AXIS_TEXT} textAnchor="end">
                {compact(t)}
              </text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const cx = pad.left + slot * i + slot / 2;
          const h = (d.value / max) * plotH;
          const th = d.target != null ? (d.target / max) * plotH : 0;
          return (
            <g key={d.label} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={cx - slot / 2} y={pad.top} width={slot} height={plotH} fill="transparent" />
              {d.target != null && (
                <rect x={cx - barW / 2} y={pad.top + plotH - th} width={barW} height={th} fill={chartMutedColor} />
              )}
              <rect
                x={cx - barW / 2}
                y={pad.top + plotH - h}
                width={barW}
                height={h}
                fill={d.color ?? chartAccentColor}
                opacity={hover == null || hover === i ? 1 : 0.5}
              />
              {shown.has(i) && (
                <text x={cx} y={height - 8} fontSize={AXIS_FONT} fill={AXIS_TEXT} textAnchor="middle">
                  {d.label}
                </text>
              )}
              {hover === i && (
                <Tooltip
                  x={cx}
                  y={pad.top + plotH - Math.max(h, th)}
                  width={width}
                  lines={[
                    d.label,
                    valueFormatter(d.value),
                    ...(d.target != null ? [`Target ${valueFormatter(d.target)}`] : []),
                  ]}
                />
              )}
            </g>
          );
        })}
      </svg>
    </Box>
  );
}

export interface StackedBarDatum {
  label: string;
  protein: number;
  carbs: number;
  fat: number;
}

/** Responsive stacked bar chart of daily macros (protein + carbs + fat). */
export function StackedBarChart({ data, height = 200 }: { data: StackedBarDatum[]; height?: number }) {
  const { ref, width } = useElementWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  if (data.length === 0) return null;

  const pad = { top: 20, right: 12, bottom: 28, left: 40 };
  const plotW = Math.max(width - pad.left - pad.right, 10);
  const plotH = height - pad.top - pad.bottom;
  const rawMax = Math.max(...data.map((d) => d.protein + d.carbs + d.fat), 1);
  const ticks = niceTicks(rawMax);
  const max = ticks[ticks.length - 1] || 1;
  const slot = plotW / data.length;
  const barW = Math.min(slot * 0.6, 56);
  const shown = labelIndices(data.length, plotW, 40);

  return (
    <Box ref={ref} sx={{ width: '100%' }}>
      <svg width={width} height={height} role="img" aria-label="Macros per day" style={{ display: 'block', overflow: 'visible' }}>
        {ticks.map((t) => {
          const y = pad.top + plotH - (t / max) * plotH;
          return (
            <g key={t}>
              <line x1={pad.left} x2={pad.left + plotW} y1={y} y2={y} stroke={GRID_COLOR} />
              <text x={pad.left - 8} y={y + 4} fontSize={AXIS_FONT} fill={AXIS_TEXT} textAnchor="end">
                {compact(t)}
              </text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const cx = pad.left + slot * i + slot / 2;
          const bottom = pad.top + plotH;
          const total = d.protein + d.carbs + d.fat;
          const totalH = (total / max) * plotH;
          const proteinH = (d.protein / max) * plotH;
          const carbsH = (d.carbs / max) * plotH;
          const fatH = (d.fat / max) * plotH;
          const opacity = hover == null || hover === i ? 1 : 0.5;
          return (
            <g key={d.label} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={cx - slot / 2} y={pad.top} width={slot} height={plotH} fill="transparent" />
              <rect x={cx - barW / 2} y={bottom - proteinH - carbsH - fatH} width={barW} height={fatH} fill={macroColors.fat} opacity={opacity} />
              <rect x={cx - barW / 2} y={bottom - proteinH - carbsH} width={barW} height={carbsH} fill={macroColors.carbs} opacity={opacity} />
              <rect x={cx - barW / 2} y={bottom - proteinH} width={barW} height={proteinH} fill={macroColors.protein} opacity={opacity} />
              {shown.has(i) && (
                <text x={cx} y={height - 8} fontSize={AXIS_FONT} fill={AXIS_TEXT} textAnchor="middle">
                  {d.label}
                </text>
              )}
              {hover === i && (
                <Tooltip
                  x={cx}
                  y={pad.top + plotH - totalH}
                  width={width}
                  lines={[
                    d.label,
                    `Protein ${Math.round(d.protein)}g`,
                    `Carbs ${Math.round(d.carbs)}g`,
                    `Fat ${Math.round(d.fat)}g`,
                  ]}
                />
              )}
            </g>
          );
        })}
      </svg>
    </Box>
  );
}

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

/** Donut chart with a center label and a legend of absolute values. */
export function DonutChart({
  segments,
  size = 160,
  thickness = 22,
  centerLabel,
  centerCaption,
  unit = 'g',
}: {
  segments: DonutSegment[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerCaption?: string;
  unit?: string;
}) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'center', gap: { xs: 2, sm: 4 } }}>
      <Box sx={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Donut chart">
          <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
            {total === 0 ? (
              <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={chartMutedColor} strokeWidth={thickness} />
            ) : (
              segments.map((segment) => {
                const length = (segment.value / total) * circumference;
                const el = (
                  <circle
                    key={segment.label}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={segment.color}
                    strokeWidth={thickness}
                    strokeDasharray={`${length} ${circumference - length}`}
                    strokeDashoffset={-offset}
                  />
                );
                offset += length;
                return el;
              })
            )}
          </g>
        </svg>
        {(centerLabel || centerCaption) && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'grid',
              placeItems: 'center',
              textAlign: 'center',
              pointerEvents: 'none',
            }}
          >
            <Box>
              {centerLabel && (
                <Typography variant="h6" sx={{ lineHeight: 1.1 }}>
                  {centerLabel}
                </Typography>
              )}
              {centerCaption && (
                <Typography variant="caption" color="text.secondary">
                  {centerCaption}
                </Typography>
              )}
            </Box>
          </Box>
        )}
      </Box>
      <Stack spacing={1} sx={{ minWidth: 0 }}>
        {segments.map((segment) => (
          <Box key={segment.label} sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <Box sx={{ width: 12, height: 12, bgcolor: segment.color, flexShrink: 0 }} />
            <Typography variant="body2" sx={{ minWidth: 64 }}>
              {segment.label}
            </Typography>
            <Typography variant="body2" fontWeight={600}>
              {Math.round(segment.value)}
              {unit}
            </Typography>
            {total > 0 && (
              <Typography variant="caption" color="text.secondary">
                {Math.round((segment.value / total) * 100)}%
              </Typography>
            )}
          </Box>
        ))}
      </Stack>
    </Box>
  );
}

export interface ProgressDatum {
  label: string;
  value: number;
  target: number;
  color?: string;
  unit?: string;
}

/** Horizontal goal-progress bars: each metric as a percent of its own target. */
export function GoalProgressBars({ data }: { data: ProgressDatum[] }) {
  return (
    <Stack spacing={2}>
      {data.map((d) => {
        const pct = d.target > 0 ? (d.value / d.target) * 100 : 0;
        const over = pct > 100;
        return (
          <Box key={d.label}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 0.5 }}>
              <Typography variant="body2" fontWeight={600}>
                {d.label}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <Box component="span" sx={{ color: 'text.primary', fontWeight: 600 }}>
                  {Math.round(d.value)}
                </Box>
                {' / '}
                {Math.round(d.target)} {d.unit ?? ''} · {Math.round(pct)}%
              </Typography>
            </Box>
            <Box sx={{ position: 'relative', height: 10, bgcolor: chartMutedColor }}>
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  width: `${Math.min(pct, 100)}%`,
                  bgcolor: d.color ?? chartAccentColor,
                }}
              />
              {over && (
                <Box sx={{ position: 'absolute', right: 0, top: -3, bottom: -3, width: 2, bgcolor: '#0a0a0a' }} />
              )}
            </Box>
          </Box>
        );
      })}
    </Stack>
  );
}
