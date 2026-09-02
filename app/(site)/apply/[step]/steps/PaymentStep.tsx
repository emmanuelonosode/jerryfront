import Link from 'next/link';
import { Field } from '@/components/ui/Field';
import { Checkbox, TextInput } from '@/components/ui/Controls';
import { StepNav } from '@/components/apply/StepNav';
import { Pending } from '@/components/ui/Pending';
import { CheckIcon } from '@/components/ui/Icons';
import { CopyField } from '@/components/apply/CopyField';
import { ProofUpload } from '@/components/apply/ProofUpload';
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
 * The fee is collected on manual rails and reconciled by a person, so the
 * page has to give someone the details they need and keep them confident
 * while they use them.
 *
 * IT USED TO OPEN WITH A FRAUD WARNING. Four paragraphs on what a criminal
 * impersonating us might do, at the exact moment somebody had decided to go
 * ahead. It was written protectively and it read as a reason to hesitate. The
 * two facts worth keeping - the amount is fixed, nothing else is asked for
 * before a lease - are now stated as what we do rather than as what to watch
 * out for.
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

      {/* WARMTH INSTEAD OF WARNINGS, at the business's request.

          What was here was an anti-fraud notice: "we will never send payment
          details by email", "anyone asking for a different figure is not us",
          "we would rather answer a needless question than have you lose
          money". It was written to protect the applicant and it read as a
          warning about us - four paragraphs about being defrauded, at the
          moment somebody has decided to go ahead and is about to send money.
          That is the worst possible place to introduce doubt.

          The two facts that actually protected anyone are kept, because they
          are useful either way: the amount is fixed, and nothing else is asked
          for before a lease. They are now stated as reassurance - what we do -
          rather than as a list of what a criminal might do. */}
      <aside className={pay.trust} aria-labelledby="reassure-heading">
        <h2 className={pay.trustTitle} id="reassure-heading">
          <CheckIcon />
          You are nearly there
        </h2>
        <ul className={pay.trustList} role="list">
          <li>
            One payment of{' '}
            <span className={styles.figure}>{formatUsd(totalFeeCents)}</span>, and that is
            the only thing we ask for before your decision.
          </li>
          <li>
            Nothing else is due until you have a lease in front of you and have decided to
            sign it.
          </li>
          <li>
            A person reviews your application, and you hear back within 24 hours of us
            confirming the payment. <Link href="/contact">Talk to us</Link> any time - we
            are happy to help.
          </li>
        </ul>
      </aside>

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

                      {/* The clearing times are authored as sentences ("Usually
                          within minutes", "Same day if sent before 2pm"), so
                          prefixing them verbatim produced "Arrives Usually
                          within minutes". Lower-casing the first letter only -
                          never the rest - keeps "2pm" and any brand name intact. */}
                      <span className={pay.cardMeta}>
                        Arrives {method.clearingTime.charAt(0).toLowerCase() + method.clearingTime.slice(1)}
                      </span>

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

                        {/* Was "This one cannot be reversed once sent" beside
                            an alert icon. The useful half of that is "check
                            the details first", which is worth saying without
                            the alarm attached to it. */}
                        {method.irreversible ? (
                          <span className={pay.warning}>
                            <span>
                              Worth a quick check of the details above before you confirm in
                              your app - this one sends instantly.
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

      {/* ---- 2. Send it ---------------------------------------------------
          Its own numbered stage, and deliberately the shortest: nothing here
          is a form field, because at this point the applicant is in their
          banking app rather than on this page. */}
      <h2 className={pay.laterStep}>
        <span className={pay.stepNumber}>2</span>
        Send {formatUsd(totalFeeCents)} using those details
      </h2>
      <p className={pay.laterHint}>
        Put the reference <span className={styles.figure}>{reference}</span> in the memo or
        note field. Then come back here — this page is saved and will be waiting.
      </p>

      {/* ---- 3. Prove it -------------------------------------------------- */}
      <h2 className={pay.laterStep}>
        <span className={pay.stepNumber}>3</span>
        Show us the receipt
      </h2>
      <p className={pay.laterHint}>
        Every payment here is sent on a manual rail and checked by a person. A screenshot
        turns that check into a couple of seconds instead of a hunt through a bank feed —
        and it is what you point at if a transfer ever goes astray.
      </p>

      <div className={styles.sensitiveBlock}>
        <ProofUpload
          savedFilename={draft.paymentProofPath?.split('/').pop() ?? null}
          error={errorFor(errors, 'paymentProof')}
        />

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
