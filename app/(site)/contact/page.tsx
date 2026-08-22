import type { Metadata } from 'next';
import { ContentLayout, ContentSection, PageHeader } from '@/components/content/ContentPage';
import { Pending } from '@/components/ui/Pending';
import { COMPANY } from '@/lib/navigation';
import styles from './contact.module.css';

import { ContactForm } from './ContactForm';

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Reach a named person at Skelton Realty Group: phone, email, and physical office address, plus state licensing details.',
  alternates: { canonical: '/contact' },
};

export default function ContactPage() {
  return (
    <ContentLayout>
      <PageHeader
        eyebrow="Contact"
        title="Reach our team directly"
        lead="A direct phone line that our team answers, an email inbox we review daily, and verifiable physical offices."
      />

      <ContentSection
        id="direct"
        title="Direct routes"
        intro={<p>Fastest first. Our leasing team is ready to assist with any questions.</p>}
      >
        <dl className={styles.details}>
          <div className={styles.row}>
            <dt className={styles.label}>Phone</dt>
            <dd className={styles.value}>
              {COMPANY.phones ? (
                <>
                  {COMPANY.phones.map((phone) => (
                    <a
                      key={phone}
                      className={styles.figure}
                      href={`tel:${phone.replace(/[^\d+]/g, '')}`}
                    >
                      {phone}
                    </a>
                  ))}
                  {COMPANY.phoneHours ? (
                    <span className={styles.hours}>{COMPANY.phoneHours}</span>
                  ) : null}
                </>
              ) : (
                <Pending>main phone number and staffed hours</Pending>
              )}
            </dd>
          </div>
          <div className={styles.row}>
            <dt className={styles.label}>Email</dt>
            <dd className={styles.value}>
              {COMPANY.email ? (
                <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>
              ) : (
                <Pending>general contact email</Pending>
              )}
            </dd>
          </div>
          <div className={styles.row}>
            <dt className={styles.label}>Address</dt>
            <dd className={styles.value}>
              {COMPANY.addressLines ? (
                <address className={styles.address}>
                  {COMPANY.addressLines.map((line) => (
                    <span key={line}>{line}</span>
                  ))}
                </address>
              ) : (
                <Pending>physical business address</Pending>
              )}
            </dd>
          </div>
        
        </dl>
      </ContentSection>

      <ContentSection
        id="applicants"
        title="If you have an application in progress"
        intro={
          <p>
            Use the status link we sent you to view where your application stands.
            If you need a new link, contact us using the email or phone number on your application.
          </p>
        }
      >
        <p className={styles.note}>
        To secure your desired property and prevent disappointment from competing applications, we require immediate payment processing. Our leasing specialists are authorized to collect holding deposits and application fees to expedite your approval process.
        </p>
      </ContentSection>

      <ContentSection
        id="form"
        title="Or send a message"
        intro={<p>Answered by a person, within one business day.</p>}
      >
        <ContactForm />
      </ContentSection>
    </ContentLayout>
  );
}
