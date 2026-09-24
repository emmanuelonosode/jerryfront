import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { API_BASE } from '@/lib/env';

/**
 * Who is uploading - asked of Django, which owns sessions.
 *
 * This route wrote files to disk for anyone who posted to it. The resident's
 * access token arrives as a Bearer header or in the `portal_access` cookie the
 * portal keeps alongside it; either way the backend decides whether it is
 * valid. Presence alone is not checked here, because a cookie anyone can set
 * proves nothing.
 */
async function isSignedIn(req: NextRequest): Promise<boolean> {
  const header = req.headers.get('authorization') ?? '';
  const token = header.toLowerCase().startsWith('bearer ')
    ? header.slice(7)
    : req.cookies.get('portal_access')?.value ?? '';
  if (!token) return false;
  try {
    const res = await fetch(`${API_BASE}/auth/me/`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    return res.ok;
  } catch {
    return false;
  }
}

const ALLOWED_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heic',
  'application/pdf': 'pdf',
};

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export async function POST(req: NextRequest) {
  if (!(await isSignedIn(req))) {
    return NextResponse.json({ error: 'Sign in again to upload a receipt.' }, { status: 401 });
  }
  try {
    const formData = await req.formData();
    const file = (formData.get('file') || formData.get('paymentProof')) as File | null;

    if (!file || typeof file !== 'object' || !('arrayBuffer' in file) || file.size === 0) {
      return NextResponse.json(
        { error: 'No file was provided in the upload request.' },
        { status: 400 }
      );
    }

    const extension = ALLOWED_MIME[file.type];
    if (!extension) {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload a screenshot (PNG, JPG, HEIC, WEBP) or PDF.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: `The file exceeds the 10 MB limit (size: ${(file.size / 1024 / 1024).toFixed(1)} MB).` },
        { status: 400 }
      );
    }

    const filename = `proof-portal-${Date.now()}-${randomUUID().slice(0, 8)}.${extension}`;
    const proofsDir = join(process.cwd(), 'private-uploads', 'proofs');

    await mkdir(proofsDir, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(join(proofsDir, filename), buffer);

    return NextResponse.json({
      success: true,
      filename,
      url: `/api/portal/proof/${filename}`,
    });
  } catch (err) {
    console.error('Portal proof upload error:', err);
    return NextResponse.json(
      { error: 'Failed to save proof upload on server. Please try again.' },
      { status: 500 }
    );
  }
}
