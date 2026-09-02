'use client';

import { useEffect, useState } from 'react';
import { Illustration } from '@/components/brand/Illustration';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import controls from '@/components/ui/controls.module.css';
import { formatUsd } from '@/lib/money';
import { ApiError, apiFetch } from '@/lib/portal/api';
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

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={own.copy}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          // Clipboard access can be refused; the value is on screen either way,
          // so this fails quietly rather than throwing an error at someone
          // halfway through paying their rent.
        }
      }}
      aria-label={`Copy ${label}`}
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
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
  const [reference, setReference] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  // Bumped from event handlers to re-run the fetch below. The fetch lives in
  // the effect and only touches state in its continuation: calling a
  // setState-bearing helper from an effect body cascades renders.
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
      // Only a total failure is worth an error banner; one dead widget should
      // not hide the three that loaded.
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
    setReference('');
    setProofUrl('');
    setAmount((invoice.balance_cents / 100).toFixed(2));
    setFormError(null);
  }

  async function submitProof(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!paying || !chosen) return;

    const cents = Math.round(Number(amount) * 100);
    if (!Number.isFinite(cents) || cents <= 0) {
      setFormError('Enter the amount you sent.');
      return;
    }

    setBusy(true);
    setFormError(null);
    try {
      await apiFetch('/billing/my-payments/submit-proof/', {
        method: 'POST',
        body: {
          invoice: paying.id,
          amount_cents: cents,
          payment_method: chosen.method,
          reference_id: reference,
          proof_image_url: proofUrl,
        },
      });
      setPaying(null);
      setConfirmation(
        'Thanks - we have recorded that. Staff check payments against the bank before marking ' +
          'an invoice paid, so the status stays "awaiting verification" until then.',
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

      {/* ---- Pay flow ---- */}
      {paying ? (
        <section className={styles.card} aria-labelledby="pay-heading">
          <div className={styles.cardHead}>
            <h2 className={styles.cardTitle} id="pay-heading">
              Pay {paying.invoice_number} · {formatUsd(paying.balance_cents)}
            </h2>
            <Button type="button" variant="secondary" onClick={() => setPaying(null)}>
              Cancel
            </Button>
          </div>

          {methods.length === 0 ? (
            <div className={styles.cardPad}>
              <p className={styles.muted}>
                No payment methods are switched on right now. Contact us and we will take it from
                there - please do not send money to any account you were given by email or text.
              </p>
            </div>
          ) : (
            <>
              <div className={own.methods}>
                {methods.map((method) => (
                  <button
                    key={method.id}
                    type="button"
                    className={chosen?.id === method.id ? own.methodActive : own.method}
                    aria-pressed={chosen?.id === method.id}
                    onClick={() => setChosen(method)}
                  >
                    <span className={own.methodName}>{method.display_name}</span>
                    {method.clearing_time ? (
                      <span className={styles.muted}>{method.clearing_time}</span>
                    ) : null}
                  </button>
                ))}
              </div>

              {chosen ? (
                <>
                  {/* Was "cannot be reversed" plus "we will never send you
                      account details by email or text" - a warning about being
                      defrauded, shown to an existing resident paying their
                      rent. The practical half survives without the alarm. */}
                  {chosen.irreversible ? (
                    <p className={own.warning} role="note">
                      {chosen.display_name} sends instantly, so it is worth a quick check of
                      the details below before you confirm.
                    </p>
                  ) : null}

                  <div className={own.details}>
                    {chosen.handle ? (
                      <div className={styles.row}>
                        <span className={styles.rowLabel}>Send to</span>
                        <span className={own.detailValue}>
                          <span className={styles.figure}>{chosen.handle}</span>
                          <CopyButton value={chosen.handle} label="handle" />
                        </span>
                      </div>
                    ) : null}
                    {chosen.recipient_name ? (
                      <div className={styles.row}>
                        <span className={styles.rowLabel}>Recipient</span>
                        <span className={styles.rowValue}>{chosen.recipient_name}</span>
                      </div>
                    ) : null}
                    {chosen.bank_name ? (
                      <div className={styles.row}>
                        <span className={styles.rowLabel}>Bank</span>
                        <span className={styles.rowValue}>
                          {chosen.bank_name}
                          {chosen.account_type ? ` · ${chosen.account_type}` : ''}
                        </span>
                      </div>
                    ) : null}
                    {chosen.account_number ? (
                      <div className={styles.row}>
                        <span className={styles.rowLabel}>Account number</span>
                        <span className={own.detailValue}>
                          <span className={styles.figure}>{chosen.account_number}</span>
                          <CopyButton value={chosen.account_number} label="account number" />
                        </span>
                      </div>
                    ) : null}
                    {chosen.routing_number ? (
                      <div className={styles.row}>
                        <span className={styles.rowLabel}>Routing number</span>
                        <span className={own.detailValue}>
                          <span className={styles.figure}>{chosen.routing_number}</span>
                          <CopyButton value={chosen.routing_number} label="routing number" />
                        </span>
                      </div>
                    ) : null}
                    <div className={styles.row}>
                      <span className={styles.rowLabel}>Put this in the note</span>
                      <span className={own.detailValue}>
                        <span className={styles.figure}>{paying.invoice_number}</span>
                        <CopyButton value={paying.invoice_number} label="invoice number" />
                      </span>
                    </div>
                    {chosen.extra_instructions ? (
                      <div className={styles.row}>
                        <span className={styles.rowLabel}>Also</span>
                        <span className={styles.rowValue}>{chosen.extra_instructions}</span>
                      </div>
                    ) : null}
                  </div>

                  <form className={styles.form} onSubmit={submitProof} noValidate>
                    <h3 className={styles.cardTitle}>Once you have sent it</h3>
                    <p className={styles.muted}>
                      Tell us the reference so staff can match your payment. Nothing is marked
                      paid until a person has checked it against the bank.
                    </p>

                    {formError ? (
                      <p className={styles.error} role="alert">{formError}</p>
                    ) : null}

                    <div className={styles.formGrid}>
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
                        required
                        hint="From your banking or payment app - whatever it called the transfer."
                      >
                        {(props) => (
                          <input
                            {...props}
                            className={controls.control}
                            value={reference}
                            onChange={(e) => setReference(e.target.value)}
                          />
                        )}
                      </Field>

                      <Field
                        label="Screenshot of your receipt"
                        name="proof"
                        note="Optional"
                        hint="A photo or screenshot of the confirmation. It helps us match your payment faster."
                      >
                        {(props) => (
                          <input
                            {...props}
                            className={controls.control}
                            type="url"
                            inputMode="url"
                            placeholder="Paste a link to the image"
                            value={proofUrl}
                            onChange={(e) => setProofUrl(e.target.value)}
                          />
                        )}
                      </Field>
                    </div>

                    <div className={styles.actions}>
                      <Button type="submit" variant="transactional" loading={busy} loadingLabel="Recording…">
                        I have sent this payment
                      </Button>
                    </div>
                  </form>
                </>
              ) : (
                <div className={styles.cardPad}>
                  <p className={styles.muted}>Choose how you want to pay.</p>
                </div>
              )}
            </>
          )}
        </section>
      ) : null}

      {/* ---- Invoices ---- */}
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
                  {formatUsd(invoice.balance_cents > 0 ? invoice.balance_cents : invoice.total_cents)}
                </span>
                <StatusBadge status={invoice.status} label={invoice.status_display} />
                {invoice.balance_cents > 0 && invoice.status === 'SENT' ? (
                  <Button type="button" onClick={() => startPayment(invoice)}>
                    Pay
                  </Button>
                ) : null}
                {invoice.pdf_url ? (
                  <a className={own.pdf} href={invoice.pdf_url} target="_blank" rel="noopener noreferrer">
                    PDF
                  </a>
                ) : null}
              </span>
            </div>
          ))
        )}
      </section>

      {/* ---- Payment history ---- */}
      <section className={styles.card} aria-labelledby="history-heading">
        <div className={styles.cardHead}>
          <h2 className={styles.cardTitle} id="history-heading">Payment history</h2>
        </div>

        {loading ? (
          <div className={styles.cardPad}><p className={styles.muted}>Loading…</p></div>
        ) : payments.length === 0 ? (
          <div className={styles.cardPad}>
            <p className={styles.muted}>No payments recorded yet.</p>
          </div>
        ) : (
          payments.map((payment) => (
            <div className={styles.row} key={payment.id}>
              <span className={own.invoiceMain}>
                <span className={styles.rowLabel}>
                  {formatUsd(payment.amount_cents)} · {payment.method_display}
                </span>
                <span className={styles.muted}>
                  {payment.invoice_number ? `${payment.invoice_number} · ` : ''}
                  {new Date(payment.created_at).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric',
                  })}
                  {payment.reference_id ? ` · ref ${payment.reference_id}` : ''}
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
