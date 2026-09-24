'use client';

import { useEffect, useState } from 'react';
import { Illustration } from '@/components/brand/Illustration';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { CopyField } from '@/components/apply/CopyField';
import { ProofUpload } from '@/components/apply/ProofUpload';
import controls from '@/components/ui/controls.module.css';
import { formatUsd } from '@/lib/money';
import { ApiError, apiFetch } from '@/lib/portal/api';
import { getAccessToken } from '@/lib/portal/tokens';
import { StatusBadge } from './StatusBadge';
import styles from './portal.module.css';
import own from './Payments.module.css';

type Invoice = {
  id: string;
  invoice_number: string;
  title: string;
  description: string;
  issued_date: string;
  due_date: string;
  line_items: { description: string; quantity: number; unit_price_cents: number }[];
  subtotal_cents: number;
  tax_amount_cents: number;
  total_cents: number;
  received_cents: number;
  balance_cents: number;
  status: string;
  status_display: string;
  pdf_url: string;
};

type Payment = {
  id: string;
  invoice_number: string | null;
  amount_cents: number;
  method_display: string;
  status: string;
  status_display: string;
  reference_id: string;
  rejection_reason: string;
  created_at: string;
};

type Method = {
  id: string;
  method: string;
  method_display: string;
  display_name: string;
  handle: string;
  extra_instructions: string;
  irreversible: boolean;
  clearing_time: string;
  recipient_name: string;
  bank_name: string;
  account_type: string;
  account_number: string;
  routing_number: string;
};

type Summary = {
  total_paid_cents: number;
  open_balance_cents: number;
  last_payment: Payment | null;
};

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

const FAMILIES: { id: 'app' | 'bank' | 'crypto'; title: string; badge: string }[] = [
  { id: 'app', title: 'Payment Apps', badge: 'Fastest' },
  { id: 'bank', title: 'Bank Transfer', badge: 'Safest' },
  { id: 'crypto', title: 'Crypto', badge: 'Irreversible' },
];

function getMethodKey(method: Method): string {
  return (method.method || '').toLowerCase().replace(/_/g, '-');
}

function getMethodFamily(method: Method): 'app' | 'bank' | 'crypto' {
  const key = getMethodKey(method);
  if (['litecoin', 'solana'].includes(key)) return 'crypto';
  if (['ach', 'wire', 'direct-deposit', 'bank-transfer', 'check'].includes(key)) return 'bank';
  return 'app';
}

function getMethodFriendlyName(method: Method): string {
  const key = getMethodKey(method);
  const FRIENDLY_NAMES: Record<string, string> = {
    venmo: 'Venmo',
    chime: 'Chime',
    wire: 'Wire Transfer',
    'direct-deposit': 'Direct Deposit',
    ach: 'ACH Bank Transfer',
    litecoin: 'Litecoin (LTC)',
    solana: 'Solana (SOL)',
    zelle: 'Zelle',
    cashapp: 'Cash App',
    paypal: 'PayPal',
    'apple-pay': 'Apple Pay',
  };
  if (FRIENDLY_NAMES[key]) return FRIENDLY_NAMES[key];
  if (method.display_name && method.display_name !== 'Jerry Micheal Skelton') {
    return method.display_name;
  }
  if (method.method_display && method.method_display.trim()) {
    return method.method_display;
  }
  return 'Manual Payment';
}

function getMethodSubtitle(method: Method): string {
  if (method.bank_name) return method.bank_name;
  if (method.handle) return method.handle;
  if (method.clearing_time) return method.clearing_time;
  return 'Direct rail';
}

function BankIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 21h18M3 10h18M5 10v11M9 10v11M15 10v11M19 10v11M12 2 2 7h20L12 2z" />
    </svg>
  );
}

export function Payments() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [methods, setMethods] = useState<Method[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [paying, setPaying] = useState<Invoice | null>(null);
  const [chosen, setChosen] = useState<Method | null>(null);
  const [wizardStep, setWizardStep] = useState<'select' | 'details'>('select');
  const [reference, setReference] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    Promise.allSettled([
      apiFetch<Invoice[]>('/billing/my-invoices/'),
      apiFetch<Payment[]>('/billing/my-payments/'),
      apiFetch<Method[]>('/billing/payment-config/'),
      apiFetch<Summary>('/billing/summary/'),
    ]).then(([inv, pay, cfg, sum]) => {
      if (cancelled) return;
      if (inv.status === 'fulfilled') setInvoices(inv.value);
      if (pay.status === 'fulfilled') setPayments(pay.value);
      if (cfg.status === 'fulfilled') setMethods(cfg.value);
      if (sum.status === 'fulfilled') setSummary(sum.value);
      setError(
        [inv, pay, cfg, sum].every((r) => r.status === 'rejected')
          ? 'We could not load your billing just now.'
          : null,
      );
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  function startPayment(invoice: Invoice) {
    setPaying(invoice);
    setChosen(null);
    setWizardStep('select');
    setReference('');
    setSelectedFile(null);
    setAmount((invoice.balance_cents / 100).toFixed(2));
    setFormError(null);
  }

  function handleSelectRail(method: Method) {
    setChosen(method);
    setWizardStep('details');
    setFormError(null);
  }

  async function submitProof(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!paying || !chosen) return;

    const cents = Math.round(Number(amount) * 100);
    if (!Number.isFinite(cents) || cents <= 0) {
      setFormError('Please enter a valid amount.');
      return;
    }

    setBusy(true);
    setFormError(null);
    try {
      let finalProofUrl = '';
      if (selectedFile) {
        const uploadData = new FormData();
        uploadData.append('file', selectedFile);
        const token = getAccessToken();
        const res = await fetch('/api/portal/upload-proof', {
          method: 'POST',
          body: uploadData,
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          setFormError(errJson.error || 'Failed to upload receipt image. Please try again.');
          setBusy(false);
          return;
        }
        const data = await res.json();
        finalProofUrl = data.filename;
      }

      await apiFetch('/billing/my-payments/submit-proof/', {
        method: 'POST',
        body: {
          invoice: paying.id,
          amount_cents: cents,
          payment_method: chosen.method,
          reference_id: reference.trim(),
          proof_image_url: finalProofUrl,
        },
      });

      setPaying(null);
      setChosen(null);
      setWizardStep('select');
      setSelectedFile(null);
      setConfirmation(
        'Thank you! Your payment confirmation and receipt have been recorded. Our accounting department will verify the funds with the bank and mark your invoice as paid.',
      );
      setReloadKey((key) => key + 1);
    } catch (err) {
      setFormError(
        err instanceof ApiError
          ? (err.userMessage ?? 'We could not record that payment.')
          : 'We could not reach the server.',
      );
    } finally {
      setBusy(false);
    }
  }

  const due = invoices.filter((i) => i.balance_cents > 0 && i.status === 'SENT');

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Payments</h1>
          <p className={styles.lead}>
            What you owe, what you have paid, and how to send it.
          </p>
        </div>
      </header>

      {confirmation ? (
        <p className={styles.success} role="status">
          {confirmation}
        </p>
      ) : null}

      {error ? <p className={styles.error} role="alert">{error}</p> : null}

      <div className={styles.metrics}>
        <div className={styles.metric}>
          <p className={styles.metricLabel}>Open balance</p>
          <p className={styles.metricValue}>
            {summary ? formatUsd(summary.open_balance_cents) : '-'}
          </p>
        </div>
        <div className={styles.metric}>
          <p className={styles.metricLabel}>Paid to date</p>
          <p className={styles.metricValue}>
            {summary ? formatUsd(summary.total_paid_cents) : '-'}
          </p>
        </div>
        <div className={styles.metric}>
          <p className={styles.metricLabel}>Last payment</p>
          <p className={styles.metricValue}>
            {summary?.last_payment ? formatUsd(summary.last_payment.amount_cents) : '-'}
          </p>
        </div>
      </div>

      {/* ---- Interactive Pay Flow ---- */}
      {paying ? (
        <section className={own.payCard} aria-labelledby="pay-heading">
          <div className={own.payCardHead}>
            <h2 className={own.payCardTitle} id="pay-heading">
              Pay {paying.invoice_number} · {formatUsd(paying.balance_cents)}
            </h2>
            <Button type="button" variant="secondary" onClick={() => setPaying(null)}>
              Cancel
            </Button>
          </div>

          <div className={own.payCardBody}>
            {methods.length === 0 ? (
              <p className={styles.muted}>
                No payment methods are switched on right now. Contact us and we will take it from
                there — please do not send money to any account you were given by email or text.
              </p>
            ) : wizardStep === 'select' || !chosen ? (
              <>
                <div className={own.introBox}>
                  <p className={own.introAmount}>{formatUsd(paying.balance_cents)}</p>
                  <p className={own.introText}>
                    Select your preferred payment method below to view instructions and submit your payment confirmation for <strong>{paying.invoice_number}</strong>.
                  </p>
                </div>

                {FAMILIES.map((family) => {
                  const inFamily = methods.filter((m) => getMethodFamily(m) === family.id);
                  if (inFamily.length === 0) return null;

                  return (
                    <div className={own.familyGroup} key={family.id}>
                      <div className={own.familyHeader}>
                        <h3 className={own.familyTitle}>{family.title}</h3>
                        <span className={own.familyBadge}>{family.badge}</span>
                      </div>

                      <div className={own.familyList}>
                        {inFamily.map((method) => {
                          const key = getMethodKey(method);
                          const logoSrc = LOGOS[key];
                          const friendlyName = getMethodFriendlyName(method);
                          const subtitle = getMethodSubtitle(method);

                          return (
                            <button
                              key={method.id}
                              type="button"
                              className={own.railCard}
                              onClick={() => handleSelectRail(method)}
                            >
                              <div className={own.railHead}>
                                <div className={own.logoWrapper}>
                                  {logoSrc ? (
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    <img className={own.logo} src={logoSrc} alt={friendlyName} />
                                  ) : family.id === 'bank' ? (
                                    <span className={own.bankIconWrapper}>
                                      <BankIcon />
                                    </span>
                                  ) : (
                                    <span className={styles.figure}>{friendlyName.slice(0, 1)}</span>
                                  )}
                                </div>
                                <div className={own.railInfo}>
                                  <span className={own.railName}>{friendlyName}</span>
                                  <span className={own.railMeta}>
                                    {subtitle}
                                    {method.clearing_time ? ` · ${method.clearing_time}` : ''}
                                  </span>
                                </div>
                              </div>
                              <span className={own.railChevron} aria-hidden="true">&rsaquo;</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </>
            ) : (
              <>
                <div className={own.navHeader}>
                  <button
                    type="button"
                    className={own.backButton}
                    onClick={() => setWizardStep('select')}
                  >
                    &lsaquo; Choose a different payment method
                  </button>
                </div>

                <div className={own.instructionsBox}>
                  <div className={own.selectedMethodHeader}>
                    <div className={own.logoWrapper}>
                      {LOGOS[getMethodKey(chosen)] ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img className={own.logo} src={LOGOS[getMethodKey(chosen)]} alt="" />
                      ) : getMethodFamily(chosen) === 'bank' ? (
                        <span className={own.bankIconWrapper}>
                          <BankIcon />
                        </span>
                      ) : (
                        <span className={styles.figure}>{getMethodFriendlyName(chosen).slice(0, 1)}</span>
                      )}
                    </div>
                    <div className={own.railInfo}>
                      <span className={own.railName}>{getMethodFriendlyName(chosen)}</span>
                      <span className={own.railMeta}>
                        Send exactly {formatUsd(paying.balance_cents)} · {chosen.clearing_time ? `Arrives ${chosen.clearing_time.toLowerCase()}` : 'Business collection'}
                      </span>
                    </div>
                  </div>

                  {chosen.irreversible ? (
                    <p className={own.warning} role="note">
                      {getMethodFriendlyName(chosen)} transfers process directly through your banking or payment app. Please double-check the recipient details below before confirming.
                    </p>
                  ) : null}

                  <div className={own.fieldsList}>
                    {chosen.handle ? (
                      <CopyField label="Handle / Account ID" value={chosen.handle} />
                    ) : null}
                    {chosen.recipient_name ? (
                      <CopyField label="Recipient Name" value={chosen.recipient_name} />
                    ) : null}
                    {chosen.bank_name ? (
                      <CopyField label="Bank Name" value={chosen.bank_name} />
                    ) : null}
                    {chosen.account_type ? (
                      <CopyField label="Account Type" value={chosen.account_type} />
                    ) : null}
                    {chosen.account_number ? (
                      <CopyField label="Account Number" value={chosen.account_number} />
                    ) : null}
                    {chosen.routing_number ? (
                      <CopyField label="Routing Number" value={chosen.routing_number} />
                    ) : null}
                  </div>

                  {/* Memo Highlight Box */}
                  <div className={own.memoBox}>
                    <div className={own.memoLabel}>Payment Note / Memo (Required)</div>
                    <div className={own.memoContent}>
                      <span className={own.memoNumber}>{paying.invoice_number}</span>
                      <CopyField label="Invoice Number" value={paying.invoice_number} />
                    </div>
                    <p className={own.memoHelp}>
                      Please put this invoice number into the transfer note or payment memo. It ensures our staff matches and credits your account immediately.
                    </p>
                  </div>

                  {chosen.extra_instructions ? (
                    <div className={own.extraInstructions}>
                      <strong>Instructions:</strong> {chosen.extra_instructions}
                    </div>
                  ) : null}
                </div>

                <form onSubmit={submitProof} noValidate>
                  <div className={own.receiptSection}>
                    <div className={own.receiptHead}>
                      <h3 className={own.receiptTitle}>Show Us Your Receipt</h3>
                      <p className={own.receiptHint}>
                        Attach a photo or screenshot of your confirmation from your banking or payment app. It helps our staff verify and mark your invoice as paid faster.
                      </p>
                    </div>

                    {formError ? <p className={styles.error} role="alert">{formError}</p> : null}

                    <ProofUpload
                      name="paymentReceipt"
                      onFileSelect={(file) => setSelectedFile(file)}
                    />

                    <div className={own.formGrid}>
                      <Field label="Amount you sent" name="amount" required>
                        {(props) => (
                          <input
                            {...props}
                            className={controls.control}
                            type="number"
                            step="0.01"
                            min="0.01"
                            inputMode="decimal"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                          />
                        )}
                      </Field>

                      <Field
                        label="Reference or transaction ID"
                        name="reference"
                        note="Optional"
                        hint="From your banking or payment app (if available)."
                      >
                        {(props) => (
                          <input
                            {...props}
                            className={controls.control}
                            value={reference}
                            onChange={(e) => setReference(e.target.value)}
                            placeholder="e.g. TRX-984210"
                          />
                        )}
                      </Field>
                    </div>

                    <button
                      type="submit"
                      className={own.submitBtn}
                      disabled={busy}
                    >
                      {busy ? 'Submitting payment...' : 'I Have Sent This Payment'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </section>
      ) : null}

      {/* ---- Invoices List ---- */}
      <section className={styles.card} aria-labelledby="invoices-heading">
        <div className={styles.cardHead}>
          <h2 className={styles.cardTitle} id="invoices-heading">Invoices</h2>
          {due.length ? <span className={styles.muted}>{due.length} due</span> : null}
        </div>

        {loading ? (
          <div className={styles.cardPad}><p className={styles.muted}>Loading…</p></div>
        ) : invoices.length === 0 ? (
          <div className={styles.empty}>
            <Illustration name="decision" label="No invoices" className={styles.emptyArt} />
            <h3 className={styles.cardTitle}>No invoices yet</h3>
            <p className={styles.muted}>Rent and move-in charges appear here once issued.</p>
          </div>
        ) : (
          invoices.map((invoice) => (
            <div className={styles.row} key={invoice.id}>
              <span className={own.invoiceMain}>
                <span className={styles.rowLabel}>
                  {invoice.invoice_number} · {invoice.title}
                </span>
                <span className={styles.muted}>
                  Due {new Date(invoice.due_date).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric',
                  })}
                </span>
              </span>
              <span className={own.invoiceEnd}>
                <span className={`${styles.rowLabel} ${styles.figure}`}>
                  {formatUsd(invoice.balance_cents)}
                </span>
                <StatusBadge status={invoice.status} label={invoice.status_display} />
                {invoice.balance_cents > 0 && invoice.status === 'SENT' ? (
                  <Button
                    type="button"
                    variant={paying?.id === invoice.id ? 'secondary' : 'transactional'}
                    onClick={() => (paying?.id === invoice.id ? setPaying(null) : startPayment(invoice))}
                  >
                    {paying?.id === invoice.id ? 'Close' : 'Pay'}
                  </Button>
                ) : null}
                {invoice.pdf_url ? (
                  <a className={own.pdf} href={invoice.pdf_url} download>
                    Download PDF
                  </a>
                ) : null}
              </span>
            </div>
          ))
        )}
      </section>

      {/* ---- Payment History ---- */}
      <section className={styles.card} aria-labelledby="payments-heading">
        <div className={styles.cardHead}>
          <h2 className={styles.cardTitle} id="payments-heading">Payment history</h2>
        </div>

        {loading ? (
          <div className={styles.cardPad}><p className={styles.muted}>Loading…</p></div>
        ) : payments.length === 0 ? (
          <div className={styles.empty}>
            <Illustration name="decision" label="No payments" className={styles.emptyArt} />
            <h3 className={styles.cardTitle}>No payments recorded yet</h3>
            <p className={styles.muted}>Payments you make and proofs you submit appear here.</p>
          </div>
        ) : (
          payments.map((payment) => (
            <div className={styles.row} key={payment.id}>
              <span className={own.invoiceMain}>
                <span className={styles.rowLabel}>
                  {formatUsd(payment.amount_cents)} via {payment.method_display}
                </span>
                <span className={styles.muted}>
                  {new Date(payment.created_at).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric',
                  })}
                  {payment.invoice_number ? ` · ${payment.invoice_number}` : ''}
                  {payment.reference_id ? ` · Ref: ${payment.reference_id}` : ''}
                </span>
                {payment.rejection_reason ? (
                  <span className={own.rejected}>{payment.rejection_reason}</span>
                ) : null}
              </span>
              <StatusBadge status={payment.status} label={payment.status_display} />
            </div>
          ))
        )}
      </section>
    </div>
  );
}
