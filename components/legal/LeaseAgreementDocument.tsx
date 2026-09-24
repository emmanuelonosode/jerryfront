import type { LeasePayload } from '@/lib/lease/types';
import styles from './LeaseAgreementDocument.module.css';

/**
 * The lease, laid out.
 *
 * Every word comes from the API: the clauses are written on the server so the
 * snapshot hashed at signing holds the exact text the tenant read. This
 * component adds headings, numbering and the signature block, nothing else.
 * "TO CONFIRM" in the text marks a value staff have not filled in yet; the
 * lease cannot be signed while any remain.
 */
export function LeaseAgreementDocument({ lease }: { lease: LeasePayload }) {
  const { terms, signing } = lease;
  return (
    <article className={styles.document} aria-label="Residential lease">
      <header className={styles.header}>
        <p className={styles.eyebrow}>{terms.premises.state_name ? `${terms.premises.state_name} residential lease` : 'Residential lease'}</p>
        <h1 className={styles.title}>Residential Lease</h1>
        <p className={styles.meta}>
          {terms.premises.address || 'Address to confirm'}
          {terms.term.start ? ` · ${terms.term.start} to ${terms.term.end}` : ''}
        </p>
        <p className={styles.version}>Lease version {terms.version}</p>
      </header>

      {terms.missing.length > 0 ? (
        <div className={styles.pending} role="note">
          <strong>This lease is still being prepared.</strong> Before it can be signed we need to add:{' '}
          {terms.missing.join('; ')}.
        </div>
      ) : null}

      {terms.sections.map((section) => (
        <section key={section.number} className={styles.section} aria-labelledby={`lease-s${section.number}`}>
          <h2 className={styles.heading} id={`lease-s${section.number}`}>
            <span className={styles.number}>{section.number}.</span> {section.heading}
          </h2>
          {section.paragraphs.map((p, i) => (
            <p key={i} className={p.strong ? styles.strong : styles.paragraph}>
              {p.text}
            </p>
          ))}
        </section>
      ))}

      <section className={styles.signatures} aria-label="Signatures">
        <div className={styles.signatureBlock}>
          <p className={styles.signatureRole}>Tenant</p>
          {signing.is_signed && signing.signature_url ? (
            // A data URL of the tenant's own drawn signature; nothing to optimise.
            // eslint-disable-next-line @next/next/no-img-element
            <img className={styles.signatureImage} src={signing.signature_url} alt={`Signature of ${signing.signer_name ?? 'tenant'}`} />
          ) : (
            <div className={styles.signatureLine} />
          )}
          <p className={styles.signatureName}>{signing.signer_name ?? terms.tenant.name}</p>
          <p className={styles.signatureDate}>{signing.signed_at ? `Signed ${signing.signed_at}` : 'Not yet signed'}</p>
        </div>

        <div className={styles.signatureBlock}>
          <p className={styles.signatureRole}>
            Landlord: {terms.landlord.owner || 'owner to confirm'}, by {terms.agent.name}, managing agent
          </p>
          <div className={styles.signatureLine} />
          <p className={styles.signatureName}>{signing.countersigned_by ?? 'Awaiting countersignature'}</p>
          <p className={styles.signatureDate}>{signing.countersigned_at ? `Signed ${signing.countersigned_at}` : ''}</p>
        </div>

        {terms.guarantor ? (
          <div className={styles.signatureBlock}>
            <p className={styles.signatureRole}>Guarantor (separate guaranty)</p>
            <div className={styles.signatureLine} />
            <p className={styles.signatureName}>{terms.guarantor.name}</p>
          </div>
        ) : null}
      </section>
    </article>
  );
}
