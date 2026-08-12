'use client';

import { useState, useTransition } from 'react';

import { deleteUser, revokeSessions, setUserStatus } from '@/app/(dashboard)/users/[id]/actions';

/** Suspend / reactivate / revoke / delete controls on the user detail page. */
export function UserActions({ userId, status }: { userId: string; status: string }) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  const suspended = status === 'suspended';
  const deleted = status === 'deleted';

  if (deleted) {
    return <span className="text-sm text-mist-500">This account has been deleted.</span>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(() => {
            void revokeSessions(userId);
          })
        }
        className="btn-ghost"
      >
        Sign out all devices
      </button>

      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(() => {
            void setUserStatus(userId, suspended ? 'active' : 'suspended');
          })
        }
        className={suspended ? 'btn-primary' : 'btn-ghost'}
      >
        {suspended ? 'Reactivate' : 'Suspend'}
      </button>

      {confirming ? (
        <span className="flex items-center gap-2 rounded-lg border border-danger-500/40 bg-danger-500/5 px-3 py-1.5">
          <span className="text-xs text-mist-300">Delete permanently?</span>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(() => {
                void deleteUser(userId);
              })
            }
            className="text-xs font-semibold text-danger-500 hover:underline"
          >
            Yes, delete
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="text-xs text-mist-500 hover:text-mist-300"
          >
            Cancel
          </button>
        </span>
      ) : (
        <button type="button" onClick={() => setConfirming(true)} className="btn-danger">
          Delete
        </button>
      )}
    </div>
  );
}
