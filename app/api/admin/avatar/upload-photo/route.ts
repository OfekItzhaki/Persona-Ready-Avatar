import { NextRequest, NextResponse } from 'next/server';
import { adminAuthService } from '@/lib/services/AdminAuthService';
import { fileValidationService } from '@/lib/services/FileValidationService';
import { didService } from '@/lib/services/DIDService';
import { presenterStore } from '@/lib/services/PresenterStore';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(request: NextRequest) {
  // Require valid admin session token
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token || !adminAuthService.validateSessionToken(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Parse multipart form data
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const agentId = formData.get('agentId');
  const file = formData.get('file');

  if (typeof agentId !== 'string' || !agentId) {
    return NextResponse.json({ error: 'agentId is required' }, { status: 400 });
  }

  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: 'file is required' }, { status: 400 });
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'File exceeds 10 MB limit' }, { status: 413 });
  }

  // Read file into buffer and validate magic bytes
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const validation = fileValidationService.validatePhoto(buffer, file.type);
  if (!validation.valid) {
    return NextResponse.json(
      { error: validation.error ?? 'Invalid file type; only JPEG and PNG are accepted' },
      { status: 422 }
    );
  }

  const mimeType = validation.detectedType as 'image/jpeg' | 'image/png';

  // Create D-ID presenter
  const result = await didService.createPresenter(buffer, mimeType);

  if (!result.success) {
    return NextResponse.json({ error: 'D-ID API error', details: result.error }, { status: 502 });
  }

  const presenterId = result.data;

  // Write presenter assignment to store
  await presenterStore.setAssignment(agentId, {
    mode: 'did',
    presenterId,
    agentId,
    createdAt: new Date().toISOString(),
  });

  return NextResponse.json({ presenterId }, { status: 200 });
}
