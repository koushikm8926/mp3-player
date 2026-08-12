'use client';

import { useActionState, useTransition } from 'react';
import { useFormStatus } from 'react-dom';

import {
  createVersion,
  deleteVersion,
  makeCurrent,
  toggleMandatory,
  type VersionState,
} from '@/app/(dashboard)/versions/actions';

/** Form for publishing a new release. */
export function VersionForm({ nextBuild }: { nextBuild: number }) {
  const [state, formAction] = useActionState<VersionState, FormData>(createVersion, {});

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="version">
            Version
          </label>
          <input
            id="version"
            name="version"
            required
            placeholder="1.1.0"
            pattern="\d+\.\d+\.\d+"
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="buildNumber">
            Build number
          </label>
          <input
            id="buildNumber"
            name="buildNumber"
            type="number"
            min={1}
            required
            defaultValue={nextBuild}
            className="input"
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="releaseNotes">
          Release notes
        </label>
        <textarea
          id="releaseNotes"
          name="releaseNotes"
          rows={3}
          placeholder="What changed in this build?"
          className="input resize-y"
        />
      </div>

      <div>
        <label className="label" htmlFor="downloadUrl">
          APK download URL <span className="text-mist-600">(optional)</span>
        </label>
        <input
          id="downloadUrl"
          name="downloadUrl"
          type="url"
          placeholder="https://downloads.example.com/minax-1.1.0.apk"
          className="input"
        />
      </div>

      <div>
        <label className="label" htmlFor="minSupported">
          Minimum supported build
        </label>
        <input
          id="minSupported"
          name="minSupported"
          type="number"
          min={1}
          defaultValue={1}
          className="input"
        />
        <p className="mt-1.5 text-xs text-mist-500">
          Builds below this are told they are no longer supported.
        </p>
      </div>

      <label className="flex cursor-pointer items-start gap-2.5">
        <input
          type="checkbox"
          name="makeCurrent"
          defaultChecked
          className="mt-0.5 size-4 accent-brand-500"
        />
        <span className="text-sm text-mist-300">
          Make this the current release
          <span className="block text-xs text-mist-500">Demotes the previous current build.</span>
        </span>
      </label>

      <label className="flex cursor-pointer items-start gap-2.5">
        <input type="checkbox" name="isMandatory" className="mt-0.5 size-4 accent-brand-500" />
        <span className="text-sm text-mist-300">
          Mandatory update
          <span className="block text-xs text-mist-500">
            Older builds are asked to update before continuing.
          </span>
        </span>
      </label>

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

      <PublishButton />
    </form>
  );
}

function PublishButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full">
      {pending ? 'Publishing…' : 'Publish release'}
    </button>
  );
}

/** Per-row controls in the releases table. */
export function VersionActions({
  id,
  isCurrent,
  isMandatory,
}: {
  id: string;
  isCurrent: boolean;
  isMandatory: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap justify-end gap-1.5">
      {!isCurrent ? (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(() => {
              void makeCurrent(id);
            })
          }
          className="btn-ghost px-2.5 py-1.5 text-xs"
        >
          Make current
        </button>
      ) : null}

      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(() => {
            void toggleMandatory(id);
          })
        }
        className="btn-ghost px-2.5 py-1.5 text-xs"
      >
        {isMandatory ? 'Make optional' : 'Make mandatory'}
      </button>

      {!isCurrent ? (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(() => {
              void deleteVersion(id);
            })
          }
          className="btn-danger px-2.5 py-1.5 text-xs"
        >
          Delete
        </button>
      ) : null}
    </div>
  );
}
