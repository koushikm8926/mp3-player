import type { Metadata } from 'next';
import Image from 'next/image';

import appLogo from '@/assets/app-logo.png';

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
          <Image src={appLogo} alt="" width={64} height={64} className="size-16" priority />
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
