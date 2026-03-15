import { NextRequest, NextResponse } from 'next/server';
import { adminAuthService } from '@/lib/services/AdminAuthService';

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { passphrase } = body as { passphrase?: unknown };

  if (typeof passphrase !== 'string') {
    return NextResponse.json({ error: 'passphrase is required' }, { status: 400 });
  }

  const valid = adminAuthService.validatePassphrase(passphrase);

  if (!valid) {
    return NextResponse.json({ error: 'Invalid passphrase' }, { status: 401 });
  }

  const token = adminAuthService.generateSessionToken();
  return NextResponse.json({ token }, { status: 200 });
}
