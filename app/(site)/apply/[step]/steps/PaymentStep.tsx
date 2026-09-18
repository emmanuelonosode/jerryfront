"use client";

import { useState } from 'react';
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

const FAMILIES: { id: PaymentFamily; title: string; note: string }[] = [
  { id: 'app', title: 'Payment Apps', note: 'Fastest' },
  { id: 'bank', title: 'Bank Transfer', note: 'Safest' },
  { id: 'crypto', title: 'Crypto', note: 'Irreversible' },
];

const LOGOS: Partial<Record<string, string>> = {
  zelle: '/paymentLogos/Zelle_id9UrjyZ9y_1.svg',
  paypal: '/paymentLogos/PayPal_Logo_Alternative_2.webp',
  cashapp: '/paymentLogos/Cash_App_Logo_1.png',
  'apple-pay': '/paymentLogos/Apple_Logo_2.webp',
  venmo: '/paymentLogos/Venmo_idYMSlb9QP_1.png',
  solana: '/paymentLogos/Solana_idN473ehUb_1.png',
  chime: '/paymentLogos/chime.png',
  litecoin: '/paymentLogos/litecoin.jpeg',
};

const METHOD_NAMES: Record<string, string> = {
  zelle: 'Zelle',
  paypal: 'PayPal',
  cashapp: 'Cash App',
  'apple-pay': 'Apple Pay',
  venmo: 'Venmo',
  solana: 'Solana',
  chime: 'Chime',
  litecoin: 'Litecoin',
  ach: 'Bank Transfer',
  wire: 'Wire Transfer',
  check: 'Check',
};

type WizardStep = 'select' | 'details';

export function PaymentStep({
  draft,
  errors,
  liveMethods,
}: {
  draft: ApplicationDraft;
  errors: FieldError[];
  liveMethods: PaymentMethod[];
}) {
  const { methods, isSample } = configuredMethods(liveMethods);
  const reference = paymentReference(draft.id);
  const configured = methods.length > 0;

  const adultCount = draft.adultCount ?? 1;
  const totalFeeCents = adultCount * APPLICATION_FEE_CENTS;

  const [selectedMethodKind, setSelectedMethodKind] = useState<string | null>(draft.paymentMethod);
  const [wizardStep, setWizardStep] = useState<WizardStep>(
    draft.paymentMethod ? 'details' : 'select'
  );

  const selectedMethod = methods.find((m) => m.kind === selectedMethodKind);

  const handleSelectMethod = (kind: string) => {
    setSelectedMethodKind(kind);
    setWizardStep('details');
  };

  return (
    <form className={styles.form} method="post" action="/apply/payment/save" encType="multipart/form-data">
      
      {/* ------------------------------------------------------------------
          WIZARD VIEW 1: SELECT METHOD
          ------------------------------------------------------------------ */}
      {wizardStep === 'select' && (
        <div className={pay.wizardContainer}>
          <div className={pay.introBox}>
            <h2 className={pay.introTitle}>Application Fee</h2>
            <p className={pay.introText}>
              One payment of {formatUsd(totalFeeCents)} covers everyone. Nothing else is due until you sign a lease.
            </p>
          </div>

          {!configured ? (
            <div className={styles.formError} role="alert">
              <div>
                <p><strong>No payment methods are set up yet.</strong></p>
                <p className={styles.explainerNote}>
                  Account details are configured in admin and deliberately not invented here.
                </p>
                <Pending>payment method details</Pending>
              </div>
            </div>
          ) : (
            <fieldset className={pay.picker}>
              {errorFor(errors, 'paymentMethod') && (
                <p className={styles.formError} role="alert">
                  {errorFor(errors, 'paymentMethod')}
                </p>
              )}

              {FAMILIES.map((family) => {
                const inFamily = methods.filter((m) => FAMILY_OF[m.kind] === family.id);
                if (inFamily.length === 0) return null;

                return (
                  <section className={pay.family} key={family.id}>
                    <h3 className={pay.familyTitle}>{family.title}</h3>
                    <div className={pay.familyList}>
                      {inFamily.map((method) => (
                        <label 
                          className={pay.card} 
                          key={method.kind}
                          onClick={() => handleSelectMethod(method.kind)}
                        >
                          <input
                            className={pay.radio}
                            type="radio"
                            name="paymentMethod"
                            value={method.kind}
                            checked={selectedMethodKind === method.kind}
                            readOnly // state is managed by onClick on label
                          />

                          <span className={pay.cardHead}>
                            <span className={pay.logoWrapper}>
                              {LOGOS[method.kind] ? (
                                <img className={pay.logo} src={LOGOS[method.kind]} alt="" />
                              ) : (
                                <span className={pay.logoFallback} aria-hidden="true">
                                  {method.label.slice(0, 1)}
                                </span>
                              )}
                            </span>
                            
                            <span className={pay.cardInfo}>
                              <span className={pay.cardName}>{METHOD_NAMES[method.kind] || method.label}</span>
                              <span className={pay.cardMeta}>
                                Arrives {method.clearingTime.charAt(0).toLowerCase() + method.clearingTime.slice(1)}
                              </span>
                            </span>

                            <span className={pay.tick} aria-hidden="true">
                              {/* Provide a > icon or something similar to indicate forward movement, 
                                  but we can just keep it as a clean empty space since it auto-advances */}
                              <span style={{ color: '#c7c7cc', fontSize: '20px' }}>›</span>
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </section>
                );
              })}
            </fieldset>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------
          WIZARD VIEW 2: DETAILS (INSTRUCTIONS + RECEIPT)
          ------------------------------------------------------------------ */}
      {wizardStep === 'details' && selectedMethod && (
        <div className={pay.wizardContainer}>
          <div className={pay.navHeader}>
            <button 
              type="button" 
              className={pay.backButton}
              onClick={() => setWizardStep('select')}
            >
              ‹ Choose a different method
            </button>
          </div>

          <div className={pay.introBox}>
            <h2 className={pay.introTitle}>Send {formatUsd(totalFeeCents)}</h2>
            <p className={pay.introText}>
              Open {METHOD_NAMES[selectedMethod.kind] || selectedMethod.label} and send exactly {formatUsd(totalFeeCents)} to the details below.
            </p>
          </div>

          <div className={pay.instructionsBox}>
            <div className={pay.selectedMethodHeader}>
              <span className={pay.logoWrapper}>
                {LOGOS[selectedMethod.kind] ? (
                  <img className={pay.logo} src={LOGOS[selectedMethod.kind]} alt="" />
                ) : (
                  <span className={pay.logoFallback} aria-hidden="true">
                    {(METHOD_NAMES[selectedMethod.kind] || selectedMethod.label).slice(0, 1)}
                  </span>
                )}
              </span>
              <span className={pay.cardInfo}>
                <span className={pay.cardName}>{METHOD_NAMES[selectedMethod.kind] || selectedMethod.label}</span>
                <span className={pay.cardMeta}>
                  Arrives {selectedMethod.clearingTime.charAt(0).toLowerCase() + selectedMethod.clearingTime.slice(1)}
                </span>
              </span>
            </div>

            <div className={pay.fields}>
              {(selectedMethod.fields ?? []).map((field) => (
                <CopyField key={field.label} label={field.label} value={field.value} />
              ))}
              <CopyField label="Reference (Memo)" value={reference} />
            </div>

            {selectedMethod.description && (
              <span className={pay.revealNote}>{selectedMethod.description}</span>
            )}
          </div>

          <div className={pay.receiptSection}>
            <div>
              <h2 className={pay.receiptTitle}>Show us the receipt</h2>
              <p className={pay.receiptHint}>
                Please attach a screenshot of your transfer. It helps us match your funds instantly.
              </p>
            </div>

            <div className={pay.sensitiveBlock}>
              <ProofUpload
                savedFilename={draft.paymentProofPath?.split('/').pop() ?? null}
                error={errorFor(errors, 'paymentProof')}
              />

              <Field
                name="paymentReference"
                label="Confirmation Number"
                note="Optional"
                hint="If your app gave you one, it helps us find your payment faster."
              >
                {(p) => (
                  <TextInput {...p} figure name="paymentReference" defaultValue={draft.paymentReference ?? ''} />
                )}
              </Field>

              <Checkbox
                id="paymentReported"
                name="paymentReported"
                value="yes"
                label="I confirm the money is sent"
                description="Your 24-hour decision window starts when we verify the funds."
                defaultChecked={draft.paymentReportedAt !== null}
              />
              {errorFor(errors, 'paymentReported') && (
                <p className={styles.formError} role="alert">
                  {errorFor(errors, 'paymentReported')}
                </p>
              )}
            </div>
          </div>

          {/* Hidden radio so form submission includes the payment method */}
          <input type="hidden" name="paymentMethod" value={selectedMethod.kind} />

          <StepNav step="payment" continueLabel="Create Account & Finish" />
        </div>
      )}
    </form>
  );
}
