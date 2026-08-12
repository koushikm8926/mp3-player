import type { Metadata } from 'next';

import { LoginForm } from './LoginForm';

export const metadata: Metadata = { title: 'Sign in' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-ink-950 px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-brand-500">
            <svg viewBox="0 0 24 24" className="size-7 fill-ink-950" aria-hidden="true">
              <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z" />
            </svg>
          </div>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-mist-100">
            Minax Music Admin
          </h1>
          <p className="mt-1.5 text-sm text-mist-500">
            Sign in to manage users, versions and settings.
          </p>
        </div>

        <div className="card p-6">
          <LoginForm next={next} />
        </div>

        <p className="mt-6 text-center text-xs text-mist-500">
          Minax Digital Pvt. Ltd. · Bengaluru
        </p>
      </div>
    </main>
  );
}
