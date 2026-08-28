'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

type BannerItem = {
  id: string;
  badge: string;
  titleLine1: string;
  titleLine2: string;
  subtitle: string;
  accentColor: string;
  buttonColor: string;
  gradientStart: string;
  gradientEnd: string;
  icon: string;
  imageUrl: string | null;
  isPublished: boolean;
  order: number;
  createdAt: Date;
};

export function BannersManager({ initialBanners }: { initialBanners: BannerItem[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [banners, setBanners] = useState<BannerItem[]>(initialBanners);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // New Banner Form State
  const [badge, setBadge] = useState('FEATURED');
  const [titleLine1, setTitleLine1] = useState('');
  const [titleLine2, setTitleLine2] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [accentColor, setAccentColor] = useState('#C084FC');
  const [buttonColor, setButtonColor] = useState('#8B5CF6');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleLine1.trim() && !titleLine2.trim()) {
      setError('Please provide at least Title Line 1 or Title Line 2.');
      return;
    }

    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.append('badge', badge);
    formData.append('titleLine1', titleLine1);
    formData.append('titleLine2', titleLine2);
    formData.append('subtitle', subtitle);
    formData.append('accentColor', accentColor);
    formData.append('buttonColor', buttonColor);
    if (imageFile) {
      formData.append('imageFile', imageFile);
    }

    try {
      const res = await fetch('/api/admin/banners/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload banner');
      }

      setSuccess('Carousel banner created successfully!');
      setTitleLine1('');
      setTitleLine2('');
      setSubtitle('');
      setImageFile(null);
      setPreviewUrl(null);

      startTransition(() => {
        router.refresh();
      });
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this banner?')) return;

    try {
      const res = await fetch(`/api/admin/banners/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete banner');

      setBanners((prev) => prev.filter((b) => b.id !== id));
      setSuccess('Banner deleted.');

      startTransition(() => {
        router.refresh();
      });
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleTogglePublish = async (id: string, currentPublished: boolean) => {
    try {
      const formData = new FormData();
      formData.append('isPublished', String(!currentPublished));

      const res = await fetch(`/api/admin/banners/${id}`, {
        method: 'PUT',
        body: formData,
      });
      if (!res.ok) throw new Error('Failed to update banner');

      setBanners((prev) =>
        prev.map((b) => (b.id === id ? { ...b, isPublished: !currentPublished } : b))
      );

      startTransition(() => {
        router.refresh();
      });
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-mist-100">Carousel Banners</h1>
        <p className="mt-1 text-sm text-mist-400">
          Upload and manage featured hero banners displayed on the mobile app Home screen.
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-400">
          {success}
        </div>
      ) : null}

      {/* Upload Form Card */}
      <div className="rounded-xl border border-ink-700 bg-ink-850 p-6">
        <h2 className="text-lg font-semibold text-mist-100 mb-4">Add New Carousel Banner</h2>

        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-mist-400 mb-1">Badge Tag</label>
              <input
                type="text"
                value={badge}
                onChange={(e) => setBadge(e.target.value)}
                placeholder="e.g. FEATURED, TOP HITS, NEW"
                className="w-full rounded-lg border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-mist-100 focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-mist-400 mb-1">Title Line 1</label>
              <input
                type="text"
                value={titleLine1}
                onChange={(e) => setTitleLine1(e.target.value)}
                placeholder="e.g. Discover New"
                className="w-full rounded-lg border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-mist-100 focus:border-brand-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-mist-400 mb-1">Title Line 2 (Highlighted)</label>
              <input
                type="text"
                value={titleLine2}
                onChange={(e) => setTitleLine2(e.target.value)}
                placeholder="e.g. Weekly Hits"
                className="w-full rounded-lg border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-mist-100 focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-mist-400 mb-1">Subtitle</label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="e.g. Top hand-picked tracks for your mood"
                className="w-full rounded-lg border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-mist-100 focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-mist-400 mb-1">Accent Highlight Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="size-9 rounded cursor-pointer border-0 bg-transparent"
                />
                <input
                  type="text"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="w-full rounded-lg border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-mist-100 focus:border-brand-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-mist-400 mb-1">Banner Cover Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="w-full text-xs text-mist-400 file:mr-3 file:rounded-md file:border-0 file:bg-brand-500/20 file:px-3 file:py-2 file:text-xs file:font-medium file:text-brand-400 hover:file:bg-brand-500/30 cursor-pointer"
              />
            </div>
          </div>

          {previewUrl ? (
            <div className="mt-2 flex items-center gap-4">
              <span className="text-xs text-mist-400">Selected Cover Image Preview:</span>
              <img src={previewUrl} alt="Preview" className="h-16 w-28 rounded-lg object-cover border border-ink-700" />
            </div>
          ) : null}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50"
            >
              {isPending ? 'Uploading...' : 'Create Carousel Banner'}
            </button>
          </div>
        </form>
      </div>

      {/* Active Banners List */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-mist-100">Existing Banners ({banners.length})</h2>

        {banners.length === 0 ? (
          <div className="rounded-xl border border-ink-700 bg-ink-850 p-8 text-center text-sm text-mist-400">
            No custom carousel banners created yet. Add one above!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {banners.map((banner) => (
              <div
                key={banner.id}
                className="relative overflow-hidden rounded-2xl border border-ink-700 bg-gradient-to-br from-purple-950 via-slate-900 to-indigo-950 p-5 shadow-lg flex flex-col justify-between"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 z-10">
                    <span
                      className="inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wider"
                      style={{ backgroundColor: `${banner.accentColor}33`, color: banner.accentColor }}
                    >
                      {banner.badge}
                    </span>
                    <h3 className="text-xl font-bold text-white leading-tight">
                      {banner.titleLine1} <br />
                      <span style={{ color: banner.accentColor }}>{banner.titleLine2}</span>
                    </h3>
                    <p className="text-xs text-mist-300 max-w-xs">{banner.subtitle}</p>
                  </div>

                  {banner.imageUrl ? (
                    <img
                      src={banner.imageUrl}
                      alt=""
                      className="h-20 w-24 rounded-xl object-cover border border-white/20 shadow-md shrink-0"
                    />
                  ) : null}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
                  <button
                    type="button"
                    onClick={() => handleTogglePublish(banner.id, banner.isPublished)}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                      banner.isPublished
                        ? 'border-emerald-500/30 bg-emerald-500/20 text-emerald-300'
                        : 'border-amber-500/30 bg-amber-500/20 text-amber-300'
                    }`}
                  >
                    {banner.isPublished ? '● Active (Published)' : '○ Draft (Hidden)'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(banner.id)}
                    className="text-xs text-red-400 hover:text-red-300 hover:underline"
                  >
                    Delete Banner
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
