'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState, useTransition } from 'react';

import { deleteSong, setPublished } from '@/app/(dashboard)/songs/actions';
import { Badge, Card, EmptyRow, StatTile } from '@/components/ui';

export type SongRow = {
  id: string;
  title: string;
  artist: string;
  album: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  durationMs: number | null;
  isPublished: boolean;
  createdAt: string;
};

/**
 * Song library management.
 *
 * The file input is the source of truth for what will be uploaded — the staged list below
 * only mirrors it — so exactly what the admin picked is sent, whether they browsed for files
 * or dropped them.
 *
 * Files go up one request at a time to `POST /api/admin/songs/upload`. Server actions were
 * the obvious choice but cap request bodies at 1 MB; one-file-per-request also means a slow
 * upload reports progress per track instead of stalling on a single huge body.
 */
export function SongsManager({ songs }: { songs: SongRow[] }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [staged, setStaged] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'published' | 'hidden'>('all');

  const publishedCount = songs.filter((song) => song.isPublished).length;
  const storedBytes = songs.reduce((sum, song) => sum + song.sizeBytes, 0);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return songs.filter((song) => {
      if (filter === 'published' && !song.isPublished) return false;
      if (filter === 'hidden' && song.isPublished) return false;
      if (!needle) return true;
      return `${song.title} ${song.artist} ${song.album}`.toLowerCase().includes(needle);
    });
  }, [songs, query, filter]);

  /** Mirrors the input's FileList into state so the staged list can render it. */
  const syncStaged = () => setStaged(Array.from(inputRef.current?.files ?? []));

  /** Posts the staged files one at a time, stopping at the first failure. */
  const upload = async () => {
    setUploading(true);
    setError(null);
    setSuccess(null);
    setDone(0);

    let uploaded = 0;
    for (const file of staged) {
      const body = new FormData();
      body.append('file', file);
      try {
        const response = await fetch('/api/admin/songs/upload', { method: 'POST', body });
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          setError(payload?.error ?? `Upload failed for "${file.name}".`);
          break;
        }
      } catch {
        setError(`Could not reach the server while uploading "${file.name}".`);
        break;
      }
      uploaded += 1;
      setDone(uploaded);
    }

    setUploading(false);
    if (uploaded > 0) {
      setSuccess(`Uploaded ${uploaded} ${uploaded === 1 ? 'song' : 'songs'}. Publish to make them live.`);
      // Drop the files that made it; anything after a failure stays staged for a retry.
      setInputFiles(staged.slice(uploaded));
      router.refresh();
    }
  };

  /** Writes a file list back onto the input, which is what the client actually sends. */
  const setInputFiles = (files: File[]) => {
    if (!inputRef.current) return;
    const transfer = new DataTransfer();
    files.forEach((file) => transfer.items.add(file));
    inputRef.current.files = transfer.files;
    syncStaged();
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatTile
          label="Songs uploaded"
          value={songs.length}
          hint="Stored on the admin panel"
          tone="brand"
          icon={<Glyph name="music" />}
        />
        <StatTile
          label="Live in the app"
          value={publishedCount}
          hint="Visible in Admin songs mode"
          tone="info"
          icon={<Glyph name="broadcast" />}
        />
        <StatTile
          label="Hidden"
          value={songs.length - publishedCount}
          hint="Uploaded but not published"
          tone="warn"
          icon={<Glyph name="eyeOff" />}
        />
        <StatTile
          label="Storage used"
          value={formatBytes(storedBytes)}
          hint="Across all uploaded audio"
          tone="violet"
          icon={<Glyph name="disk" />}
        />
      </div>

      <Card
        title="Upload songs"
        description="Audio picked here is stored on the server. New uploads start hidden until you publish them."
      >
        <div className="p-5">
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              setInputFiles([...staged, ...Array.from(event.dataTransfer.files)]);
            }}
            onClick={() => inputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') inputRef.current?.click();
            }}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
              dragging
                ? 'border-brand-500 bg-brand-500/5'
                : 'border-ink-600 bg-ink-950 hover:border-brand-500 hover:bg-brand-500/5'
            }`}
          >
            <span className="flex size-14 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-500">
              <Glyph name="upload" size={26} />
            </span>
            <p className="mt-4 text-sm font-semibold text-mist-100">
              Drag audio files here, or click to browse
            </p>
            <p className="mt-1.5 text-xs text-mist-500">
              MP3, M4A, AAC, WAV, FLAC or OGG · up to 50 MB per file
            </p>
            <span className="btn-primary mt-5">
              <Glyph name="plus" size={16} />
              Choose files
            </span>
          </div>

          <input
            ref={inputRef}
            type="file"
            name="files"
            accept="audio/*,.mp3,.m4a,.aac,.wav,.flac,.ogg"
            multiple
            hidden
            onChange={syncStaged}
          />

          {error ? (
            <p className="mt-4 rounded-lg border border-danger-500/30 bg-danger-500/10 px-3 py-2.5 text-sm text-danger-500">
              {error}
            </p>
          ) : null}
          {success ? (
            <p className="mt-4 rounded-lg border border-brand-500/30 bg-brand-500/10 px-3 py-2.5 text-sm text-brand-500">
              {success}
            </p>
          ) : null}

          {staged.length > 0 ? (
            <div className="mt-5">
              <div className="mb-2.5 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-mist-500">
                  Ready to upload · {staged.length}
                </p>
                <button
                  type="button"
                  onClick={() => setInputFiles([])}
                  disabled={uploading}
                  className="text-xs font-medium text-mist-500 hover:text-mist-100 disabled:opacity-50"
                >
                  Clear all
                </button>
              </div>

              <ul className="divide-y divide-ink-800 overflow-hidden rounded-lg border border-ink-700">
                {staged.map((file, index) => (
                  <li
                    key={`${file.name}-${index}`}
                    className="flex items-center gap-3 bg-ink-850 px-4 py-3"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 text-brand-500">
                      <Glyph name="music" size={17} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-mist-100">{file.name}</p>
                      <p className="text-xs text-mist-500">{formatBytes(file.size)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setInputFiles(staged.filter((_, i) => i !== index))}
                      aria-label={`Remove ${file.name}`}
                      className="text-mist-500 transition-colors hover:text-danger-500"
                    >
                      <Glyph name="close" size={18} />
                    </button>
                  </li>
                ))}
              </ul>

              <div className="mt-4">
                <button
                  type="button"
                  onClick={upload}
                  className="btn-primary"
                  disabled={uploading}
                >
                  <Glyph name="upload" size={16} />
                  {uploading
                    ? `Uploading ${done + 1} of ${staged.length}…`
                    : `Upload ${staged.length} ${staged.length === 1 ? 'file' : 'files'}`}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </Card>

      <Card
        title="Panel library"
        description="Songs marked live appear in the app when a listener turns on Admin songs mode."
        className="overflow-hidden"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search songs…"
              className="input w-48 py-1.5 text-xs"
            />
            <div className="flex rounded-lg border border-ink-600 bg-ink-850 p-0.5">
              {(['all', 'published', 'hidden'] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors ${
                    filter === key ? 'bg-brand-500 text-white' : 'text-mist-500 hover:text-mist-100'
                  }`}
                >
                  {key}
                </button>
              ))}
            </div>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse">
            <thead className="border-b border-ink-700 bg-ink-900/60">
              <tr>
                <th className="th">Song</th>
                <th className="th">Album</th>
                <th className="th text-right">Duration</th>
                <th className="th text-right">Size</th>
                <th className="th">Uploaded</th>
                <th className="th">Status</th>
                <th className="th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-800">
              {visible.length === 0 ? (
                <EmptyRow
                  colSpan={7}
                  message={
                    songs.length === 0
                      ? 'No songs uploaded yet. Songs you upload above will be listed here.'
                      : 'No songs match this view.'
                  }
                />
              ) : (
                visible.map((song) => (
                  <tr key={song.id} className="transition-colors hover:bg-ink-800/60">
                    <td className="td">
                      <div className="flex items-center gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 text-brand-500">
                          <Glyph name="music" size={18} />
                        </span>
                        <div className="min-w-0">
                          <span className="block truncate font-medium text-mist-100">
                            {song.title}
                          </span>
                          <span className="block truncate text-xs text-mist-500">
                            {song.artist} · {formatType(song.mimeType)}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="td">{song.album}</td>
                    <td className="td text-right tabular-nums">
                      {formatDuration(song.durationMs)}
                    </td>
                    <td className="td text-right tabular-nums">{formatBytes(song.sizeBytes)}</td>
                    <td className="td">{formatDate(song.createdAt)}</td>
                    <td className="td">
                      {song.isPublished ? (
                        <Badge tone="brand">Live in app</Badge>
                      ) : (
                        <Badge tone="neutral">Hidden</Badge>
                      )}
                    </td>
                    <td className="td">
                      <div className="flex items-center justify-end gap-2">
                        <Switch
                          checked={song.isPublished}
                          label={`Publish ${song.title}`}
                          onChange={() =>
                            startTransition(() => {
                              void setPublished(song.id, !song.isPublished);
                            })
                          }
                        />
                        <button
                          type="button"
                          aria-label={`Remove ${song.title}`}
                          onClick={() => {
                            if (!confirm(`Delete "${song.title}"? This cannot be undone.`)) return;
                            startTransition(() => {
                              void deleteSong(song.id);
                            });
                          }}
                          className="rounded-lg border border-ink-600 bg-ink-850 p-1.5 text-mist-500 transition-colors hover:border-danger-500/40 hover:text-danger-500"
                        >
                          <Glyph name="trash" size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unit]}`;
}

/** Duration is unknown until the app reports it — the panel cannot decode audio itself. */
function formatDuration(ms: number | null): string {
  if (!ms) return '—';
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatType(mimeType: string): string {
  return mimeType.replace(/^audio\//, '').toUpperCase();
}

/** Pill switch matching the one the app shows for Admin songs mode. */
function Switch({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
        checked ? 'bg-brand-500' : 'bg-ink-600'
      }`}
    >
      <span
        className={`absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-all ${
          checked ? 'left-[22px]' : 'left-0.5'
        }`}
      />
    </button>
  );
}

const GLYPHS = {
  music: 'M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM21 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
  upload: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12',
  plus: 'M12 5v14M5 12h14',
  close: 'M18 6 6 18M6 6l12 12',
  trash: 'M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6',
  broadcast:
    'M4.9 19.1a10 10 0 0 1 0-14.2M19.1 4.9a10 10 0 0 1 0 14.2M7.8 16.2a6 6 0 0 1 0-8.4M16.2 7.8a6 6 0 0 1 0 8.4M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
  eyeOff:
    'M17.9 17.9A10.1 10.1 0 0 1 12 20c-7 0-11-8-11-8a18.5 18.5 0 0 1 5.1-6M9.9 4.2A9.1 9.1 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.2 3.2M9.9 9.9a3 3 0 0 0 4.2 4.2M1 1l22 22',
  disk: 'M21 8v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8M3 8l2-4h14l2 4M3 8h18M7 15h4',
} as const;

function Glyph({ name, size = 16 }: { name: keyof typeof GLYPHS; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className="shrink-0 stroke-current"
      fill="none"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={GLYPHS[name]} />
    </svg>
  );
}
