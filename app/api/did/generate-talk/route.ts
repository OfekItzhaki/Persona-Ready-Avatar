import { NextRequest, NextResponse } from 'next/server';
import { didService } from '@/lib/services/DIDService';

/**
 * POST /api/did/generate-talk
 *
 * Accepts: { presenterId: string, audioBase64: string, audioMimeType: string }
 *
 * Responses:
 *   200 — { videoUrl: string }
 *   400 — presenterId missing or empty
 *   500 — D-ID service error
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7
 */
export async function POST(request: NextRequest) {
  let body: { presenterId?: string; audioBase64?: string; audioMimeType?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { presenterId, audioBase64, audioMimeType } = body;

  if (!presenterId || presenterId.trim() === '') {
    return NextResponse.json({ error: 'Missing required field: presenterId' }, { status: 400 });
  }

  const audioBuffer = Buffer.from(audioBase64 ?? '', 'base64');
  const mimeType = audioMimeType ?? 'audio/mpeg';

  const result = await didService.generateTalk(presenterId, audioBuffer, mimeType);

  if (result.success) {
    return NextResponse.json({ videoUrl: result.data }, { status: 200 });
  }

  return NextResponse.json({ error: result.error.type, details: result.error }, { status: 500 });
}
