import Link from 'next/link';
import { Field } from '@/components/ui/Field';
import { Checkbox, TextInput } from '@/components/ui/Controls';
import { StepNav } from '@/components/apply/StepNav';
import { Pending } from '@/components/ui/Pending';
import { AlertIcon, CheckIcon } from '@/components/ui/Icons';
import { CopyField } from '@/components/apply/CopyField';
import { FAMILY_OF, type PaymentFamily } from '@/lib/payments/methods';
import pay from './payment.module.css';
import { formatUsd } from '@/lib/money';
import {
  APPLICATION_FEE_CENTS,
  configuredMethods,
  paymentReference,
  type PaymentMethod,
} from '@/lib/payments/methods';
import type { ApplicationDraft, FieldError } from '@/lib/apply/draft';
import styles from './steps.module.css';

const errorFor = (errors: FieldError[], field: string) =>
  errors.find((e) => e.field === field)?.message;

/**
 * Step 6 - payment.
 *
 * The fee is collected on manual rails and reconciled by a person, so this
 * page has two jobs that pull against each other: give someone the details
 * they need to send money, and make it obvious this is not the scam they have
 * been warned about.
 *
 * The anti-fraud notice is not boilerplate. Zelle and Chime are precisely the
 * rails rental fraud uses, and a renter who has done any research arrives here
 * primed to leave. Stating our own rules up front - details only ever appear
 * on this page, the amount never changes, we never ask for a deposit before a
 * lease - gives them something concrete to check a fraudulent message against
 * later. It is the same move as publishing the screening criteria: the promise
 * is only worth anything because it is specific enough to catch us breaking it.
 */
/**
 * Rails grouped by what a mistake costs the payer, not by brand.
 *
 * Someone weighing Zelle against an ACH transfer is making a risk decision and
 * usually does not know it. Naming the group is the cheapest way to tell them.
 */
const FAMILIES: { id: PaymentFamily; title: string; note: string }[] = [
  {
    id: 'bank',
    title: 'From your bank',
    note: 'Slowest to arrive, and the safest: your bank can trace or recall a payment sent to the wrong place.',
  },
  {
    id: 'app',
    title: 'Payment apps',
    note: 'Arrive in minutes. None of them can be reversed once sent, so check the details before you confirm.',
  },
  {
    id: 'crypto',
    title: 'Crypto',
    note: 'Irreversible, and the dollar value moves while the network confirms. Send promptly after checking the total.',
  },
];

/** Brand marks, where we hold one. Everything else falls back to an initial. */
const LOGOS: Partial<Record<string, string>> = {
  zelle: '/paymentLogos/Zelle_id9UrjyZ9y_1.svg',
  paypal: '/paymentLogos/PayPal_Logo_Alternative_2.webp',
  cashapp: '/paymentLogos/Cash_App_Logo_1.png',
  'apple-pay': '/paymentLogos/Apple_Logo_2.webp',
  venmo: '/paymentLogos/Venmo_idYMSlb9QP_1.png',
  solana: '/paymentLogos/Solana_idN473ehUb_1.png',
};

export function PaymentStep({
  draft,
  errors,
  liveMethods,
}: {
  draft: ApplicationDraft;
  errors: FieldError[];
  /** Configured in Django admin and fetched per draft; see lib/payments/source.ts. */
  liveMethods: PaymentMethod[];
}) {
  const { methods, isSample } = configuredMethods(liveMethods);
  const reference = paymentReference(draft.id);
  const configured = methods.length > 0;

  const adultCount = 1 + draft.occupants.filter((o) => (o.age ?? 0) >= 18).length;
  const totalFeeCents = adultCount * APPLICATION_FEE_CENTS;

  return (
    <form className={styles.form} method="post" action="/apply/payment/save" encType="multipart/form-data">
      <div className={styles.feeCallout}>
        <p>
          The total application fee is{' '}
          <span className={styles.figure}>{formatUsd(totalFeeCents)}</span> ({adultCount} adult{adultCount !== 1 ? 's' : ''} at {formatUsd(APPLICATION_FEE_CENTS)} each). This does not change.
        </p>
      </div>

      {/* LOAD-BEARING, NOT DECORATIVE, and it had been deleted.
          The whole payments model rests on this paragraph: details appear only
          here, the amount never changes, and no deposit is ever requested
          before a lease. That is what gives an applicant something concrete to
          check a later fraudulent message against - and the rails below
          include the ones rental fraud actually runs on. */}
      <aside className={pay.trust} aria-labelledby="fraud-heading">
        <h2 className={pay.trustTitle} id="fraud-heading">
          <AlertIcon />
          How to know a payment request is really from us
        </h2>
        <ul className={pay.trustList} role="list">
          <li>
            Our payment details appear <strong>only on this page</strong>, inside an
            application you started yourself. We will never send them by email, text
            message, or over the phone.
          </li>
          <li>
            The amount is always{' '}
            <span className={styles.figure}>{formatUsd(totalFeeCents)}</span>. Anyone asking
            you for a different figure is not us.
          </li>
          <li>
            We will <strong>never</strong> ask for a deposit, first month&rsquo;s rent, or a
            holding fee before you have a signed lease.
          </li>
          <li>
            If anything you receive contradicts this page, stop and{' '}
            <Link href="/contact">call the number on our contact page</Link>. We would
            rather answer a needless question than have you lose money.
          </li>
        </ul>
      </aside>

      {/* Development warning removed per user request */}

      <div className={styles.referenceBlock}>
        <p className={styles.referenceLabel}>Your payment reference</p>
        <p className={styles.referenceValue}>
          <span className={styles.figure}>{reference}</span>
        </p>
        <p className={styles.explainerNote}>
          Put this in the memo or note field when you send the payment. It is how we match
          your money to your application - without it, verification takes longer.
        </p>
      </div>

      {!configured ? (
        <div className={styles.formError} role="alert">
          <div>
            <p>
              <strong>No payment methods are set up yet.</strong>
            </p>
            <p className={styles.explainerNote}>
              Account details are configured in admin and deliberately not invented here -
              published instructions that send real money nowhere would be worse than an
              unfinished page.
            </p>
            <Pending>
              payment method details - bank account, Chime, PayPal, Zelle, and any other
              arrangement
            </Pending>
          </div>
        </div>
      ) : (
        <fieldset className={pay.picker}>
          <legend className={pay.pickerLegend}>
            <span className={pay.stepNumber}>1</span>
            Choose how you want to pay
          </legend>
          <p className={pay.pickerHint}>
            Every option below sends the same {formatUsd(totalFeeCents)}. Pick the one you
            already use — there is no advantage to us in which you choose.
          </p>

          {errorFor(errors, 'paymentMethod') ? (
            <p className={styles.formError} role="alert">
              {errorFor(errors, 'paymentMethod')}
            </p>
          ) : null}

          {FAMILIES.map((family) => {
            const inFamily = methods.filter((m) => FAMILY_OF[m.kind] === family.id);
            if (inFamily.length === 0) return null;

            return (
              <section className={pay.family} key={family.id}>
                <h3 className={pay.familyTitle}>{family.title}</h3>
                <p className={pay.familyNote}>{family.note}</p>

                <div className={pay.grid}>
                  {inFamily.map((method) => (
                    /* The whole card is the label, so the hit target is the
                       card and not a 16px radio dot. */
                    <label className={pay.card} key={method.kind}>
                      <input
                        className={pay.radio}
                        type="radio"
                        name="paymentMethod"
                        value={method.kind}
                        defaultChecked={draft.paymentMethod === method.kind}
                      />

                      <span className={pay.cardHead}>
                        {LOGOS[method.kind] ? (
                          /* eslint-disable-next-line @next/next/no-img-element --
                             Third-party brand marks at a fixed display size;
                             next/image would proxy each for no gain. */
                          <img className={pay.logo} src={LOGOS[method.kind]} alt="" />
                        ) : (
                          <span className={pay.logoFallback} aria-hidden="true">
                            {method.label.slice(0, 1)}
                          </span>
                        )}
                        <span className={pay.cardName}>{method.label}</span>
                        <span className={pay.tick} aria-hidden="true">
                          <CheckIcon />
                        </span>
                      </span>

                      <span className={pay.cardMeta}>Arrives {method.clearingTime}</span>

                      {/* Revealed by CSS when this card's radio is checked, so
                          the page is not six sets of account details at once
                          and still works with no JavaScript. */}
                      <span className={pay.reveal}>
                        <span className={pay.revealTitle}>
                          Send exactly{' '}
                          <span className={styles.figure}>{formatUsd(totalFeeCents)}</span> to
                        </span>

                        <span className={pay.fields}>
                          {(method.fields ?? []).map((field) => (
                            <CopyField key={field.label} label={field.label} value={field.value} />
                          ))}
                          <CopyField label="Reference" value={reference} />
                        </span>

                        {method.description ? (
                          <span className={pay.revealNote}>{method.description}</span>
                        ) : null}

                        {method.irreversible ? (
                          <span className={pay.warning}>
                            <AlertIcon />
                            <span>
                              This one cannot be reversed once sent. Check the details above
                              against this page before you confirm in your app.
                            </span>
                          </span>
                        ) : null}
                      </span>
                    </label>
                  ))}
                </div>
              </section>
            );
          })}
        </fieldset>
      )}

      {/* Numbered to match step 1, so the page reads as three things to do
          rather than a wall of form. */}
      <h2 className={pay.laterStep}>
        <span className={pay.stepNumber}>2</span>
        Send the money, then tell us
      </h2>
      <p className={pay.laterHint}>
        Use the details on the option you picked above. When it is on its way, fill this
        in — it is what starts your 24-hour decision clock.
      </p>

      <div className={styles.sensitiveBlock}>
        <Field
          name="paymentReference"
          label="Your confirmation or transfer number"
          note="Optional"
          hint="If your bank or app gave you one, it helps us find your payment faster."
        >
          {(p) => (
            <TextInput {...p} figure name="paymentReference" defaultValue={draft.paymentReference ?? ''} />
          )}
        </Field>

        <div style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-bold)', marginBottom: '0.25rem' }} htmlFor="paymentProof">
            Upload proof of payment (Screenshot/Receipt)
          </label>
          <input type="file" id="paymentProof" name="paymentProof" accept="image/*,.pdf" style={{ display: 'block', marginTop: '0.5rem', fontSize: 'var(--font-size-sm)' }} />
          {draft.paymentProofPath && (
            <p className={styles.explainerNote} style={{ marginTop: '0.5rem' }}>
              Proof uploaded: {draft.paymentProofPath.split('/').pop()}
            </p>
          )}
        </div>

        <Checkbox
          id="paymentReported"
          name="paymentReported"
          value="yes"
          label="I have sent the payment"
          description="Tick this once the money is on its way. We will confirm when it arrives."
          defaultChecked={draft.paymentReportedAt !== null}
        />
        {errorFor(errors, 'paymentReported') ? (
          <p className={styles.formError} role="alert">
            {errorFor(errors, 'paymentReported')}
          </p>
        ) : null}

        <p className={styles.explainerNote}>
          Ticking this does not charge you anything and does not confirm receipt - a person
          checks the account and confirms it. <strong>Your 24-hour decision window starts
          when we confirm the payment</strong>, not when you send it, because we will not
          promise a deadline we cannot control the start of.
        </p>
      </div>

      <StepNav step="payment" continueLabel="Submit my application" />
    </form>
  );
}
