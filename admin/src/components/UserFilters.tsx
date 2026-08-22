'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';

/**
 * Search and filter bar for the users table.
 *
 * State lives in the URL so a filtered view can be bookmarked or shared, and the server
 * component re-renders with the new query. Typing is debounced to avoid a request per keystroke.
 */
/** Value each filter falls back to when its query parameter is absent. */
const DEFAULTS: Record<string, string> = { q: '', status: 'all', type: 'registered', sort: 'newest' };

export function UserFilters({
  query,
  status,
  type,
  sort,
}: {
  query: string;
  status: string;
  type: string;
  sort: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [term, setTerm] = useState(query);
  const firstRender = useRef(true);

  const push = (updates: Record<string, string>) => {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (!value || value === DEFAULTS[key]) next.delete(key);
      else next.set(key, value);
    }
    next.delete('page');
    startTransition(() => {
      router.push(next.size ? `/users?${next.toString()}` : '/users');
    });
  };

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return undefined;
    }
    const handle = setTimeout(() => push({ q: term }), 350);
    return () => clearTimeout(handle);
    // `push` is recreated each render; re-running on it would fire on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term]);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative min-w-[240px] flex-1">
        <svg
          viewBox="0 0 24 24"
          className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 stroke-mist-500"
          fill="none"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Search by name, email or user ID…"
          className="input pl-10"
          aria-label="Search users"
        />
      </div>

      <Select
        label="Status"
        value={status}
        onChange={(value) => push({ status: value })}
        options={[
          ['all', 'All statuses'],
          ['active', 'Active'],
          ['suspended', 'Suspended'],
          ['deleted', 'Deleted'],
        ]}
      />
      <Select
        label="Type"
        value={type}
        onChange={(value) => push({ type: value })}
        options={[
          ['all', 'All types'],
          ['registered', 'Registered'],
          ['guest', 'Guest'],
        ]}
      />
      <Select
        label="Sort"
        value={sort}
        onChange={(value) => push({ sort: value })}
        options={[
          ['newest', 'Newest first'],
          ['oldest', 'Oldest first'],
          ['active', 'Recently active'],
          ['listens', 'Most listens'],
          ['name', 'Name (A–Z)'],
        ]}
      />
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<[string, string]>;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="input w-auto cursor-pointer py-2.5 pr-8"
    >
      {options.map(([key, text]) => (
        <option key={key} value={key} className="bg-ink-900">
          {text}
        </option>
      ))}
    </select>
  );
}
