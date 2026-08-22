import Link from 'next/link';
import type { ReactNode } from 'react';
import { Container } from '@/components/layout/Container';
import { ButtonLink } from '@/components/ui/Button';
import styles from './content.module.css';

/**
 * Shared furniture for the eight trust-spine pages.
 *
 * These pages are the acquisition engine - qualifications, fees, process, and
 * the three differentiator pages will out-earn every listing page in traffic,
 * because listing pages are noindexed by design. They share a shape so the
 * reader learns it once.
 */

export function PageHeader({
  eyebrow,
  title,
  lead,
  children,
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
  children?: ReactNode;
}) {
  return (
    <header className={styles.header}>
      {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
      <h1 className={styles.title}>{title}</h1>
      {lead ? <p className={styles.lead}>{lead}</p> : null}
      {children}
    </header>
  );
}

export function ContentSection({
  id,
  title,
  intro,
  children,
}: {
  id: string;
  title: string;
  intro?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={styles.section} aria-labelledby={`${id}-heading`}>
      <h2 className={styles.sectionTitle} id={`${id}-heading`}>
        {title}
      </h2>
      {intro ? <div className={styles.sectionIntro}>{intro}</div> : null}
      {children}
    </section>
  );
}

/**
 * FAQ, built on native `<details>`.
 *
 * Works with JavaScript unavailable, gets correct expand/collapse semantics
 * for free, and is deep-linkable. Same reasoning as the price breakdown.
 */
export function Faq({ items }: { items: { question: string; answer: ReactNode }[] }) {
  return (
    <div className={styles.faq}>
      {items.map((item) => (
        <details key={item.question} className={styles.faqItem}>
          <summary className={styles.faqSummary}>{item.question}</summary>
          <div className={styles.faqAnswer}>{item.answer}</div>
        </details>
      ))}
    </div>
  );
}

/**
 * Section-level conversion prompt.
 *
 * Apply is the primary action on every page except `/property-management`,
 * which is owner-facing.
 */
export function CtaBand({
  title,
  body,
  primaryHref = '/apply',
  primaryLabel = 'Start an application',
  secondaryHref,
  secondaryLabel,
}: {
  title: string;
  body: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  return (
    <div className={styles.cta}>
      <div className={styles.ctaText}>
        <h2 className={styles.ctaTitle}>{title}</h2>
        <p className={styles.ctaBody}>{body}</p>
      </div>
      <div className={styles.ctaActions}>
        <ButtonLink href={primaryHref}>{primaryLabel}</ButtonLink>
        {secondaryHref && secondaryLabel ? (
          <ButtonLink href={secondaryHref} variant="secondary">
            {secondaryLabel}
          </ButtonLink>
        ) : null}
      </div>
    </div>
  );
}

const QUALIFY_PAGES = [
  { href: '/qualifications', label: 'Screening criteria' },
  { href: '/housing-vouchers', label: 'Housing vouchers' },
  { href: '/second-chance-leasing', label: 'Past eviction or credit' },
  { href: '/self-employed-renters', label: 'Self-employed income' },
];

/**
 * Sub-navigation across the four qualification pages.
 *
 * These audiences overlap heavily - a voucher holder often also has thin
 * credit, and a self-employed applicant often has both. Someone who lands on
 * one of these pages needs to know the others exist.
 */
export function QualifySubNav({ current }: { current: string }) {
  return (
    <nav className={styles.subNav} aria-label="Qualification pages">
      <ul className={styles.subNavList} role="list">
        {QUALIFY_PAGES.map((page) => {
          const isCurrent = page.href === current;
          return (
            <li key={page.href}>
              <Link
                className={[styles.subNavLink, isCurrent ? styles.subNavCurrent : '']
                  .filter(Boolean)
                  .join(' ')}
                href={page.href}
                aria-current={isCurrent ? 'page' : undefined}
              >
                {page.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Standard page shell: container + vertical rhythm. */
export function ContentLayout({
  width = 'content',
  children,
}: {
  width?: 'content' | 'wide' | 'prose';
  children: ReactNode;
}) {
  return (
    <main id="main" className={styles.main}>
      <Container width={width}>{children}</Container>
    </main>
  );
}
