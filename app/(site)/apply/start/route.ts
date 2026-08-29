import { type NextRequest } from 'next/server';
import { currentDraft, rememberListing } from '../actions';
import { redirectTo } from '@/lib/http/redirect';
import { resumeStep } from '@/lib/apply/draft';
import { FIRST_STEP } from '@/lib/apply/steps';

/**
 * Entry point to the application flow.
 *
 * IT CREATES NOTHING. This route used to call `startDraft()`, so every GET
 * wrote a `RentalApplication` row - and every page on the site has an Apply
 * button pointing here. The result was 48 of 50 applications in the admin
 * being empty DRAFT rows with no data on them at all: one per bounce, one per
 * crawler that ignored robots.txt, one per link preview, one per person who
 * opened the form and thought better of it. Staff could not find the two real
 * applications in the noise, which is the reported bug.
 *
 * The draft now comes into existence on the first SAVE, which is what the rest
 * of this module always said it did. One applicant is one row, created when
 * they complete a step and updated on every step after that. Someone who never
 * types anything leaves nothing behind.
 *
 * WHY THE ROUTE STILL EXISTS. It is the one place that can record which home
 * the applicant pressed Apply on - `?home=<slug>` - and setting a cookie is
 * only permitted in a Route Handler or Server Action. It parks the slug and
 * sends them on; `startDraft` picks it up at the first save.
 *
 * It also resumes: someone returning with a draft cookie is put back on the
 * step they stopped at rather than at the top of the form.
 */
export async function GET(request: NextRequest) {
  await rememberListing(request.nextUrl.searchParams.get('home'));

  // Read-only. A returning applicant resumes where they stopped; a new one
  // starts at the first step with nothing written anywhere yet.
  const draft = await currentDraft();
  const step = draft && !draft.submittedAt ? resumeStep(draft) : FIRST_STEP;

  const response = redirectTo(`/apply/${step}`, 303);
  response.headers.set('Cache-Control', 'no-store, private');
  return response;
}
