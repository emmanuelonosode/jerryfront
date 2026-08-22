import type { Metadata } from 'next';
import { ContentLayout, ContentSection, CtaBand, PageHeader } from '@/components/content/ContentPage';
import { Pending } from '@/components/ui/Pending';
import { TEAM } from '@/lib/content/team';
import styles from './team.module.css';

export const metadata: Metadata = {
  title: 'Our team',
  description:
    'The people who review applications here, with names, roles, markets, and direct contact details.',
  alternates: { canonical: '/team' },
};

export default function TeamPage() {
  return (
    <ContentLayout>
      <PageHeader
        eyebrow="Real people"
        title="The people who read your application"
        lead="Someone here makes the decision on your application, and you can contact them directly. That is the whole difference between this company and an automated screening queue."
      />

      {TEAM.length === 0 ? (
        <ContentSection
          id="pending"
          title="This page is waiting on real people"
          intro={
            <>
              <p>
                The structure is built. It is deliberately empty rather than populated with
                plausible-looking colleagues.
              </p>
              <p>
                This is the page whose entire job is being verifiable, on a site whose
                audience has been primed by a category full of fraud to check exactly this.
                Invented staff here would do more damage than an unfinished page.
              </p>
            </>
          }
        >
          <Pending block>
            team roster - name, role, markets covered, direct email and phone, photograph
          </Pending>
          <p className={styles.requirement}>
            Photographs must be of the actual people. Section 4 of the brief rules out
            stock photography, and a renter checking whether this company is real will
            reverse-image-search a stock headshot faster than any competitor could.
          </p>
        </ContentSection>
      ) : (
        <ContentSection id="team" title="Who you will be dealing with">
          <ul className={styles.grid} role="list">
            {TEAM.map((member) => (
              <li key={member.id} className={styles.card}>
                {member.photoUrl ? (
                  <div className={styles.avatarWrap}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={member.photoUrl}
                      alt={`${member.name}, ${member.role}`}
                      className={styles.avatar}
                    />
                  </div>
                ) : null}
                <div className={styles.cardBody}>
                  <p className={styles.name}>{member.name}</p>
                  <p className={styles.role}>{member.role}</p>
                  <p className={styles.markets}>{member.markets.join(' · ')}</p>
                  {member.note ? <p className={styles.note}>{member.note}</p> : null}
                  <div className={styles.contact}>
                    {member.email ? (
                      <a href={`mailto:${member.email}`} className={styles.contactLink}>
                        {member.email}
                      </a>
                    ) : null}
                    {member.phone ? (
                      <a className={styles.figure} href={`tel:${member.phone.replace(/[^\d+]/g, '')}`}>
                        {member.phone}
                      </a>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </ContentSection>
      )}

      <CtaBand
        title="Rather talk to someone first?"
        body="You do not have to apply to ask a question. Nobody here works on commission for getting you into an application."
        primaryHref="/contact"
        primaryLabel="Contact us"
        secondaryHref="/qualifications"
        secondaryLabel="Read the criteria"
      />
    </ContentLayout>
  );
}
