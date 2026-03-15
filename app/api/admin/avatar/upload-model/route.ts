import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { adminAuthService } from '@/lib/services/AdminAuthService';
import { fileValidationService } from '@/lib/services/FileValidationService';
import { presenterStore } from '@/lib/services/PresenterStore';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

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
    return NextResponse.json({ error: 'File exceeds 50 MB limit' }, { status: 413 });
  }

  // Read file into buffer and validate magic bytes
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Get original filename
  const originalName = file instanceof File ? file.name : 'model';
  const sanitizedName = fileValidationService.sanitizeFilename(originalName);

  const validation = fileValidationService.validateModel(buffer, sanitizedName);
  if (!validation.valid) {
    return NextResponse.json(
      { error: validation.error ?? 'Invalid file type; only GLB and VRM files are accepted' },
      { status: 422 }
    );
  }

  // Write file to public/models/
  const modelsDir = path.join(process.cwd(), 'public', 'models');
  await fs.mkdir(modelsDir, { recursive: true });
  await fs.writeFile(path.join(modelsDir, sanitizedName), buffer);

  const modelPath = `/models/${sanitizedName}`;

  // Write model path to PresenterStore
  await presenterStore.setAssignment(agentId, {
    mode: 'glb',
    modelPath,
    agentId,
    createdAt: new Date().toISOString(),
  });

  return NextResponse.json({ modelPath }, { status: 200 });
}
