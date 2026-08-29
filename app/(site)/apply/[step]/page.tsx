import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { StepShell } from '@/components/apply/StepShell';
import { draftForRender } from '../actions';
import { canEnterStep, progressOf, resumeStep, validateStep } from '@/lib/apply/draft';
import { isStepSlug, type StepSlug } from '@/lib/apply/steps';
import { DetailsStep } from './steps/DetailsStep';
import { IncomeStep } from './steps/IncomeStep';
import { HistoryStep } from './steps/HistoryStep';
import { HouseholdStep } from './steps/HouseholdStep';
import { ReviewStep } from './steps/ReviewStep';
import { PaymentStep } from './steps/PaymentStep';
import { ConfirmationStep } from './steps/ConfirmationStep';
import { methodsForDraft } from '@/lib/payments/source';

/**
 * One route for every application step.
 *
 * `noindex` throughout - these pages contain someone's half-finished
 * application, and the credential-route headers in `next.config.ts` also send
 * no referrer from here.
 */
export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ step: string }>;
}): Promise<Metadata> {
  const { step } = await params;
  return {
    title: isStepSlug(step) ? 'Application' : 'Not found',
    robots: { index: false, follow: false },
  };
}

export default async function ApplyStepPage({
  params,
  searchParams,
}: {
  params: Promise<{ step: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { step } = await params;

  /**
   * Read the marker the save action redirects with.
   *
   * The value is not used - errors come from the draft, so they survive a
   * refresh and a resume link. Reading it at all is what matters: a page that
   * never touches `searchParams` is treated as identical content for every
   * query string, so the router serves the cached payload after the action's
   * redirect and the newly-saved errors never reach the screen.
   */
  void (await searchParams);
  if (!isStepSlug(step)) notFound();

  const draft = await draftForRender();

  /**
   * An unsaved draft renders the form, it does not redirect.
   *
   * This used to bounce to `/apply/start`, which created a row and set a
   * cookie so the page would find something on the way back. That handshake is
   * why entering the funnel wrote to the database at all. Now `draftForRender`
   * returns a transient blank draft that renders identically, and the row is
   * created by the first save.
   *
   * It also removes the redirect loop this page and the entry route used to
   * form when the cookie could not persist, along with the `retry=1` marker
   * that existed to break it. There is no loop to break: nothing here
   * redirects on a missing draft.
   */

  // Someone deep-linking past an unfinished step is sent to the first gap
  // rather than shown a form that will be rejected at review.
  if (!canEnterStep(draft, step as StepSlug)) {
    redirect(`/apply/${resumeStep(draft)}`);
  }

  // Errors show only for steps the applicant has actually tried to submit.
  // Marking a form red before someone has finished filling it in is hostile,
  // especially to an audience already braced for rejection.
  const errors = draft.attemptedSteps.includes(step as StepSlug)
    ? validateStep(draft, step as StepSlug)
    : [];

  // Only on the step that needs them: every other step would pay for a request
  // whose answer it never renders.
  const liveMethods = step === 'payment' ? await methodsForDraft(draft.id) : [];

  return (
    <StepShell
      step={step as StepSlug}
      progress={progressOf(draft)}
      // Nothing has been saved yet, so the shell must not claim it has. The
      // blank draft carries a fresh `updatedAt` purely because it is a
      // well-formed draft object.
      savedAt={draft.id === 'unsaved' ? null : draft.updatedAt}
    >
      {step === 'details' ? <DetailsStep draft={draft} errors={errors} /> : null}
      {step === 'income' ? <IncomeStep draft={draft} errors={errors} /> : null}
      {step === 'history' ? <HistoryStep draft={draft} errors={errors} /> : null}
      {step === 'household' ? <HouseholdStep draft={draft} errors={errors} /> : null}
      {step === 'review' ? <ReviewStep draft={draft} errors={errors} /> : null}
      {step === 'payment' ? (
        <PaymentStep draft={draft} errors={errors} liveMethods={liveMethods} />
      ) : null}
      {step === 'confirmation' ? <ConfirmationStep draft={draft} /> : null}
    </StepShell>
  );
}
