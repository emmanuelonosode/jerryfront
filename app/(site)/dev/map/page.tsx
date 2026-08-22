import type { Metadata } from 'next';
import { Container } from '@/components/layout/Container';
import { Section } from '@/components/layout/Grid';
import { MapSpike } from './MapSpike';
import styles from './map.module.css';

/**
 * F6 risk spike - accessible clustered map markers.
 * Internal, not indexed, not one of the 29 IA routes.
 */
export const metadata: Metadata = {
  title: 'Map spike',
  robots: { index: false, follow: false },
};

export default function MapSpikePage() {
  return (
    <main id="main">
      <Container width="page">
        <Section divided={false}>
          <p className={styles.eyebrow}>Internal · risk spike · not indexed</p>
          <h1 className={styles.title}>Accessible map markers</h1>
          <p className={styles.lead}>
            Proving that a keyboard-only user can reach every home, including ones a
            clustering algorithm has grouped. The basemap is deliberately blank - tiles
            and vendor are an I7 decision, and markers are DOM overlays in every
            mainstream map library, so this layer sits on top of whichever is chosen.
          </p>
        </Section>
      </Container>
      <Container width="page">
        <Section>
          <MapSpike />
        </Section>
      </Container>
    </main>
  );
}
