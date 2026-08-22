import Link from 'next/link';
import { COMPANY, FOOTER_NAV } from '@/lib/navigation';
import { Pending } from '@/components/ui/Pending';
import { Container } from './Container';
import styles from './SiteFooter.module.css';
import Image from 'next/image';

/**
 * Site footer.
 *
 * Load-bearing on every page, not just the home page. Flow 2 in the IA - the
 * renter checking whether this is a scam - typically arrives on a property
 * page from an external link and never sees the home page at all. The licence
 * numbers, physical address, and named contact routes are the proof they came
 * looking for, so the full footer renders everywhere rather than a reduced
 * variant on interior routes.
 */
export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <Container width="page" className={styles.inner}>
        <div className={styles.newsletterRow}>
          <div className={styles.newsletterInfo}>
            <h2 className={styles.newsletterTitle}>Get Rental Alerts &amp; Price Drops</h2>
            <p className={styles.newsletterLead}>
              Be the first to know when new single-family homes and voucher-approved listings are published.
            </p>
          </div>
          <form className={styles.newsletterForm} action="/alerts" method="get">
            {/* A visible label, not an aria-label over a placeholder. The
                placeholder was carrying the field's meaning and disappeared the
                moment anyone typed, which the brief rules out; `aria-label`
                also left the field unlabelled for everyone not using a screen
                reader. `name` was missing too, so the GET never carried the
                address to /alerts. */}
            <label className={styles.newsletterLabel} htmlFor="footer-alerts-email">
              Email address
            </label>
            <input
              id="footer-alerts-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              className={styles.newsletterInput}
              required
            />
            <button type="submit" className={styles.newsletterButton}>
              Subscribe
            </button>
          </form>
        </div>

        <nav className={styles.nav} aria-label="Footer">
          {FOOTER_NAV.map((group) => (
            <div key={group.label} className={styles.column}>
              <h2 className={styles.columnTitle}>{group.label}</h2>
              <ul className={styles.columnList} role="list">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link className={styles.columnLink} href={link.href}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className={styles.company}>
          <div className={styles.companyBlock}>
            <h2 className={styles.columnTitle}>{COMPANY.legalName}</h2>
            <address className={styles.address}>
              {COMPANY.addressLines ? (
                COMPANY.addressLines.map((line) => <span key={line}>{line}</span>)
              ) : (
                <Pending>physical business address</Pending>
              )}
              {/* Every number, not just the first. The business answers on
                  three, and a renter checking whether a call they received was
                  really us needs to find the one that rang them. */}
              {COMPANY.phones ? (
                COMPANY.phones.map((phone) => (
                  <a
                    key={phone}
                    className={styles.figureLink}
                    href={`tel:${phone.replace(/[^\d+]/g, '')}`}
                  >
                    {phone}
                  </a>
                ))
              ) : (
                <Pending>phone number</Pending>
              )}
              {COMPANY.email ? (
                <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>
              ) : (
                <Pending>contact email</Pending>
              )}
            </address>
          </div>

          <div className={styles.companyBlock}>
            <h2 className={styles.columnTitle}>Licensing</h2>
            {COMPANY.licences ? (
              /* The named broker, not just the number. A licence number alone
                 cannot be checked against a state register without knowing
                 whose licence it is, and being checkable is the entire point
                 of publishing it. */
              <ul className={styles.licenceList} role="list">
                {COMPANY.licences.map((licence) => (
                  <li key={licence.state} className={styles.licence}>
                    <span className={styles.licenceState}>{licence.stateName}</span>
                    <span className={styles.licenceBroker}>{licence.broker}</span>
                    <span className={styles.figure}>{licence.licenceNumber}</span>
                    {licence.additional?.map((extra) => (
                      <span key={extra.number} className={styles.licenceExtra}>
                        {extra.label} <span className={styles.figure}>{extra.number}</span>
                      </span>
                    ))}
                  </li>
                ))}
              </ul>
            ) : (
              /* Nationwide operation means this is never a single licence -
                 one entry per state in which homes are leased. */
              <p className={styles.licencePending}>
                <Pending>brokerage licence number and jurisdiction, per state</Pending>
              </p>
            )}
          </div>
        </div>

        <div className={styles.legal}>
          <div className={styles.eho}>
            {/* The official Equal Housing Opportunity mark is a specific HUD artwork and must be the real asset, not a lookalike redrawn from memory. Text statement ships now; the logo slot is reserved and flagged. */}
            <p className={styles.ehoText}>Equal Housing Opportunity</p>
            <p className={styles.ehoStatement}>
              We are committed to compliance with all federal, state, and local fair
              housing laws. We do not discriminate against any person because of race,
              colour, religion, sex, familial status, national origin, disability, or any
              other protected class.
            </p>
          </div>

          <div className={styles.legalBottom}>
            <div className={styles.authorityLogos}>
              <Image src="/equal-housing-logowhite-500.png" alt="Equal Housing Opportunity logo" width={60} height={60} className={styles.authorityLogo} />
              <Image src="/nar_membershipmark_white.png" alt="NAR Membership Mark" width={60} height={60} className={styles.authorityLogo} />
              <Image src="/nar-logo-2020-footer.svg" alt="NAR Logo" width={120} height={35} className={styles.authorityLogoWide} />
            </div>
            <p className={styles.copyright}>
              <span className={styles.figure}>©&nbsp;{new Date().getFullYear()}</span>{' '}
              {COMPANY.legalName}. All rights reserved.
            </p>
          </div>
        </div>
      </Container>
    </footer>
  );
}
