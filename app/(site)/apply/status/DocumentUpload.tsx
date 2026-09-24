import { ButtonLink } from '@/components/ui/Button';
import type { RequestedDocument } from '@/lib/apply/status';
import styles from './status.module.css';

/**
 * What we are likely to ask for, and where to send it.
 *
 * Uploads happen in the portal, against a specific request from our team:
 * what staff need varies per application, and the request says exactly what
 * and why. This used to be an upload form whose button could never be pressed
 * ("needs file storage"), which told applicants to send documents and gave
 * them no way to.
 */
export function DocumentUpload({ documents }: { documents: RequestedDocument[] }) {
  return (
    <div className={styles.uploads}>
      {documents.map((doc) => (
        <section key={doc.kind} className={styles.uploadBlock}>
          <div className={styles.uploadHead}>
            <h3 className={styles.uploadTitle}>{doc.label}</h3>
            <span className={doc.required ? styles.docRequired : styles.docOptional}>
              {doc.required ? 'Likely needed' : 'Optional'}
            </span>
          </div>
          <p className={styles.uploadWhy}>{doc.why}</p>
        </section>
      ))}

      <div className={styles.uploadFooter}>
        <ButtonLink href="/portal/documents">Upload in your portal</ButtonLink>
        <p className={styles.storageNote}>
          When we need something, we email you and it appears in your portal under Documents,
          with what we need and why. Files are stored privately and only our team can open them.
        </p>
      </div>
    </div>
  );
}
