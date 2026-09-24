import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Container } from '@/components/layout/Container';
import { IdUpload } from './IdUpload';
import styles from './tourId.module.css';

/**
 * Where a caller who booked a self-guided tour by phone sends their ID.
 *
 * The phone agent cannot take a photo, so the booking email carries this
 * link. The id in the URL is the tour's unguessable public id - the only
 * capability that lets anyone attach a document to that one booking - so the
 * page is noindex and no-referrer (see next.config.ts), and it shows nothing
 * about the booking itself: whoever holds the link can add an ID, not read one.
 */
export const metadata: Metadata = {
  title: 'Upload your ID for your tour',
  robots: { index: false, follow: false },
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function TourIdPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  return (
    <main id="main" className={styles.page}>
      <Container width="content">
        <header className={styles.header}>
          <h1 className={styles.title}>One last step before your tour</h1>
          <p className={styles.lead}>
            Upload a photo of your government ID. Once we have checked it, we send you the code
            for the door. Your ID is stored privately and deleted automatically after it has been
            checked.
          </p>
        </header>
        <IdUpload tourId={id} />
      </Container>
    </main>
  );
}
