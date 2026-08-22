'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { ChoiceGroup, Radio, Select, TextInput } from '@/components/ui/Controls';
import { Pending } from '@/components/ui/Pending';
import { dollars, formatUsd } from '@/lib/money';
import { assess, type Assessment, type PrequalInput, type Thresholds } from '@/lib/apply/prequalify';
import styles from './apply.module.css';

/**
 * Step 0 - pre-qualification.
 *
 * Runs entirely before payment and asks only what changes the answer. Every
 * extra question here is a chance to abandon, and the point of the step is to
 * get someone to an honest read fast, not to start collecting the application.
 *
 * Nothing sensitive is asked: no SSN, no date of birth, no address history.
 * Those come after someone has decided to proceed, which is also when we can
 * explain why we need them.
 */
export function PrequalForm({
  thresholds,
  previewThresholds,
}: {
  thresholds: Thresholds | null;
  /** Dev-only: lets the tested logic be seen while the real numbers are blocked. */
  previewThresholds?: Thresholds;
}) {
  const [result, setResult] = useState<Assessment | null>(null);
  const [usedPreview, setUsedPreview] = useState(false);

  function run(event: FormEvent<HTMLFormElement>, preview: boolean) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const num = (key: string) => Number((data.get(key) as string)?.replace(/[$,]/g, '') || 0);

    const input: PrequalInput = {
      monthlyIncomeCents: dollars(num('income')),
      homeTotalMonthlyCents: dollars(num('rent') || 1875),
      hasVoucher: data.get('voucher') === 'yes',
      voucherCoversCents: dollars(num('voucherAmount')),
      creditBand: (data.get('credit') as PrequalInput['creditBand']) || 'unsure',
      priorIssue: (data.get('issue') as PrequalInput['priorIssue']) || 'none',
      priorIssueYearsAgo: data.get('issueYears') ? num('issueYears') : null,
      hasPets: data.get('pets') === 'yes',
      moveInWithinDays: num('moveIn') || 45,
    };

    setUsedPreview(preview);
    setResult(assess(input, preview ? (previewThresholds ?? null) : thresholds));
  }

  return (
    <div className={styles.prequal}>
      <form className={styles.form} onSubmit={(e) => run(e, false)}>
        <Field name="rent"
          label="Total monthly cost of the home"
          hint="The all-in figure shown on the listing, not base rent. Leave it blank if you are still looking."
        >
          {(p) => <TextInput {...p} figure name="rent" inputMode="numeric" placeholder="1875" />}
        </Field>

        <Field name="income"
          label="Your household's monthly income before tax"
          hint="Everything you want counted, from every earner and every source - wages, self-employment, benefits, support."
          required
        >
          {(p) => <TextInput {...p} figure name="income" inputMode="numeric" placeholder="0" required />}
        </Field>

        {/*
          NOTHING IS PRE-SELECTED IN THIS FORM, and that is deliberate.

          "No" used to be checked by default here, on the rental-history group,
          and on pets. It reads as a harmless convenience and it quietly breaks
          the only thing this step does. The step exists to give an honest read
          before anyone pays, and a default answers the question on the
          applicant's behalf with the majority case - which is precisely not the
          people this site is for.

          Both directions do damage. A voucher holder left on "No" has their
          voucher income uncounted, so their income multiple looks worse than it
          is and they may be told they are unlikely to qualify when they would:
          the exact false discouragement this page exists to prevent. Someone
          with an eviction left on "None of these" is assessed against tier one,
          told their odds are good, pays the fee, and then meets the truth -
          which is the fee-for-a-hopeless-application failure the step exists to
          prevent.

          The hint under the next group says "answering honestly here helps you"
          while a default had already answered it for them.
        */}
        <ChoiceGroup legend="Do you have a housing voucher?" hint="We accept them in every market we serve.">
          <Radio id="v-yes" name="voucher" value="yes" label="Yes" required />
          <Radio id="v-no" name="voucher" value="no" label="No" required />
        </ChoiceGroup>

        <Field name="voucherAmount" label="If yes, how much does it cover each month?" note="Optional">
          {(p) => <TextInput {...p} figure name="voucherAmount" inputMode="numeric" placeholder="0" />}
        </Field>

        <Field name="credit" label="How would you describe your credit?" hint="A rough answer is fine. We check the real report later.">
          {(p) => (
            <Select {...p} name="credit" defaultValue="unsure">
              <option value="strong">Good - no missed payments I know of</option>
              <option value="fair">Fair - a few problems</option>
              <option value="poor">Poor - collections or defaults</option>
              <option value="none">Little or no credit history</option>
              <option value="unsure">I am not sure</option>
            </Select>
          )}
        </Field>

        <ChoiceGroup
          legend="Has any of this happened in your rental history?"
          hint="Answering honestly here helps you. It routes you to the right track rather than to a surprise decline."
        >
          <Radio id="i-none" name="issue" value="none" label="None of these" required />
          <Radio
            id="i-filing"
            name="issue"
            required
            value="eviction-filing"
            label="An eviction was filed against me"
            description="Filed is not the same as decided, and we read the difference"
          />
          <Radio required id="i-judgment" name="issue" value="eviction-judgment" label="An eviction judgment was entered" />
          <Radio required id="i-broken" name="issue" value="broken-lease" label="I left a lease early" />
          <Radio required id="i-unsure" name="issue" value="unsure" label="I am not sure what is on my record" />
        </ChoiceGroup>

        <Field name="issueYears" label="If so, how many years ago?" note="Optional">
          {(p) => <TextInput {...p} figure name="issueYears" inputMode="numeric" placeholder="e.g. 5" />}
        </Field>

        <ChoiceGroup legend="Any pets?">
          <Radio id="p-yes" name="pets" value="yes" label="Yes" required />
          <Radio id="p-no" name="pets" value="no" label="No" required />
        </ChoiceGroup>

        <Field name="moveIn" label="How soon do you need to move, in days?">
          {(p) => <TextInput {...p} figure name="moveIn" inputMode="numeric" placeholder="45" />}
        </Field>

        <div className={styles.formActions}>
          <Button type="submit" size="lg">
            Check my odds - no fee
          </Button>
          {previewThresholds ? (
            <Button
              type="submit"
              variant="secondary"
              onClick={(e) => {
                e.preventDefault();
                const form = (e.currentTarget as HTMLButtonElement).form;
                if (!form) return;
                // Check validity explicitly. Calling `run` from a click handler
                // skips the browser's constraint validation, which is the only
                // thing stopping an unanswered voucher or rental-history group
                // from being read as "no" - the bug the groups above document.
                if (!form.reportValidity()) return;
                run({ preventDefault: () => {}, currentTarget: form } as unknown as FormEvent<HTMLFormElement>, true);
              }}
            >
              Preview with sample criteria
            </Button>
          ) : null}
        </div>
        <p className={styles.formNote}>
          Nothing here is a credit check and nothing is charged. We do not ask for a
          Social Security number until you decide to continue - and when we do, we say
          why.
        </p>
      </form>

      {result ? (
        <section
          className={[styles.result, styles[`track-${result.track}`]].join(' ')}
          aria-live="polite"
          aria-labelledby="result-heading"
        >
          {usedPreview ? (
            <p className={styles.previewFlag}>
              Preview using sample criteria - not the real thresholds.
            </p>
          ) : null}

          <h2 className={styles.resultTitle} id="result-heading">
            {result.headline}
          </h2>

          {result.track === 'unknown' ? (
            <div className={styles.resultBody}>
              <p>{result.reasons[0]}</p>
              <Pending block>
                tier one and tier two thresholds - income multiples and eviction recency
              </Pending>
              <p className={styles.resultNote}>
                The assessment logic behind this step is built and tested. It needs the
                published numbers before it can give anyone a read, and we would rather
                say so than guess at whether your money is worth spending.
              </p>
            </div>
          ) : (
            <div className={styles.resultBody}>
              <ul className={styles.reasons} role="list">
                {result.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>

              {result.wouldHelp.length > 0 ? (
                <div className={styles.subBlock}>
                  <h3 className={styles.subTitle}>What would change this</h3>
                  <ul className={styles.list} role="list">
                    {result.wouldHelp.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {result.documents.length > 0 ? (
                <div className={styles.subBlock}>
                  <h3 className={styles.subTitle}>What to have ready</h3>
                  <ul className={styles.list} role="list">
                    {result.documents.map((doc) => (
                      <li key={doc}>{doc}</li>
                    ))}
                  </ul>
                  <p className={styles.resultNote}>
                    You can upload these after you submit - they do not hold up your
                    decision starting.
                  </p>
                </div>
              ) : null}

              <div className={styles.resultActions}>
                {/*
                  EVERYONE CAN APPLY. This read is preparation, not permission -
                  it exists so nobody is surprised by what the home costs or what
                  to bring, and it has never been the decision. Every application
                  is reviewed by a person, so removing the button here would have
                  the site turning people away that our own staff might approve.

                  What a weak read still changes is the money: we do not take a
                  fee upfront on one. That was the promise, and it survives -
                  what goes is the dead end that used to sit beside it.
                */}
                <ButtonLink href="/apply/details" size="lg">
                  Continue to the application
                </ButtonLink>

                {result.chargeFee ? (
                  <p className={styles.feeNote}>
                    The application fee is{' '}
                    <span className={styles.figure}>{formatUsd(dollars(55))}</span> per
                    adult, charged at the last step, never before you have seen it.{' '}
                    <Link href="/fees">Every fee is published</Link>.
                  </p>
                ) : (
                  <p className={styles.feeNote}>
                    Based on what you have told us, we will not ask for an application
                    fee upfront - a person will look at this one individually first.
                    You are welcome to apply, and it is our staff who decide, not this
                    page. <Link href="/fees">Every fee is published</Link>.
                  </p>
                )}

                <p className={styles.feeNote}>
                  Prefer to see it first? <Link href="/schedule-tour">Request a tour</Link>,
                  or <Link href="/homes-for-rent">browse other homes</Link>.
                </p>
              </div>
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
