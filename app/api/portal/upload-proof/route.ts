import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

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
