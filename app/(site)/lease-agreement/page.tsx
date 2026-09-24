import type { Metadata } from 'next';
import Link from 'next/link';
import { Container } from '@/components/layout/Container';
import { ButtonLink } from '@/components/ui/Button';
import styles from './lease.module.css';

export const metadata: Metadata = {
  title: 'Our residential lease',
  description:
    'What our residential lease says: rent that matches the listing, a small late fee after a grace period, repairs handled by us, 48 hours notice before entry, and state-specific protections.',
  alternates: { canonical: '/lease-agreement' },
};

/**
 * What the lease says, in plain words - and where to sign yours.
 *
 * NO PERSONAL DATA ON THIS PAGE. It used to fetch "the latest lease" with no
 * login and display whoever had applied most recently: their name, email,
 * address and signature, to anyone who opened the URL. A tenant's own lease
 * is in the portal, behind their sign-in.
 */
export default function LeaseAgreementPage() {
  return (
    <main id="main" className={styles.page}>
      <Container width="content">
        <header className={styles.header}>
          <h1 className={styles.title}>Our residential lease</h1>
          <p className={styles.lead}>
            When your application is approved we prepare your lease for your home and state, and you
            read and sign it in your resident portal. Here is what it says, in plain words.
          </p>
          <div className={styles.actions}>
            <ButtonLink href="/portal/lease">Sign in to see your lease</ButtonLink>
          </div>
        </header>

        <dl className={styles.points}>
          <div className={styles.point}>
            <dt>Rent</dt>
            <dd>The monthly total on the listing - base rent plus any required monthly charges, itemised. Nothing else is added.</dd>
          </div>
          <div className={styles.point}>
            <dt>Late fee</dt>
            <dd>Only if rent is more than 5 days late (7 in Colorado): the lesser of $50 or 5% of the rent, once a month, never more than your state allows.</dd>
          </div>
          <div className={styles.point}>
            <dt>Deposit</dt>
            <dd>Returned within 14 days of move-out with an itemised statement. Never used for normal wear and tear or damage that was there before you moved in.</dd>
          </div>
          <div className={styles.point}>
            <dt>Utilities</dt>
            <dd>You pay electricity. We pay water, sewer, trash and any gas.</dd>
          </div>
          <div className={styles.point}>
            <dt>Repairs</dt>
            <dd>We handle upkeep and repairs. You report problems in your portal and pay only for damage beyond normal wear caused by your household.</dd>
          </div>
          <div className={styles.point}>
            <dt>Entry</dt>
            <dd>At least 48 hours&apos; written notice, between 8am and 8pm, except in an emergency.</dd>
          </div>
          <div className={styles.point}>
            <dt>Animals</dt>
            <dd>Pets as approved. Assistance animals are not pets: no pet fee, pet rent or deposit, ever.</dd>
          </div>
          <div className={styles.point}>
            <dt>Moving out early</dt>
            <dd>30 days&apos; notice; rent stops when a new tenant starts paying. Military, family-violence and other legal early-termination rights are always honoured.</dd>
          </div>
          <div className={styles.point}>
            <dt>Your state</dt>
            <dd>Each lease carries the notices and protections its state requires, and state law wins wherever it is more protective.</dd>
          </div>
        </dl>

        <p className={styles.lead}>
          Questions before you apply? <Link href="/contact">Talk to a person</Link>. See also{' '}
          <Link href="/fees">every fee we charge</Link>.
        </p>
      </Container>
    </main>
  );
}
