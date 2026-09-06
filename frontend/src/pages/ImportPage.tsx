import { useRef, useState, type DragEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import { CheckCircle, Edit, InsertDriveFile, UploadFile } from '@mui/icons-material';
import { importEntries, type ImportEntry } from '../api/import';
import { ApiError } from '../api/client';
import { formatDate, MEAL_TYPE_LABELS, micronutrientLabel, micronutrientUnit } from '../utils/format';
import { fileToEntries, IMPORT_ACCEPT as ACCEPT } from '../utils/extractFile';
import { PageHeader } from '../components/common/PageHeader';
import { MealFormDialog } from '../components/MealFormDialog';
import type { MealInput } from '../api/meals';
import { useFeedback } from '../context/FeedbackContext';

interface NutrientItem {
  label: string;
  value: number;
  unit: string;
}

function formatNutrient(value: number): string {
  return Number.isFinite(value) ? String(Math.round(value)) : '0';
}

/**
 * Compact nutrition cell: shows the first two nutrients inline in small font,
 * and any remaining nutrients on a hover card.
 */
function CompactNutrition({ items }: { items: NutrientItem[] }) {
  if (items.length === 0) {
    return (
      <Typography variant="caption" color="text.secondary">
        —
      </Typography>
    );
  }
  const visible = items.slice(0, 2);
  const rest = items.slice(2);
  return (
    <Box>
      {visible.map((n) => (
        <Typography key={n.label} variant="caption" component="div" sx={{ lineHeight: 1.25 }}>
          {n.label} {formatNutrient(n.value)}
          {n.unit}
        </Typography>
      ))}
      {rest.length > 0 && (
        <Tooltip
          title={
            <Box sx={{ py: 0.5 }}>
              {items.map((n) => (
                <Typography key={n.label} variant="caption" component="div" sx={{ color: '#fff', lineHeight: 1.4 }}>
                  {n.label}: {formatNutrient(n.value)}
                  {n.unit}
                </Typography>
              ))}
            </Box>
          }
        >
          <Typography variant="caption" color="text.secondary" sx={{ display: 'inline-block', cursor: 'help' }}>
            +{rest.length} more
          </Typography>
        </Tooltip>
      )}
    </Box>
  );
}

function ImportRow({ entry, index, onEdit }: { entry: ImportEntry; index: number; onEdit: (i: number) => void }) {
  const macros: NutrientItem[] = [
    { label: 'Fiber', value: entry.fiber, unit: 'g' },
    { label: 'Sugar', value: entry.sugar, unit: 'g' },
    { label: 'Sodium', value: entry.sodium, unit: 'mg' },
  ];
  const micros: NutrientItem[] = Object.entries({ ...entry.vitamins, ...entry.minerals })
    .filter(([, v]) => Number.isFinite(v))
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => ({ label: micronutrientLabel(k), value: v, unit: micronutrientUnit(k) }));

  return (
    <TableRow hover>
      <TableCell sx={{ maxWidth: 220 }}>
        <Typography variant="body2" noWrap title={entry.foodName}>
          {entry.foodName}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {entry.quantity} {entry.unit}
        </Typography>
      </TableCell>
      <TableCell>{MEAL_TYPE_LABELS[entry.mealType]}</TableCell>
      <TableCell align="right">{Math.round(entry.calories)}</TableCell>
      <TableCell align="right">{Math.round(entry.protein)}g</TableCell>
      <TableCell align="right">{Math.round(entry.carbs)}g</TableCell>
      <TableCell align="right">{Math.round(entry.fat)}g</TableCell>
      <TableCell>
        <CompactNutrition items={macros} />
      </TableCell>
      <TableCell>
        <CompactNutrition items={micros} />
      </TableCell>
      <TableCell align="right">
        <Tooltip title="Edit entry">
          <IconButton size="small" aria-label={`Edit ${entry.foodName}`} onClick={() => onEdit(index)}>
            <Edit fontSize="small" />
          </IconButton>
        </Tooltip>
      </TableCell>
    </TableRow>
  );
}

export function ImportPage() {
  const navigate = useNavigate();
  const { notify } = useFeedback();
  const inputRef = useRef<HTMLInputElement>(null);
  const [entries, setEntries] = useState<ImportEntry[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [parsingName, setParsingName] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imported, setImported] = useState<number | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const handleFile = async (f: File | undefined) => {
    if (!f) return;
    setError(null);
    setImported(null);
    setParsingName(f.name);
    setParsing(true);
    try {
      const { entries: result } = await fileToEntries(f);
      if (result.length === 0) {
        setError(`No recognizable food entries were found in ${f.name}.`);
      } else {
        setFiles((prev) => [...prev, f]);
        setEntries((prev) => [...prev, ...result]);
      }
    } catch (err) {
      setError(err instanceof Error ? `Could not read file: ${err.message}` : 'Could not read file');
    } finally {
      setParsing(false);
      setParsingName(null);
    }
  };

  const handleImport = async () => {
    setImporting(true);
    setError(null);
    try {
      const res = await importEntries(entries);
      setImported(res.imported);
      setEntries([]);
      setFiles([]);
      notify(`Imported ${res.imported} entr${res.imported === 1 ? 'y' : 'ies'}`);
      window.dispatchEvent(new Event('caloriepal:meal-saved'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    if (parsing) return;
    handleFile(e.dataTransfer.files?.[0]);
  };

  const reset = () => {
    setFiles([]);
    setEntries([]);
    setImported(null);
    setError(null);
    setEditingIndex(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  /** Save an edited draft row back into local state (no API call until Import). */
  const handleEditSubmit = async (input: MealInput) => {
    if (editingIndex == null) return;
    setEntries((prev) => prev.map((e, i) => (i === editingIndex ? { ...e, ...input } : e)));
  };

  const totalCalories = entries.reduce((s, e) => s + e.calories, 0);

  return (
    <Stack spacing={3}>
      <PageHeader title="Import meals" subtitle="Upload a food diary, nutrition label photo, or spreadsheet and we'll extract the entries" />

      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) void handleFile(f);
        }}
      />

      {imported != null ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <CheckCircle sx={{ fontSize: 48, mb: 1 }} />
            <Typography variant="h6" sx={{ mb: 0.5 }}>
              Imported {imported} entr{imported === 1 ? 'y' : 'ies'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Entries were dated {formatDate(new Date().toISOString())}. You can edit any of them in Meals.
            </Typography>
            <Stack direction="row" spacing={1.5} justifyContent="center">
              <Button variant="contained" onClick={() => navigate('/meals')}>
                View meals
              </Button>
              <Button variant="outlined" onClick={reset}>
                Import another file
              </Button>
            </Stack>
          </CardContent>
        </Card>
      ) : (
        <Box
          role="button"
          tabIndex={0}
          aria-label="Choose a file to import"
          onClick={() => !parsing && inputRef.current?.click()}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && !parsing) {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            if (!parsing) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          sx={{
            border: '2px dashed',
            borderColor: dragging ? 'secondary.main' : 'primary.main',
            bgcolor: dragging ? 'rgba(229,35,43,0.04)' : 'background.paper',
            textAlign: 'center',
            px: 3,
            py: { xs: 5, sm: 7 },
            cursor: parsing ? 'progress' : 'pointer',
            outline: 'none',
            transition: 'background-color 120ms, border-color 120ms',
            '&:focus-visible': { boxShadow: '0 0 0 3px rgba(229,35,43,0.35)' },
          }}
        >
          {parsing ? (
            <>
              <CircularProgress size={40} sx={{ mb: 2 }} />
              <Typography variant="subtitle1">Reading {parsingName}…</Typography>
              <Typography variant="body2" color="text.secondary">
                Extracting food entries. This can take a few seconds for photos and PDFs.
              </Typography>
            </>
          ) : (
            <>
              <UploadFile sx={{ fontSize: 48, mb: 1.5 }} />
              <Typography variant="subtitle1" sx={{ mb: 0.5 }}>
                {dragging ? 'Drop to import' : 'Drag a file here, or click to browse'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                PDF, JPG, PNG, CSV, TXT, JSON · add files one at a time
              </Typography>
              <Button variant="contained" component="span" tabIndex={-1}>
                Choose file
              </Button>
            </>
          )}
        </Box>
      )}

      {imported == null && (
        <Card>
          <CardContent>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} justifyContent="space-between" sx={{ mb: 2.5 }}>
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
                <Box sx={{ width: 40, height: 40, bgcolor: '#f0f0f0', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                  <InsertDriveFile fontSize="small" />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="subtitle2">
                    {files.length} file{files.length === 1 ? '' : 's'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {entries.length} entr{entries.length === 1 ? 'y' : 'ies'} detected
                    {entries.length > 0 && ` · ${Math.round(totalCalories)} kcal total`}
                  </Typography>
                </Box>
              </Stack>
              <Stack direction="row" spacing={1.5}>
                <Button variant="outlined" onClick={reset} disabled={importing || entries.length === 0}>
                  Remove all
                </Button>
                <Button variant="contained" onClick={handleImport} disabled={importing || entries.length === 0}>
                  {importing ? 'Importing…' : `Import ${entries.length}`}
                </Button>
              </Stack>
            </Stack>

            <TableContainer sx={{ maxHeight: 440, overflowY: 'auto' }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Food</TableCell>
                    <TableCell>Meal</TableCell>
                    <TableCell align="right">kcal</TableCell>
                    <TableCell align="right">Protein</TableCell>
                    <TableCell align="right">Carbs</TableCell>
                    <TableCell align="right">Fat</TableCell>
                    <TableCell>Macros</TableCell>
                    <TableCell>Micros</TableCell>
                    <TableCell align="right" sx={{ width: 44 }} />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {entries.map((entry, i) => (
                    <ImportRow key={i} entry={entry} index={i} onEdit={setEditingIndex} />
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      <MealFormDialog
        open={editingIndex != null}
        title="Edit entry"
        submitLabel="Save entry"
        initial={editingIndex != null ? entries[editingIndex] : null}
        formKey={editingIndex ?? 'new'}
        onClose={() => setEditingIndex(null)}
        onSubmit={handleEditSubmit}
      />
    </Stack>
  );
}
