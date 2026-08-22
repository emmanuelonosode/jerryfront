import { NextResponse, type NextRequest } from 'next/server';
import { sendAlert } from '@/lib/mailer';
import { applyStepUpdate, currentDraft, startDraft } from '../../actions';
import { draftStore } from '@/lib/apply/store';
import { validateStep } from '@/lib/apply/draft';
import { isStepSlug, nextStep } from '@/lib/apply/steps';

/**
 * Save one application step.
 *
 * A plain POST-redirect-GET route handler rather than a server action, chosen
 * after the action version failed in a specific and instructive way: the
 * server side was entirely correct - the draft saved, the attempt recorded,
 * a 303 returned, and a fresh GET rendered the validation errors - but React's
 * router intercepted the action response and reused the cached payload for the
 * same pathname, so the errors never reached the screen.
 *
 * A route handler sidesteps the router completely. The browser performs a real
 * navigation, the server renders the page from the saved draft, and the errors
 * appear. It also means the form works with JavaScript unavailable or still
 * loading, which matters more here than anywhere else on the site: this
 * audience is disproportionately on slow mobile connections, and the
 * application is the one flow that must not be dead on arrival.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ step: string }> }) {
  const { step } = await params;
  if (!isStepSlug(step)) {
    return NextResponse.redirect(new URL('/apply', request.url), 303);
  }

  const formData = await request.formData();
  const draft = (await currentDraft()) ?? (await startDraft(null));
  const saved = await applyStepUpdate(draft, step, formData);

  const invalid = validateStep(saved, step).length > 0;

  // The payment step is where the application actually gets submitted. Doing
  // it here rather than in `applyStepUpdate` keeps `submittedAt` off the
  // patch path entirely, so no client-supplied field can set it.
  if (!invalid && step === 'payment' && !saved.submittedAt) {
    await draftStore.submit(saved.id, new Date());
    
    // Alert System: Application Submitted
    sendAlert('Application Submitted', `Application ${saved.id} was just submitted by ${saved.firstName} ${saved.lastName}.`);
  }

  const target = invalid ? step : (nextStep(step) ?? step);

  const response = NextResponse.redirect(new URL(`/apply/${target}`, request.url), 303);
  response.headers.set('Cache-Control', 'no-store, private');
  return response;
}
