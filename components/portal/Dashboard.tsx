'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Illustration } from '@/components/brand/Illustration';
import { apiFetch, type PortalUser } from '@/lib/portal/api';
import { formatUsd } from '@/lib/money';
import { StatusBadge } from './StatusBadge';
import styles from './Dashboard.module.css';

type MoveInLine = { description: string; quantity: number; unit_price_cents: number };

type Application = {
  id: string;
  status: string;
  status_display: string;
  move_in_date: string | null;
  property: {
    full_address: string;
    bedrooms: number;
    bathrooms: number;
    sqft: number;
    primary_image_url: string | null;
    price_cents: number;
  } | null;
  move_in: { line_items: MoveInLine[]; total_cents: number } | null;
  assigned_agent: { name: string; email: string; phone: string } | null;
};

type Invoice = {
  id: string;
  invoice_number: string;
  title: string;
  due_date: string;
  balance_cents: number;
  status: string;
  status_display: string;
};

type Ticket = {
  id: string;
  title: string;
  status: string;
  status_display: string;
  category_display: string;
  created_at: string;
};

/** Statuses that mean an agent has said yes and money is now due. */
const APPROVED_STATUSES = new Set(['APPROVED', 'APPROVED_WITH_CONDITIONS']);

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/** "2 hours ago". Coarse on purpose - nobody needs "2 hours, 14 minutes ago". */
function timeAgo(iso: string): string {
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  const units: [number, Intl.RelativeTimeFormatUnit][] = [
    [60, 'second'], [3600, 'minute'], [86400, 'hour'], [604800, 'day'], [2629800, 'week'],
  ];
  const format = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  let previous = 1;
  for (const [limit, unit] of units) {
    if (seconds < limit) return format.format(-Math.round(seconds / previous), unit);
    previous = limit;
  }
  return format.format(-Math.round(seconds / 2629800), 'month');
}

export function Dashboard() {
  const [user, setUser] = useState<PortalUser | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // allSettled, not all: one failing widget must not blank the other three.
    // A resident whose maintenance list errors should still see their rent.
    Promise.allSettled([
      apiFetch<PortalUser>('/auth/me/'),
      apiFetch<Application[]>('/leads/apply/my-applications/'),
      apiFetch<Invoice[]>('/billing/my-invoices/'),
      apiFetch<Ticket[]>('/portal/maintenance/'),
    ]).then(([me, apps, inv, maint]) => {
      if (cancelled) return;
      if (me.status === 'fulfilled') setUser(me.value);
      if (apps.status === 'fulfilled') setApplications(apps.value);
      if (inv.status === 'fulfilled') setInvoices(inv.value);
      if (maint.status === 'fulfilled') setTickets(maint.value);
      setFailed([me, apps, inv, maint].every((r) => r.status === 'rejected'));
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, []);

  if (loading) return <p className={styles.muted}>Loading your dashboard…</p>;

  if (failed) {
    return (
      <p className={styles.error} role="alert">
        We could not load your dashboard just now. Refresh the page, or contact us if it keeps
        happening.
      </p>
    );
  }

  const application = applications[0] ?? null;
  const nextDue = invoices.find((i) => i.status === 'SENT' && i.balance_cents > 0) ?? null;
  const recent = tickets.slice(0, 3);
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.greeting}>
            {greeting()}
            {user?.first_name ? `, ${user.first_name}` : ''}
          </h1>
          <p className={styles.lead}>Welcome to your resident dashboard.</p>
        </div>
        <p className={styles.date}>{today}</p>
      </header>

      {application ? (
        <section className={styles.card} aria-labelledby="application-heading">
          <div className={styles.cardHead}>
            <h2 className={styles.cardTitle} id="application-heading">
              Your application
            </h2>
            <StatusBadge status={application.status} label={application.status_display} />
          </div>

          {application.property ? (
            <div className={styles.propertyRow}>
              {application.property.primary_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  className={styles.propertyPhoto}
                  src={application.property.primary_image_url}
                  alt=""
                  width={160}
                  height={90}
                />
              ) : (
                <div className={styles.propertyPhotoEmpty} aria-hidden="true" />
              )}
              <div className={styles.propertyText}>
                <p className={styles.propertyAddress}>{application.property.full_address}</p>
                <p className={styles.propertySpecs}>
                  {application.property.bedrooms} bed · {application.property.bathrooms} bath ·{' '}
                  {application.property.sqft.toLocaleString()} sqft
                </p>
                {application.move_in_date ? (
                  <p className={styles.propertySpecs}>
                    Target move-in {new Date(application.move_in_date).toLocaleDateString('en-US', {
                      month: 'long', day: 'numeric', year: 'numeric',
                    })}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          {application.assigned_agent ? (
            <div className={styles.agentRow}>
              <span className={styles.rowLabel}>Your contact</span>
              <span className={styles.rowValue}>
                {application.assigned_agent.name} ·{' '}
                <a href={`mailto:${application.assigned_agent.email}`}>
                  {application.assigned_agent.email}
                </a>
              </span>
            </div>
          ) : null}

          {/* Shown once approved, not before.
              Before a decision this is an estimate, and putting a total in
              front of someone who has not been approved reads as a bill -
              people have paid against figures like it. After approval it is the
              actual invoice, and the button below goes to the real one. */}
          {application.move_in && APPROVED_STATUSES.has(application.status) ? (
            <div className={styles.breakdown}>
              <h3 className={styles.breakdownTitle}>What is due before you move in</h3>
              <dl className={styles.breakdownList}>
                {application.move_in.line_items.map((line) => (
                  <div className={styles.breakdownRow} key={line.description}>
                    <dt>{line.description}</dt>
                    <dd className={styles.figure}>
                      {formatUsd(line.unit_price_cents * line.quantity)}
                    </dd>
                  </div>
                ))}
                <div className={`${styles.breakdownRow} ${styles.breakdownTotal}`}>
                  <dt>Total</dt>
                  <dd className={styles.figure}>{formatUsd(application.move_in.total_cents)}</dd>
                </div>
              </dl>
              <p className={styles.muted}>
                Pay this, then we book you in to sign the lease and collect the keys. You can
                upload your receipt after paying so we can match it quickly.
              </p>
              <Link className={styles.cardAction} href="/portal/payments">
                Pay move-in costs
              </Link>
            </div>
          ) : null}
        </section>
      ) : (
        <section className={styles.empty}>
          <Illustration name="apply" label="No application yet" className={styles.emptyArt} />
          <h2 className={styles.cardTitle}>No application yet</h2>
          <p className={styles.lead}>
            Once you apply for a home, its status and move-in costs appear here.
          </p>
          <Link className={styles.cardAction} href="/homes-for-rent">
            Browse homes
          </Link>
        </section>
      )}

      <div className={styles.grid}>
        <section className={styles.card} aria-labelledby="rent-heading">
          <h2 className={styles.cardTitle} id="rent-heading">
            Next payment due
          </h2>
          {nextDue ? (
            <>
              <p className={styles.amount}>{formatUsd(nextDue.balance_cents)}</p>
              <p className={styles.muted}>
                {nextDue.title} · due{' '}
                {new Date(nextDue.due_date).toLocaleDateString('en-US', {
                  month: 'long', day: 'numeric', year: 'numeric',
                })}
              </p>
              <Link className={styles.cardAction} href="/portal/payments">
                Make a payment
              </Link>
            </>
          ) : (
            <p className={styles.muted}>Nothing is due right now.</p>
          )}
        </section>

        <section className={styles.card} aria-labelledby="maintenance-heading">
          <h2 className={styles.cardTitle} id="maintenance-heading">
            Recent maintenance
          </h2>
          {recent.length ? (
            <ul className={styles.ticketList} role="list">
              {recent.map((ticket) => (
                <li className={styles.ticket} key={ticket.id}>
                  <span className={styles.ticketTitle}>{ticket.title}</span>
                  <span className={styles.ticketMeta}>
                    <StatusBadge status={ticket.status} label={ticket.status_display} />
                    <span className={styles.muted}>{timeAgo(ticket.created_at)}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.muted}>No maintenance requests yet.</p>
          )}
          <Link className={styles.cardAction} href="/portal/maintenance">
            New maintenance request
          </Link>
        </section>
      </div>
    </div>
  );
}
