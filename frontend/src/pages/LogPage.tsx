import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Skeleton,
  Stack,
  TextField,
  Tooltip,
  Typography,
  keyframes,
} from '@mui/material';
import { Add, Close, DeleteSweep, EditNote, Info, InsertDriveFile, Mic, PhotoCamera, Send, UploadFile } from '@mui/icons-material';
import { appendChatHistory, clearChatHistory, listChatHistory, sendChat, type ChatMessage } from '../api/chat';
import { createMeal, deleteMeal } from '../api/meals';
import type { ImportEntry } from '../api/import';
import { ApiError, aiAssetUrl } from '../api/client';
import type { FoodEntry } from '../types';
import { parseAssistantContent, type ChartSpec } from '../utils/chatContent';
import { MEAL_TYPE_LABELS } from '../utils/format';
import { fileToEntries, formatBytes, IMPORT_ACCEPT, isImageFile } from '../utils/extractFile';
import { BarChart, DonutChart, LineChart } from '../components/Charts';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { PageHeader } from '../components/common/PageHeader';
import { TodaySummary } from '../components/common/TodaySummary';
import { MealDialog } from '../components/MealDialog';
import { MealResultCard } from '../components/log/MealResultCard';
import { OverviewPanel } from '../components/log/OverviewPanel';
import { useFeedback } from '../context/FeedbackContext';
import { useTodayOverview } from '../hooks/useTodayOverview';

/* ----------------------------- thread model ----------------------------- */

type ThreadItem =
  | { id: string; kind: 'text'; role: 'user' | 'assistant'; content: string }
  | { id: string; kind: 'notice'; role: 'assistant'; content: string }
  | { id: string; kind: 'photo'; role: 'user'; url: string; caption: string }
  | { id: string; kind: 'file'; role: 'user'; name: string; size: number }
  | {
      id: string;
      kind: 'result';
      role: 'assistant';
      text: string;
      mode: 'logged' | 'pending' | 'undone' | 'discarded';
      logged: FoodEntry[];
      pending: ImportEntry[];
      busy?: boolean;
    };

const WELCOME_LINES = [
  "Hi! Snap a photo, type or speak what you ate, and I'll log it.",
  'Tap + to fill in a meal yourself or upload a file. Ask me anything, like "how much protein is left today?"',
];
const AI_OFF_TEXT = "Photo and chat logging aren't available right now. You can still log meals manually with the plus button.";
const AI_OFF_KEY = 'caloriepal_ai_unavailable';
const HISTORY_PAGE_SIZE = 50;
/** Replies that leaked server configuration (stored before the UI filtered them). */
const LEAKED_CONFIG_RE = /API_KEY|\.env\b|restart the service/i;

let seq = 0;
const uid = () => `${Date.now()}-${seq++}`;

/** Human sentence describing an entry, used as the user's chat message after a manual/file log. */
function describeEntry(e: FoodEntry | ImportEntry): string {
  return `${e.foodName} (${MEAL_TYPE_LABELS[e.mealType].toLowerCase()}, ${e.quantity} ${e.unit}) — ${Math.round(e.calories)} kcal, P ${Math.round(e.protein)}g · C ${Math.round(e.carbs)}g · F ${Math.round(e.fat)}g`;
}

/** Convert persisted chat messages into thread items, filtering leaked config. */
function toThreadItems(messages: ChatMessage[]): ThreadItem[] {
  return messages.map((m) => {
    if (m.role === 'assistant' && LEAKED_CONFIG_RE.test(m.content)) {
      return { id: uid(), kind: 'notice', role: 'assistant', content: AI_OFF_TEXT };
    }
    if (m.imageUrl) {
      return { id: uid(), kind: 'photo', role: 'user', url: aiAssetUrl(m.imageUrl), caption: m.content };
    }
    if (m.fileName) {
      return { id: uid(), kind: 'file', role: 'user', name: m.fileName, size: 0 };
    }
    return { id: uid(), kind: 'text', role: m.role, content: m.content };
  });
}

/* ------------------------------ speech typing ------------------------------ */

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event & { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}
function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition as new () => SpeechRecognitionLike) || (w.webkitSpeechRecognition as new () => SpeechRecognitionLike) || null;
}

/* ------------------------------ small pieces ------------------------------ */

function ChatChart({ chart }: { chart: ChartSpec }) {
  switch (chart.type) {
    case 'line':
      return <LineChart data={chart.data} color={chart.color} height={160} valueFormatter={(v) => String(Math.round(v))} />;
    case 'bar':
      return <BarChart data={chart.data} height={160} />;
    case 'donut':
      return <DonutChart segments={chart.data} size={120} thickness={18} />;
    default:
      return null;
  }
}

const blink = keyframes`0%,80%,100%{opacity:.25}40%{opacity:1}`;
const pulse = keyframes`0%{box-shadow:0 0 0 0 rgba(229,35,43,.45)}70%{box-shadow:0 0 0 10px rgba(229,35,43,0)}100%{box-shadow:0 0 0 0 rgba(229,35,43,0)}`;

function TypingIndicator() {
  return (
    <Stack direction="row" spacing={0.6} alignItems="center" sx={{ height: 20, px: 0.5 }} aria-label="Assistant is typing">
      {[0, 1, 2].map((i) => (
        <Box key={i} sx={{ width: 6, height: 6, bgcolor: 'text.primary', animation: `${blink} 1.2s infinite`, animationDelay: `${i * 0.2}s` }} />
      ))}
    </Stack>
  );
}
const ASSISTANT_BG = '#f0f0f0';
const TAIL = 8;

/**
 * WhatsApp-style bubble: assistant on the left with a tail pointing left,
 * user on the right with a tail pointing right. `grouped` hides the tail for
 * consecutive messages from the same side.
 */
function Bubble({ role, grouped = false, children, wide = false }: { role: 'user' | 'assistant'; grouped?: boolean; children: React.ReactNode; wide?: boolean }) {
  const isUser = role === 'user';
  const bg = isUser ? '#0a0a0a' : ASSISTANT_BG;
  return (
    <Box sx={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', mt: grouped ? '-8px !important' : undefined, px: `${TAIL}px` }}>
      <Box
        sx={{
          position: 'relative',
          maxWidth: wide ? { xs: '100%', sm: 560 } : { xs: '85%', sm: '72%' },
          flexGrow: wide ? { xs: 1, sm: 0 } : 0,
          minWidth: 0,
          px: 2,
          py: 1.25,
          bgcolor: bg,
          color: isUser ? '#fff' : 'text.primary',
          ...(grouped
            ? {}
            : {
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  width: 0,
                  height: 0,
                  borderStyle: 'solid',
                  ...(isUser
                    ? { right: -TAIL, borderWidth: `0 0 ${TAIL}px ${TAIL}px`, borderColor: `transparent transparent transparent ${bg}` }
                    : { left: -TAIL, borderWidth: `0 ${TAIL}px ${TAIL}px 0`, borderColor: `transparent ${bg} transparent transparent` }),
                },
              }),
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

/* --------------------------------- page --------------------------------- */

export function LogPage() {
  const { notify } = useFeedback();
  const overview = useTodayOverview();

  const [items, setItems] = useState<ThreadItem[]>([]);
  const [input, setInput] = useState('');
  const [photo, setPhoto] = useState<{ file: File; url: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [addMenu, setAddMenu] = useState<HTMLElement | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [editing, setEditing] = useState<{ meal: FoodEntry; itemId: string | null } | null>(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyPage, setHistoryPage] = useState(1);
  const [hasMoreHistory, setHasMoreHistory] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [aiUnavailable, setAiUnavailable] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(AI_OFF_KEY) === '1';
    } catch {
      return false;
    }
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const transcriptRef = useRef('');
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const itemsRef = useRef<ThreadItem[]>([]);
  itemsRef.current = items;

  const speechSupported = Boolean(getRecognitionCtor());
  const isEmpty = items.length === 0;
  const hasDraft = Boolean(input.trim()) || Boolean(photo);

  const markAiUnavailable = () => {
    setAiUnavailable(true);
    try {
      sessionStorage.setItem(AI_OFF_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  /* ---- history ---- */
  useEffect(() => {
    let cancelled = false;
    listChatHistory(1, HISTORY_PAGE_SIZE)
      .then((res) => {
        if (cancelled) return;
        // Messages arrive newest-first; reverse so the thread reads oldest → newest.
        setItems(toThreadItems(res.messages.slice().reverse()));
        setHistoryPage(1);
        setHasMoreHistory(res.pagination.page < res.pagination.totalPages);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [items, sending]);

  useEffect(
    () => () => {
      recognitionRef.current?.abort();
      if (photo) URL.revokeObjectURL(photo.url);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const push = (item: ThreadItem) => setItems((prev) => [...prev, item]);
  const patch = (id: string, fn: (it: ThreadItem) => ThreadItem) => setItems((prev) => prev.map((it) => (it.id === id ? fn(it) : it)));

  /** Text-only history for the LLM and for persistence. */
  const historyForModel = (): ChatMessage[] =>
    itemsRef.current.map((it): ChatMessage => {
      if (it.kind === 'text' || it.kind === 'notice') return { role: it.role, content: it.content };
      if (it.kind === 'photo') return { role: 'user', content: `[Photo] ${it.caption}`.trim() };
      if (it.kind === 'file') return { role: 'user', content: `[File] ${it.name}` };
      return { role: 'assistant', content: it.text };
    });

  /** Ask the assistant to respond to the latest user message already in the thread. */
  const askAssistant = async (userMsg: ChatMessage, opts: { quietFallback?: boolean } = {}) => {
    setSending(true);
    setError(null);
    try {
      const res = await sendChat([...historyForModel(), userMsg].slice(-30));
      if (res.usedFallback) {
        markAiUnavailable();
        // The meal was already saved by the form/file path: the banner is enough, skip the in-thread notice.
        if (!opts.quietFallback) push({ id: uid(), kind: 'notice', role: 'assistant', content: AI_OFF_TEXT });
        return;
      }
      push({ id: uid(), kind: 'text', role: 'assistant', content: res.reply });
      appendChatHistory([userMsg, { role: 'assistant', content: res.reply }]).catch(() => undefined);
      window.dispatchEvent(new Event('caloriepal:meal-saved'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to get a reply');
    } finally {
      setSending(false);
    }
  };

  /* ---- sending ---- */
  const sendText = async (raw: string) => {
    const text = raw.trim();
    if (!text || sending) return;
    push({ id: uid(), kind: 'text', role: 'user', content: text });
    setInput('');
    await askAssistant({ role: 'user', content: text });
  };

  const logEntries = async (entries: ImportEntry[], sourceLabel: string) => {
    const saved = await Promise.all(entries.map((e) => createMeal(e)));
    const text = `Logged ${saved.length} item${saved.length === 1 ? '' : 's'} from your ${sourceLabel}. Tap Edit if anything looks off.`;
    push({ id: uid(), kind: 'result', role: 'assistant', text, mode: 'logged', logged: saved, pending: [] });
    window.dispatchEvent(new Event('caloriepal:meal-saved'));
    return saved;
  };

  const sendPhoto = async (file: File, url: string, caption: string) => {
    push({ id: uid(), kind: 'photo', role: 'user', url, caption });
    setPhoto(null);
    setInput('');
    setSending(true);
    setError(null);
    try {
      const { entries, source, fileUrl } = await fileToEntries(file);
      const photoMsg: ChatMessage = { role: 'user', content: caption.trim() || '[Photo]', imageUrl: fileUrl ?? null };
      if (entries.length === 0) {
        const text = "I couldn't find any food in that photo. Try a closer shot, or tell me what it was.";
        push({ id: uid(), kind: 'text', role: 'assistant', content: text });
        appendChatHistory([photoMsg, { role: 'assistant', content: text }]).catch(() => undefined);
        return;
      }
      if (source === 'ai') {
        const saved = await logEntries(entries, 'photo');
        appendChatHistory([
          photoMsg,
          { role: 'assistant', content: `Logged from photo: ${saved.map(describeEntry).join('; ')}` },
        ]).catch(() => undefined);
      } else {
        markAiUnavailable();
        appendChatHistory([photoMsg]).catch(() => undefined);
        push({
          id: uid(),
          kind: 'result',
          role: 'assistant',
          text: "I couldn't analyse the photo right now, so this is only a sample estimate. Log it anyway, or fill in the meal with the plus button.",
          mode: 'pending',
          logged: [],
          pending: entries,
        });
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not read the photo');
    } finally {
      setSending(false);
    }
  };

  const sendFile = async (file: File) => {
    if (isImageFile(file)) {
      // Images go through the photo path so the thumbnail shows in the thread.
      const url = URL.createObjectURL(file);
      await sendPhoto(file, url, input.trim());
      return;
    }
    push({ id: uid(), kind: 'file', role: 'user', name: file.name, size: file.size });
    setSending(true);
    setError(null);
    try {
      const { entries, source } = await fileToEntries(file);
      if (entries.length === 0) {
        push({ id: uid(), kind: 'text', role: 'assistant', content: `I couldn't find any food entries in ${file.name}. Check the format and try again.` });
        return;
      }
      if (source === 'ai') {
        const saved = await logEntries(entries, 'file');
        setSending(false);
        await askAssistant(
          { role: 'user', content: `I uploaded ${file.name} and logged: ${saved.map(describeEntry).join('; ')}. Anything I should know?`, fileName: file.name },
          { quietFallback: true },
        );
      } else {
        markAiUnavailable();
        push({
          id: uid(),
          kind: 'result',
          role: 'assistant',
          text: `I couldn't analyse ${file.name} right now, so these are sample values. Log them anyway, or fill in the meals manually.`,
          mode: 'pending',
          logged: [],
          pending: entries,
        });
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not read the file');
    } finally {
      setSending(false);
    }
  };

  /** A meal saved through the manual form becomes a user message + card, and the assistant responds. */
  const onManualSaved = async (entry: FoodEntry) => {
    const text = `I logged ${describeEntry(entry)}`;
    push({ id: uid(), kind: 'text', role: 'user', content: text });
    push({ id: uid(), kind: 'result', role: 'assistant', text: 'Saved to your log.', mode: 'logged', logged: [entry], pending: [] });
    window.dispatchEvent(new Event('caloriepal:meal-saved'));
    if (!aiUnavailable) await askAssistant({ role: 'user', content: `${text}. Any quick feedback?` }, { quietFallback: true });
  };

  const send = () => {
    if (sending) return;
    if (photo) void sendPhoto(photo.file, photo.url, input.trim());
    else void sendText(input);
  };

  const attachPhoto = (file: File | undefined) => {
    if (!file) return;
    if (photo) URL.revokeObjectURL(photo.url);
    setPhoto({ file, url: URL.createObjectURL(file) });
    setError(null);
  };

  /* ---- result card actions ---- */
  const confirmPending = async (id: string) => {
    const it = itemsRef.current.find((x) => x.id === id);
    if (!it || it.kind !== 'result') return;
    patch(id, (x) => ({ ...x, busy: true }));
    try {
      const saved = await Promise.all(it.pending.map((e) => createMeal(e)));
      patch(id, (x) => (x.kind === 'result' ? { ...x, mode: 'logged', logged: saved, pending: [], busy: false, text: `Logged ${saved.length} item${saved.length === 1 ? '' : 's'}.` } : x));
      window.dispatchEvent(new Event('caloriepal:meal-saved'));
    } catch (err) {
      patch(id, (x) => ({ ...x, busy: false }));
      notify(err instanceof ApiError ? err.message : 'Could not log entries', 'error');
    }
  };

  const undoResult = async (id: string) => {
    const it = itemsRef.current.find((x) => x.id === id);
    if (!it || it.kind !== 'result') return;
    patch(id, (x) => ({ ...x, busy: true }));
    try {
      await Promise.all(it.logged.map((m) => deleteMeal(m.id)));
      patch(id, (x) => (x.kind === 'result' ? { ...x, mode: 'undone', busy: false } : x));
      window.dispatchEvent(new Event('caloriepal:meal-saved'));
      notify('Removed');
    } catch (err) {
      patch(id, (x) => ({ ...x, busy: false }));
      notify(err instanceof ApiError ? err.message : 'Could not undo', 'error');
    }
  };

  /* ---- tap-to-listen (auto-mute after 3s of silence) ---- */
  const stopRecording = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    recognitionRef.current?.stop();
  };

  const toggleListening = () => {
    if (recording) {
      stopRecording();
      return;
    }
    if (sending) return;
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setError('Voice input is not supported in this browser.');
      return;
    }
    const rec = new Ctor();
    rec.lang = 'en-US';
    rec.continuous = true;
    rec.interimResults = true;
    transcriptRef.current = '';

    const resetSilenceTimer = () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        silenceTimerRef.current = null;
        recognitionRef.current?.stop();
      }, 3000);
    };

    rec.onresult = (e) => {
      let t = '';
      for (let i = 0; i < e.results.length; i += 1) t += e.results[i][0].transcript;
      transcriptRef.current = t.trim();
      setInput(transcriptRef.current);
      resetSilenceTimer();
    };
    rec.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') setError('Microphone access was denied.');
      setRecording(false);
    };
    rec.onend = () => {
      setRecording(false);
      recognitionRef.current = null;
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    };
    recognitionRef.current = rec;
    setRecording(true);
    rec.start();
  };

  const clearChat = async () => {
    setItems([]);
    setConfirmClear(false);
    try {
      await clearChatHistory();
    } catch {
      /* UI already reset */
    }
  };

  /** Fetch and prepend an older page of chat history. */
  const loadOlder = async () => {
    if (loadingOlder || !hasMoreHistory) return;
    setLoadingOlder(true);
    const nextPage = historyPage + 1;
    try {
      const res = await listChatHistory(nextPage, HISTORY_PAGE_SIZE);
      const older = toThreadItems(res.messages.slice().reverse());
      setItems((prev) => [...older, ...prev]);
      setHistoryPage(nextPage);
      setHasMoreHistory(res.pagination.page < res.pagination.totalPages);
    } catch {
      /* keep current items */
    } finally {
      setLoadingOlder(false);
    }
  };

  /* --------------------------------- render --------------------------------- */

  const thread = (
    <Stack spacing={2} sx={{ flexGrow: 1, minHeight: 0 }}>
      <Box sx={{ display: { xs: 'block', md: 'none' } }}>
        <TodaySummary data={overview.comparison} loading={overview.loading} variant="hero" linkTo="/insights" />
      </Box>

      {aiUnavailable && (
        <Alert severity="info" icon={<Info fontSize="inherit" />} onClose={() => setAiUnavailable(false)}>
          {AI_OFF_TEXT}
        </Alert>
      )}
      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minHeight: 280, border: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Box ref={scrollRef} sx={{ flexGrow: 1, overflowY: 'auto', p: { xs: 1.5, sm: 2.5 }, display: 'flex', flexDirection: 'column' }}>
          <Stack spacing={2} sx={{ mt: 'auto' }}>
            {historyLoading && (
              <>
                <Skeleton variant="rectangular" width="60%" height={44} />
                <Stack direction="row" justifyContent="flex-end">
                  <Skeleton variant="rectangular" width="40%" height={40} />
                </Stack>
              </>
            )}

            {!historyLoading && isEmpty && (
              <Bubble role="assistant">
                <Stack spacing={1}>
                  {WELCOME_LINES.map((line, i) => (
                    <Typography key={i} variant="body2" sx={{ fontWeight: i === 0 ? 600 : 400 }}>
                      {line}
                    </Typography>
                  ))}
                </Stack>
              </Bubble>
            )}

            {!historyLoading && hasMoreHistory && (
              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <Button size="small" variant="outlined" onClick={loadOlder} disabled={loadingOlder}>
                  {loadingOlder ? 'Loading…' : 'Load older messages'}
                </Button>
              </Box>
            )}

            {!historyLoading &&
              items.map((it, idx) => {
                const prev = items[idx - 1];
                const grouped = Boolean(prev) && prev.role === it.role && prev.kind !== 'notice';
                if (it.kind === 'notice') {
                  return (
                    <Stack
                      key={it.id}
                      direction={{ xs: 'column', sm: 'row' }}
                      spacing={1.5}
                      alignItems={{ xs: 'flex-start', sm: 'center' }}
                      sx={{ px: 1.5, py: 1.25, bgcolor: '#f5f5f5', border: 1, borderColor: 'divider' }}
                    >
                      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flexGrow: 1 }}>
                        <Info fontSize="small" />
                        <Typography variant="body2">{it.content}</Typography>
                      </Stack>
                      <Button size="small" variant="outlined" onClick={() => setManualOpen(true)} sx={{ flexShrink: 0, alignSelf: { xs: 'flex-end', sm: 'center' } }}>
                        Fill in manually
                      </Button>
                    </Stack>
                  );
                }
                if (it.kind === 'text') {
                  return (
                    <Bubble key={it.id} role={it.role} grouped={grouped}>
                      {it.role === 'user' ? (
                        <Typography variant="body2" className="break-word">
                          {it.content}
                        </Typography>
                      ) : (
                        parseAssistantContent(it.content).map((seg, i) =>
                          seg.kind === 'text' ? (
                            <Typography key={i} variant="body2" component="div" className="break-word chat-html" dangerouslySetInnerHTML={{ __html: seg.html }} />
                          ) : (
                            <Box key={i} sx={{ my: 1.5, minWidth: { sm: 320 } }}>
                              <ChatChart chart={seg.chart} />
                            </Box>
                          ),
                        )
                      )}
                    </Bubble>
                  );
                }
                if (it.kind === 'photo') {
                  return (
                    <Bubble key={it.id} role="user">
                      <Box component="img" src={it.url} alt="Food photo" sx={{ display: 'block', maxWidth: 240, maxHeight: 240, objectFit: 'cover', mb: it.caption ? 1 : 0 }} />
                      {it.caption && (
                        <Typography variant="body2" className="break-word">
                          {it.caption}
                        </Typography>
                      )}
                    </Bubble>
                  );
                }
                if (it.kind === 'file') {
                  return (
                    <Bubble key={it.id} role="user">
                      <Stack direction="row" spacing={1.25} alignItems="center">
                        <InsertDriveFile fontSize="small" />
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body2" noWrap fontWeight={600}>
                            {it.name}
                          </Typography>
                          {it.size > 0 && (
                            <Typography variant="caption" sx={{ opacity: 0.8 }}>
                              {formatBytes(it.size)}
                            </Typography>
                          )}
                        </Box>
                      </Stack>
                    </Bubble>
                  );
                }
                return (
                  <Bubble key={it.id} role="assistant" grouped={grouped} wide>
                    <Box sx={{ minWidth: { sm: 380 } }}>
                      <Typography variant="body2">{it.text}</Typography>
                      <MealResultCard
                        mode={it.mode}
                        rows={it.mode === 'pending' ? it.pending : it.logged}
                        busy={it.busy}
                        onEdit={(i: number) => setEditing({ meal: it.logged[i], itemId: it.id })}
                        onUndo={() => undoResult(it.id)}
                        onConfirm={() => confirmPending(it.id)}
                        onDiscard={() => patch(it.id, (x) => (x.kind === 'result' ? { ...x, mode: 'discarded' } : x))}
                      />
                    </Box>
                  </Bubble>
                );
              })}

            {sending && (
              <Bubble role="assistant">
                <TypingIndicator />
              </Bubble>
            )}
          </Stack>
        </Box>
      </Box>

      {/* Composer: [+] [camera] [input] [mic → send] */}
      <Box>
        {photo && (
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1, p: 1, border: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
            <Box component="img" src={photo.url} alt="Selected food photo" sx={{ width: 56, height: 56, objectFit: 'cover' }} />
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Typography variant="body2" noWrap>
                {photo.file.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Add a note (optional), then send.
              </Typography>
            </Box>
            <IconButton aria-label="Remove photo" onClick={() => setPhoto(null)} size="small">
              <Close fontSize="small" />
            </IconButton>
          </Stack>
        )}

        <input ref={photoRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { attachPhoto(e.target.files?.[0]); e.target.value = ''; }} />
        <input ref={fileRef} type="file" accept={IMPORT_ACCEPT} hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void sendFile(f); }} />

        <Stack direction="row" spacing={1} alignItems="center">
          <Tooltip title="More ways to log">
            <IconButton
              aria-label="More ways to log"
              aria-haspopup="menu"
              onClick={(e) => setAddMenu(e.currentTarget)}
              disabled={sending}
              sx={{ width: 40, height: 40, flexShrink: 0, border: 1, borderColor: 'divider', color: 'text.primary' }}
            >
              <Add fontSize="small" />
            </IconButton>
          </Tooltip>
          <Menu
            anchorEl={addMenu}
            open={Boolean(addMenu)}
            onClose={() => setAddMenu(null)}
            anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
            transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            slotProps={{ paper: { sx: { mb: 1, minWidth: 220 } } }}
          >
            <MenuItem onClick={() => { setAddMenu(null); setManualOpen(true); }}>
              <ListItemIcon><EditNote fontSize="small" /></ListItemIcon>
              <ListItemText primary="Fill in manually" secondary="Enter name, portion and nutrition" />
            </MenuItem>
            <MenuItem onClick={() => { setAddMenu(null); fileRef.current?.click(); }}>
              <ListItemIcon><UploadFile fontSize="small" /></ListItemIcon>
              <ListItemText primary="Upload a file" secondary="CSV, PDF, text or a diary photo" />
            </MenuItem>
            {!isEmpty && (
              <>
                <Divider />
                <MenuItem onClick={() => { setAddMenu(null); setConfirmClear(true); }}>
                  <ListItemIcon><DeleteSweep fontSize="small" /></ListItemIcon>
                  <ListItemText primary="Clear conversation" />
                </MenuItem>
              </>
            )}
          </Menu>

          <Tooltip title={aiUnavailable ? 'Photo logging unavailable' : 'Photo of your food'}>
            <IconButton
              aria-label="Add a photo"
              onClick={() => photoRef.current?.click()}
              disabled={sending || aiUnavailable}
              sx={{
                width: 40,
                height: 40,
                flexShrink: 0,
                bgcolor: 'primary.main',
                color: '#fff',
                '&:hover': { bgcolor: 'primary.light' },
                '&.Mui-disabled': { bgcolor: '#e5e5e5', color: '#a3a3a3' },
              }}
            >
              <PhotoCamera fontSize="small" />
            </IconButton>
          </Tooltip>

          <TextField
            fullWidth
            multiline
            maxRows={4}
            size="small"
            placeholder={recording ? 'Listening…' : photo ? 'Add a note, e.g. "large portion"' : 'What did you eat?'}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            onPaste={(e) => {
              const f = Array.from(e.clipboardData.files).find((x) => x.type.startsWith('image/'));
              if (f) attachPhoto(f);
            }}
            inputProps={{ 'aria-label': 'Message' }}
            sx={{ '& .MuiInputBase-root': { minHeight: 40, py: 0.75 } }}
          />

          {speechSupported && (
            <Tooltip title={recording ? 'Listening… tap to mute' : 'Voice input'}>
              <IconButton
                aria-label={recording ? 'Stop listening' : 'Start voice input'}
                aria-pressed={recording}
                onClick={toggleListening}
                disabled={sending}
                sx={{
                  width: 40,
                  height: 40,
                  flexShrink: 0,
                  bgcolor: recording ? 'secondary.main' : 'primary.main',
                  color: '#fff',
                  animation: recording ? `${pulse} 1.2s infinite` : 'none',
                  '&:hover': { bgcolor: recording ? 'secondary.dark' : 'primary.light' },
                  '&.Mui-disabled': { bgcolor: '#e5e5e5', color: '#a3a3a3' },
                }}
              >
                <Mic fontSize="small" />
              </IconButton>
            </Tooltip>
          )}

          <IconButton
            onClick={send}
            disabled={sending || !hasDraft}
            aria-label="Send"
            sx={{ width: 40, height: 40, flexShrink: 0, bgcolor: 'secondary.main', color: '#fff', '&:hover': { bgcolor: 'secondary.dark' }, '&.Mui-disabled': { bgcolor: '#e5e5e5', color: '#a3a3a3' } }}
          >
            <Send fontSize="small" />
          </IconButton>
        </Stack>
      </Box>
    </Stack>
  );

  return (
    <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', height: { xs: 'calc(100dvh - 56px - 64px - 48px)', md: 'calc(100dvh - 64px - 64px)' } }}>
      <Box sx={{ display: { xs: 'none', md: 'block' }, mb: 2 }}>
        <PageHeader title="Log" subtitle="Photo, a sentence, your voice, or the form — whatever's fastest" />
      </Box>

      <Box sx={{ flexGrow: 1, minHeight: 0, display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) 360px' } }}>
        <Box sx={{ minHeight: 0, display: 'flex', flexDirection: 'column' }}>{thread}</Box>
        <Box sx={{ display: { xs: 'none', md: 'block' }, overflowY: 'auto', minHeight: 0 }}>
          <OverviewPanel
            comparison={overview.comparison}
            week={overview.week}
            todayMeals={overview.todayMeals}
            loading={overview.loading}
            onEdit={(meal) => setEditing({ meal, itemId: null })}
          />
        </Box>
      </Box>

      <MealDialog open={manualOpen} onClose={() => setManualOpen(false)} onSaved={(entry) => void onManualSaved(entry)} />
      <MealDialog
        open={Boolean(editing)}
        meal={editing?.meal ?? null}
        onClose={() => setEditing(null)}
        onSaved={(saved) => {
          window.dispatchEvent(new Event('caloriepal:meal-saved'));
          if (editing?.itemId) {
            patch(editing.itemId, (x) => (x.kind === 'result' ? { ...x, logged: x.logged.map((m) => (m.id === saved.id ? saved : m)) } : x));
          }
        }}
      />
      <ConfirmDialog
        open={confirmClear}
        title="Clear this conversation?"
        description="Your chat history will be deleted. Logged meals are not affected."
        confirmLabel="Clear"
        destructive
        onConfirm={clearChat}
        onCancel={() => setConfirmClear(false)}
      />
    </Box>
  );
}
