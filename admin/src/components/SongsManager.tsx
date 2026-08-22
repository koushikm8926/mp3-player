'use client';

import { useMemo, useRef, useState } from 'react';

import { Badge, Card, EmptyRow, StatTile } from '@/components/ui';

/**
 * Song library management — presentation only.
 *
 * Nothing here talks to the database or to storage yet, so the table starts empty and stays
 * that way: the upload zone stages picked files in local state without sending them
 * anywhere, and the publish switches only move rows around in memory. Every figure shown is
 * derived from that state rather than hardcoded, so nothing on screen is invented. Wiring
 * (Prisma model, upload route, mobile sync endpoint) is the next pass.
 */

type Song = {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: string;
  sizeBytes: number;
  format: string;
  uploadedAt: string;
  published: boolean;
};

/** A file the admin has picked but not yet uploaded. */
type StagedFile = { id: string; name: string; sizeBytes: number };

export function SongsManager() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [staged, setStaged] = useState<StagedFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'published' | 'hidden'>('all');

  const publishedCount = songs.filter((song) => song.published).length;
  const storedBytes = songs.reduce((sum, song) => sum + song.sizeBytes, 0);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return songs.filter((song) => {
      if (filter === 'published' && !song.published) return false;
      if (filter === 'hidden' && song.published) return false;
      if (!needle) return true;
      return `${song.title} ${song.artist} ${song.album}`.toLowerCase().includes(needle);
    });
  }, [songs, query, filter]);

  const stage = (files: FileList | null) => {
    if (!files?.length) return;
    setStaged((current) => [
      ...current,
      ...Array.from(files).map((file, index) => ({
        id: `${file.name}-${current.length + index}`,
        name: file.name,
        sizeBytes: file.size,
      })),
    ]);
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
        description="Audio picked here is added to the panel library and pushed to the app."
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
              stage(event.dataTransfer.files);
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
              MP3, M4A, AAC, WAV or FLAC · up to 50 MB per file
            </p>
            <span className="btn-primary mt-5">
              <Glyph name="plus" size={16} />
              Choose files
            </span>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="audio/*"
            multiple
            hidden
            onChange={(event) => {
              stage(event.target.files);
              event.target.value = '';
            }}
          />

          {staged.length > 0 ? (
            <div className="mt-5">
              <div className="mb-2.5 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-mist-500">
                  Ready to upload · {staged.length}
                </p>
                <button
                  type="button"
                  onClick={() => setStaged([])}
                  className="text-xs font-medium text-mist-500 hover:text-mist-100"
                >
                  Clear all
                </button>
              </div>

              <ul className="divide-y divide-ink-800 overflow-hidden rounded-lg border border-ink-700">
                {staged.map((file) => (
                  <li key={file.id} className="flex items-center gap-3 bg-ink-850 px-4 py-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 text-brand-500">
                      <Glyph name="music" size={17} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-mist-100">{file.name}</p>
                      <p className="text-xs text-mist-500">
                        {formatBytes(file.sizeBytes)} · waiting
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStaged((c) => c.filter((f) => f.id !== file.id))}
                      aria-label={`Remove ${file.name}`}
                      className="text-mist-500 transition-colors hover:text-danger-500"
                    >
                      <Glyph name="close" size={18} />
                    </button>
                  </li>
                ))}
              </ul>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button type="button" className="btn-primary" disabled>
                  <Glyph name="upload" size={16} />
                  Upload {staged.length} {staged.length === 1 ? 'file' : 'files'}
                </button>
                <p className="text-xs text-mist-500">
                  Uploading is not wired up yet — this pass is the interface only.
                </p>
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
                    filter === key
                      ? 'bg-brand-500 text-white'
                      : 'text-mist-500 hover:text-mist-100'
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
                            {song.artist} · {song.format}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="td">{song.album}</td>
                    <td className="td text-right tabular-nums">{song.duration}</td>
                    <td className="td text-right tabular-nums">{formatBytes(song.sizeBytes)}</td>
                    <td className="td">{song.uploadedAt}</td>
                    <td className="td">
                      {song.published ? (
                        <Badge tone="brand">Live in app</Badge>
                      ) : (
                        <Badge tone="neutral">Hidden</Badge>
                      )}
                    </td>
                    <td className="td">
                      <div className="flex items-center justify-end gap-2">
                        <Switch
                          checked={song.published}
                          label={`Publish ${song.title}`}
                          onChange={() =>
                            setSongs((current) =>
                              current.map((row) =>
                                row.id === song.id ? { ...row, published: !row.published } : row
                              )
                            )
                          }
                        />
                        <button
                          type="button"
                          aria-label={`Remove ${song.title}`}
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
  broadcast: 'M4.9 19.1a10 10 0 0 1 0-14.2M19.1 4.9a10 10 0 0 1 0 14.2M7.8 16.2a6 6 0 0 1 0-8.4M16.2 7.8a6 6 0 0 1 0 8.4M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
  eyeOff: 'M17.9 17.9A10.1 10.1 0 0 1 12 20c-7 0-11-8-11-8a18.5 18.5 0 0 1 5.1-6M9.9 4.2A9.1 9.1 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.2 3.2M9.9 9.9a3 3 0 0 0 4.2 4.2M1 1l22 22',
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
