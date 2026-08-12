'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import {
  changePassword,
  saveSettings,
  type SettingsState,
} from '@/app/(dashboard)/settings/actions';

type Setting = {
  key: string;
  value: string;
  type: string;
  label: string;
  description: string;
  isPublic: boolean;
};

type Group = { key: string; title: string; description: string; settings: Setting[] };

/** Grouped editor for every row in the Setting table. */
export function SettingsForm({ groups }: { groups: Group[] }) {
  const [state, formAction] = useActionState<SettingsState, FormData>(saveSettings, {});

  return (
    <form action={formAction} className="space-y-5">
      {groups.map((group) => (
        <section key={group.key} className="card">
          <header className="border-b border-ink-700 px-5 py-4">
            <h2 className="text-sm font-semibold text-mist-100">{group.title}</h2>
            {group.description ? (
              <p className="mt-1 text-xs text-mist-500">{group.description}</p>
            ) : null}
          </header>

          <div className="divide-y divide-ink-800">
            {group.settings.map((setting) => (
              <SettingRow key={setting.key} setting={setting} />
            ))}
          </div>
        </section>
      ))}

      {state.error ? (
        <p className="rounded-lg border border-danger-500/30 bg-danger-500/10 px-3 py-2.5 text-sm text-danger-500">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="rounded-lg border border-brand-500/30 bg-brand-500/10 px-3 py-2.5 text-sm text-brand-500">
          {state.success}
        </p>
      ) : null}

      <SaveButton />
    </form>
  );
}

function SettingRow({ setting }: { setting: Setting }) {
  const field = `setting:${setting.key}`;

  return (
    <div className="flex flex-wrap items-start justify-between gap-4 px-5 py-4">
      <div className="min-w-0 flex-1">
        <label htmlFor={field} className="flex flex-wrap items-center gap-2 text-sm text-mist-100">
          {setting.label}
          {setting.isPublic ? (
            <span className="badge bg-info-500/10 text-info-500">public</span>
          ) : null}
        </label>
        {setting.description ? (
          <p className="mt-1 text-xs text-mist-500">{setting.description}</p>
        ) : null}
        <p className="mt-1 font-mono text-[11px] text-mist-600">{setting.key}</p>
      </div>

      <div className="w-full sm:w-64">
        {setting.type === 'boolean' ? (
          <label className="flex cursor-pointer items-center gap-2.5">
            <input
              id={field}
              name={field}
              type="checkbox"
              defaultChecked={setting.value === 'true'}
              className="size-4 accent-brand-500"
            />
            <span className="text-sm text-mist-400">Enabled</span>
          </label>
        ) : setting.type === 'number' ? (
          <input
            id={field}
            name={field}
            type="number"
            defaultValue={setting.value}
            className="input"
          />
        ) : setting.value.length > 60 || setting.type === 'json' ? (
          <textarea
            id={field}
            name={field}
            rows={3}
            defaultValue={setting.value}
            className="input resize-y font-mono text-xs"
          />
        ) : (
          <input id={field} name={field} type="text" defaultValue={setting.value} className="input" />
        )}
      </div>
    </div>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <div className="flex justify-end">
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? 'Saving…' : 'Save settings'}
      </button>
    </div>
  );
}

/** Password rotation for the signed-in administrator. */
export function PasswordForm() {
  const [state, formAction] = useActionState<SettingsState, FormData>(changePassword, {});

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <label className="label" htmlFor="currentPassword">
          Current password
        </label>
        <input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          className="input"
        />
      </div>
      <div>
        <label className="label" htmlFor="newPassword">
          New password
        </label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          minLength={10}
          required
          className="input"
        />
      </div>
      <div>
        <label className="label" htmlFor="confirmPassword">
          Confirm new password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          className="input"
        />
      </div>

      {state.error ? <p className="text-xs text-danger-500">{state.error}</p> : null}
      {state.success ? <p className="text-xs text-brand-500">{state.success}</p> : null}

      <ChangeButton />
    </form>
  );
}

function ChangeButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-ghost w-full">
      {pending ? 'Updating…' : 'Change password'}
    </button>
  );
}
