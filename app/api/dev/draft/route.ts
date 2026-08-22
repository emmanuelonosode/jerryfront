import { NextResponse } from 'next/server';
import { currentDraft } from '@/app/(site)/apply/actions';

/** Dev-only: inspect the current draft while building the flow. */
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'not available' }, { status: 404 });
  }
  const draft = await currentDraft();
  return NextResponse.json(
    draft
      ? { id: draft.id, firstName: draft.firstName, email: draft.email, attemptedSteps: draft.attemptedSteps }
      : null,
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
