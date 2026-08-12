import Link from 'next/link';
import type { ReactNode } from 'react';

/** Page title block used at the top of every admin screen. */
export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-mist-100">{title}</h1>
        {description ? <p className="mt-1.5 text-sm text-mist-500">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Card({
  children,
  className = '',
  title,
  description,
  action,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <section className={`card ${className}`}>
      {title ? (
        <header className="flex items-start justify-between gap-4 border-b border-ink-700 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-mist-100">{title}</h2>
            {description ? <p className="mt-1 text-xs text-mist-500">{description}</p> : null}
          </div>
          {action}
        </header>
      ) : null}
      {children}
    </section>
  );
}

const TONES = {
  brand: 'text-brand-500 bg-brand-500/10',
  info: 'text-info-500 bg-info-500/10',
  warn: 'text-warn-500 bg-warn-500/10',
  danger: 'text-danger-500 bg-danger-500/10',
  violet: 'text-violet-500 bg-violet-500/10',
  neutral: 'text-mist-300 bg-ink-700',
} as const;

export type Tone = keyof typeof TONES;

/** Headline metric tile used across the dashboard and statistics pages. */
export function StatTile({
  label,
  value,
  hint,
  tone = 'brand',
  icon,
  href,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: Tone;
  icon?: ReactNode;
  href?: string;
}) {
  const body = (
    <div className="card h-full p-5 transition-colors hover:border-ink-600">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-mist-500">{label}</p>
        {icon ? (
          <span className={`flex size-8 items-center justify-center rounded-lg ${TONES[tone]}`}>
            {icon}
          </span>
        ) : null}
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-mist-100 tabular-nums">
        {value}
      </p>
      {hint ? <p className="mt-1.5 text-xs text-mist-500">{hint}</p> : null}
    </div>
  );

  return href ? (
    <Link href={href} className="block">
      {body}
    </Link>
  ) : (
    body
  );
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: Tone }) {
  return <span className={`badge ${TONES[tone]}`}>{children}</span>;
}

export function StatusBadge({ status }: { status: string }) {
  const tone: Tone =
    status === 'active' ? 'brand' : status === 'suspended' ? 'warn' : 'danger';
  return <Badge tone={tone}>{status}</Badge>;
}

export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const letters = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  // Deterministic hue so the same user keeps the same colour between renders.
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash << 5) - hash + name.charCodeAt(i);

  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        backgroundColor: `hsl(${Math.abs(hash) % 360}, 45%, 38%)`,
      }}
    >
      {letters || '?'}
    </span>
  );
}

export function EmptyRow({ colSpan, message }: { colSpan: number; message: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-14 text-center text-sm text-mist-500">
        {message}
      </td>
    </tr>
  );
}

/** Horizontal bar used for simple distribution lists (versions, event types). */
export function BarRow({
  label,
  value,
  total,
  tone = 'brand',
}: {
  label: string;
  value: number;
  total: number;
  tone?: Tone;
}) {
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
  const fill = {
    brand: 'bg-brand-500',
    info: 'bg-info-500',
    warn: 'bg-warn-500',
    danger: 'bg-danger-500',
    violet: 'bg-violet-500',
    neutral: 'bg-mist-500',
  }[tone];

  return (
    <div className="px-5 py-3">
      <div className="mb-2 flex items-baseline justify-between gap-3 text-sm">
        <span className="truncate text-mist-300">{label}</span>
        <span className="shrink-0 tabular-nums text-mist-500">
          {value} <span className="text-mist-600">({percentage}%)</span>
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-ink-700">
        <div className={`h-full rounded-full ${fill}`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}
