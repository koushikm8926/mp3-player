'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import appLogo from '@/assets/app-logo.png';
import { logout } from '@/app/login/actions';

const NAV = [
  { href: '/', label: 'Dashboard', icon: 'grid' },
  { href: '/songs', label: 'Songs', icon: 'music' },
  { href: '/banners', label: 'Carousel Banners', icon: 'banner' },
  { href: '/users', label: 'Registered users', icon: 'users' },
  { href: '/active', label: 'Active users', icon: 'pulse' },
  { href: '/statistics', label: 'User statistics', icon: 'chart' },
  { href: '/reports', label: 'Reports', icon: 'report' },
  { href: '/settings', label: 'Settings', icon: 'cog' },
] as const;

type IconName = (typeof NAV)[number]['icon'];

export function Sidebar({ admin }: { admin: { name: string; email: string; role: string } }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <>
      {/* Mobile top bar — the sidebar is a drawer below `lg`. */}
      <div className="flex items-center gap-3 border-b border-ink-700 bg-ink-850 px-4 py-3 lg:hidden">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-label="Toggle navigation"
          className="btn-ghost px-2.5 py-2"
        >
          <svg viewBox="0 0 24 24" className="size-5 stroke-current" fill="none" strokeWidth="2">
            <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
          </svg>
        </button>
        <Image src={appLogo} alt="" width={28} height={28} className="size-7" priority />
        <span className="text-sm font-semibold text-mist-100">Minax Music Admin</span>
      </div>

      <aside
        className={`${
          open ? 'block' : 'hidden'
        } w-full shrink-0 border-b border-ink-700 bg-ink-850 lg:sticky lg:top-0 lg:block lg:h-screen lg:w-64 lg:border-r lg:border-b-0`}
      >
        <div className="flex h-full flex-col">
          <div className="hidden items-center gap-3 px-5 py-6 lg:flex">
            <Image src={appLogo} alt="" width={36} height={36} className="size-9" priority />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-mist-100">Minax Music</p>
              <p className="truncate text-xs text-mist-500">Admin panel</p>
            </div>
          </div>

          <nav className="flex-1 space-y-1 px-3 pb-4 lg:px-3">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  isActive(item.href)
                    ? 'bg-brand-500/10 font-medium text-brand-500'
                    : 'text-mist-400 hover:bg-ink-800 hover:text-mist-100'
                }`}
              >
                <Icon name={item.icon} />
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="border-t border-ink-700 p-3">
            <div className="mb-2 px-2 py-1.5">
              <p className="truncate text-sm font-medium text-mist-100">{admin.name}</p>
              <p className="truncate text-xs text-mist-500">{admin.email}</p>
            </div>
            <form action={logout}>
              <button type="submit" className="btn-ghost w-full justify-start">
                <Icon name="logout" />
                Sign out
              </button>
            </form>
          </div>
        </div>
      </aside>
    </>
  );
}

const PATHS: Record<IconName | 'logout', string> = {
  grid: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  music: 'M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM21 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
  banner: 'M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM8 12l3 3 5-5',
  users: 'M16 19v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 9a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM22 19v-2a4 4 0 0 0-3-3.87M16 2.13a4 4 0 0 1 0 7.75',
  pulse: 'M3 12h4l3 8 4-16 3 8h4',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  report: 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h6',
  cog: 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
};

function Icon({ name }: { name: IconName | 'logout' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-[18px] shrink-0 stroke-current"
      fill="none"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
