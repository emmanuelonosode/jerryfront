'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Illustration } from '@/components/brand/Illustration';
import { formatUsd } from '@/lib/money';
import { ApiError, apiFetch, type PortalUser } from '@/lib/portal/api';
import { StatusBadge } from './StatusBadge';
import styles from './portal.module.css';
import own from './Profile.module.css';

type Favourite = {
  id: string;
  created_at: string;
  property: {
    slug: string;
    title: string;
    full_address: string;
    bedrooms: number;
    bathrooms: number;
    sqft: number;
    price_cents: number;
    primary_image_url: string | null;
  };
};

type Application = {
  id: string;
  status: string;
  status_display: string;
  move_in_date: string | null;
  is_fee_paid: boolean;
  property: { full_address: string; price_cents: number } | null;
  assigned_agent: { name: string; email: string; phone: string } | null;
};

export function Profile() {
  const [user, setUser] = useState<PortalUser | null>(null);
  const [favourites, setFavourites] = useState<Favourite[]>([]);
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([
      apiFetch<PortalUser>('/auth/me/'),
      apiFetch<Favourite[]>('/properties/favorites/'),
      apiFetch<Application[]>('/leads/apply/my-applications/'),
    ]).then(([me, favs, apps]) => {
      if (cancelled) return;
      if (me.status === 'fulfilled') setUser(me.value);
      if (favs.status === 'fulfilled') setFavourites(favs.value);
      if (apps.status === 'fulfilled') setApplication(apps.value[0] ?? null);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  async function removeFavourite(id: string) {
    setRemoving(id);
    setError(null);
    try {
      await apiFetch(`/properties/favorites/${id}/`, { method: 'DELETE' });
      setFavourites((rows) => rows.filter((row) => row.id !== id));
    } catch (err) {
      setError(
        err instanceof ApiError
          ? (err.userMessage ?? 'We could not remove that home.')
          : 'We could not reach the server.',
      );
    } finally {
      setRemoving(null);
    }
  }

  const initials = user
    ? `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase()
    : '';

  /**
   * Move-in checklist.
   *
   * Derived from real state, never hard-coded ticks. A checklist that shows
   * "deposit paid" because the markup says so is worse than no checklist -
   * it tells someone they have done something they have not.
   */
  const checklist = [
    { label: 'Application submitted', done: Boolean(application) },
    {
      label: 'Application approved',
      done: application?.status === 'APPROVED' || application?.status === 'APPROVED_WITH_CONDITIONS',
    },
    { label: 'Application fee paid', done: Boolean(application?.is_fee_paid) },
    { label: 'Move-in date agreed', done: Boolean(application?.move_in_date) },
  ];

  if (loading) return <p className={styles.muted}>Loading your profile…</p>;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Profile</h1>
          <p className={styles.lead}>Your details, your home, and the homes you saved.</p>
        </div>
      </header>

      {error ? <p className={styles.error} role="alert">{error}</p> : null}

      <section className={styles.card}>
        <div className={own.hero}>
          <span className={own.avatar} aria-hidden="true">{initials || '-'}</span>
          <div>
            <p className={own.name}>{user?.full_name ?? '-'}</p>
            <p className={styles.muted}>{user?.email}</p>
            {user?.phone ? <p className={styles.muted}>{user.phone}</p> : null}
          </div>
        </div>
        <div className={styles.row}>
          <span className={styles.rowLabel}>Email verified</span>
          <span className={styles.rowValue}>{user?.is_email_verified ? 'Yes' : 'Not yet'}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.rowLabel}>Account type</span>
          <span className={styles.rowValue}>{user?.role.toLowerCase()}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.rowLabel}>Change your details</span>
          <span className={styles.rowValue}><Link href="/portal/settings">Account settings</Link></span>
        </div>
      </section>

      {application ? (
        <section className={styles.card} aria-labelledby="home-heading">
          <div className={styles.cardHead}>
            <h2 className={styles.cardTitle} id="home-heading">Your home</h2>
            <StatusBadge status={application.status} label={application.status_display} />
          </div>
          {application.property ? (
            <>
              <div className={styles.row}>
                <span className={styles.rowLabel}>Address</span>
                <span className={styles.rowValue}>{application.property.full_address}</span>
              </div>
              <div className={styles.row}>
                <span className={styles.rowLabel}>Monthly rent</span>
                <span className={`${styles.rowValue} ${styles.figure}`}>
                  {formatUsd(application.property.price_cents)}
                </span>
              </div>
            </>
          ) : null}
          {application.move_in_date ? (
            <div className={styles.row}>
              <span className={styles.rowLabel}>Move-in</span>
              <span className={styles.rowValue}>
                {new Date(application.move_in_date).toLocaleDateString('en-US', {
                  month: 'long', day: 'numeric', year: 'numeric',
                })}
              </span>
            </div>
          ) : null}
          {application.assigned_agent ? (
            <div className={styles.row}>
              <span className={styles.rowLabel}>Your contact</span>
              <span className={styles.rowValue}>
                {application.assigned_agent.name} ·{' '}
                <a href={`mailto:${application.assigned_agent.email}`}>
                  {application.assigned_agent.email}
                </a>
              </span>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className={styles.card} aria-labelledby="checklist-heading">
        <div className={styles.cardHead}>
          <h2 className={styles.cardTitle} id="checklist-heading">Move-in checklist</h2>
        </div>
        {checklist.map((item) => (
          <div className={styles.row} key={item.label}>
            <span className={styles.rowLabel}>
              <span className={item.done ? own.tickDone : own.tick} aria-hidden="true">
                {item.done ? '✓' : ''}
              </span>
              {item.label}
            </span>
            <span className={styles.rowValue}>{item.done ? 'Done' : 'Not yet'}</span>
          </div>
        ))}
      </section>

      <section className={styles.card} aria-labelledby="saved-heading">
        <div className={styles.cardHead}>
          <h2 className={styles.cardTitle} id="saved-heading">Saved homes</h2>
        </div>
        {favourites.length === 0 ? (
          <div className={styles.empty}>
            <Illustration name="emptySaved" label="No saved homes" className={styles.emptyArt} />
            <p className={styles.muted}>
              Homes you save while browsing show up here.
            </p>
            <Link href="/homes-for-rent">Browse homes</Link>
          </div>
        ) : (
          favourites.map((fav) => (
            <div className={styles.row} key={fav.id}>
              <span className={own.savedMain}>
                <Link href={`/homes-for-rent/${fav.property.slug}`} className={styles.rowLabel}>
                  {fav.property.full_address}
                </Link>
                <span className={styles.muted}>
                  {fav.property.bedrooms} bed · {fav.property.bathrooms} bath ·{' '}
                  <span className={styles.figure}>{formatUsd(fav.property.price_cents)}</span>
                </span>
              </span>
              <button
                type="button"
                className={own.remove}
                onClick={() => removeFavourite(fav.id)}
                disabled={removing === fav.id}
              >
                {removing === fav.id ? 'Removing…' : 'Remove'}
              </button>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
