import { authenticateMobileRequest, revokeMobileSession } from '@/lib/auth';
import { jsonError, jsonOk } from '@/lib/mobile';

/** POST /api/mobile/logout — revokes only the calling device's session. */
export async function POST(request: Request) {
  const principal = await authenticateMobileRequest(request);
  if (!principal) return jsonError('Unauthorized', 401);

  await revokeMobileSession(principal.sessionId);
  return jsonOk({ ok: true });
}
