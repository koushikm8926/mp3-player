import { authenticateMobileRequest, revokeMobileSession } from '@/lib/auth';
import { jsonError, jsonOk } from '@/lib/mobile';

/**
 * POST /api/mobile/logout
 *
 * Revokes only the calling device's session. Firebase-authenticated users have no
 * server-side session to revoke — the app signs out of Firebase directly and the ID token
 * expires on its own — so for them this call just marks the moment and succeeds.
 */
export async function POST(request: Request) {
  const principal = await authenticateMobileRequest(request);
  if (!principal) return jsonError('Unauthorized', 401);

  if (principal.sessionId) await revokeMobileSession(principal.sessionId);
  return jsonOk({ ok: true });
}
